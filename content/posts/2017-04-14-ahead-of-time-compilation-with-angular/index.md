---
title: Ahead of Time Compilation with Angular
date: "2017-04-14T00:00:00.000Z"
path: "/2017-04-14-ahead-of-time-compilation-with-angular/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2017/04/14/ahead-of-time-compilation-with-angular/)*

It’s hard enough getting your Grunts, Gulps, and Webpacks working with a complex Angular codebase, but is it really how you’re supposed to build your application for production? These days, every byte counts when your app has to work on mobile and Internet of Things devices that operate at the end of some very narrow bandwidth pipes. In this article I’ll walk though my experience getting Ahead of Time (AOT) compilation working in my Angular baseline and show just how much bandwidth and performance savings you could be seeing with a little work on your build process. Or, if you’d prefer you can jump straight to an [example project](https://github.com/mike-plummer/angular-compilation) to see it in action.

Note that throughout this post I’m just using the term “Angular” without a version attached [per the Angular team’s guidance](https://angular.io/presskit.html). Don’t worry, everything described here works exactly the same in Angular 2 & 4 (and hopefully beyond).

# What is AOT Compilation?

Compilation isn’t a phrase most JavaScript developers deal with these days. Usually the nitty-gritty of how the code executes is left to the JS runtime engine. In Angular the concept of compilation can be better thought of as the process of generating the lifecycle hooks, event listeners, and decorations that tie Angular components, services, pipes, and other elements together. It’s not compiled code in a true sense since you end up with more Javascript, but it takes your code from the decorated TypeScript you’ve written and converts it into pure, runnable Javascript.

Most Angular tutorials show how to bootstrap your app using the *dynamic browser platform*. A major drawback to this approach is that the Angular Compiler module will get bundled alongside your code and, at bootstrap, your code will get dynamically compiled on the client system. This means that your client has to download un-optimized code, has to download a rather large Angular compiler module, and has to spend CPU cycles to compile the application.

AOT Compilation generates prepared code that can be downloaded by your clients. This results in a **much** smaller application that, especially on complex applications, also has execution speed benefits.

# Why doesn’t Angular do this by default?

There are a couple reasons why the “default” approach for Angular is to build dynamically.

## Debugging & Sourcemaps

The last thing in the world you want to do is deliver sourcemaps to your client. Not only are they extremely large but also can expose internal details of your codebase that you would prefer the casual observer didn’t have access to. That said, the second to last thing you want to do is try to develop **without** sourcemaps. Angular is setup out of the box to work great for development by avoiding premature optimizations, leaving you to decide the right time and way to prep for production.

## Easier iteration

Most everyone has hooked up [Webpack](https://webpack.github.io/), [Rollup](https://github.com/rollup/rollup), or another similar bundler. All of these come with some sort of “live reload” capability, but depending on the complexity and configuration of your AOT build this sort of reload may not be able to properly rebuild on-the-fly, and definitely won’t do it in a time-efficient manner.

## Simpler build process

Really it comes down to this: how many different buttons do you have to push to get an Angular application building on your machine? The fewer the better. Compilation and other optimizations add complexity to your build process making them unwieldy to setup and manage, especially during the turbulent period of initial development.

# Let’s get started

The examples here use the following tools: Webpack 2.3.2, Angular 4.0.1, TypeScript 2.2.2. Throughout the code examples I’ll be referring to my normal “dev” build and my “prod” build that uses AOT.

## Bootstrap

First let’s compare how we bootstrap our application in a dev build…

```typescript
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);
```

…compared to our production bootstrap.

```typescript
import { platformBrowser } from '@angular/platform-browser';
import { AppModuleNgFactory } from '../aot/src/app/app.module.ngfactory';
import { enableProdMode } from '@angular/core';

enableProdMode();

platformBrowser().bootstrapModuleFactory(AppModuleNgFactory);
```

The first thing you probably notice is the “enableProdMode()” call – this not strictly necessary but is advised when running outside of a development environment. By default, Angular runs a second change detection cycle after each main one. This checks to see if anything changed after it should have and notifies you of a bug if a change is detected. By enabling prod mode this second run is disabled thus improving performance.

Next up is our use of “platformBrowser()” instead of “platformBrowserDynamic()”. The “dynamic” part really means that you plan to deliver “raw” code so Angular has to deliver the compiler module to compile your Angular code once it is loaded on the client device. Not only does this cause some serious bundle bloat (the Angular compiler is ~900 KB) but it also wastes time and energy in the client browser. By using “platformBrowser()” we tell Angular that we’re delivering pre-compiled code so it doesn’t need to work as hard.

Finally, in the development build we just reference “AppModule” to bootstrap, but in our prod configuration we reference “AppModuleNgFactory”. Most of you are probably confused since this file doesn’t sound very familiar – don’t worry, this is an output of the compilation process I’ll describe next. Put simply, it is an executable form of AppModule that includes all the compiled bindings, templates, styles, and Angular logic that you normally don’t get to see.

The good news is that this is the only change needed in your Typescript – all of your components, directives, services, and pipes can remain exactly as they are provided you stuck to the guidelines and avoided interaction with native elements and other “hacks”.

## Compilation

So, now that we’ve seen what we need for our bootstrap we need to figure out how to build that AppModuleNgFactory file. The magic lies in some changes to your tsconfig.json file as well as tweaks to your build script. The Angular team has developed a special Typescript compiler called NGC (Angular Compiler, get it?) which, in addition to handling normal Typescript compilation, handles injecting the lifecycle events, bindings, template hooks, and other Angular features into your executable Javascript. One of the biggest changes that has to be made is to send all of your Angular-related code through NGC as a first-stage in your build process so that the compiled output can later be bundled.

In tsconfig.json the following block needs to be added to give instructions to NGC:

```javascript
"include": [
  "src/**/*.module.ts",
  "src/main-aot.ts"
],
"angularCompilerOptions": {
  "genDir": "aot",
  "skipMetadataEmit" : true
}
```

Feel free to mess with the “genDir” property – this determines where in your project to write the compiled output files. I recommend naming it something distinctive to make it easier to separate dev from prod files in your bundling phase. The other important change to make here is to alter the include and exclude properties to reference the prod bootstrap file we saw in the previous section so that NGC compiles the correct files.

In my application I setup the following helpful scripts in my package.json to help me kick off a dev or prod build.

```javascript
"scripts": {
  "start": "webpack-dev-server",
  "start:aot": "npm run ngc &amp;&amp; webpack-dev-server --config webpack-aot.config.js",
  "ngc": "node_modules/.bin/ngc -p tsconfig-aot.json"
}
```

In a dev build I just start Webpack normally which causes it to load the default config file “webpack.config.js”, but for a prod build I first run NGC using a custom tsconfig.json file then launch Webpack with a prod-specific config file. For this example I duplicated quite a bit of configuration between my dev and prod tsconfig and Webpack files to make it easier to examine – you can combine a lot of this to reduce the overall configuration sizes if the boilerplate bothers you.

## Bundling

Okay, so now we’ve got our Angular code pre-compling with NGC, our bootstrap phase references this compiled code, and we have helper scripts setup. But how do we teach Webpack to build an optimized bundle?

First we need to reference the prod bootstrap class as our entry point:

```typescript
entry: {
  app: './src/main-aot.ts'
}
```

In the example application I put together I also decided to use the Angular router to get progressive/async loading working. Basically, parts of the application aren’t loaded until they are needed, further reducing the initial download for your client. I won’t include this code to keep things simple, but if you want to see that in action the example has it all spelled out.

Next, assuming all of your HTML and CSS is being referenced via component decorators, you can carve a few KB’s out of your bundle by telling Webpack not to include these files since NGC has already inlined them in the compiled factories.

```javascript
{
  test: /\.html$/,
  exclude: /index\.html$/,
  loader: 'ignore-loader'
},
{
  test: /\.css$/,
  loader: 'ignore-loader'
}
```

I highly recommend running your bundles through an appropriate minifier and (optionally) mangler. The go-to for most is [UglifyJS](https://github.com/mishoo/UglifyJS2) but some new options like [Babili](https://github.com/babel/babili) have cropped up recently that may work better for you depending on your build and style. The example application happens to use both UglifyJS and the [Google Closure Compiler](https://developers.google.com/closure/compiler/) to eke out some extra savings. Unfortunately Angular doesn’t play very well with the Closure Compiler’s advanced mode, but the simple mode still has some nice (smaller) gains.

Finally we add the [webpack-html-plugin](https://github.com/jantimon/html-webpack-plugin) to prepare our index.html page by injecting links to the prepared bundle.

```javascript
new HtmlWebpackPlugin({
  title: 'Angular2 Compilation',
  template: 'src/index.html',
  chunks: [ 'app' ],
  minify: {
    caseSensitive: true
  }
})
```

There. Done. Easy, eh?

# Results

In the example application I setup separate dev and prod build paths so I could easily compare the exact same code running with the “easy” optimizations like minification and compression versus an optimized state using AOT Compilation.

ELEMENT | DEV | PROD | IMPROVEMENT
:---|:---:|:---:|:---:
Bundle Size |	174 KB | 85KB | 50.9%
Bootstrap Time | 130ms | 29ms | 77.7%

Granted, the example application is simple and contrived, but the results are hard to argue with. Over a 50% decrease in bundle size and more than a 75% reduction in bootstrap time.

# Gotchas and Drawbacks

## Separate your dev and prod build configs

I wasting an embarrassing amount of time early in this project because my prod bundles were actually coming out **bigger** than my dev bundles. I tried switching from Webpack to Rollup and back, switched minifiers, and tried tacking on long shot Babel optimizers. Eventually I realized that the tsconfig.json file I was passing to NGC wasn’t excluding my dev bootstrap file, thus all of my components were being bundled in both compiled and uncompiled forms. <sigh>

While it’s definitely possible to try to run your builds based on environment variables and clever extension, in my personal experience the minor increase in config file bloat by creating two separate config files is more than worth the reduced headaches and hassle.

## Don’t color outside the lines!

Angular AOT is setup to work really well so long as your stick to the recipe. Reference your templates and styles from your component decorators, avoid native element interaction at all costs, and carefully structure your application with modules to avoid cross-references.

## Styling and templating engines

Let me be clear: it is absolutely possible to use [Jade/Pug](https://pugjs.org/)/etc templates and [LESS](http://lesscss.org/)/[SASS](http://sass-lang.com/) styling with AOT. You will need to add a preprocessor since NGC will not do the transpilation magic for you and, since these get inlined into the component factories, the regular Webpack loaders won’t get triggered. For the example I stuck with regular old HTML and CSS – it’s old school but it keeps things simple.

## Weak error reporting

Another entry in the “wasted a lot of my time” column: you can’t necessarily rely on the AOT compiler or compiled Angular code to give you helpful error messages when something goes wrong. This is especially true of “bootstrap phase” errors in my experience. For this reason it’s very helpful to have a simpler dev build process to bypass the compilation to see if you get better information that way. If that doesn’t work you can at least debug the code at that point.

## Template & Style optimizations

At the moment NGC is not optimizing the content it inlines as much as it could be. This is especially true of CSS – the compiled output from NGC includes the raw content of the file converted to a string, new lines and all, thus bloating the files just a little bit more than they need to be. I’m sure this could be worked around with some clever pre/post processing, but it wasn’t worth it to me to chase down for the KB or two I would gain.

# Wrap Up

AOT is definitely not something you can just tack on to a large, complex Angular application so it won’t work well for everyone, but if you plan it in from the start and stick to the guidelines it has some really great benefits. Will you get clients calling you to praise you for how little data your app uses and how fast it loads? Probably not, but you won’t get complaints about how you blew through their data plan and killed their cell phone battery.

As I’ve mentioned throughout this article I have prepared a [simple example out on GitHub](https://github.com/mike-plummer/angular-compilation) that you can take a look at. While I tried to include as many optimizations as I could without making things terribly complicated I’m sure I missed some – if you see something I missed then feel free to [open an issue on the GitHub repo](https://github.com/mike-plummer/angular-compilation/issues).

Hopefully you’ve learned a new trick to add to your Angular toolbox. Happy coding!
