/**
 * Welcome to your Workbox-powered service worker!
 *
 * You'll need to register this file in your web app and you should
 * disable HTTP caching for this file too.
 * See https://goo.gl/nhQhGp
 *
 * The rest of the code is auto-generated. Please don't update this file
 * directly; instead, make changes to your Workbox build configuration
 * and re-run your build process.
 * See https://goo.gl/2aRDsh
 */

importScripts("workbox-v3.6.3/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "workbox-v3.6.3"});

workbox.core.setCacheNameDetails({prefix: "gatsby-plugin-offline"});

workbox.skipWaiting();
workbox.clientsClaim();

/**
 * The workboxSW.precacheAndRoute() method efficiently caches and responds to
 * requests for URLs in the manifest.
 * See https://goo.gl/S9QRab
 */
self.__precacheManifest = [
  {
    "url": "webpack-runtime-ed0b841f278f36f3f663.js"
  },
  {
    "url": "app.3fa441ae6cd9b767b1f3.css"
  },
  {
    "url": "app-e8c5df1137518220beec.js"
  },
  {
    "url": "component---node-modules-gatsby-plugin-offline-app-shell-js-acb2d513340a3372a73c.js"
  },
  {
    "url": "index.html",
    "revision": "ec90c92bf7fd0b3233ff2ec7615b00a9"
  },
  {
    "url": "offline-plugin-app-shell-fallback/index.html",
    "revision": "ed093e0c61104c16177697692e9782d9"
  },
  {
    "url": "0.ad5ead518b4bf908def4.css"
  },
  {
    "url": "1.b9adfe113a4fdc372069.css"
  },
  {
    "url": "1-bb9f39eeb8da2c20174c.js"
  },
  {
    "url": "component---src-pages-index-js-8fdfcefa7714e6974fd1.js"
  },
  {
    "url": "9-24cdaca3184d888c9e6b.js"
  },
  {
    "url": "0-19bbe2b0882be2762a9b.js"
  },
  {
    "url": "static/d/944/path---index-6a9-LqCWLshsFfKXQiU8Mbwmp8behXg.json",
    "revision": "ff3154bfe22499e3cc7a8a72d1fd08aa"
  },
  {
    "url": "static/d/520/path---offline-plugin-app-shell-fallback-a-30-c5a-NZuapzHg3X9TaN1iIixfv1W23E.json",
    "revision": "c2508676a2f33ea9f1f0bf472997f9a0"
  },
  {
    "url": "manifest.webmanifest",
    "revision": "55a9292126f8836e91e5d40b0a8cb54f"
  }
].concat(self.__precacheManifest || []);
workbox.precaching.suppressWarnings();
workbox.precaching.precacheAndRoute(self.__precacheManifest, {});

workbox.routing.registerNavigationRoute("/offline-plugin-app-shell-fallback/index.html", {
  whitelist: [/^[^?]*([^.?]{5}|\.html)(\?.*)?$/],
  blacklist: [/\?(.+&)?no-cache=1$/],
});

workbox.routing.registerRoute(/\.(?:png|jpg|jpeg|webp|svg|gif|tiff|js|woff|woff2|json|css)$/, workbox.strategies.staleWhileRevalidate(), 'GET');
workbox.routing.registerRoute(/^https:/, workbox.strategies.networkFirst(), 'GET');
"use strict";

/* global workbox */
self.addEventListener("message", function (event) {
  var api = event.data.api;

  if (api === "gatsby-runtime-cache") {
    var resources = event.data.resources;
    var cacheName = workbox.core.cacheNames.runtime;
    event.waitUntil(caches.open(cacheName).then(function (cache) {
      return Promise.all(resources.map(function (resource) {
        return cache.add(resource).catch(function (e) {
          // ignore TypeErrors - these are usually due to
          // external resources which don't allow CORS
          if (!(e instanceof TypeError)) throw e;
        });
      }));
    }));
  }
});