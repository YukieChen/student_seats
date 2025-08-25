/**
 * 衝突報告模組
 * 負責生成和分析衝突報告，提供解決建議
 */

const { Logger } = require('./Logger.js');

class ConflictReporter {
    constructor() {
        this.logger = new Logger('ConflictReporter');
        this.conflicts = [];
        this.options = {
            maxConflictsToReport: 100,
            includeDetails: true,
            includeSuggestions: true,
            severityLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        };
        this.reportStats = {
            totalReports: 0,
            totalConflicts: 0,
            averageConflictsPerReport: 0,
            lastReportTime: null
        };
    }

    /**
     * 初始化衝突報告器
     * @param {Array} conflicts 衝突列表
     * @param {Object} options 配置選項
     */
    initialize(conflicts = [], options = {}) {
        this.conflicts = [...conflicts];
        this.options = { ...this.options, ...options };
        
        this.logger.info('衝突報告器初始化完成', { 
            conflictCount: conflicts.length,
            options: this.options 
        });
    }

    /**
     * 分類衝突
     * @returns {Object} 按嚴重程度分類的衝突
     */
    categorizeConflicts() {
        const categories = {
            CRITICAL: [],
            HIGH: [],
            MEDIUM: [],
            LOW: []
        };

        for (const conflict of this.conflicts) {
            const severity = conflict.severity || 'MEDIUM';
            if (categories[severity]) {
                categories[severity].push(conflict);
            } else {
                categories.MEDIUM.push(conflict);
            }
        }

        this.logger.info('衝突分類完成', {
            critical: categories.CRITICAL.length,
            high: categories.HIGH.length,
            medium: categories.MEDIUM.length,
            low: categories.LOW.length
        });

        return categories;
    }

    /**
     * 生成衝突描述
     * @param {Object} conflict 衝突對象
     * @returns {string} 衝突描述
     */
    generateConflictDescription(conflict) {
        const descriptions = {
            TOTAL_COUNT: `學生數量與座位數量不匹配`,
            GROUP_CAPACITY: `群組容量不足`,
            INVALID_ADJACENT_PAIR: `相鄰條件格式錯誤`,
            INVALID_NOT_ADJACENT_PAIR: `不相鄰條件格式錯誤`,
            MISSING_STUDENT: `引用了不存在的學生`,
            MISSING_GROUP: `引用了不存在的群組`,
            MISSING_SEAT: `引用了不存在的座位`,
            MULTIPLE_GROUP_BINDING: `學生被綁定到多個群組`,
            ADJACENT_CONTRADICTION: `相鄰條件矛盾`,
            GROUP_ASSIGNMENT_CONTRADICTION: `群組分配矛盾`,
            REDUNDANT_CONDITION: `冗餘條件`,
            COMPLEX_CONDITION: `複雜條件`
        };

        const description = descriptions[conflict.type] || `未知衝突類型: ${conflict.type}`;
        
        // 添加詳細信息
        if (this.options.includeDetails && conflict.details) {
            return `${description} - ${conflict.details}`;
        }
        
        return description;
    }

    /**
     * 生成解決建議
     * @param {Object} conflict 衝突對象
     * @returns {Array} 解決建議列表
     */
    generateResolutionSuggestions(conflict) {
        if (conflict.suggestion) {
            return [conflict.suggestion];
        }

        const suggestions = {
            TOTAL_COUNT: [
                '增加座位數量',
                '減少學生數量',
                '調整座位佈局以容納更多學生'
            ],
            GROUP_CAPACITY: [
                '為該群組增加更多座位',
                '將部分學生重新分配到其他群組',
                '調整群組邊界以包含更多座位'
            ],
            MISSING_STUDENT: [
                '添加缺失的學生到學生列表',
                '移除引用該學生的條件',
                '檢查學生ID是否拼寫正確'
            ],
            MISSING_GROUP: [
                '創建缺失的群組',
                '修改條件使用現有群組',
                '檢查群組名稱是否拼寫正確'
            ],
            MISSING_SEAT: [
                '創建缺失的座位',
                '修改條件使用現有座位',
                '檢查座位座標是否正確'
            ],
            ADJACENT_CONTRADICTION: [
                '檢查相鄰和不相鄰條件是否衝突',
                '移除矛盾的條件',
                '重新評估學生關係需求'
            ],
            GROUP_ASSIGNMENT_CONTRADICTION: [
                '檢查群組分配條件',
                '確保每個學生只分配到一個群組',
                '重新設計群組分配策略'
            ],
            REDUNDANT_CONDITION: [
                '移除重複的條件',
                '合併相似的條件',
                '優化條件結構'
            ],
            COMPLEX_CONDITION: [
                '分解複雜條件為簡單條件',
                '重新設計條件邏輯',
                '簡化條件表達式'
            ]
        };

        return suggestions[conflict.type] || ['請檢查並修正衝突條件'];
    }

    /**
     * 生成衝突摘要
     * @returns {Object} 衝突摘要
     */
    generateConflictSummary() {
        const categories = this.categorizeConflicts();
        const totalConflicts = this.conflicts.length;

        const summary = {
            totalConflicts,
            criticalCount: categories.CRITICAL.length,
            highCount: categories.HIGH.length,
            mediumCount: categories.MEDIUM.length,
            lowCount: categories.LOW.length,
            hasCriticalConflicts: categories.CRITICAL.length > 0,
            hasHighConflicts: categories.HIGH.length > 0,
            canProceed: categories.CRITICAL.length === 0,
            recommendations: this.generateOverallRecommendations()
        };

        this.logger.info('衝突摘要生成完成', summary);
        return summary;
    }

    /**
     * 生成整體建議
     * @returns {Array} 整體建議列表
     */
    generateOverallRecommendations() {
        const categories = this.categorizeConflicts();
        const recommendations = [];

        if (categories.CRITICAL.length > 0) {
            recommendations.push('必須解決所有嚴重衝突才能繼續座位安排');
        }

        if (categories.HIGH.length > 0) {
            recommendations.push('建議解決高優先級衝突以確保最佳結果');
        }

        if (categories.MEDIUM.length > 0) {
            recommendations.push('考慮解決中等優先級衝突以改善安排質量');
        }

        if (categories.LOW.length > 0) {
            recommendations.push('低優先級衝突可以稍後處理');
        }

        if (this.conflicts.length === 0) {
            recommendations.push('沒有發現衝突，可以安全進行座位安排');
        }

        return recommendations;
    }

    /**
     * 獲取衝突報告
     * @returns {Object} 完整衝突報告
     */
    getConflictReport() {
        const startTime = Date.now();
        this.logger.info('開始生成衝突報告');

        const categories = this.categorizeConflicts();
        const summary = this.generateConflictSummary();

        const report = {
            summary,
            categories,
            conflicts: this.conflicts.slice(0, this.options.maxConflictsToReport),
            totalConflicts: this.conflicts.length,
            timestamp: new Date().toISOString(),
            recommendations: summary.recommendations,
            metadata: {
                generatedBy: 'ConflictReporter',
                version: '1.0.0',
                processingTime: Date.now() - startTime
            }
        };

        // 添加詳細衝突信息
        if (this.options.includeDetails) {
            report.detailedConflicts = this.conflicts.slice(0, this.options.maxConflictsToReport).map(conflict => ({
                ...conflict,
                description: this.generateConflictDescription(conflict),
                suggestions: this.options.includeSuggestions ? this.generateResolutionSuggestions(conflict) : []
            }));
        }

        // 更新統計
        this.updateReportStats(report);

        this.logger.info('衝突報告生成完成', {
            totalConflicts: report.totalConflicts,
            processingTime: report.metadata.processingTime
        });

        return report;
    }

    /**
     * 生成簡化衝突報告
     * @returns {Object} 簡化衝突報告
     */
    getSimplifiedConflictReport() {
        const summary = this.generateConflictSummary();
        
        return {
            summary,
            criticalConflicts: this.conflicts.filter(c => c.severity === 'CRITICAL').length,
            highConflicts: this.conflicts.filter(c => c.severity === 'HIGH').length,
            canProceed: summary.canProceed,
            recommendations: summary.recommendations.slice(0, 3) // 只顯示前3個建議
        };
    }

    /**
     * 生成衝突趨勢分析
     * @param {Array} historicalReports 歷史報告列表
     * @returns {Object} 趨勢分析結果
     */
    generateConflictTrendAnalysis(historicalReports = []) {
        if (historicalReports.length === 0) {
            return {
                hasData: false,
                message: '沒有歷史數據可供分析'
            };
        }

        const trends = {
            totalConflicts: [],
            criticalConflicts: [],
            highConflicts: [],
            averageConflicts: 0,
            trend: 'stable'
        };

        // 分析趨勢
        historicalReports.forEach(report => {
            trends.totalConflicts.push(report.totalConflicts);
            trends.criticalConflicts.push(report.criticalCount || 0);
            trends.highConflicts.push(report.highCount || 0);
        });

        // 計算平均值
        trends.averageConflicts = trends.totalConflicts.reduce((a, b) => a + b, 0) / trends.totalConflicts.length;

        // 判斷趨勢
        if (trends.totalConflicts.length >= 2) {
            const recent = trends.totalConflicts.slice(-3);
            const older = trends.totalConflicts.slice(-6, -3);
            
            const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
            const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
            
            if (recentAvg > olderAvg * 1.2) {
                trends.trend = 'increasing';
            } else if (recentAvg < olderAvg * 0.8) {
                trends.trend = 'decreasing';
            }
        }

        return {
            hasData: true,
            trends,
            recommendations: this.generateTrendRecommendations(trends)
        };
    }

    /**
     * 生成趨勢建議
     * @param {Object} trends 趨勢數據
     * @returns {Array} 趨勢建議
     */
    generateTrendRecommendations(trends) {
        const recommendations = [];

        if (trends.trend === 'increasing') {
            recommendations.push('衝突數量呈上升趨勢，建議檢查條件設置和系統配置');
        } else if (trends.trend === 'decreasing') {
            recommendations.push('衝突數量呈下降趨勢，系統運行良好');
        }

        if (trends.averageConflicts > 10) {
            recommendations.push('平均衝突數量較高，建議優化條件設置');
        }

        return recommendations;
    }

    /**
     * 更新報告統計
     * @param {Object} report 衝突報告
     */
    updateReportStats(report) {
        this.reportStats.totalReports++;
        this.reportStats.totalConflicts += report.totalConflicts;
        this.reportStats.averageConflictsPerReport = this.reportStats.totalConflicts / this.reportStats.totalReports;
        this.reportStats.lastReportTime = new Date().toISOString();
    }

    /**
     * 獲取報告統計
     * @returns {Object} 報告統計信息
     */
    getReportStats() {
        return { ...this.reportStats };
    }

    /**
     * 導出衝突報告為JSON
     * @param {Object} report 衝突報告
     * @returns {string} JSON字符串
     */
    exportReportAsJSON(report) {
        return JSON.stringify(report, null, 2);
    }

    /**
     * 導出衝突報告為CSV
     * @param {Object} report 衝突報告
     * @returns {string} CSV字符串
     */
    exportReportAsCSV(report) {
        const headers = ['Type', 'Severity', 'Description', 'Suggestions'];
        const rows = [headers.join(',')];

        report.conflicts.forEach(conflict => {
            const description = this.generateConflictDescription(conflict);
            const suggestions = this.generateResolutionSuggestions(conflict).join('; ');
            
            const row = [
                conflict.type,
                conflict.severity || 'MEDIUM',
                `"${description}"`,
                `"${suggestions}"`
            ].join(',');
            
            rows.push(row);
        });

        return rows.join('\n');
    }

    /**
     * 驗證衝突報告
     * @param {Object} report 衝突報告
     * @returns {Object} 驗證結果
     */
    validateConflictReport(report) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };

        // 檢查必要字段
        if (!report.summary) {
            validation.isValid = false;
            validation.errors.push('缺少摘要信息');
        }

        if (!report.conflicts) {
            validation.isValid = false;
            validation.errors.push('缺少衝突列表');
        }

        if (!report.timestamp) {
            validation.warnings.push('缺少時間戳');
        }

        // 檢查數據一致性
        if (report.summary && report.conflicts) {
            if (report.summary.totalConflicts !== report.conflicts.length) {
                validation.warnings.push('衝突數量不一致');
            }
        }

        return validation;
    }

    /**
     * 重置統計
     */
    resetStats() {
        this.reportStats = {
            totalReports: 0,
            totalConflicts: 0,
            averageConflictsPerReport: 0,
            lastReportTime: null
        };
    }

    /**
     * 清理資源
     */
    dispose() {
        this.conflicts = [];
        this.resetStats();
        this.logger.info('衝突報告器資源已清理');
    }
}

module.exports = { ConflictReporter };
