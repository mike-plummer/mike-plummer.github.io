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

importScripts("https://storage.googleapis.com/workbox-cdn/releases/3.4.1/workbox-sw.js");

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
    "url": "webpack-runtime-1652ee315517cb897197.js"
  },
  {
    "url": "app.d82672fadd8e80fc10af.css",
    "revision": "2ba1616c09547d43047a32335c8e71d1"
  },
  {
    "url": "app-c53343ea6d2e319e0e14.js"
  },
  {
    "url": "component---node-modules-gatsby-plugin-offline-app-shell-js-d307c053eedd410e5a37.js"
  },
  {
    "url": "index.html",
    "revision": "2654d0239da5af9cc03d8eb9ccb872b6"
  },
  {
    "url": "offline-plugin-app-shell-fallback/index.html",
    "revision": "3d88f62c40c12236c38cf13f255f6f29"
  },
  {
    "url": "1.4e1258c8f899f29ee807.css",
    "revision": "5d3c5a668737ef3ef864094cc2f722b2"
  },
  {
    "url": "0.1bd22cdbaa9a4cdc7e77.css",
    "revision": "11b31781ca275b07c91a9962c463e59f"
  },
  {
    "url": "1-5400c9341c45a6cb6aaf.js"
  },
  {
    "url": "component---src-pages-index-js-480409e639253e379bb9.js"
  },
  {
    "url": "9-8c8e8e2d013408308dac.js"
  },
  {
    "url": "0-68fecca7bc645cb1a184.js"
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
