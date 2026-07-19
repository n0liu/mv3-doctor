// A service worker that makes every mistake mv3-doctor looks for.

let requestCount = 0;
let cachedToken = null;

setInterval(() => {
  console.log("this stops running once the worker is terminated");
}, 5000);

setTimeout(() => {
  console.log("this never fires");
}, 60000);

chrome.runtime.onMessage.addListener((message) => {
  requestCount += 1;
  cachedToken = message.token;

  document.title = `Requests: ${requestCount}`;
  localStorage.setItem("count", String(requestCount));

  const compute = new Function("a", "b", "return a + b");
  return compute(1, 2);
});

importScripts("https://cdn.example.com/analytics.js");
