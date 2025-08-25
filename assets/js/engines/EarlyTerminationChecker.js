/**
 * 早期終止檢查器模組
 * 負責檢查各種終止條件，包括超時、無解情況、局部最優陷阱等
 */
const { Logger } = require('./Logger.js');

class EarlyTerminationChecker {
    constructor(options = {}) {
        this.logger = new Logger('EarlyTerminationChecker');
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
    }

    /**
     * 設置性能指標
     * @param {Object} metrics 性能指標
     */
    setPerformanceMetrics(metrics) {
        this.performanceMetrics = metrics;
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
        this.performanceMetrics.executionSteps++;

        const terminationResult = {
            shouldTerminate: false,
            reason: null,
            confidence: 0,
            details: {}
        };

        // 1. 檢查基本終止條件
        if (students.length === 0) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '所有學生已分配';
            terminationResult.confidence = 1.0;
            return terminationResult;
        }

        if (seats.length === 0) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '無可用座位';
            terminationResult.confidence = 1.0;
            return terminationResult;
        }

        // 2. 檢查時間限制
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.performanceMetrics.startTime;
        if (this.performanceMetrics.startTime > 0 && elapsedTime > this.options.timeout) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '超時';
            terminationResult.confidence = 1.0;
            terminationResult.details.elapsedTime = elapsedTime;
            return terminationResult;
        }

        // 3. 檢查執行步驟限制
        if (this.performanceMetrics.executionSteps > this.options.maxExecutionSteps) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '執行步驟過多';
            terminationResult.confidence = 0.9;
            terminationResult.details.executionSteps = this.performanceMetrics.executionSteps;
            return terminationResult;
        }

        // 4. 檢查無解情況
        const unsolvableCheck = this.checkUnsolvableCase(students, seats, conditions);
        if (unsolvableCheck.isUnsolvable) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '檢測到無解情況';
            terminationResult.confidence = unsolvableCheck.confidence;
            terminationResult.details.unsolvableReason = unsolvableCheck.reason;
            return terminationResult;
        }

        // 5. 檢查局部最優陷阱
        const localOptimaCheck = this.checkLocalOptima(currentState);
        if (localOptimaCheck.isTrapped) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '檢測到局部最優陷阱';
            terminationResult.confidence = localOptimaCheck.confidence;
            terminationResult.details.trapType = localOptimaCheck.trapType;
            return terminationResult;
        }

        // 6. 檢查進度停滯
        const stagnationCheck = this.checkProgressStagnation(currentState);
        if (stagnationCheck.isStagnant) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '進度停滯';
            terminationResult.confidence = stagnationCheck.confidence;
            terminationResult.details.stagnationDuration = stagnationCheck.duration;
            return terminationResult;
        }

        return terminationResult;
    }

    /**
     * 檢查無解情況
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 無解檢查結果
     */
    checkUnsolvableCase(students, seats, conditions) {
        const result = {
            isUnsolvable: false,
            confidence: 0,
            reason: null
        };

        // 檢查座位數量是否足夠
        if (seats.length < students.length) {
            result.isUnsolvable = true;
            result.confidence = 1.0;
            result.reason = '座位數量不足';
            return result;
        }

        // 檢查特殊座位需求
        const specialSeatRequirements = this.analyzeSpecialSeatRequirements(students, conditions);
        const availableSpecialSeats = seats.filter(seat => seat.isSpecial || seat.groupId);

        if (specialSeatRequirements.count > availableSpecialSeats.length) {
            result.isUnsolvable = true;
            result.confidence = 0.95;
            result.reason = '特殊座位需求無法滿足';
            return result;
        }

        // 檢查群組條件衝突
        const groupConflictCheck = this.checkGroupConditionConflicts(students, seats, conditions);
        if (groupConflictCheck.hasConflict) {
            result.isUnsolvable = true;
            result.confidence = groupConflictCheck.confidence;
            result.reason = '群組條件衝突';
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
     * 檢查群組條件衝突
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 群組衝突檢查結果
     */
    checkGroupConditionConflicts(students, seats, conditions) {
        const result = {
            hasConflict: false,
            confidence: 0,
            reason: null
        };

        // 分析群組條件
        const groupConditions = conditions.filter(c => c.type === 'assign_group' || c.type === 'adjacent_and_group');
        const groupSeats = seats.filter(s => s.groupId);

        // 檢查群組座位是否足夠
        const requiredGroupSeats = new Set();
        groupConditions.forEach(condition => {
            if (condition.groupId) {
                requiredGroupSeats.add(condition.groupId);
            }
        });

        const availableGroupSeats = new Set(groupSeats.map(s => s.groupId));
        const missingGroups = [...requiredGroupSeats].filter(group => !availableGroupSeats.has(group));

        if (missingGroups.length > 0) {
            result.hasConflict = true;
            result.confidence = 0.9;
            result.reason = `缺少群組座位: ${missingGroups.join(', ')}`;
        }

        return result;
    }

    /**
     * 檢查局部最優陷阱
     * @param {Object} currentState 當前狀態
     * @returns {Object} 局部最優檢查結果
     */
    checkLocalOptima(currentState) {
        const result = {
            isTrapped: false,
            confidence: 0,
            trapType: null
        };

        // 檢查重複狀態
        if (currentState.repeatedStates && currentState.repeatedStates > 10) {
            result.isTrapped = true;
            result.confidence = 0.8;
            result.trapType = 'repeated_states';
            return result;
        }

        // 檢查無進展狀態
        if (currentState.noProgressSteps && currentState.noProgressSteps > 50) {
            result.isTrapped = true;
            result.confidence = 0.7;
            result.trapType = 'no_progress';
            return result;
        }

        // 檢查循環模式
        if (currentState.cyclePattern && currentState.cyclePattern.length > 5) {
            result.isTrapped = true;
            result.confidence = 0.6;
            result.trapType = 'cycle_pattern';
            return result;
        }

        return result;
    }

    /**
     * 檢查進度停滯
     * @param {Object} currentState 當前狀態
     * @returns {Object} 停滯檢查結果
     */
    checkProgressStagnation(currentState) {
        const result = {
            isStagnant: false,
            confidence: 0,
            duration: 0
        };

        const now = Date.now();

        // 檢查最後進度更新時間
        if (currentState.lastProgressTime) {
            const stagnationDuration = now - currentState.lastProgressTime;
            if (stagnationDuration > 5000) { // 5秒無進展
                result.isStagnant = true;
                result.confidence = 0.8;
                result.duration = stagnationDuration;
            }
        }

        // 檢查連續失敗次數
        if (currentState.consecutiveFailures && currentState.consecutiveFailures > 100) {
            result.isStagnant = true;
            result.confidence = 0.9;
            result.duration = currentState.consecutiveFailures * 10; // 估算時間
        }

        return result;
    }

    /**
     * 初始化早期終止檢查器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.performanceMetrics.startTime = Date.now();
        this.performanceMetrics.executionSteps = 0;
        
        this.logger.info('早期終止檢查器初始化完成', {
            timeout: this.options.timeout,
            maxExecutionSteps: this.options.maxExecutionSteps
        });
    }

    /**
     * 銷毀早期終止檢查器
     */
    dispose() {
        this.logger.info('早期終止檢查器銷毀完成');
    }
}

module.exports = { EarlyTerminationChecker };
