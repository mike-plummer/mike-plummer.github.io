---
title: Interfacing Groovy (and Java) with Native Libraries
date: "2015-04-21T00:00:00.000Z"
path: "/2015-04-21-interfacing-groovy-and-java-with-native-libraries/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2015/04/21/interfacing-groovy-and-java-with-native-libraries/)*

As much as we hate to admit it, from time to time there are benefits to languages that operate outside the JVM. Whether it’s interfacing with hardware or simply being faster compiled code, C/C++ provide some advantages that Groovy just doesn’t have out of the box. Luckily for us there are plenty of ways we can have our cake and eat it too: Java has had the ability to execute Native code for quite a while, thus Groovy has it too.

Most seasoned Java developers are already cringing as they read this – Java Native Interface (JNI) is the method Java supplies to interact with Native libraries and has a well-deserved reputation for being unwieldy and heavy on the boilerplate. Over the years a variety of new frameworks have arisen that take a lot of the effort out of JNI and go a long way towards reducing the “rinse-lather-repeat” code that unnecessarily clutters your baseline. I’ve coded up an example out on [GitHub](https://github.com/mike-plummer/NativeGroovy) that demonstrates three quick uses of two different frameworks that allow you to invoke C/C++ code from a Groovy or Java program – the code will give you the full story but I’ll hit the high points here.

For this example I’m going to execute a very simple C program that simply prints a String to standard out – obviously this is a trivial piece of logic that doesn’t warrant a Native Library on its own but it helps keep things simple since we’re focusing on how to interface with a library.

```c
#include <stdio.h>

void printValue(char* value) {
	printf("\n%s\n\n", value);
}
```

This function has a corresponding header file (which will be very important in just a minute):

```c
#ifndef nativegroovy_h__
#define nativegroovy_h__

extern void printValue(char* value);

#endif //nativegroovy_h__
```

Using GCC we can quickly compile this into a shared library (a .dll, .so, or .dylib depending on your flavor of OS). I won’t go into detail on this process, but included in the example is a [bash script](https://github.com/mike-plummer/NativeGroovy/blob/master/buildLibrary.sh) that attempts to compile the appropriate type based on your OS (assuming you’re on a Linux or Mac system).

Great, so we have a shared library. Now what?

The example makes use of two different frameworks: [JNA](https://github.com/twall/jna) and [BridJ](https://github.com/nativelibs4java/BridJ). JNA (Java Native Access) is slightly older (no automatic support of generics) but more robust while BridJ is relatively new (generics support, potentially more performant depending on your setup) but is still a work in progress.

The first approach from the example shows a manual setup of JNA. Being a smart person intimately familiar with C/C++ syntax (aren’t we all?) you can manually inspect the header file from above and create an interface that exactly matches the functions that the library supplies. This works best for simple datatypes for obvious reasons – Strings, ints, and floats but stay away from structs. Once we have that interface we can ask JNA to load the NativeLibrary and map it to an instance of the interface we just created and presto, any calls we make to the interface will get dispatched to the library to be executed.

```groovy
//Define an Interface that exactly matches our header file
interface NativeExample extends Library {
	void printValue(String value)
};

//Load library into an instance of NativeInterface
def nativeLibrary = Native.loadLibrary(System.getProperty('nativegroovy.library.path'), NativeExample.class)
//Call method - JNA intercepts this and invokes the library for us
nativeLibrary.printValue('Go go gadget Manual JNA')
```

This approach is fine for very simple functions, but what if you’re trying to map a very complex function or a large number of functions? Never fear, there are tools to help you. A really great library called [JNAerator](https://github.com/nativelibs4java/JNAerator) does all the work for you – all you have to do is pass in the header file to your library and it will automatically generate a JAR file containing all the interfaces and bindings that are necessary. I’ve extracted this step in the example project’s Gradle build script so that, once that JAR is created, our code ends up even more concise.

```groovy
//Build a ByteBuffer - roughly analagous to a Pointer to memory block
def value = ByteBuffer.wrap(Native.toByteArray("Go go gadget JNA"))
//Tell JNA to build an interface to the Native Library
def library = Native.loadLibrary(NativegroovyLibrary.class)
//Pass the ByteBuffer to the Native Library function
library.printValue(value)
```

Concise, yes, but not quite as clean. ByteBuffer? Where did that come from? The unfortunate tradeoff of the auto-generation is that the code often comes out a bit more complicated than necessary. It takes a little more work to use, but saves tons of time up front.

We just used JNAerator to create JNA bindings but the tool actually by default tries to create BridJ bindings which are typically a bit cleaner and more performant. By making a quick tweak to how we call JNAerator (again, done in the Gradle script) we generate another JAR that, internally, is quite a bit different and presents a much cleaner interface.

```groovy
//Build a pointer to your String (turn it into a more C-like String)
def value = Pointer.pointerToString("Go go gadget BridJ", StringType.C, Charset.defaultCharset())
//Invoke native library method (with BridJ doing the heavy lifting)
NativegroovyLibrary.printValue(value)
```

How cool is that? It only takes a couple lines of Groovy to execute a function in a shared library. Granted there’s an extra JAR floating around in your classpath for the bindings, but that code is safely packed away not polluting your baseline and you never once have to set eyes on it.

In the example project if we call each of the three different Gradle tasks in order to perform Manual JNA, Auto-Bound JNA, and Auto-Bound BridJ we get the following sets of output:

    $ gradle -q runManualJNA
    Go go gadget Manual JNA
    $ gradle -q runBoundJNA
    …
    Go go gadget JNA
    $ gradle -q runBoundBridJ
    …
    Go go gadget BridJ

Three different executions of a shared library in a tiny little package. Now, before you get all giddy and decide to roll Native Library use into a future project you should be aware of the following shortcomings:

1. Using native libraries breaks the central tenet of JVM languages – “write once, run anywhere”. Your code will only execute on systems that have the library installed.
2. It’s difficult to analyze and test: static code analysis tools and unit tests likely won’t be able to effectively analyze libraries.
3. You lose the protections of the JVM: you’re inherently stepping outside the sandbox so you lose the security protections it provides and you have to start thinking about memory management.
4. Performance can be a problem: depending on how the bindings get set up and how you call the functions you could actually make things slower. Generally speaking, native calls are better left for complex functions that are called infrequently rather than high-volume simple functions.

So there you have it – another simple way to get more done with Groovy. Questions, comments, concerns, compliments? Leave ‘em below. Otherwise, take a look at the example available on my [GitHub](https://github.com/mike-plummer/NativeGroovy).

Happy coding!
