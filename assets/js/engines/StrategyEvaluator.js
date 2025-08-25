// StrategyEvaluator.js - 策略評估器
class StrategyEvaluator {
	constructor() {
		// 策略配置
		this.STRATEGY_CONFIG = {
			DIRECT_REMOVAL: {
				name: 'DIRECT_REMOVAL',
				priority: 1,
				maxAttempts: 10,
				description: '直接移除衝突學生並重新分配'
			},
			SMART_SWAP: {
				name: 'SMART_SWAP',
				priority: 2,
				maxAttempts: 20,
				description: '尋找可互換的學生對來解決衝突'
			},
			CHAIN_ADJUSTMENT: {
				name: 'CHAIN_ADJUSTMENT',
				priority: 3,
				maxAttempts: 30,
				description: '通過連鎖反應調整多個學生位置'
			}
		};
	}

	/**
	 * 評估策略
	 * @param {Object} strategy 策略對象
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 評估結果
	 */
	evaluateStrategy(strategy, conflict, currentAssignment, students, seats, conditions) {
		// 參數驗證
		if (!strategy || typeof strategy !== 'object') {
			return {
				strategyName: 'INVALID_STRATEGY',
				applicability: 0,
				effectiveness: 0,
				efficiency: 0,
				risk: 0,
				overallScore: 0,
				factors: {
					applicability: { score: 0 },
					effectiveness: { score: 0 },
					efficiency: { score: 0 },
					risk: { score: 0 }
				}
			};
		}

		const evaluation = {
			strategyName: strategy.name || 'UNKNOWN_STRATEGY',
			applicability: 0,
			effectiveness: 0,
			efficiency: 0,
			risk: 0,
			overallScore: 0,
			factors: {}
		};

		try {
			// 1. 適用性評估
			evaluation.factors.applicability = this.evaluateApplicability(strategy, conflict, currentAssignment);
			evaluation.applicability = evaluation.factors.applicability.score;

			// 2. 效果評估
			evaluation.factors.effectiveness = this.evaluateEffectiveness(strategy, conflict, currentAssignment, students, seats, conditions);
			evaluation.effectiveness = evaluation.factors.effectiveness.score;

			// 3. 效率評估
			evaluation.factors.efficiency = this.evaluateEfficiency(strategy, conflict, currentAssignment);
			evaluation.efficiency = evaluation.factors.efficiency.score;

			// 4. 風險評估
			evaluation.factors.risk = this.evaluateRisk(strategy, conflict, currentAssignment, students);
			evaluation.risk = evaluation.factors.risk.score;

			// 5. 綜合評分
			evaluation.overallScore = this.calculateOverallScore(evaluation);

		} catch (error) {
			console.error('策略評估失敗:', error);
			evaluation.overallScore = 0;
		}

		return evaluation;
	}

	/**
	 * 評估策略適用性
	 * @param {Object} strategy 策略對象
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Object} 適用性評估結果
	 */
	evaluateApplicability(strategy, conflict, currentAssignment) {
		const factors = {
			conflictTypeMatch: 0,
			assignmentSize: 0,
			complexity: 0,
			score: 0
		};

		// 衝突類型匹配度
		const conflictTypeStrategies = {
			'TOTAL_COUNT': ['DIRECT_REMOVAL'],
			'GROUP_CAPACITY': ['SMART_SWAP', 'CHAIN_ADJUSTMENT'],
			'CONDITION_CONFLICT': ['CHAIN_ADJUSTMENT', 'SMART_SWAP'],
			'ADJACENT_CONFLICT': ['SMART_SWAP', 'DIRECT_REMOVAL']
		};

		const suitableStrategies = conflictTypeStrategies[conflict.type] || [];
		factors.conflictTypeMatch = suitableStrategies.includes(strategy.name) ? 1 : 0.3;

		// 分配大小適配性
		const assignmentSize = currentAssignment.size;
		if (strategy.name === 'DIRECT_REMOVAL') {
			factors.assignmentSize = assignmentSize > 0 ? 1 : 0;
		} else if (strategy.name === 'SMART_SWAP') {
			factors.assignmentSize = assignmentSize >= 2 ? 1 : 0.5;
		} else if (strategy.name === 'CHAIN_ADJUSTMENT') {
			factors.assignmentSize = assignmentSize >= 3 ? 1 : 0.3;
		}

		// 複雜度適配性
		const complexity = this.calculateConflictComplexity(conflict);
		if (complexity <= 2) {
			factors.complexity = strategy.name === 'DIRECT_REMOVAL' ? 1 : 0.7;
		} else if (complexity <= 4) {
			factors.complexity = strategy.name === 'SMART_SWAP' ? 1 : 0.8;
		} else {
			factors.complexity = strategy.name === 'CHAIN_ADJUSTMENT' ? 1 : 0.6;
		}

		// 綜合適用性評分
		factors.score = (factors.conflictTypeMatch * 0.4 +
			factors.assignmentSize * 0.3 +
			factors.complexity * 0.3);

		return factors;
	}

	/**
	 * 評估策略效果
	 * @param {Object} strategy 策略對象
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 效果評估結果
	 */
	evaluateEffectiveness(strategy, conflict, currentAssignment, students, seats, conditions) {
		const factors = {
			conflictResolution: 0,
			studentSatisfaction: 0,
			conditionCompliance: 0,
			score: 0
		};

		// 衝突解決能力
		const resolutionCapability = {
			'DIRECT_REMOVAL': 0.8,
			'SMART_SWAP': 0.9,
			'CHAIN_ADJUSTMENT': 0.95
		};
		factors.conflictResolution = resolutionCapability[strategy.name] || 0.5;

		// 學生滿意度
		const satisfactionImpact = {
			'DIRECT_REMOVAL': 0.6,
			'SMART_SWAP': 0.8,
			'CHAIN_ADJUSTMENT': 0.7
		};
		factors.studentSatisfaction = satisfactionImpact[strategy.name] || 0.5;

		// 條件合規性
		const complianceRate = this.calculateConditionComplianceRate(currentAssignment, conditions);
		factors.conditionCompliance = complianceRate;

		// 綜合效果評分
		factors.score = (factors.conflictResolution * 0.5 +
			factors.studentSatisfaction * 0.3 +
			factors.conditionCompliance * 0.2);

		return factors;
	}

	/**
	 * 評估策略效率
	 * @param {Object} strategy 策略對象
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Object} 效率評估結果
	 */
	evaluateEfficiency(strategy, conflict, currentAssignment) {
		const factors = {
			timeComplexity: 0,
			spaceComplexity: 0,
			attemptEfficiency: 0,
			score: 0
		};

		// 時間複雜度評估
		const timeComplexity = {
			'DIRECT_REMOVAL': 0.9, // O(1)
			'SMART_SWAP': 0.7,     // O(n²)
			'CHAIN_ADJUSTMENT': 0.5 // O(n³)
		};
		factors.timeComplexity = timeComplexity[strategy.name] || 0.5;

		// 空間複雜度評估
		const spaceComplexity = {
			'DIRECT_REMOVAL': 0.9,
			'SMART_SWAP': 0.8,
			'CHAIN_ADJUSTMENT': 0.6
		};
		factors.spaceComplexity = spaceComplexity[strategy.name] || 0.5;

		// 嘗試效率評估
		const assignmentSize = currentAssignment.size;
		const maxAttempts = strategy.maxAttempts || 10;
		factors.attemptEfficiency = Math.min(1, assignmentSize / maxAttempts);

		// 綜合效率評分
		factors.score = (factors.timeComplexity * 0.4 +
			factors.spaceComplexity * 0.3 +
			factors.attemptEfficiency * 0.3);

		return factors;
	}

	/**
	 * 評估策略風險
	 * @param {Object} strategy 策略對象
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @returns {Object} 風險評估結果
	 */
	evaluateRisk(strategy, conflict, currentAssignment, students) {
		const factors = {
			studentDisruption: 0,
			assignmentStability: 0,
			recoveryDifficulty: 0,
			score: 0
		};

		// 學生干擾度
		const disruptionLevel = {
			'DIRECT_REMOVAL': 0.8,
			'SMART_SWAP': 0.4,
			'CHAIN_ADJUSTMENT': 0.6
		};
		factors.studentDisruption = disruptionLevel[strategy.name] || 0.5;

		// 分配穩定性
		const stabilityImpact = {
			'DIRECT_REMOVAL': 0.3,
			'SMART_SWAP': 0.8,
			'CHAIN_ADJUSTMENT': 0.6
		};
		factors.assignmentStability = stabilityImpact[strategy.name] || 0.5;

		// 恢復難度
		const recoveryDifficulty = {
			'DIRECT_REMOVAL': 0.2,
			'SMART_SWAP': 0.5,
			'CHAIN_ADJUSTMENT': 0.7
		};
		factors.recoveryDifficulty = recoveryDifficulty[strategy.name] || 0.5;

		// 綜合風險評分（風險越低分數越高）
		factors.score = ((1 - factors.studentDisruption) * 0.4 +
			factors.assignmentStability * 0.4 +
			(1 - factors.recoveryDifficulty) * 0.2);

		return factors;
	}

	/**
	 * 計算綜合評分
	 * @param {Object} evaluation 評估結果
	 * @returns {number} 綜合評分
	 */
	calculateOverallScore(evaluation) {
		const weights = {
			applicability: 0.3,
			effectiveness: 0.4,
			efficiency: 0.2,
			risk: 0.1
		};

		return evaluation.applicability * weights.applicability +
			evaluation.effectiveness * weights.effectiveness +
			evaluation.efficiency * weights.efficiency +
			evaluation.risk * weights.risk;
	}

	/**
	 * 計算衝突複雜度
	 * @param {Object} conflict 衝突信息
	 * @returns {number} 複雜度評分
	 */
	calculateConflictComplexity(conflict) {
		let complexity = 1;

		// 根據衝突類型調整複雜度
		switch (conflict.type) {
			case 'TOTAL_COUNT':
				complexity = 1;
				break;
			case 'GROUP_CAPACITY':
				complexity = 2;
				break;
			case 'CONDITION_CONFLICT':
				complexity = 3;
				break;
			case 'ADJACENT_CONFLICT':
				complexity = 2;
				break;
			default:
				complexity = 2;
		}

		// 根據影響學生數量調整複雜度
		if (conflict.affectedStudents) {
			complexity += conflict.affectedStudents.length * 0.5;
		}

		return Math.min(complexity, 5); // 最大複雜度為5
	}

	/**
	 * 計算條件合規率
	 * @param {Map} assignment 分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 合規率
	 */
	calculateConditionComplianceRate(assignment, conditions) {
		if (!conditions || conditions.length === 0) {
			return 1.0;
		}

		let compliantCount = 0;
		let totalChecks = 0;

		for (const condition of conditions) {
			if (this.checkConditionCompliance(condition, assignment)) {
				compliantCount++;
			}
			totalChecks++;
		}

		return totalChecks > 0 ? compliantCount / totalChecks : 1.0;
	}

	/**
	 * 檢查條件合規性
	 * @param {Object} condition 條件
	 * @param {Map} assignment 分配
	 * @returns {boolean} 是否合規
	 */
	checkConditionCompliance(condition, assignment) {
		// 簡化的條件合規性檢查
		// 實際實現時需要根據具體條件類型進行檢查
		return Math.random() > 0.3; // 70%的合規率
	}

	/**
	 * 策略選擇算法 - 選擇最佳策略
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Function} calculateHistoricalAdjustment 歷史調整計算函數
	 * @param {Function} calculateSituationalAdjustment 情境調整計算函數
	 * @param {Function} recordStrategySelection 策略選擇記錄函數
	 * @returns {Object} 選中的最佳策略
	 */
	selectOptimalStrategy(conflict, currentAssignment, students, seats, conditions, 
		calculateHistoricalAdjustment, calculateSituationalAdjustment, recordStrategySelection) {
		const strategies = Object.values(this.STRATEGY_CONFIG);
		const evaluations = [];
		const strategyScores = new Map();

		// 1. 評估所有策略
		for (const strategy of strategies) {
			const evaluation = this.evaluateStrategy(strategy, conflict, currentAssignment, students, seats, conditions);
			evaluations.push(evaluation);
			strategyScores.set(strategy.name, evaluation.overallScore);
		}

		// 2. 考慮歷史性能
		const historicalAdjustment = calculateHistoricalAdjustment ? 
			calculateHistoricalAdjustment(strategyScores) : new Map();

		// 3. 考慮當前情況的特殊因素
		const situationalAdjustment = calculateSituationalAdjustment ? 
			calculateSituationalAdjustment(conflict, currentAssignment, strategyScores) : new Map();

		// 4. 計算最終分數
		const finalScores = new Map();
		for (const [strategyName, baseScore] of strategyScores) {
			const historicalScore = historicalAdjustment.get(strategyName) || 0;
			const situationalScore = situationalAdjustment.get(strategyName) || 0;

			// 綜合評分：基礎評分(60%) + 歷史表現(25%) + 情境適應(15%)
			const finalScore = baseScore * 0.6 + historicalScore * 0.25 + situationalScore * 0.15;
			finalScores.set(strategyName, finalScore);
		}

		// 5. 選擇最高分數的策略
		let bestStrategy = null;
		let bestScore = -1;

		for (const [strategyName, score] of finalScores) {
			if (score > bestScore) {
				bestScore = score;
				bestStrategy = this.STRATEGY_CONFIG[strategyName] ||
					strategies.find(s => s.name === strategyName);
			}
		}

		// 6. 記錄選擇過程
		if (recordStrategySelection) {
			recordStrategySelection({
				conflict,
				evaluations,
				finalScores,
				selectedStrategy: bestStrategy,
				selectionReason: 'optimal_score'
			});
		}

		return bestStrategy || strategies[0]; // 如果沒有找到最佳策略，返回第一個
	}
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { StrategyEvaluator };
} else if (typeof window !== 'undefined') {
	window.StrategyEvaluator = StrategyEvaluator;
}
