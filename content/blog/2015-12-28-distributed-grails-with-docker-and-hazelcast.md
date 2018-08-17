---
layout: post
title: Distributed Grails with Docker and Hazelcast
description: 'Clustering Grails using Docker Compose and sharing data within the cluster using Hazelcast.'
modified: 2015-12-28
tags: [Grails, Hazelcast, clustering]
comments: false
---

> _This was originally posted at [Object Partners](https://objectpartners.com/2015/12/28/distributed-grails-with-docker-and-hazelcast/)_

Normally a clustered application can be designed in a stateless manner which allows requests to be dispatched to any combination of nodes, but sometimes it is desirable to share data across the cluster. This post will discuss one way you can easily cluster a Grails application and has an [example application](https://github.com/mike-plummer/DistributedGrails) if you prefer to jump straight into some code.

# Data Sharing Options

I’ve used a variety of products and designs in the past to tackle this problem, each with advantages and disadvantages.

|-----------------+------------------------------------------------------+---------------------------------------------------|
| Solution | Pros | Cons |
|:----------------|:-----------------------------------------------------|:--------------------------------------------------|
| Sticky Sessions | Simple | Risk of data loss if cluster node dies, can cause unequal load-balancing |
| Database | Reliable, persistent, and can handle large data volume | Requires additional infrastructure, relatively slow |
| Redis | Fast, persistent, easy to integrate | Requires additional infrastructure |
| JMS/Inter-node messaging | Push vs. pull/poll for data changes, no single point of failure | Complex, manual configuration |
|-----------------+------------------------------------------------------+---------------------------------------------------|
{: rules="groups"}

# In-Memory Data Grid

While each of those data sharing options have solid use cases and can get the job done none of them provide the same capabilities, redundancy, and ease-of-use as an In-Memory Data Grid. IMDGs have been around for quite a while and I’m sure you’ve heard of some of the more popular products: [Gemfire](https://pivotal.io/big-data/pivotal-gemfire), [Coherence](https://www.oracle.com/middleware/coherence/index.html), [Hazelcast](http://hazelcast.org/), [Ignite](https://ignite.apache.org/). Hazelcast describes an IMDG as:

> An In-Memory Data Grid is data management software that enables:
> <br/>**Scale-out Computing**: every node adds their CPU to the cluster
> <br/>**Resilience**: nodes can fail randomly without data loss or significant performance impact to running applications
> <br/>**Programming Model**: A way for developers to easily program the cluster of machines as if it were a single machine
> <br/>**Fast, Big Data**: it enables very large data sets to be manipulated in main memory
> <br/>**Dynamic Scalability**: nodes (computers) can dynamically join the other computers in a grid (cluster)
> <br/>**Elastic Main Memory**: every node adds their RAM to the cluster’s memory pool

Coherence is a commercial-only product, the API is showing its age, and can be unreliable in virtualized environments. Gemfire also is commercial-centric and can be daunting to configure and deploy. Apache Ignite was tempting since it’s fully-backed by Apache and is fairly new, but it is still undergoing rapid changes and has a few rough edges on its API. For these reasons I chose to go with Hazelcast.

# What can you use an IMDG for?

## Data Management

As the name implies, IMDGs store data in-memory (not on disk) which makes them incredibly fast. Most products support automatic cluster discovery via [Multicast](https://en.wikipedia.org/wiki/Multicast) or a service discovery product like [Eureka](https://github.com/Netflix/eureka). When members join or leave the cluster the IMDG will automatically redistribute data using a technique known as ‘sharding’ or ‘partitioning’ to spread data while also maintaining a backup of item on n nodes; in this way any cluster member can leave without losing any data. The sharding strategy also gives the IMDG insight into what node hosts each data item – this allows requests to be efficiently routed. Familiar data structures like Maps, Lists, and Counters are made available by the API allowing your code to easily interface with the data store.

## Distributed Computing

Let’s say you have a Banking application and at the end of each day you need to total up the debits and credits for each account. In a standard single datastore solution you would retrieve the list of accounts and iterate across them to perform this calculation. Since data is stored on multiple systems in an IMDG you can craft a job that gets dispatched and executed on each node concurrently in the style of [MapReduce](https://en.wikipedia.org/wiki/MapReduce). In this way each cluster node performs the job on the data it locally holds which distributes processing to multiple systems while also keeping logic close to the data it operates on.

## Caching

One of the most frequent uses of an IMDG is to serve as a caching layer for a backing database. Hazelcast has built-in support to act as a second-layer cache for Hibernate and also is fully-compliant with [JSR-107](https://jcp.org/en/jsr/detail?id=107) (JCache). For more information on JCache I recommend this [great article](https://spring.io/blog/2014/04/14/cache-abstraction-jcache-jsr-107-annotations-support) which compares it with the Spring caching abstraction that you may be more familiar with.

# Implementation

So, now that we know what an IMDG is, how can we use it? The good news is that Hazelcast is extremely easy to integrate into a Java/Groovy environment (it also happens to support .NET, C++, and Python clients connecting to it).

To give you can example of how Hazelcast can be integrated with Grails I’ve created an [example application out on GitHub](https://github.com/mike-plummer/DistributedGrails). The application uses Docker to create a single load-balancer in front that round-robins traffic to a dynamically scalable set of Tomcat nodes. Each Tomcat node deploys the same Grails app and forms part of a Hazelcast cluster for data storage and caching.

Each instance’s Hazelcast logic finds the others via multicast and two data tiers are established: caching and data storage. Each layer is partitioned and shared across the cluster so each node is in effect sharing the same cache and data storage. Network requests are round-robined between the nodes by the load balancer to demonstrate the ability of any node in the cluster to handle any request.

## Caching

The example routes all data requests through a Grails service that is configured to use JCache. The annotations on each method control cache behaviors and allow you to add caching with very little code.

{% highlight groovy %}
@CacheDefaults(cacheName = CityCache.CITY_CACHE_NAME, cacheResolverFactory = CustomCacheResolverFactory.class)
class CityService {
def cityDataService

    @CachePut(cacheKeyGenerator = CustomCacheKeyGenerator.class)
    City create (@CacheValue City city) {
        cityDataService.addOrUpdate(city)
    }

    @CachePut(cacheKeyGenerator = CustomCacheKeyGenerator.class)
    City update (@CacheValue City city) {
        cityDataService.addOrUpdate(city)
    }

    @CacheResult
    City get (@CacheKey long id) {
        cityDataService.get(id)
    }

    @CacheRemove
    void delete (@CacheKey long id) {
        cityDataService.remove(id)
    }

    @CacheRemoveAll
    void deleteAll () {
        cityDataService.removeAll()
    }

}
{% endhighlight %}

JCache intercepts each of the annotated methods and updates a Hazelcast-managed distributed map with data as it changes. On future retrievals the cache will supply the data rather than continuing on to the database which decreases load on the data store while improving performance.

## Backing data storage

In the Grails example I have used Hazelcast as my data storage layer rather than Hibernate. This demonstrates the use of Hazelcast distributed data structures outside of a construct like JCache and how data is partitioned across the cluster. In addition to storing data Hazelcast also supplies several useful constructs like a cluster-wide atomic ID generator which allows us to safely and easily generate unique identifiers as well as other features like Locks and eventing Queues and Topics.

{% highlight groovy %}
class DataService {
def hazelcastService

    E addOrUpdate (E entity) {
        if (entity.id == null) {
            entity.id = hazelcastService.getIdGenerator("ID_GENERATOR_NAME").newId()
        }
        hazelcastService.getMap("MAP_NAME").put(entity.id, entity)
    }

}
{% endhighlight %}

## Distributed Computing

A single distributed job to total up the population of all the cities in the dataset has been configured. This job is dispatched to each node to be run in parallel against the data stored on that node and the results from each node are returned to the originating node to be combined and returned to the user.

{% highlight groovy %}
def distributedSumPopulation() {
JobTracker tracker = hazelcastService.getJobTracker("CITY_POPULATION_SUM")
KeyValueSource source = KeyValueSource.fromMap(getHazelcastMap());
Job job = tracker.newJob(source)
ICompletableFuture future = job
.mapper(new PopulationMapper())
.reducer(new LongSumAggregation.LongSumReducerFactory())
.submit(new PopulationCollator())
return future.get()
}

class PopulationMapper implements Mapper {
public void map(Long key, City value, Context context) {
context.emit("populationsum", value.population);
}
}

class PopulationCollator implements Collator&lt;Map.Entry, Long&gt; {
public Long collate(Iterable&lt;Map.Entry&gt; values) {
return (Long) values.sum { value -&gt; return value.getValue() }
}
}
{% endhighlight %}

## Angular 2

The user interface for this application is Angular 2 written in TypeScript. To simplify project setup and the compilation process I chose to transpile TypeScript in-browser using System.js. Typically Typescript would be transpiled to nicely-minified ES5-compliant JavaScript during application packaging. Note that Angular 2 is still in Beta so all of the APIs are still subject to change.

## Docker & Docker Compose

As mentioned above I used Docker and Docker Compose to achieve an easy ‘clustering’ simulation. The application can be run as a standard Grails application if desired but will obviously not have any of the advertised cluster behaviors. The Docker Compose file below defines the Tomcat and Load Balancer containers and allows us to dynamically scale our application in a cluster. Each container acts like a miniature virtual machine and allows us to simulate a complex network of connected systems without extra hardware or the expense of a full-on virtualization solution.

{% highlight yaml %}
node:
image: tomcat:8.0.28-jre8
volumes: - ./build/libs/DistributedGrails.war:/usr/local/tomcat/webapps/DistributedGrails.war:ro
proxy:
image: tutum/haproxy
links: - node
ports: - "8080:80" - "1936:1936"
environment: - BALANCE=roundrobin - STATS_PORT=1936
{% endhighlight %}

Docker takes care of networking, filesystem, and the rest of the operating system by acting as a shallow interface layer atop your host operating system. Without going into specifics this basically means that Docker containers start up very quickly and consume fewer resources than standard virtual machines. Combine this with the thousands of downloadable images from [DockerHub](https://hub.docker.com/) and Docker becomes a very attractive solution for virtualization, especially during development.

# Wrap Up

I hope I’ve shown you a few neat tools to add to your kit. Now you have a starting point for distributing data with Hazelcast, caching data with JCache and Grails, containerizing your application with Docker, or writing an Angular2 front-end. Take a look at the [example application](https://github.com/mike-plummer/DistributedGrails) and try it out for yourself.

Happy coding!

**Updated 29 December 2015**: Rephrased cons for Redis and Databases to reflect that they can be configured to improve redundancy at the cost of additional infrastructure/maintenance.
