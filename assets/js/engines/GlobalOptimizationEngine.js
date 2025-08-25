/**
 * 全局優化引擎
 * 負責執行全局優化算法、交換優化、重新分配優化等優化功能
 */
const { Logger } = require('./Logger.js');

class GlobalOptimizationEngine {
    constructor(options = {}) {
        this.logger = new Logger('GlobalOptimizationEngine');
        this.options = {
            enableConvergenceCheck: options.enableConvergenceCheck !== false,
            swapWeight: options.swapWeight || 0.4,
            reassignmentWeight: options.reassignmentWeight || 0.6,
            convergenceWindow: options.convergenceWindow || 5,
            improvementThreshold: options.improvementThreshold || 0.001,
            ...options
        };

        this.optimizationHistory = [];
        this.convergenceThreshold = 0.01;
        this.maxIterations = 100;
        this.optimizationConfig = {
            swapWeight: 0.4,
            reassignmentWeight: 0.6,
            convergenceWindow: 5,
            improvementThreshold: 0.001
        };
    }

    /**
     * 全局優化算法
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} options 優化選項
     * @returns {Object} 優化結果
     */
    globalOptimization(currentAssignment, students, seats, conditions, options = {}) {
        const optimizationResult = {
            success: false,
            originalAssignment: new Map(currentAssignment),
            improvedAssignment: new Map(currentAssignment),
            optimizationHistory: [],
            iterations: 0,
            improvement: 0,
            executionTime: 0,
            convergenceReached: false,
            details: {}
        };

        const startTime = performance.now();

        try {
            // 1. 初始評估
            const initialEvaluation = this.evaluateGlobalState(currentAssignment, students, seats, conditions);
            optimizationResult.optimizationHistory.push({
                iteration: 0,
                evaluation: initialEvaluation,
                assignment: new Map(currentAssignment)
            });

            // 2. 執行優化迭代
            let currentAssignment = new Map(currentAssignment);
            let iteration = 0;
            let converged = false;

            while (iteration < this.maxIterations && !converged) {
                iteration++;

                // 執行交換優化
                const swapResult = this.performSwapOptimization(currentAssignment, students, seats, conditions);
                
                // 執行重新分配優化
                const reassignmentResult = this.performReassignmentOptimization(currentAssignment, students, seats, conditions);

                // 選擇更好的結果
                let bestResult = swapResult.improvement > reassignmentResult.improvement ? swapResult : reassignmentResult;

                if (bestResult.success) {
                    currentAssignment = bestResult.newAssignment;
                    
                    // 評估新狀態
                    const newEvaluation = this.evaluateGlobalState(currentAssignment, students, seats, conditions);
                    const improvement = newEvaluation.overallScore - initialEvaluation.overallScore;

                    optimizationResult.optimizationHistory.push({
                        iteration,
                        evaluation: newEvaluation,
                        assignment: new Map(currentAssignment),
                        improvement
                    });

                    // 檢查收斂
                    converged = this.checkConvergence(optimizationResult.optimizationHistory);
                } else {
                    // 如果沒有改進，嘗試隨機重新分配
                    const randomResult = this.performRandomReassignment(currentAssignment, students, seats, conditions);
                    if (randomResult.success) {
                        currentAssignment = randomResult.newAssignment;
                    }
                    converged = true; // 強制結束
                }
            }

            // 3. 設置結果
            optimizationResult.improvedAssignment = currentAssignment;
            optimizationResult.iterations = iteration;
            optimizationResult.convergenceReached = converged;
            optimizationResult.success = true;

            // 計算總改進
            const finalEvaluation = this.evaluateGlobalState(currentAssignment, students, seats, conditions);
            optimizationResult.improvement = finalEvaluation.overallScore - initialEvaluation.overallScore;

            // 分析優化過程
            optimizationResult.details = this.analyzeOptimizationProcess(optimizationResult.optimizationHistory);

        } catch (error) {
            this.logger.error('全局優化失敗:', error);
        }

        optimizationResult.executionTime = performance.now() - startTime;
        this.optimizationHistory.push(optimizationResult);

        return optimizationResult;
    }

    /**
     * 執行交換優化
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 交換優化結果
     */
    performSwapOptimization(assignment, students, seats, conditions) {
        const swapResult = {
            success: false,
            newAssignment: new Map(assignment),
            improvement: 0,
            swapsPerformed: 0,
            details: {}
        };

        try {
            const assignedStudents = Array.from(assignment.keys());
            let bestImprovement = 0;
            let bestSwap = null;

            // 嘗試所有可能的學生對交換
            for (let i = 0; i < assignedStudents.length; i++) {
                for (let j = i + 1; j < assignedStudents.length; j++) {
                    const student1Id = assignedStudents[i];
                    const student2Id = assignedStudents[j];
                    const student1 = students.find(s => s.id === student1Id);
                    const student2 = students.find(s => s.id === student2Id);

                    if (student1 && student2) {
                        const seat1 = assignment.get(student1Id);
                        const seat2 = assignment.get(student2Id);

                        // 計算交換前的滿意度
                        const beforeSatisfaction1 = this.calculateStudentSatisfaction(student1, seat1, assignment, conditions);
                        const beforeSatisfaction2 = this.calculateStudentSatisfaction(student2, seat2, assignment, conditions);

                        // 模擬交換
                        const tempAssignment = new Map(assignment);
                        tempAssignment.set(student1Id, seat2);
                        tempAssignment.set(student2Id, seat1);

                        // 計算交換後的滿意度
                        const afterSatisfaction1 = this.calculateStudentSatisfaction(student1, seat2, tempAssignment, conditions);
                        const afterSatisfaction2 = this.calculateStudentSatisfaction(student2, seat1, tempAssignment, conditions);

                        // 計算改進
                        const improvement = (afterSatisfaction1 + afterSatisfaction2) - (beforeSatisfaction1 + beforeSatisfaction2);

                        if (improvement > bestImprovement) {
                            bestImprovement = improvement;
                            bestSwap = { student1, student2, seat1, seat2 };
                        }
                    }
                }
            }

            // 執行最佳交換
            if (bestSwap && bestImprovement > 0) {
                swapResult.newAssignment.set(bestSwap.student1.id, bestSwap.seat2);
                swapResult.newAssignment.set(bestSwap.student2.id, bestSwap.seat1);
                swapResult.improvement = bestImprovement;
                swapResult.success = true;
                swapResult.swapsPerformed = 1;
                swapResult.details = {
                    student1Id: bestSwap.student1.id,
                    student2Id: bestSwap.student2.id,
                    seat1Info: bestSwap.seat1,
                    seat2Info: bestSwap.seat2
                };
            }

        } catch (error) {
            this.logger.error('交換優化失敗:', error);
        }

        return swapResult;
    }

    /**
     * 執行重新分配優化
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 重新分配優化結果
     */
    performReassignmentOptimization(assignment, students, seats, conditions) {
        const reassignmentResult = {
            success: false,
            newAssignment: new Map(assignment),
            improvement: 0,
            reassignmentsPerformed: 0,
            details: {}
        };

        try {
            const assignedStudents = Array.from(assignment.keys());
            let totalImprovement = 0;
            let reassignments = 0;

            // 為每個已分配的學生尋找更好的座位
            for (const studentId of assignedStudents) {
                const student = students.find(s => s.id === studentId);
                const currentSeat = assignment.get(studentId);

                if (student && currentSeat) {
                    // 計算當前滿意度
                    const currentSatisfaction = this.calculateStudentSatisfaction(student, currentSeat, assignment, conditions);

                    // 尋找更好的座位
                    let bestSeat = currentSeat;
                    let bestSatisfaction = currentSatisfaction;

                    for (const seat of seats) {
                        // 檢查座位是否可用
                        if (!this.isSeatOccupied(seat, assignment)) {
                            const satisfaction = this.calculateStudentSatisfaction(student, seat, assignment, conditions);
                            if (satisfaction > bestSatisfaction) {
                                bestSatisfaction = satisfaction;
                                bestSeat = seat;
                            }
                        }
                    }

                    // 如果找到更好的座位，執行重新分配
                    if (bestSeat !== currentSeat) {
                        reassignmentResult.newAssignment.set(studentId, bestSeat);
                        totalImprovement += (bestSatisfaction - currentSatisfaction);
                        reassignments++;
                    }
                }
            }

            if (reassignments > 0) {
                reassignmentResult.improvement = totalImprovement;
                reassignmentResult.success = true;
                reassignmentResult.reassignmentsPerformed = reassignments;
                reassignmentResult.details = {
                    totalImprovement,
                    reassignments
                };
            }

        } catch (error) {
            this.logger.error('重新分配優化失敗:', error);
        }

        return reassignmentResult;
    }

    /**
     * 執行隨機重新分配
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 隨機重新分配結果
     */
    performRandomReassignment(assignment, students, seats, conditions) {
        const result = {
            success: false,
            newAssignment: new Map(assignment),
            reassignedCount: 0
        };

        try {
            const assignedStudents = Array.from(assignment.keys());
            const reassignmentCount = Math.floor(assignedStudents.length * 0.1); // 重新分配10%的學生

            for (let i = 0; i < reassignmentCount; i++) {
                const randomStudentId = assignedStudents[Math.floor(Math.random() * assignedStudents.length)];
                const availableSeats = seats.filter(seat => !this.isSeatOccupied(seat, result.newAssignment));

                if (availableSeats.length > 0) {
                    const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
                    result.newAssignment.set(randomStudentId, randomSeat);
                    result.reassignedCount++;
                }
            }

            result.success = result.reassignedCount > 0;

        } catch (error) {
            this.logger.error('隨機重新分配失敗:', error);
        }

        return result;
    }

    /**
     * 檢查收斂
     * @param {Array} optimizationHistory 優化歷史
     * @returns {boolean} 是否收斂
     */
    checkConvergence(optimizationHistory) {
        if (optimizationHistory.length < this.options.convergenceWindow + 1) {
            return false;
        }

        const recentHistory = optimizationHistory.slice(-this.options.convergenceWindow);
        const improvements = recentHistory.map(h => h.improvement || 0);
        
        // 檢查最近幾次迭代的改進是否都小於閾值
        return improvements.every(imp => Math.abs(imp) < this.options.improvementThreshold);
    }

    /**
     * 分析優化過程
     * @param {Array} optimizationHistory 優化歷史
     * @returns {Object} 優化過程分析
     */
    analyzeOptimizationProcess(optimizationHistory) {
        const analysis = {
            totalIterations: optimizationHistory.length - 1,
            totalImprovement: 0,
            averageImprovement: 0,
            bestImprovement: 0,
            improvementIterations: 0,
            improvementDistribution: []
        };

        if (optimizationHistory.length < 2) {
            return analysis;
        }

        const improvements = optimizationHistory.slice(1).map(h => h.improvement || 0);
        analysis.totalImprovement = improvements.reduce((sum, imp) => sum + imp, 0);
        analysis.averageImprovement = analysis.totalImprovement / improvements.length;
        analysis.bestImprovement = Math.max(...improvements);
        analysis.improvementIterations = improvements.filter(imp => imp > 0).length;
        analysis.improvementDistribution = improvements;

        return analysis;
    }

    /**
     * 評估全局狀態（簡化版本，實際應該調用 GlobalStateEvaluator）
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 評估結果
     */
    evaluateGlobalState(assignment, students, seats, conditions) {
        return {
            overallScore: this.calculateOverallScore(assignment, students, seats, conditions)
        };
    }

    /**
     * 計算整體分數（簡化版本）
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {number} 整體分數
     */
    calculateOverallScore(assignment, students, seats, conditions) {
        return 0.7; // 簡化實現
    }

    /**
     * 計算學生滿意度
     * @param {Object} student 學生
     * @param {Object} seat 座位
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {number} 滿意度分數
     */
    calculateStudentSatisfaction(student, seat, assignment, conditions) {
        let satisfaction = 0.5; // 基礎滿意度

        try {
            // 座位偏好匹配
            if (student.preferredSeats && student.preferredSeats.includes(`${seat.row}-${seat.col}`)) {
                satisfaction += 0.3;
            }

            // 條件滿足度
            const studentConditions = conditions.filter(c =>
                c.students && (Array.isArray(c.students) ? c.students.includes(student.id) : c.students === student.id)
            );

            let satisfiedConditions = 0;
            for (const condition of studentConditions) {
                const tempAssignment = new Map(assignment);
                tempAssignment.set(student.id, seat);
                if (this.checkCondition(condition, tempAssignment)) {
                    satisfiedConditions++;
                }
            }

            if (studentConditions.length > 0) {
                satisfaction += (satisfiedConditions / studentConditions.length) * 0.2;
            }

        } catch (error) {
            this.logger.error('學生滿意度計算失敗:', error);
        }

        return Math.min(1, Math.max(0, satisfaction));
    }

    /**
     * 檢查條件
     * @param {Object} condition 條件
     * @param {Map} assignment 分配
     * @returns {boolean} 是否滿足條件
     */
    checkCondition(condition, assignment) {
        // 簡化實現，返回隨機結果
        return Math.random() > 0.3;
    }

    /**
     * 檢查座位是否被佔用
     * @param {Object} seat 座位
     * @param {Map} assignment 分配
     * @returns {boolean} 是否被佔用
     */
    isSeatOccupied(seat, assignment) {
        return Array.from(assignment.values()).some(s => s.row === seat.row && s.col === seat.col);
    }

    /**
     * 設置優化配置
     * @param {Object} config 配置對象
     */
    setOptimizationConfig(config) {
        this.optimizationConfig = { ...this.optimizationConfig, ...config };
        this.options = { ...this.options, ...config };
    }

    /**
     * 獲取優化歷史
     * @returns {Array} 優化歷史
     */
    getOptimizationHistory() {
        return [...this.optimizationHistory];
    }

    /**
     * 清除優化歷史
     */
    clearOptimizationHistory() {
        this.optimizationHistory = [];
    }

    /**
     * 重置優化器
     */
    reset() {
        this.optimizationHistory = [];
        this.convergenceThreshold = 0.01;
        this.maxIterations = 100;
        this.optimizationConfig = {
            swapWeight: 0.4,
            reassignmentWeight: 0.6,
            convergenceWindow: 5,
            improvementThreshold: 0.001
        };
    }

    /**
     * 初始化全局優化引擎
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.optimizationHistory = [];
        this.convergenceThreshold = 0.01;
        this.maxIterations = 100;
        this.optimizationConfig = {
            swapWeight: 0.4,
            reassignmentWeight: 0.6,
            convergenceWindow: 5,
            improvementThreshold: 0.001
        };
        
        this.logger.info('全局優化引擎初始化完成', {
            enableConvergenceCheck: this.options.enableConvergenceCheck,
            swapWeight: this.options.swapWeight,
            reassignmentWeight: this.options.reassignmentWeight,
            convergenceWindow: this.options.convergenceWindow,
            improvementThreshold: this.options.improvementThreshold
        });
    }

    /**
     * 銷毀全局優化引擎
     */
    dispose() {
        this.optimizationHistory = [];
        this.logger.info('全局優化引擎銷毀完成');
    }
}

module.exports = { GlobalOptimizationEngine };
