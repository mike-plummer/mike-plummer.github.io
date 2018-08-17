---
layout: post
title: Synchronizing Rest Service Schemas
description: 'Methods to describe and publish the schema of ReST services'
modified: 2017-01-25
tags: [REST Service, schema, JSON, Kotlin]
comments: false
---

> _This was originally posted at [Object Partners](https://objectpartners.com/2017/01/25/synchronizing-rest-service-schemas/)_

We’ve all been there: Your app deploys to production and you discover that something has stopped working because the services you depend on have renamed a field. In a REST service there is no static contract to bind to, which most of the time is a fantastic feature but can also expose you to big problems if your services team aren’t great communicators or don’t publish good release notes. In this post I’ll walk through a few methods I’ve used in the past to help bridge the gap between a JavaScript/TypeScript front-end and (mostly Java) backing REST services.

If you want to jump straight to a code example a good portion of what’s discussed here can be seen in action in [this example application](https://github.com/mike-plummer/service-schemas).

# What are my options?

## Just use JavaScript on your server

Definitely the easiest solution is to share a single baseline with a web layer by using [Node](https://nodejs.org/en/) as your server backend, allowing you to share the exact same code server- and client-side. While this works well for simple applications it quickly falls apart in more complex environments, especially when you need to interface with multiple external systems or have complicated concurrency needs.

## Custom Generated Schemas

The next option is to write a custom generator and parser to scan your code to generate metadata then use that data in your front end. Typically this centers around [reflection](<https://en.wikipedia.org/wiki/Reflection_(computer_programming)>). This is the most flexible solution, but is brittle and labor intensive. Never forget, every new capability you write from scratch is a capability you have to write tests for. It can also be more difficult to manage since, depending on your build system, you may only be able to generate this sort of data at build-time. In my experience, this should be used as a last resort.

## API Specifications: WADL, RAML, Swagger

Ever since [SOAP](https://en.wikipedia.org/wiki/SOAP) services went out of vogue there have been various tools out there to generate a service specification to replace the concept of the [WSDL](https://en.wikipedia.org/wiki/Web_Services_Description_Language). One of the first was [WADL](https://en.wikipedia.org/wiki/Web_Application_Description_Language) (Web Application Description Language). In theory it works well but in practice it isn’t human-readable and often has trouble with more complex services especially when inheritance is involved. There are standalone libraries to generate a WADL and it’s a baked in capability to Jersey, but if you’re using [Spring](http://projects.spring.io/spring-framework/) or [Ratpack](https://ratpack.io/) you’ll have to hack something in. Technically tools like [SoapUI](https://www.soapui.org/) can parse and use WADL’s but I’ve never gotten it to work correctly, and there isn’t strong support for consuming a WADL in client code.

The two newest iterations of the REST Specification concept are [RAML](http://raml.org/) and [Swagger](http://swagger.io/), also known as the Open API Specification (AOS). From what I’ve seen, Swagger is the clear winner. There are just a few tools for RAML generation in languages like Ruby, Python, and JavaScript which leaves the vast majority of REST services out in the cold. Swagger specs, meanwhile, are incredibly easy to generate in almost any language. Since I do most of my work in [Spring Boot](http://projects.spring.io/spring-boot/) I like to use the [SpringFox](https://springfox.github.io/springfox/) library which handles generating a very nice Swagger spec and [API UI](http://swagger.io/swagger-ui/) for all of my Spring services.

This is all well and good, but while documenting your API helps inform consumers of changes it doesn’t always lend itself to in-code consumption. Adapters can be written to try to convert from Swagger into a JavaScript model, but this is yet another bit of code to maintain and there is some loss of precision during the translation.

## JSON Schema

Simply put: This is the tool designed for our problem. [JSONSchema](http://json-schema.org/) is a standard for describing a domain model in JSON that can be easily generated server-side at build-time or runtime and then used client-side in a variety of ways.

For example, to generate a schema for this [Kotlin](https://kotlinlang.org/) class…

{% highlight kotlin %}
class ExtendedForecast(override var id: Long,
var forecasts: MutableList,
var confidence: Confidence) {
}
{% endhighlight %}

…we can just add this code to our [Gradle](https://gradle.org/) script…

{% highlight groovy %}
def jsonSchemaGenerator = new JsonSchemaGenerator(new ObjectMapper())
def schema = jsonSchemaGenerator.generateJsonSchema(ExtendedForecast.class)

new File("${buildDir}/json-schema.json").withWriter('UTF-8') { writer -&gt;
writer.write(schema.toString())
}
{% endhighlight %}

…to output a file like this that contains a JSON-formatted schema description.

{% highlight javascript %}
"ExtendedForecast": {
"type": "object",
"additionalProperties": false,
"properties": {
"id": {
"type": "integer"
},
"forecasts": {
"type": "array",
"items": {
"$ref": "#/definitions/WeatherForecast"
}
},
"confidence": {
"type": "string",
"enum": [
"HIGH",
"MEDIUM",
"LOW"
]
}
}
}
{% endhighlight %}

How you use it in your webapp is up to you. I’ve seen it used to generate TypeScript schemas, dynamically loaded at runtime to validate data structures, and used to auto-generate type-checked AJAX interfaces.

And yet, it isn’t perfect. Interfaces and Abstract classes are not exposed with default generators, leaving you to write some custom configuration if that data is needed. Typically these structures are what give disparate concrete classes context relative to one another, so it’s information that is often very useful to have if only to help with ‘instanceof’ checks in your front-end. It also relies on a [correctly-annotated set of Jackson DTOs](https://github.com/FasterXML/jackson-annotations) or some more custom code to find and list all classes to generate schemas for.

## On the Horizon

One of the things I’m most excited to see is the continued improvement in [Kotlin](https://kotlinlang.org/). If you haven’t heard of it before Kotlin is (yet another) JVM language with some very neat features but also has a hidden superpower – it can compile directly to JavaScript. This means that you can define your model and use it in your server-side code but then build it as a set of JavaScript classes. This isn’t just limited to entity definitions though. How many times have you had to write the same function in client and server code? In addition to your domain model you can also share common utility code.

Take for example this simple utility function. Its sole purpose is to serve as a customizable counter.

{% highlight kotlin %}
object counter {
var value: Long = 0
}

fun incrementCounter(step: Long = 1): Long {
println("Stepping counter by $step")
counter.value += step
return counter.value
}
{% endhighlight %}

After running this through the KotlinJS compiler we get the exact same capability delivered in a JavaScript function.

{% highlight javascript %}
var counter_instance = null;
function counter() {
counter_instance = this;
this.value = Kotlin.Long.ZERO;
}

function counter_getInstance() {
if (counter_instance === null) {
counter_instance = new counter();
}
return counter_instance;
}

function incrementCounter(step) {
var tmp$;
if (step === void 0)
step = Kotlin.Long.ONE;
Kotlin.println('Stepping counter by ' + step);
tmp$ = counter_getInstance();
tmp$.value = tmp$.value.add(step);
return counter_getInstance().value;
}
{% endhighlight %}

No muss, no fuss. Plus, if we ever decide to change the behavior of this function we only have to update the Kotlin source and the corresponding JavaScript will be automatically generated the next time we build.

That said, Kotlin is not a perfect choice. There are still quite a few rough edges since it’s such a new capability:

- Generated JavaScript is only ES5. No ES6/ES2015 features yet.
- Kotlin reflective capabilities not yet implemented in JavaScript code. Inheritance checks and field/function scanning still requires manual JavaScript code. This also means that field datatypes cannot be determined using the schema.
- Yet another JavaScript library to load that isn’t exactly tiny (~600 KB minified), but it does give you access to a large chunk of Kotlin’s capabilities and standard library.

# So which should I use?

The answer to that question depends on your use case.

**Document your API:** Swagger is your best option. It’s a fantastic tool not only for documenting your services, but a Swagger specification can also be used to auto-generate client code that complies with your contracts. In addition, [SwaggerUI](http://swagger.io/swagger-ui/) supplies a very nice tool for exercising your services from the browser which is invaluable as a debug and testing capability.

**Internal-use API:** Consider publishing a more formal schema like a Java client JAR or JSON Schema in addition to Swagger. This gives consumers more flexibility for integrating since not every client will be able to use a Swagger spec.

**Full-stack application:** JSON Schema plus Swagger is a solid choice, but you may want to take a look at Kotlin. Odds are the same developers will be working front- and back-end, and nothing is more frustrating than having to rewrite the same utility functions in two places in two languages and keep them in sync. Kotlin saves time and reduces risk by combining those tasks into one.

# Implementation

So, now that you’ve picked a strategy you need to determine how you’re going to generate and publish the information. There are a few different strategies that I’ve seen used and each has some positives and negatives.

## When to generate?

**Build Time:** Generating your schema as part of your build process is typically the easiest and fastest solution to implement. It also helps keep your deployable code ‘clean’ since it doesn’t have to have any knowledge or make allowances for the generation process. However, this approach does mean your real and published schemas can drift if you don’t tie the generation into your build tightly enough, plus you’re left with a set of files that you need to find a way to publish.

**Run Time:** This is typically more complex. Performing classpath scanning or other dynamic methods can also impact memory and CPU usage. However, there is a guarantee that your schema will not drift from your deployed baseline and minimizes the generated artifacts you have to manage in your build process.

## How to publish?

**Resource Artifact:** Generating a file or files that can be included in other projects is the simplest and most compatible solution, but it can be difficult to manage versions and leaves some uncertainty that the schema being used matches the service instance that will be interfaced with.

**Co-deployment as service:** Increases the size and complexity of your application bundle, but guarantees that your published schema stays in sync with your services.

**Separate deployment as service:** Keeps your application bundle simple and clean, but can get out of sync with your deployed services which defeats the purpose of publishing a schema in the first place.

# Wrap Up

I’ve implemented some of these schema strategies discussed here in a [simple example out on GitHub](https://github.com/mike-plummer/service-schemas). It’s just a simple [Angular2](https://angular.io/) app with some Gradle scripts that generate a manual, JSON, and Kotlin schema off the same baseline. It should give you a starting point for experimenting with some of these concepts. As I said, these are just some of the strategies I’ve seen used, but there are doubtless many more each with their own pros and cons.

Happy coding!
