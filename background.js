console.log('Background script loaded');

// 創建右鍵選單
chrome.contextMenus.create({
  id: 'rewrite-title',
  title: '改寫標題',
  contexts: ['link'] // 僅在連結上顯示
});

// 監聽選單點擊
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'rewrite-title') {
    console.log('Context menu clicked:', info);
    
    // 直接發送 rewriteUrl 訊息給 content.js
    chrome.tabs.sendMessage(tab.id, {
      action: 'rewriteUrl',
      url: info.linkUrl // 從 info 直接獲取 URL
    }, (response) => {
      console.log('Response from content script:', response);
    });
  }
});