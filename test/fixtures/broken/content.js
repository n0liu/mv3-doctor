// A content script. Timers and DOM access are perfectly legal here — rules
// scoped to the service worker must not fire on this file.

let clicks = 0;

setInterval(() => {
  document.title = `Clicks: ${clicks}`;
}, 1000);

document.addEventListener("click", () => {
  clicks += 1;
});

// This one is not role-specific and should still be reported.
eval("console.log('remote-ish')");
