# 學生座位安排系統演算法詳細說明 (v2.1 - 系統性修復版本)

## 概述

本系統採用**回溯演算法（Backtracking Algorithm）**結合**動態調整機制**來解決學生座位安排問題。系統支援多種約束條件，並通過智能化的啟發式策略提高演算法效率和結果品質。

## 核心演算法架構

### 1. 主要入口函數：`startAssignment()`

演算法的主入口點，負責整個座位安排流程：

#### 1.1 初始狀態檢查與調試
```javascript
console.log("[DEBUG] ===== startAssignment 開始 (v2.1 - 強制更新版本) =====");
console.log("[DEBUG] 代碼版本檢查: 這是強制更新版本 v2.1");
console.log("[DEBUG] 時間戳:", new Date().toISOString());
```

系統提供詳細的狀態檢查，包括：
- 學生ID列表和數量
- 座位網格尺寸和有效座位數
- 條件數量和座位群組分布

#### 1.2 初始衝突檢查
```javascript
const conflicts = checkInitialConditionsForConflicts();
if (conflicts.length > 0) {
    alert('檢測到以下條件衝突，請修正後再嘗試安排：\n' + conflicts.join('\n'));
    return;
}
```

檢查項目包括：
1. **總體檢查**：總學生數量 vs 總有效座位數
2. **assign_group 條件**：指定群組學生數量 vs 群組座位數
3. **group_area 條件**：群組區域學生數量 vs 群組座位數  
4. **adjacent_and_group 條件**：相鄰且同群組學生數量 vs 群組座位數
5. **assign_student_group_to_seat_group 條件**：學生群組數量 vs 座位群組數量
6. **groupSeatAssignments 綁定**：第一張圖片設定的綁定關係

#### 1.3 改進的學生排序策略

##### 1.3.1 條件權重系統
```javascript
const CONDITION_WEIGHTS = {
    'assign_group': 10,
    'assign_student_group_to_seat_group': 10,
    'group_area': 8,
    'adjacent_and_group': 6,
    'adjacent': 3,
    'not_adjacent': 2
};
```

##### 1.3.2 學生分數計算
系統為每個學生計算綜合分數，考慮因素包括：
- **條件類型權重**：不同條件類型有不同權重
- **特殊座位需求**：特殊座位需求額外加5分
- **條件複雜度**：參與學生數量影響分數（最多加3分）

```javascript
studentsInCondition.forEach(studentId => {
    let score = studentScores.get(actualStudentId);
    score += weight; // 條件權重
    
    // 特殊座位需求額外分數
    if ((condition.type === 'assign_group' || condition.type === 'assign_student_group_to_seat_group') 
        && isSpecialSeatGroup(condition.group)) {
        score += 5;
    }
    
    // 條件複雜度分數
    const complexityBonus = Math.min(studentsInCondition.length * 0.5, 3);
    score += complexityBonus;
    
    studentScores.set(actualStudentId, score);
});
```

##### 1.3.3 雙重排序策略
```javascript
// 先隨機打亂，再按分數穩定排序
allStudents = shuffleArray(allStudents);
allStudents.sort((a, b) => {
    const scoreA = studentScores.get(a) || 0;
    const scoreB = studentScores.get(b) || 0;
    return scoreB - scoreA; // 分數高的優先，同分保持隨機順序
});
```

#### 1.4 學生到條件映射建立

系統建立兩種條件映射：
1. **一般條件映射**：處理 `appState.conditions` 中的條件
2. **虛擬條件映射**：處理 `appState.groupSeatAssignments` 綁定

```javascript
// 處理 groupSeatAssignments 綁定：為第一張圖片中的學生群組綁定創建虛擬條件
for (const seatGroupId in appState.groupSeatAssignments) {
    const studentGroupName = appState.groupSeatAssignments[seatGroupId];
    const studentsInStudentGroup = appState.studentGroups[studentGroupName] || [];
    
    // 為每個學生創建一個虛擬的 assign_group 條件
    studentsInStudentGroup.forEach(studentId => {
        const virtualCondition = {
            type: 'assign_group',
            group: seatGroupId,
            students: [[studentId]],
            id: `virtual_${seatGroupId}_${studentId}`,
            studentGroupName: studentGroupName
        };
        
        studentToConditionsMap.get(id).push(virtualCondition);
    });
}
```

### 2. 核心回溯演算法：`solveAssignment()`

#### 2.1 演算法流程

1. **超時檢查**：30秒超時機制
2. **基本情況**：所有學生已分配
3. **學生選擇**：按排序順序選擇當前學生
4. **候選座位生成**：生成滿足硬性條件的候選座位
5. **座位嘗試**：逐一嘗試候選座位
6. **條件驗證**：檢查所有相關條件
7. **遞迴調用**：處理下一個學生
8. **動態調整**：嘗試踢出已分配學生
9. **回溯**：撤銷分配並嘗試下一個選項

#### 2.2 候選座位生成策略

```javascript
// 1. 獲取所有未被佔用的座位
let allUnoccupiedSeats = availableSeats.filter(seat => seat.studentId === undefined);

// 2. 過濾出滿足所有硬性條件的座位
let trulyValidCandidateSeats = [];
for (const seat of allUnoccupiedSeats) {
    const tempAssignment = new Map(currentAssignment);
    tempAssignment.set(currentStudent, seat);
    
    let allConditionsMetForSeat = true;
    const relevantConditions = studentToConditionsMap.get(currentStudent) || [];
    
    for (const condition of relevantConditions) {
        // 處理不同條件類型的硬性檢查
        if (condition.type === 'assign_group') {
            if (seat.groupId !== condition.group) {
                allConditionsMetForSeat = false;
                break;
            }
        }
        // 其他條件檢查...
    }
    
    // 檢查學生群組與座位群組的綁定
    if (boundSeatGroup && seat.groupId !== boundSeatGroup) {
        allConditionsMetForSeat = false;
    }
    
    if (allConditionsMetForSeat) {
        trulyValidCandidateSeats.push(seat);
    }
}

// 3. 動態座位排序
let candidateSeats = shuffleArray(trulyValidCandidateSeats);
candidateSeats = getSortedSeatsForStudent(currentStudent, candidateSeats, studentToConditionsMap);
```

### 3. 動態調整機制（核心創新）

#### 3.1 `tryReassignSeats()` - 智能重新分配策略

當學生無法找到合適座位時，系統嘗試動態調整：

```javascript
async function tryReassignSeats(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
    // 策略1：直接踢出低分學生
    const directRemovalResult = await tryDirectRemoval(...);
    if (directRemovalResult) return true;
    
    // 策略2：智能互換策略
    const swapResult = await trySmartSwap(...);
    if (swapResult) return true;
    
    return false;
}
```

#### 3.2 策略1：`tryDirectRemoval()` - 直接踢出策略

```javascript
async function tryDirectRemoval(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
    const currentStudentScore = studentScores.get(currentStudent) || 0;
    
    // 找到所有分數更低的已分配學生
    const candidatesForRemoval = assignedStudents
        .filter(student => studentScores.get(student) < currentStudentScore)
        .sort((a, b) => studentScores.get(a) - studentScores.get(b));
    
    // 嘗試踢出每個候選學生
    for (const studentToRemove of candidatesForRemoval) {
        const removedSeat = currentAssignment.get(studentToRemove);
        
        // 暫時移除該學生
        currentAssignment.delete(studentToRemove);
        removedSeat.studentId = undefined;
        
        // 檢查當前學生是否可以坐在這個座位
        if (canStudentSitHere(currentStudent, removedSeat, currentAssignment, studentToConditionsMap)) {
            // 安排當前學生
            currentAssignment.set(currentStudent, removedSeat);
            removedSeat.studentId = currentStudent;
            
            // 遞迴重新安排被踢出的學生
            if (await solveAssignment([studentToRemove], currentAssignment, ...)) {
                return true;
            }
        }
        
        // 失敗則恢復原狀
        currentAssignment.set(studentToRemove, removedSeat);
        removedSeat.studentId = studentToRemove;
    }
    
    return false;
}
```

#### 3.3 策略2：`trySmartSwap()` - 智能互換策略

包含三個子策略：

##### 3.3.1 策略2a：學生互換
```javascript
// 放寬互換條件：允許分數差異在5分以內，或者當前學生分數更高
if (candidateScore >= currentStudentScore - 5 || currentStudentScore > candidateScore) {
    if (await canSwapStudents(currentStudent, candidateStudent, currentAssignment, studentToConditionsMap)) {
        // 執行互換
        const tempSeat = { ...candidateSeat };
        candidateSeat.studentId = currentStudent;
        currentAssignment.set(currentStudent, candidateSeat);
        
        if (currentStudentSeat) {
            currentStudentSeat.studentId = candidateStudent;
            currentAssignment.set(candidateStudent, currentStudentSeat);
            return true;
        }
    }
}
```

##### 3.3.2 策略2b：連鎖調整策略
```javascript
async function tryChainAdjustment(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
    // 尋找可能的連鎖調整路徑：A→B→C
    for (const studentA of assignedStudents) {
        for (const studentB of assignedStudents) {
            if (studentB === studentA) continue;
            
            // 檢查連鎖調整的可行性
            if (canChain) {
                console.log(`[DEBUG] 發現連鎖調整路徑：${currentStudent} -> ${studentA} -> ${studentB}`);
                
                // 執行連鎖調整
                seatA.studentId = currentStudent;
                seatB.studentId = studentA;
                
                // 嘗試為學生B重新安排座位
                if (await solveAssignment([studentB], currentAssignment, ...)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}
```

##### 3.3.3 策略2c：特殊座位讓出策略
```javascript
if (currentStudentNeedsSpecialSeat) {
    for (const candidateStudent of assignedStudents) {
        const candidateSeat = currentAssignment.get(candidateStudent);
        
        // 檢查候選學生是否坐在特殊座位上且分數較低
        if (isSpecialSeat(candidateSeat) && candidateScore < currentStudentScore) {
            // 檢查候選學生是否可以坐在普通座位上
            const availableRegularSeats = availableSeats.filter(seat => 
                seat.studentId === undefined && !isSpecialSeat(seat)
            );
            
            for (const regularSeat of availableRegularSeats) {
                if (canSitInRegularSeat) {
                    // 執行調整：候選學生移到普通座位，當前學生獲得特殊座位
                    candidateSeat.studentId = undefined;
                    regularSeat.studentId = candidateStudent;
                    currentAssignment.set(candidateStudent, regularSeat);
                    
                    if (canStudentSitHere(currentStudent, candidateSeat, currentAssignment, studentToConditionsMap)) {
                        currentAssignment.set(currentStudent, candidateSeat);
                        candidateSeat.studentId = currentStudent;
                        return true;
                    }
                }
            }
        }
    }
}
```

### 4. 系統性狀態驗證機制

#### 4.1 `validateAndFixAssignmentState()` - 通用狀態驗證

```javascript
function validateAndFixAssignmentState(currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap) {
    const unassignedStudentsArray = Array.from(unassignedStudentsResult);
    
    // 檢查每個未安排學生是否真的無法安排
    for (const studentId of unassignedStudentsArray) {
        // 檢查學生是否已經被安排（狀態不一致）
        if (currentAssignment.has(studentId)) {
            unassignedStudentsResult.delete(studentId);
            continue;
        }
        
        // 檢查學生是否可以坐在空座位
        const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
        for (const emptySeat of availableEmptySeats) {
            if (canStudentSitHere(studentId, emptySeat, currentAssignment, studentToConditionsMap)) {
                // 自動安排學生到空座位
                emptySeat.studentId = studentId;
                currentAssignment.set(studentId, emptySeat);
                unassignedStudentsResult.delete(studentId);
                break;
            }
        }
        
        if (!canBeAssigned) {
            // 進行詳細診斷
            diagnoseStudentAssignment(studentId, currentAssignment, availableSeats, studentToConditionsMap);
        }
    }
}
```

#### 4.2 `diagnoseStudentAssignment()` - 通用診斷機制

```javascript
function diagnoseStudentAssignment(studentId, currentAssignment, availableSeats, studentToConditionsMap) {
    // 檢查學生的條件
    const studentConditions = studentToConditionsMap.get(studentId) || [];
    
    // 檢查可用的空座位
    const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
    
    // 檢查學生是否可以坐在任何空座位
    let canSitInAnySeat = false;
    for (const emptySeat of availableEmptySeats) {
        const canSit = canStudentSitHere(studentId, emptySeat, currentAssignment, studentToConditionsMap);
        if (canSit) canSitInAnySeat = true;
    }
    
    if (canSitInAnySeat) {
        console.log(`[DEBUG] 診斷結果：學生 ${studentId} 可以坐在空座位，但沒有被安排。這是一個狀態不一致的問題。`);
    } else {
        // 分析具體原因
        analyzeAssignmentFailure(studentId, currentAssignment, availableSeats, studentToConditionsMap);
    }
}
```

### 5. 約束條件檢查系統

#### 5.1 支援的條件類型

1. **`adjacent`** - 相鄰條件：要求兩個學生必須相鄰（四個方向）
2. **`not_adjacent`** - 不相鄰條件：要求兩個學生不能相鄰
3. **`group_area`** - 群組區域條件：要求一組學生形成連通區域
4. **`assign_group`** - 指定群組條件：要求學生坐在指定群組
5. **`adjacent_and_group`** - 相鄰且同群組條件：要求學生相鄰且在同群組
6. **`assign_student_group_to_seat_group`** - 學生群組指定座位群組條件

#### 5.2 條件檢查範例

```javascript
function checkCondition(condition, assignedStudentsMap) {
    switch (condition.type) {
        case 'adjacent':
            return condition.students.every(pair =>
                checkAdjacent(pair[0], pair[1], assignedStudentsMap)
            );
        case 'group_area':
            return checkGroupArea(condition.students[0], assignedStudentsMap);
        case 'assign_group':
            return condition.students.every(s =>
                checkAssignGroup(s[0], condition.group, assignedStudentsMap)
            );
        // 其他條件類型...
        default:
            return true;
    }
}
```

### 6. 演算法特性分析

#### 6.1 時間複雜度
- **最壞情況**：O(n! × m^n × k)，其中 n 是學生數量，m 是平均候選座位數，k 是動態調整複雜度
- **實際情況**：由於多層啟發式優化和動態調整，通常遠低於最壞情況

#### 6.2 空間複雜度
- **遞迴深度**：O(n)
- **狀態儲存**：O(n × m)
- **動態調整額外開銷**：O(n^2)

#### 6.3 演算法優勢

1. **完整性**：處理所有可能的約束條件組合
2. **智能化**：多層次啟發式優化
3. **動態性**：資源競爭時的智能調整
4. **系統性**：通用的狀態驗證和診斷機制
5. **穩定性**：超時機制和錯誤處理
6. **多樣性**：隨機化策略產生不同結果

#### 6.4 創新特點

1. **動態調整機制**：解決資源競爭問題
2. **多策略調整**：直接踢出、智能互換、連鎖調整
3. **通用診斷系統**：系統性問題診斷和修復
4. **雙重條件處理**：支援UI條件和群組綁定
5. **智能狀態管理**：自動狀態驗證和修復

### 7. 調試和診斷系統

#### 7.1 詳細調試輸出
系統提供多層次的調試信息：
- 版本控制和時間戳
- 條件數據詳細檢查
- 學生分數計算追蹤
- 座位群組狀態檢查
- 動態調整過程追蹤
- 狀態驗證結果

#### 7.2 錯誤診斷機制
```javascript
function analyzeAssignmentFailure(studentId, currentAssignment, availableSeats, studentToConditionsMap) {
    const studentConditions = studentToConditionsMap.get(studentId) || [];
    
    // 檢查每個條件在每個空座位的失敗原因
    for (const condition of studentConditions) {
        for (const emptySeat of availableEmptySeats) {
            const conditionMet = checkCondition(condition, tempAssignment);
            if (!conditionMet) {
                // 根據條件類型提供具體分析
                switch (condition.type) {
                    case 'adjacent':
                        console.log(`[DEBUG] 相鄰條件失敗：需要與其他學生相鄰，但該座位周圍沒有合適的學生`);
                        break;
                    case 'assign_group':
                        console.log(`[DEBUG] 群組條件失敗：需要坐在群組 ${condition.group}，但該座位屬於群組 ${emptySeat.groupId}`);
                        break;
                    // 其他條件類型分析...
                }
            }
        }
    }
}
```

### 8. 演算法流程圖

```
開始
  ↓
初始狀態檢查
  ↓
初始衝突檢查 → 有衝突 → 報告錯誤並退出
  ↓ 無衝突
學生分數計算
  ↓
學生排序（隨機+權重）
  ↓
建立條件映射
  ↓
回溯演算法開始
  ↓
選擇下一個學生 → 所有學生已分配 → 成功結束
  ↓ 有學生待分配
生成候選座位
  ↓
嘗試第一個候選座位 → 無候選座位 → 動態調整
  ↓ 有候選座位                    ↓
檢查條件 → 不滿足 → 回溯        嘗試踢出低分學生
  ↓ 滿足                         ↓
遞迴處理下一學生 → 失敗 → 回溯    智能互換策略
  ↓ 成功                         ↓
返回成功                        連鎖調整策略
                                ↓
                              狀態驗證和診斷
                                ↓
                              標記為未安排
```

### 9. 總結

此演算法系統是一個高度優化的約束滿足問題解決方案，具有以下核心特點：

1. **多層次優化**：從學生排序到座位選擇的全方位優化
2. **動態適應性**：能夠在執行過程中動態調整策略
3. **系統性診斷**：提供詳細的問題診斷和修復機制
4. **高度模組化**：各個組件獨立且可重用
5. **強健性**：具備完善的錯誤處理和恢復機制

這個演算法不僅解決了基本的座位安排問題，更重要的是解決了資源競爭和複雜約束條件下的優化問題，是一個完整的智能化座位安排解決方案。