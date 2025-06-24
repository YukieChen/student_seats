# 學生座位安排程式 - 程式規格書、工作劃分與 ToDo List

## 1. 專案概述

*   **專案名稱：** 學生座位安排程式
*   **目標：** 開發一個基於網頁的學生座位安排工具，能夠在 GitHub Pages 上執行。
*   **現有基礎：** 基於 `student_seats` 目錄下的現有 HTML, CSS, JavaScript 程式碼進行規劃和擴展。

## 2. 功能需求分析

### 2.1 學生人數上限

*   **需求描述：** 程式應支援最多 35 名學生，學生以號碼 (1-35) 代替姓名。
*   **功能點：**
    *   系統內部應維護一個學生列表，包含 1 到 35 的編號。
    *   介面應能顯示當前已選的有效座位數量與學生人數上限。

### 2.2 座位佈局設定 (7x7 網格)

*   **需求描述：**
    *   提供一個 7x7 的網格介面供使用者操作。
    *   使用者可以點選網格中的任意 35 個格子作為有效座位。
    *   座位佈局不限於規則的矩形，可錯開。
*   **功能點：**
    *   **網格渲染：** 動態生成 7x7 的座位網格。
    *   **座位狀態：** 每個格子應有「有效座位」和「無效座位」兩種狀態，並有視覺區分。
    *   **點擊切換：** 點擊格子可在有效/無效之間切換。
    *   **數量限制：** 限制有效座位數量最多為 35 個。
    *   **下一步按鈕：** 提供「下一步：設定分群」按鈕，引導使用者進入分群設定畫面。

### 2.3 座位分群功能

*   **需求描述：**
    *   提供功能讓使用者將選定的有效座位進行分群。
    *   分群為可選功能，不強制設定。
    *   **新增 UI/UX 需求：**
        *   **分群設定畫面：** 選好座位配置後，進入一個新的分群設定畫面。
        *   **座位顏色區分：**
            *   之前選中的有效座位應顯示為較深的灰色 (`is-valid-dark`)。
            *   其他非有效座位為淺灰色 (`is-invalid`)。
            *   教師點選數個深灰色的有效座位後，這些被選擇的座位應變為淺綠色 (`is-temp-selected-for-grouping`)。
            *   已分配群組的座位應顯示該群組的顏色和名稱 (`group-X`)。
        *   **分配按鈕：** 提供一個「分配選取座位至群組」按鈕，點擊後將淺綠色的座位加入當前選定的群組。
        *   **取消選取按鈕：** 提供一個「取消選取」按鈕，點擊後清除所有淺綠色的選取狀態。
        *   **返回選項：** 必須提供「返回座位配置」按鈕，讓教師可以重新改變座位配置。
*   **功能點：**
    *   **群組管理：** 允許新增、刪除群組名稱。
    *   **座位選取：** 在分群設定畫面中，只允許選取有效座位進行臨時選取（淺綠色）。
    *   **群組分配：** 將臨時選取的座位分配到指定群組，並更新其 `groupId` 屬性。
    *   **視覺反饋：** 根據座位所屬群組顯示不同的顏色。

### 2.4 設定檔的儲存與載入

*   **需求描述：**
    *   使用者可下載當前的座位佈局和分群設定。
    *   使用者可上傳之前下載的設定檔以恢復配置。
*   **功能點：**
    *   **下載功能：** 將當前 `seats` 陣列（僅包含 `row`, `col`, `isValid`, `groupId`）和 `groups`、`conditions` 數據序列化為 JSON 格式並提供下載。
    *   **上傳功能：** 讀取使用者上傳的 JSON 檔案，解析後更新 `seats`、`groups` 和 `conditions` 數據，並重新渲染介面。
    *   **數據驗證：** 載入時應對 JSON 數據進行基本結構驗證，防止載入錯誤格式的檔案。

### 2.5 座位安排條件設定

*   **需求描述：** 支援以下五種條件類型：
    *   **坐在一起 (左右)：** `(A, B)` - 學生 A 和 B 必須左右相鄰。
    *   **坐在一區 (前後左右相鄰)：** `[A, B, C, D]` - 學生 A, B, C, D 必須在同一區域內，彼此前後左右相鄰。
    *   **不能坐在一起 (至少隔一人)：** `{A, B}` - 學生 A 和 B 之間必須至少隔一個座位。
    *   **指定區域：** `A => G` - 學生 A 必須坐在第 G 群的座位。
    *   **指定區域且坐在一起：** `(A, B) => G` - 學生 A 和 B 必須左右相鄰，且兩人都必須在第 G 群的座位。
*   **功能點：**
    *   **條件輸入介面：** 提供下拉選單選擇條件類型，文字輸入框輸入學生編號，以及群組選擇器（針對指定區域條件）。
    *   **條件列表：** 顯示已新增的條件，並提供刪除功能。
    *   **條件解析：** 程式應能正確解析不同格式的學生編號輸入。

### 2.6 衝突處理

*   **需求描述：**
    *   當座位安排條件衝突時，程式應優先安排能排入的學生。
    *   無法安排的學生應列出清單，供教師手動調整。
*   **功能點：**
    *   **軟約束處理：** 核心演算法應具備處理軟約束的能力，即在無法滿足所有條件時，盡可能滿足更多條件，並識別出未能滿足的條件或無法安排的學生。
    *   **未安排學生列表：** 在結果介面顯示未能成功安排座位的學生編號。

## 3. 技術選型建議

考慮到 GitHub Pages 部署，專案將維持純前端應用。

*   **前端技術棧：**
    *   **HTML5：** 頁面結構。
    *   **CSS3：** 樣式設計，已使用 Flexbox 和 Grid 進行響應式佈局。
    *   **JavaScript (ES6+)：** 核心邏輯。
    *   **框架選擇：** 鑑於現有程式碼已採用原生 JavaScript 實現，且專案規模適中，建議繼續使用原生 JavaScript，並可考慮引入輕量級的狀態管理模式（例如 Redux-like 或 Vuex-like 的簡單實現）來優化 `main.js` 中的狀態管理，避免過多的 `renderScreen` 調用。如果未來功能擴展需求大，可考慮引入 Vue.js 或 React.js，但這會增加學習曲線和打包複雜度。**目前建議維持原生 JS，並優化其結構。**
*   **資料儲存方案：**
    *   **本地儲存：** 透過瀏覽器的 `localStorage` 或 `IndexedDB` 實現自動儲存和載入，提供更好的使用者體驗。
    *   **檔案下載/上傳：** 繼續使用 JSON 檔案作為設定檔的匯出匯入格式。

## 4. 介面設計描述

### 4.1 主要介面佈局

現有佈局已分為左側控制面板 (`left-panel`)、中央座位網格區 (`main-grid-area`) 和右側結果/衝突顯示區 (`right-panel`)，此結構將保留。

### 4.2 畫面流程圖

```mermaid
graph TD
    A[啟動應用] --> B{選擇畫面};
    B --> C[座位佈局設定畫面];
    B --> D[分群設定畫面];
    B --> E[座位安排條件設定畫面];

    C --> C1[7x7 網格顯示];
    C --> C2[點擊格子切換有效/無效];
    C --> C3[顯示已選座位數/上限];
    C --> C4[下載/上傳設定按鈕];
    C --> C5[下一步：設定分群按鈕];
    C5 --> D;

    D --> D1[7x7 網格顯示];
    D1 --> D1a[有效座位: 深灰色];
    D1 --> D1b[非有效座位: 淺灰色];
    D1 --> D1c[臨時選取座位: 淺綠色];
    D1 --> D1d[已分群座位: 群組顏色+名稱];
    D --> D2[新增群組名稱輸入框+按鈕];
    D --> D3[選擇群組下拉選單];
    D --> D4[分配選取座位至群組按鈕];
    D --> D5[取消選取按鈕];
    D --> D6[已定義群組列表(含刪除按鈕)];
    D --> D7[返回座位配置按鈕];
    D7 --> C;
    D --> D8[下一步：設定條件按鈕];
    D8 --> E;

    E --> E1[7x7 網格顯示(已分配學生/群組顏色)];
    E --> E2[條件類型下拉選單];
    E2 --> E2a[學生編號輸入框(動態提示格式)];
    E2 --> E2b[指定群組下拉選單(條件類型為指定區域時顯示)];
    E --> E3[新增條件按鈕];
    E --> E4[已設定條件列表(含刪除按鈕)];
    E --> E5[開始安排按鈕];
    E5 --> E6[顯示未安排學生列表];
    E --> E7[下載設定按鈕];
    E --> E8[返回分群設定按鈕];
    E8 --> D;
```

### 4.3 介面元素細節

*   **座位網格 (`.seat-grid`)：**
    *   每個座位 (`.seat`) 應清晰顯示其狀態（有效/無效/臨時選取/已分群/已分配學生）。
    *   在「座位佈局設定」畫面，有效座位顯示「✔」。
    *   在「分群設定」畫面，已分群座位顯示群組名稱。
    *   在「座位安排」畫面，已分配學生座位顯示學生編號。
*   **控制面板 (`left-panel`)：**
    *   **設定檔操作區：** 包含「下載設定」和「上傳設定」按鈕。
    *   **群組管理區 (分群設定畫面)：**
        *   「新增群組名稱」輸入框和「新增群組」按鈕。
        *   「選擇群組」下拉選單。
        *   「分配選取座位至群組」按鈕。
        *   「取消選取」按鈕。
        *   「已定義群組」列表，每個群組旁有「刪除」按鈕。
    *   **條件設定區 (座位安排畫面)：**
        *   「條件類型」下拉選單。
        *   「學生編號」輸入框，根據條件類型動態提示輸入格式。
        *   「指定群組」下拉選單（僅在「指定區域」條件類型時顯示）。
        *   「新增條件」按鈕。
        *   「已設定條件」列表，每個條件旁有「刪除」按鈕。
*   **結果/衝突顯示區 (`right-panel`)：**
    *   在「座位安排」畫面顯示「未安排學生」列表。

## 5. 資料結構設計

基於現有 `main.js` 中的狀態管理，建議優化和明確以下核心數據結構：

```javascript
// 全局應用程式狀態
let appState = {
    currentScreen: 'seatConfig', // 'seatConfig', 'groupingSetup', 'assignment'
    seats: [],                   // 7x7 的 Seat 對象陣列
    groups: [],                  // 字符串陣列，例如: ['第一組', '第二組']
    conditions: [],              // Condition 對象陣列
    studentCount: 35,            // 學生人數上限
    selectedValidSeatsCount: 0   // 已選取的有效座位數量
};

// Seat 對象結構 (每個網格單元)
class Seat {
    constructor(row, col) {
        this.row = row;
        this.col = col;
        this.isValid = false;                 // 是否為有效座位 (可供學生坐)
        this.isTempSelectedForGrouping = false; // 在分群設定畫面中是否被臨時選中 (淺綠色)
        this.groupId = undefined;             // 所屬群組的 ID (字符串，例如 '第一組')
        this.studentId = undefined;           // 已分配的學生 ID (數字 1-35)
    }
}

// Condition 對象結構
class Condition {
    constructor(id, type, students, group = undefined) {
        this.id = id;                       // 唯一 ID，用於刪除
        this.type = type;                   // 條件類型: 'adjacent', 'group_area', 'not_adjacent', 'assign_group', 'adjacent_and_group'
        this.students = students;           // 學生編號陣列，格式根據 type 變化
                                            // 'adjacent', 'not_adjacent': [[s1, s2], [s3, s4]]
                                            // 'group_area': [[s1, s2, s3, s4]]
                                            // 'assign_group', 'adjacent_and_group': [[s1], [s2]] 或 [[s1, s2]]
        this.group = group;                 // 僅當 type 為 'assign_group' 或 'adjacent_and_group' 時有效
    }
}
```

## 6. 核心演算法構想

核心演算法將基於**回溯搜索 (Backtracking)** 結合**約束滿足問題 (Constraint Satisfaction Problem, CSP)** 的思想。

### 6.1 演算法流程

1.  **初始化：**
    *   獲取所有有效座位 `availableValidSeats`。
    *   生成學生列表 `allStudents` (1 到 35)。
    *   初始化 `assignedStudentsMap` (學生 ID -> 座位對象) 和 `unassignedStudents` 列表。
2.  **學生排序 (啟發式優化)：**
    *   為了提高效率，優先安排那些參與最多條件的學生。這有助於更快地發現衝突並剪枝。
    *   可以計算每個學生在 `conditions` 中出現的次數，然後按降序排列學生列表。
3.  **回溯函數 `solveAssignment(studentIndex, studentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult)`：**
    *   **基本情況：** 如果 `studentIndex` 等於 `studentsToAssign.length`，表示所有學生都已嘗試分配，返回 `true` (成功)。
    *   **選擇學生：** `currentStudent = studentsToAssign[studentIndex]`。
    *   **選擇座位 (啟發式優化)：**
        *   遍歷 `availableSeats`。可以考慮對座位進行排序，例如優先考慮能滿足更多條件的座位，或者位於群組中心的座位。
        *   **剪枝：** 如果當前座位已被佔用，跳過。
    *   **嘗試分配：** 將 `currentStudent` 分配到當前 `seat`，更新 `seat.studentId` 和 `currentAssignment`。
    *   **檢查約束：**
        *   遍歷所有 `conditions`。
        *   對於每個條件，檢查其是否與 `currentStudent` 相關。
        *   如果相關，調用對應的約束檢查函數 (`checkAdjacent`, `checkGroupArea`, `checkNotAdjacent`, `checkAssignGroup`, `checkAdjacentAndGroup`)。
        *   如果任何一個相關條件不滿足，則當前分配無效，進行回溯。
    *   **遞迴：** 如果所有相關條件都滿足，則遞迴調用 `solveAssignment(studentIndex + 1, ...)`。
        *   如果遞迴調用返回 `true`，表示找到一個解，則當前調用也返回 `true`。
    *   **回溯：** 如果遞迴調用返回 `false` (或當前分配不滿足條件)，則撤銷對 `currentStudent` 的分配 (`seat.studentId = undefined`, `currentAssignment.delete(currentStudent)`)，嘗試下一個座位。
    *   **無法安排：** 如果所有可用座位都嘗試過且都失敗，則將 `currentStudent` 加入 `unassignedStudentsResult` 列表，並返回 `false`。

### 6.2 約束檢查函數 (基於現有 `main.js` 擴展)

*   `areSeatsAdjacentHorizontal(seat1, seat2)`: 檢查左右相鄰。
*   `areSeatsAdjacentAllDirections(seat1, seat2)`: 檢查前後左右相鄰 (包括斜對角)。
*   `getNeighboringValidSeats(seat, allSeats)`: 獲取指定座位周圍的有效座位。
*   `checkAdjacent(studentA, studentB, assignedStudentsMap, allSeats)`: 檢查 `(A, B)` 左右相鄰。
*   `checkGroupArea(studentsInGroup, assignedStudentsMap, allSeats)`: 檢查 `[A, B, C, D]` 在同一區域內 (使用 BFS 檢查連通性)。
*   `checkNotAdjacent(studentA, studentB, assignedStudentsMap, allSeats)`: 檢查 `{A, B}` 至少隔一人。
*   `checkAssignGroup(student, groupName, assignedStudentsMap, allSeats)`: 檢查 `A => G`。
*   **新增：** `checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap, allSeats)`: 檢查 `(A, B) => G`。

### 6.3 衝突解決策略

*   **優先安排能排入的學生：** 回溯演算法的性質決定了它會嘗試找到一個滿足所有條件的解。當找不到時，它會回溯。
*   **軟約束處理：**
    *   目前的 `solveAssignment` 函數在遇到任何不滿足的條件時會立即回溯。
    *   為了實現「優先安排能排入的學生」和「列出無法安排的學生」，需要調整 `solveAssignment` 的邏輯：
        *   當一個學生無法被分配到任何座位時，將其加入 `unassignedStudentsResult` 列表，然後繼續嘗試分配下一個學生。
        *   這意味著 `solveAssignment` 不再是簡單的返回 `true/false`，而是會盡力完成分配，並記錄未分配的學生。
        *   對於條件衝突，可以考慮為每個條件設置「硬約束」或「軟約束」屬性。硬約束必須滿足，軟約束則盡力滿足。目前需求暗示所有條件都是軟約束，即在衝突時優先安排能排入的學生，無法安排的列出。

## 7. 專案結構建議

基於現有 `student_seats` 目錄結構，建議進行模組化，以提高可維護性。

```
student_seats/
├── public/
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── style.css
│   │   └── js/
│   │       ├── main.js             # 應用程式入口，負責畫面渲染和事件綁定
│   │       ├── state.js            # 應用程式狀態管理 (appState, Seat, Condition)
│   │       ├── ui.js               # 介面渲染相關函數 (renderScreen, renderSeatConfigScreen, etc.)
│   │       ├── handlers.js         # 事件處理函數 (handleSeatConfigClick, handleAddGroup, etc.)
│   │       ├── algorithms.js       # 核心演算法和約束檢查函數 (solveAssignment, checkAdjacent, etc.)
│   │       └── utils.js            # 通用輔助函數 (downloadConfig, uploadConfig, getConditionDescription, etc.)
│   └── favicon.ico
├── docs/
│   └── specifications.md           # 專案規格書 (此文件)
├── .gitignore
└── README.md
```

**說明：**

*   `public/assets/js/` 下的 JavaScript 檔案將根據功能進行拆分，提高模組化程度。
*   `main.js` 將作為主入口，協調各模組。
*   `state.js` 集中管理應用程式的數據狀態和數據結構定義。
*   `ui.js` 負責所有介面元素的創建和更新。
*   `handlers.js` 負責所有使用者互動事件的處理邏輯。
*   `algorithms.js` 包含核心的座位分配演算法和所有約束檢查邏輯。
*   `utils.js` 包含不屬於上述類別的通用輔助函數。

## 8. 部署考量

本專案設計為純前端應用，可以直接部署到 GitHub Pages。

1.  **確保專案結構：** 確保您的專案根目錄包含 `public/` 資料夾，且 `index.html` 位於 `public/` 之下。
2.  **推送到 GitHub 倉庫：** 將您的專案程式碼推送到 GitHub 上的倉庫。
3.  **配置 GitHub Pages：**
    *   在您的 GitHub 倉庫頁面，點擊 `Settings` (設定)。
    *   在左側導航欄中，點擊 `Pages`。
    *   在 `Build and deployment` (構建和部署) 部分，選擇 `Source` (來源) 為 `Deploy from a branch` (從分支部署)。
    *   在 `Branch` (分支) 下拉選單中，選擇 `main` (或您用於部署的分支)。
    *   在 `Folder` (資料夾) 下拉選單中，選擇 `/public`。
    *   點擊 `Save` (儲存)。
4.  **訪問您的應用程式：** 稍等片刻，GitHub Pages 將會自動部署您的應用程式。您可以在 `Pages` 設定頁面頂部找到您的應用程式網址。

## 9. 工作劃分 (Work Breakdown Structure)

### 第一階段：基礎功能完善與 UI/UX 優化 (優先級：高)

*   **WBS 1.1：座位佈局設定功能完善**
    *   1.1.1：確保 7x7 網格渲染正確。
    *   1.1.2：實現座位點擊切換有效/無效狀態。
    *   1.1.3：實現有效座位數量上限 (35 人) 檢查。
    *   1.1.4：更新座位狀態的視覺反饋 (CSS)。
    *   1.1.5：實現「下一步：設定分群」按鈕的畫面切換邏輯。
*   **WBS 1.2：分群設定功能實現 (新 UI/UX)**
    *   1.2.1：實現分群設定畫面的渲染。
    *   1.2.2：更新座位在分群設定畫面中的顏色邏輯 (深灰、淺灰、淺綠、群組色)。
    *   1.2.3：實現座位臨時選取 (淺綠色) 的點擊邏輯。
    *   1.2.4：實現新增群組名稱功能。
    *   1.2.5：實現「分配選取座位至群組」按鈕邏輯。
    *   1.2.6：實現「取消選取」按鈕邏輯。
    *   1.2.7：實現「返回座位配置」按鈕邏輯。
    *   1.2.8：實現刪除群組功能，並同步更新座位數據。
*   **WBS 1.3：設定檔儲存與載入**
    *   1.3.1：完善下載設定檔功能 (包含 `seats`, `groups`, `conditions`)。
    *   1.3.2：完善上傳設定檔功能，並進行基本數據驗證。

### 第二階段：核心演算法與條件處理 (優先級：中)

*   **WBS 2.1：條件設定介面完善**
    *   2.1.1：實現條件類型下拉選單的動態顯示。
    *   2.1.2：實現學生編號輸入框的格式提示。
    *   2.1.3：實現「指定群組」下拉選單的顯示/隱藏邏輯。
    *   2.1.4：實現新增條件功能，並正確解析輸入。
    *   2.1.5：實現刪除條件功能。
*   **WBS 2.2：核心演算法實現與優化**
    *   2.2.1：實現 `solveAssignment` 回溯演算法框架。
    *   2.2.2：實現學生排序啟發式優化。
    *   2.2.3：實現 `checkAdjacent` 約束檢查。
    *   2.2.4：實現 `checkGroupArea` 約束檢查 (包含 BFS 連通性判斷)。
    *   2.2.5：實現 `checkNotAdjacent` 約束檢查。
    *   2.2.6：實現 `checkAssignGroup` 約束檢查。
    *   2.2.7：**新增：** 實現 `checkAdjacentAndGroup` 約束檢查。
    *   2.2.8：實現衝突處理邏輯，將無法安排的學生加入列表。
*   **WBS 2.3：結果顯示**
    *   2.3.1：在座位安排畫面顯示已分配的學生編號。
    *   2.3.2：顯示未安排學生清單。

### 第三階段：程式碼重構與優化 (優先級：低)

*   **WBS 3.1：JavaScript 模組化**
    *   3.1.1：將 `main.js` 拆分為 `state.js`, `ui.js`, `handlers.js`, `algorithms.js`, `utils.js`。
    *   3.1.2：確保模組間的正確導入和協作。
*   **WBS 3.2：響應式設計微調**
    *   3.2.1：測試並調整在不同螢幕尺寸下的介面顯示。
*   **WBS 3.3：代碼註釋與文檔**
    *   3.3.1：為關鍵函數和複雜邏輯添加詳細註釋。
    *   3.3.2：更新 `README.md`。

## 10. ToDo List

### 階段一：基礎功能完善與 UI/UX 優化

*   **座位佈局設定**
    *   [ ] 調整 `main.js` 的 `renderSeatConfigScreen`，確保點擊邏輯和數量限制正確。
    *   [ ] 確保 `style.css` 中 `is-valid` 和 `is-invalid` 樣式清晰。
*   **分群設定 (新 UI/UX)**
    *   [ ] 修改 `main.js` 的 `renderGroupingSetupScreen`，實現新的座位顏色邏輯 (`is-valid-dark`, `is-temp-selected-for-grouping`)。
    *   [ ] 實現 `handleGroupingSetupClick` 邏輯，只允許選取有效座位進行臨時選取。
    *   [ ] 實現「分配選取座位至群組」按鈕的 `handleAssignSelectedSeatsToGroup` 函數。
    *   [ ] 實現「取消選取」按鈕的 `handleClearTempSelection` 函數。
    *   [ ] 實現「返回座位配置」按鈕的事件監聽器。
    *   [ ] 完善 `handleAddGroup` 和 `handleDeleteGroup`，確保群組列表和座位 `groupId` 同步更新。
    *   [ ] 確保已分群的座位能正確顯示群組名稱和顏色。
*   **設定檔操作**
    *   [ ] 檢查 `downloadConfig` 函數是否正確導出 `seats` (僅 `row`, `col`, `isValid`, `groupId`)、`groups` 和 `conditions`。
    *   [ ] 檢查 `uploadConfig` 函數是否正確解析並載入所有數據，並重置臨時狀態和學生分配。

### 階段二：核心演算法與條件處理

*   **條件設定介面**
    *   [ ] 完善 `handleConditionTypeChange`，確保學生編號輸入框的提示和「指定群組」下拉選單的顯示/隱藏正確。
    *   [ ] 完善 `handleAddCondition`，確保能正確解析所有五種條件類型的學生編號格式。
    *   [ ] 完善 `getConditionDescription`，使其能正確描述所有五種條件。
*   **核心演算法**
    *   [ ] 審查 `startAssignment` 和 `solveAssignment` 函數，確保回溯邏輯正確。
    *   [ ] 實現學生排序啟發式邏輯 (已存在，需確認其有效性)。
    *   [ ] 仔細檢查並完善所有約束檢查函數 (`checkAdjacent`, `checkGroupArea`, `checkNotAdjacent`, `checkAssignGroup`)。
    *   [ ] **新增：** 實現 `checkAdjacentAndGroup` 函數。
    *   [ ] 調整 `solveAssignment` 的衝突處理邏輯，確保無法安排的學生能被正確收集到 `unassignedStudents` 列表中。
*   **結果顯示**
    *   [ ] 確保 `renderAssignmentScreen` 能正確顯示已分配的學生編號。
    *   [ ] 確保 `unassigned-students-list` 能正確顯示未安排學生。

### 階段三：程式碼重構與優化

*   **JavaScript 模組化**
    *   [ ] 創建 `state.js`，將 `appState`、`Seat`、`Condition` 移入。
    *   [ ] 創建 `ui.js`，將所有 `renderScreen` 相關函數移入。
    *   [ ] 創建 `handlers.js`，將所有 `handle...` 事件處理函數移入。
    *   [ ] 創建 `algorithms.js`，將 `startAssignment`、`solveAssignment` 和所有 `check...` 約束函數移入。
    *   [ ] 創建 `utils.js`，將 `downloadConfig`、`uploadConfig`、`getConditionDescription` 等通用函數移入。
    *   [ ] 更新 `main.js`，使其作為入口點，導入並協調其他模組。
*   **響應式設計微調**
    *   [ ] 在不同設備上測試介面，調整 `style.css` 中的媒體查詢。
*   **代碼註釋與文檔**
    *   [ ] 為所有新舊函數添加 JSDoc 格式的註釋。
    *   [ ] 更新 `README.md`，包含新的功能說明和運行/部署指南。