/**
 * 效果評估器協調器
 * 整合效果分析和效果預測功能
 */
const { EffectAnalyzer } = require('./EffectAnalyzer.js');
const { EffectPredictor } = require('./EffectPredictor.js');
const { Logger } = require('./Logger.js');

class EffectEvaluator {
    constructor(options = {}) {
        this.logger = new Logger('EffectEvaluator');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            enableRiskAssessment: options.enableRiskAssessment !== false,
            performanceWeight: options.performanceWeight || 0.4,
            changeWeight: options.changeWeight || 0.3,
            riskWeight: options.riskWeight || 0.3,
            confidenceWeight: options.confidenceWeight || 0.5,
            successWeight: options.successWeight || 0.5,
            ...options
        };

        // 效果評估相關屬性
        this.evaluationHistory = [];
        this.predictionAccuracy = new Map();
        this.riskThresholds = {
            low: 0.3,
            medium: 0.6,
            high: 0.9
        };
        this.confidenceThresholds = {
            low: 0.5,
            medium: 0.7,
            high: 0.9
        };
        this.evaluationConfig = {
            performanceWeight: 0.4,
            changeWeight: 0.3,
            riskWeight: 0.3,
            confidenceWeight: 0.5,
            successWeight: 0.5
        };

        // 初始化子模組
        this.effectAnalyzer = new EffectAnalyzer(options);
        this.effectPredictor = new EffectPredictor(options);
    }

    /**
     * 測量調整效果
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} adjustmentDetails 調整詳情
     * @returns {Object} 效果測量結果
     */
    measureAdjustmentEffect(originalAssignment, newAssignment, students, seats, conditions, adjustmentDetails) {
        return this.effectAnalyzer.measureAdjustmentEffect(
            originalAssignment, newAssignment, students, seats, conditions, adjustmentDetails
        );
    }

    /**
     * 預測調整效果
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} proposedAdjustment 提議的調整
     * @returns {Object} 效果預測結果
     */
    predictAdjustmentEffect(currentAssignment, students, seats, conditions, proposedAdjustment) {
        return this.effectPredictor.predictAdjustmentEffect(
            currentAssignment, students, seats, conditions, proposedAdjustment
        );
    }

    /**
     * 模擬調整
     * @param {Map} currentAssignment 當前分配
     * @param {Object} proposedAdjustment 提議的調整
     * @returns {Map} 模擬後的分配
     */
    simulateAdjustment(currentAssignment, proposedAdjustment) {
        return this.effectPredictor.simulateAdjustment(currentAssignment, proposedAdjustment);
    }

    /**
     * 計算預測置信度
     * @param {Object} proposedAdjustment 提議的調整
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {number} 預測置信度
     */
    calculatePredictionConfidence(proposedAdjustment, currentAssignment, students, seats, conditions) {
        return this.effectPredictor.calculatePredictionConfidence(
            proposedAdjustment, currentAssignment, students, seats, conditions
        );
    }

    /**
     * 評估調整風險
     * @param {Object} proposedAdjustment 提議的調整
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 風險評估結果
     */
    assessAdjustmentRisk(proposedAdjustment, currentAssignment, students, seats, conditions) {
        return this.effectPredictor.assessAdjustmentRisk(
            proposedAdjustment, currentAssignment, students, seats, conditions
        );
    }

    /**
     * 計算成功概率
     * @param {Object} proposedAdjustment 提議的調整
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {number} 成功概率
     */
    calculateSuccessProbability(proposedAdjustment, currentAssignment, students, seats, conditions) {
        return this.effectPredictor.calculateSuccessProbability(
            proposedAdjustment, currentAssignment, students, seats, conditions
        );
    }

    /**
     * 計算性能指標
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Object} adjustmentDetails 調整詳情
     * @returns {Object} 性能指標
     */
    calculatePerformanceMetrics(originalAssignment, newAssignment, adjustmentDetails) {
        return this.effectAnalyzer.calculatePerformanceMetrics(
            originalAssignment, newAssignment, adjustmentDetails
        );
    }

    /**
     * 分析分配變化
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @returns {Object} 變化分析
     */
    analyzeAssignmentChanges(originalAssignment, newAssignment) {
        return this.effectAnalyzer.analyzeAssignmentChanges(originalAssignment, newAssignment);
    }

    /**
     * 計算整體效果
     * @param {Object} measurement 測量結果
     * @returns {number} 整體效果分數
     */
    calculateOverallEffect(measurement) {
        return this.effectAnalyzer.calculateOverallEffect(measurement);
    }

    /**
     * 分析學生影響
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} students 學生列表
     * @returns {Object} 學生影響分析
     */
    analyzeStudentImpact(originalAssignment, newAssignment, students) {
        return this.effectAnalyzer.analyzeStudentImpact(originalAssignment, newAssignment, students);
    }

    /**
     * 分析條件影響
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} conditions 條件列表
     * @returns {Object} 條件影響分析
     */
    analyzeConditionImpact(originalAssignment, newAssignment, conditions) {
        return this.effectAnalyzer.analyzeConditionImpact(originalAssignment, newAssignment, conditions);
    }

    /**
     * 分析座位利用率
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} seats 座位列表
     * @returns {Object} 座位利用率分析
     */
    analyzeSeatUtilization(originalAssignment, newAssignment, seats) {
        return this.effectAnalyzer.analyzeSeatUtilization(originalAssignment, newAssignment, seats);
    }

    /**
     * 設置評估配置
     * @param {Object} config 配置對象
     */
    setEvaluationConfig(config) {
        this.evaluationConfig = { ...this.evaluationConfig, ...config };
        this.effectAnalyzer.setAnalysisConfig(config);
        this.effectPredictor.setPredictionConfig(config);
    }

    /**
     * 獲取評估歷史
     * @returns {Array} 評估歷史
     */
    getEvaluationHistory() {
        return [...this.evaluationHistory];
    }

    /**
     * 清除評估歷史
     */
    clearEvaluationHistory() {
        this.evaluationHistory = [];
        this.effectAnalyzer.clearAnalysisHistory();
        this.effectPredictor.clearPredictionHistory();
    }

    /**
     * 重置評估器
     */
    reset() {
        this.evaluationHistory = [];
        this.predictionAccuracy = new Map();
        this.riskThresholds = {
            low: 0.3,
            medium: 0.6,
            high: 0.9
        };
        this.confidenceThresholds = {
            low: 0.5,
            medium: 0.7,
            high: 0.9
        };
        this.evaluationConfig = {
            performanceWeight: 0.4,
            changeWeight: 0.3,
            riskWeight: 0.3,
            confidenceWeight: 0.5,
            successWeight: 0.5
        };

        this.effectAnalyzer.reset();
        this.effectPredictor.reset();
    }

    /**
     * 初始化效果評估器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.evaluationHistory = [];
        this.predictionAccuracy = new Map();
        this.riskThresholds = {
            low: 0.3,
            medium: 0.6,
            high: 0.9
        };
        this.confidenceThresholds = {
            low: 0.5,
            medium: 0.7,
            high: 0.9
        };
        this.evaluationConfig = {
            performanceWeight: 0.4,
            changeWeight: 0.3,
            riskWeight: 0.3,
            confidenceWeight: 0.5,
            successWeight: 0.5
        };

        // 初始化子模組
        this.effectAnalyzer.initialize(options);
        this.effectPredictor.initialize(options);

        this.logger.info('效果評估器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            enableRiskAssessment: this.options.enableRiskAssessment,
            performanceWeight: this.options.performanceWeight,
            changeWeight: this.options.changeWeight,
            riskWeight: this.options.riskWeight,
            confidenceWeight: this.options.confidenceWeight,
            successWeight: this.options.successWeight
        });
    }

    /**
     * 銷毀效果評估器
     */
    dispose() {
        this.effectAnalyzer.dispose();
        this.effectPredictor.dispose();
        this.evaluationHistory = [];
        this.predictionAccuracy = new Map();
        this.logger.info('效果評估器銷毀完成');
    }
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EffectEvaluator };
} else if (typeof window !== 'undefined') {
    window.EffectEvaluator = EffectEvaluator;
}
