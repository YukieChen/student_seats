/**
 * 報告生成器
 * 負責生成詳細報告、格式化報告、導出報告等
 */
const { Logger } = require('./Logger.js');

class ReportGenerator {
    constructor(options = {}) {
        this.logger = new Logger('ReportGenerator');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            enableSuggestions: options.enableSuggestions !== false,
            maxReportLength: options.maxReportLength || 10000,
            ...options
        };

        // 報告配置
        this.REPORT_CONFIG = {
            REPORT_FORMATS: {
                TEXT: 'text',
                JSON: 'json',
                HTML: 'html',
                MARKDOWN: 'markdown'
            },
            DETAIL_LEVELS: {
                BASIC: 'basic',
                STANDARD: 'standard',
                DETAILED: 'detailed',
                EXPERT: 'expert'
            }
        };

        this.reportTemplates = this.initializeReportTemplates();
    }

    /**
     * 生成詳細報告
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 詳細報告
     */
    generateReport(assignmentResult, config) {
        const report = {
            summary: this.generateAssignmentSummary(assignmentResult),
            details: this.generateAssignmentDetails(assignmentResult, config),
            recommendations: this.generateSuggestions({
                failureType: assignmentResult.success ? 'SUCCESS' : this.categorizeFailure(assignmentResult),
                conditionSatisfactionRate: this.calculateConditionSatisfactionRate(assignmentResult, config)
            }),
            statistics: this.calculateAssignmentStatistics(assignmentResult),
            metadata: {
                generatedAt: new Date().toISOString(),
                version: '1.0',
                config: this.sanitizeConfig(config)
            }
        };

        return report;
    }

    /**
     * 格式化報告
     * @param {Object} report 報告對象
     * @param {string} format 格式類型
     * @returns {string} 格式化後的報告
     */
    formatReport(report, format = 'TEXT') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'html':
                return this.formatAsHTML(report);
            case 'markdown':
                return this.formatAsMarkdown(report);
            case 'text':
            default:
                return this.formatAsText(report);
        }
    }

    /**
     * 導出報告
     * @param {Object} report 報告對象
     * @param {string} format 格式類型
     * @param {string} filename 文件名
     * @returns {Object} 導出結果
     */
    exportReport(report, format = 'JSON', filename = null) {
        const formattedContent = this.formatReport(report, format);
        const defaultFilename = `assignment_report_${Date.now()}.${format.toLowerCase()}`;
        const finalFilename = filename || defaultFilename;

        return {
            success: true,
            filename: finalFilename,
            content: formattedContent,
            size: formattedContent.length,
            format: format,
            downloadUrl: this.createDownloadUrl(formattedContent, finalFilename)
        };
    }

    /**
     * 生成分配摘要
     * @param {Object} assignmentResult 分配結果
     * @returns {Object} 分配摘要
     */
    generateAssignmentSummary(assignmentResult) {
        return {
            success: assignmentResult.success,
            totalStudents: assignmentResult.assignment?.size || 0,
            unassignedStudents: assignmentResult.unassignedStudents?.length || 0,
            assignmentRate: this.calculateAssignmentRate(assignmentResult),
            executionTime: assignmentResult.performanceMetrics?.executionTime || 0,
            conflicts: assignmentResult.conflicts?.length || 0
        };
    }

    /**
     * 生成分配詳情
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 分配詳情
     */
    generateAssignmentDetails(assignmentResult, config) {
        return {
            assignmentMap: this.createAssignmentMap(assignmentResult.assignment),
            unassignedDetails: this.analyzeUnassignedStudents(assignmentResult.unassignedStudents),
            conflictDetails: this.analyzeConflicts(assignmentResult.conflicts),
            performanceDetails: this.analyzePerformance(assignmentResult.performanceMetrics),
            conditionAnalysis: this.explainConditions(config.conditions || [], assignmentResult.assignment)
        };
    }

    /**
     * 計算分配統計
     * @param {Object} assignmentResult 分配結果
     * @returns {Object} 統計信息
     */
    calculateAssignmentStatistics(assignmentResult) {
        const assignment = assignmentResult.assignment || new Map();
        
        return {
            totalAssignments: assignment.size,
            assignmentRate: this.calculateAssignmentRate(assignmentResult),
            averageExecutionTime: assignmentResult.performanceMetrics?.executionTime || 0,
            memoryUsage: assignmentResult.performanceMetrics?.memoryUsage || [],
            cacheHitRate: assignmentResult.performanceMetrics?.cacheStats?.hitRate || 0
        };
    }

    /**
     * 生成改進建議
     * @param {Object} analysisResult 分析結果
     * @returns {Array} 建議列表
     */
    generateSuggestions(analysisResult) {
        const suggestions = [];

        // 基於失敗類型生成建議
        if (analysisResult.failureType === 'TIMEOUT') {
            suggestions.push({
                priority: 'HIGH',
                category: 'PERFORMANCE',
                title: '優化算法性能',
                description: '考慮減少學生數量或簡化條件以提高執行速度',
                implementation: '調整超時設置或使用更高效的算法'
            });
        }

        if (analysisResult.failureType === 'CONFLICT') {
            suggestions.push({
                priority: 'MEDIUM',
                category: 'LOGIC',
                title: '檢查條件設定',
                description: '檢查是否存在相互衝突的條件設定',
                implementation: '使用衝突檢測工具驗證條件一致性'
            });
        }

        if (analysisResult.failureType === 'INCOMPLETE_ASSIGNMENT') {
            suggestions.push({
                priority: 'HIGH',
                category: 'CAPACITY',
                title: '增加座位數量',
                description: '學生數量超過可用座位數量',
                implementation: '增加座位或減少學生數量'
            });
        }

        // 基於條件滿足率生成建議
        if (analysisResult.conditionSatisfactionRate < 0.8) {
            suggestions.push({
                priority: 'MEDIUM',
                category: 'CONDITIONS',
                title: '優化條件設定',
                description: '條件滿足率較低，建議重新評估條件設定',
                implementation: '簡化複雜條件或調整條件優先級'
            });
        }

        return this.prioritizeSuggestions(suggestions);
    }

    /**
     * 優先級排序建議
     * @param {Array} suggestions 建議列表
     * @returns {Array} 排序後的建議
     */
    prioritizeSuggestions(suggestions) {
        const priorityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

        return suggestions.sort((a, b) => {
            const aIndex = priorityOrder.indexOf(a.priority);
            const bIndex = priorityOrder.indexOf(b.priority);
            return aIndex - bIndex;
        });
    }

    /**
     * 分類失敗類型
     * @param {Object} failureResult 失敗結果
     * @returns {string} 失敗類型
     */
    categorizeFailure(failureResult) {
        if (failureResult.error?.includes('超時')) {
            return 'TIMEOUT';
        } else if (failureResult.error?.includes('衝突')) {
            return 'CONFLICT';
        } else if (failureResult.error?.includes('記憶體')) {
            return 'MEMORY';
        } else if (failureResult.unassignedStudents?.length > 0) {
            return 'INCOMPLETE_ASSIGNMENT';
        } else if (failureResult.conflicts?.length > 0) {
            return 'CONDITION_VIOLATION';
        } else {
            return 'UNKNOWN';
        }
    }

    /**
     * 計算分配率
     * @param {Object} assignmentResult 分配結果
     * @returns {number} 分配率
     */
    calculateAssignmentRate(assignmentResult) {
        const totalStudents = assignmentResult.totalStudents || 0;
        const assignedStudents = assignmentResult.assignment?.size || 0;
        return totalStudents > 0 ? assignedStudents / totalStudents : 0;
    }

    /**
     * 計算條件滿足率
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {number} 條件滿足率
     */
    calculateConditionSatisfactionRate(assignmentResult, config) {
        const conditions = config.conditions || [];
        if (conditions.length === 0) return 1;

        const satisfiedConditions = conditions.filter(condition => 
            this.analyzeConditionSatisfaction(condition, assignmentResult.assignment).isSatisfied
        ).length;

        return satisfiedConditions / conditions.length;
    }

    /**
     * 創建分配映射
     * @param {Map} assignment 分配結果
     * @returns {Object} 分配映射
     */
    createAssignmentMap(assignment) {
        const map = {};
        if (assignment) {
            for (const [studentId, seat] of assignment) {
                map[studentId] = seat;
            }
        }
        return map;
    }

    /**
     * 分析未分配學生
     * @param {Array} unassignedStudents 未分配學生列表
     * @returns {Object} 未分配學生分析
     */
    analyzeUnassignedStudents(unassignedStudents) {
        return {
            count: unassignedStudents?.length || 0,
            students: unassignedStudents || [],
            reasons: this.identifyUnassignmentReasons(unassignedStudents)
        };
    }

    /**
     * 識別未分配原因
     * @param {Array} unassignedStudents 未分配學生列表
     * @returns {Array} 未分配原因
     */
    identifyUnassignmentReasons(unassignedStudents) {
        // 這裡需要實現具體的原因識別邏輯
        return ['座位不足', '條件衝突', '算法限制'];
    }

    /**
     * 分析衝突
     * @param {Array} conflicts 衝突列表
     * @returns {Object} 衝突分析
     */
    analyzeConflicts(conflicts) {
        return {
            count: conflicts?.length || 0,
            conflicts: conflicts || [],
            types: this.categorizeConflicts(conflicts),
            severity: this.assessConflictSeverity(conflicts)
        };
    }

    /**
     * 分類衝突
     * @param {Array} conflicts 衝突列表
     * @returns {Object} 衝突分類
     */
    categorizeConflicts(conflicts) {
        const categories = {};
        if (conflicts) {
            for (const conflict of conflicts) {
                const type = conflict.type || 'UNKNOWN';
                categories[type] = (categories[type] || 0) + 1;
            }
        }
        return categories;
    }

    /**
     * 評估衝突嚴重程度
     * @param {Array} conflicts 衝突列表
     * @returns {string} 嚴重程度
     */
    assessConflictSeverity(conflicts) {
        if (!conflicts || conflicts.length === 0) return 'NONE';
        if (conflicts.length <= 2) return 'LOW';
        if (conflicts.length <= 5) return 'MEDIUM';
        return 'HIGH';
    }

    /**
     * 分析性能
     * @param {Object} performanceMetrics 性能指標
     * @returns {Object} 性能分析
     */
    analyzePerformance(performanceMetrics) {
        return {
            executionTime: performanceMetrics?.executionTime || 0,
            memoryUsage: performanceMetrics?.memoryUsage || [],
            cacheStats: performanceMetrics?.cacheStats || {},
            efficiency: this.calculateEfficiency(performanceMetrics)
        };
    }

    /**
     * 計算效率
     * @param {Object} performanceMetrics 性能指標
     * @returns {number} 效率分數
     */
    calculateEfficiency(performanceMetrics) {
        const executionTime = performanceMetrics?.executionTime || 0;
        return executionTime > 0 ? Math.min(1000 / executionTime, 1) : 1;
    }

    /**
     * 解釋條件滿足情況
     * @param {Array} conditions 條件列表
     * @param {Object} assignment 分配結果
     * @returns {Object} 條件解釋
     */
    explainConditions(conditions, assignment) {
        const conditionAnalysis = {
            totalConditions: conditions.length,
            satisfiedConditions: 0,
            unsatisfiedConditions: 0,
            conditionDetails: [],
            satisfactionRate: 0
        };

        for (const condition of conditions) {
            const satisfaction = this.analyzeConditionSatisfaction(condition, assignment);
            conditionAnalysis.conditionDetails.push(satisfaction);
            
            if (satisfaction.isSatisfied) {
                conditionAnalysis.satisfiedConditions++;
            } else {
                conditionAnalysis.unsatisfiedConditions++;
            }
        }

        conditionAnalysis.satisfactionRate = conditionAnalysis.totalConditions > 0 ? 
            conditionAnalysis.satisfiedConditions / conditionAnalysis.totalConditions : 0;

        return conditionAnalysis;
    }

    /**
     * 分析條件滿足情況
     * @param {Object} condition 條件對象
     * @param {Object} assignment 分配結果
     * @returns {Object} 條件分析
     */
    analyzeConditionSatisfaction(condition, assignment) {
        // 這裡需要實現具體的條件檢查邏輯
        // 暫時返回一個基本結構
        return {
            conditionId: condition.id,
            conditionType: condition.type,
            isSatisfied: true, // 需要根據實際邏輯判斷
            satisfactionDetails: '條件已滿足',
            affectedStudents: condition.students?.flat() || []
        };
    }

    /**
     * 清理配置信息
     * @param {Object} config 配置對象
     * @returns {Object} 清理後的配置
     */
    sanitizeConfig(config) {
        // 移除敏感信息，只保留必要的配置
        return {
            studentCount: config.students?.length || 0,
            seatCount: config.seats?.length || 0,
            conditionCount: config.conditions?.length || 0,
            options: config.options || {}
        };
    }

    /**
     * 格式化為文本
     * @param {Object} report 報告對象
     * @returns {string} 文本格式報告
     */
    formatAsText(report) {
        let text = `座位分配報告\n`;
        text += `生成時間: ${report.metadata.generatedAt}\n\n`;
        text += `摘要:\n`;
        text += `- 成功: ${report.summary.success ? '是' : '否'}\n`;
        text += `- 分配學生數: ${report.summary.totalStudents}\n`;
        text += `- 未分配學生數: ${report.summary.unassignedStudents}\n`;
        text += `- 分配率: ${(report.summary.assignmentRate * 100).toFixed(1)}%\n`;
        text += `- 執行時間: ${report.summary.executionTime}ms\n`;
        text += `- 衝突數: ${report.summary.conflicts}\n\n`;

        if (report.recommendations && report.recommendations.length > 0) {
            text += `建議:\n`;
            report.recommendations.forEach((rec, index) => {
                text += `${index + 1}. ${rec.title} (${rec.priority})\n`;
                text += `   ${rec.description}\n`;
                text += `   實施: ${rec.implementation}\n\n`;
            });
        }

        return text;
    }

    /**
     * 格式化為HTML
     * @param {Object} report 報告對象
     * @returns {string} HTML格式報告
     */
    formatAsHTML(report) {
        let html = `<html><head><title>座位分配報告</title></head><body>`;
        html += `<h1>座位分配報告</h1>`;
        html += `<p><strong>生成時間:</strong> ${report.metadata.generatedAt}</p>`;
        
        html += `<h2>摘要</h2>`;
        html += `<ul>`;
        html += `<li><strong>成功:</strong> ${report.summary.success ? '是' : '否'}</li>`;
        html += `<li><strong>分配學生數:</strong> ${report.summary.totalStudents}</li>`;
        html += `<li><strong>未分配學生數:</strong> ${report.summary.unassignedStudents}</li>`;
        html += `<li><strong>分配率:</strong> ${(report.summary.assignmentRate * 100).toFixed(1)}%</li>`;
        html += `<li><strong>執行時間:</strong> ${report.summary.executionTime}ms</li>`;
        html += `<li><strong>衝突數:</strong> ${report.summary.conflicts}</li>`;
        html += `</ul>`;

        if (report.recommendations && report.recommendations.length > 0) {
            html += `<h2>建議</h2>`;
            html += `<ul>`;
            report.recommendations.forEach(rec => {
                html += `<li><strong>${rec.title}</strong> (${rec.priority})<br>`;
                html += `${rec.description}<br>`;
                html += `<em>實施: ${rec.implementation}</em></li>`;
            });
            html += `</ul>`;
        }

        html += `</body></html>`;
        return html;
    }

    /**
     * 格式化為Markdown
     * @param {Object} report 報告對象
     * @returns {string} Markdown格式報告
     */
    formatAsMarkdown(report) {
        let markdown = `# 座位分配報告\n\n`;
        markdown += `**生成時間:** ${report.metadata.generatedAt}\n\n`;
        
        markdown += `## 摘要\n\n`;
        markdown += `- **成功:** ${report.summary.success ? '是' : '否'}\n`;
        markdown += `- **分配學生數:** ${report.summary.totalStudents}\n`;
        markdown += `- **未分配學生數:** ${report.summary.unassignedStudents}\n`;
        markdown += `- **分配率:** ${(report.summary.assignmentRate * 100).toFixed(1)}%\n`;
        markdown += `- **執行時間:** ${report.summary.executionTime}ms\n`;
        markdown += `- **衝突數:** ${report.summary.conflicts}\n\n`;

        if (report.recommendations && report.recommendations.length > 0) {
            markdown += `## 建議\n\n`;
            report.recommendations.forEach((rec, index) => {
                markdown += `### ${index + 1}. ${rec.title} (${rec.priority})\n\n`;
                markdown += `${rec.description}\n\n`;
                markdown += `**實施:** ${rec.implementation}\n\n`;
            });
        }

        return markdown;
    }

    /**
     * 創建下載URL
     * @param {string} content 內容
     * @param {string} filename 文件名
     * @returns {string} 下載URL
     */
    createDownloadUrl(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        return URL.createObjectURL(blob);
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
     * 初始化報告生成器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.reportTemplates = this.initializeReportTemplates();
        this.logger.info('報告生成器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            maxReportLength: this.options.maxReportLength
        });
    }

    /**
     * 銷毀報告生成器
     */
    dispose() {
        this.logger.info('報告生成器銷毀完成');
    }
}

module.exports = { ReportGenerator };
