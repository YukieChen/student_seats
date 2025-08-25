# 檔案命名規範和目錄結構規範

## 檔案命名規範

### 1. 基本命名規則

#### 1.1 模組檔案命名
- **格式**: `PascalCase.js`
- **示例**: `SeatAssignmentEngine.js`, `ModuleManager.js`, `PerformanceMonitor.js`
- **說明**: 使用 PascalCase（大駝峰命名法），每個單詞首字母大寫

#### 1.2 測試檔案命名
- **格式**: `PascalCase.test.js`
- **示例**: `SeatAssignmentEngine.test.js`, `ModuleManager.test.js`
- **說明**: 在模組名稱後加上 `.test.js` 後綴

#### 1.3 備份檔案命名
- **格式**: `PascalCase.js.backup`
- **示例**: `ConflictChecker.js.backup`
- **說明**: 在原始檔案名後加上 `.backup` 後綴

#### 1.4 配置文件命名
- **格式**: `camelCase.config.js` 或 `kebab-case.config.js`
- **示例**: `moduleManager.config.js`, `performance-monitor.config.js`
- **說明**: 使用 camelCase 或 kebab-case，加上 `.config.js` 後綴

### 2. 目錄命名規範

#### 2.1 主要目錄
- **engines/**: 核心引擎模組
- **tests/**: 測試檔案
- **utils/**: 工具函數
- **config/**: 配置文件
- **docs/**: 文檔檔案

#### 2.2 子目錄
- **tests/unit/**: 單元測試
- **tests/integration/**: 集成測試
- **tests/performance/**: 性能測試
- **docs/api/**: API 文檔
- **docs/architecture/**: 架構文檔

### 3. 類別和變數命名規範

#### 3.1 類別命名
- **格式**: `PascalCase`
- **示例**: `SeatAssignmentEngine`, `ModuleManager`, `PerformanceMonitor`
- **說明**: 使用 PascalCase，描述類別的主要功能

#### 3.2 方法命名
- **格式**: `camelCase`
- **示例**: `solveAssignment()`, `getModule()`, `createModuleInstance()`
- **說明**: 使用 camelCase，動詞開頭，描述方法的功能

#### 3.3 變數命名
- **格式**: `camelCase`
- **示例**: `moduleManager`, `performanceMetrics`, `dependencyGraph`
- **說明**: 使用 camelCase，名詞開頭，描述變數的內容

#### 3.4 常量命名
- **格式**: `UPPER_SNAKE_CASE`
- **示例**: `MAX_MODULES`, `DEFAULT_TIMEOUT`, `LOG_LEVELS`
- **說明**: 使用大寫字母和下劃線，描述常量的用途

## 目錄結構規範

### 1. 主要目錄結構

```
assets/js/
├── engines/                    # 核心引擎模組
│   ├── core/                  # 核心模組
│   │   ├── Logger.js
│   │   ├── AssignmentCache.js
│   │   ├── StateValidator.js
│   │   └── ConflictChecker.js
│   ├── functional/            # 功能模組
│   │   ├── SearchStrategies.js
│   │   ├── PruningOptimizer.js
│   │   ├── MultiStartSearcher.js
│   │   └── PerformanceMonitor.js
│   ├── coordinator/           # 協調模組
│   │   └── SeatAssignmentEngine.js
│   ├── independent/           # 獨立模組
│   │   └── ParallelProcessor.js
│   └── utils/                 # 工具模組
│       ├── ModuleManager.js
│       ├── TransactionalAssignment.js
│       ├── CycleDetector.js
│       └── AssignmentExplainer.js
├── tests/                     # 測試檔案
│   ├── unit/                  # 單元測試
│   ├── integration/           # 集成測試
│   └── performance/           # 性能測試
├── config/                    # 配置文件
│   ├── moduleManager.config.js
│   └── performance.config.js
└── docs/                      # 文檔檔案
    ├── api/                   # API 文檔
    ├── architecture/          # 架構文檔
    └── conventions/           # 規範文檔
```

### 2. 模組分類標準

#### 2.1 核心模組 (core/)
- **特徵**: 基礎功能，無依賴或依賴最少
- **示例**: Logger, AssignmentCache, StateValidator, ConflictChecker
- **職責**: 提供基礎服務和核心功能

#### 2.2 功能模組 (functional/)
- **特徵**: 特定功能實現，依賴核心模組
- **示例**: SearchStrategies, PruningOptimizer, MultiStartSearcher, PerformanceMonitor
- **職責**: 實現特定的業務功能

#### 2.3 協調模組 (coordinator/)
- **特徵**: 協調多個模組，依賴功能模組
- **示例**: SeatAssignmentEngine
- **職責**: 協調和管理其他模組的協作

#### 2.4 獨立模組 (independent/)
- **特徵**: 完全獨立，不依賴其他模組
- **示例**: ParallelProcessor
- **職責**: 提供獨立的功能服務

#### 2.5 工具模組 (utils/)
- **特徵**: 輔助功能，可選依賴
- **示例**: ModuleManager, TransactionalAssignment, CycleDetector, AssignmentExplainer
- **職責**: 提供工具和輔助功能

### 3. 檔案組織原則

#### 3.1 單一職責原則
- 每個檔案只負責一個主要功能
- 檔案大小控制在 500 行以內
- 類別和方法職責明確

#### 3.2 依賴最小化原則
- 減少模組間的相互依賴
- 使用依賴注入降低耦合
- 避免循環依賴

#### 3.3 可測試性原則
- 每個模組都有對應的測試檔案
- 測試檔案與源檔案保持相同的目錄結構
- 測試覆蓋率達到 95% 以上

#### 3.4 可維護性原則
- 清晰的命名規範
- 完整的文檔說明
- 統一的代碼風格

## 導入導出規範

### 1. 導入語法

#### 1.1 CommonJS 導入
```javascript
const { Logger } = require('./Logger.js');
const { SeatAssignmentEngine } = require('./SeatAssignmentEngine.js');
```

#### 1.2 ES6 模組導入（未來規劃）
```javascript
import { Logger } from './Logger.js';
import { SeatAssignmentEngine } from './SeatAssignmentEngine.js';
```

### 2. 導出語法

#### 2.1 CommonJS 導出
```javascript
module.exports = { Logger };
module.exports = { SeatAssignmentEngine };
```

#### 2.2 ES6 模組導出（未來規劃）
```javascript
export { Logger };
export { SeatAssignmentEngine };
```

### 3. 導入導出最佳實踐

#### 3.1 統一導出格式
- 使用解構賦值導入
- 使用命名導出
- 避免默認導出

#### 3.2 路徑規範
- 使用相對路徑
- 路徑以 `./` 開頭
- 明確指定 `.js` 擴展名

#### 3.3 導入順序
1. 第三方庫
2. 核心模組
3. 功能模組
4. 工具模組

## 文檔規範

### 1. JSDoc 註釋

#### 1.1 類別註釋
```javascript
/**
 * 座位分配引擎
 * 負責協調各個組件完成座位分配任務
 * 
 * @class SeatAssignmentEngine
 * @description 主要的座位分配協調器
 */
class SeatAssignmentEngine {
    // ...
}
```

#### 1.2 方法註釋
```javascript
/**
 * 解決座位分配問題
 * 
 * @param {Object} config - 配置對象
 * @param {Array} config.students - 學生列表
 * @param {Array} config.seats - 座位列表
 * @param {Array} config.conditions - 條件列表
 * @returns {Promise<Object>} 分配結果
 * @throws {Error} 當配置無效時拋出錯誤
 */
async solveAssignment(config) {
    // ...
}
```

#### 1.3 參數註釋
```javascript
/**
 * @param {string} name - 模組名稱
 * @param {Object} config - 模組配置
 * @param {string} config.path - 模組路徑
 * @param {Array} config.dependencies - 依賴列表
 * @param {number} config.priority - 優先級
 * @param {string} config.category - 分類
 */
```

### 2. README 文檔

#### 2.1 模組 README
每個模組都應該有 README.md 文件，包含：
- 模組功能描述
- 使用方法
- API 文檔
- 示例代碼
- 依賴關係

#### 2.2 項目 README
項目根目錄的 README.md 應該包含：
- 項目概述
- 安裝說明
- 使用方法
- 架構說明
- 開發指南

## 代碼風格規範

### 1. 縮進和格式
- 使用 4 個空格縮進
- 行尾不加分號
- 使用單引號
- 最大行長度 80 字符

### 2. 變數聲明
- 使用 `const` 和 `let`，避免 `var`
- 變數聲明在作用域頂部
- 使用有意義的變數名

### 3. 函數定義
- 使用箭頭函數或函數聲明
- 參數使用解構賦值
- 返回值明確

### 4. 錯誤處理
- 使用 try-catch 處理異步錯誤
- 拋出有意義的錯誤信息
- 記錄錯誤日誌

## 版本控制規範

### 1. 提交信息格式
```
type(scope): description

[optional body]

[optional footer]
```

#### 1.1 類型 (type)
- `feat`: 新功能
- `fix`: 修復錯誤
- `docs`: 文檔更新
- `style`: 代碼格式調整
- `refactor`: 重構
- `test`: 測試相關
- `chore`: 構建過程或輔助工具的變動

#### 1.2 範圍 (scope)
- `engine`: 引擎相關
- `module`: 模組相關
- `test`: 測試相關
- `docs`: 文檔相關

#### 1.3 示例
```
feat(engine): 添加模組管理器

- 實現模組依賴注入
- 添加模組生命週期管理
- 支持熱重載功能

Closes #123
```

### 2. 分支命名
- `feature/feature-name`: 功能分支
- `bugfix/bug-description`: 修復分支
- `hotfix/urgent-fix`: 緊急修復分支
- `release/version-number`: 發布分支
