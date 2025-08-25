# 模組依賴關係分析

## 模組列表

### 核心模組
1. **Logger.js** (432行) - 日誌記錄模組
   - 依賴：無
   - 被依賴：所有模組

2. **SeatAssignmentEngine.js** (481行) - 主引擎
   - 依賴：Logger, AssignmentCache, StateValidator, ConflictChecker, StudentScorer, SeatSelector, DynamicAdjuster, SearchStrategies, PruningOptimizer, MultiStartSearcher, PerformanceMonitor
   - 被依賴：無

### 功能模組
3. **AssignmentCache.js** (1209行) - 緩存管理
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

4. **StateValidator.js** (864行) - 狀態驗證
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

5. **ConflictChecker.js** (2461行) - 衝突檢查
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

6. **StudentScorer.js** (558行) - 學生評分
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

7. **SeatSelector.js** (564行) - 座位選擇
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

8. **DynamicAdjuster.js** (463行) - 動態調整
   - 依賴：無
   - 被依賴：SeatAssignmentEngine

### 新增模組
9. **SearchStrategies.js** (1107行) - 搜索策略
   - 依賴：Logger
   - 被依賴：SeatAssignmentEngine

10. **PruningOptimizer.js** (1255行) - 剪枝優化
    - 依賴：Logger
    - 被依賴：SeatAssignmentEngine

11. **MultiStartSearcher.js** (967行) - 多起點搜索
    - 依賴：Logger
    - 被依賴：SeatAssignmentEngine

12. **PerformanceMonitor.js** (733行) - 性能監控
    - 依賴：Logger
    - 被依賴：SeatAssignmentEngine

13. **ParallelProcessor.js** (1251行) - 並行處理
    - 依賴：無
    - 被依賴：無（獨立模組）

### 拆分模組
14. **StrategyEvaluator.js** (452行) - 策略評估
    - 依賴：無
    - 被依賴：DynamicAdjuster

15. **StrategyLearner.js** (551行) - 策略學習
    - 依賴：無
    - 被依賴：DynamicAdjuster

16. **PriorityOptimizer.js** (813行) - 優先級優化
    - 依賴：無
    - 被依賴：DynamicAdjuster

17. **GlobalOptimizer.js** (859行) - 全局優化
    - 依賴：無
    - 被依賴：DynamicAdjuster

18. **EffectEvaluator.js** (848行) - 效果評估
    - 依賴：無
    - 被依賴：DynamicAdjuster

### 輔助模組
19. **TransactionalAssignment.js** (485行) - 事務分配
    - 依賴：無
    - 被依賴：無

20. **CycleDetector.js** (489行) - 循環檢測
    - 依賴：無
    - 被依賴：無

21. **AssignmentExplainer.js** (846行) - 分配解釋
    - 依賴：無
    - 被依賴：無

## 依賴關係圖

```
Logger.js (基礎層)
    ↓
SearchStrategies.js, PruningOptimizer.js, MultiStartSearcher.js, PerformanceMonitor.js (功能層)
    ↓
SeatAssignmentEngine.js (協調層)
    ↓
AssignmentCache.js, StateValidator.js, ConflictChecker.js, StudentScorer.js, SeatSelector.js, DynamicAdjuster.js (核心層)
    ↓
StrategyEvaluator.js, StrategyLearner.js, PriorityOptimizer.js, GlobalOptimizer.js, EffectEvaluator.js (子模組層)
```

## 依賴分析

### 優點
1. **清晰的層次結構**：從基礎層到協調層，層次分明
2. **低耦合**：大部分模組只依賴 Logger，相互間依賴較少
3. **單一職責**：每個模組都有明確的功能職責
4. **可測試性**：模組間依賴簡單，便於單元測試

### 問題
1. **Logger 依賴過多**：所有模組都依賴 Logger，可能造成過度耦合
2. **SeatAssignmentEngine 依賴過多**：主引擎依賴了太多模組
3. **缺少模組管理器**：沒有統一的模組管理機制
4. **依賴注入不統一**：不同模組使用不同的依賴注入方式

## 優化建議

### 1. 建立模組管理器
- 創建 ModuleManager.js 統一管理所有模組
- 實現依賴注入容器
- 提供模組生命週期管理

### 2. 優化依賴關係
- 減少 SeatAssignmentEngine 的直接依賴
- 實現模組間的事件通信機制
- 使用接口抽象減少耦合

### 3. 統一導入導出格式
- 統一使用 ES6 模組語法
- 實現按需載入機制
- 優化打包和壓縮

### 4. 建立檔案命名規範
- 制定統一的檔案命名規則
- 建立目錄結構規範
- 實現檔案自動分類
