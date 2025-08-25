/**
 * 分配緩存協調器
 * 整合條件緩存、緩存優化和緩存監控功能
 */

const { ConditionCache } = require('./ConditionCache.js');
const { CacheOptimizer } = require('./CacheOptimizer.js');
const { CacheMonitor } = require('./CacheMonitor.js');
const { Logger } = require('./Logger.js');

class AssignmentCache {
    constructor(options = {}) {
        this.logger = new Logger('AssignmentCache');
        this.options = {
            maxCacheSize: options.maxCacheSize || 1000,
            enableOptimization: options.enableOptimization !== false,
            enableMonitoring: options.enableMonitoring !== false,
            ...options
        };

        // 初始化子模組
        this.conditionCache = new ConditionCache(options);
        this.cacheOptimizer = new CacheOptimizer(options);
        this.cacheMonitor = new CacheMonitor(options);

        // 緩存統計
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * 初始化分配緩存
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        
        // 初始化子模組
        this.conditionCache.initialize(options);
        this.cacheOptimizer.initialize(options);
        this.cacheMonitor.initialize(options);

        this.logger.info('分配緩存初始化完成', this.options);
        return this;
    }

    /**
     * 檢查學生是否可以坐在指定座位（帶緩存）
     */
    canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
        return this.conditionCache.canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap);
    }

    /**
     * 緩存座位評分
     */
    cacheSeatScore(studentId, seat, score, assignmentHash) {
        this.conditionCache.cacheSeatScore(studentId, seat, score, assignmentHash);
    }

    /**
     * 獲取緩存的座位評分
     */
    getCachedSeatScore(studentId, seat, assignmentHash) {
        return this.conditionCache.getCachedSeatScore(studentId, seat, assignmentHash);
    }

    /**
     * 更新座位評分
     */
    updateSeatScore(studentId, seat, newScore, assignmentHash) {
        this.conditionCache.updateSeatScore(studentId, seat, newScore, assignmentHash);
    }

    /**
     * 緩存特殊座位判斷
     */
    cacheSpecialSeat(seat, isSpecial, reason = '') {
        this.conditionCache.cacheSpecialSeat(seat, isSpecial, reason);
    }

    /**
     * 獲取緩存的特殊座位信息
     */
    getCachedSpecialSeat(seat) {
        return this.conditionCache.getCachedSpecialSeat(seat);
    }

    /**
     * 獲取緩存數據
     * 
     * @param {string} key - 緩存鍵
     * @returns {*} 緩存的數據，如果不存在則返回 undefined
     */
    get(key) {
        // 嘗試從不同的緩存中獲取數據
        let value = this.conditionCache.get(key);
        if (value !== undefined) {
            this.cacheHits++;
            return value;
        }

        // 如果沒有找到，增加緩存未命中計數
        this.cacheMisses++;
        return undefined;
    }

    /**
     * 設置緩存數據
     * 
     * @param {string} key - 緩存鍵
     * @param {*} value - 要緩存的數據
     */
    set(key, value) {
        this.conditionCache.set(key, value);
    }

    /**
     * 智能清理緩存
     */
    smartCleanup() {
        if (this.options.enableOptimization) {
            this.cacheOptimizer.smartCleanup(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        } else {
            this.conditionCache.cleanup();
        }
    }

    /**
     * 緩存預熱
     */
    prewarmCache(students, seats, commonConditions) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.prewarmCache(
                students, 
                seats, 
                commonConditions, 
                this.conditionCache.conditionCache
            );
        }
    }

    /**
     * 預熱策略
     */
    prewarmStrategy(students, seats, conditions, options = {}) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.prewarmStrategy(
                students, 
                seats, 
                conditions, 
                this.conditionCache.conditionCache, 
                options
            );
        }
    }

    /**
     * 緩存壓縮
     */
    compressCache() {
        if (this.options.enableOptimization) {
            this.cacheOptimizer.compressCache(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        }
    }

    /**
     * LRU清理策略
     */
    lruCleanup(targetSize = this.options.maxCacheSize * 0.8) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.lruCleanup(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache,
                targetSize
            );
        }
    }

    /**
     * LFU清理策略
     */
    lfuCleanup(targetSize = this.options.maxCacheSize * 0.8) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.lfuCleanup(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache,
                targetSize
            );
        }
    }

    /**
     * 自適應清理策略
     */
    adaptiveCleanup(targetSize = this.options.maxCacheSize * 0.8) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.adaptiveCleanup(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache,
                targetSize
            );
        }
    }

    /**
     * 緩存命中率監控
     */
    monitorHitRate() {
        if (this.options.enableMonitoring) {
            return this.cacheMonitor.monitorHitRate(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        }
    }

    /**
     * 緩存大小監控
     */
    monitorCacheSize() {
        if (this.options.enableMonitoring) {
            return this.cacheMonitor.monitorCacheSize(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        }
    }

    /**
     * 緩存性能監控
     */
    monitorCachePerformance() {
        if (this.options.enableMonitoring) {
            return this.cacheMonitor.monitorCachePerformance(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        }
    }

    /**
     * 生成緩存報告
     */
    generateCacheReport() {
        if (this.options.enableMonitoring) {
            return this.cacheMonitor.generateCacheReport(
                this.conditionCache.conditionCache,
                this.conditionCache.seatScoreCache,
                this.conditionCache.specialSeatCache
            );
        }
    }

    /**
     * 獲取緩存統計信息
     */
    getCacheStats() {
        return this.conditionCache.getCacheStats();
    }

    /**
     * 獲取詳細緩存統計信息
     */
    getDetailedCacheStats() {
        return this.conditionCache.getDetailedCacheStats();
    }

    /**
     * 清理緩存
     */
    clear() {
        this.conditionCache.clear();
        this.logger.info('分配緩存已清理');
    }

    /**
     * 清理過期的緩存項
     */
    cleanup() {
        this.smartCleanup();
    }

    /**
     * 估算記憶體使用量
     */
    estimateMemoryUsage() {
        return this.conditionCache.estimateMemoryUsage();
    }

    /**
     * 生成緩存鍵
     */
    generateCacheKey(studentId, seat, assignmentHash) {
        return this.conditionCache.generateCacheKey(studentId, seat, assignmentHash);
    }

    /**
     * 獲取分配狀態的哈希值
     */
    getAssignmentHash(assignment) {
        return this.conditionCache.getAssignmentHash(assignment);
    }

    /**
     * 檢查條件是否滿足
     */
    checkCondition(condition, assignment) {
        return this.conditionCache.checkCondition(condition, assignment);
    }

    /**
     * 檢查相鄰條件
     */
    checkAdjacent(students, assignment) {
        return this.conditionCache.checkAdjacent(students, assignment);
    }

    /**
     * 檢查群組區域條件
     */
    checkGroupArea(students, assignment) {
        return this.conditionCache.checkGroupArea(students, assignment);
    }

    /**
     * 檢查不相鄰條件
     */
    checkNotAdjacent(students, assignment) {
        return this.conditionCache.checkNotAdjacent(students, assignment);
    }

    /**
     * 檢查指定群組條件
     */
    checkAssignGroup(students, groupName, assignment) {
        return this.conditionCache.checkAssignGroup(students, groupName, assignment);
    }

    /**
     * 檢查相鄰且同群組條件
     */
    checkAdjacentAndGroup(students, groupName, assignment) {
        return this.conditionCache.checkAdjacentAndGroup(students, groupName, assignment);
    }

    /**
     * 獲取相鄰座位
     */
    getNeighboringSeats(seat) {
        return this.conditionCache.getNeighboringSeats(seat);
    }

    /**
     * 數據壓縮
     */
    compressData(data) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.compressData(data);
        }
        return { compressedData: data, stats: { originalSize: 0, compressedSize: 0, compressionRatio: 0, compressionTime: 0 } };
    }

    /**
     * 數據解壓
     */
    decompressData(compressedData) {
        if (this.options.enableOptimization) {
            return this.cacheOptimizer.decompressData(compressedData);
        }
        return compressedData;
    }

    /**
     * 導出監控報告
     */
    exportReport(report, format = 'json') {
        if (this.options.enableMonitoring) {
            return this.cacheMonitor.exportReport(report, format);
        }
        return JSON.stringify(report, null, 2);
    }

    /**
     * 重置監控歷史
     */
    resetMonitoringHistory() {
        if (this.options.enableMonitoring) {
            this.cacheMonitor.resetMonitoringHistory();
        }
    }

    /**
     * 清理資源
     */
    dispose() {
        this.conditionCache.dispose();
        this.cacheOptimizer.dispose();
        this.cacheMonitor.dispose();
        this.logger.info('分配緩存資源已清理');
    }
}

module.exports = { AssignmentCache };
