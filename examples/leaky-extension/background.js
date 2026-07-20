// Looks fine while you test it — the service worker was still warm.
// It will not be warm for your users.

let requestCount = 0; // resets to 0 every time the worker restarts

chrome.webRequest.onBeforeRequest.addListener(() => {
  requestCount++;
});

setInterval(() => {
  console.log(`seen ${requestCount} requests`);
}, 5000);
