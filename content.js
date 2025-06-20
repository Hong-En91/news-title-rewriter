// File: content.js
// Description: This script runs in the context of web pages to handle user right-click events,
//              extract news link data, communicate with the background script, and display
//              a popup for rewritten titles and summaries via n8n Webhook.
// Date: 2025-06-20
// Note: Replace WEBHOOK_URL with your actual n8n Webhook URL before use.

console.log('Content script loaded'); // Log confirmation of script initialization

let rewritePending = false; // Flag to prevent multiple simultaneous rewrite requests
let mouseX = 0; // Store the X coordinate of the mouse for popup positioning
let mouseY = 0; // Store the Y coordinate of the mouse for popup positioning

// Listen for contextmenu event to capture mouse coordinates
document.addEventListener('contextmenu', (event) => {
  // Update mouse position based on the event
  mouseX = event.clientX;
  mouseY = event.clientY;
  console.log('Mouse position updated:', mouseX, mouseY); // Debug log for position
});

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request); // Debug log for incoming message
  if (request.action === 'rewriteUrl') {
    if (rewritePending) return; // Exit if a rewrite is already in progress
    rewritePending = true;
    const url = request.url; // URL received from the background script
    const x = mouseX; // Use stored X coordinate for popup
    const y = mouseY; // Use stored Y coordinate for popup

    // Display loading message in popup
    showPopup('正在改寫標題...', 'loading', x, y);

    // Find the target link and extract original title
    const targetLink = document.querySelector(`a[href="${url}"]`);
    const originalTitle = targetLink 
      ? (targetLink.innerText || targetLink.title || '未知標題') 
      : '未知標題'; // Fallback to '未知標題' if not found

    // Send POST request to n8n Webhook for title rewriting
    fetch('https://assured-tadpole-merry.ngrok-free.app/webhook/c03a7cc8-3ac4-4f54-96c6-d9dc0d2924fb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, action: 'rewriteTitle' })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('n8n response:', data); // Debug log for response
        const rewrittenTitle = data.text;

        // Retrieve existing records from chrome.storage.local
        chrome.storage.local.get(['testRecords'], (result) => {
          let testRecords = result.testRecords || [];
          // Add new record with original title, rewritten title, URL, and timestamp
          testRecords.push({
            originalTitle: originalTitle,
            rewrittenTitle: rewrittenTitle,
            url: url,
            timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) // Taiwan time
          });

          // Apply FIFO strategy: keep only the last 100 records
          if (testRecords.length > 100) {
            testRecords = testRecords.slice(-100);
          }

          // Save updated records back to chrome.storage.local
          chrome.storage.local.set({ testRecords: testRecords }, () => {
            console.log('Record saved:', testRecords); // Debug log for saved data
          });
        });

        // Display rewritten title in popup, pass URL for summary request
        showPopup(rewrittenTitle, 'success', x, y, url);
      })
      .catch(error => {
        console.error('n8n request failed:', error); // Log any errors
        showPopup('錯誤：無法連接到 n8n', 'error', x, y);
      })
      .finally(() => {
        rewritePending = false; // Reset flag after request completes
      });

    sendResponse({ status: 'rewrite started' }); // Acknowledge message handling
  } else if (request.action === 'showPopup') {
    // Handle displaying error or custom messages
    const { text, type, x, y } = request;
    showPopup(text, type, x, y);
  }
});

// Function to create and manage the popup window
function showPopup(message, type, x, y, url = null) {
  console.log('Showing popup:', message, type, 'at', x, y); // Debug log for popup creation

  // Remove any existing popup to avoid duplication
  const existingPopup = document.getElementById('title-rewrite-popup');
  if (existingPopup) existingPopup.remove();

  // Create new popup element
  const popup = document.createElement('div');
  popup.id = 'title-rewrite-popup';
  popup.style.position = 'fixed';
  popup.style.padding = '15px';
  popup.style.borderRadius = '10px';
  popup.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
  popup.style.zIndex = '999999';
  popup.style.maxWidth = '300px';
  popup.style.wordWrap = 'break-word';
  popup.style.fontFamily = 'system-ui, Arial, sans-serif';
  popup.style.background = 'rgba(47, 47, 47, 0.95)';
  popup.style.color = '#ffffff'; // Ensure text visibility on dark background
  popup.style.cursor = 'default'; // Default cursor style

  // Create content div for the message
  const contentDiv = document.createElement('div');
  contentDiv.style.marginRight = '25px';
  contentDiv.style.userSelect = 'text'; // Allow text selection
  contentDiv.style.cursor = 'text'; // Set cursor to text
  contentDiv.textContent = message;
  popup.appendChild(contentDiv);

  // Add summary button if the request is successful and URL is provided
  if (type === 'success' && url) {
    const summaryButton = document.createElement('button');
    summaryButton.textContent = '顯示摘要';
    summaryButton.style.marginTop = '10px';
    summaryButton.style.padding = '5px 10px';
    summaryButton.style.border = 'none';
    summaryButton.style.borderRadius = '5px';
    summaryButton.style.cursor = 'pointer';
    summaryButton.style.backgroundColor = '#757575';
    summaryButton.style.color = '#ffffff';
    summaryButton.style.outline = 'none';
    summaryButton.onmouseover = () => {
      summaryButton.style.backgroundColor = '#8a8a8a'; // Darken on hover
    };
    summaryButton.onmouseout = () => {
      summaryButton.style.backgroundColor = '#757575'; // Reset on mouse out
    };
    summaryButton.addEventListener('click', () => {
      // Show loading state and remove button
      contentDiv.textContent = '正在生成摘要...';
      summaryButton.remove();

      // Send POST request to n8n for summary generation
      fetch('https://assured-tadpole-merry.ngrok-free.app/webhook/c03a7cc8-3ac4-4f54-96c6-d9dc0d2924fb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, action: 'summary' })
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => {
          console.log('n8n summary response:', data); // Debug log
          const summary = data.text;
          contentDiv.textContent = summary; // Update with summary
        })
        .catch(error => {
          console.error('n8n summary request failed:', error); // Log errors
          contentDiv.textContent = '錯誤：無法生成摘要';
        });
    });
    popup.appendChild(summaryButton);
  }

  // Add close button with hover effect
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.padding = '2px 6px';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.backgroundColor = 'rgba(47, 47, 47, 0.95)';
  closeButton.style.color = '#ffffff';
  closeButton.style.outline = 'none';
  closeButton.onmouseover = () => {
    closeButton.style.backgroundColor = '#757575'; // Show gray on hover
  };
  closeButton.onmouseout = () => {
    closeButton.style.backgroundColor = 'rgba(47, 47, 47, 0.95)'; // Reset on mouse out
  };
  closeButton.addEventListener('click', () => {
    popup.remove(); // Remove popup on click
  });
  popup.appendChild(closeButton);

  // Implement drag functionality (only on non-text areas)
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  popup.addEventListener('mousedown', (e) => {
    // Enable dragging only if clicking on the popup border
    if (e.target === popup) {
      isDragging = true;
      initialX = e.clientX - currentX;
      initialY = e.clientY - currentY;
      popup.style.cursor = 'move';
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      popup.style.left = `${currentX}px`;
      popup.style.top = `${currentY}px`;
    }
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
    popup.style.cursor = 'default';
  });

  // Set initial popup position with boundary checks
  const popupWidth = 300;
  const popupHeight = type === 'success' ? 100 : 70; // Adjust height for summary button
  let left = x + 10;
  let top = y + 10;

  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  if (left + popupWidth > windowWidth) {
    left = windowWidth - popupWidth - 10;
  }
  if (top + popupHeight > windowHeight) {
    top = y - popupHeight - 10;
    if (top < 0) top = 0;
  }

  currentX = left;
  currentY = top;
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;

  document.body.appendChild(popup); // Add popup to the document
}
