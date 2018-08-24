---
title: "Taming Redux with Sagas"
date: "2017-11-20T00:00:00.000Z"
path: "/2017-11-20-taming-redux-with-sagas/"
---

> *This was originally posted at [Object Partners](https://objectpartners.com/2017/11/20/taming-redux-with-sagas/)*

Redux by itself is pretty cut-and-dried: write some action creators, write some reducers, dispatch actions. Where it gets complicated is when you have to integrate that concept into a natural workflow where they can branch off and fork based on user input. Several products like Redux Thunks exist that make this possible using promises but promises come with their own set of shortcomings:

Easy to forget a return value or catch an exception in your promise chain
Hard to test – requires you to mock out Promises as well as the invocations those promises generate
I recently started a new React + Redux project that has quite a few complex flows and Thunks didn’t quite feel like the right fit, so we went with a solution I hadn’t used before: Redux Sagas.

Sagas rely on a new ES2015 feature called Generators, so before we get too far in let’s talk about Generators.

# What’s a Generator?

A Generator is a special function that can suspend (not block) its own execution pending an external stimuli. Really, it’s a special kind of iterator that makes use of the special ‘yield’ keyword baked into ES2015. Each invocation of the iterator’s ‘next()’ function invokes the function from the point it last suspended at (with it’s preserved context) and executes until the next yield statement is found. If no subsequent yield statements exist, then the Generator is complete and tells the consumer so.

Let’s take a look at a simple example:

```javascript
/*
 * Define a Generator function that will generate values iteratively from the value supplied up to 10
 */
function* counter(i) {
  let increment = 0;
  while (i + increment <= 10) {
    yield i + increment++;
  }
}
// Execute the Generator function, returns a Generator instance
const myCounter = counter(8);
myCounter.next();    // { value: 8, done: false }  - input of 8 plus incremement of zero <= 10, so output and suspend
myCounter.next();    // { value: 9, done: false }  - input of 8 plus increment of one <= 10, so output and suspend
myCounter.next();    // { value: 10, done: true }  - input of 8 plus increment of two == 10, so generator is complete
myCounter.next();    // { value: undefined, done: true }  - further calls return undefined since there are no more yields and no explicit return statement
```

## What are they good for

Generators may seem like a very obscure feature, and most JavaScript developers likely won’t ever write one. They do have some pretty great uses though. Here’s a few examples:

* Finite state machine: if you have logic that needs to step though a series of states, potentially controlled by another part of your app, a Generator can be used to track and manage state for you.
* Abstract the nitty-gritty of async iteration: imagine you have a stream of data (user input, bursty I/O, etc) – it can be difficult to elegantly wait for the next piece of data without pushing a lot of async behaviors into code that really shouldn’t care. A Generator can abstract that away for you.
* A global counter: Come on, you’re still generating ID’s with a global number variable and ++? Yikes! A Generator is a lightweight and more flexible solution.

# What’s a Saga?

Now that we know a little about Generators we can start talking about Sagas.

A saga, in simple terms, can be thought of as an flow of interactions to achieve a set end goal. The stimulus that begins the flow, the interactions within the flow, and the result of the flow together form a Saga. The standard example is probably the most common: saving user input. The actions we generate may look something like this:

1. User clicks save button, generating a SAVE action
2. Display a confirmation and user can CONFIRM or CANCEL. Cancelation aborts the flow, confirm continues.
3. Service call is made to save the data. The service call is inherently asynchronous and can SUCCEED or FAIL. Failure or success is reported to the user and ends the flow.
4. Imagine having to manage all of these forks using promises. It’s possible but it’s not fun, and this is just a simple example.

A Redux Saga abstracts away all the promise management by using Generators. Let’s look at a Saga that handles this flow and break it down:

```javascript
// This is registered with a special Redux middleware for Sagas and is notified of all actions that occur in Redux
function* sagaInvoker() {
  // When an action with type of 'SAVE' is dispatched, then the 'save' saga will be invoked
  yield takeEvery('SAVE', save);
}

function* save(action) {
   try {
      // Dispatch a 'CONFIRM' action - the UI would respond to this by displaying a save confirmation message
      yield put({type: 'CONFIRM'});
      // 'take' will suspend this saga and wait until the confirmation message generates a 'CANCELED' or 'CONFIRMED' action
      const userResponseToConfirmation = take(['CANCELED', 'CONFIRMED']);
      // If the user responded to the confirmation by canceling then we can abort this saga execution
      if (userResponseToConfirmation.type === 'CANCELED') {
        return;
      }
      // Otherwise, the user decided to proceed thus we should call a function that actually saves the data
      // and pass it the original SAVE action's payload
      const result = yield call(Api.save, action.payload);
      // If the save function completes successfully then dispatch a 'SAVE_SUCCESS' action so we can notify the user
      yield put({type: 'SAVE_SUCCESS'});
   } catch (e) {
      // If the save function failed, then dispatch a 'SAVE_FAILED' action so we can notify the user
      yield put({type: 'SAVE_FAILURE', message: e.message});
   }
}
```

There’s nothing here that Thunks or other solutions can’t do, but what I like about Sagas is that there’s no nested callbacks or chained promises – the execution flow reads very naturally and looks like a synchronous flow when in reality the ‘yield’ statements take care of all the asynchronous stuff for us. In my opinion, this makes the code much easier to read and debug.

You may have noticed the helper functions like ‘put’, ‘call’, and ‘take’. These are abstractions supplied by Sagas and are what make it so very easy to unit test them. We’ll talk a bit more about these later when we look at testing.

# How are Sagas better?

There’s a ton of things about sagas that I think make them superior to a lot of other solutions in this space:

* Constantly watching: Sagas are constructed and run constantly in the background watching all actions that occur. This means that you don’t have to hook up a saga to respond to actions in a new component or redesigned UI – so long as the action is dispatched from somewhere your saga will get it.
* Lightweight: If constantly watching sounds like a resource hog, never fear – remember that Generators inherently suspend themselves while they wait for stimuli, so there’s zero CPU impact until a action comes along that the saga is interested in.
* Readable: Saga code flows naturally and is easy to debug with modern dev tools. No more digging through promise chains and you can fluently structure and comment your code.
Let’s knock it up a notch…

Simple examples are great, but sagas come with a lot of power out of the box to let you structure complex concurrent interactions. Suppose we want to introduce a timeout to our saving data example – if the user doesn’t confirm the save within 30 seconds then we’ll assume we should cancel.
Sagas have the concept of “racing” actions against one another – you can write a saga to watch for multiple actions and whichever one is seen first ‘wins’. We can use this to race a timeout against a confirmation like so:

```javascript
...
// Dispatch a 'CONFIRM' action - the UI would use this to show a save confirmation message
yield put({type: 'CONFIRM'});
// Take will suspend this saga waiting until a 'CANCELED' or 'CONFIRMED' action occurs
// If neither happens within 30 seconds then the timeout will win the race
const {confirmationResponse, timeout} = yield race({
    confirmationResponse: take(['CANCELED', 'CONFIRMED']),
    timeout: call(delay, 30000)
  });

// If the user responded to the confirmation by canceling or didn't response before the timeout
// then we can abort this saga execution
if (timeout || confirmationResponse.type === 'CANCELED') {
  return;
}
...
```

What if we wanted to solve a different problem with sagas and load a bunch of data? For situations where you’re simply reading data there’s no sense in waiting for one read to complete before starting the next, so we can safely parallelize them to reduce time the user spends waiting. Sagas provide some helpers to make this pattern really simple.

```javascript
...
// Assuming we have an Api object we can use to execute rest requests, we can use the 'all' helper
// to kick off a set of items that will execute in parallel and give us a single cohesive result
// that we can validate and work with.
const [users, posts] = yield all([
  call(Api.get, '/users'),
  call(Api.get, '/posts')
]);
...
```

# What about when things go wrong?

Lots of frameworks have error handling support, and most of it is very good. Unfortunately, it’s yet another API function you have to memorize and work into your code.
Sagas simplifies things by relying on things you’re already very familiar with: try/catch.

```javascript
try {
  yield call(Api.get, '/posts');
} catch (error) {
  yield put('POSTS_FETCH_FAILED', error.message);
}
```

Ta-da! Simple, dynamic, readable error handling.

# Testing

As I mentioned before, one of the advantages of sagas is that they are very readable – they look and, as far as the debugging is concerned, behave very much like synchronous code. The real advantage is how much simpler they are to test. Let’s take a look how we could test our example with Jest and a super-helpful library called redux-saga-test-plan:

```javascript
describe('save saga', () => {
  test('rejected confirmation', () => {
    const payload = {..};
    // Kick off the saga and watch it
    return expectSaga(save, payload)
      .put({type: 'CONFIRM'})         // Assert that the saga should dispatch a CONFIRM action
      .dispatch({type: 'CANCELED'})   // Give a CANCELED action to the saga to simulate a user response
      .run();                         // Start the test, assert that the saga didn't do anything else
  });

  describe('accepted confirmation', () => {
    let sagaPromise, payload;

    beforeEach(() => {
      payload = {..};
      // Each of our tests here will start the same way, so build the common part
      // in this beforeEach block and save off the promise. We can continue to chain
      // off it inside our tests for the unique behaviors we check in each.
      sagaPromise = expectSaga(save, payload)
        .put({type: 'CONFIRM'})
        .dispatch({type: 'CONFIRMED'});
      });
    });

    describe('save fails', () => {
      sagaPromise
        // Mock out the service call so that it throws an error
        .provide(call(Api.save, payload), () => throw new Error('Failure'))
        .call(Api.save, payload)
        // Since the service call failed, we should get a failure result from the saga
        .put({type: 'SAVE_FAILED', { message: 'Failure' })
        .run();
    });

    describe('save fails', () => {
      sagaPromise
        // Mock out the service call so that it succeeds
        .provide(call(Api.save, payload), {..})
        .call(Api.save, payload)
        .put({type: 'SAVE_SUCCESS')
        .run();
    });
  });
});
```

The test framework effectively lets you test the flow of the saga by allowing you to mock out expected actions. The real simplicity is how it interfaces with the ‘put’, ‘call’, and ‘take’ helpers from redux-saga; in your unit test you really just want to confirm that the helpers are called with the appropriate parameters. This means that in most situations you don’t need to mock out the real end functions, you can just verify that the mocked out helpers got the expected params which seriously simplifies your test setup.

# Integration

Now that we’ve seen some of the awesomeness of sagas you want be wondering how you can you roll it into your baseline. The good news is that it’s pretty simple. First you’ll need a couple new dependencies:

```bash
npm install --save redux-saga
npm install --save-dev redux-saga-test-plan
```

Then, all you need to do is register your sagas and kick them off at bootstrap:

```javascript
import { createStore, applyMiddleware } from 'redux'
import createSagaMiddleware from 'redux-saga'

import myRootReducer from './reducers'
import myAwesomeSagas from './sagas'

// Create saga middleware that will watch for actions and dish them off to your sagas
const sagaMiddleware = createSagaMiddleware()
// Generate your Redux store by registering your reducer and the saga middleware
const store = createStore(
  myRootReducer,
  applyMiddleware(sagaMiddleware)
)

// To kick off the sagas so they start watching for actions, call .run()
sagaMiddleware.run(myAwesomeSagas)
// All of your sagas from 'mySagas.js' are now suspending, waiting for actions to come their way

// Everything else from your app bootstrap goes here...
```

Just in case you were wondering, Sagas are fully compatible with the recently-released React v16 so no worries about them holding you back from the shiny new stuff.

# Wrap Up

Easy, right?
The big takeaway that I’ve had with Sagas is that they are pretty intimidating at first. Between the new syntax, unfamiliar Generators, and having to re-learn how to manage my Redux actions it was definitely not a drop-in replacement. That said, once you have one saga up and running it’s incredibly easy to build new ones, and your unit testing will go so much quicker you’ll likely wonder how you ever got any work done before.

Hopefully you’ll be able to use this tool to help you wrangle some of your more unwieldy Redux code. Happy coding!
