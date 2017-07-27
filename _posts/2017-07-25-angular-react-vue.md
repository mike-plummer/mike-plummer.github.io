---
layout: post
title: "Angular, React, or Vue JS - Which one is for me?"
description: "Comparison of Angular, React, and Vue JS frameworks"
modified: 2017-07-25
tags: [angular, react, vue, javascript]
comments: false
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2017/07/25/angular-react-or-vue-js-which-one-is-for-me/)*

Any modern front-end developer will tell you that it's nearly impossible to keep up with the break-neck pace of new JavaScript frameworks; what was hot last week is almost certainly out of vogue by the time you get around to learning it. One of the hardest choices we have to make is where to spend our time. With a massive number of tools to know but a limited amount of time to learn them it is increasingly hard to know where should we should focus our efforts and what tools to pick for our next project. I've chosen to put together a brief and simple comparison between three of the most popular front-end frameworks in the hope that maybe it will help simplify these choices for at least one developer. If all you're looking for is a code-level comparison between the three then jump straight to the [GitHub example](https://github.com/mike-plummer/angular-react-vue-stopwatch), otherwise read on.

**Disclosure:** I do most of my front-end work in Angular. I've done my best to avoid bias but my impressions are definitely colored by my background. If I've misrepresented a strength or weakness in any of these frameworks let me know.

# What does a framework buy me?
Each of the three options we'll be comparing here are types of MVC (Model View Controller) platforms that handle a number of important UI functions:

- State management
- Binding back and forth between the view and backing data
- Event handling
- Dynamic view content
- Routing

Some people don't consider React to be a 'framework' since, out of the box, it doesn't supply all of these features but for the purposes of this article I'm going to describe it as such for simplicity since you can easily add those features using community libraries.

# Angular
Of the three major players [Angular](https://angular.io/) has been around the longest by a sizeable margin. This gave the team at Google a long time to optimize and evolve the platform but resulted in a bloated, disjointed codebase. To tackle this problem Angular just went through a total, non-backwards-compatible rewrite from legacy JavaScript into [TypeScript](https://www.typescriptlang.org/). This smoothed a lot of the rough edges, built a well-documented and typed API, and seriously improved performance. However, Angular tries to be everything to everyone - it ships with it's own HTTP/AJAX module, it's own animations implementation, form validation, routing, and so on. Some people like this since most full-featured UIs need many of these features and they all integrate well with one another, but other developers prefer to use libraries they're familiar with and find it difficult to work around the built-ins. These extra features also add some serious weight to the framework - Angular deliverables are typically larger than competitors which is a concern in bandwidth-constrained environments.

## Who's in charge?
Angular was developed by Google and they continue to manage ongoing development and planning. It is [MIT licensed](https://github.com/angular/angular/blob/master/LICENSE) which basically means you don't need to worry about any patent, copyright, or usage issues.

## What's it look like?
Angular strongly encourages you to separate your business logic from styles and view code, normally into three separate files that combine to form a single 'component'. I personally like this since it helps keep things isolated and I can just rely on [Webpack](https://webpack.js.org/) to combine all these files at build time, but some developers prefer everything being more tightly coupled. To each their own.

### Controller
While you can write Angular is ES5, most people use Typescript. Decorators are used heavily to add metadata to the code such as when declaring a component controller. This defines where to look for the view and style code and manages data and event logic.

{% highlight typescript %}
@Component({
  selector: 'counter',
  templateUrl: './counter.component.html',
  styleUrls: ['./counter.component.css']
})
export class CounterComponent {
  value: number = 0;

  increment(): void {
    value++;
  }
}
{% endhighlight %}

### View
{% highlight html %}
<h2>Current value is {{ value }}</h2>
<button>Increment</button>
{% endhighlight %}

## How do I start an Angular app?
Angular has the [angular-cli](https://cli.angular.io/) tool which handles creation of a skeleton application for you including Webpack build configs, test setup, and necessary dependencies. The angular-cli also takes care of creating dev vs production configs which will give you sourcemaps and fast iterative builds during development but small, optimized builds for production.

## What if I need help?
Angular has an active community and lots of open source projects like [angular-material](https://material.angular.io/) that you can build upon. The main issue most Angular developers run into is differentiating problems/solutions between AngularJS (version 1) and Angular, so it can sometimes be hard to find the answer to questions in places like StackOverflow.

## Takeaways

| You might like... | You might hate... |
| ----------------- | ----------------- |
| Type safety (TypeScript) | Heavy platform |
| Extensive feature set - Validation, AJAX, Animations, etc. | Performance |
| Code separation | Some awkward, unintuitive APIs |

# React
[React](https://facebook.github.io/react/) takes almost a total opposite approach to Angular - it is a very light framework with few helper modules which allows it to focus on being fast and easy to learn. In fact, the common quote you'll hear is that knowing how to develop in React is 80% knowing JavaScript and 20% knowing React.

One of the biggest differences in React is how it manages to get its speed - Angular and Vue do varying levels of change detection to automatically keep your code and view in-sync, but React requires the developer to notify it of changes that are worth rendering. This makes it very fast but also requires more work and micromanagement on the part of the implementor. As you move into more advanced React projects you'll almost certainly end up using management libraries like [Flux](https://facebook.github.io/flux/docs/overview.html) & [Redux](http://redux.js.org/) to handle more complex change detection and state management situations since it quickly becomes difficult to handle manually.

Stylistically, React aims to keep code and view tightly intertwined - the view code is typically written in a mixed markup known as [JSX](https://facebook.github.io/react/docs/introducing-jsx.html). I personally don't like interweaving my code that way but I see the advantage and could get used to it given time.

## Who's in charge?
React was developed by Facebook and they continue to manage ongoing development and planning, and is licensed under a [revised BSD-3 license](https://github.com/facebook/react/blob/master/LICENSE). About a year ago there was some noise being made over the potential implications of that license - I'm not an expert in this area so I would recommend consulting your legal advisor if patents and licensing are potential friction points for you.

## What's it look like?
Below is an example of a React component written in JSX - you'll notice that the view code is directly written and returned by the component rather than being in a separate HTML file. The other thing to note is the use of 'setState(..)' - this is the hint to React that state has changed to trigger a refresh and re-render.

{% highlight javascript %}
export class Counter extends React.Component {
  render() {
    return <div>
      <h2>Current value is { this.state.value }</h2>
      <button>Increment</button>
    </div>
  }

  increment() {
    this.setState({
      value: this.state.value + 1
    });
  }
}
{% endhighlight %}

## How do I start a React app?
React has the [create-react-app](https://github.com/facebookincubator/create-react-app) tool which scaffolds a React application atop a React-managed parent configuration. This means that all of your dependencies and configs are inherited and therefore don't need to be part of your codebase, but that's only good so long as you're okay with accepting the defaults. Once you need to deviate you can 'eject' your application which copies configs and dependencies into your app at which point they become your responsibility to maintain.

## What if I need help?
React by far has the most active community of our options and the number of open source projects you can build on is incredible. Lots of options exist to add non-Core features to React like routing as well as popular UI libraries like [material-ui](http://www.material-ui.com/).

# Takeaways

| You might like... | You might hate... |
| ----------------- | ----------------- |
| Almost pure JavaScript | JSX, some awkward syntax |
| Lightweight | Intermixed View, Style, and Logic code |
| Brevity | State management |

# Vue
Vue is a relative newcomer. Those coming from Angular and React will see a lot that feels familiar - Vue shares the some of the same directive-based structures as Angular, while code organization is similar to React with intermixed view templates, logic, and styles. It also takes the approach of being a slim, targeted framework so unlike Angular there aren't many extra modules, but it does keep a lot of the helpful elements like filter/pipe chains, one-time binding, and automatic change detection. The net result is a nicely-rounded framework that'll do pretty much everything you need it to while being *crazy* fast. Overall, the impression I get of Vue is of an updated and streamlined Angular 1.x which is definitely not a bad thing.

## Who's in charge?
Vue is primarily developed by a single individual but has some corporate sponsors to pay the bills. It is [MIT licensed](https://github.com/vuejs/vue/blob/dev/LICENSE) which basically means you don't need to worry about any patent, copyright, or usage issues.

## What's it look like?
Vue splits the difference when it comes to code structure - logic, view, and style code end up in the same file but are split into sections which helps keep things a little more organized. You can technically use JSX and/or TypeScript to write Vue if you want to which eases the transition for developers transitioning from Angular and React.

{% highlight vue %}
<template>
<div>
<h2>Current value is {{ value }}</h2>
<button>Increment</button>
</div>
</template>

<script>
const state = {
  value: 0.0
};
const increment = () => {
  state.value++;
};
export default {
  name: 'counter',
  data() {
    return state;
  },
  methods: {
    increment
  }
}
<script>
<style scope>
  // Styles go here
</style>
{% endhighlight %}

## How do I start a Vue app?
Vue has the [vue-cli](https://github.com/vuejs/vue-cli) tool which behaves very much like angular-cli - it will create a skeleton project based on one of a variety of build tools including Webpack and [Browserify](http://browserify.org/).

## What if I need help?
Vue definitely has an active community but since it is so new it has fewer open source projects and contributors, but there are options [vue-material](http://vuematerial.io/#/) that are getting more mature by the day.

## Takeaways

| You might like... | You might hate... |
| ----------------- | ----------------- |
| Half-intermixed View, Style, and Logic code | Half-intermixed View, Style, and Logic code |
| Lightweight | Unintuitive attribute binding |
| Framework support for filters, computed properties, transitions, etc. | IDE support not great |

# Which one should I use?
Asking this question almost always ends up in an argument just like asking about Vim vs. Emacs, tabs vs. spaces, or GIF vs. JIF (it's GIF, by the by). Everyone has an opinion of which one is better but at the end of the day they are all perfectly solid choices. Each makes compromises in order to achieve a chosen target - React supplies very few features in order to achieve speed and simplicity, Angular sacrifices speed and simplicity to provide lots of features and a rich development experience, and Vue comes in somewhere in the middle. Which one is right for you really ends up being a question of "how do you like to develop"? Your personal preferences and experience of your team are really the deciding factors.

## Where is your focus?
### Speed: How fast will the code run?
Let's get this out of the way: all three of these options are insanely fast. Any slowness encountered isn't the fault of the framework but rather how it's being used, how data is structured, etc. There's only so much 'magic' the framework can do to overcome inefficient logic and data structures. Each tool has a set of benchmarks that proves it's the fastest in very specific circumstances, but for the general use cases that 99% of developers deal with any performance differences between the implementations are going to be infinitesimal. Technically React and Vue are neck-and-neck performance-wise with Angular bringing up the rear but in most circumstances any speed differences won't be noticeable.

### Overhead: How fast can I get started and develop in it?
Hands down winner here is React - no API to memorize, very little special syntax, and simple patterns make it super simple to get up and running. Vue definitely takes more effort followed by Angular which has a relatively high learning curve.

### Complexity: How maintainable will my code be?
Every single example application you'll see in React, Angular, or Vue will fight over how simple the code is, but the real test is how things look once you have to develop a **real** application. In my personal experience this is where code separation, solid structure, and typings show their strength which puts the advantage firmly on the Angular side. TypeScript and an opinionated API make it easy to refactor code later in the development process whereas with React you're often left hunting for magic strings and undefined properties. That said, these same strengths add weight that may be overkill for simple applications so it's important to know where your project is heading and choose whether you want some pain now or more pain later.

### Targets: What platform(s) are you developing for?
A big focus these days is the idea of 'native' applications. It's all well and good to make you webapp load in a mobile browser but it's a much better user experience to develop a true mobile app with native Android/iOS look-and-feel. There are several toolchains that can transform webapp codebases into native apps that look and behave just like they had been developed for the mobile platform. Angular has the [Ionic](http://ionicframework.com/) toolchain as well as [NativeScript](https://www.nativescript.org/) integration and React has [React Native](https://facebook.github.io/react-native/), but Vue is lagging a bit in this area by relying on simple [Cordova](https://cordova.apache.org/) wrappers. There are plans for the new [weex](https://weex.apache.org/) library that should catch it up soon but at present you'll likely struggle to build a seamless native app based on Vue.

# Wrap Up
If you still aren't sure I recommend taking a look at the [example application I put together out on GitHub](https://github.com/mike-plummer/angular-react-vue-stopwatch). This app creates the exact same component in each framework so you can compare them apples-to-apples in terms of code and execution.

Hopefully I've given newcomers a few nuggets of info about each framework to help clear things up. As always if you have any suggestions, questions, or corrections I'd love to hear about them below, otherwise happy coding!
