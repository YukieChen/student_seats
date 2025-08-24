# 學生座位安排系統演算法詳細說明

## 概述

本系統採用**回溯演算法（Backtracking Algorithm）**來解決學生座位安排問題，結合多種啟發式策略來提高演算法效率和結果品質。系統支援多種約束條件，包括相鄰、不相鄰、群組區域、指定群組等複雜條件。

## 核心演算法架構

### 1. 主要入口函數：`startAssignment()`

這是整個演算法的入口點，負責：
- 初始條件衝突檢查
- 學生排序和啟發式優化
- 調用回溯演算法
- 結果處理和UI更新

#### 1.1 初始衝突檢查
```javascript
const conflicts = checkInitialConditionsForConflicts();
```
在開始演算法前，先檢查是否存在明顯的條件衝突，包括：

1. **總體檢查**：總學生數量是否超過總有效座位數
2. **assign_group 條件**：指定群組的學生數量是否超過該群組的有效座位數
3. **group_area 條件**：群組區域的學生數量是否超過該群組的有效座位數
4. **adjacent_and_group 條件**：相鄰且同群組的學生數量是否超過該群組的有效座位數

這些檢查可以避免在演算法執行過程中發現無法解決的衝突，提高演算法效率。

#### 1.2 學生排序策略
系統採用改進的多層次學生排序策略：

1. **隨機打亂**：首先使用 Fisher-Yates 洗牌演算法隨機打亂學生順序
2. **條件類型權重排序**：根據條件類型和複雜度進行加權排序
   - 不同條件類型有不同的權重
   - 特殊座位需求獲得額外分數
   - 條件複雜度（參與學生數量）影響分數

```javascript
// 條件類型權重
const CONDITION_WEIGHTS = {
    'assign_group': 10,      // 指定群組條件權重最高
    'group_area': 8,         // 群組區域條件
    'adjacent_and_group': 6, // 相鄰且同群組條件
    'adjacent': 3,           // 相鄰條件
    'not_adjacent': 2        // 不相鄰條件
};

// 計算每個學生的改進分數
const studentScores = new Map();
allStudents.forEach(s => studentScores.set(s, 0));

appState.conditions.forEach(condition => {
    const studentsInCondition = condition.students.flat();
    const weight = CONDITION_WEIGHTS[condition.type] || 1;
    
    studentsInCondition.forEach(studentId => {
        if (studentScores.has(studentId)) {
            let score = studentScores.get(studentId);
            score += weight;
            
            // 特殊座位需求額外分數
            if (condition.type === 'assign_group' && isSpecialSeatGroup(condition.group)) {
                score += 5;
            }
            
            // 條件複雜度分數
            const studentCount = studentsInCondition.length;
            score += Math.min(studentCount * 0.5, 3);
            
            studentScores.set(studentId, score);
        }
    });
});

// 先隨機打亂，再按改進分數進行穩定排序
allStudents = shuffleArray(allStudents);
allStudents.sort((a, b) => {
    const scoreA = studentScores.get(a) || 0;
    const scoreB = studentScores.get(b) || 0;
    return scoreB - scoreA; // 分數高的優先，同分保持隨機順序
});
```

### 2. 核心回溯演算法：`solveAssignment()`

這是演算法的核心部分，採用深度優先搜尋的回溯策略。

#### 2.1 演算法流程

1. **超時檢查**：設定30秒超時機制，避免演算法無限執行
2. **基本情況檢查**：如果所有學生都已分配，返回成功
3. **選擇當前學生**：按排序順序選擇下一個要安排的學生
4. **候選座位生成**：為當前學生生成所有可能的候選座位
5. **座位嘗試**：逐一嘗試每個候選座位
6. **條件驗證**：檢查當前分配是否滿足所有相關條件
7. **遞迴調用**：如果當前分配有效，遞迴處理下一個學生
8. **回溯**：如果當前分配無效或後續失敗，撤銷分配並嘗試下一個座位

#### 2.2 候選座位生成策略

```javascript
// 1. 獲取所有未被佔用的座位
let allUnoccupiedSeats = availableSeats.filter(seat => seat.studentId === undefined);

// 2. 過濾出滿足硬性條件的座位
let trulyValidCandidateSeats = [];
for (const seat of allUnoccupiedSeats) {
    const tempAssignment = new Map(currentAssignment);
    tempAssignment.set(currentStudent, seat);
    
    // 檢查所有相關條件
    let allConditionsMetForSeat = true;
    const relevantConditions = studentToConditionsMap.get(currentStudent) || [];
    for (const condition of relevantConditions) {
        if (!checkCondition(condition, tempAssignment)) {
            allConditionsMetForSeat = false;
            break;
        }
    }
    
    if (allConditionsMetForSeat) {
        trulyValidCandidateSeats.push(seat);
    }
}

// 3. 改進座位排序：先隨機打亂，再根據學生需求動態排序（保持同類座位間的隨機性）
let candidateSeats = shuffleArray(trulyValidCandidateSeats); // 先隨機打亂
candidateSeats = getSortedSeatsForStudent(currentStudent, candidateSeats, studentToConditionsMap); // 再根據需求排序
```

#### 2.3 回溯機制

```javascript
for (const { seat, score } of scoredAvailableSeats) {
    // 嘗試分配
    seat.studentId = currentStudent;
    currentAssignment.set(currentStudent, seat);
    
    // 檢查條件
    if (allConditionsMet) {
        // 遞迴處理下一個學生
        if (await solveAssignment(nextStudentsToAssign, currentAssignment, ...)) {
            return true; // 找到完整解
        }
    }
    
    // 回溯：撤銷分配
    seat.studentId = undefined;
    currentAssignment.delete(currentStudent);
}
```

### 3. 約束條件檢查系統

系統支援五種主要的約束條件類型：

#### 3.1 相鄰條件 (`adjacent`)
要求兩個學生必須相鄰（前後左右四個方向）。

```javascript
function checkAdjacent(studentA, studentB, assignedStudentsMap) {
    const seatA = assignedStudentsMap.get(studentA);
    const seatB = assignedStudentsMap.get(studentB);
    
    if (!seatA || !seatB) {
        return true; // 如果學生尚未分配，暫時不衝突
    }
    
    return areSeatsAdjacentAllDirections(seatA, seatB);
}
```

#### 3.2 不相鄰條件 (`not_adjacent`)
要求兩個學生不能相鄰，必須至少隔一個座位。

```javascript
function checkNotAdjacent(studentA, studentB, assignedStudentsMap) {
    const seatA = assignedStudentsMap.get(studentA);
    const seatB = assignedStudentsMap.get(studentB);
    
    if (!seatA || !seatB) {
        return true;
    }
    
    return !areSeatsAdjacentAllDirections(seatA, seatB);
}
```

#### 3.3 群組區域條件 (`group_area`)
要求一組學生必須形成連通的區域（彼此相鄰）。

```javascript
function checkGroupArea(studentsInGroup, assignedStudentsMap) {
    const assignedSeatsInGroup = studentsInGroup
        .map(studentId => assignedStudentsMap.get(studentId))
        .filter(seat => seat !== undefined);
    
    if (assignedSeatsInGroup.length === 0) {
        return true;
    }
    
    // 使用 BFS 檢查連通性
    const visited = new Set();
    const queue = [assignedSeatsInGroup[0]];
    visited.add(`${assignedSeatsInGroup[0].row}-${assignedSeatsInGroup[0].col}`);
    
    // BFS 遍歷
    let head = 0;
    while (head < queue.length) {
        const currentSeat = queue[head++];
        const neighbors = getNeighboringValidSeats(currentSeat, appState.seats);
        
        for (const neighbor of neighbors) {
            const isNeighborInGroup = assignedSeatsInGroup.some(s => 
                s.row === neighbor.row && s.col === neighbor.col);
            const neighborKey = `${neighbor.row}-${neighbor.col}`;
            
            if (isNeighborInGroup && !visited.has(neighborKey)) {
                visited.add(neighborKey);
                queue.push(neighbor);
            }
        }
    }
    
    return visited.size === assignedSeatsInGroup.length;
}
```

#### 3.4 指定群組條件 (`assign_group`)
要求學生必須坐在指定的群組區域內。

```javascript
function checkAssignGroup(student, groupName, assignedStudentsMap) {
    const seat = assignedStudentsMap.get(student);
    if (!seat) {
        return true;
    }
    return seat.groupId === groupName;
}
```

#### 3.5 相鄰且同群組條件 (`adjacent_and_group`)
要求兩個學生必須相鄰且都在指定的群組內。

```javascript
function checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap) {
    const seatA = assignedStudentsMap.get(studentA);
    const seatB = assignedStudentsMap.get(studentB);
    
    if (!seatA || !seatB) {
        return true;
    }
    
    return areSeatsAdjacentHorizontal(seatA, seatB) && 
           seatA.groupId === groupName && 
           seatB.groupId === groupName;
}
```

### 4. 啟發式優化策略

#### 4.1 學生排序啟發式
- **隨機打亂**：先隨機打亂學生順序，確保初始隨機性
- **條件分數優先**：根據條件類型和複雜度進行穩定排序
- **隨機性保持**：同分數的學生保持隨機打亂後的相對順序

#### 4.2 座位選擇啟發式
- **硬性條件過濾**：先過濾出滿足所有硬性條件的座位
- **隨機打亂**：先隨機打亂候選座位，確保初始隨機性
- **動態座位排序**：根據學生需求動態調整座位順序
  - 需要特殊座位的學生優先考慮特殊座位
  - 普通學生優先考慮普通座位
  - 同類座位間保持隨機順序
- **群組綁定檢查**：檢查學生群組與座位群組的綁定關係

#### 4.3 非阻塞執行
```javascript
// 每次迭代都讓出控制權，避免阻塞 UI
await new Promise(resolve => setTimeout(resolve, 0));
```

### 5. 演算法特性

#### 5.1 時間複雜度
- **最壞情況**：O(n! × m^n)，其中 n 是學生數量，m 是平均候選座位數
- **實際情況**：由於啟發式優化，通常遠低於最壞情況

#### 5.2 空間複雜度
- **遞迴深度**：O(n)，其中 n 是學生數量
- **狀態儲存**：O(n × m)，用於儲存當前分配狀態

#### 5.3 超時機制
- 設定30秒超時，避免演算法無限執行
- 超時時將剩餘學生標記為未安排

### 6. 結果處理

#### 6.1 成功情況
- 所有學生都成功安排
- 儲存分配結果到 `lastAssignedSeats`
- 顯示成功訊息

#### 6.2 部分成功情況
- 部分學生無法安排
- 將無法安排的學生加入 `unassignedStudents` 列表
- 顯示部分成功訊息和未安排學生數量

#### 6.3 失敗情況
- 超時或無法找到有效解
- 清空所有分配
- 顯示錯誤訊息

### 7. 演算法優勢

1. **完整性**：能夠處理所有可能的約束條件組合
2. **靈活性**：支援多種約束條件類型
3. **效率性**：透過啟發式優化提高演算法效率
4. **穩定性**：具備超時機制和錯誤處理
5. **多樣性**：透過隨機化策略產生不同的結果

### 8. 演算法限制

1. **NP困難問題**：座位安排問題本質上是NP困難的
2. **時間複雜度**：在複雜約束下可能需要較長執行時間
3. **解的存在性**：不一定存在滿足所有條件的解
4. **局部最優**：可能陷入局部最優解

### 9. 輔助函數

#### 9.1 特殊座位判斷函數
```javascript
// 判斷是否為特殊座位群組
function isSpecialSeatGroup(groupName) {
    const seatsInGroup = appState.seats.flat().filter(seat => 
        seat.isValid && seat.groupId === groupName);
    const totalValidSeats = appState.seats.flat().filter(seat => seat.isValid).length;
    
    // 如果該群組的座位數量少於總座位數的30%，則認為是特殊座位群組
    return seatsInGroup.length < totalValidSeats * 0.3;
}

// 判斷是否為特殊座位
function isSpecialSeat(seat) {
    return isSpecialSeatGroup(seat.groupId);
}
```

#### 9.2 動態座位排序函數
```javascript
function getSortedSeatsForStudent(studentId, availableSeats, studentToConditionsMap) {
    const studentConditions = studentToConditionsMap.get(studentId) || [];
    
    // 檢查學生是否有特殊座位要求
    const needsSpecialSeat = studentConditions.some(condition => 
        condition.type === 'assign_group' && isSpecialSeatGroup(condition.group)
    );
    
    // 根據學生需求排序座位
    return availableSeats.sort((a, b) => {
        const aIsSpecial = isSpecialSeat(a);
        const bIsSpecial = isSpecialSeat(b);
        
        if (needsSpecialSeat) {
            // 需要特殊座位的學生，特殊座位優先
            if (aIsSpecial && !bIsSpecial) return -1;
            if (!aIsSpecial && bIsSpecial) return 1;
        } else {
            // 普通學生，普通座位優先
            if (!aIsSpecial && bIsSpecial) return -1;
            if (aIsSpecial && !bIsSpecial) return 1;
        }
        
        return 0; // 保持隨機性
    });
}
```

### 10. 未來改進方向

1. **更智能的啟發式**：基於問題特性的更優化啟發式策略
2. **並行化**：利用多執行緒或Web Worker進行並行搜尋
3. **近似演算法**：在無法找到精確解時提供近似解
4. **學習機制**：基於歷史結果優化演算法參數

### 11. 動態調整機制（新增）

#### 11.1 概述

為了解決演算法中"無法踢出已分配學生"的根本問題，系統實現了**動態重新分配機制**。當高優先級學生無法找到合適座位時，系統會嘗試踢出已分配的低優先級學生，為高優先級學生騰出座位。

#### 11.2 核心函數

##### 11.2.1 `canStudentSitHere()`
檢查學生是否可以坐在指定座位：
```javascript
function canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
    // 創建臨時分配狀態進行測試
    const tempAssignment = new Map(currentAssignment);
    tempAssignment.set(studentId, seat);
    
    // 檢查學生的所有條件
    const studentConditions = studentToConditionsMap.get(studentId) || [];
    for (const condition of studentConditions) {
        if (!checkCondition(condition, tempAssignment)) {
            return false;
        }
    }
    
    return true;
}
```

##### 11.2.2 `tryReassignSeats()`
動態重新分配的核心函數：
```javascript
async function tryReassignSeats(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
    const currentStudentScore = studentScores.get(currentStudent) || 0;
    
    // 找到所有已分配的學生，按分數排序（低分優先被踢出）
    const assignedStudents = Array.from(currentAssignment.keys());
    const candidatesForRemoval = assignedStudents
        .filter(student => {
            const studentScore = studentScores.get(student) || 0;
            return studentScore < currentStudentScore; // 只有分數更低的學生才可能被踢出
        })
        .sort((a, b) => {
            const scoreA = studentScores.get(a) || 0;
            const scoreB = studentScores.get(b) || 0;
            return scoreA - scoreB; // 分數低的優先被踢出
        });
    
    // 嘗試踢出每個候選學生
    for (const studentToRemove of candidatesForRemoval) {
        const removedSeat = currentAssignment.get(studentToRemove);
        
        // 暫時移除該學生
        currentAssignment.delete(studentToRemove);
        removedSeat.studentId = undefined;
        
        // 檢查當前學生是否可以坐在這個座位
        if (canStudentSitHere(currentStudent, removedSeat, currentAssignment, studentToConditionsMap)) {
            // 成功！為當前學生安排座位
            currentAssignment.set(currentStudent, removedSeat);
            removedSeat.studentId = currentStudent;
            
            // 遞迴嘗試為被踢出的學生重新安排座位
            const remainingStudents = [studentToRemove];
            if (await solveAssignment(remainingStudents, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
                return true; // 成功重新安排
            }
        }
        
        // 失敗，恢復原狀
        currentAssignment.set(studentToRemove, removedSeat);
        removedSeat.studentId = studentToRemove;
    }
    
    return false; // 無法重新分配
}
```

#### 11.3 工作流程

1. **正常分配嘗試**：首先嘗試為學生找到空閒座位
2. **動態重新分配**：如果無法找到空閒座位，嘗試踢出已分配的低優先級學生
3. **優先級比較**：只有分數更低的學生才會被考慮踢出
4. **遞迴重新安排**：被踢出的學生需要重新安排座位
5. **狀態恢復**：如果重新安排失敗，恢復原始狀態

#### 11.4 優先級策略

- **分數比較**：只有分數更低的學生才會被踢出
- **排序策略**：按分數從低到高排序，優先踢出分數最低的學生
- **條件檢查**：確保踢出學生後，當前學生可以坐在該座位

#### 11.5 優勢

1. **解決資源競爭**：有效處理特殊座位等稀缺資源的競爭
2. **提高成功率**：大幅提高複雜約束條件下的安排成功率
3. **保持公平性**：基於分數的優先級確保公平性
4. **動態適應**：能夠在分配過程中動態調整策略

#### 11.6 注意事項

1. **性能影響**：動態重新分配會增加計算複雜度
2. **遞迴深度**：需要控制遞迴深度避免無限循環
3. **超時處理**：確保在超時限制內完成重新分配
4. **狀態一致性**：確保分配狀態的一致性

這個動態調整機制是演算法的重要改進，解決了原有演算法無法處理資源競爭的根本問題。
