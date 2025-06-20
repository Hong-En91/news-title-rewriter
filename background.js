// File: background.js
// Description: This script serves as the background controller for the Chrome extension,
//              handling context menu creation, communication with content scripts,
//              and coordination with the n8n Webhook for title rewriting.
// Date: 2025-06-20
// Note: Ensure the n8n Webhook URL is configured in content.js before use.

console.log('Background script loaded'); // Log confirmation of script initialization

// Create a context menu item for rewriting titles, visible only on links
chrome.contextMenus.create({
  id: 'rewrite-title',           // Unique identifier for the menu item
  title: '改寫標題',             // Display text for the menu option
  contexts: ['link']             // Restrict menu to link elements
});

// Listen for context menu clicks and trigger title rewriting
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'rewrite-title') {
    console.log('Context menu clicked:', info); // Debug log for click event details

    // Send message to content script to initiate title rewriting process
    chrome.tabs.sendMessage(tab.id, {
      action: 'rewriteUrl',        // Action to trigger rewriting in content.js
      url: info.linkUrl            // Pass the clicked link URL to content script
    }, (response) => {
      console.log('Response from content script:', response); // Debug log for response
      if (chrome.runtime.lastError) {
        console.error('Message sending failed:', chrome.runtime.lastError); // Handle potential errors
      }
    });
  }
});
