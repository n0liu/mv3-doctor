// The same feature set as the broken fixture, written the way MV3 expects.

const COUNTER_KEY = "requestCount";
const ALARM_NAME = "heartbeat";

chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    self.console.log("heartbeat survives worker restarts");
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // State lives in storage, not in a module variable, so a worker restart
  // cannot silently reset it.
  chrome.storage.session.get(COUNTER_KEY).then((stored) => {
    const next = (stored[COUNTER_KEY] ?? 0) + 1;
    return chrome.storage.session.set({ [COUNTER_KEY]: next, token: message.token });
  });

  sendResponse({ ok: true });
  return true;
});
