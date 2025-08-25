// StrategyLearner.js - 策略學習器
class StrategyLearner {
	constructor() {
		// 策略學習相關屬性
		this.strategyPerformance = new Map(); // 策略性能統計
		this.strategyLearningRate = 0.1; // 學習率
		this.adaptationThreshold = 0.05; // 適應閾值
		this.performanceWindow = 50; // 性能統計窗口大小

		// 策略配置（需要從外部注入）
		this.STRATEGY_CONFIG = null;
	}

	/**
	 * 設置策略配置
	 * @param {Object} strategyConfig 策略配置
	 */
	setStrategyConfig(strategyConfig) {
		this.STRATEGY_CONFIG = strategyConfig;
	}

	/**
	 * 策略學習 - 從策略執行結果中學習
	 * @param {Object} strategy 執行的策略
	 * @param {Object} result 執行結果
	 * @param {Object} conflict 原始衝突
	 * @param {Map} originalAssignment 原始分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 */
	learnFromStrategy(strategy, result, conflict, originalAssignment, students, seats, conditions) {
		if (!strategy || !result) {
			return;
		}

		const strategyName = strategy.name;
		const learningData = {
			timestamp: new Date().toISOString(),
			strategy: strategyName,
			success: result.success,
			attempts: result.attempts || 0,
			executionTime: result.executionTime || 0,
			conflictType: conflict.type,
			assignmentSize: originalAssignment.size,
			studentsCount: students.length,
			seatsCount: seats.length,
			conditionsCount: conditions.length,
			performance: this.calculateStrategyPerformance(result, conflict, originalAssignment)
		};

		// 1. 更新策略性能統計
		this.updateStrategyPerformance(strategyName, learningData);

		// 2. 分析成功/失敗模式
		this.analyzeSuccessPatterns(strategyName, learningData);

		// 3. 更新策略適應性參數
		this.updateStrategyAdaptation(strategyName, learningData);

		// 4. 記錄學習結果
		this.recordLearningResult(learningData);

		// 5. 檢查是否需要策略調整
		if (this.shouldAdaptStrategy(strategyName)) {
			this.adaptStrategy(strategyName);
		}
	}

	/**
	 * 策略適應 - 根據學習結果調整策略
	 * @param {string} strategyName 策略名稱
	 */
	adaptStrategy(strategyName) {
		if (!this.STRATEGY_CONFIG) {
			console.warn('策略配置未設置，無法進行策略適應');
			return;
		}

		const performance = this.strategyPerformance.get(strategyName);
		if (!performance) {
			return;
		}

		const adaptation = {
			strategyName,
			timestamp: new Date().toISOString(),
			originalConfig: { ...this.STRATEGY_CONFIG[strategyName] },
			adaptations: []
		};

		// 1. 調整策略優先級
		const priorityAdjustment = this.calculatePriorityAdjustment(performance);
		if (Math.abs(priorityAdjustment) > this.adaptationThreshold) {
			this.STRATEGY_CONFIG[strategyName].priority += priorityAdjustment;
			adaptation.adaptations.push({
				type: 'priority',
				adjustment: priorityAdjustment,
				reason: 'performance_based_adaptation'
			});
		}

		// 2. 調整最大嘗試次數
		const attemptsAdjustment = this.calculateAttemptsAdjustment(performance);
		if (Math.abs(attemptsAdjustment) > 1) {
			this.STRATEGY_CONFIG[strategyName].maxAttempts += attemptsAdjustment;
			adaptation.adaptations.push({
				type: 'maxAttempts',
				adjustment: attemptsAdjustment,
				reason: 'efficiency_optimization'
			});
		}

		// 3. 調整學習率
		const learningRateAdjustment = this.calculateLearningRateAdjustment(performance);
		if (Math.abs(learningRateAdjustment) > this.adaptationThreshold) {
			this.strategyLearningRate += learningRateAdjustment;
			adaptation.adaptations.push({
				type: 'learningRate',
				adjustment: learningRateAdjustment,
				reason: 'learning_optimization'
			});
		}

		// 4. 記錄適應結果
		this.recordStrategyAdaptation(adaptation);

		// 5. 重置性能統計（避免過度適應）
		if (adaptation.adaptations.length > 0) {
			this.resetStrategyPerformance(strategyName);
		}
	}

	/**
	 * 計算歷史調整分數
	 * @param {Map} strategyScores 策略基礎分數
	 * @returns {Map} 歷史調整分數
	 */
	calculateHistoricalAdjustment(strategyScores) {
		const historicalScores = new Map();

		for (const [strategyName] of strategyScores) {
			const performance = this.strategyPerformance.get(strategyName);
			if (performance && performance.recentResults.length > 0) {
				// 計算最近的成功率
				const recentResults = performance.recentResults.slice(-this.performanceWindow);
				const successRate = recentResults.filter(r => r.success).length / recentResults.length;

				// 計算平均執行時間（標準化到0-1）
				const avgExecutionTime = recentResults.reduce((sum, r) => sum + (r.executionTime || 0), 0) / recentResults.length;
				const normalizedTime = Math.max(0, 1 - avgExecutionTime / 1000); // 假設1000ms為基準

				// 綜合歷史分數
				const historicalScore = successRate * 0.7 + normalizedTime * 0.3;
				historicalScores.set(strategyName, historicalScore);
			} else {
				historicalScores.set(strategyName, 0.5); // 默認中等分數
			}
		}

		return historicalScores;
	}

	/**
	 * 計算情境調整分數
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Map} strategyScores 策略基礎分數
	 * @returns {Map} 情境調整分數
	 */
	calculateSituationalAdjustment(conflict, currentAssignment, strategyScores) {
		const situationalScores = new Map();

		for (const [strategyName] of strategyScores) {
			let situationalScore = 0.5; // 默認分數

			// 根據衝突類型調整
			switch (conflict.type) {
				case 'TOTAL_COUNT':
					if (strategyName === 'DIRECT_REMOVAL') {
						situationalScore = 0.9;
					} else if (strategyName === 'SMART_SWAP') {
						situationalScore = 0.6;
					} else {
						situationalScore = 0.4;
					}
					break;

				case 'GROUP_CAPACITY':
					if (strategyName === 'SMART_SWAP') {
						situationalScore = 0.9;
					} else if (strategyName === 'CHAIN_ADJUSTMENT') {
						situationalScore = 0.8;
					} else {
						situationalScore = 0.5;
					}
					break;

				case 'CONDITION_CONFLICT':
					if (strategyName === 'CHAIN_ADJUSTMENT') {
						situationalScore = 0.9;
					} else if (strategyName === 'SMART_SWAP') {
						situationalScore = 0.7;
					} else {
						situationalScore = 0.4;
					}
					break;

				default:
					situationalScore = 0.5;
			}

			// 根據分配大小調整
			const assignmentSize = currentAssignment.size;
			if (assignmentSize < 5) {
				// 小規模分配，偏好簡單策略
				if (strategyName === 'DIRECT_REMOVAL') {
					situationalScore *= 1.2;
				} else if (strategyName === 'CHAIN_ADJUSTMENT') {
					situationalScore *= 0.8;
				}
			} else if (assignmentSize > 20) {
				// 大規模分配，偏好複雜策略
				if (strategyName === 'CHAIN_ADJUSTMENT') {
					situationalScore *= 1.1;
				} else if (strategyName === 'DIRECT_REMOVAL') {
					situationalScore *= 0.9;
				}
			}

			situationalScores.set(strategyName, Math.min(1, Math.max(0, situationalScore)));
		}

		return situationalScores;
	}

	/**
	 * 更新策略性能統計
	 * @param {string} strategyName 策略名稱
	 * @param {Object} learningData 學習數據
	 */
	updateStrategyPerformance(strategyName, learningData) {
		if (!this.strategyPerformance.has(strategyName)) {
			this.strategyPerformance.set(strategyName, {
				totalExecutions: 0,
				successfulExecutions: 0,
				totalAttempts: 0,
				totalExecutionTime: 0,
				recentResults: [],
				successPatterns: new Map(),
				failurePatterns: new Map()
			});
		}

		const performance = this.strategyPerformance.get(strategyName);

		// 更新基本統計
		performance.totalExecutions++;
		if (learningData.success) {
			performance.successfulExecutions++;
		}
		performance.totalAttempts += learningData.attempts;
		performance.totalExecutionTime += learningData.executionTime;

		// 更新最近結果
		performance.recentResults.push({
			success: learningData.success,
			attempts: learningData.attempts,
			executionTime: learningData.executionTime,
			performance: learningData.performance,
			timestamp: learningData.timestamp
		});

		// 保持窗口大小
		if (performance.recentResults.length > this.performanceWindow) {
			performance.recentResults.shift();
		}
	}

	/**
	 * 分析成功模式
	 * @param {string} strategyName 策略名稱
	 * @param {Object} learningData 學習數據
	 */
	analyzeSuccessPatterns(strategyName, learningData) {
		const performance = this.strategyPerformance.get(strategyName);
		if (!performance) return;

		const patternKey = `${learningData.conflictType}_${learningData.assignmentSize}`;

		if (learningData.success) {
			// 更新成功模式
			if (!performance.successPatterns.has(patternKey)) {
				performance.successPatterns.set(patternKey, {
					count: 0,
					avgAttempts: 0,
					avgExecutionTime: 0,
					avgPerformance: 0
				});
			}

			const pattern = performance.successPatterns.get(patternKey);
			pattern.count++;
			pattern.avgAttempts = (pattern.avgAttempts * (pattern.count - 1) + learningData.attempts) / pattern.count;
			pattern.avgExecutionTime = (pattern.avgExecutionTime * (pattern.count - 1) + learningData.executionTime) / pattern.count;
			pattern.avgPerformance = (pattern.avgPerformance * (pattern.count - 1) + learningData.performance) / pattern.count;
		} else {
			// 更新失敗模式
			if (!performance.failurePatterns.has(patternKey)) {
				performance.failurePatterns.set(patternKey, {
					count: 0,
					avgAttempts: 0,
					avgExecutionTime: 0
				});
			}

			const pattern = performance.failurePatterns.get(patternKey);
			pattern.count++;
			pattern.avgAttempts = (pattern.avgAttempts * (pattern.count - 1) + learningData.attempts) / pattern.count;
			pattern.avgExecutionTime = (pattern.avgExecutionTime * (pattern.count - 1) + learningData.executionTime) / pattern.count;
		}
	}

	/**
	 * 更新策略適應性參數
	 * @param {string} strategyName 策略名稱
	 * @param {Object} learningData 學習數據
	 */
	updateStrategyAdaptation(strategyName, learningData) {
		const performance = this.strategyPerformance.get(strategyName);
		if (!performance) return;

		// 計算成功率變化
		const recentSuccessRate = performance.recentResults
			.slice(-10)
			.filter(r => r.success).length / Math.min(10, performance.recentResults.length);

		// 根據成功率調整學習率
		if (recentSuccessRate > 0.8) {
			this.strategyLearningRate *= 0.95; // 成功率高時降低學習率
		} else if (recentSuccessRate < 0.3) {
			this.strategyLearningRate *= 1.05; // 成功率低時提高學習率
		}

		// 限制學習率範圍
		this.strategyLearningRate = Math.max(0.01, Math.min(0.5, this.strategyLearningRate));
	}

	/**
	 * 計算策略性能
	 * @param {Object} result 執行結果
	 * @param {Object} conflict 衝突信息
	 * @param {Map} originalAssignment 原始分配
	 * @returns {number} 性能評分
	 */
	calculateStrategyPerformance(result, conflict, originalAssignment) {
		if (!this.STRATEGY_CONFIG) {
			return 0.5; // 默認中等性能
		}

		let performance = 0;

		// 成功獎勵
		if (result.success) {
			performance += 0.6;
		}

		// 嘗試次數懲罰
		const maxAttempts = this.STRATEGY_CONFIG[result.strategy]?.maxAttempts || 10;
		const attemptEfficiency = Math.max(0, 1 - (result.attempts / maxAttempts));
		performance += attemptEfficiency * 0.3;

		// 執行時間效率
		const timeEfficiency = Math.max(0, 1 - (result.executionTime / 1000)); // 假設1000ms為基準
		performance += timeEfficiency * 0.1;

		return Math.min(1, Math.max(0, performance));
	}

	/**
	 * 檢查是否需要策略調整
	 * @param {string} strategyName 策略名稱
	 * @returns {boolean} 是否需要調整
	 */
	shouldAdaptStrategy(strategyName) {
		const performance = this.strategyPerformance.get(strategyName);
		if (!performance || performance.recentResults.length < 10) {
			return false;
		}

		// 檢查最近10次的成功率
		const recentResults = performance.recentResults.slice(-10);
		const successRate = recentResults.filter(r => r.success).length / recentResults.length;

		// 成功率過低或過高時需要調整
		return successRate < 0.3 || successRate > 0.9;
	}

	/**
	 * 計算優先級調整
	 * @param {Object} performance 性能統計
	 * @returns {number} 優先級調整值
	 */
	calculatePriorityAdjustment(performance) {
		const successRate = performance.successfulExecutions / performance.totalExecutions;
		const avgAttempts = performance.totalAttempts / performance.totalExecutions;
		const avgExecutionTime = performance.totalExecutionTime / performance.totalExecutions;

		let adjustment = 0;

		// 根據成功率調整
		if (successRate > 0.8) {
			adjustment += 0.5; // 提高優先級
		} else if (successRate < 0.3) {
			adjustment -= 0.5; // 降低優先級
		}

		// 根據效率調整
		if (avgAttempts < 5 && avgExecutionTime < 500) {
			adjustment += 0.3; // 高效率提高優先級
		} else if (avgAttempts > 15 || avgExecutionTime > 2000) {
			adjustment -= 0.3; // 低效率降低優先級
		}

		return adjustment * this.strategyLearningRate;
	}

	/**
	 * 計算嘗試次數調整
	 * @param {Object} performance 性能統計
	 * @returns {number} 嘗試次數調整值
	 */
	calculateAttemptsAdjustment(performance) {
		const avgAttempts = performance.totalAttempts / performance.totalExecutions;
		const successRate = performance.successfulExecutions / performance.totalExecutions;

		let adjustment = 0;

		// 如果成功率低但平均嘗試次數也低，增加嘗試次數
		if (successRate < 0.5 && avgAttempts < 8) {
			adjustment += 2;
		}
		// 如果成功率高但平均嘗試次數很高，減少嘗試次數
		else if (successRate > 0.7 && avgAttempts > 15) {
			adjustment -= 2;
		}

		return adjustment;
	}

	/**
	 * 計算學習率調整
	 * @param {Object} performance 性能統計
	 * @returns {number} 學習率調整值
	 */
	calculateLearningRateAdjustment(performance) {
		const recentResults = performance.recentResults.slice(-5);
		if (recentResults.length < 3) {
			return 0;
		}

		// 計算最近結果的穩定性
		const successRates = recentResults.map(r => r.success ? 1 : 0);
		const variance = this.calculateVariance(successRates);

		// 如果結果不穩定，提高學習率
		if (variance > 0.2) {
			return 0.02;
		}
		// 如果結果很穩定，降低學習率
		else if (variance < 0.05) {
			return -0.01;
		}

		return 0;
	}

	/**
	 * 記錄學習結果
	 * @param {Object} learningData 學習數據
	 */
	recordLearningResult(learningData) {
		// 這裡可以記錄學習結果
		// 用於後續分析和調試
	}

	/**
	 * 記錄策略適應
	 * @param {Object} adaptation 適應數據
	 */
	recordStrategyAdaptation(adaptation) {
		// 這裡可以記錄策略適應的詳細信息
		// 用於後續分析和調試
	}

	/**
	 * 重置策略性能統計
	 * @param {string} strategyName 策略名稱
	 */
	resetStrategyPerformance(strategyName) {
		const performance = this.strategyPerformance.get(strategyName);
		if (performance) {
			performance.recentResults = [];
		}
	}

	/**
	 * 計算方差
	 * @param {Array} values 數值數組
	 * @returns {number} 方差
	 */
	calculateVariance(values) {
		if (values.length === 0) return 0;

		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
		return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
	}

	/**
	 * 獲取策略性能統計
	 * @param {string} strategyName 策略名稱
	 * @returns {Object} 性能統計
	 */
	getStrategyPerformance(strategyName) {
		return this.strategyPerformance.get(strategyName);
	}

	/**
	 * 獲取所有策略性能統計
	 * @returns {Map} 所有策略性能統計
	 */
	getAllStrategyPerformance() {
		return new Map(this.strategyPerformance);
	}

	/**
	 * 清除策略性能統計
	 */
	clearStrategyPerformance() {
		this.strategyPerformance.clear();
	}
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
	module.exports = StrategyLearner;
} else if (typeof window !== 'undefined') {
	window.StrategyLearner = StrategyLearner;
}
