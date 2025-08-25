// AssignmentCache.js - 結果緩存系統
class AssignmentCache {
    constructor(options = {}) {
        this.conditionCache = new Map();
        this.specialSeatCache = new Map();
        this.seatScoreCache = new Map();
        this.maxCacheSize = options.maxCacheSize || 1000;
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * 生成緩存鍵
     */
    generateCacheKey(studentId, seat, assignmentHash) {
        return `${studentId}-${seat.row}-${seat.col}-${assignmentHash}`;
    }

    /**
     * 獲取分配狀態的哈希值
     */
    getAssignmentHash(assignment) {
        const entries = Array.from(assignment.entries())
            .sort(([a], [b]) => a - b)
            .map(([student, seat]) => `${student}:${seat.row},${seat.col}`);
        return entries.join('|');
    }

    /**
     * 檢查學生是否可以坐在指定座位（帶緩存）
     */
    canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
        const cacheKey = this.generateCacheKey(
            studentId, 
            seat, 
            this.getAssignmentHash(currentAssignment)
        );

        if (this.conditionCache.has(cacheKey)) {
            this.cacheHits++;
            return this.conditionCache.get(cacheKey);
        }

        this.cacheMisses++;
        const result = this.computeCanStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap);
        
        // 緩存結果
        if (this.conditionCache.size < this.maxCacheSize) {
            this.conditionCache.set(cacheKey, result);
        }

        return result;
    }

    /**
     * 實際計算學生是否可以坐在指定座位
     */
    computeCanStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
        const tempAssignment = new Map(currentAssignment);
        tempAssignment.set(studentId, seat);

        const studentConditions = studentToConditionsMap.get(studentId) || [];
        
        for (const condition of studentConditions) {
            if (!this.checkCondition(condition, tempAssignment)) {
                return false;
            }
        }

        return true;
    }

    /**
     * 檢查條件是否滿足
     */
    checkCondition(condition, assignment) {
        switch (condition.type) {
            case 'adjacent':
                return this.checkAdjacent(condition.students, assignment);
            case 'group_area':
                return this.checkGroupArea(condition.students[0], assignment);
            case 'not_adjacent':
                return this.checkNotAdjacent(condition.students, assignment);
            case 'assign_group':
                return this.checkAssignGroup(condition.students, condition.group, assignment);
            case 'adjacent_and_group':
                return this.checkAdjacentAndGroup(condition.students, condition.group, assignment);
            default:
                return true;
        }
    }

    /**
     * 檢查相鄰條件
     */
    checkAdjacent(students, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const rowDiff = Math.abs(seatA.row - seatB.row);
            const colDiff = Math.abs(seatA.col - seatB.col);
            return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
        });
    }

    /**
     * 檢查群組區域條件
     */
    checkGroupArea(students, assignment) {
        const assignedSeats = students
            .map(studentId => assignment.get(studentId))
            .filter(seat => seat !== undefined);

        if (assignedSeats.length === 0) return true;

        // 使用BFS檢查連通性
        const visited = new Set();
        const queue = [assignedSeats[0]];
        visited.add(`${assignedSeats[0].row}-${assignedSeats[0].col}`);

        let head = 0;
        while (head < queue.length) {
            const currentSeat = queue[head++];
            const neighbors = this.getNeighboringSeats(currentSeat);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.row}-${neighbor.col}`;
                const isNeighborInGroup = assignedSeats.some(s => 
                    s.row === neighbor.row && s.col === neighbor.col
                );

                if (isNeighborInGroup && !visited.has(neighborKey)) {
                    visited.add(neighborKey);
                    queue.push(neighbor);
                }
            }
        }

        return visited.size === assignedSeats.length;
    }

    /**
     * 檢查不相鄰條件
     */
    checkNotAdjacent(students, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const rowDiff = Math.abs(seatA.row - seatB.row);
            const colDiff = Math.abs(seatA.col - seatB.col);
            return !(rowDiff <= 1 && colDiff <= 1);
        });
    }

    /**
     * 檢查指定群組條件
     */
    checkAssignGroup(students, groupName, assignment) {
        return students.every(s => {
            const seat = assignment.get(s[0]);
            if (!seat) return true;
            return seat.groupId === groupName;
        });
    }

    /**
     * 檢查相鄰且同群組條件
     */
    checkAdjacentAndGroup(students, groupName, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const isAdjacent = seatA.row === seatB.row && 
                (seatA.col === seatB.col - 1 || seatA.col === seatB.col + 1);
            const isInGroup = seatA.groupId === groupName && seatB.groupId === groupName;
            
            return isAdjacent && isInGroup;
        });
    }

    /**
     * 獲取相鄰座位
     */
    getNeighboringSeats(seat) {
        const neighbors = [];
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                
                const nRow = seat.row + dRow;
                const nCol = seat.col + dCol;
                
                // 假設座位範圍是 0-8
                if (nRow >= 0 && nRow < 9 && nCol >= 0 && nCol < 9) {
                    neighbors.push({ row: nRow, col: nCol });
                }
            }
        }
        return neighbors;
    }

    /**
     * 獲取緩存統計信息
     */
    getCacheStats() {
        return {
            hits: this.cacheHits,
            misses: this.cacheMisses,
            hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses),
            size: this.conditionCache.size
        };
    }

    /**
     * 清理緩存
     */
    clear() {
        this.conditionCache.clear();
        this.specialSeatCache.clear();
        this.seatScoreCache.clear();
        this.cacheHits = 0;
        this.cacheMisses = 0;
    }

    /**
     * 清理過期的緩存項
     */
    cleanup() {
        if (this.conditionCache.size > this.maxCacheSize * 0.8) {
            const entries = Array.from(this.conditionCache.entries());
            const toRemove = entries.slice(0, this.maxCacheSize * 0.3);
            toRemove.forEach(([key]) => this.conditionCache.delete(key));
        }
    }

    // ==================== 座位評分緩存 ====================

    /**
     * 緩存座位評分
     */
    cacheSeatScore(studentId, seat, score, assignmentHash) {
        const cacheKey = `score-${studentId}-${seat.row}-${seat.col}-${assignmentHash}`;
        
        if (this.seatScoreCache.size < this.maxCacheSize) {
            this.seatScoreCache.set(cacheKey, {
                score,
                timestamp: Date.now(),
                assignmentHash
            });
        }
    }

    /**
     * 獲取緩存的座位評分
     */
    getCachedSeatScore(studentId, seat, assignmentHash) {
        const cacheKey = `score-${studentId}-${seat.row}-${seat.col}-${assignmentHash}`;
        const cached = this.seatScoreCache.get(cacheKey);
        
        if (cached && cached.assignmentHash === assignmentHash) {
            this.cacheHits++;
            return cached.score;
        }
        
        this.cacheMisses++;
        return null;
    }

    /**
     * 更新座位評分
     */
    updateSeatScore(studentId, seat, newScore, assignmentHash) {
        const cacheKey = `score-${studentId}-${seat.row}-${seat.col}-${assignmentHash}`;
        const existing = this.seatScoreCache.get(cacheKey);
        
        if (existing) {
            existing.score = newScore;
            existing.timestamp = Date.now();
        } else {
            this.cacheSeatScore(studentId, seat, newScore, assignmentHash);
        }
    }

    // ==================== 特殊座位緩存 ====================

    /**
     * 緩存特殊座位判斷
     */
    cacheSpecialSeat(seat, isSpecial, reason = '') {
        const cacheKey = `special-${seat.row}-${seat.col}`;
        
        if (this.specialSeatCache.size < this.maxCacheSize) {
            this.specialSeatCache.set(cacheKey, {
                isSpecial,
                reason,
                timestamp: Date.now()
            });
        }
    }

    /**
     * 獲取緩存的特殊座位信息
     */
    getCachedSpecialSeat(seat) {
        const cacheKey = `special-${seat.row}-${seat.col}`;
        const cached = this.specialSeatCache.get(cacheKey);
        
        if (cached) {
            this.cacheHits++;
            return cached;
        }
        
        this.cacheMisses++;
        return null;
    }

    // ==================== 緩存優化 ====================

    /**
     * 智能清理策略
     */
    smartCleanup() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5分鐘

        // 清理過期的條件緩存
        for (const [key, value] of this.conditionCache.entries()) {
            if (value.timestamp && (now - value.timestamp) > maxAge) {
                this.conditionCache.delete(key);
            }
        }

        // 清理過期的座位評分緩存
        for (const [key, value] of this.seatScoreCache.entries()) {
            if ((now - value.timestamp) > maxAge) {
                this.seatScoreCache.delete(key);
            }
        }

        // 清理過期的特殊座位緩存
        for (const [key, value] of this.specialSeatCache.entries()) {
            if ((now - value.timestamp) > maxAge) {
                this.specialSeatCache.delete(key);
            }
        }

        // 如果緩存仍然過大，執行基本清理
        this.cleanup();
    }

    /**
     * 緩存預熱
     */
    prewarmCache(students, seats, commonConditions) {
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
                        
                        if (this.conditionCache.size < this.maxCacheSize) {
                            this.conditionCache.set(cacheKey, {
                                result,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 緩存壓縮
     */
    compressCache() {
        // 合併相似的緩存項
        const compressedConditionCache = new Map();
        const compressedSeatScoreCache = new Map();
        const compressedSpecialSeatCache = new Map();

        // 壓縮條件緩存 - 合併相同結果的項
        const conditionGroups = new Map();
        for (const [key, value] of this.conditionCache.entries()) {
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
        for (const [key, value] of this.seatScoreCache.entries()) {
            compressedSeatScoreCache.set(key, value);
        }

        // 壓縮特殊座位緩存
        for (const [key, value] of this.specialSeatCache.entries()) {
            compressedSpecialSeatCache.set(key, value);
        }

        // 替換原有緩存
        this.conditionCache = compressedConditionCache;
        this.seatScoreCache = compressedSeatScoreCache;
        this.specialSeatCache = compressedSpecialSeatCache;
    }

    // ==================== 緩存優化功能 ====================

    /**
     * LRU清理策略
     * @param {number} targetSize 目標緩存大小
     */
    lruCleanup(targetSize = this.maxCacheSize * 0.8) {
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

        addTimestamps(this.conditionCache);
        addTimestamps(this.seatScoreCache);
        addTimestamps(this.specialSeatCache);

        // 清理條件緩存
        if (this.conditionCache.size > targetSize * 0.6) {
            const sortedEntries = Array.from(this.conditionCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = this.conditionCache.size - Math.floor(targetSize * 0.6);
            for (let i = 0; i < itemsToRemove; i++) {
                this.conditionCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理座位評分緩存
        if (this.seatScoreCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(this.seatScoreCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = this.seatScoreCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                this.seatScoreCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理特殊座位緩存
        if (this.specialSeatCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(this.specialSeatCache.entries())
                .sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            const itemsToRemove = this.specialSeatCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                this.specialSeatCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        return cleanupStats;
    }

    /**
     * LFU清理策略
     * @param {number} targetSize 目標緩存大小
     */
    lfuCleanup(targetSize = this.maxCacheSize * 0.8) {
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

        addAccessCount(this.conditionCache);
        addAccessCount(this.seatScoreCache);
        addAccessCount(this.specialSeatCache);

        // 清理條件緩存
        if (this.conditionCache.size > targetSize * 0.6) {
            const sortedEntries = Array.from(this.conditionCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = this.conditionCache.size - Math.floor(targetSize * 0.6);
            for (let i = 0; i < itemsToRemove; i++) {
                this.conditionCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理座位評分緩存
        if (this.seatScoreCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(this.seatScoreCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = this.seatScoreCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                this.seatScoreCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        // 清理特殊座位緩存
        if (this.specialSeatCache.size > targetSize * 0.2) {
            const sortedEntries = Array.from(this.specialSeatCache.entries())
                .sort((a, b) => a[1].accessCount - b[1].accessCount);
            
            const itemsToRemove = this.specialSeatCache.size - Math.floor(targetSize * 0.2);
            for (let i = 0; i < itemsToRemove; i++) {
                this.specialSeatCache.delete(sortedEntries[i][0]);
                cleanupStats.removedItems++;
            }
        }

        return cleanupStats;
    }

    /**
     * 自適應清理策略
     * @param {number} targetSize 目標緩存大小
     */
    adaptiveCleanup(targetSize = this.maxCacheSize * 0.8) {
        const stats = this.getDetailedCacheStats();
        const hitRate = stats.conditionCache.hitRate;

        // 根據命中率選擇清理策略
        if (hitRate > 0.8) {
            // 高命中率，使用保守的LRU策略
            return this.lruCleanup(targetSize * 0.9);
        } else if (hitRate > 0.5) {
            // 中等命中率，使用標準LRU策略
            return this.lruCleanup(targetSize);
        } else {
            // 低命中率，使用激進的LFU策略
            return this.lfuCleanup(targetSize * 0.7);
        }
    }

    /**
     * 清理策略選擇
     * @param {string} strategy 清理策略
     * @param {number} targetSize 目標緩存大小
     */
    selectCleanupStrategy(strategy = 'adaptive', targetSize = this.maxCacheSize * 0.8) {
        switch (strategy) {
            case 'lru':
                return this.lruCleanup(targetSize);
            case 'lfu':
                return this.lfuCleanup(targetSize);
            case 'adaptive':
            default:
                return this.adaptiveCleanup(targetSize);
        }
    }

    /**
     * 預熱策略
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} options 預熱選項
     */
    prewarmStrategy(students, seats, conditions, options = {}) {
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
                this.executeSelectivePrewarm(students, seats, conditions, maxItems, priorityStudents, prioritySeats);
                break;
            case 'comprehensive':
                this.executeComprehensivePrewarm(students, seats, conditions, maxItems);
                break;
            case 'smart':
                this.executeSmartPrewarm(students, seats, conditions, maxItems);
                break;
        }

        prewarmStats.executionTime = Date.now() - startTime;
        prewarmStats.prewarmedItems = this.conditionCache.size;
        prewarmStats.memoryUsage = this.estimateMemoryUsage();

        return prewarmStats;
    }

    /**
     * 執行選擇性預熱
     */
    executeSelectivePrewarm(students, seats, conditions, maxItems, priorityStudents, prioritySeats) {
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
                        
                        if (this.conditionCache.size < this.maxCacheSize) {
                            this.conditionCache.set(cacheKey, {
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
    executeComprehensivePrewarm(students, seats, conditions, maxItems) {
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
                        
                        if (this.conditionCache.size < this.maxCacheSize) {
                            this.conditionCache.set(cacheKey, {
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
    executeSmartPrewarm(students, seats, conditions, maxItems) {
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
                    
                    if (this.conditionCache.size < this.maxCacheSize) {
                        this.conditionCache.set(cacheKey, {
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
     * 預熱執行
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} options 預熱選項
     */
    executePrewarm(students, seats, conditions, options = {}) {
        return this.prewarmStrategy(students, seats, conditions, options);
    }

    /**
     * 預熱效果評估
     * @param {Object} prewarmStats 預熱統計
     * @returns {Object} 效果評估結果
     */
    evaluatePrewarmEffect(prewarmStats) {
        const currentStats = this.getDetailedCacheStats();
        const effect = {
            hitRateImprovement: 0,
            performanceGain: 0,
            memoryEfficiency: 0,
            recommendations: []
        };

        // 計算命中率改善
        const baselineHitRate = 0.5; // 假設基準命中率
        effect.hitRateImprovement = currentStats.conditionCache.hitRate - baselineHitRate;

        // 計算性能增益
        effect.performanceGain = prewarmStats.prewarmedItems * 0.1; // 每項預熱項目節省0.1ms

        // 計算記憶體效率
        effect.memoryEfficiency = prewarmStats.prewarmedItems / prewarmStats.memoryUsage;

        // 生成建議
        if (effect.hitRateImprovement < 0.1) {
            effect.recommendations.push('考慮調整預熱策略以提高命中率');
        }
        if (effect.memoryEfficiency < 0.5) {
            effect.recommendations.push('考慮優化預熱項目的記憶體使用');
        }
        if (prewarmStats.executionTime > 1000) {
            effect.recommendations.push('預熱時間過長，考慮減少預熱項目數量');
        }

        return effect;
    }

    /**
     * 預熱優化
     * @param {Object} prewarmStats 預熱統計
     * @param {Object} effect 效果評估
     * @returns {Object} 優化建議
     */
    optimizePrewarm(prewarmStats, effect) {
        const optimization = {
            suggestedStrategy: prewarmStats.strategy,
            suggestedMaxItems: prewarmStats.prewarmedItems,
            priorityAdjustments: [],
            performancePredictions: {}
        };

        // 根據效果調整策略
        if (effect.hitRateImprovement < 0.1) {
            if (prewarmStats.strategy === 'selective') {
                optimization.suggestedStrategy = 'smart';
            } else if (prewarmStats.strategy === 'smart') {
                optimization.suggestedStrategy = 'comprehensive';
            }
        }

        // 調整最大項目數
        if (effect.memoryEfficiency < 0.5) {
            optimization.suggestedMaxItems = Math.floor(prewarmStats.prewarmedItems * 0.8);
        } else if (effect.hitRateImprovement > 0.2) {
            optimization.suggestedMaxItems = Math.floor(prewarmStats.prewarmedItems * 1.2);
        }

        // 性能預測
        optimization.performancePredictions = {
            estimatedHitRate: Math.min(1, effect.hitRateImprovement + 0.1),
            estimatedMemoryUsage: optimization.suggestedMaxItems * 0.1,
            estimatedExecutionTime: prewarmStats.executionTime * (optimization.suggestedMaxItems / prewarmStats.prewarmedItems)
        };

        return optimization;
    }

    /**
     * 數據壓縮
     * @param {any} data 要壓縮的數據
     * @returns {Object} 壓縮結果
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
     * @param {string} compressedData 壓縮的數據
     * @returns {any} 解壓後的數據
     */
    decompressData(compressedData) {
        try {
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('數據解壓失敗:', error);
            return null;
        }
    }

    /**
     * 壓縮率優化
     * @param {Object} compressionStats 壓縮統計
     * @returns {Object} 優化建議
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
     * @returns {Object} 監控結果
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
     * 緩存命中率監控
     * @returns {Object} 命中率監控結果
     */
    monitorHitRate() {
        const stats = this.getDetailedCacheStats();
        const hitRate = stats.conditionCache.hitRate;

        return {
            currentHitRate: hitRate,
            hitRateTrend: this.calculateHitRateTrend(),
            targetHitRate: 0.8,
            performance: {
                excellent: hitRate >= 0.8,
                good: hitRate >= 0.6 && hitRate < 0.8,
                poor: hitRate < 0.6
            },
            recommendations: this.generateHitRateRecommendations(hitRate)
        };
    }

    /**
     * 計算命中率趨勢
     */
    calculateHitRateTrend() {
        // 這裡應該基於歷史數據計算趨勢
        // 暫時返回穩定趨勢
        return 'stable';
    }

    /**
     * 生成命中率建議
     */
    generateHitRateRecommendations(hitRate) {
        const recommendations = [];

        if (hitRate < 0.5) {
            recommendations.push('命中率過低，建議增加緩存大小');
            recommendations.push('考慮優化緩存鍵生成策略');
        } else if (hitRate < 0.7) {
            recommendations.push('命中率中等，建議調整緩存清理策略');
        } else if (hitRate >= 0.8) {
            recommendations.push('命中率良好，可以考慮減少緩存大小以節省記憶體');
        }

        return recommendations;
    }

    /**
     * 緩存大小監控
     * @returns {Object} 大小監控結果
     */
    monitorCacheSize() {
        const stats = this.getDetailedCacheStats();
        const utilization = stats.totalSize / stats.maxSize;

        return {
            currentSize: stats.totalSize,
            maxSize: stats.maxSize,
            utilization: utilization,
            performance: {
                optimal: utilization >= 0.7 && utilization <= 0.9,
                underutilized: utilization < 0.7,
                overutilized: utilization > 0.9
            },
            recommendations: this.generateSizeRecommendations(utilization)
        };
    }

    /**
     * 生成大小建議
     */
    generateSizeRecommendations(utilization) {
        const recommendations = [];

        if (utilization < 0.5) {
            recommendations.push('緩存利用率過低，可以考慮減少緩存大小');
        } else if (utilization > 0.95) {
            recommendations.push('緩存接近滿載，建議增加緩存大小或調整清理策略');
        }

        return recommendations;
    }

    /**
     * 緩存性能監控
     * @returns {Object} 性能監控結果
     */
    monitorCachePerformance() {
        const hitRate = this.monitorHitRate();
        const size = this.monitorCacheSize();
        const compression = this.monitorCompressionPerformance();

        return {
            hitRate,
            size,
            compression,
            overallPerformance: this.calculateOverallPerformance(hitRate, size, compression),
            alerts: this.generatePerformanceAlerts(hitRate, size, compression)
        };
    }

    /**
     * 計算整體性能
     */
    calculateOverallPerformance(hitRate, size, compression) {
        let score = 0;

        // 命中率權重 50%
        if (hitRate.currentHitRate >= 0.8) score += 50;
        else if (hitRate.currentHitRate >= 0.6) score += 30;
        else score += 10;

        // 大小利用率權重 30%
        if (size.utilization >= 0.7 && size.utilization <= 0.9) score += 30;
        else if (size.utilization >= 0.5 && size.utilization <= 0.95) score += 20;
        else score += 10;

        // 壓縮效率權重 20%
        if (compression.averageCompressionRatio >= 0.3) score += 20;
        else if (compression.averageCompressionRatio >= 0.1) score += 10;
        else score += 5;

        return {
            score,
            grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D'
        };
    }

    /**
     * 生成性能警報
     */
    generatePerformanceAlerts(hitRate, size, compression) {
        const alerts = [];

        if (hitRate.currentHitRate < 0.5) {
            alerts.push({
                level: 'critical',
                message: '緩存命中率過低，嚴重影響性能',
                action: '立即檢查緩存策略'
            });
        }

        if (size.utilization > 0.95) {
            alerts.push({
                level: 'warning',
                message: '緩存接近滿載',
                action: '考慮增加緩存大小或清理策略'
            });
        }

        return alerts;
    }

    /**
     * 緩存報告
     * @returns {Object} 完整的緩存報告
     */
    generateCacheReport() {
        const performance = this.monitorCachePerformance();
        const detailedStats = this.getDetailedCacheStats();

        return {
            timestamp: new Date().toISOString(),
            summary: {
                totalItems: detailedStats.totalSize,
                hitRate: detailedStats.conditionCache.hitRate,
                performanceGrade: performance.overallPerformance.grade,
                alerts: performance.alerts.length
            },
            performance,
            detailedStats,
            recommendations: this.generateOverallRecommendations(performance, detailedStats)
        };
    }

    /**
     * 生成整體建議
     */
    generateOverallRecommendations(performance, detailedStats) {
        const recommendations = [];

        // 基於命中率的建議
        recommendations.push(...performance.hitRate.recommendations);

        // 基於大小的建議
        recommendations.push(...performance.size.recommendations);

        // 基於整體性能的建議
        if (performance.overallPerformance.score < 60) {
            recommendations.push('整體性能較差，建議全面優化緩存策略');
        }

        return recommendations;
    }

    /**
     * 估算記憶體使用量
     */
    estimateMemoryUsage() {
        let totalMemory = 0;

        // 估算條件緩存記憶體使用
        for (const [key, value] of this.conditionCache.entries()) {
            totalMemory += key.length * 2; // 字符串約2字節/字符
            totalMemory += JSON.stringify(value).length * 2;
        }

        // 估算座位評分緩存記憶體使用
        for (const [key, value] of this.seatScoreCache.entries()) {
            totalMemory += key.length * 2;
            totalMemory += JSON.stringify(value).length * 2;
        }

        // 估算特殊座位緩存記憶體使用
        for (const [key, value] of this.specialSeatCache.entries()) {
            totalMemory += key.length * 2;
            totalMemory += JSON.stringify(value).length * 2;
        }

        return totalMemory;
    }

    /**
     * 獲取詳細緩存統計信息
     */
    getDetailedCacheStats() {
        return {
            conditionCache: {
                size: this.conditionCache.size,
                hits: this.cacheHits,
                misses: this.cacheMisses,
                hitRate: this.cacheHits / (this.cacheHits + this.cacheMisses)
            },
            seatScoreCache: {
                size: this.seatScoreCache.size
            },
            specialSeatCache: {
                size: this.specialSeatCache.size
            },
            totalSize: this.conditionCache.size + this.seatScoreCache.size + this.specialSeatCache.size,
            maxSize: this.maxCacheSize
        };
    }
}

module.exports = { AssignmentCache };
