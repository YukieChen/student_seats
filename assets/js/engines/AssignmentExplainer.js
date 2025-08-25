/**
 * 分配解釋器協調器
 * 整合結果分析和報告生成功能
 */
const { ResultAnalyzer } = require('./ResultAnalyzer.js');
const { ReportGenerator } = require('./ReportGenerator.js');
const { Logger } = require('./Logger.js');

class AssignmentExplainer {
    constructor(options = {}) {
        this.logger = new Logger('AssignmentExplainer');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            enableSuggestions: options.enableSuggestions !== false,
            maxReportLength: options.maxReportLength || 10000,
            ...options
        };

        // 解釋配置
        this.EXPLANATION_CONFIG = {
            DETAIL_LEVELS: {
                BASIC: 'basic',
                STANDARD: 'standard',
                DETAILED: 'detailed',
                EXPERT: 'expert'
            },
            REPORT_FORMATS: {
                TEXT: 'text',
                JSON: 'json',
                HTML: 'html',
                MARKDOWN: 'markdown'
            },
            SUGGESTION_PRIORITIES: {
                CRITICAL: 'critical',
                HIGH: 'high',
                MEDIUM: 'medium',
                LOW: 'low'
            }
        };

        this.analysisHistory = [];
        this.reportTemplates = this.initializeReportTemplates();

        // 初始化子模組
        this.resultAnalyzer = new ResultAnalyzer(options);
        this.reportGenerator = new ReportGenerator(options);
    }

    /**
     * 解釋分配結果
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 解釋結果
     */
    explainAssignment(assignmentResult, config) {
        return this.resultAnalyzer.explainAssignment(assignmentResult, config);
    }

    /**
     * 解釋條件滿足情況
     * @param {Array} conditions 條件列表
     * @param {Object} assignment 分配結果
     * @returns {Object} 條件解釋
     */
    explainConditions(conditions, assignment) {
        return this.resultAnalyzer.explainConditions(conditions, assignment);
    }

    /**
     * 解釋使用的策略
     * @param {Object} strategyInfo 策略信息
     * @returns {Object} 策略解釋
     */
    explainStrategy(strategyInfo) {
        return this.resultAnalyzer.explainStrategy(strategyInfo);
    }

    /**
     * 分析失敗原因
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 失敗分析
     */
    analyzeFailure(failureResult) {
        return this.resultAnalyzer.analyzeFailure(failureResult);
    }

    /**
     * 分類失敗類型
     * @param {Object} failureResult 失敗結果
     * @returns {string} 失敗類型
     */
    categorizeFailure(failureResult) {
        return this.resultAnalyzer.categorizeFailure(failureResult);
    }

    /**
     * 評估失敗影響
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 影響評估
     */
    assessFailureImpact(failureResult) {
        return this.resultAnalyzer.assessFailureImpact(failureResult);
    }

    /**
     * 生成改進建議
     * @param {Object} analysisResult 分析結果
     * @returns {Array} 建議列表
     */
    generateSuggestions(analysisResult) {
        return this.resultAnalyzer.generateSuggestions(analysisResult);
    }

    /**
     * 優先級排序建議
     * @param {Array} suggestions 建議列表
     * @returns {Array} 排序後的建議
     */
    prioritizeSuggestions(suggestions) {
        return this.resultAnalyzer.prioritizeSuggestions(suggestions);
    }

    /**
     * 評估建議可行性
     * @param {Object} suggestion 建議對象
     * @param {Object} context 上下文信息
     * @returns {Object} 可行性評估
     */
    assessSuggestionFeasibility(suggestion, context) {
        return this.resultAnalyzer.assessSuggestionFeasibility(suggestion, context);
    }

    /**
     * 生成詳細報告
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 詳細報告
     */
    generateReport(assignmentResult, config) {
        return this.reportGenerator.generateReport(assignmentResult, config);
    }

    /**
     * 格式化報告
     * @param {Object} report 報告對象
     * @param {string} format 格式類型
     * @returns {string} 格式化後的報告
     */
    formatReport(report, format = 'TEXT') {
        return this.reportGenerator.formatReport(report, format);
    }

    /**
     * 導出報告
     * @param {Object} report 報告對象
     * @param {string} format 格式類型
     * @param {string} filename 文件名
     * @returns {Object} 導出結果
     */
    exportReport(report, format = 'JSON', filename = null) {
        return this.reportGenerator.exportReport(report, format, filename);
    }

    /**
     * 生成分配摘要
     * @param {Object} assignmentResult 分配結果
     * @returns {Object} 分配摘要
     */
    generateAssignmentSummary(assignmentResult) {
        return this.resultAnalyzer.generateAssignmentSummary(assignmentResult);
    }

    /**
     * 生成分配詳情
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 分配詳情
     */
    generateAssignmentDetails(assignmentResult, config) {
        return this.resultAnalyzer.generateAssignmentDetails(assignmentResult, config);
    }

    /**
     * 計算分配統計
     * @param {Object} assignmentResult 分配結果
     * @returns {Object} 統計信息
     */
    calculateAssignmentStatistics(assignmentResult) {
        return this.resultAnalyzer.calculateAssignmentStatistics(assignmentResult);
    }

    /**
     * 評估分配質量
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 質量評估
     */
    assessAssignmentQuality(assignmentResult, config) {
        return this.resultAnalyzer.assessAssignmentQuality(assignmentResult, config);
    }

    /**
     * 分析條件滿足情況
     * @param {Object} condition 條件對象
     * @param {Object} assignment 分配結果
     * @returns {Object} 條件分析
     */
    analyzeConditionSatisfaction(condition, assignment) {
        return this.resultAnalyzer.analyzeConditionSatisfaction(condition, assignment);
    }

    /**
     * 獲取策略描述
     * @param {string} strategy 策略名稱
     * @returns {string} 策略描述
     */
    getStrategyDescription(strategy) {
        return this.resultAnalyzer.getStrategyDescription(strategy);
    }

    /**
     * 分析策略性能
     * @param {Object} strategyInfo 策略信息
     * @returns {Object} 性能分析
     */
    analyzeStrategyPerformance(strategyInfo) {
        return this.resultAnalyzer.analyzeStrategyPerformance(strategyInfo);
    }

    /**
     * 建議替代策略
     * @param {Object} strategyInfo 策略信息
     * @returns {Array} 替代策略列表
     */
    suggestAlternativeStrategies(strategyInfo) {
        return this.resultAnalyzer.suggestAlternativeStrategies(strategyInfo);
    }

    /**
     * 生成策略建議
     * @param {Object} strategyInfo 策略信息
     * @returns {Array} 策略建議
     */
    generateStrategyRecommendations(strategyInfo) {
        return this.resultAnalyzer.generateStrategyRecommendations(strategyInfo);
    }

    /**
     * 識別根本原因
     * @param {Object} failureResult 失敗結果
     * @returns {string} 根本原因
     */
    identifyRootCause(failureResult) {
        return this.resultAnalyzer.identifyRootCause(failureResult);
    }

    /**
     * 分析失敗時間線
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 時間線分析
     */
    analyzeFailureTimeline(failureResult) {
        return this.resultAnalyzer.analyzeFailureTimeline(failureResult);
    }

    /**
     * 生成失敗建議
     * @param {Object} failureResult 失敗結果
     * @returns {Array} 失敗建議
     */
    generateFailureSuggestions(failureResult) {
        return this.resultAnalyzer.generateFailureSuggestions(failureResult);
    }

    /**
     * 記錄分析歷史
     * @param {Object} analysis 分析結果
     */
    recordAnalysis(analysis) {
        this.resultAnalyzer.recordAnalysis(analysis);
    }

    /**
     * 計算分配率
     * @param {Object} assignmentResult 分配結果
     * @returns {number} 分配率
     */
    calculateAssignmentRate(assignmentResult) {
        return this.resultAnalyzer.calculateAssignmentRate(assignmentResult);
    }

    /**
     * 計算條件滿足率
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {number} 條件滿足率
     */
    calculateConditionSatisfactionRate(assignmentResult, config) {
        return this.resultAnalyzer.calculateConditionSatisfactionRate(assignmentResult, config);
    }

    /**
     * 創建分配映射
     * @param {Map} assignment 分配結果
     * @returns {Object} 分配映射
     */
    createAssignmentMap(assignment) {
        return this.resultAnalyzer.createAssignmentMap(assignment);
    }

    /**
     * 分析未分配學生
     * @param {Array} unassignedStudents 未分配學生列表
     * @returns {Object} 未分配學生分析
     */
    analyzeUnassignedStudents(unassignedStudents) {
        return this.resultAnalyzer.analyzeUnassignedStudents(unassignedStudents);
    }

    /**
     * 識別未分配原因
     * @param {Array} unassignedStudents 未分配學生列表
     * @returns {Array} 未分配原因
     */
    identifyUnassignmentReasons(unassignedStudents) {
        return this.resultAnalyzer.identifyUnassignmentReasons(unassignedStudents);
    }

    /**
     * 分析衝突
     * @param {Array} conflicts 衝突列表
     * @returns {Object} 衝突分析
     */
    analyzeConflicts(conflicts) {
        return this.resultAnalyzer.analyzeConflicts(conflicts);
    }

    /**
     * 分類衝突
     * @param {Array} conflicts 衝突列表
     * @returns {Object} 衝突分類
     */
    categorizeConflicts(conflicts) {
        return this.resultAnalyzer.categorizeConflicts(conflicts);
    }

    /**
     * 評估衝突嚴重程度
     * @param {Array} conflicts 衝突列表
     * @returns {string} 嚴重程度
     */
    assessConflictSeverity(conflicts) {
        return this.resultAnalyzer.assessConflictSeverity(conflicts);
    }

    /**
     * 分析性能
     * @param {Object} performanceMetrics 性能指標
     * @returns {Object} 性能分析
     */
    analyzePerformance(performanceMetrics) {
        return this.resultAnalyzer.analyzePerformance(performanceMetrics);
    }

    /**
     * 計算效率
     * @param {Object} performanceMetrics 性能指標
     * @returns {number} 效率分數
     */
    calculateEfficiency(performanceMetrics) {
        return this.resultAnalyzer.calculateEfficiency(performanceMetrics);
    }

    /**
     * 估計策略性能
     * @param {string} strategy 策略名稱
     * @returns {Object} 性能估計
     */
    estimateStrategyPerformance(strategy) {
        return this.resultAnalyzer.estimateStrategyPerformance(strategy);
    }

    /**
     * 清理配置信息
     * @param {Object} config 配置對象
     * @returns {Object} 清理後的配置
     */
    sanitizeConfig(config) {
        return this.reportGenerator.sanitizeConfig(config);
    }

    /**
     * 格式化為文本
     * @param {Object} report 報告對象
     * @returns {string} 文本格式報告
     */
    formatAsText(report) {
        return this.reportGenerator.formatAsText(report);
    }

    /**
     * 格式化為HTML
     * @param {Object} report 報告對象
     * @returns {string} HTML格式報告
     */
    formatAsHTML(report) {
        return this.reportGenerator.formatAsHTML(report);
    }

    /**
     * 格式化為Markdown
     * @param {Object} report 報告對象
     * @returns {string} Markdown格式報告
     */
    formatAsMarkdown(report) {
        return this.reportGenerator.formatAsMarkdown(report);
    }

    /**
     * 創建下載URL
     * @param {string} content 內容
     * @param {string} filename 文件名
     * @returns {string} 下載URL
     */
    createDownloadUrl(content, filename) {
        return this.reportGenerator.createDownloadUrl(content, filename);
    }

    /**
     * 初始化報告模板
     * @returns {Object} 報告模板
     */
    initializeReportTemplates() {
        return {
            basic: {
                sections: ['summary', 'statistics'],
                maxLength: 1000
            },
            standard: {
                sections: ['summary', 'details', 'statistics', 'recommendations'],
                maxLength: 5000
            },
            detailed: {
                sections: ['summary', 'details', 'statistics', 'recommendations', 'analysis'],
                maxLength: 10000
            }
        };
    }

    /**
     * 初始化分配解釋器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.analysisHistory = [];
        this.reportTemplates = this.initializeReportTemplates();
        
        // 初始化子模組
        this.resultAnalyzer.initialize(options);
        this.reportGenerator.initialize(options);
        
        this.logger.info('分配解釋器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            enableSuggestions: this.options.enableSuggestions,
            maxReportLength: this.options.maxReportLength
        });
    }

    /**
     * 銷毀分配解釋器
     */
    dispose() {
        this.resultAnalyzer.dispose();
        this.reportGenerator.dispose();
        this.analysisHistory = [];
        this.logger.info('分配解釋器銷毀完成');
    }
}

module.exports = { AssignmentExplainer };
