chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getContent") {
    const text = document.body.innerText;
    sendResponse({ content: text });
  }
});