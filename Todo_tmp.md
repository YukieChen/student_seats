### 任務：處理首頁人數與座號不符時的錯誤處理

**目標：** 當教師輸入的班級總人數與解析出的學生座號數量不符時，阻止頁面進入下一個畫面，並讓教師重新輸入。

**現有問題分析：**
在 `assets/js/ui.js` 的 `renderInitialSetupScreen` 函數中，當點擊「開始座位配置」按鈕時，會執行以下驗證：
```javascript
// assets/js/ui.js
// ...
		if (newStudentCount !== appState.studentCount) {
			alert(`班級總人數 (${newStudentCount}) 與解析出的學生座號數量 (${appState.studentCount}) 不符。系統將以解析出的學生座號數量為準。`);
			// 這裡不 return，讓程式繼續執行，以 parsedStudentIds.length 為準
		}
// ...
```
這段程式碼會彈出警告，但由於沒有 `return` 語句，程式會繼續執行並渲染 `seatConfig` 畫面，導致使用者體驗不佳。

**修改規劃：**

1.  **修改文件：** `assets/js/ui.js`

2.  **修改函數：** `renderInitialSetupScreen`

3.  **修改內容：**
    在 `assets/js/ui.js` 第 124 行的 `if (newStudentCount !== appState.studentCount)` 判斷式內部，在 `alert` 語句之後添加 `return;`，以阻止程式碼繼續執行並跳轉到下一個畫面。

**修改後的邏輯流程圖：**

```mermaid
graph TD
    A[使用者點擊 "開始座位配置"] --> B{獲取輸入值: 班級總人數, 學生座號};
    B --> C{解析學生座號字串};
    C --> D{驗證班級總人數是否有效?};
    D -- 無效 --> E[彈出錯誤提示: "請輸入有效的班級總人數！"];
    E --> F[停止執行];
    D -- 有效 --> G{驗證解析出的學生座號數量是否為零?};
    G -- 為零 --> H[彈出錯誤提示: "請輸入有效的學生座號！"];
    H --> F;
    G -- 不為零 --> I{比較班級總人數與解析出的學生座號數量};
    I -- 不符 --> J[彈出警告: "班級總人數與解析出的學生座號數量不符。"];
    J --> K[停止執行];
    I -- 相符 --> L[更新 appState.studentIds 和 appState.studentCount];
    L --> M[初始化座位網格];
    M --> N[渲染 'seatConfig' 畫面];
```

**預期結果：**
當教師輸入的班級總人數與解析出的學生座號數量不符時，會彈出警告視窗，並且頁面會停留在初始設定畫面，等待教師重新輸入正確的資訊。