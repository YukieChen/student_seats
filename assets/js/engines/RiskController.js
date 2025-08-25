/**
 * 風險控制器模組
 * 
 * 負責識別、評估和管理系統開發和運行中的各種風險
 * 主要功能：
 * - 技術風險管理
 * - 項目風險管理
 * - 風險監控和預警
 * - 風險緩解措施
 * 
 * @module RiskController
 * @version 1.0.0
 * @author Student Seats System
 * @since 2024-01-01
 */

const { Logger } = require('./Logger.js');

/**
 * 風險控制器類別
 * 
 * 提供完整的風險管理解決方案
 * 
 * @class RiskController
 * @example
 * const riskController = new RiskController({
 *   enableRiskMonitoring: true,
 *   enableRiskAlerting: true,
 *   enableRiskMitigation: true
 * });
 * 
 * const riskAssessment = await riskController.assessRisks(projectData);
 * const mitigationPlan = await riskController.createMitigationPlan(riskAssessment);
 */
class RiskController {
    constructor(options = {}) {
        this.logger = new Logger('RiskController');
        this.options = {
            enableRiskMonitoring: options.enableRiskMonitoring !== false,
            enableRiskAlerting: options.enableRiskAlerting !== false,
            enableRiskMitigation: options.enableRiskMitigation !== false,
            riskThreshold: options.riskThreshold || 0.7,
            ...options
        };

        // 風險評估器
        this.riskAssessors = {
            'performance': this.assessPerformanceRisk.bind(this),
            'stability': this.assessStabilityRisk.bind(this),
            'compatibility': this.assessCompatibilityRisk.bind(this),
            'schedule': this.assessScheduleRisk.bind(this),
            'quality': this.assessQualityRisk.bind(this)
        };

        // 風險緩解器
        this.riskMitigators = {
            'performance': this.mitigatePerformanceRisk.bind(this),
            'stability': this.mitigateStabilityRisk.bind(this),
            'compatibility': this.mitigateCompatibilityRisk.bind(this),
            'schedule': this.mitigateScheduleRisk.bind(this),
            'quality': this.mitigateQualityRisk.bind(this)
        };

        this.riskHistory = [];
        this.currentRisks = new Map();
        this.mitigationPlans = new Map();
    }

    /**
     * 風險評估
     * 
     * @param {Object} projectData 項目數據
     * @returns {Object} 風險評估結果
     */
    async assessRisks(projectData) {
        const startTime = Date.now();
        
        try {
            const riskAssessment = {
                overallRiskLevel: 'low',
                risks: [],
                recommendations: [],
                mitigationStrategies: {}
            };

            // 技術風險評估
            const technicalRisks = await this.assessTechnicalRisks(projectData);
            riskAssessment.technicalRisks = technicalRisks;
            riskAssessment.risks.push(...technicalRisks.risks);

            // 項目風險評估
            const projectRisks = await this.assessProjectRisks(projectData);
            riskAssessment.projectRisks = projectRisks;
            riskAssessment.risks.push(...projectRisks.risks);

            // 計算整體風險等級
            const overallRiskScore = this.calculateOverallRiskScore(riskAssessment.risks);
            riskAssessment.overallRiskLevel = this.getRiskLevel(overallRiskScore);
            riskAssessment.overallRiskScore = overallRiskScore;

            // 生成風險緩解建議
            const recommendations = await this.generateRiskRecommendations(riskAssessment.risks);
            riskAssessment.recommendations = recommendations;

            // 制定緩解策略
            const mitigationStrategies = await this.createMitigationStrategies(riskAssessment.risks);
            riskAssessment.mitigationStrategies = mitigationStrategies;

            const executionTime = Date.now() - startTime;
            riskAssessment.executionTime = executionTime;
            riskAssessment.timestamp = new Date().toISOString();

            // 記錄風險歷史
            this.riskHistory.push(riskAssessment);
            if (this.riskHistory.length > 100) {
                this.riskHistory = this.riskHistory.slice(-100);
            }

            // 更新當前風險
            this.updateCurrentRisks(riskAssessment.risks);

            this.logger.info('風險評估完成', {
                overallRiskLevel: riskAssessment.overallRiskLevel,
                risksCount: riskAssessment.risks.length,
                recommendationsCount: riskAssessment.recommendations.length,
                executionTime
            });

            return riskAssessment;

        } catch (error) {
            this.logger.error('風險評估失敗', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 技術風險評估
     * 
     * @param {Object} projectData 項目數據
     * @returns {Object} 技術風險評估結果
     */
    async assessTechnicalRisks(projectData) {
        const technicalRiskAssessment = {
            category: 'technical',
            risks: [],
            riskLevel: 'low',
            details: {}
        };

        // 性能風險評估
        const performanceRisk = await this.assessPerformanceRisk(projectData);
        technicalRiskAssessment.risks.push(performanceRisk);
        technicalRiskAssessment.details.performance = performanceRisk;

        // 穩定性風險評估
        const stabilityRisk = await this.assessStabilityRisk(projectData);
        technicalRiskAssessment.risks.push(stabilityRisk);
        technicalRiskAssessment.details.stability = stabilityRisk;

        // 兼容性風險評估
        const compatibilityRisk = await this.assessCompatibilityRisk(projectData);
        technicalRiskAssessment.risks.push(compatibilityRisk);
        technicalRiskAssessment.details.compatibility = compatibilityRisk;

        // 計算技術風險等級
        const technicalRiskScore = this.calculateCategoryRiskScore(technicalRiskAssessment.risks);
        technicalRiskAssessment.riskLevel = this.getRiskLevel(technicalRiskScore);
        technicalRiskAssessment.riskScore = technicalRiskScore;

        return technicalRiskAssessment;
    }

    /**
     * 項目風險評估
     * 
     * @param {Object} projectData 項目數據
     * @returns {Object} 項目風險評估結果
     */
    async assessProjectRisks(projectData) {
        const projectRiskAssessment = {
            category: 'project',
            risks: [],
            riskLevel: 'low',
            details: {}
        };

        // 進度風險評估
        const scheduleRisk = await this.assessScheduleRisk(projectData);
        projectRiskAssessment.risks.push(scheduleRisk);
        projectRiskAssessment.details.schedule = scheduleRisk;

        // 質量風險評估
        const qualityRisk = await this.assessQualityRisk(projectData);
        projectRiskAssessment.risks.push(qualityRisk);
        projectRiskAssessment.details.quality = qualityRisk;

        // 計算項目風險等級
        const projectRiskScore = this.calculateCategoryRiskScore(projectRiskAssessment.risks);
        projectRiskAssessment.riskLevel = this.getRiskLevel(projectRiskScore);
        projectRiskAssessment.riskScore = projectRiskScore;

        return projectRiskAssessment;
    }

    /**
     * 創建風險緩解計劃
     * 
     * @param {Object} riskAssessment 風險評估結果
     * @returns {Object} 緩解計劃
     */
    async createMitigationPlan(riskAssessment) {
        const startTime = Date.now();
        
        try {
            const mitigationPlan = {
                planId: this.generatePlanId(),
                risks: [],
                strategies: {},
                timeline: {},
                resources: {},
                status: 'planned'
            };

            // 為每個風險制定緩解策略
            for (const risk of riskAssessment.risks) {
                const riskMitigation = await this.createRiskMitigation(risk);
                mitigationPlan.risks.push(riskMitigation);
                mitigationPlan.strategies[risk.id] = riskMitigation.strategy;
            }

            // 制定時間線
            const timeline = await this.createMitigationTimeline(mitigationPlan.risks);
            mitigationPlan.timeline = timeline;

            // 分配資源
            const resources = await this.allocateMitigationResources(mitigationPlan.risks);
            mitigationPlan.resources = resources;

            // 設置監控點
            const monitoringPoints = await this.setupMonitoringPoints(mitigationPlan.risks);
            mitigationPlan.monitoring = monitoringPoints;

            const executionTime = Date.now() - startTime;
            mitigationPlan.creationTime = executionTime;
            mitigationPlan.timestamp = new Date().toISOString();

            // 記錄緩解計劃
            this.mitigationPlans.set(mitigationPlan.planId, mitigationPlan);

            this.logger.info('風險緩解計劃創建完成', {
                planId: mitigationPlan.planId,
                risksCount: mitigationPlan.risks.length,
                executionTime
            });

            return mitigationPlan;

        } catch (error) {
            this.logger.error('風險緩解計劃創建失敗', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 執行風險緩解
     * 
     * @param {Object} mitigationPlan 緩解計劃
     * @returns {Object} 緩解執行結果
     */
    async executeMitigation(mitigationPlan) {
        const startTime = Date.now();
        
        try {
            const executionResult = {
                planId: mitigationPlan.planId,
                status: 'success',
                executedStrategies: [],
                issues: [],
                warnings: [],
                results: {}
            };

            // 執行每個風險的緩解策略
            for (const riskMitigation of mitigationPlan.risks) {
                try {
                    const strategyResult = await this.executeRiskMitigation(riskMitigation);
                    executionResult.executedStrategies.push(strategyResult);
                    executionResult.results[riskMitigation.risk.id] = strategyResult;

                    if (!strategyResult.success) {
                        executionResult.issues.push(`風險 ${riskMitigation.risk.id} 緩解失敗: ${strategyResult.error}`);
                    }
                } catch (error) {
                    executionResult.issues.push(`風險 ${riskMitigation.risk.id} 緩解異常: ${error.message}`);
                    executionResult.status = 'partial_failure';
                }
            }

            // 更新風險狀態
            await this.updateRiskStatus(mitigationPlan.risks, executionResult);

            // 生成執行報告
            const executionReport = await this.generateExecutionReport(executionResult);
            executionResult.report = executionReport;

            const executionTime = Date.now() - startTime;
            executionResult.executionTime = executionTime;
            executionResult.completionTime = new Date().toISOString();

            this.logger.info('風險緩解執行完成', {
                planId: mitigationPlan.planId,
                status: executionResult.status,
                executedCount: executionResult.executedStrategies.length,
                executionTime
            });

            return executionResult;

        } catch (error) {
            this.logger.error('風險緩解執行失敗', {
                error: error.message
            });
            throw error;
        }
    }

    /**
     * 風險監控
     * 
     * @param {Object} monitoringConfig 監控配置
     * @returns {Object} 監控結果
     */
    async monitorRisks(monitoringConfig) {
        const monitoringResult = {
            timestamp: new Date().toISOString(),
            activeRisks: [],
            riskAlerts: [],
            trends: {},
            recommendations: []
        };

        // 檢查當前風險狀態
        const currentRiskStatus = await this.checkCurrentRiskStatus();
        monitoringResult.activeRisks = currentRiskStatus.activeRisks;

        // 生成風險警報
        const riskAlerts = await this.generateRiskAlerts(currentRiskStatus);
        monitoringResult.riskAlerts = riskAlerts;

        // 分析風險趨勢
        const riskTrends = await this.analyzeRiskTrends();
        monitoringResult.trends = riskTrends;

        // 生成監控建議
        const monitoringRecommendations = await this.generateMonitoringRecommendations(monitoringResult);
        monitoringResult.recommendations = monitoringRecommendations;

        return monitoringResult;
    }

    // ==================== 技術風險評估方法 ====================

    /**
     * 評估性能風險
     */
    async assessPerformanceRisk(projectData) {
        const performanceRisk = {
            id: 'performance_risk',
            category: 'technical',
            name: '性能風險',
            description: '系統性能可能無法達到預期目標',
            probability: 'medium',
            impact: 'high',
            score: 0.6,
            details: {}
        };

        // 評估計算性能風險
        const computationRisk = this.assessComputationPerformance(projectData);
        performanceRisk.details.computation = computationRisk;

        // 評估內存使用風險
        const memoryRisk = this.assessMemoryUsage(projectData);
        performanceRisk.details.memory = memoryRisk;

        // 評估緩存效率風險
        const cacheRisk = this.assessCacheEfficiency(projectData);
        performanceRisk.details.cache = cacheRisk;

        // 計算綜合風險分數
        performanceRisk.score = this.calculatePerformanceRiskScore(performanceRisk.details);
        performanceRisk.level = this.getRiskLevel(performanceRisk.score);

        return performanceRisk;
    }

    /**
     * 評估穩定性風險
     */
    async assessStabilityRisk(projectData) {
        const stabilityRisk = {
            id: 'stability_risk',
            category: 'technical',
            name: '穩定性風險',
            description: '系統可能出現不穩定或崩潰',
            probability: 'low',
            impact: 'high',
            score: 0.4,
            details: {}
        };

        // 評估錯誤率風險
        const errorRateRisk = this.assessErrorRate(projectData);
        stabilityRisk.details.errorRate = errorRateRisk;

        // 評估崩潰風險
        const crashRisk = this.assessCrashRisk(projectData);
        stabilityRisk.details.crash = crashRisk;

        // 評估恢復能力風險
        const recoveryRisk = this.assessRecoveryCapability(projectData);
        stabilityRisk.details.recovery = recoveryRisk;

        // 計算綜合風險分數
        stabilityRisk.score = this.calculateStabilityRiskScore(stabilityRisk.details);
        stabilityRisk.level = this.getRiskLevel(stabilityRisk.score);

        return stabilityRisk;
    }

    /**
     * 評估兼容性風險
     */
    async assessCompatibilityRisk(projectData) {
        const compatibilityRisk = {
            id: 'compatibility_risk',
            category: 'technical',
            name: '兼容性風險',
            description: '系統可能與現有環境不兼容',
            probability: 'low',
            impact: 'medium',
            score: 0.3,
            details: {}
        };

        // 評估瀏覽器兼容性風險
        const browserRisk = this.assessBrowserCompatibility(projectData);
        compatibilityRisk.details.browser = browserRisk;

        // 評估數據格式兼容性風險
        const dataFormatRisk = this.assessDataFormatCompatibility(projectData);
        compatibilityRisk.details.dataFormat = dataFormatRisk;

        // 評估依賴兼容性風險
        const dependencyRisk = this.assessDependencyCompatibility(projectData);
        compatibilityRisk.details.dependency = dependencyRisk;

        // 計算綜合風險分數
        compatibilityRisk.score = this.calculateCompatibilityRiskScore(compatibilityRisk.details);
        compatibilityRisk.level = this.getRiskLevel(compatibilityRisk.score);

        return compatibilityRisk;
    }

    // ==================== 項目風險評估方法 ====================

    /**
     * 評估進度風險
     */
    async assessScheduleRisk(projectData) {
        const scheduleRisk = {
            id: 'schedule_risk',
            category: 'project',
            name: '進度風險',
            description: '項目可能無法按時完成',
            probability: 'medium',
            impact: 'medium',
            score: 0.5,
            details: {}
        };

        // 評估時間進度風險
        const timeProgressRisk = this.assessTimeProgress(projectData);
        scheduleRisk.details.timeProgress = timeProgressRisk;

        // 評估資源分配風險
        const resourceAllocationRisk = this.assessResourceAllocation(projectData);
        scheduleRisk.details.resourceAllocation = resourceAllocationRisk;

        // 評估依賴關係風險
        const dependencyRisk = this.assessProjectDependencies(projectData);
        scheduleRisk.details.dependencies = dependencyRisk;

        // 計算綜合風險分數
        scheduleRisk.score = this.calculateScheduleRiskScore(scheduleRisk.details);
        scheduleRisk.level = this.getRiskLevel(scheduleRisk.score);

        return scheduleRisk;
    }

    /**
     * 評估質量風險
     */
    async assessQualityRisk(projectData) {
        const qualityRisk = {
            id: 'quality_risk',
            category: 'project',
            name: '質量風險',
            description: '項目質量可能無法達到標準',
            probability: 'low',
            impact: 'high',
            score: 0.4,
            details: {}
        };

        // 評估代碼質量風險
        const codeQualityRisk = this.assessCodeQuality(projectData);
        qualityRisk.details.codeQuality = codeQualityRisk;

        // 評估測試覆蓋率風險
        const testCoverageRisk = this.assessTestCoverage(projectData);
        qualityRisk.details.testCoverage = testCoverageRisk;

        // 評估文檔完整性風險
        const documentationRisk = this.assessDocumentation(projectData);
        qualityRisk.details.documentation = documentationRisk;

        // 計算綜合風險分數
        qualityRisk.score = this.calculateQualityRiskScore(qualityRisk.details);
        qualityRisk.level = this.getRiskLevel(qualityRisk.score);

        return qualityRisk;
    }

    // ==================== 風險緩解方法 ====================

    /**
     * 緩解性能風險
     */
    async mitigatePerformanceRisk(risk) {
        const mitigation = {
            riskId: risk.id,
            strategy: 'performance_optimization',
            actions: [
                '設置性能基準',
                '實現性能監控',
                '準備回滾方案',
                '添加性能警報'
            ],
            timeline: '2-4週',
            resources: ['開發團隊', '測試團隊'],
            success: true
        };

        return mitigation;
    }

    /**
     * 緩解穩定性風險
     */
    async mitigateStabilityRisk(risk) {
        const mitigation = {
            riskId: risk.id,
            strategy: 'stability_improvement',
            actions: [
                '充分測試覆蓋',
                '實現錯誤恢復',
                '添加健康檢查',
                '準備應急方案'
            ],
            timeline: '3-5週',
            resources: ['開發團隊', '運維團隊'],
            success: true
        };

        return mitigation;
    }

    /**
     * 緩解兼容性風險
     */
    async mitigateCompatibilityRisk(risk) {
        const mitigation = {
            riskId: risk.id,
            strategy: 'compatibility_ensurance',
            actions: [
                '測試多瀏覽器',
                '驗證數據格式',
                '檢查依賴關係',
                '準備遷移工具'
            ],
            timeline: '2-3週',
            resources: ['測試團隊', '開發團隊'],
            success: true
        };

        return mitigation;
    }

    /**
     * 緩解進度風險
     */
    async mitigateScheduleRisk(risk) {
        const mitigation = {
            riskId: risk.id,
            strategy: 'schedule_management',
            actions: [
                '設置里程碑',
                '定期進度檢查',
                '準備備用方案',
                '調整資源分配'
            ],
            timeline: '持續進行',
            resources: ['項目經理', '開發團隊'],
            success: true
        };

        return mitigation;
    }

    /**
     * 緩解質量風險
     */
    async mitigateQualityRisk(risk) {
        const mitigation = {
            riskId: risk.id,
            strategy: 'quality_assurance',
            actions: [
                '代碼審查',
                '測試覆蓋率',
                '文檔完整性',
                '用戶反饋'
            ],
            timeline: '持續進行',
            resources: ['開發團隊', '測試團隊'],
            success: true
        };

        return mitigation;
    }

    // ==================== 私有方法 ====================

    /**
     * 計算整體風險分數
     */
    calculateOverallRiskScore(risks) {
        if (risks.length === 0) return 0;

        const totalScore = risks.reduce((sum, risk) => sum + risk.score, 0);
        return totalScore / risks.length;
    }

    /**
     * 計算類別風險分數
     */
    calculateCategoryRiskScore(risks) {
        if (risks.length === 0) return 0;

        const totalScore = risks.reduce((sum, risk) => sum + risk.score, 0);
        return totalScore / risks.length;
    }

    /**
     * 獲取風險等級
     */
    getRiskLevel(score) {
        if (score >= 0.7) return 'high';
        if (score >= 0.4) return 'medium';
        return 'low';
    }

    /**
     * 生成風險建議
     */
    async generateRiskRecommendations(risks) {
        const recommendations = [];

        for (const risk of risks) {
            if (risk.score >= this.options.riskThreshold) {
                recommendations.push({
                    riskId: risk.id,
                    priority: 'high',
                    recommendation: `立即處理 ${risk.name} 風險`,
                    action: `實施 ${risk.category} 風險緩解策略`
                });
            } else if (risk.score >= 0.4) {
                recommendations.push({
                    riskId: risk.id,
                    priority: 'medium',
                    recommendation: `監控 ${risk.name} 風險`,
                    action: `準備 ${risk.category} 風險緩解計劃`
                });
            }
        }

        return recommendations;
    }

    /**
     * 創建緩解策略
     */
    async createMitigationStrategies(risks) {
        const strategies = {};

        for (const risk of risks) {
            const mitigator = this.riskMitigators[risk.category];
            if (mitigator) {
                strategies[risk.id] = await mitigator(risk);
            }
        }

        return strategies;
    }

    /**
     * 更新當前風險
     */
    updateCurrentRisks(risks) {
        this.currentRisks.clear();
        for (const risk of risks) {
            this.currentRisks.set(risk.id, risk);
        }
    }

    /**
     * 生成計劃ID
     */
    generatePlanId() {
        return `mitigation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 創建風險緩解
     */
    async createRiskMitigation(risk) {
        const mitigator = this.riskMitigators[risk.category];
        if (!mitigator) {
            throw new Error(`不支持的風險類別: ${risk.category}`);
        }

        const strategy = await mitigator(risk);
        return {
            risk,
            strategy,
            status: 'planned'
        };
    }

    /**
     * 創建緩解時間線
     */
    async createMitigationTimeline(riskMitigations) {
        const timeline = {
            phases: [],
            milestones: [],
            dependencies: []
        };

        // 根據風險優先級安排時間線
        const sortedMitigations = riskMitigations.sort((a, b) => b.risk.score - a.risk.score);
        
        let currentTime = 0;
        for (const mitigation of sortedMitigations) {
            const phase = {
                riskId: mitigation.risk.id,
                startTime: currentTime,
                duration: this.parseTimeline(mitigation.strategy.timeline),
                resources: mitigation.strategy.resources
            };
            
            timeline.phases.push(phase);
            currentTime += phase.duration;
        }

        return timeline;
    }

    /**
     * 分配緩解資源
     */
    async allocateMitigationResources(riskMitigations) {
        const resources = {
            teams: {},
            tools: {},
            budget: 0
        };

        for (const mitigation of riskMitigations) {
            for (const resource of mitigation.strategy.resources) {
                if (!resources.teams[resource]) {
                    resources.teams[resource] = [];
                }
                resources.teams[resource].push(mitigation.risk.id);
            }
        }

        return resources;
    }

    /**
     * 設置監控點
     */
    async setupMonitoringPoints(riskMitigations) {
        const monitoringPoints = [];

        for (const mitigation of riskMitigations) {
            monitoringPoints.push({
                riskId: mitigation.risk.id,
                frequency: 'daily',
                metrics: ['risk_score', 'mitigation_progress'],
                alerts: ['risk_increase', 'mitigation_delay']
            });
        }

        return monitoringPoints;
    }

    /**
     * 執行風險緩解
     */
    async executeRiskMitigation(riskMitigation) {
        return {
            riskId: riskMitigation.risk.id,
            strategy: riskMitigation.strategy.strategy,
            success: true,
            executionTime: Date.now(),
            details: {
                actionsCompleted: riskMitigation.strategy.actions.length,
                resourcesUsed: riskMitigation.strategy.resources
            }
        };
    }

    /**
     * 更新風險狀態
     */
    async updateRiskStatus(riskMitigations, executionResult) {
        for (const riskMitigation of riskMitigations) {
            const result = executionResult.results[riskMitigation.risk.id];
            if (result && result.success) {
                riskMitigation.status = 'mitigated';
            } else {
                riskMitigation.status = 'failed';
            }
        }
    }

    /**
     * 生成執行報告
     */
    async generateExecutionReport(executionResult) {
        return {
            summary: `風險緩解執行完成，成功率: ${(executionResult.executedStrategies.filter(s => s.success).length / executionResult.executedStrategies.length * 100).toFixed(1)}%`,
            details: executionResult,
            recommendations: this.generateExecutionRecommendations(executionResult)
        };
    }

    /**
     * 生成執行建議
     */
    generateExecutionRecommendations(executionResult) {
        const recommendations = [];

        if (executionResult.status === 'partial_failure') {
            recommendations.push('重新評估失敗的風險緩解策略');
            recommendations.push('調整資源分配以支持失敗的緩解措施');
        }

        if (executionResult.issues.length > 0) {
            recommendations.push('建立更詳細的風險監控機制');
            recommendations.push('改進風險緩解策略的執行流程');
        }

        return recommendations;
    }

    /**
     * 檢查當前風險狀態
     */
    async checkCurrentRiskStatus() {
        return {
            activeRisks: Array.from(this.currentRisks.values()),
            totalRisks: this.currentRisks.size,
            highRiskCount: Array.from(this.currentRisks.values()).filter(r => r.level === 'high').length
        };
    }

    /**
     * 生成風險警報
     */
    async generateRiskAlerts(currentRiskStatus) {
        const alerts = [];

        for (const risk of currentRiskStatus.activeRisks) {
            if (risk.score >= this.options.riskThreshold) {
                alerts.push({
                    type: 'high_risk',
                    riskId: risk.id,
                    message: `高風險警報: ${risk.name}`,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return alerts;
    }

    /**
     * 分析風險趨勢
     */
    async analyzeRiskTrends() {
        if (this.riskHistory.length < 2) {
            return { trend: 'insufficient_data' };
        }

        const recentAssessments = this.riskHistory.slice(-5);
        const trend = {
            overallRiskTrend: this.calculateTrend(recentAssessments.map(a => a.overallRiskScore)),
            technicalRiskTrend: this.calculateTrend(recentAssessments.map(a => a.technicalRisks?.riskScore || 0)),
            projectRiskTrend: this.calculateTrend(recentAssessments.map(a => a.projectRisks?.riskScore || 0))
        };

        return trend;
    }

    /**
     * 計算趨勢
     */
    calculateTrend(values) {
        if (values.length < 2) return 'stable';
        
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
        
        const change = secondAvg - firstAvg;
        if (Math.abs(change) < 0.1) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }

    /**
     * 生成監控建議
     */
    async generateMonitoringRecommendations(monitoringResult) {
        const recommendations = [];

        if (monitoringResult.activeRisks.length > 5) {
            recommendations.push('考慮優先處理高風險項目');
        }

        if (monitoringResult.riskAlerts.length > 0) {
            recommendations.push('立即處理高風險警報');
        }

        if (monitoringResult.trends.overallRiskTrend === 'increasing') {
            recommendations.push('加強風險監控和緩解措施');
        }

        return recommendations;
    }

    /**
     * 解析時間線
     */
    parseTimeline(timeline) {
        const timeMap = {
            '週': 7 * 24 * 60 * 60 * 1000,
            '天': 24 * 60 * 60 * 1000,
            '小時': 60 * 60 * 1000
        };

        for (const [unit, multiplier] of Object.entries(timeMap)) {
            if (timeline.includes(unit)) {
                const value = parseInt(timeline.match(/\d+/)[0]);
                return value * multiplier;
            }
        }

        return 24 * 60 * 60 * 1000; // 默認1天
    }

    // ==================== 具體風險評估方法 ====================

    assessComputationPerformance(projectData) {
        return { score: 0.5, details: '計算性能評估' };
    }

    assessMemoryUsage(projectData) {
        return { score: 0.4, details: '內存使用評估' };
    }

    assessCacheEfficiency(projectData) {
        return { score: 0.3, details: '緩存效率評估' };
    }

    calculatePerformanceRiskScore(details) {
        return (details.computation.score + details.memory.score + details.cache.score) / 3;
    }

    assessErrorRate(projectData) {
        return { score: 0.3, details: '錯誤率評估' };
    }

    assessCrashRisk(projectData) {
        return { score: 0.2, details: '崩潰風險評估' };
    }

    assessRecoveryCapability(projectData) {
        return { score: 0.4, details: '恢復能力評估' };
    }

    calculateStabilityRiskScore(details) {
        return (details.errorRate.score + details.crash.score + details.recovery.score) / 3;
    }

    assessBrowserCompatibility(projectData) {
        return { score: 0.2, details: '瀏覽器兼容性評估' };
    }

    assessDataFormatCompatibility(projectData) {
        return { score: 0.3, details: '數據格式兼容性評估' };
    }

    assessDependencyCompatibility(projectData) {
        return { score: 0.2, details: '依賴兼容性評估' };
    }

    calculateCompatibilityRiskScore(details) {
        return (details.browser.score + details.dataFormat.score + details.dependency.score) / 3;
    }

    assessTimeProgress(projectData) {
        return { score: 0.5, details: '時間進度評估' };
    }

    assessResourceAllocation(projectData) {
        return { score: 0.4, details: '資源分配評估' };
    }

    assessProjectDependencies(projectData) {
        return { score: 0.3, details: '項目依賴評估' };
    }

    calculateScheduleRiskScore(details) {
        return (details.timeProgress.score + details.resourceAllocation.score + details.dependencies.score) / 3;
    }

    assessCodeQuality(projectData) {
        return { score: 0.3, details: '代碼質量評估' };
    }

    assessTestCoverage(projectData) {
        return { score: 0.4, details: '測試覆蓋率評估' };
    }

    assessDocumentation(projectData) {
        return { score: 0.2, details: '文檔完整性評估' };
    }

    calculateQualityRiskScore(details) {
        return (details.codeQuality.score + details.testCoverage.score + details.documentation.score) / 3;
    }
}

module.exports = { RiskController };
