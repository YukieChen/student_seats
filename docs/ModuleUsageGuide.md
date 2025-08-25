# 學生座位安排系統 - 模組使用指南

## 概述

本指南詳細介紹學生座位安排系統中各個模組的使用方法、配置選項和最佳實踐。

## 目錄

1. [核心引擎](#核心引擎)
2. [衝突檢查模組](#衝突檢查模組)
3. [搜索策略模組](#搜索策略模組)
4. [緩存模組](#緩存模組)
5. [並行處理模組](#並行處理模組)
6. [剪枝優化模組](#剪枝優化模組)
7. [效果評估模組](#效果評估模組)
8. [全局優化模組](#全局優化模組)
9. [報告生成模組](#報告生成模組)
10. [性能監控模組](#性能監控模組)

## 核心引擎

### SeatAssignmentEngine

座位安排系統的主引擎，負責協調各個組件完成座位安排任務。

#### 基本使用

```javascript
const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');

// 創建引擎實例
const engine = new SeatAssignmentEngine({
    timeout: 30000,
    maxRetries: 3,
    enableCache: true,
    logLevel: 'INFO'
});

// 執行座位安排
const result = await engine.solveAssignment({
    students: [
        { id: 1, name: '張三', preferences: ['A1', 'A2'] },
        { id: 2, name: '李四', preferences: ['B1', 'B2'] }
    ],
    seats: [
        { id: 'A1', row: 'A', col: 1, available: true },
        { id: 'A2', row: 'A', col: 2, available: true }
    ],
    conditions: [
        { type: 'preference', studentId: 1, seatId: 'A1', priority: 1 }
    ],
    useHybridSearch: true,
    enablePruning: true
});
```

#### 配置選項

| 選項 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| timeout | number | 30000 | 執行超時時間（毫秒） |
| maxRetries | number | 3 | 最大重試次數 |
| enableCache | boolean | true | 是否啟用緩存 |
| logLevel | string | 'INFO' | 日誌級別 |

#### 搜索策略

```javascript
// 混合搜索（推薦）
const result = await engine.solveAssignment({
    ...config,
    useHybridSearch: true
});

// 廣度優先搜索
const result = await engine.solveAssignment({
    ...config,
    useBreadthFirstSearch: true
});

// 深度優先搜索
const result = await engine.solveAssignment({
    ...config,
    useDepthFirstSearch: true
});

// 啟發式搜索
const result = await engine.solveAssignment({
    ...config,
    useHeuristicSearch: true
});
```

## 衝突檢查模組

### ConflictChecker

負責檢查座位安排中的各種衝突。

#### 基本使用

```javascript
const { ConflictChecker } = require('./assets/js/engines/ConflictChecker.js');

const checker = new ConflictChecker({
    enableDetailedReporting: true,
    enableAutoResolution: false,
    maxConflictsToReport: 50
});

// 初始化
checker.initialize(students, seats, conditions);

// 執行衝突檢查
const result = checker.checkAllConflicts();

if (result.hasConflicts) {
    console.log('發現衝突:', result.conflicts);
    console.log('衝突摘要:', result.summary);
} else {
    console.log('沒有發現衝突');
}
```

#### 衝突類型

1. **容量衝突**: 學生數量超過座位容量
2. **條件衝突**: 條件之間相互矛盾
3. **群組綁定衝突**: 群組綁定條件無法滿足
4. **偏好衝突**: 學生偏好無法同時滿足

## 搜索策略模組

### SearchStrategies

提供多種搜索策略的協調器。

#### 基本使用

```javascript
const { SearchStrategies } = require('./assets/js/engines/SearchStrategies.js');

const strategies = new SearchStrategies();

// 混合搜索
const result = await strategies.hybridSearch(
    students, seats, conditions, scores, groupBindings, studentToConditionsMap
);

// 廣度優先搜索
const result = await strategies.breadthFirstSearch(
    students, seats, conditions, scores, groupBindings, studentToConditionsMap
);

// 深度優先搜索
const result = await strategies.depthFirstSearch(
    students, seats, conditions, scores, groupBindings, studentToConditionsMap
);

// 啟發式搜索
const result = await strategies.heuristicSearch(
    students, seats, conditions, scores, groupBindings, studentToConditionsMap
);
```

### 各搜索器模組

#### HeuristicSearcher

```javascript
const { HeuristicSearcher } = require('./assets/js/engines/HeuristicSearcher.js');

const searcher = new HeuristicSearcher();
const result = await searcher.search(students, seats, conditions, scores);
```

#### DepthFirstSearcher

```javascript
const { DepthFirstSearcher } = require('./assets/js/engines/DepthFirstSearcher.js');

const searcher = new DepthFirstSearcher();
const result = await searcher.search(students, seats, conditions, scores);
```

#### BreadthFirstSearcher

```javascript
const { BreadthFirstSearcher } = require('./assets/js/engines/BreadthFirstSearcher.js');

const searcher = new BreadthFirstSearcher();
const result = await searcher.search(students, seats, conditions, scores);
```

#### HybridSearcher

```javascript
const { HybridSearcher } = require('./assets/js/engines/HybridSearcher.js');

const searcher = new HybridSearcher();
const result = await searcher.search(students, seats, conditions, scores);
```

## 緩存模組

### AssignmentCache

提供座位安排結果的緩存功能。

#### 基本使用

```javascript
const { AssignmentCache } = require('./assets/js/engines/AssignmentCache.js');

const cache = new AssignmentCache();

// 設置緩存
cache.set('key', assignment, { ttl: 3600 });

// 獲取緩存
const assignment = cache.get('key');

// 檢查緩存是否存在
const exists = cache.has('key');

// 清除緩存
cache.clear();
```

### ConditionCache

專門用於條件檢查的緩存。

```javascript
const { ConditionCache } = require('./assets/js/engines/ConditionCache.js');

const cache = new ConditionCache();

// 緩存條件檢查結果
cache.setConditionResult(condition, result);

// 獲取條件檢查結果
const result = cache.getConditionResult(condition);
```

## 並行處理模組

### ParallelProcessor

提供並行處理功能，支援多線程執行。

#### 基本使用

```javascript
const { ParallelProcessor } = require('./assets/js/engines/ParallelProcessor.js');

const processor = new ParallelProcessor({
    maxWorkers: 4,
    taskTimeout: 30000
});

// 執行並行任務
const results = await processor.processTasks(tasks, {
    onProgress: (progress) => {
        console.log(`進度: ${progress.percentage}%`);
    }
});
```

### WorkerManager

管理 Worker 池。

```javascript
const { WorkerManager } = require('./assets/js/engines/WorkerManager.js');

const manager = new WorkerManager({
    poolSize: 4,
    idleTimeout: 60000
});

// 獲取 Worker
const worker = await manager.getWorker();

// 執行任務
const result = await worker.execute(task);

// 釋放 Worker
manager.releaseWorker(worker);
```

## 剪枝優化模組

### PruningOptimizer

提供各種剪枝優化策略。

#### 基本使用

```javascript
const { PruningOptimizer } = require('./assets/js/engines/PruningOptimizer.js');

const optimizer = new PruningOptimizer({
    enableEarlyTermination: true,
    enableInvalidPathPruning: true,
    enableDuplicateStatePruning: true,
    enableSymmetryPruning: true
});

// 早期終止檢查
const shouldTerminate = optimizer.checkEarlyTermination(state);

// 無效路徑剪枝
const validPaths = optimizer.pruneInvalidPaths(paths);

// 重複狀態剪枝
const uniqueStates = optimizer.pruneDuplicateStates(states);

// 對稱性剪枝
const prunedStates = optimizer.pruneSymmetries(states);
```

### 各剪枝器模組

#### EarlyTerminationChecker

```javascript
const { EarlyTerminationChecker } = require('./assets/js/engines/EarlyTerminationChecker.js');

const checker = new EarlyTerminationChecker();
const shouldTerminate = checker.shouldTerminate(state, metrics);
```

#### InvalidPathPruner

```javascript
const { InvalidPathPruner } = require('./assets/js/engines/InvalidPathPruner.js');

const pruner = new InvalidPathPruner();
const validPaths = pruner.prune(paths, conditions);
```

#### DuplicateStatePruner

```javascript
const { DuplicateStatePruner } = require('./assets/js/engines/DuplicateStatePruner.js');

const pruner = new DuplicateStatePruner();
const uniqueStates = pruner.prune(states);
```

#### SymmetryPruner

```javascript
const { SymmetryPruner } = require('./assets/js/engines/SymmetryPruner.js');

const pruner = new SymmetryPruner();
const prunedStates = pruner.prune(states);
```

## 效果評估模組

### EffectEvaluator

評估座位調整的效果。

#### 基本使用

```javascript
const { EffectEvaluator } = require('./assets/js/engines/EffectEvaluator.js');

const evaluator = new EffectEvaluator();

// 測量調整效果
const effect = evaluator.measureAdjustmentEffect(
    originalAssignment,
    newAssignment,
    conditions
);

// 預測調整效果
const prediction = evaluator.predictAdjustmentEffect(
    currentAssignment,
    proposedChanges,
    conditions
);
```

### EffectAnalyzer

分析調整效果的詳細資訊。

```javascript
const { EffectAnalyzer } = require('./assets/js/engines/EffectAnalyzer.js');

const analyzer = new EffectAnalyzer();

// 分析學生影響
const studentImpact = analyzer.analyzeStudentImpact(
    originalAssignment,
    newAssignment
);

// 分析條件影響
const conditionImpact = analyzer.analyzeConditionImpact(
    originalAssignment,
    newAssignment,
    conditions
);
```

### EffectPredictor

預測調整效果。

```javascript
const { EffectPredictor } = require('./assets/js/engines/EffectPredictor.js');

const predictor = new EffectPredictor();

// 預測調整效果
const prediction = predictor.predictAdjustmentEffect(
    currentAssignment,
    proposedChanges,
    conditions
);

// 評估調整風險
const risk = predictor.assessAdjustmentRisk(
    currentAssignment,
    proposedChanges
);
```

## 全局優化模組

### GlobalOptimizer

執行全局優化算法。

#### 基本使用

```javascript
const { GlobalOptimizer } = require('./assets/js/engines/GlobalOptimizer.js');

const optimizer = new GlobalOptimizer();

// 執行全局優化
const optimizedAssignment = await optimizer.globalOptimization(
    currentAssignment,
    conditions,
    options
);

// 評估全局狀態
const state = optimizer.evaluateGlobalState(assignment, conditions);
```

### GlobalStateEvaluator

評估全局狀態。

```javascript
const { GlobalStateEvaluator } = require('./assets/js/engines/GlobalStateEvaluator.js');

const evaluator = new GlobalStateEvaluator();

// 計算整體滿意度
const satisfaction = evaluator.calculateOverallScore(assignment, conditions);

// 分析分配情況
const distribution = evaluator.analyzeAssignmentDistribution(assignment);
```

### GlobalOptimizationEngine

執行全局優化算法。

```javascript
const { GlobalOptimizationEngine } = require('./assets/js/engines/GlobalOptimizationEngine.js');

const engine = new GlobalOptimizationEngine();

// 執行交換優化
const optimized = engine.performSwapOptimization(assignment, conditions);

// 執行重新分配優化
const reassigned = engine.performReassignmentOptimization(assignment, conditions);
```

## 報告生成模組

### AssignmentExplainer

生成座位安排結果的解釋報告。

#### 基本使用

```javascript
const { AssignmentExplainer } = require('./assets/js/engines/AssignmentExplainer.js');

const explainer = new AssignmentExplainer();

// 生成解釋報告
const report = explainer.explainAssignment(
    assignment,
    students,
    seats,
    conditions
);

// 分析失敗原因
const failureAnalysis = explainer.analyzeFailure(
    failedAssignment,
    students,
    seats,
    conditions
);
```

### ResultAnalyzer

分析結果的詳細資訊。

```javascript
const { ResultAnalyzer } = require('./assets/js/engines/ResultAnalyzer.js');

const analyzer = new ResultAnalyzer();

// 分析條件滿足情況
const satisfaction = analyzer.analyzeConditionSatisfaction(
    assignment,
    conditions
);

// 生成改進建議
const suggestions = analyzer.generateSuggestions(
    assignment,
    conditions
);
```

### ReportGenerator

生成各種格式的報告。

```javascript
const { ReportGenerator } = require('./assets/js/engines/ReportGenerator.js');

const generator = new ReportGenerator();

// 生成 JSON 報告
const jsonReport = generator.generateJsonReport(data);

// 生成 HTML 報告
const htmlReport = generator.generateHtmlReport(data);

// 生成 CSV 報告
const csvReport = generator.generateCsvReport(data);
```

## 性能監控模組

### PerformanceMonitor

監控系統性能。

#### 基本使用

```javascript
const { PerformanceMonitor } = require('./assets/js/engines/PerformanceMonitor.js');

const monitor = new PerformanceMonitor({
    enableMemoryMonitoring: true,
    enableCpuMonitoring: true,
    enableNetworkMonitoring: true
});

// 開始監控
monitor.startMonitoring();

// 執行任務
await someTask();

// 停止監控
monitor.stopMonitoring();

// 獲取性能指標
const metrics = monitor.getPerformanceMetrics();

// 生成性能報告
const report = monitor.generatePerformanceReport();
```

#### 性能指標

- **執行時間**: 任務執行所需時間
- **記憶體使用量**: 記憶體消耗情況
- **CPU 使用率**: CPU 使用情況
- **迭代次數**: 算法迭代次數
- **緩存命中率**: 緩存效率

## 最佳實踐

### 1. 模組初始化

```javascript
// 正確的初始化順序
const engine = new SeatAssignmentEngine();
await engine.initialize();

const checker = new ConflictChecker();
checker.initialize(students, seats, conditions);

const cache = new AssignmentCache();
cache.initialize();
```

### 2. 錯誤處理

```javascript
try {
    const result = await engine.solveAssignment(config);
    if (result.success) {
        console.log('座位安排成功');
    } else {
        console.log('座位安排失敗:', result.error);
    }
} catch (error) {
    console.error('執行錯誤:', error);
}
```

### 3. 性能優化

```javascript
// 啟用緩存
const engine = new SeatAssignmentEngine({
    enableCache: true
});

// 啟用剪枝
const result = await engine.solveAssignment({
    ...config,
    enablePruning: true
});

// 使用並行處理
const result = await engine.solveAssignment({
    ...config,
    enableParallelProcessing: true
});
```

### 4. 日誌記錄

```javascript
const logger = new Logger('DEBUG');

logger.info('開始座位安排', { studentCount: students.length });
logger.debug('配置詳情', config);
logger.warn('發現衝突', conflicts);
logger.error('執行失敗', error);
```

## 常見問題

### Q: 如何選擇合適的搜索策略？

A: 
- **小規模問題** (< 50 學生): 使用啟發式搜索
- **中等規模問題** (50-200 學生): 使用混合搜索
- **大規模問題** (> 200 學生): 使用並行處理 + 混合搜索

### Q: 如何提高執行效率？

A:
1. 啟用緩存功能
2. 使用剪枝優化
3. 啟用並行處理
4. 調整超時時間
5. 優化條件配置

### Q: 如何處理衝突？

A:
1. 使用 ConflictChecker 檢查衝突
2. 分析衝突報告
3. 調整條件配置
4. 重新執行座位安排

### Q: 如何監控性能？

A:
1. 使用 PerformanceMonitor 監控性能
2. 設置性能閾值
3. 分析性能報告
4. 優化配置參數

## 版本歷史

- **v2.0.0**: 重構版本，模組化架構
- **v1.0.0**: 初始版本

## 支援

如有問題，請參考：
- [架構文檔](./Architecture.md)
- [API 文檔](./API.md)
- [測試文檔](./Testing.md)
