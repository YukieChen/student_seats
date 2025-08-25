// AssignmentExplainer.js - 結果解釋系統
export class AssignmentExplainer {
    constructor(options = {}) {
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
    }

    /**
     * 解釋分配結果
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 解釋結果
     */
    explainAssignment(assignmentResult, config) {
        const explanation = {
            summary: this.generateAssignmentSummary(assignmentResult),
            details: this.generateAssignmentDetails(assignmentResult, config),
            statistics: this.calculateAssignmentStatistics(assignmentResult),
            quality: this.assessAssignmentQuality(assignmentResult, config),
            timestamp: new Date().toISOString()
        };

        // 記錄分析歷史
        this.recordAnalysis(explanation);

        return explanation;
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
     * 解釋使用的策略
     * @param {Object} strategyInfo 策略信息
     * @returns {Object} 策略解釋
     */
    explainStrategy(strategyInfo) {
        return {
            strategyUsed: strategyInfo.strategy || 'unknown',
            strategyDescription: this.getStrategyDescription(strategyInfo.strategy),
            performance: this.analyzeStrategyPerformance(strategyInfo),
            alternatives: this.suggestAlternativeStrategies(strategyInfo),
            recommendations: this.generateStrategyRecommendations(strategyInfo)
        };
    }

    /**
     * 分析失敗原因
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 失敗分析
     */
    analyzeFailure(failureResult) {
        const analysis = {
            failureType: this.categorizeFailure(failureResult),
            rootCause: this.identifyRootCause(failureResult),
            impact: this.assessFailureImpact(failureResult),
            timeline: this.analyzeFailureTimeline(failureResult),
            suggestions: this.generateFailureSuggestions(failureResult)
        };

        return analysis;
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
     * 評估失敗影響
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 影響評估
     */
    assessFailureImpact(failureResult) {
        const impact = {
            severity: 'LOW',
            affectedStudents: 0,
            affectedSeats: 0,
            performanceImpact: 'MINIMAL',
            userExperienceImpact: 'MINIMAL'
        };

        // 評估嚴重程度
        if (failureResult.error?.includes('超時') || failureResult.error?.includes('記憶體')) {
            impact.severity = 'HIGH';
            impact.performanceImpact = 'SIGNIFICANT';
        } else if (failureResult.unassignedStudents?.length > 0) {
            impact.severity = 'MEDIUM';
            impact.affectedStudents = failureResult.unassignedStudents.length;
            impact.userExperienceImpact = 'MODERATE';
        } else if (failureResult.conflicts?.length > 0) {
            impact.severity = 'MEDIUM';
            impact.userExperienceImpact = 'MODERATE';
        }

        return impact;
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
                priority: this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.HIGH,
                category: 'PERFORMANCE',
                title: '優化算法性能',
                description: '考慮減少學生數量或簡化條件以提高執行速度',
                implementation: '調整超時設置或使用更高效的算法'
            });
        }

        if (analysisResult.failureType === 'CONFLICT') {
            suggestions.push({
                priority: this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.MEDIUM,
                category: 'LOGIC',
                title: '檢查條件設定',
                description: '檢查是否存在相互衝突的條件設定',
                implementation: '使用衝突檢測工具驗證條件一致性'
            });
        }

        if (analysisResult.failureType === 'INCOMPLETE_ASSIGNMENT') {
            suggestions.push({
                priority: this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.HIGH,
                category: 'CAPACITY',
                title: '增加座位數量',
                description: '學生數量超過可用座位數量',
                implementation: '增加座位或減少學生數量'
            });
        }

        // 基於條件滿足率生成建議
        if (analysisResult.conditionSatisfactionRate < 0.8) {
            suggestions.push({
                priority: this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.MEDIUM,
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
        const priorityOrder = [
            this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.CRITICAL,
            this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.HIGH,
            this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.MEDIUM,
            this.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.LOW
        ];

        return suggestions.sort((a, b) => {
            const aIndex = priorityOrder.indexOf(a.priority);
            const bIndex = priorityOrder.indexOf(b.priority);
            return aIndex - bIndex;
        });
    }

    /**
     * 評估建議可行性
     * @param {Object} suggestion 建議對象
     * @param {Object} context 上下文信息
     * @returns {Object} 可行性評估
     */
    assessSuggestionFeasibility(suggestion, context) {
        const feasibility = {
            isFeasible: true,
            difficulty: 'EASY',
            estimatedEffort: 'LOW',
            dependencies: [],
            risks: []
        };

        // 根據建議類型和上下文評估可行性
        switch (suggestion.category) {
            case 'PERFORMANCE':
                feasibility.difficulty = 'MEDIUM';
                feasibility.estimatedEffort = 'MEDIUM';
                feasibility.risks.push('可能影響分配質量');
                break;
            case 'LOGIC':
                feasibility.difficulty = 'EASY';
                feasibility.estimatedEffort = 'LOW';
                break;
            case 'CAPACITY':
                feasibility.difficulty = 'HARD';
                feasibility.estimatedEffort = 'HIGH';
                feasibility.dependencies.push('需要物理空間調整');
                break;
            case 'CONDITIONS':
                feasibility.difficulty = 'MEDIUM';
                feasibility.estimatedEffort = 'MEDIUM';
                feasibility.risks.push('可能影響用戶需求');
                break;
        }

        return feasibility;
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

    // ==================== 私有方法 ====================

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
     * 評估分配質量
     * @param {Object} assignmentResult 分配結果
     * @param {Object} config 配置信息
     * @returns {Object} 質量評估
     */
    assessAssignmentQuality(assignmentResult, config) {
        const quality = {
            overallScore: 0,
            completeness: 0,
            efficiency: 0,
            satisfaction: 0,
            issues: []
        };

        // 計算完整性
        const totalStudents = config.students?.length || 0;
        const assignedStudents = assignmentResult.assignment?.size || 0;
        quality.completeness = totalStudents > 0 ? assignedStudents / totalStudents : 0;

        // 計算效率
        const executionTime = assignmentResult.performanceMetrics?.executionTime || 0;
        quality.efficiency = executionTime > 0 ? Math.min(1000 / executionTime, 1) : 1;

        // 計算滿意度
        const conflicts = assignmentResult.conflicts?.length || 0;
        quality.satisfaction = conflicts > 0 ? Math.max(0, 1 - conflicts / 10) : 1;

        // 計算總分
        quality.overallScore = (quality.completeness * 0.4 + quality.efficiency * 0.3 + quality.satisfaction * 0.3);

        return quality;
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
     * 獲取策略描述
     * @param {string} strategy 策略名稱
     * @returns {string} 策略描述
     */
    getStrategyDescription(strategy) {
        const descriptions = {
            'backtrack': '回溯算法，通過嘗試不同組合找到最優解',
            'greedy': '貪心算法，優先考慮當前最佳選擇',
            'genetic': '遺傳算法，通過進化過程優化解',
            'simulated_annealing': '模擬退火算法，通過溫度控制避免局部最優'
        };
        return descriptions[strategy] || '未知策略';
    }

    /**
     * 分析策略性能
     * @param {Object} strategyInfo 策略信息
     * @returns {Object} 性能分析
     */
    analyzeStrategyPerformance(strategyInfo) {
        return {
            executionTime: strategyInfo.executionTime || 0,
            memoryUsage: strategyInfo.memoryUsage || 0,
            iterations: strategyInfo.iterations || 0,
            successRate: strategyInfo.successRate || 0
        };
    }

    /**
     * 建議替代策略
     * @param {Object} strategyInfo 策略信息
     * @returns {Array} 替代策略列表
     */
    suggestAlternativeStrategies(strategyInfo) {
        const alternatives = [];
        
        if (strategyInfo.strategy === 'backtrack') {
            alternatives.push('greedy', 'genetic');
        } else if (strategyInfo.strategy === 'greedy') {
            alternatives.push('backtrack', 'simulated_annealing');
        }

        return alternatives.map(strategy => ({
            name: strategy,
            description: this.getStrategyDescription(strategy),
            expectedPerformance: this.estimateStrategyPerformance(strategy)
        }));
    }

    /**
     * 生成策略建議
     * @param {Object} strategyInfo 策略信息
     * @returns {Array} 策略建議
     */
    generateStrategyRecommendations(strategyInfo) {
        const recommendations = [];

        if (strategyInfo.executionTime > 5000) {
            recommendations.push({
                type: 'PERFORMANCE',
                suggestion: '考慮使用更高效的算法',
                priority: 'HIGH'
            });
        }

        if (strategyInfo.successRate < 0.8) {
            recommendations.push({
                type: 'EFFECTIVENESS',
                suggestion: '嘗試不同的策略組合',
                priority: 'MEDIUM'
            });
        }

        return recommendations;
    }

    /**
     * 識別根本原因
     * @param {Object} failureResult 失敗結果
     * @returns {string} 根本原因
     */
    identifyRootCause(failureResult) {
        if (failureResult.error?.includes('超時')) {
            return '算法複雜度過高或數據規模過大';
        } else if (failureResult.error?.includes('衝突')) {
            return '條件設定存在邏輯衝突';
        } else if (failureResult.error?.includes('記憶體')) {
            return '系統資源不足';
        } else {
            return '未知原因，需要進一步分析';
        }
    }

    /**
     * 分析失敗時間線
     * @param {Object} failureResult 失敗結果
     * @returns {Object} 時間線分析
     */
    analyzeFailureTimeline(failureResult) {
        return {
            startTime: failureResult.performanceMetrics?.startTime || 0,
            failureTime: failureResult.performanceMetrics?.endTime || 0,
            duration: failureResult.performanceMetrics?.executionTime || 0,
            failurePoint: '算法執行階段'
        };
    }

    /**
     * 生成失敗建議
     * @param {Object} failureResult 失敗結果
     * @returns {Array} 失敗建議
     */
    generateFailureSuggestions(failureResult) {
        const suggestions = [];

        if (failureResult.error?.includes('超時')) {
            suggestions.push('增加超時時間或優化算法');
        }

        if (failureResult.error?.includes('衝突')) {
            suggestions.push('檢查並修正條件設定');
        }

        if (failureResult.error?.includes('記憶體')) {
            suggestions.push('增加系統資源或優化記憶體使用');
        }

        return suggestions;
    }

    /**
     * 記錄分析歷史
     * @param {Object} analysis 分析結果
     */
    recordAnalysis(analysis) {
        this.analysisHistory.push({
            ...analysis,
            timestamp: new Date().toISOString()
        });

        // 限制歷史記錄大小
        if (this.analysisHistory.length > 100) {
            this.analysisHistory.shift();
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
        return text;
    }

    /**
     * 格式化為HTML
     * @param {Object} report 報告對象
     * @returns {string} HTML格式報告
     */
    formatAsHTML(report) {
        return `<html><body><h1>座位分配報告</h1><p>生成時間: ${report.metadata.generatedAt}</p></body></html>`;
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
     * 估計策略性能
     * @param {string} strategy 策略名稱
     * @returns {Object} 性能估計
     */
    estimateStrategyPerformance(strategy) {
        const estimates = {
            'backtrack': { time: 'MEDIUM', memory: 'LOW', success: 'HIGH' },
            'greedy': { time: 'FAST', memory: 'LOW', success: 'MEDIUM' },
            'genetic': { time: 'SLOW', memory: 'HIGH', success: 'HIGH' },
            'simulated_annealing': { time: 'MEDIUM', memory: 'MEDIUM', success: 'HIGH' }
        };
        return estimates[strategy] || { time: 'UNKNOWN', memory: 'UNKNOWN', success: 'UNKNOWN' };
    }

    /**
     * 清理資源
     */
    dispose() {
        this.analysisHistory = [];
    }
}
