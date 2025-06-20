console.log('Content script loaded'); // 確認腳本載入

let rewritePending = false; // 防止重複觸發
let mouseX = 0; // 本地儲存滑鼠 X 座標
let mouseY = 0; // 本地儲存滑鼠 Y 座標

// 監聽右鍵事件以獲取滑鼠座標
document.addEventListener('contextmenu', (event) => {
  // 更新滑鼠座標
  mouseX = event.clientX;
  mouseY = event.clientY;
  console.log('Mouse position updated:', mouseX, mouseY);
});

// 監聽背景腳本訊息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request); // 調試訊息
  if (request.action === 'rewriteUrl') {
    rewritePending = true;
    const url = request.url; // 直接從背景腳本獲取 URL
    const x = mouseX; // 使用本地儲存的座標
    const y = mouseY;

    // 顯示載入中
    showPopup('正在改寫標題...', 'loading', x, y);

    // 抓取原始標題
    const targetLink = document.querySelector(`a[href="${url}"]`);
    const originalTitle = targetLink ? (targetLink.innerText || targetLink.title || '未知標題') : '未知標題';

    // 發送 n8n 請求（第一次：改寫標題）
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
        console.log('n8n response:', data);
        const rewrittenTitle = data.text;

        // 從 chrome.storage.local 獲取現有記錄
        chrome.storage.local.get(['testRecords'], (result) => {
          let testRecords = result.testRecords || [];
          // 添加新記錄（僅包含標題）
          testRecords.push({
            originalTitle: originalTitle,
            rewrittenTitle: rewrittenTitle,
            url: url,
            timestamp: new Date().toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }) // 台灣時間
          });

          // FIFO 策略：保留最近 100 筆
          if (testRecords.length > 100) {
            testRecords = testRecords.slice(-100);
          }

          // 保存回 chrome.storage.local
          chrome.storage.local.set({ testRecords: testRecords }, () => {
            console.log('Record saved:', testRecords);
          });
        });

        // 顯示改寫結果（傳遞 url 以供後續摘要請求使用）
        showPopup(rewrittenTitle, 'success', x, y, url);
      })
      .catch(error => {
        console.error('n8n request failed:', error);
        showPopup('錯誤：無法連接到 n8n', 'error', x, y);
      })
      .finally(() => {
        rewritePending = false;
      });

    sendResponse({ status: 'rewrite started' });
  } else if (request.action === 'showPopup') {
    // 處理顯示錯誤訊息
    const { text, type, x, y } = request;
    showPopup(text, type, x, y);
  }
});

// 調整後的浮動視窗（添加顯示摘要按鈕，移除摘要紀錄）
function showPopup(message, type, x, y, url = null) {
  console.log('Showing popup:', message, type, 'at', x, y); // 調試視窗

  // 移除現有視窗
  const existingPopup = document.getElementById('title-rewrite-popup');
  if (existingPopup) existingPopup.remove();

  // 創建視窗
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
  popup.style.color = '#ffffff'; // 確保文字在深色背景上可見
  popup.style.cursor = 'default'; // 預設游標為正常

  // 內容（啟用文字選取並設置游標）
  const contentDiv = document.createElement('div');
  contentDiv.style.marginRight = '25px';
  contentDiv.style.userSelect = 'text'; // 允許選取文字
  contentDiv.style.cursor = 'text'; // 明確設置文字游標
  contentDiv.textContent = message;
  popup.appendChild(contentDiv);

  // 顯示摘要按鈕（僅在 success 時顯示）
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
      summaryButton.style.backgroundColor = '#8a8a8a'; // 滑鼠懸停時加深背景色
    };
    summaryButton.onmouseout = () => {
      summaryButton.style.backgroundColor = '#757575'; // 離開時恢復原色
    };
    summaryButton.addEventListener('click', () => {
      // 顯示載入中並移除按鈕
      contentDiv.textContent = '正在生成摘要...';
      summaryButton.remove();

      // 發送 n8n 請求（第二次：生成摘要）
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
          console.log('n8n summary response:', data);
          const summary = data.text;

          // 不再儲存摘要到 chrome.storage.local
          // 僅更新顯示
          contentDiv.textContent = summary;
        })
        .catch(error => {
          console.error('n8n summary request failed:', error);
          contentDiv.textContent = '錯誤：無法生成摘要';
        });
    });
    popup.appendChild(summaryButton);
  }

  // 關閉按鈕（縮小尺寸，hover 顯示灰色背景）
  const closeButton = document.createElement('button');
  closeButton.textContent = '✕';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '5px';
  closeButton.style.right = '5px';
  closeButton.style.padding = '2px 6px'; // 縮小內距
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '3px'; // 縮小圓角
  closeButton.style.cursor = 'pointer';
  closeButton.style.backgroundColor = 'rgba(47, 47, 47, 0.95)'; // 與視窗背景相同
  closeButton.style.color = '#ffffff'; // 文字白色
  closeButton.style.outline = 'none'; // 移除焦點框
  closeButton.onmouseover = () => {
    closeButton.style.backgroundColor = '#757575'; // 滑鼠懸停時顯示灰色背景
  };
  closeButton.onmouseout = () => {
    closeButton.style.backgroundColor = 'rgba(47, 47, 47, 0.95)'; // 離開時恢復原色
  };
  closeButton.addEventListener('click', () => {
    popup.remove();
  });

  popup.appendChild(closeButton);

  // 拖動功能（僅在非文字區域觸發）
  let isDragging = false;
  let currentX;
  let currentY;
  let initialX;
  let initialY;

  popup.addEventListener('mousedown', (e) => {
    // 僅在點擊非文字區域時啟用拖動
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

  // 設置初始位置
  const popupWidth = 300;
  const popupHeight = type === 'success' ? 100 : 70; // 調整高度以適應摘要按鈕
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

  document.body.appendChild(popup);
}