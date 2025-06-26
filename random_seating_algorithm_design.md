# 隨機座位演算法設計方案

本設計方案旨在透過在回溯演算法的關鍵決策點引入隨機性，同時利用 `lastAssignedSeats` 數據結構實現有條件學生的區域輪調。現有的約束檢查邏輯將保持不變，確保隨機化的同時仍然遵守所有條件。

## A. 數據結構變更

*   **[`assets/js/state.js`](assets/js/state.js)**:
    *   在 `appState` 中新增一個屬性 `lastAssignedSeats: new Map()`，用於儲存學生上一次的座位分配結果（`Map<studentId, {row, col}>`）。
    *   在 `initializeAppState` 函數中初始化 `lastAssignedSeats`。

## B. 核心隨機化策略與演算法流程修改

*   **[`assets/js/algorithms.js`](assets/js/algorithms.js)**:

    1.  **`startAssignment` 函數修改**：
        *   在 `solveAssignment` 調用成功後，將當前成功的 `assignedStudentsMap` 結果儲存到 `appState.lastAssignedSeats` 中。

    2.  **`solveAssignment` 函數修改**：
        *   **學生排序與隨機性引入**：
            *   在 `solveAssignment` 函數的開頭，在選擇 `currentStudent` 之前，對 `studentsToAssign` 陣列進行 Fisher-Yates 洗牌演算法打亂，以確保學生處理順序的隨機性。
            *   現有的學生啟發式排序將在隨機打亂之後進行，但對於分數相同的學生，將保持其隨機打亂後的相對順序，以確保隨機性優先。
        *   **座位選擇與隨機性引入**：
            *   **對於有 `assign_group` 條件的學生**：
                *   首先篩選出屬於該 `groupId` 的有效座位。
                *   然後，將這些座位中，該學生上一次的座位（從 `appState.lastAssignedSeats` 獲取）在候選列表中後移，優先嘗試其他座位。
                *   對這些候選座位進行 Fisher-Yates 洗牌，確保區域內輪調的隨機性。
            *   **對於無條件學生**：
                *   對所有未被佔用的有效座位進行完全 Fisher-Yates 洗牌，確保其座位的完全隨機性。
            *   現有的座位啟發式評分邏輯將在隨機打亂之後進行，但對於分數相同的座位，將保持其隨機打亂後的相對順序，以確保隨機性優先。
        *   **回溯邏輯**：
            *   回溯邏輯本身不需要大的修改，因為隨機性已在學生和座位選擇時引入，這會導致回溯路徑的探索也具有隨機性。

## C. 演算法流程圖

```mermaid
graph TD
    A[開始座位安排 startAssignment] --> B{檢查初始條件衝突?};
    B -- 是 --> C[顯示衝突並停止];
    B -- 否 --> D[清空舊分配, 準備學生和座位數據];
    D --> E[初始化 appState.lastAssignedSeats];
    E --> F[調用 solveAssignment];

    F --> G{solveAssignment 遞迴};
    G -- 超時 --> H[將剩餘學生加入未安排列表, 返回失敗];
    G -- 所有學生已分配 --> I[返回成功];

    G -- 否 --> J[對 studentsToAssign 進行 Fisher-Yates 洗牌];
    J --> K[對 studentsToAssign 進行啟發式排序 (分數相同保持隨機順序)];
    K --> L[選擇 currentStudent = studentsToAssign[0]];

    L --> M{currentStudent 是否有 assign_group 條件?};
    M -- 是 --> N[篩選出指定 groupId 內的有效座位];
    N --> O[將上次座位後移 (區域輪調)];
    O --> P[對 N 的結果進行 Fisher-Yates 洗牌];
    M -- 否 --> Q[對所有有效座位進行 Fisher-Yates 洗牌];

    P --> R[對座位進行啟發式評分 (分數相同保持隨機順序)];
    Q --> R;

    R --> S{遍歷 scoredAvailableSeats};
    S --> T[嘗試將 currentStudent 放置在當前座位];
    T --> U{檢查所有相關條件是否滿足?};
    U -- 否 --> V[回溯: 撤銷分配, 繼續嘗試下一個座位];
    U -- 是 --> W[遞迴調用 solveAssignment (處理下一個學生)];
    W -- 成功 --> I;
    W -- 失敗 --> V;

    S -- 所有座位嘗試失敗 --> X[嘗試回溯並重新安排其他學生];
    X -- 成功 --> I;
    X -- 失敗 --> Y[將 currentStudent 標記為未安排];
    Y --> Z[遞迴調用 solveAssignment (處理剩餘學生)];
    Z -- 成功 --> I;
    Z -- 失敗 --> End[結束此分支, 返回成功 (即使有學生未安排)];

    I --> AA[更新 appState.seats 和 appState.lastAssignedSeats];
    AA --> BB[更新 UI, 顯示結果];
    BB --> End[結束];