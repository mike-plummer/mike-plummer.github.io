---
title: "Speed Up Spock Spring Tests"
date: "2019-05-21T00:00:00.000Z"
path: "/2019-05-21-speed-up-spock-spring-tests/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2019/05/21/speed-up-spock-spring-tests/)*

This article follows up some excellent info on testing Spring with Spock here and here.

Developing with Spring and testing with Spock means you're using two of the best tools available on the JVM today. One downside, however, is that some test easy test patterns have serious performance drawbacks. We all know that tests that fire up a Spring context are **much** slower than those that don't, but perhaps we don't have a firm grasp of why and how we can help control that overhead.

For the purposes of this post, I have a contrived example application: a controller with two endpoints, each of which uses a different service, with a couple other beans in the context that are very expensive to build. We'll walk through where you might start writing tests, and examine a few paths towards making them more efficient while identifying the limitations of each approach.

# How can we test a Spring app in Spock?
Turns out that there's a bunch of different ways we can write Spring tests in Spock, each with differing levels of complexity, maintenance, and performance. We'll go through a half-dozen of them here and identify which are the best fit for your application.

## Custom Contexts
The first test we'll set up tries to test each controller independently, mocking out the service dependency so we can validate interactions. Firing up a Spring context allows us to validate HTTP pathing and method configuration using MockMVC.

Our test would look something like this:

```groovy
@AutoConfigureMockMvc
@SpringBootTest(classes = [Application])
abstract static class BaseSpec extends Specification {
    protected final static DetachedMockFactory factory = new DetachedMockFactory()
    @Autowired MockMvc mockMvc
}

@ContextConfiguration(classes = [GetAllConfig])
static class GetAll extends BaseSpec {
    @Autowired DataListService service

    def 'get'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data"))
        then:
        1 * service.get() >> ['1', '2', '3']
        0 * _
        result.andExpect(content().string('["1","2","3"]'))
    }

    @TestConfiguration
    static class GetAllConfig {
        @Bean @Primary
        DataListService mockDataService() {
            factory.Mock(DataListService)
        }
    }
}

@ContextConfiguration(classes = [GetByIdConfig])
static class GetById extends BaseSpec {
    @Autowired DataByIdService service

    def 'getById'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data/1"))
        then:
        1 * service.get('1') >> '123'
        0 * _
        result.andExpect(content().string('123'))
    }

    @TestConfiguration
    static class GetByIdConfig {
        @Bean @Primary
        DataByIdService mockDataService() {
            factory.Mock(DataByIdService)
        }
    }
}
```

We have two test classes that share a base class. Each one creates a Spock mock for the service it's interested in, and publishes that into the Spring context using a TestConfiguration. Each test makes a mock MVC call to the controller, verifying that it's at the correct path and method, verifies that it calls the service, and verifies that the resulting value is handed back appropriately. It's very complete, and very slow.

| Test | Time |
| ---- | ---- |
| GetAll | 6.6s |
| GetById | 4.6s |
| Total | 11.2s |

What's going on here?! Why is it so slow? The first test takes a long time since it's the first time that Spring has booted up - there's a lot of initialization that needs to get done. However, Spring is smart and will attempt to cache a lot of this context so it doesn't have to repeat that same setup for future tests. Unfortunately, these tests are setup in a way that prevents optimal caching - each test is providing a custom @TestConfiguration which results in a unique context, thus making it ineligible for reuse on other tests.

Obviously this is a contrived example - we could easily combine these two @TestConfiguration instances into a single one that's shared between tests. Unfortunately, as your application grows in complexity this often isn't an option; it's often easier to build lots of small configurations rather than consolidating.

**Advantages:** Good isolation from other tests, excellent coverage

**Disadvantages:** Slow!

## Spock's @SpringBean
Spock recently improved its support for Spring testing by giving us the @SpringBean annotation to mark a manually-constructed bean that should be automatically injected into the context. This drastically improves the readability and maintainability of our tests.

```groovy
@AutoConfigureMockMvc
@SpringBootTest(classes = [Application])
abstract static class BaseSpec extends Specification {
    @Autowired MockMvc mockMvc
}

static class GetAll extends BaseSpec {
    @SpringBean DataListService service = Mock()

    def 'get'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data"))
        then:
        1 * service.get() >> ['1', '2', '3']
        0 * _
        result.andExpect(content().string('["1","2","3"]'))
    }
}

static class GetById extends BaseSpec {
    @SpringBean DataByIdService service = Mock()

    def 'getById'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data/1"))
        then:
        1 * service.get('1') >> '123'
        0 * _
        result.andExpect(content().string('123'))
    }
}
```

Note that we don't have any @TestConfiguration classes anymore, and no static mock factory either. The code is much cleaner and easier to work with. Unfortunately, there's no such thing as a free lunch. While it looks simpler, in reality Spock is doing nearly the exact same same context dirtying as in our previous example, albeit with some optimizations. This means that our tests are still pretty slow.

| Test | Time |
| ---- | ---- |
| GetAll | 5.4s |
| GetById | 3.5s |
| Total | 8.9s |

**Advantages:** Same capabilities as custom Spring contexts, clean

**Disadvantages:** Still slow!

## Manual Mocks
Okay, so custom configs for each test can be bad. Let's get try to get rid of that.

A simple solution would be to manually create and populate our mocks without telling Spring about it. That way we don't need the unique context per test, thus Spring can just reuse the same one for each test. Let's see what that looks like:

```groovy
@AutoConfigureMockMvc
@SpringBootTest(classes = [Application])
abstract static class BaseSpec extends Specification {
    @Autowired MockMvc mockMvc
    @Autowired DataController controller

    DataListService _dataListService
    DataListService dataListService = Mock()
    DataByIdService _dataByIdService
    DataByIdService dataByIdService = Mock()

    // Save off the original services and replace with mock instances
    def setup() {
        _dataListService = controller.dataListService
        controller.dataListService = dataListService
        _dataByIdService = controller.dataByIdService
        controller.dataByIdService = dataByIdService
    }

    // Put original service instances back
    def cleanup() {
        controller.dataListService = _dataListService
        controller.dataByIdService = _dataByIdService
    }
}

static class GetAll extends BaseSpec {
    def 'get'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data"))
        then:
        1 * dataListService.get() >> ['1', '2', '3']
        0 * _
        result.andExpect(content().string('["1","2","3"]'))
    }
}

static class GetById extends BaseSpec {
    def 'getById'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data/1"))
        then:
        1 * dataByIdService.get('1') >> '123'
        0 * _
        result.andExpect(content().string('123'))
    }
}
```

We let Spring initialize a Context, get the controller it built for us, then shove our own mocks into it. Since by default the Controller is built as a Singleton we're modifying the instance that will be used in the test. Neat, huh? Then, when we're done, we just put the original services back in place.

| Test | Time |
| ---- | ---- |
| GetAll | 6.5s |
| GetById | 0.1s |
| Total | 6.6s |

Whoa! Look at that second test! Since the tests don't have unique context configurations Spring will happily re-use the first Context for the second test, making it blazing fast.

Just one problem....we **_are_** polluting the context, we just aren't telling Spring about it. This may let our test pass for now, but what if we tried to parallelize tests, or forgot to clean up after ourselves? Doing this sort of manual adjustment to Spring-managed resources can lead to some extremely odd behaviors that are near-impossible to debug and track down.

**Advantages:** Faster, easier to create/manage mocks manually than doing so via Spring configs

**Disadvantages:** Dangerous - almost guaranteed to cause problems down the line

##Targeted Contexts
Okay, so we shouldn't change the context once it's built. Is there a way to build the context faster?

Absolutely! Right now our tests are trying to instantiate every single bean in our app even if they aren't being tested. Let's slim that down to exclude some things aren't needed for these tests.

```groovy
@EnableWebMvc
@AutoConfigureMockMvc
@SpringBootTest(classes = Config)
abstract static class BaseSpec extends Specification {
    @Autowired MockMvc mockMvc

    protected final static DetachedMockFactory factory = new DetachedMockFactory()

    @Configuration
    @ComponentScan([
            "com.objectpartners.plummer.spockctx.controllers",
            "com.objectpartners.plummer.spockctx.services",
    ])
    static class Config {
    }
}

@ContextConfiguration(classes = [GetAllConfig])
static class GetAll extends BaseSpec {
    @Autowired DataListService service

    def 'get'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data"))
        then:
        1 * service.get() >> ['1', '2', '3']
        0 * _
        result.andExpect(content().string('["1","2","3"]'))
    }

    @TestConfiguration
    static class GetAllConfig {
        @Bean @Primary
        DataListService mockDataService() {
            factory.Mock(DataListService)
        }
    }
}

@ContextConfiguration(classes = [GetByIdConfig])
static class GetById extends BaseSpec {
    @Autowired DataByIdService service

    def 'getById'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data/1"))
        then:
        1 * service.get('1') >> '123'
        0 * _
        result.andExpect(content().string('123'))
    }

    @TestConfiguration
    static class GetByIdConfig {
        @Bean @Primary
        DataByIdService mockDataService() {
            factory.Mock(DataByIdService)
        }
    }
}
```

Here we're telling Spring to, instead of using our Application class to construct a Context, instead only scan two packages that we're going to test. This happens to exclude the `beans` package which has some very expensive logic.

| Test | Time |
| ---- | ---- |
| GetAll | 3.4s |
| GetById | 2.2s |
| Total | 5.6s |

Okay, our second test is back to taking some time because we're using TestConfiguration again, but no big deal because our small context fires up much faster than before. This definitely yields results, but you can imagine the perils of premature optimization here - what if you change package names, or move logic around, or add new logic into those packages? Your tests would start to break in ways that aren't immediately obvious which is one of the things that can make testing very tedious.

**Advantages:** Even faster, safer since we aren't modifying Spring resources

**Disadvantages:** Labor intensive to set up, hard to maintain

## Who needs Context anyways?
Well, context, it's been fun but you're holding us back. We can write a test without you.

```groovy
abstract static class BaseSpec extends Specification {
    DataListService dataListService = Mock()
    DataByIdService dataByIdService = Mock()
    DataController controller = new DataController(dataByIdService, dataListService)
    MockMvc mockMvc = MockMvcBuilders.standaloneSetup(controller).build()
}

static class GetAll extends BaseSpec {
    def 'get'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data"))
        then:
        1 * dataListService.get() >> ['1', '2', '3']
        0 * _
        result.andExpect(content().string('["1","2","3"]'))
    }
}

static class GetById extends BaseSpec {
    def 'getById'() {
        when:
        ResultActions result = this.mockMvc.perform(get("/data/1"))
        then:
        1 * dataByIdService.get('1') >> '123'
        0 * _
        result.andExpect(content().string('123'))
    }
}
```

No more Spring annotations, no more context. Here, we're manually building our controller, populating it with our mocks, and building a single-controller MockMVC instance. We're effectively doing Spring autowiring ourselves.

| Test | Time |
| ---- | ---- |
| GetAll | 1.1s |
| GetById | 0.1s |
| Total | 1.2s |

Okay, now we're getting somewhere. The first test is doing a lot of classpath and Spock initialization, but after that things get **fast**. All we give up is the sanity check from Spring that it can autowire the beans the way we expect. In my personal experience, this can be easily tested by just booting up the app - if Spring can't autowire things it will fail very loudly on startup.

**Advantages:** Very fast while still validating Spring controller behaviors

**Disadvantages:** No testing of Spring dependency injection, can get tricky to test @Secured and other Spring-managed aspects

## Moving beyond Spring
Maybe we need to ask ourselves why we're using Spring in these tests anyways? What is it we're really trying to test?

If I wanted to verify that my controller is at the right path and the right HTTP method, I could write a much simpler test using Reflection to verify the annotations. If I'm trying to validate that my dependencies autowire correctly, instead just fire up the application and let Spring tell you if it can't satisfy some of your injected dependencies. The vast majority of the time, you're writing tests of **your** logic, not Spring's, so your tests should spend as little time on Spring as possible.

```groovy
abstract static class BaseSpec extends Specification {
    DataListService dataListService = Mock()
    DataByIdService dataByIdService = Mock()
    DataController controller = new DataController(dataByIdService, dataListService)
}

static class GetAll extends BaseSpec {
    def 'get'() {
        when:
        def result = controller.get()
        then:
        1 * dataListService.get() >> ['1', '2', '3']
        0 * _
        result == ['1', '2', '3']
    }
}

static class GetById extends BaseSpec {
    def 'getById'() {
        when:
        def result = controller.getById('1')
        then:
        1 * dataByIdService.get('1') >> '123'
        0 * _
        result == '123'
    }
}
```

Nice, clean, simple unit test. No mock MVC, no Spring. We get 100% coverage of our logic without any Spring context or MVC.

| Test | Time |
| ---- | ---- |
| GetAll | 0.5s |
| GetById | 0.1s |
| Total | 0.6s |

That's about as low as it will go. Granted, we have given up a bit here. We aren't validating that content will serialize/deserialize to our controller as expected, we aren't validating HTTP pathing and method, we won't detect path duplication problems, or any of a million other Spring-related things. Those definitely need to be tested, but they don't need to be part of every test.

**Advantages:** Super fast

**Disadvantages:** Lose testing of Spring controller behaviors (serialization/deserialization, pathing, etc)

# Wrap Up
The vast majority of your unit tests in a Spring application should probably look like these last tests. They should not fire up a context, and they don't need to go through mock MVC. Those should be few and far between, testing the true Spring-centric spots in your application. Any time you find yourself adding @SpringBootTest to your tests you should ask yourself if you really need to, and if it is, then try to reuse the existing context wherever possible.

Code examples from this article are [available here](https://github.com/mike-plummer/spock-spring-performance).