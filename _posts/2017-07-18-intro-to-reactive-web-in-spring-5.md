---
layout: post
title: "Intro to Reactive Web in Spring 5"
description: "Description of new Reactive features of Spring Framework version 5"
modified: 2017-07-18
tags: [java, spring]
comments: false
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2017/07/18/intro-to-reactive-web-in-spring-5/)*

One of the biggest features planned for Spring 5, planned for release later this year, is the new Reactive Web extensions. For a long time Spring has had support for asynchronous web requests by suspending servlet threads while processing long-running tasks using DeferredResult and Callable return types, but it was left to the developer to integrate with these types and use them to return a single cohesive result. The Reactive Web additions now make it downright simple to use FRP-style programming in an implicitly asynchronous way and leave the management to Spring.

# Data Types
Spring has chosen to use [Project Reactor](https://projectreactor.io/) to structure their new APIs. Unfortunately (or fortunately, depending on how you look at it) there are a new set of datatypes you'll need to get familiar with but there are two main ones everyone needs to be familiar with.

## Flux
A Flux can be thought of as a type of Stream - it represents an indeterminate number of potential future results that can be piped through intermediate processing stages. The difference is that, other than not **really** being a Stream, a Flux represents a process by which to get data while a Stream encapsulates a set of data itself. Perhaps an easier way to look at this is how they are used. A Stream is executed once regardless of how many consumers try to use it - each consumer really only sees the result of the Stream. A Flux is executed once per subscriber. This is often surprising to developers who build a Flux, subscribe multiple consumers to it, and end up exponentially increasing the data being generated. Obviously, there are ways to build a Flux that can be shared between multiple consumers but this is not the default behavior.

So, how do we build a Flux? There are **so** many ways, but at the end of the day they really boil down to three main types:

- Building a Flux from another Flux
- Using a predetermined set of data that may take some time to retrieve such as a database query
- Scheduling periodic data generation - for example, execute a task once a minute that publishes a value

## Mono
A Mono, put simply, is a Flux that guarantees a single result at some point in the future.

# What if I don't like these?
Some people really like Project Reactor's APIs but for those new to the area they can be confusing. For those with more experience in [RxJava](https://github.com/ReactiveX/RxJava) you can continue to use that library instead - Spring still fully-supports using it, you'll just need to manage mapping to and from Reactor types.

# Can I see an example?
Let's walk through a contrived block of code to generate mock stock quotes - this is an ideal use case since stock quotes is a data feed that could change very fast or very slow thus leaving us in a normally-awkward timing situation.

First let's just assume I have a method that builds a StockQuote object:

{% highlight java %}
public static StockQuote generateStockQuote() { ... }
{% endhighlight %}

Next we need to build a Flux that actually contains the StockQuote objects. For this we're going to use a built-in function that builds a Flux that calls a method to build a new piece of data anytime one is requested by a consumer. This constructed StockQuote gets pushed into the Sink which in this case is the data source of the Flux.
{% highlight java %}
Flux QUOTE_FLUX = Flux.generate(sink -> sink.next( generateStockQuote() ))
{% endhighlight %}

We just hit our first gotcha. If we leave it like this the Flux will just spin, generating stock quotes as often as possible to satisfy consumers. I want to just generate one quote per second no matter how fast the consumers want them. To do this I am going to use another built-in function to build a Flux that publishes a value once per second.

{% highlight java %}
Flux PERIODIC_FLUX = Flux.interval( Duration.of(1, ChronoUnit.SECONDS) )
{% endhighlight %}

We now need to tie these two Fluxes together - I want the once-per-second Flux to regulate the speed of my StockQuote flux. To do this we use yet another built-in function to zip these Fluxes together. Zip creates a composite Flux that only publishes once **both** child Fluxes have a value. You may notice the third argument to zip - in this case I don't need the value produced by the periodic flux so this line throws it away to leave us with just the StockQuote.

{% highlight java %}
Flux PERIODIC_QUOTE_FLUX = Flux.zip(
    QUOTE_FLUX,
    PERIODIC_FLUX,
    (quote, time) -> quote
)
{% endhighlight %}

This Flux now acts as a once-per-second feed of StockQuote objects.

The nice thing about a Flux is that it comes with a lot of powerful features to assist with filtering, combining, and transforming the data just like a Stream. For example, we could write the following code

{% highlight java %}
PERIODIC_QUOTE_FLUX
    .filter(quote -> "TWTR".equals(quote.getSymbol()) )
    .map(StockQuote::getPrice)
    .delayElements( Duration.of(20, ChronoUnit.MINUTES) )
    .distinct()
    .take(10);
{% endhighlight %}

which results in a new Flux that will publish the first 10 unique prices of StockQuotes for Twitter, delaying each by 20 minutes.

# How can I use them?
Simple - just return a Flux or a Mono from a RestController. Done.

Spring takes care of all the PubSub shenanigans for you - a Publisher (base type of Mono & Flux) is automatically subscribed to when it's returned and unsubscribed when Spring detects that it's completed. However, it's important to remember that you still have to tell the Publisher when there's no more data to publish - you can't just return an infinite, never-terminating Flux from a RestController because the HTTP Response will never get committed and terminated. Normally this isn't an issue since you'll be building a Flux off of a finite set of data thus when the underlying data is done the Flux will automatically terminate. If, however, you're working with an infinite set of data (periodically generated, for example) or working with a Mono that may **never** generate a value then you need to add your own timeout guards or default value suppliers.

Most of the time when we think about Rest-ful services we think about returning data to the consumer, but sometimes we need to accept data as well. Good news: Spring fully supports reactive structures for @RequestBody contents to support streaming data from the client to the server. Generally speaking by declaring your RequestBody to be a Flux or Mono you're telling Spring that your controller method can start executing before the request body has been deserialized which, especially in high-volume applications, can save precious milliseconds.

# Integration
A real concern anytime you try to work with asynchronous structures is that, at some layer, you usually run into methods that block rather than return asynchronous structures. To help us all out a lot of the work the Spring team has done is to work asynchronous structures into the most popular modules like Spring Data. This means that Spring takes care of the real nitty-gritty of how to interface with database and network drivers to expose nice, easy-to-use asynchronous return types thus allowing you to work them straight back into your async web services.

One nice thing is that there are nice utility methods to convert a Flux to and from a Stream which makes it pretty easy to work with any Java8-compliant libraries, but of course it's still up to the developer to do their due diligence and make sure async behaviors aren't being lost or overlooked.

# Wrap Up
To help demonstrate Reactive Web in action I've created [a simple example out on GitHub](https://github.com/mike-plummer/reactive-spring5).

While Spring 5 isn't quite GA it has pretty well firmed up so now is great time to start working with some of the new features. The great news is that Spring Boot 2.0 is also readying to drop later this year with Spring 5 (the example project is actually built with Spring Boot 2.0) so Boot developers won't have to wait long to get to use this neat new feature set.
