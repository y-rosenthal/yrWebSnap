// Keep service worker active
const keepAlive = () => setInterval(() => {
  console.log('Background service worker is active');
}, 20000);

keepAlive();

console.log('Background script loaded, registering message listener...');

chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Make sure we can access the tab
    if (!tab.url?.startsWith('http')) {
      console.log('Can only capture DOM on HTTP/HTTPS pages');
      return;
    }

    console.log('Injecting content script...');
    // Inject the content script if it hasn't been injected yet
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    console.log('Content script injected successfully');

    // Now send the message
    console.log('Sending captureDom message...');
    chrome.tabs.sendMessage(tab.id, { action: "captureDom" });
  } catch (err) {
    console.error('Error in background script:', err);
  }
});

// Add debug logging for message listener registration
console.log('Background script loaded, registering message listener...');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === "downloadDom") {
    console.log('Received DOM data, preparing download...');
    try {
      if (!request.dom) {
        throw new Error('No DOM data received');
      }
      
      console.log('DOM data size:', request.dom.length, 'characters');
      
      // Convert the DOM string to a base64 data URL
      const base64Data = btoa(unescape(encodeURIComponent(request.dom)));
      const dataUrl = `data:text/html;base64,${base64Data}`;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      
      console.log('Starting download...');
      chrome.downloads.download({
        url: dataUrl,
        filename: `dom-capture-${timestamp}.html`,
        saveAs: true
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
        } else {
          console.log('Download started with ID:', downloadId);
        }
      });
    } catch (err) {
      console.error('Error processing download:', err);
    }
    // Send response to keep message port open
    sendResponse({ received: true });
  }
  return true; // Keep the message channel open
}); 