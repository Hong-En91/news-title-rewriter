// 載入記錄
function loadRecords() {
  chrome.storage.local.get(['testRecords'], (result) => {
    const testRecords = result.testRecords || [];
    const tbody = document.querySelector('#recordsTable tbody');
    tbody.innerHTML = ''; // 清空表格

    testRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.originalTitle}</td>
        <td>${record.rewrittenTitle}</td>
        <td>${record.url}</td>
        <td>${record.timestamp}</td>
        <td><button class="delete-btn" data-index="${index}">刪除</button></td>
      `;
      tbody.appendChild(row);
    });

    // 為刪除按鈕添加事件
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index'));
        deleteRecord(index);
      });
    });
  });
}

// 刪除單筆記錄
function deleteRecord(index) {
  chrome.storage.local.get(['testRecords'], (result) => {
    let testRecords = result.testRecords || [];
    testRecords.splice(index, 1); // 移除指定記錄
    chrome.storage.local.set({ testRecords: testRecords }, () => {
      console.log('Record deleted, remaining:', testRecords);
      loadRecords(); // 刷新表格
    });
  });
}

// 全部清除
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('確定要清除所有記錄嗎？')) {
    chrome.storage.local.set({ testRecords: [] }, () => {
      console.log('All records cleared');
      loadRecords(); // 刷新表格
    });
  }
});

// 頁面載入時顯示記錄
document.addEventListener('DOMContentLoaded', loadRecords);