/**
 * 條件緩存模組
 * 負責基本的緩存功能和條件檢查邏輯
 */

const { Logger } = require('./Logger.js');

class ConditionCache {
    constructor(options = {}) {
        this.logger = new Logger('ConditionCache');
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
     * 獲取緩存數據
     * 
     * @param {string} key - 緩存鍵
     * @returns {*} 緩存的數據，如果不存在則返回 undefined
     */
    get(key) {
        // 嘗試從不同的緩存中獲取數據
        if (this.conditionCache.has(key)) {
            return this.conditionCache.get(key);
        }
        if (this.seatScoreCache.has(key)) {
            return this.seatScoreCache.get(key);
        }
        if (this.specialSeatCache.has(key)) {
            return this.specialSeatCache.get(key);
        }
        return undefined;
    }

    /**
     * 設置緩存數據
     * 
     * @param {string} key - 緩存鍵
     * @param {*} value - 要緩存的數據
     */
    set(key, value) {
        // 根據鍵的格式決定存儲到哪個緩存
        if (key.includes('score')) {
            this.seatScoreCache.set(key, value);
        } else if (key.includes('special')) {
            this.specialSeatCache.set(key, value);
        } else {
            this.conditionCache.set(key, value);
        }
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

    // ==================== 基本緩存管理 ====================

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
        
        this.logger.info('緩存已清理');
    }

    /**
     * 清理過期的緩存項
     */
    cleanup() {
        if (this.conditionCache.size > this.maxCacheSize * 0.8) {
            const entries = Array.from(this.conditionCache.entries());
            const toRemove = entries.slice(0, this.maxCacheSize * 0.3);
            toRemove.forEach(([key]) => this.conditionCache.delete(key));
            
            this.logger.info('執行基本緩存清理', { removedCount: toRemove.length });
        }
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

    /**
     * 初始化緩存
     */
    initialize(options = {}) {
        this.maxCacheSize = options.maxCacheSize || this.maxCacheSize;
        this.clear();
        
        this.logger.info('條件緩存初始化完成', { maxCacheSize: this.maxCacheSize });
    }

    /**
     * 清理資源
     */
    dispose() {
        this.clear();
        this.logger.info('條件緩存資源已清理');
    }
}

module.exports = { ConditionCache };
