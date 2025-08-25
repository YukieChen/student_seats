/**
 * 剪枝優化器協調器
 * 整合早期終止檢查、無效路徑剪枝、重複狀態剪枝和對稱性剪枝功能
 */
const { EarlyTerminationChecker } = require('./EarlyTerminationChecker.js');
const { InvalidPathPruner } = require('./InvalidPathPruner.js');
const { DuplicateStatePruner } = require('./DuplicateStatePruner.js');
const { SymmetryPruner } = require('./SymmetryPruner.js');
const { Logger } = require('./Logger.js');

class PruningOptimizer {
    constructor(options = {}) {
        this.logger = new Logger('PruningOptimizer');
        this.options = {
            timeout: options.timeout || 30000,
            maxExecutionSteps: options.maxExecutionSteps || 1000000,
            ...options
        };

        // 性能指標
        this.performanceMetrics = {
            startTime: 0,
            executionSteps: 0
        };

        // 初始化子模組
        this.earlyTerminationChecker = new EarlyTerminationChecker(options);
        this.invalidPathPruner = new InvalidPathPruner(options);
        this.duplicateStatePruner = new DuplicateStatePruner(options);
        this.symmetryPruner = new SymmetryPruner(options);
    }

    /**
     * 設置性能指標
     * @param {Object} metrics 性能指標
     */
    setPerformanceMetrics(metrics) {
        this.performanceMetrics = metrics;
        this.earlyTerminationChecker.setPerformanceMetrics(metrics);
    }

    /**
     * 初始化剪枝優化器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.performanceMetrics.startTime = Date.now();
        this.performanceMetrics.executionSteps = 0;
        
        // 初始化子模組
        this.earlyTerminationChecker.initialize(options);
        this.invalidPathPruner.initialize(options);
        this.duplicateStatePruner.initialize(options);
        this.symmetryPruner.initialize(options);
        
        this.logger.info('剪枝優化器初始化完成', {
            timeout: this.options.timeout,
            maxExecutionSteps: this.options.maxExecutionSteps
        });
    }

    /**
     * 早期終止檢查
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 終止檢查結果
     */
    earlyTermination(students, seats, conditions, currentState = {}) {
        return this.earlyTerminationChecker.earlyTermination(students, seats, conditions, currentState);
    }

    /**
     * 檢查無解情況
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 無解檢查結果
     */
    checkUnsolvableCase(students, seats, conditions) {
        return this.earlyTerminationChecker.checkUnsolvableCase(students, seats, conditions);
    }

    /**
     * 分析特殊座位需求
     * @param {Array} students 學生列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 特殊座位需求分析
     */
    analyzeSpecialSeatRequirements(students, conditions) {
        return this.earlyTerminationChecker.analyzeSpecialSeatRequirements(students, conditions);
    }

    /**
     * 檢查群組條件衝突
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 群組衝突檢查結果
     */
    checkGroupConditionConflicts(students, seats, conditions) {
        return this.earlyTerminationChecker.checkGroupConditionConflicts(students, seats, conditions);
    }

    /**
     * 檢查局部最優陷阱
     * @param {Object} currentState 當前狀態
     * @returns {Object} 局部最優檢查結果
     */
    checkLocalOptima(currentState) {
        return this.earlyTerminationChecker.checkLocalOptima(currentState);
    }

    /**
     * 檢查進度停滯
     * @param {Object} currentState 當前狀態
     * @returns {Object} 停滯檢查結果
     */
    checkProgressStagnation(currentState) {
        return this.earlyTerminationChecker.checkProgressStagnation(currentState);
    }

    /**
     * 無效路徑剪枝檢查
     * @param {Array} students 剩餘學生
     * @param {Array} seats 剩餘座位
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 剪枝檢查結果
     */
    pruneInvalidPaths(students, seats, conditions, currentState = {}, proposedAssignment = null) {
        return this.invalidPathPruner.pruneInvalidPaths(students, seats, conditions, currentState, proposedAssignment);
    }

    /**
     * 檢查提議分配是否會導致衝突
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkProposedConflict(students, seats, conditions, proposedAssignment) {
        return this.invalidPathPruner.checkProposedConflict(students, seats, conditions, proposedAssignment);
    }

    /**
     * 檢查相鄰條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkAdjacentConditionConflict(condition, proposedAssignment) {
        return this.invalidPathPruner.checkAdjacentConditionConflict(condition, proposedAssignment);
    }

    /**
     * 檢查群組條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkGroupConditionConflict(condition, proposedAssignment) {
        return this.invalidPathPruner.checkGroupConditionConflict(condition, proposedAssignment);
    }

    /**
     * 檢查資源不足
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 資源檢查結果
     */
    checkResourceInsufficiency(students, seats, conditions) {
        return this.invalidPathPruner.checkResourceInsufficiency(students, seats, conditions);
    }

    /**
     * 檢查約束違反
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 約束檢查結果
     */
    checkConstraintViolation(students, seats, conditions, currentState) {
        return this.invalidPathPruner.checkConstraintViolation(students, seats, conditions, currentState);
    }

    /**
     * 檢查無效模式
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 模式檢查結果
     */
    checkInvalidPattern(students, seats, conditions, currentState) {
        return this.invalidPathPruner.checkInvalidPattern(students, seats, conditions, currentState);
    }

    /**
     * 記錄無效路徑
     * @param {string} stateKey 狀態鍵
     * @param {Object} pruningResult 剪枝結果
     */
    recordInvalidPath(stateKey, pruningResult) {
        this.invalidPathPruner.recordInvalidPath(stateKey, pruningResult);
    }

    /**
     * 生成狀態鍵
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @returns {string} 狀態鍵
     */
    generateStateKey(students, seats, currentState) {
        return this.invalidPathPruner.generateStateKey(students, seats, currentState);
    }

    /**
     * 生成狀態模式
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 狀態模式
     */
    generateStatePattern(students, seats, currentState) {
        return this.invalidPathPruner.generateStatePattern(students, seats, currentState);
    }

    /**
     * 檢查模式匹配
     * @param {Object} statePattern 狀態模式
     * @param {Object} pattern 模式
     * @returns {boolean} 是否匹配
     */
    matchesPattern(statePattern, pattern) {
        return this.invalidPathPruner.matchesPattern(statePattern, pattern);
    }

    /**
     * 檢查座位是否相鄰
     * @param {Object} seat1 座位1
     * @param {Object} seat2 座位2
     * @returns {boolean} 是否相鄰
     */
    areSeatsAdjacent(seat1, seat2) {
        return this.invalidPathPruner.areSeatsAdjacent(seat1, seat2);
    }

    /**
     * 檢查群組相鄰性
     * @param {Array} assignedSeats 已分配座位
     * @returns {boolean} 是否相鄰
     */
    checkGroupAdjacency(assignedSeats) {
        return this.invalidPathPruner.checkGroupAdjacency(assignedSeats);
    }

    /**
     * 重複狀態剪枝檢查
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 剪枝檢查結果
     */
    pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment) {
        return this.duplicateStatePruner.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
    }

    /**
     * 生成標準化狀態鍵
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {string} 標準化狀態鍵
     */
    generateNormalizedStateKey(students, seats, currentState, currentAssignment) {
        return this.duplicateStatePruner.generateNormalizedStateKey(students, seats, currentState, currentAssignment);
    }

    /**
     * 檢查狀態歷史重複
     * @param {string} stateKey 狀態鍵
     * @returns {boolean} 是否重複
     */
    checkStateHistoryDuplicate(stateKey) {
        return this.duplicateStatePruner.checkStateHistoryDuplicate(stateKey);
    }

    /**
     * 檢查等價狀態
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否等價
     */
    checkEquivalentState(students, seats, currentState, currentAssignment) {
        return this.duplicateStatePruner.checkEquivalentState(students, seats, currentState, currentAssignment);
    }

    /**
     * 生成學生排列
     * @param {Array} students 學生列表
     * @returns {Array} 排列列表
     */
    generateStudentPermutations(students) {
        return this.duplicateStatePruner.generateStudentPermutations(students);
    }

    /**
     * 為排列生成狀態鍵
     * @param {Array} permutedStudents 排列後的學生
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {string} 狀態鍵
     */
    generateStateKeyForPermutation(permutedStudents, seats, currentState, currentAssignment) {
        return this.duplicateStatePruner.generateStateKeyForPermutation(permutedStudents, seats, currentState, currentAssignment);
    }

    /**
     * 標準化狀態信息
     * @param {Array|Object} students 學生列表或狀態物件
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 標準化狀態信息
     */
    normalizeStateInfo(students, seats, currentState, currentAssignment) {
        return this.duplicateStatePruner.normalizeStateInfo(students, seats, currentState, currentAssignment);
    }

    /**
     * 檢查對稱狀態
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 對稱檢查結果
     */
    checkSymmetricState(students, seats, currentState, currentAssignment) {
        return this.symmetryPruner.checkSymmetricState(students, seats, currentState, currentAssignment);
    }

    /**
     * 檢查水平對稱
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否水平對稱
     */
    checkHorizontalSymmetry(students, seats, currentState, currentAssignment) {
        return this.symmetryPruner.checkHorizontalSymmetry(students, seats, currentState, currentAssignment);
    }

    /**
     * 檢查垂直對稱
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否垂直對稱
     */
    checkVerticalSymmetry(students, seats, currentState, currentAssignment) {
        return this.symmetryPruner.checkVerticalSymmetry(students, seats, currentState, currentAssignment);
    }

    /**
     * 檢查循環狀態
     * @returns {boolean} 是否循環
     */
    checkCycleState() {
        return this.duplicateStatePruner.checkCycleState();
    }

    /**
     * 記錄當前狀態
     * @param {string} stateKey 狀態鍵
     */
    recordCurrentState(stateKey) {
        this.duplicateStatePruner.recordCurrentState(stateKey);
    }

    /**
     * 對稱性剪枝
     * @param {Array} candidates 候選列表
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 分配狀態
     * @returns {Array} 剪枝後的候選列表
     */
    pruneSymmetries(candidates, currentState, assignment) {
        return this.symmetryPruner.pruneSymmetries(candidates, currentState, assignment);
    }

    /**
     * 生成對稱性鍵值
     * @param {Object} candidate 候選
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 分配狀態
     * @returns {string} 對稱性鍵值
     */
    generateSymmetryKey(candidate, currentState, assignment) {
        return this.symmetryPruner.generateSymmetryKey(candidate, currentState, assignment);
    }

    /**
     * 計算相對位置
     * @param {Object} candidate 候選
     * @param {Map} assignment 分配狀態
     * @returns {Object} 相對位置
     */
    calculateRelativePosition(candidate, assignment) {
        return this.symmetryPruner.calculateRelativePosition(candidate, assignment);
    }

    /**
     * 獲取剪枝統計信息
     * @returns {Object} 統計信息
     */
    getPruningStats() {
        const invalidPathStats = this.invalidPathPruner.getPruningStats();
        const duplicateStateStats = this.duplicateStatePruner.getDuplicatePruningStats();
        
        return {
            invalidPaths: invalidPathStats,
            duplicateStates: duplicateStateStats,
            totalPruned: invalidPathStats.prunedPaths + duplicateStateStats.prunedDuplicates,
            cacheEfficiency: {
                invalidPaths: invalidPathStats.cacheHits / Math.max(invalidPathStats.totalChecks, 1),
                duplicateStates: duplicateStateStats.cacheHits / Math.max(duplicateStateStats.totalChecks, 1)
            }
        };
    }

    /**
     * 清理緩存
     */
    clearCache() {
        this.invalidPathPruner.clearCache();
        this.duplicateStatePruner.clearCache();
        this.logger.info('剪枝優化器緩存已清理');
    }

    /**
     * 銷毀剪枝優化器
     */
    dispose() {
        this.earlyTerminationChecker.dispose();
        this.invalidPathPruner.dispose();
        this.duplicateStatePruner.dispose();
        this.symmetryPruner.dispose();
        this.logger.info('剪枝優化器銷毀完成');
    }
}

module.exports = { PruningOptimizer };
