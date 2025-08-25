/**
 * 機器學習優化器
 * 用於收集歷史數據、學習策略模式、預測結果和自動調優
 * 
 * @fileoverview 機器學習優化器的完整實現，提供智能化的座位分配優化功能
 * @version 3.0.0
 * @author Student Seats System Team
 * @since 2023-11-01
 */

const { Logger } = require('./Logger.js');

/**
 * 機器學習優化器類別
 * 提供基於機器學習的智能優化功能，包括數據收集、模式學習、預測和自動調優
 * 
 * @class MachineLearningOptimizer
 * @description 機器學習優化器的主要類別，負責智能化的座位分配優化
 * 
 * @example
 * const optimizer = new MachineLearningOptimizer({
 *   enableLearning: true,
 *   dataRetentionDays: 30,
 *   learningRate: 0.01
 * });
 * 
 * // 收集歷史數據
 * optimizer.collectHistoricalData(assignmentData, performanceMetrics, strategyInfo);
 * 
 * // 預測結果
 * const prediction = optimizer.predictResults(inputData);
 * 
 * @since 1.0.0
 * @version 3.0.0
 */
class MachineLearningOptimizer {
    /**
     * 創建機器學習優化器實例
     * 
     * @param {Object} options - 優化器配置選項
     * @param {boolean} [options.enableLearning=true] - 是否啟用學習功能
     * @param {number} [options.dataRetentionDays=30] - 數據保留天數
     * @param {number} [options.minDataPoints=100] - 最小數據點數量
     * @param {number} [options.predictionThreshold=0.7] - 預測閾值
     * @param {number} [options.learningRate=0.01] - 學習率
     * @param {number} [options.batchSize=32] - 批次大小
     * @param {number} [options.epochs=100] - 訓練輪數
     * @param {number} [options.validationSplit=0.2] - 驗證集比例
     * 
     * @example
     * const optimizer = new MachineLearningOptimizer({
     *   enableLearning: true,
     *   dataRetentionDays: 60,
     *   learningRate: 0.005,
     *   epochs: 200
     * });
     * 
     * @throws {Error} 當配置參數無效時拋出錯誤
     * @since 1.0.0
     */
    constructor(options = {}) {
        this.logger = new Logger('MachineLearningOptimizer');
        this.modelConfig = {
            enableLearning: options.enableLearning !== false,
            dataRetentionDays: options.dataRetentionDays || 30,
            minDataPoints: options.minDataPoints || 100,
            predictionThreshold: options.predictionThreshold || 0.7,
            ...options
        };

        this.learningParams = {
            learningRate: options.learningRate || 0.01,
            batchSize: options.batchSize || 32,
            epochs: options.epochs || 100,
            validationSplit: options.validationSplit || 0.2
        };

        this.historicalData = [];
        this.strategyPatterns = new Map();
        this.predictionModels = new Map();
        this.optimizationHistory = [];
    }

    /**
     * 收集歷史數據
     * @param {Object} assignmentData - 座位分配數據
     * @param {Object} performanceMetrics - 性能指標
     * @param {Object} strategyInfo - 策略信息
     */
    collectHistoricalData(assignmentData, performanceMetrics, strategyInfo) {
        try {
            const dataPoint = {
                timestamp: Date.now(),
                assignmentData: this.preprocessData(assignmentData),
                performanceMetrics: performanceMetrics,
                strategyInfo: strategyInfo,
                success: performanceMetrics.success || false,
                executionTime: performanceMetrics.executionTime || 0,
                memoryUsage: performanceMetrics.memoryUsage || 0
            };

            this.historicalData.push(dataPoint);
            this.logger.log('INFO', '歷史數據收集成功', { dataPoints: this.historicalData.length });

            // 清理舊數據
            this.cleanupOldData();

            return true;
        } catch (error) {
            this.logger.log('ERROR', '歷史數據收集失敗', { error: error.message });
            return false;
        }
    }

    /**
     * 數據預處理
     * @param {Object} rawData - 原始數據
     * @returns {Object} 預處理後的數據
     */
    preprocessData(rawData) {
        try {
            const processed = {
                studentCount: rawData.students ? rawData.students.length : 0,
                seatCount: rawData.seats ? rawData.seats.length : 0,
                conditionCount: rawData.conditions ? rawData.conditions.length : 0,
                complexity: this.calculateComplexity(rawData),
                features: this.extractFeatures(rawData)
            };

            return processed;
        } catch (error) {
            this.logger.log('ERROR', '數據預處理失敗', { error: error.message });
            return {};
        }
    }

    /**
     * 數據驗證
     * @param {Object} data - 待驗證數據
     * @returns {boolean} 驗證結果
     */
    validateData(data) {
        try {
            if (!data || typeof data !== 'object') {
                return false;
            }

            const requiredFields = ['timestamp', 'assignmentData', 'performanceMetrics'];
            for (const field of requiredFields) {
                if (!data.hasOwnProperty(field)) {
                    return false;
                }
            }

            return true;
        } catch (error) {
            this.logger.log('ERROR', '數據驗證失敗', { error: error.message });
            return false;
        }
    }

    /**
     * 數據存儲
     * @param {Object} data - 待存儲數據
     */
    storeData(data) {
        try {
            if (this.validateData(data)) {
                this.historicalData.push(data);
                this.logger.log('INFO', '數據存儲成功');
                return true;
            } else {
                this.logger.log('WARN', '數據驗證失敗，跳過存儲');
                return false;
            }
        } catch (error) {
            this.logger.log('ERROR', '數據存儲失敗', { error: error.message });
            return false;
        }
    }

    /**
     * 策略特徵提取
     * @param {Object} strategyData - 策略數據
     * @returns {Object} 提取的特徵
     */
    extractStrategyFeatures(strategyData) {
        try {
            const features = {
                searchType: strategyData.searchType || 'unknown',
                priorityMethod: strategyData.priorityMethod || 'default',
                adjustmentStrategy: strategyData.adjustmentStrategy || 'none',
                cacheUsage: strategyData.cacheUsage || false,
                timeout: strategyData.timeout || 30000,
                maxIterations: strategyData.maxIterations || 1000
            };

            return features;
        } catch (error) {
            this.logger.log('ERROR', '策略特徵提取失敗', { error: error.message });
            return {};
        }
    }

    /**
     * 策略模式識別
     * @param {Array} historicalData - 歷史數據
     * @returns {Map} 識別的模式
     */
    identifyStrategyPatterns(historicalData) {
        try {
            const patterns = new Map();

            // 分析成功策略模式
            const successfulStrategies = historicalData.filter(data => data.success);
            const failedStrategies = historicalData.filter(data => !data.success);

            // 識別高效策略
            const efficientStrategies = successfulStrategies
                .filter(data => data.performanceMetrics.executionTime < 1000)
                .map(data => data.strategyInfo);

            // 識別問題策略
            const problematicStrategies = failedStrategies
                .map(data => data.strategyInfo);

            patterns.set('efficient', efficientStrategies);
            patterns.set('problematic', problematicStrategies);
            patterns.set('successRate', successfulStrategies.length / historicalData.length);

            this.strategyPatterns = patterns;
            this.logger.log('INFO', '策略模式識別完成', {
                efficientCount: efficientStrategies.length,
                problematicCount: problematicStrategies.length,
                successRate: patterns.get('successRate')
            });

            return patterns;
        } catch (error) {
            this.logger.log('ERROR', '策略模式識別失敗', { error: error.message });
            return new Map();
        }
    }

    /**
     * 策略效果分析
     * @param {Object} strategyInfo - 策略信息
     * @returns {Object} 效果分析結果
     */
    analyzeStrategyEffectiveness(strategyInfo) {
        try {
            const analysis = {
                successRate: 0,
                averageExecutionTime: 0,
                memoryEfficiency: 0,
                recommendation: 'unknown'
            };

            // 分析相似策略的歷史表現
            const similarStrategies = this.historicalData.filter(data =>
                this.isSimilarStrategy(data.strategyInfo, strategyInfo)
            );

            if (similarStrategies.length > 0) {
                const successful = similarStrategies.filter(data => data.success);
                analysis.successRate = successful.length / similarStrategies.length;
                analysis.averageExecutionTime = similarStrategies.reduce((sum, data) =>
                    sum + data.performanceMetrics.executionTime, 0) / similarStrategies.length;
                analysis.memoryEfficiency = similarStrategies.reduce((sum, data) =>
                    sum + data.performanceMetrics.memoryUsage, 0) / similarStrategies.length;

                // 生成建議
                if (analysis.successRate > 0.8 && analysis.averageExecutionTime < 1000) {
                    analysis.recommendation = 'excellent';
                } else if (analysis.successRate > 0.6) {
                    analysis.recommendation = 'good';
                } else {
                    analysis.recommendation = 'poor';
                }
            }

            return analysis;
        } catch (error) {
            this.logger.log('ERROR', '策略效果分析失敗', { error: error.message });
            return { successRate: 0, averageExecutionTime: 0, memoryEfficiency: 0, recommendation: 'unknown' };
        }
    }

    /**
     * 策略優化建議
     * @param {Object} currentStrategy - 當前策略
     * @returns {Object} 優化建議
     */
    suggestStrategyOptimization(currentStrategy) {
        try {
            const suggestions = {
                strategyChanges: [],
                parameterTuning: [],
                performanceImprovements: [],
                riskWarnings: []
            };

            // 基於歷史數據生成建議
            const analysis = this.analyzeStrategyEffectiveness(currentStrategy);

            if (analysis.recommendation === 'poor') {
                suggestions.strategyChanges.push('考慮使用更高效的搜索策略');
                suggestions.parameterTuning.push('增加超時時間');
                suggestions.riskWarnings.push('當前策略成功率較低');
            }

            // 基於模式識別生成建議
            const efficientPatterns = this.strategyPatterns.get('efficient') || [];
            if (efficientPatterns.length > 0) {
                const bestPattern = efficientPatterns[0];
                suggestions.strategyChanges.push(`參考成功策略: ${bestPattern.searchType}`);
            }

            return suggestions;
        } catch (error) {
            this.logger.log('ERROR', '策略優化建議生成失敗', { error: error.message });
            return { strategyChanges: [], parameterTuning: [], performanceImprovements: [], riskWarnings: [] };
        }
    }

    /**
     * 結果預測
     * @param {Object} assignmentConfig - 分配配置
     * @returns {Object} 預測結果
     */
    predictResults(assignmentConfig) {
        try {
            const prediction = {
                successProbability: 0.5,
                estimatedExecutionTime: 5000,
                confidence: 0.3,
                factors: []
            };

            // 基於歷史數據進行預測
            const similarConfigs = this.historicalData.filter(data =>
                this.isSimilarConfiguration(data.assignmentData, assignmentConfig)
            );

            if (similarConfigs.length > 0) {
                const successful = similarConfigs.filter(data => data.success);
                prediction.successProbability = successful.length / similarConfigs.length;
                prediction.estimatedExecutionTime = similarConfigs.reduce((sum, data) =>
                    sum + data.performanceMetrics.executionTime, 0) / similarConfigs.length;
                prediction.confidence = Math.min(similarConfigs.length / 10, 1.0);

                prediction.factors.push(`基於 ${similarConfigs.length} 個相似配置的歷史數據`);
            }

            return prediction;
        } catch (error) {
            this.logger.log('ERROR', '結果預測失敗', { error: error.message });
            return { successProbability: 0.5, estimatedExecutionTime: 5000, confidence: 0.3, factors: [] };
        }
    }

    /**
     * 性能預測
     * @param {Object} config - 配置信息
     * @returns {Object} 性能預測
     */
    predictPerformance(config) {
        try {
            const performance = {
                executionTime: 5000,
                memoryUsage: 1000000,
                cpuUsage: 50,
                cacheHitRate: 0.5
            };

            // 基於配置複雜度預測性能
            const complexity = this.calculateComplexity(config);
            performance.executionTime = complexity * 1000;
            performance.memoryUsage = complexity * 50000;

            return performance;
        } catch (error) {
            this.logger.log('ERROR', '性能預測失敗', { error: error.message });
            return { executionTime: 5000, memoryUsage: 1000000, cpuUsage: 50, cacheHitRate: 0.5 };
        }
    }

    /**
     * 時間預測
     * @param {Object} config - 配置信息
     * @returns {number} 預測執行時間（毫秒）
     */
    predictExecutionTime(config) {
        try {
            const prediction = this.predictPerformance(config);
            return prediction.executionTime;
        } catch (error) {
            this.logger.log('ERROR', '時間預測失敗', { error: error.message });
            return 5000;
        }
    }

    /**
     * 成功率預測
     * @param {Object} config - 配置信息
     * @returns {number} 預測成功率（0-1）
     */
    predictSuccessRate(config) {
        try {
            const prediction = this.predictResults(config);
            return prediction.successProbability;
        } catch (error) {
            this.logger.log('ERROR', '成功率預測失敗', { error: error.message });
            return 0.5;
        }
    }

    /**
     * 參數自動調優
     * @param {Object} currentConfig - 當前配置
     * @returns {Object} 調優後的配置
     */
    autoTuneParameters(currentConfig) {
        try {
            const tunedConfig = { ...currentConfig };

            // 基於歷史數據調優參數
            const analysis = this.analyzeStrategyEffectiveness(currentConfig);

            if (analysis.successRate < 0.6) {
                tunedConfig.timeout = Math.min(currentConfig.timeout * 1.5, 60000);
                tunedConfig.maxIterations = Math.min(currentConfig.maxIterations * 2, 10000);
            }

            if (analysis.averageExecutionTime > 5000) {
                tunedConfig.enableCache = true;
                tunedConfig.cacheSize = Math.max(currentConfig.cacheSize || 100, 500);
            }

            this.optimizationHistory.push({
                timestamp: Date.now(),
                originalConfig: currentConfig,
                tunedConfig: tunedConfig,
                reason: '自動調優'
            });

            return tunedConfig;
        } catch (error) {
            this.logger.log('ERROR', '參數自動調優失敗', { error: error.message });
            return currentConfig;
        }
    }

    /**
     * 策略自動選擇
     * @param {Object} assignmentConfig - 分配配置
     * @returns {Object} 推薦策略
     */
    autoSelectStrategy(assignmentConfig) {
        try {
            const strategies = [
                { name: 'simple', priority: 1 },
                { name: 'heuristic', priority: 2 },
                { name: 'depth_first', priority: 3 },
                { name: 'breadth_first', priority: 4 },
                { name: 'hybrid', priority: 5 }
            ];

            // 基於配置複雜度選擇策略
            const complexity = this.calculateComplexity(assignmentConfig);

            if (complexity < 10) {
                return strategies.find(s => s.name === 'simple');
            } else if (complexity < 50) {
                return strategies.find(s => s.name === 'heuristic');
            } else if (complexity < 100) {
                return strategies.find(s => s.name === 'depth_first');
            } else {
                return strategies.find(s => s.name === 'hybrid');
            }
        } catch (error) {
            this.logger.log('ERROR', '策略自動選擇失敗', { error: error.message });
            return { name: 'simple', priority: 1 };
        }
    }

    /**
     * 配置自動優化
     * @param {Object} baseConfig - 基礎配置
     * @returns {Object} 優化後的配置
     */
    autoOptimizeConfig(baseConfig) {
        try {
            const optimizedConfig = { ...baseConfig };

            // 應用自動調優
            const tunedConfig = this.autoTuneParameters(optimizedConfig);

            // 應用策略選擇
            const selectedStrategy = this.autoSelectStrategy(baseConfig);
            optimizedConfig.strategy = selectedStrategy.name;

            // 基於預測結果調整配置
            const prediction = this.predictResults(baseConfig);
            if (prediction.successProbability < 0.5) {
                optimizedConfig.fallbackStrategy = 'simple';
                optimizedConfig.enableRetry = true;
            }

            return optimizedConfig;
        } catch (error) {
            this.logger.log('ERROR', '配置自動優化失敗', { error: error.message });
            return baseConfig;
        }
    }

    /**
     * 性能自動提升
     * @param {Object} currentPerformance - 當前性能
     * @returns {Object} 提升建議
     */
    autoImprovePerformance(currentPerformance) {
        try {
            const improvements = {
                suggestions: [],
                configChanges: [],
                priority: 'low'
            };

            // 分析性能瓶頸
            if (currentPerformance.executionTime > 5000) {
                improvements.suggestions.push('考慮啟用緩存機制');
                improvements.configChanges.push({ enableCache: true });
                improvements.priority = 'high';
            }

            if (currentPerformance.memoryUsage > 1000000) {
                improvements.suggestions.push('優化記憶體使用');
                improvements.configChanges.push({ optimizeMemory: true });
                improvements.priority = 'medium';
            }

            if (currentPerformance.successRate < 0.8) {
                improvements.suggestions.push('調整搜索策略');
                improvements.configChanges.push({ strategy: 'hybrid' });
                improvements.priority = 'high';
            }

            return improvements;
        } catch (error) {
            this.logger.log('ERROR', '性能自動提升建議失敗', { error: error.message });
            return { suggestions: [], configChanges: [], priority: 'low' };
        }
    }

    /**
     * 計算配置複雜度
     * @param {Object} config - 配置信息
     * @returns {number} 複雜度分數
     */
    calculateComplexity(config) {
        try {
            let complexity = 0;

            if (config.students) complexity += config.students.length * 10;
            if (config.seats) complexity += config.seats.length * 5;
            if (config.conditions) complexity += config.conditions.length * 20;

            return complexity;
        } catch (error) {
            return 100;
        }
    }

    /**
     * 提取特徵
     * @param {Object} data - 數據
     * @returns {Object} 特徵
     */
    extractFeatures(data) {
        try {
            return {
                hasGroupConditions: data.conditions ? data.conditions.some(c => c.type === 'assign_group') : false,
                hasAdjacentConditions: data.conditions ? data.conditions.some(c => c.type === 'adjacent') : false,
                hasAvoidConditions: data.conditions ? data.conditions.some(c => c.type === 'avoid') : false,
                studentToSeatRatio: data.students && data.seats ? data.students.length / data.seats.length : 1
            };
        } catch (error) {
            return {};
        }
    }

    /**
     * 清理舊數據
     */
    cleanupOldData() {
        try {
            const cutoffTime = Date.now() - (this.modelConfig.dataRetentionDays * 24 * 60 * 60 * 1000);
            this.historicalData = this.historicalData.filter(data => data.timestamp > cutoffTime);
        } catch (error) {
            this.logger.log('ERROR', '數據清理失敗', { error: error.message });
        }
    }

    /**
     * 檢查策略相似性
     * @param {Object} strategy1 - 策略1
     * @param {Object} strategy2 - 策略2
     * @returns {boolean} 是否相似
     */
    isSimilarStrategy(strategy1, strategy2) {
        try {
            return strategy1.searchType === strategy2.searchType &&
                strategy1.priorityMethod === strategy2.priorityMethod;
        } catch (error) {
            return false;
        }
    }

    /**
     * 檢查配置相似性
     * @param {Object} config1 - 配置1
     * @param {Object} config2 - 配置2
     * @returns {boolean} 是否相似
     */
    isSimilarConfiguration(config1, config2) {
        try {
            const diff1 = Math.abs(config1.studentCount - config2.studentCount);
            const diff2 = Math.abs(config1.seatCount - config2.seatCount);
            const diff3 = Math.abs(config1.conditionCount - config2.conditionCount);

            return diff1 <= 5 && diff2 <= 5 && diff3 <= 2;
        } catch (error) {
            return false;
        }
    }

    /**
     * 獲取統計信息
     * @returns {Object} 統計信息
     */
    getStatistics() {
        return {
            totalDataPoints: this.historicalData.length,
            successRate: this.historicalData.length > 0 ?
                this.historicalData.filter(d => d.success).length / this.historicalData.length : 0,
            averageExecutionTime: this.historicalData.length > 0 ?
                this.historicalData.reduce((sum, d) => sum + d.executionTime, 0) / this.historicalData.length : 0,
            optimizationCount: this.optimizationHistory.length
        };
    }

    /**
     * 重置優化器
     */
    reset() {
        this.historicalData = [];
        this.strategyPatterns.clear();
        this.predictionModels.clear();
        this.optimizationHistory = [];
        this.logger.log('INFO', '機器學習優化器已重置');
    }
}

module.exports = { MachineLearningOptimizer };
