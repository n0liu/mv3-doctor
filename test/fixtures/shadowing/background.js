// Every `document`/`window` below is a LOCAL binding, never the global.
// None of them may be reported.

function handleMessage(document) {
  return document.title;
}

function handleSender({ window }) {
  return window.id;
}

chrome.runtime.onMessage.addListener((message) => {
  try {
    const document = JSON.parse(message.body);
    return handleMessage(document) + handleSender({ window: document });
  } catch (window) {
    return String(window);
  }
});

for (const document of []) {
  self.console.log(document);
}

// Destructured module state IS real state and must be reported.
let { pendingCount } = { pendingCount: 0 };

chrome.alarms.onAlarm.addListener(() => {
  pendingCount += 1;
});

// A parameter shadowing a module binding is NOT module state.
let cache = null;

function refresh(cache) {
  cache = "local write, not module state";
  return cache;
}
