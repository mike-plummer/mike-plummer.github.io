---
title: "Migrate from react-loadable to React.Suspense"
date: "2018-12-05T00:00:00.000Z"
path: "/2018-12-05-migrate-from-react-loadable/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2018/12/05/migrate-from-react-loadable-to-react-suspense/)*

React apps using code splitting often use the excellent [react-loadable](https://github.com/jamiebuilds/react-loadable) library which handles detecting whether a code segment has been loaded and, if not, putting up a spinner or other “wait” indicator while that code is asynchronously fetched from the server. With the release of React v16.6, however, we Javascript developers have a very rare opportunity – we can actually remove one of our third-party dependencies!

[React.Suspense](https://reactjs.org/docs/code-splitting.html) is a new capability added to the core React library that you get for free which does almost the exact same thing as react-loadable, so without further ado, let’s look at how to swap them out.

# Code Splitting?
If you aren’t familiar with this capability, basically it’s possible to use your code bundler (namely, Webpack) to bundle your code up into multiple chunks. A main chunk will be downloaded when the user loads your app, then as they navigate around additional chunks containing the assets and logic for those sections can be asynchronously loaded on-demand. This is obviously more complicated, but can dramatically improve the initial loading time of your app and also helps out mobile users by using less bandwidth. The good news is that Webpack (and other solutions as well) handle all the complexity here as far as creating the bundles and requesting them when necessary, so all we need to do is incorporate that capability into our app so that users are left with a seamless experience.

# Step One: Upgrade to React 16.6
If you aren’t already on 16.6 you’ll have to update. If you’re on an earlier version of v16 then it will likely be a transparent update, but if you’re coming from v15 you’ll probably need to refer to the React release notes for migration info.

# Step Two: Identify your async components
Most react-loadable uses end up looking something like this:

```javascript
const Loading = ({ pastDelay }) => {
  if (pastDelay) {
    return <Spinner />;
  }
  return null;
};
 
export const MyAwesomeAsyncComponent = Loadable({
  loader: () => import(/* webpackChunkName: "myAwesomeComponent" */ './myAwesome.component'),
  loading: Loading,
  delay: 200
});
```

In this block we’re doing a few things:

- We define a component to display between the time the component is requested and when it is loaded and ready for render.
- We define a Loadable component, which has a couple pieces to it:
  1. The ‘loader’ function uses a dynamic import to specify the code location to request. Webpack takes care of the magic here, so all we need to know is that a bundle with the specified resource will be loaded over the network when this function is requested. The special comment is a hint to webpack to give that file a meaningful name.
  1. The ‘loading’ parameter is a component to display during that request/response cycle – here we provide our custom Loading component.
  1. In this instance we’re defining a delay – we only want to display the Spinner if the loading takes longer than 200 milliseconds. This is to avoid “flashing” the loading in and out if the request completes very quickly.

That’s it. The component itself will be bundled separately and only loaded over the network once an attempt is made to render it.

# Step Three: Convert to Suspense
Converting to React.Suspense is actually pretty easy.

```javascript
const MyAwesomeComponent = React.lazy(() => import(/* webpackChunkName: "myAwesomeComponent" */ './myAwesome.component'));
 
export const MyAwesomeAsyncComponent = props => (
  <React.Suspense fallback={<Spinner />}>
    <MyAwesomeComponent {...props} />
  </React.Suspense>
);
```

1. We use React.lazy to encapsulate the dynamic import, similar to the ‘loading’ parameter in the first example.
2. We define a React.Suspense component with a set of ‘fallback’ JSX to render while we await the asynchronous loading. Typically this will be a spinner or other wait indicator.
3. We define the JSX we want to render as children – this uses the React.lazy-wrapped component reference.

Ta-Da! This will do the exact same thing as our first example with one notable exception – React.Suspense does not have built-in support for a delay, so the fallback JSX will render immediately even if the loading process only takes a few milliseconds. You can work around this by creating custom logic in your fallback component so that it starts a timer in componentDidMount that causes it to not render until a future time.

# Step Four: What if something goes wrong?
What happens if the code chunk fails to load, or some other error condition occurs?

## react-loadable
The library has built-in support for handling loading errors.

```javascript
const Loading = (props) => {
  if (props.error) {
    return <p>Error!</p>;
  } else if (props.pastDelay) {
    return <p>Loading...</p>;
  } else {
    return null;
  }
}
```

## Suspense
React 16 added a new capability known as an [Error Boundary](https://reactjs.org/docs/error-boundaries.html). This is just an error-aware component that is capable of catching and handling errors from its children. To handle issues with async loading we can simply define a custom ErrorBoundary component and wrap our usage of async components within them.

```javascript
<MyCustomErrorBoundary>
  <MyAwesomeAsyncComponent />
</MyCustomErrorBoundary>
```

# Last step
`yarn remove react-loadable` 🎉
 

# What’s the benefit?
Obviously we always have to balance the value of “it works just fine the way it is” when we consider upgrades or refactors. So, is this a worthwhile upgrade?

**Bundle savings:** react-loadable is about 2KB once gzipped. Removing this library is not going to have massive impacts on your build time or bundle size, but then again, 2KB is a measurable decrease.
**Fewer dependencies:** JS apps have _so many dependencies_. Each one is a separate set of documentation, updates, and API’s you have to manage. More importantly, each one is an additional attack surface for a potentially malicious actor.
**Maintainability:** Sticking to the core React library when possible usually means you’ll get easier integration and fewer maintenance headaches.
**Bragging rights:** Let’s be honest – it’s cool to be using the latest features.
**Testing:** One huge downside at the moment is that [Enzyme](https://airbnb.io/enzyme/) is not Suspense-aware, so unit testing these async components may be tricky until that support is added. ([This issue](https://github.com/airbnb/enzyme/issues/1553) is tracking progress)

#Conclusion
I’m not going to claim that this is a must-change capability, but all things considered the functionality is almost identical, the impact is targeted and easily-tested, and the code changes are relatively simple and require no significant refactors. I was able to swap out about 20 async components in about an hour, and 45 minutes of that was figuring out why my Enzyme tests wouldn’t work. Questions, comments, concerns? Let me know in the comments, otherwise happy coding!