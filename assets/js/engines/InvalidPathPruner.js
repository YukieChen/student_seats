/**
 * 無效路徑剪枝器模組
 * 負責檢查和記錄無效路徑，避免重複探索已知無效的狀態組合
 */
const { Logger } = require('./Logger.js');

class InvalidPathPruner {
    constructor(options = {}) {
        this.logger = new Logger('InvalidPathPruner');
        this.options = {
            ...options
        };

        // 無效路徑剪枝緩存
        this.invalidPathsCache = new Set();
        this.invalidPathPatterns = new Map();
        this.pruningStats = {
            totalChecks: 0,
            prunedPaths: 0,
            cacheHits: 0
        };
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
        this.pruningStats.totalChecks++;

        const pruningResult = {
            shouldPrune: false,
            reason: null,
            confidence: 0,
            details: {},
            cacheHit: false
        };

        // 1. 檢查已嘗試的狀態組合
        const stateKey = this.generateStateKey(students, seats, currentState);
        if (this.invalidPathsCache.has(stateKey)) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '已嘗試過的無效狀態';
            pruningResult.confidence = 0.9;
            pruningResult.cacheHit = true;
            this.pruningStats.cacheHits++;
            return pruningResult;
        }

        // 2. 檢查會導致衝突的狀態
        const conflictCheck = this.checkProposedConflict(students, seats, conditions, proposedAssignment);
        if (conflictCheck.hasConflict) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '會導致衝突的狀態';
            pruningResult.confidence = conflictCheck.confidence;
            pruningResult.details.conflictType = conflictCheck.conflictType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 3. 檢查資源不足的狀態
        const resourceCheck = this.checkResourceInsufficiency(students, seats, conditions);
        if (resourceCheck.isInsufficient) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '資源不足';
            pruningResult.confidence = resourceCheck.confidence;
            pruningResult.details.resourceType = resourceCheck.resourceType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 4. 檢查違反約束的狀態
        const constraintCheck = this.checkConstraintViolation(students, seats, conditions, currentState);
        if (constraintCheck.violatesConstraint) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '違反約束條件';
            pruningResult.confidence = constraintCheck.confidence;
            pruningResult.details.constraintType = constraintCheck.constraintType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 5. 檢查模式匹配的無效路徑
        const patternCheck = this.checkInvalidPattern(students, seats, conditions, currentState);
        if (patternCheck.matchesPattern) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '匹配已知無效模式';
            pruningResult.confidence = patternCheck.confidence;
            pruningResult.details.patternType = patternCheck.patternType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        return pruningResult;
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
        const result = {
            hasConflict: false,
            confidence: 0,
            conflictType: null
        };

        if (!proposedAssignment) {
            return result;
        }

        // 檢查相鄰條件衝突
        for (const condition of conditions) {
            if (condition.type === 'adjacent' || condition.type === 'not_adjacent') {
                const conflict = this.checkAdjacentConditionConflict(condition, proposedAssignment);
                if (conflict.hasConflict) {
                    result.hasConflict = true;
                    result.confidence = 0.8;
                    result.conflictType = 'adjacent_condition';
                    return result;
                }
            }
        }

        // 檢查群組條件衝突
        for (const condition of conditions) {
            if (condition.type === 'assign_group' || condition.type === 'adjacent_and_group') {
                const conflict = this.checkGroupConditionConflict(condition, proposedAssignment);
                if (conflict.hasConflict) {
                    result.hasConflict = true;
                    result.confidence = 0.9;
                    result.conflictType = 'group_condition';
                    return result;
                }
            }
        }

        return result;
    }

    /**
     * 檢查相鄰條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkAdjacentConditionConflict(condition, proposedAssignment) {
        const result = {
            hasConflict: false,
            details: {}
        };

        const { student1, student2 } = condition;

        // 通過ID查找學生在提議分配中的座位
        let seat1 = null;
        let seat2 = null;

        for (const [student, seat] of proposedAssignment.entries()) {
            if (student.id === student1.id) {
                seat1 = seat;
            }
            if (student.id === student2.id) {
                seat2 = seat;
            }
        }

        if (!seat1 || !seat2) {
            return result;
        }

        const isAdjacent = this.areSeatsAdjacent(seat1, seat2);

        if (condition.type === 'adjacent' && !isAdjacent) {
            result.hasConflict = true;
            result.details.reason = '要求相鄰但座位不相鄰';
        } else if (condition.type === 'not_adjacent' && isAdjacent) {
            result.hasConflict = true;
            result.details.reason = '要求不相鄰但座位相鄰';
        }

        return result;
    }

    /**
     * 檢查群組條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkGroupConditionConflict(condition, proposedAssignment) {
        const result = {
            hasConflict: false,
            details: {}
        };

        const { group, seat } = condition;
        const groupStudents = Array.from(proposedAssignment.keys()).filter(student =>
            student.group === group
        );

        if (groupStudents.length === 0) {
            return result;
        }

        const assignedSeats = groupStudents.map(student => proposedAssignment.get(student));
        const targetSeat = seat;

        if (condition.type === 'assign_group') {
            // 檢查群組是否都在指定座位
            const allInTargetSeat = assignedSeats.every(assignedSeat =>
                assignedSeat.id === targetSeat.id
            );
            if (!allInTargetSeat) {
                result.hasConflict = true;
                result.details.reason = '群組學生未都在指定座位';
            }
        } else if (condition.type === 'adjacent_and_group') {
            // 檢查群組是否相鄰
            const areAdjacent = this.checkGroupAdjacency(assignedSeats);
            if (!areAdjacent) {
                result.hasConflict = true;
                result.details.reason = '群組學生座位不相鄰';
            }
        }

        return result;
    }

    /**
     * 檢查資源不足
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 資源檢查結果
     */
    checkResourceInsufficiency(students, seats, conditions) {
        const result = {
            isInsufficient: false,
            confidence: 0,
            resourceType: null
        };

        // 檢查座位數量
        if (seats.length < students.length) {
            result.isInsufficient = true;
            result.confidence = 1.0;
            result.resourceType = 'seats';
            return result;
        }

        // 檢查特殊座位
        const specialSeatRequirements = this.analyzeSpecialSeatRequirements(students, conditions);
        const availableSpecialSeats = seats.filter(seat => seat.isSpecial || seat.groupId);

        if (specialSeatRequirements.count > availableSpecialSeats.length) {
            result.isInsufficient = true;
            result.confidence = 0.95;
            result.resourceType = 'special_seats';
            return result;
        }

        return result;
    }

    /**
     * 分析特殊座位需求
     * @param {Array} students 學生列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 特殊座位需求分析
     */
    analyzeSpecialSeatRequirements(students, conditions) {
        const specialRequirements = {
            count: 0,
            types: new Set(),
            students: new Set()
        };

        conditions.forEach(condition => {
            if (condition.type === 'assign_seat' && condition.seatId) {
                specialRequirements.count++;
                specialRequirements.types.add('specific_seat');
                specialRequirements.students.add(condition.studentId);
            }
        });

        return specialRequirements;
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
        const result = {
            violatesConstraint: false,
            confidence: 0,
            constraintType: null
        };

        // 檢查基本約束
        for (const condition of conditions) {
            if (condition.type === 'assign_seat' && condition.studentId) {
                const student = students.find(s => s.id === condition.studentId);
                const seat = seats.find(s => s.id === condition.seatId);

                if (student && seat) {
                    // 檢查是否違反特定座位分配約束
                    if (currentState.assignment && currentState.assignment.get(student) !== seat) {
                        result.violatesConstraint = true;
                        result.confidence = 0.9;
                        result.constraintType = 'specific_seat_assignment';
                        return result;
                    }
                }
            }
        }

        return result;
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
        const result = {
            matchesPattern: false,
            confidence: 0,
            patternType: null
        };

        // 檢查已知的無效模式
        const statePattern = this.generateStatePattern(students, seats, currentState);

        for (const [patternType, pattern] of this.invalidPathPatterns) {
            if (this.matchesPattern(statePattern, pattern)) {
                result.matchesPattern = true;
                result.confidence = 0.8;
                result.patternType = patternType;
                return result;
            }
        }

        return result;
    }

    /**
     * 記錄無效路徑
     * @param {string} stateKey 狀態鍵
     * @param {Object} pruningResult 剪枝結果
     */
    recordInvalidPath(stateKey, pruningResult) {
        this.invalidPathsCache.add(stateKey);
        this.pruningStats.prunedPaths++;
        this.logger.debug('記錄無效路徑', { stateKey, reason: pruningResult.reason });
    }

    /**
     * 生成狀態鍵
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @returns {string} 狀態鍵
     */
    generateStateKey(students, seats, currentState) {
        const studentIds = students.map(s => s.id).sort().join(',');
        const seatIds = seats.map(s => s.id).sort().join(',');
        const stateInfo = {
            students: studentIds,
            seats: seatIds,
            depth: currentState.depth || 0,
            assignedCount: currentState.assignedCount || 0
        };
        return JSON.stringify(stateInfo);
    }

    /**
     * 生成狀態模式
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 狀態模式
     */
    generateStatePattern(students, seats, currentState) {
        return {
            studentCount: students.length,
            seatCount: seats.length,
            depth: currentState.depth || 0,
            assignedCount: currentState.assignedCount || 0
        };
    }

    /**
     * 檢查模式匹配
     * @param {Object} statePattern 狀態模式
     * @param {Object} pattern 模式
     * @returns {boolean} 是否匹配
     */
    matchesPattern(statePattern, pattern) {
        return JSON.stringify(statePattern) === JSON.stringify(pattern);
    }

    /**
     * 檢查座位是否相鄰
     * @param {Object} seat1 座位1
     * @param {Object} seat2 座位2
     * @returns {boolean} 是否相鄰
     */
    areSeatsAdjacent(seat1, seat2) {
        const rowDiff = Math.abs(seat1.row - seat2.row);
        const colDiff = Math.abs(seat1.col - seat2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    /**
     * 檢查群組相鄰性
     * @param {Array} assignedSeats 已分配座位
     * @returns {boolean} 是否相鄰
     */
    checkGroupAdjacency(assignedSeats) {
        if (assignedSeats.length <= 1) {
            return true;
        }

        for (let i = 0; i < assignedSeats.length; i++) {
            for (let j = i + 1; j < assignedSeats.length; j++) {
                if (!this.areSeatsAdjacent(assignedSeats[i], assignedSeats[j])) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 獲取剪枝統計
     * @returns {Object} 剪枝統計
     */
    getPruningStats() {
        return {
            ...this.pruningStats,
            cacheSize: this.invalidPathsCache.size,
            patternCount: this.invalidPathPatterns.size
        };
    }

    /**
     * 清理緩存
     */
    clearCache() {
        this.invalidPathsCache.clear();
        this.invalidPathPatterns.clear();
        this.pruningStats = {
            totalChecks: 0,
            prunedPaths: 0,
            cacheHits: 0
        };
        this.logger.info('無效路徑緩存已清理');
    }

    /**
     * 初始化無效路徑剪枝器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.clearCache();
        this.logger.info('無效路徑剪枝器初始化完成');
    }

    /**
     * 銷毀無效路徑剪枝器
     */
    dispose() {
        this.clearCache();
        this.logger.info('無效路徑剪枝器銷毀完成');
    }
}

module.exports = { InvalidPathPruner };
