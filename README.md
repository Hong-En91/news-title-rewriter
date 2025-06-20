# News Title Rewriter
Chrome 擴充功能 + n8n AI 改寫新聞標題

## 概述
News Title Rewriter 是一個基於 Chrome 擴充功能的專題，通過與 n8n 工作流和 AI（Grok）整合，優化新聞標題的語氣並提供文章摘要。該專案旨在提升新聞閱讀體驗，減少聳動標題的影響，適用於多個新聞網站（如 udn.com 和 www.bbc.com）。

## 功能特色
- 右鍵點擊新聞連結，顯示 AI 改進的標題。
- 點擊「顯示摘要」按鈕，展開文章核心要點。
- Options 頁面提供歷史紀錄管理（查看、刪除、清除）。
- 雙階段請求設計，通過 n8n 處理標題改進和摘要生成。

## 檔案結構
- `manifest.json`: 定義擴充功能的權限、腳本和配置。
- `content.js`: 處理頁面內互動（右鍵、浮動視窗）並與 n8n 通信。
- `background.js`: 管理右鍵選單和訊息傳遞。
- `options.html`: 顯示歷史紀錄的 Options 頁面。
- `options.js`: 實現記錄載入、刪除和清除功能。
- `workflows/workflow-news-title-optimizer.json`: n8n 工作流檔案，負責標題改進和摘要生成。

## 設置說明
### 必要條件
- Chrome 瀏覽器（支援擴充功能）。
- n8n 環境（參考 [n8n 官方文檔](https://docs.n8n.io)）。
- MySQL 資料庫（用於儲存記錄或狀態，參考 [MySQL 文檔](https://www.mysql.com)）。

### 步驟
1. **克隆倉庫**
   - 執行 `git clone https://github.com/your-username/news-title-rewriter.git`。
   - 需要先安裝 Git（參考 [Git 文檔](https://git-scm.com)），並將 URL 替換為你的實際倉庫地址。
2. **配置 n8n**
   - 安裝 n8n，創建 Webhook 節點，記錄 URL（例如 `http://your-n8n-server/webhook/your-id`）。
   - 安裝 Cheerio。
3. **修改 Webhook URL**
   - 打開 `content.js`，將占位符 `https://your-ngrok-url-placeholder/webhook/2b30660b-f607-4ea0-b35e-f76695e40154` 替換為實際 n8n Webhook URL。
   - 保存檔案。
4. **設置 MySQL**
   - 安裝 MySQL。
   - 創建資料庫，執行以下指令：
     CREATE DATABASE IF NOT EXISTS n8n_data;
   - 在 n8n 中添加 MySQL 節點，配置連線（主機、用戶名、密碼、n8n_data`）。
   - 創建兩張表儲存記錄，表結構建議如下：
     CREATE TABLE IF NOT EXISTS selectors (
       domain VARCHAR(255) PRIMARY KEY,       -- 儲存網域名稱作為唯一識別
       selector TEXT NOT NULL,                -- 儲存 LLM 回傳的 CSS selector 用於內容提取
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP          -- 自動更新最後修改時間
     );
     CREATE TABLE IF NOT EXISTS article_single (
       id INT PRIMARY KEY,                    -- 文章唯一識別碼
       article LONGTEXT,                      -- 儲存文章完整內容
       updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       ON UPDATE CURRENT_TIMESTAMP          -- 自動更新最後修改時間
     );
5. **配置憑證**
   - 在 n8n 中為 Grok 節點設置 API 憑證（參考 xAI 官方 API 文檔）。
   - 為 MySQL 節點輸入資料庫憑證（用戶名、密碼）。
6. **載入擴充功能**
   - 打開 Chrome，進入 `chrome://extensions/`。
   - 啟用「開發者模式」，點擊「載入已解壓縮的擴充功能」，選擇包含 `content.js`、`background.js`、`manifest.json`、`options.js` 和 `options.html` 的專案根目錄。
7. **導入工作流**
   - 在 n8n 中導入 `workflow-news-title-optimizer.json`。
   - 更新工作流中的 Webhook 路徑和 MySQL 連線設定。
8. **測試**
   - 訪問新聞網站（如 udn.com），右鍵連結選擇「改寫標題」，檢查結果。
   - 點擊「顯示摘要」並驗證輸出，確認 MySQL 記錄是否更新。
