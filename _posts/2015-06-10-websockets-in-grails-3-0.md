---
layout: post
title: WebSockets in Grails 3.0
description: "Example of using websockets in Grails 3."
modified: 2015-06-10
tags: [grails, websockets]
comments: false
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2015/06/10/websockets-in-grails-3-0/)*

For those who aren’t familiar, WebSockets are a long-lived, interactive, two-way channel between a client browser and end server that allows ongoing communication without polling. They’ve been around for a few years now ever since being proposed by [RFC 6455](https://tools.ietf.org/html/rfc6455) and pretty much all of the major browsers have gained support since then. [Spring](https://spring.io/), the ever-popular Java MVC framework, gained built-in WebSocket support in version 4.0 and that support has since been incorporated into [Spring Boot](http://projects.spring.io/spring-boot/) and [Grails](https://grails.org/) (Grails support is supplied by this [helpful plugin](https://github.com/zyro23/grails-spring-websocket)). This article is a high level overview of some tinkering I did to familiarize myself with WebSockets while also learning about the relatively-recent shakeup of Grails as it advanced to 3.0.

## The Setup

Specifically, my use case was to examine ways to avoid manual server polling when sending data back and forth between a server and 1-n clients. For this I decided to use WebSockets managed by [SockJS](https://github.com/sockjs/sockjs-client), a library that handles the nitty-gritty of establishing and maintaining those connections, and [Stomp](http://jmesnil.net/stomp-websocket/doc/), a messaging protocol built for WebSockets. Being a developer with lots of Java experience, my initial reaction to this stack was “it’s JMS, but better”. Those who have worked with Java Message Service probably know what I’m referring to – JMS allows reliable, highly-customizable cross-system messaging but can be heavy, hard to configure, and definitely doesn’t have any graceful integration into the sort of web applications being developed these days. This stack supplies many of the same capabilities while being simpler, lighter-weight, and downright simple to integrate:

1. Pub/Sub Model – messages are published to customizable endpoints (think of them as mailboxes), interested clients can subscribe/unsubscribe at-will
2. Topics and Queues – determine how and to whom messages get delivered: broadcast, first-come, or targeted consumer
3. Delivery Acknowledgement and Transactions – bundle sets of messages to guarantee an entire batch gets worked or rolled back in case of error
4. Filtering – clients can specify what types of messages they wish to receive or ignore
5. Security – integrates with Spring Security and readily supports common tools like CSRF tokens

## The Application

For this example I decided to setup a very simple test application. This application would generate (fake) stock quotes at a relatively high frequency, high enough that it would become burdensome to have clients poll often enough to keep up. On top of showcasing this poll-less approach I also wanted to look into the ability to allow clients to interact and decided to go for the tried-and-true chat room use case.

All the code for this example is available out on [GitHub](https://github.com/mike-plummer/Grails_WebSockets) so I will just be highlighting the most important functional bits here. First up is the code that generates data for my faux stock ticker – this code runs in the background on the server pushing new quotes out to a Stomp topic that clients can subscribe to.

{% highlight groovy %}
/**
 * Quartz job that kicks off at Grails startup. This job executes every 2.5
 * seconds to generate a fake stock quote, convert it to JSON, and publish
 * it to the optionally-subscribed-to stockQuote topic. Any browser clients
 * subscribed to the topic will receive it.
 */
class StockQuoteJob {
    /**
     * Tell Quartz how to schedule this job. You can optionally define
     * an initial delay, number of executions, or repeatDelay (as opposed
     * to repeatInterval).
     */
    static triggers = {
        simple repeatInterval: 2500L
    }

    /**
     * Inject the messenger that accepts Stomp messages.
     */
    SimpMessagingTemplate brokerMessagingTemplate

    def execute() {
        /**
         * Use the awesome Groovy JsonBuilder to convert a dynamically-defined
         * data structure to JSON.
         */
        def builder = new JsonBuilder()
        builder {
            symbol(generatedSymbol)
            price(random.nextDouble() * 100)
            timestamp(new Date())
        }

        //Publish the new quote
        brokerMessagingTemplate.convertAndSend "/topic/stockQuote", builder.toString()
    }
}
{% endhighlight %}

Next, we need some more server-side code to arbitrate chat messages – effectively, this code reflects any incoming messages out to all listeners.

{% highlight groovy %}
class ChatController {
    /**
     * Accepts incoming chat messages sent by browsers and routes them
     * to the 'chat' topic that all browser clients are subscribed to.
     */
    @MessageMapping("/chat")
    @SendTo("/topic/chat")
    protected String chat(String chatMsg) {
        /**
         * Use the awesome Groovy JsonBuilder to convert a dynamically-defined
         * data structure to JSON.
         */
        def builder = new JsonBuilder()
        builder {
            message(chatMsg)
            timestamp(new Date())
        }
        builder.toString()
    }
}
{% endhighlight %}

Now that all the server code is in place, we create a basic webpage. The code below provides the ability for the user to subscribe and unsubscribe to stock quotes, send chat messages, and receive messages sent by other users.

{% highlight html %}
<script defer type="text/javascript">
    $(function() {
        //Create a new SockJS socket - this is what connects to the server using a WebSocket
        var socket = new SockJS("${createLink(uri: '/stomp')}");
        //Build a Stomp client to send messages over the socket we built.
        var client = Stomp.over(socket);
        //Track the subscription so we can unsubscribe later.
        var quoteSubscription;
        //Have SockJS connect to the server.
        client.connect({}, function() {
            //Subscribe to the 'chat' topic and define a function that is executed
            //anytime a message is published to that topic by the server or another client.
            client.subscribe("/topic/chat", function(message) {
                var chatMsg = JSON.parse(message.body)
                $("#chatDiv").append(new Date(chatMsg.timestamp).toLocaleTimeString() + ': ' + chatMsg.message);
            });
        });
        //When the user clicks the 'subscribe' button...
        $("#startButton").click(function(){
            //Initiate a subscription to stockQuote messages.
            quoteSubscription = client.subscribe("/topic/stockQuote", function(message) {
                var quote = JSON.parse(message.body);
                $("#symbol").text(quote.symbol);
                $("#price").text(quote.price.toFixed(2));
                $("#timestamp").text(new Date(quote.timestamp).toLocaleString());
            });
        });
        //When the user clicks the 'unsubscribe' button...
        $("#stopButton").click(function(){
            //Unsubscribe so we don't get any more messages
            quoteSubscription.unsubscribe();
        });
        //When the user sends a chat message publish it to the chat topic
        $("#sendButton").click(function() {
            client.send("/app/chat", {}, $("#chatMessage").val());
        });
    });
</script>
{% endhighlight %}

Put it all together and launch as a Grails application and you get something like you see below. You can open any number of browser tabs and they will all receive the same stock quote data at the same time (provided they each subscribe) and they all can participate in a shared chat. The best part? No background AJAX requests barraging the server for the latest data.

{% capture images %}
	/images/2015/06/grails-websocket-screenshot.png
{% endcapture %}
{% include gallery images=images caption="Websockets in action" cols=1 %}

## Wrap Up

Once you take out all the fluff, we were just able to put together a neat little app that handles some non-trivial interactions in just a few dozen lines of code. Of course, this is hardly a complex example of WebSockets or Grails but hopefully it has shown you a quick way to simplify a common use case using some neat tools. Take a look at the source out on [GitHub](https://github.com/mike-plummer/Grails_WebSockets), and happy coding!
