// File: options.js
// Description: This script manages the options page for the Chrome extension,
//              handling the display, deletion, and clearing of history records
//              stored in chrome.storage.local.
// Date: 2025-06-20

// Load and display records from chrome.storage.local
function loadRecords() {
  chrome.storage.local.get(['testRecords'], (result) => {
    const testRecords = result.testRecords || []; // Default to empty array if undefined
    const tbody = document.querySelector('#recordsTable tbody');
    tbody.innerHTML = ''; // Clear existing table content

    testRecords.forEach((record, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${record.originalTitle}</td>
        <td>${record.rewrittenTitle}</td>
        <td>${record.url}</td>
        <td>${record.timestamp}</td>
        <td><button class="delete-btn" data-index="${index}">刪除</button></td>
      `; // Create table row with record data and delete button
      tbody.appendChild(row);
    });

    // Add event listeners to delete buttons for each row
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.getAttribute('data-index')); // Get index from button data
        deleteRecord(index); // Trigger deletion of the selected record
      });
    });
  });
}

// Delete a single record from chrome.storage.local
function deleteRecord(index) {
  chrome.storage.local.get(['testRecords'], (result) => {
    let testRecords = result.testRecords || [];
    testRecords.splice(index, 1); // Remove the record at the specified index
    chrome.storage.local.set({ testRecords: testRecords }, () => {
      console.log('Record deleted, remaining:', testRecords); // Log success and remaining records
      loadRecords(); // Refresh the table to reflect changes
    });
  });
}

// Handle the clear all button click to remove all records
document.getElementById('clearAll').addEventListener('click', () => {
  if (confirm('確定要清除所有記錄嗎？')) { // Confirm with user before clearing
    chrome.storage.local.set({ testRecords: [] }, () => {
      console.log('All records cleared'); // Log confirmation of clearing
      loadRecords(); // Refresh the table to show empty state
    });
  }
});

// Load records when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', loadRecords); // Initialize table on page load
