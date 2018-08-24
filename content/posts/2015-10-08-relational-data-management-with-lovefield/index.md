---
title: Relational data management with Lovefield
date: "2015-10-08T00:00:00.000Z"
path: "/2015-10-08-relational-data-management-with-lovefield/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2015/10/08/relational-data-management-with-lovefield/)*

When writing a new JavaScript application I often find that the hardest part isn’t the UI or functionality but rather accessing and managing data. Storing dozens of arrays of dynamically-typed objects in memory and iterating across them hundreds of times is a recipe for poor performance and hard-to-maintain code. My new favorite tool to combat this problem is a Google open-source project called [Lovefield](https://google.github.io/lovefield/). If you want to jump straight into some code you can [head over to GitHub and pull down the example](https://github.com/mike-plummer/LovefieldExample), otherwise let’s learn a bit about what Lovefield is and what makes it so great.

## Overview

Lovefield acts as a wrapper around a number of different data sources to supply your JavaScript application with a familiar relational datastore. For those unfamiliar with relational databases a Schema is a collection of Tables, a Table is a set of Columns, and a Column is a field with a defined data type and constraints. A Table contains Rows each of which have a value (potentially null) for each Column of the Table. Any combination of columns can be associated to one another to establish foreign key relationships – in this way data linkage and integrity can be established by the data store itself.

By default Lovefield leverages the [IndexedDB](http://www.w3.org/TR/IndexedDB/) implementation supplied by the vast majority of [modern browsers](http://caniuse.com/#feat=indexeddb) (mobile browsers included), but you can also configure it to use an in-memory datastore, an external Firebase instance, or even the somewhat long-in-the-tooth WebSQL. After loading data into the datastore, Lovefield supplies all the power of relational query languages like SQL, albeit in a somewhat cleaner and friendlier form, to execute clear, concise, targeted queries against a sizeable amount of data.

## Advantages

Besides being a true cross-browser solution for data storage, incorporating Lovefield into your application will give you a number of other great capabilities.

### Standard Relational Datastore Capabilities

The vast majority of features supplied by a product like MySQL or PostreSQL have an analog in Lovefield.

* Schema and table declarations to form the structure of your data
* Column datatypes and constraints (including foreign keys)
* Support for highly efficient and complex queries
* Implicit and declarative Transactions
* Convenience aggregator functions (average, min/max, standard deviation, distinct values, etc)
* Support for grouping query results

### Data Contracts

One of the battles I find myself constantly fighting is the dynamic nature of JavaScript – I can’t ever guarantee what fields an object contains and I don’t know anything about the contents of those fields without writing a lot of custom guard logic. Lovefield completely alleviates this concern in large swaths of my code since the schema definition of each table guarantees that when I pull an object out of the database it will have a known set of fields and each field will be of a known datatype. When pushing data into the database you also get the benefit of this field and datatype checking as well as all the other value and relationship constraints that Lovefield supplies. Any data that fails one or more of these conditions will be rejected automatically.

### Offline Use

Since behind the scenes Lovefield is using the browser-provided IndexedDB instance your data is actually written to disk rather than being held in memory. This means that, if your user were to lose network connectivity, Lovefield could continue to serve and accept data for your application. With just a little extra effort you can configure your application to gracefully handle a connectivity loss and, once the connection is reestablished, push any changes to the server. This increases the reliability and flexibility of your application.

### Performance vs. Complexity

In general I’ve found that Lovefield supplies performance roughly equal to what I see writing custom logic to perform the same sorting/filtering operations, especially once the overhead of a service call to acquire that data is factored in. Where Lovefield really shines is that, due to its persistent nature, this service call is often unnecessary which drastically reduces time spent waiting for data. Furthermore, Lovefield can be easily optimized to query on specific fields or to sort data in a particular manner by a well-structured schema and the use of indexes. Even in a worst case scenario where Lovefield ends up taking longer than existing logic it is my opinion that any small loss in performance is more than offset by gaining the flexibility and structure of a full relational query engine and getting to jettison hundreds of lines of custom filter/sort JavaScript from my application. Your mileage may vary, of course.

## Limitations

Nothing is perfect. There are a few limitations to using Lovefield in your application.

### Data Volume

Lovefield has been aggressively optimized and streamlined to provide superior performance under load compared to most custom solutions, but no amount of optimization can overcome the fact that your code will be running in an unknown hardware environment in a language that’s effectively single-threaded. I personally have loaded up an instance with over a hundred thousands rows of data and seen very good performance, but all it takes is a user to load your application in IE6 on a 10-year-old processor for it to grind to a halt. The Google team recommends limiting the amount of data to 50-100 thousand rows but that can vary depending on the complexity of each of those rows and your target environment (desktop vs. mobile, modern browsers only vs. all-comers).

### Work in Progress

Perhaps the biggest shortcoming of Lovefield is that, although being [released about a year ago](http://google-opensource.blogspot.com/2014/11/lovefield-powerful-javascript-sql-like_17.html), it is not yet feature complete. ~~Support for foreign keys is still being actively developed~~ (**21 December 2015**: Foreign Key support has been added!), and performance and bug fixes are ongoing. Some users may take this as a sign that Lovefield isn’t ready for production, but I will mention that Google disagrees with that assessment – a significant portion of the Google Play Movies app has been running on Lovefield for over a year now.

### Environment

For the NodeJS enthusiasts out there, I have bad news: Lovefield is designed to be used in a client JavaScript environment (primarily due to reliance on the browser to supply IndexedDB) ~~so it will not work in your server-side code.~~ (**21 December 2015**: Lovefield can be used in a NodeJS environment with the in-memory store, but requires a browser to supply the persistent IndexedDB store.)

## Code

Now that we’ve discussed the good and the bad let’s see how we actually use Lovefield. The API is [well documented](https://github.com/google/lovefield/blob/master/docs/spec_index.md) which makes it easy to get started.

The first step is to setup your schema. In Lovefield the schema declaration process is performed once and the API is synchronous.

```javascript
var schemaBuilder = lf.schema.create('data', 1);
schemaBuilder.createTable('Cities')
  .addColumn('id', lf.Type.NUMBER)
  .addColumn('name', lf.Type.STRING)
  .addColumn('state', lf.Type.STRING)
  .addColumn('population', lf.Type.NUMBER)
  .addPrimaryKey(['id'])
  .addIndex('idxPopulationAsc', ['population'], false, lf.Order.ASC);
```

The above code segment establishes a schema named ‘data’ and a table in that schema named ‘Cities’. The table has four columns: a number ‘id’, a string ‘name’, a string ‘state’, and a number ‘population’. By default these columns are created as non-nullable; when a row is inserted into this table Lovefield will automatically verify that each field matches the expected datatype and nullability state. The last two lines establish the primary key which requires every row in this table to have a unique value for ‘id’ and lastly builds an index which causes Lovefield to maintain a separate data structure to allow us to efficiently query against the population field in ascending order.

At this point the database doesn’t exist yet. We need to use the SchemaBuilder instance we’ve created to tell Lovefield to construct the schema and allow us to work with it. Once the schema is constructed it cannot be modified. This stage marks an important distinction: operations prior to this point are synchronous but operations from this point on are asynchronous with heavy use of [Promises](https://spring.io/understanding/javascript-promises). The following snippet shows us connecting to the database and executing a simple query.

```javascript
schemaBuilder.connect().then( function(db) {
  var Cities = db.getSchema().table('Cities');
  // SELECT COUNT(id) FROM Cities;
  return db.select(lf.fn.count(Cities.id)).from(Cities).exec();
});
```

The above code establishes a connection to the schema we defined and uses it to construct a query using Lovefield’s query API. We first get a handle on the ‘Cities’ table, then lookup the columns we wish to query on. This syntax is a departure from SQL which uses raw Strings in the query itself to refer to tables and columns – Lovefield has you look up these query components which makes it easier to construct queries and also forces errors to occur earlier and in a more explicit way when things go sideways. The net result of this query is to return the total number of rows in the ‘Cities’ table. The exec() call at the end kicks off the query and returns a promise that will resolve to either the query result or an error if one was encountered.

```javascript
var Cities = db.getSchema().table('Cities');
// SELECT name FROM Cities WHERE state = "NE" ORDER BY population ASC;
return db.select(Cities.name)
         .from(Cities)
         .where(Cities.state.eq('NE'))  //Predicate
         .orderBy(Cities.population, lf.Order.ASC).exec();
```

For more complex queries Lovefield uses the concept of Predicates. Think of a Predicate as a single segment of a Boolean Logic expression – typically it takes the form of “FIELD.OPERATOR( VALUE )”. Lovefield supports chaining multiple predicates using AND, OR, and NOT to generate incredibly complex expressions in an easy to manage and organize fashion. In addition, you can order and group the results to put the finishing touches on how you need your data.

```javascript
// Retrieve list of city data from an Angular service
CityService.list(null, function(cities) {
  var cityRows = [];
  cities.forEach(function(city) {
      // Convert each item retrieved from service into a Lovefield row object
      cityRows.push(Cities.createRow(city));
  });
  // Add all the rows built to the database.
  db.insertOrReplace().into(Cities).values(cityRows).exec();
  // Should use promises to ensure this runs after insert is complete - removed for brevity
  db.delete().from(Cities).where(Cities.population.lte(5000)).exec();
}
```

In this last code snippet you can see examples of inserting and deleting rows. The basic setup is quite similar to the select queries – each expression is constructed using a Builder-pattern API and executed using a Promise.

## Conclusion

Hopefully by now you’ve seen how powerful Lovefield is and want to start using it in your applications. Besides the neat features and potential performance gains the main reason I love Lovefield is that it frees me from writing boilerplate code throughout my application. Nothing is more dreary than constantly verifying a value is non-null or that a variable is a number rather than a string. This, combined with the ability to gain offline capability in my webapps, was all I needed to convince me that Lovefield was a fantastic tool that I plan to use whenever I can. If you want to see it in action take a look at the [example Lovefield app I put together out on GitHub](https://github.com/mike-plummer/LovefieldExample).

Any questions or comments? Leave them below. Otherwise, happy coding!
