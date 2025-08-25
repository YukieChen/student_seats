/**
 * 全局優化器協調器
 * 整合全局狀態評估和全局優化引擎功能
 */
const { GlobalStateEvaluator } = require('./GlobalStateEvaluator.js');
const { GlobalOptimizationEngine } = require('./GlobalOptimizationEngine.js');
const { Logger } = require('./Logger.js');

class GlobalOptimizer {
    constructor(options = {}) {
        this.logger = new Logger('GlobalOptimizer');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            enableConvergenceCheck: options.enableConvergenceCheck !== false,
            satisfactionWeight: options.satisfactionWeight || 0.5,
            conditionWeight: options.conditionWeight || 0.3,
            distributionWeight: options.distributionWeight || 0.2,
            swapWeight: options.swapWeight || 0.4,
            reassignmentWeight: options.reassignmentWeight || 0.6,
            convergenceWindow: options.convergenceWindow || 5,
            improvementThreshold: options.improvementThreshold || 0.001,
            ...options
        };

        // 全局優化相關屬性
        this.optimizationHistory = [];
        this.convergenceThreshold = 0.01;
        this.maxIterations = 100;
        this.optimizationConfig = {
            swapWeight: 0.4,
            reassignmentWeight: 0.6,
            convergenceWindow: 5,
            improvementThreshold: 0.001
        };

        // 初始化子模組
        this.globalStateEvaluator = new GlobalStateEvaluator(options);
        this.globalOptimizationEngine = new GlobalOptimizationEngine(options);
    }

    /**
     * 評估全局狀態
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 全局狀態評估結果
     */
    evaluateGlobalState(currentAssignment, students, seats, conditions) {
        return this.globalStateEvaluator.evaluateGlobalState(currentAssignment, students, seats, conditions);
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
        return this.globalOptimizationEngine.globalOptimization(currentAssignment, students, seats, conditions, options);
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
        return this.globalOptimizationEngine.performSwapOptimization(assignment, students, seats, conditions);
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
        return this.globalOptimizationEngine.performReassignmentOptimization(assignment, students, seats, conditions);
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
        return this.globalOptimizationEngine.performRandomReassignment(assignment, students, seats, conditions);
    }

    /**
     * 檢查收斂
     * @param {Array} optimizationHistory 優化歷史
     * @returns {boolean} 是否收斂
     */
    checkConvergence(optimizationHistory) {
        return this.globalOptimizationEngine.checkConvergence(optimizationHistory);
    }

    /**
     * 分析優化過程
     * @param {Array} optimizationHistory 優化歷史
     * @returns {Object} 優化過程分析
     */
    analyzeOptimizationProcess(optimizationHistory) {
        return this.globalOptimizationEngine.analyzeOptimizationProcess(optimizationHistory);
    }

    /**
     * 計算分配率
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @returns {number} 分配率
     */
    calculateAssignmentRate(assignment, students) {
        return this.globalStateEvaluator.calculateAssignmentRate(assignment, students);
    }

    /**
     * 計算全局條件滿足度
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {number} 條件滿足度
     */
    calculateGlobalConditionSatisfaction(assignment, conditions) {
        return this.globalStateEvaluator.calculateGlobalConditionSatisfaction(assignment, conditions);
    }

    /**
     * 計算全局學生滿意度
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {number} 學生滿意度
     */
    calculateGlobalStudentSatisfaction(assignment, students, seats, conditions) {
        return this.globalStateEvaluator.calculateGlobalStudentSatisfaction(assignment, students, seats, conditions);
    }

    /**
     * 計算綜合評分
     * @param {Object} evaluation 評估結果
     * @returns {number} 綜合評分
     */
    calculateOverallScore(evaluation) {
        return this.globalStateEvaluator.calculateOverallScore(evaluation);
    }

    /**
     * 分析分配分布
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @returns {Object} 分配分布分析
     */
    analyzeAssignmentDistribution(assignment, students, seats) {
        return this.globalStateEvaluator.analyzeAssignmentDistribution(assignment, students, seats);
    }

    /**
     * 分析條件滿足情況
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {Object} 條件分析
     */
    analyzeConditionSatisfaction(assignment, conditions) {
        return this.globalStateEvaluator.analyzeConditionSatisfaction(assignment, conditions);
    }

    /**
     * 分析學生滿意度
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 學生滿意度分析
     */
    analyzeStudentSatisfaction(assignment, students, seats, conditions) {
        return this.globalStateEvaluator.analyzeStudentSatisfaction(assignment, students, seats, conditions);
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
        return this.globalStateEvaluator.calculateStudentSatisfaction(student, seat, assignment, conditions);
    }

    /**
     * 檢查條件
     * @param {Object} condition 條件
     * @param {Map} assignment 分配
     * @returns {boolean} 是否滿足條件
     */
    checkCondition(condition, assignment) {
        return this.globalStateEvaluator.checkCondition(condition, assignment);
    }

    /**
     * 檢查座位是否被佔用
     * @param {Object} seat 座位
     * @param {Map} assignment 分配
     * @returns {boolean} 是否被佔用
     */
    isSeatOccupied(seat, assignment) {
        return this.globalStateEvaluator.isSeatOccupied(seat, assignment);
    }

    /**
     * 設置優化配置
     * @param {Object} config 配置對象
     */
    setOptimizationConfig(config) {
        this.optimizationConfig = { ...this.optimizationConfig, ...config };
        this.globalStateEvaluator.setEvaluationConfig(config);
        this.globalOptimizationEngine.setOptimizationConfig(config);
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
        this.globalStateEvaluator.clearEvaluationHistory();
        this.globalOptimizationEngine.clearOptimizationHistory();
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

        this.globalStateEvaluator.reset();
        this.globalOptimizationEngine.reset();
    }

    /**
     * 初始化全局優化器
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

        // 初始化子模組
        this.globalStateEvaluator.initialize(options);
        this.globalOptimizationEngine.initialize(options);

        this.logger.info('全局優化器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            enableConvergenceCheck: this.options.enableConvergenceCheck,
            satisfactionWeight: this.options.satisfactionWeight,
            conditionWeight: this.options.conditionWeight,
            distributionWeight: this.options.distributionWeight,
            swapWeight: this.options.swapWeight,
            reassignmentWeight: this.options.reassignmentWeight,
            convergenceWindow: this.options.convergenceWindow,
            improvementThreshold: this.options.improvementThreshold
        });
    }

    /**
     * 銷毀全局優化器
     */
    dispose() {
        this.globalStateEvaluator.dispose();
        this.globalOptimizationEngine.dispose();
        this.optimizationHistory = [];
        this.logger.info('全局優化器銷毀完成');
    }
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GlobalOptimizer };
} else if (typeof window !== 'undefined') {
    window.GlobalOptimizer = GlobalOptimizer;
}
