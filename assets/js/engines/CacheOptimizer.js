/**
 * 緩存優化模組
 * 負責緩存的智能清理、預熱、壓縮等優化功能
 */

const { Logger } = require('./Logger.js');

class CacheOptimizer {
    constructor(options = {}) {
        this.logger = new Logger('CacheOptimizer');
        this.options = {
            maxCacheSize: options.maxCacheSize || 1000,
            cleanupThreshold: options.cleanupThreshold || 0.8,
            prewarmStrategy: options.prewarmStrategy || 'selective',
            compressionEnabled: options.compressionEnabled !== false,
            ...options
        };
    }

    /**
     * 智能清理策略
     */
    smartCleanup(conditionCache, seatScoreCache, specialSeatCache) {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分鐘

        // 清理過期的條件緩存
        for (const [key, value] of conditionCache.entries()) {
            if (value.timestamp && (now - value.timestamp) > maxAge) {
                conditionCache.delete(key);
            }
        }

        // 清理過期的座位評分緩存
        for (const [key, value] of seatScoreCache.entries()) {
            if ((now - value.timestamp) > maxAge) {
                seatScoreCache.delete(key);
            }
        }

        // 清理過期的特殊座位緩存
        for (const [key, value] of specialSeatCache.entries()) {
            if ((now - value.timestamp) > maxAge) {
                specialSeatCache.delete(key);
            }
        }

        // 如果緩存仍然過大，執行基本清理
        this.basicCleanup(conditionCache, seatScoreCache, specialSeatCache);
        
        this.logger.info('智能清理完成');
    }

    /**
     * 基本清理
     */
    basicCleanup(conditionCache, seatScoreCache, specialSeatCache) {
        const maxSize = this.options.maxCacheSize;
        
        if (conditionCache.size > maxSize * 0.8) {
            const entries = Array.from(conditionCache.entries());
            const toRemove = entries.slice(0, maxSize * 0.3);
            toRemove.forEach(([key]) => conditionCache.delete(key));
        }
    }

    /**
     * 緩存預熱
     */
    prewarmCache(students, seats, commonConditions, conditionCache) {
        // 預先計算一些常見的條件檢查結果
        for (const student of students) {
            for (const seat of seats) {
                // 預熱條件檢查緩存
                const tempAssignment = new Map();
                tempAssignment.set(student.id, seat);
                
                for (const condition of commonConditions) {
                    if (condition.students.includes(student.id)) {
                        const result = this.checkCondition(condition, tempAssignment);
                        const cacheKey = this.generateCacheKey(
                            student.id, 
                            seat, 
                            this.getAssignmentHash(tempAssignment)
                        );
                        
                        if (conditionCache.size < this.options.maxCacheSize) {
                            conditionCache.set(cacheKey, {
                                result,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        }
        
        this.logger.info('緩存預熱完成', { 
            studentCount: students.length, 
            seatCount: seats.length 
        });
    }

    /**
     * 預熱策略
     */
    prewarmStrategy(students, seats, conditions, conditionCache, options = {}) {
        const {
            strategy = 'selective', // 'selective', 'comprehensive', 'smart'
            maxItems = 100,
            priorityStudents = [],
            prioritySeats = []
        } = options;

        const prewarmStats = {
            strategy,
            prewarmedItems: 0,
            executionTime: 0,
            memoryUsage: 0
        };

        const startTime = Date.now();

        switch (strategy) {
            case 'selective':
                this.executeSelectivePrewarm(students, seats, conditions, maxItems, priorityStudents, prioritySeats, conditionCache);
                break;
            case 'comprehensive':
                this.executeComprehensivePrewarm(students, seats, conditions, maxItems, conditionCache);
                break;
            case 'smart':
                this.executeSmartPrewarm(students, seats, conditions, maxItems, conditionCache);
                break;
        }

        prewarmStats.executionTime = Date.now() - startTime;
        prewarmStats.prewarmedItems = conditionCache.size;
        prewarmStats.memoryUsage = this.estimateMemoryUsage(conditionCache);

        this.logger.info('預熱策略執行完成', prewarmStats);
        return prewarmStats;
    }

    /**
     * 執行選擇性預熱
     */
    executeSelectivePrewarm(students, seats, conditions, maxItems, priorityStudents, prioritySeats, conditionCache) {
        let prewarmedCount = 0;

        // 優先預熱高優先級學生和座位
        for (const studentId of priorityStudents) {
            if (prewarmedCount >= maxItems) break;
            
            for (const seat of prioritySeats) {
                if (prewarmedCount >= maxItems) break;
                
                const tempAssignment = new Map();
                tempAssignment.set(studentId, seat);
                
                for (const condition of conditions) {
                    if (condition.students.includes(studentId)) {
                        const result = this.checkCondition(condition, tempAssignment);
                        const cacheKey = this.generateCacheKey(
                            studentId, 
                            seat, 
                            this.getAssignmentHash(tempAssignment)
                        );
                        
                        if (conditionCache.size < this.options.maxCacheSize) {
                            conditionCache.set(cacheKey, {
                                result,
                                timestamp: Date.now(),
                                accessCount: 1,
                                priority: 'high'
                            });
                            prewarmedCount++;
                        }
                    }
                }
            }
        }
    }

    /**
     * 執行全面預熱
     */
    executeComprehensivePrewarm(students, seats, conditions, maxItems, conditionCache) {
        let prewarmedCount = 0;

        for (const student of students) {
            if (prewarmedCount >= maxItems) break;
            
            for (const seat of seats) {
                if (prewarmedCount >= maxItems) break;
                
                const tempAssignment = new Map();
                tempAssignment.set(student.id, seat);
                
                for (const condition of conditions) {
                    if (condition.students.includes(student.id)) {
                        const result = this.checkCondition(condition, tempAssignment);
                        const cacheKey = this.generateCacheKey(
                            student.id, 
                            seat, 
                            this.getAssignmentHash(tempAssignment)
                        );
                        
                        if (conditionCache.size < this.options.maxCacheSize) {
                            conditionCache.set(cacheKey, {
                                result,
                                timestamp: Date.now(),
                                accessCount: 1
                            });
                            prewarmedCount++;
                        }
                    }
                }
            }
        }
    }

    /**
     * 執行智能預熱
     */
    executeSmartPrewarm(students, seats, conditions, maxItems, conditionCache) {
        // 分析條件複雜度，優先預熱複雜條件
        const conditionComplexity = this.analyzeConditionComplexity(conditions);
        const sortedConditions = conditions.sort((a, b) => 
            conditionComplexity[b.type] - conditionComplexity[a.type]
        );

        let prewarmedCount = 0;

        for (const condition of sortedConditions) {
            if (prewarmedCount >= maxItems) break;
            
            for (const studentId of condition.students) {
                if (prewarmedCount >= maxItems) break;
                
                for (const seat of seats) {
                    if (prewarmedCount >= maxItems) break;
                    
                    const tempAssignment = new Map();
                    tempAssignment.set(studentId, seat);
                    
                    const result = this.checkCondition(condition, tempAssignment);
                    const cacheKey = this.generateCacheKey(
                        studentId, 
                        seat, 
                        this.getAssignmentHash(tempAssignment)
                    );
                    
                    if (conditionCache.size < this.options.maxCacheSize) {
                        conditionCache.set(cacheKey, {
                            result,
                            timestamp: Date.now(),
                            accessCount: 1,
                            complexity: conditionComplexity[condition.type]
                        });
                        prewarmedCount++;
                    }
                }
            }
        }
    }

    /**
     * 分析條件複雜度
     */
    analyzeConditionComplexity(conditions) {
        const complexity = {
            adjacent: 1,
            not_adjacent: 1,
            group_area: 2,
            assign_group: 2,
            adjacent_and_group: 3
        };

        return complexity;
    }

    /**
     * 緩存壓縮
     */
    compressCache(conditionCache, seatScoreCache, specialSeatCache) {
        // 合併相似的緩存項
        const compressedConditionCache = new Map();
        const compressedSeatScoreCache = new Map();
        const compressedSpecialSeatCache = new Map();

        // 壓縮條件緩存 - 合併相同結果的項
        const conditionGroups = new Map();
        for (const [key, value] of conditionCache.entries()) {
            const resultKey = JSON.stringify(value);
            if (!conditionGroups.has(resultKey)) {
                conditionGroups.set(resultKey, []);
            }
            conditionGroups.get(resultKey).push(key);
        }

        // 保留每個組的代表項
        for (const [resultKey, keys] of conditionGroups.entries()) {
            if (keys.length > 0) {
                const representativeKey = keys[0];
                compressedConditionCache.set(representativeKey, JSON.parse(resultKey));
            }
        }

        // 壓縮座位評分緩存
        for (const [key, value] of seatScoreCache.entries()) {
            compressedSeatScoreCache.set(key, value);
        }

        // 壓縮特殊座位緩存
        for (const [key, value] of specialSeatCache.entries()) {
            compressedSpecialSeatCache.set(key, value);
        }

        // 替換原有緩存
        conditionCache.clear();
        seatScoreCache.clear();
        specialSeatCache.clear();

        for (const [key, value] of compressedConditionCache.entries()) {
            conditionCache.set(key, value);
        }
        for (const [key, value] of compressedSeatScoreCache.entries()) {
            seatScoreCache.set(key, value);
        }
        for (const [key, value] of compressedSpecialSeatCache.entries()) {
            specialSeatCache.set(key, value);
        }

        this.logger.info('緩存壓縮完成', {
            originalConditionSize: compressedConditionCache.size,
            compressedConditionSize: conditionCache.size
        });
    }

    /**
     * 數據壓縮
     */
    compressData(data) {
        const compressionStats = {
            originalSize: 0,
            compressedSize: 0,
            compressionRatio: 0,
            compressionTime: 0
        };

        const startTime = Date.now();
        const originalData = JSON.stringify(data);
        compressionStats.originalSize = originalData.length;

        // 簡單的數據壓縮：移除不必要的空格和屬性
        const compressedData = JSON.stringify(data, (key, value) => {
            if (value === null || value === undefined) return undefined;
            if (typeof value === 'string' && value.trim() === '') return undefined;
            return value;
        });

        compressionStats.compressedSize = compressedData.length;
        compressionStats.compressionRatio = 1 - (compressionStats.compressedSize / compressionStats.originalSize);
        compressionStats.compressionTime = Date.now() - startTime;

        return {
            compressedData,
            stats: compressionStats
        };
    }

    /**
     * 數據解壓
     */
    decompressData(compressedData) {
        try {
            return JSON.parse(compressedData);
        } catch (error) {
            this.logger.error('數據解壓失敗', { error: error.message });
            return null;
        }
    }

    /**
     * 壓縮率優化
     */
    optimizeCompressionRatio(compressionStats) {
        const optimization = {
            currentRatio: compressionStats.compressionRatio,
            suggestedImprovements: [],
            targetRatio: 0.3
        };

        if (compressionStats.compressionRatio < 0.1) {
            optimization.suggestedImprovements.push('考慮使用更高效的壓縮算法');
        }
        if (compressionStats.compressionTime > 100) {
            optimization.suggestedImprovements.push('壓縮時間過長，考慮優化壓縮算法');
        }
        if (compressionStats.originalSize > 1000000) {
            optimization.suggestedImprovements.push('數據量過大，考慮分批壓縮');
        }

        return optimization;
    }

    /**
     * 壓縮性能監控
     */
    monitorCompressionPerformance() {
        const stats = {
            totalCompressions: 0,
            averageCompressionTime: 0,
            averageCompressionRatio: 0,
            totalCompressedSize: 0,
            totalOriginalSize: 0
        };

        // 這裡應該從實際的壓縮歷史中收集數據
        // 暫時返回模擬數據
        return stats;
    }

    /**
     * LRU清理策略
     */
    lruCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize = this.options.maxCacheSize * 0.8) {
        const cleanupStats = {
            removedItems: 0,
            freedMemory: 0,
            strategy: 'LRU'
        };

        // 為每個緩存添加時間戳
        const addTimestamps = (cache) => {
            for (const [key, value] of cache.entries()) {
                if (!value.timestamp) {
                    value.timestamp = Date.now();
                }
            }
        };

        addTimestamps(conditionCache);
        addTimestamps(seatScoreCache);
        addTimestamps(specialSeatCache);

        // 清理條件緩存
        if (conditionCache.size > targetSize * 0.6) {
            const sortedEntries = Array.from(conditionCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = conditionCache.size - Math.floor(targetSize * 0.6);
            for (let i = 0; i < itemsToRemove; i++) {
                conditionCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理座位評分緩存
        if (seatScoreCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(seatScoreCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = seatScoreCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                seatScoreCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理特殊座位緩存
        if (specialSeatCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(specialSeatCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = specialSeatCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                specialSeatCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        this.logger.info('LRU清理完成', cleanupStats);
        return cleanupStats;
    }

    /**
     * LFU清理策略
     */
    lfuCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize = this.options.maxCacheSize * 0.8) {
        const cleanupStats = {
            removedItems: 0,
            freedMemory: 0,
            strategy: 'LFU'
        };

        // 為每個緩存項添加訪問計數
        const addAccessCount = (cache) => {
            for (const [key, value] of cache.entries()) {
                if (!value.accessCount) {
                    value.accessCount = 1;
                }
            }
        };

        addAccessCount(conditionCache);
        addAccessCount(seatScoreCache);
        addAccessCount(specialSeatCache);

        // 清理條件緩存
        if (conditionCache.size > targetSize * 0.6) {
            const sortedEntries = Array.from(conditionCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = conditionCache.size - Math.floor(targetSize * 0.6);
            for (let i = 0; i < itemsToRemove; i++) {
                conditionCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理座位評分緩存
        if (seatScoreCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(seatScoreCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = seatScoreCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                seatScoreCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理特殊座位緩存
        if (specialSeatCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(specialSeatCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = specialSeatCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                specialSeatCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        this.logger.info('LFU清理完成', cleanupStats);
        return cleanupStats;
    }

    /**
     * 自適應清理策略
     */
    adaptiveCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize = this.options.maxCacheSize * 0.8) {
        const stats = this.getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache);
        const hitRate = stats.conditionCache.hitRate;

        // 根據命中率選擇清理策略
        if (hitRate > 0.8) {
            // 高命中率，使用保守的LRU策略
            return this.lruCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize * 0.9);
        } else if (hitRate > 0.5) {
            // 中等命中率，使用標準LRU策略
            return this.lruCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize);
        } else {
            // 低命中率，使用激進的LFU策略
            return this.lfuCleanup(conditionCache, seatScoreCache, specialSeatCache, targetSize * 0.7);
        }
    }

    /**
     * 清理策略選擇
     */
    selectCleanupStrategy(strategy = 'adaptive', targetSize = this.options.maxCacheSize * 0.8) {
        return {
            strategy,
            targetSize,
            description: this.getCleanupStrategyDescription(strategy)
        };
    }

    /**
     * 獲取清理策略描述
     */
    getCleanupStrategyDescription(strategy) {
        const descriptions = {
            lru: '最近最少使用策略，移除最久未訪問的緩存項',
            lfu: '最少使用策略，移除訪問次數最少的緩存項',
            adaptive: '自適應策略，根據命中率動態選擇清理策略'
        };
        return descriptions[strategy] || descriptions.adaptive;
    }

    /**
     * 估算記憶體使用量
     */
    estimateMemoryUsage(conditionCache) {
        let totalMemory = 0;

        // 估算條件緩存記憶體使用
        for (const [key, value] of conditionCache.entries()) {
            totalMemory += key.length * 2; // 字符串約2字節/字符
            totalMemory += JSON.stringify(value).length * 2;
        }

        return totalMemory;
    }

    /**
     * 獲取詳細緩存統計信息
     */
    getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache) {
        const totalHits = 0; // 這裡應該從實際的緩存統計中獲取
        const totalMisses = 0;
        
        return {
            conditionCache: {
                size: conditionCache.size,
                hits: totalHits,
                misses: totalMisses,
                hitRate: totalHits / (totalHits + totalMisses) || 0
            },
            seatScoreCache: {
                size: seatScoreCache.size
            },
            specialSeatCache: {
                size: specialSeatCache.size
            },
            totalSize: conditionCache.size + seatScoreCache.size + specialSeatCache.size,
            maxSize: this.options.maxCacheSize
        };
    }

    // 輔助方法
    generateCacheKey(studentId, seat, assignmentHash) {
        return `${studentId}-${seat.row}-${seat.col}-${assignmentHash}`;
    }

    getAssignmentHash(assignment) {
        const entries = Array.from(assignment.entries())
            .sort(([a], [b]) => a - b)
            .map(([student, seat]) => `${student}:${seat.row},${seat.col}`);
        return entries.join('|');
    }

    checkCondition(condition, assignment) {
        // 簡化的條件檢查邏輯，實際應該委託給 ConditionCache
        return true;
    }

    /**
     * 初始化優化器
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.logger.info('緩存優化器初始化完成', this.options);
    }

    /**
     * 清理資源
     */
    dispose() {
        this.logger.info('緩存優化器資源已清理');
    }
}

module.exports = { CacheOptimizer };
