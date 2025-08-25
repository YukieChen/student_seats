// EffectEvaluator.js - 效果評估器
class EffectEvaluator {
	constructor() {
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
		const measurement = {
			timestamp: new Date().toISOString(),
			originalAssignment: new Map(originalAssignment),
			newAssignment: new Map(newAssignment),
			adjustmentDetails,
			overallEffect: 0,
			performanceMetrics: {},
			changes: {},
			riskAssessment: {},
			confidence: 0,
			successProbability: 0,
			details: {}
		};

		try {
			// 1. 計算性能指標
			measurement.performanceMetrics = this.calculatePerformanceMetrics(
				originalAssignment, newAssignment, adjustmentDetails
			);

			// 2. 分析分配變化
			measurement.changes = this.analyzeAssignmentChanges(originalAssignment, newAssignment);

			// 3. 計算整體效果
			measurement.overallEffect = this.calculateOverallEffect(measurement);

			// 4. 評估風險
			measurement.riskAssessment = this.assessAdjustmentRisk(
				adjustmentDetails, originalAssignment, students, seats, conditions
			);

			// 5. 計算預測置信度
			measurement.confidence = this.calculatePredictionConfidence(
				adjustmentDetails, originalAssignment, students, seats, conditions
			);

			// 6. 計算成功概率
			measurement.successProbability = this.calculateSuccessProbability(
				adjustmentDetails, originalAssignment, students, seats, conditions
			);

			// 7. 詳細信息
			measurement.details = {
				studentImpact: this.analyzeStudentImpact(originalAssignment, newAssignment, students),
				conditionImpact: this.analyzeConditionImpact(originalAssignment, newAssignment, conditions),
				seatUtilization: this.analyzeSeatUtilization(originalAssignment, newAssignment, seats)
			};

		} catch (error) {
			console.error('效果測量失敗:', error);
			measurement.overallEffect = 0;
		}

		return measurement;
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
		const prediction = {
			timestamp: new Date().toISOString(),
			proposedAdjustment,
			predictedEffect: 0,
			confidence: 0,
			riskLevel: 'unknown',
			successProbability: 0,
			details: {}
		};

		try {
			// 1. 模擬調整
			const simulatedAssignment = this.simulateAdjustment(currentAssignment, proposedAdjustment);

			// 2. 測量模擬效果
			const simulatedEffect = this.measureAdjustmentEffect(
				currentAssignment, simulatedAssignment, students, seats, conditions, proposedAdjustment
			);

			// 3. 計算預測置信度
			prediction.confidence = this.calculatePredictionConfidence(
				proposedAdjustment, currentAssignment, students, seats, conditions
			);

			// 4. 評估風險等級
			prediction.riskLevel = this.assessAdjustmentRisk(proposedAdjustment, currentAssignment, students, seats, conditions);

			// 5. 計算成功概率
			prediction.successProbability = this.calculateSuccessProbability(
				proposedAdjustment, currentAssignment, students, seats, conditions
			);

			// 6. 預測效果
			prediction.predictedEffect = simulatedEffect.overallEffect * prediction.confidence;

			// 7. 詳細信息
			prediction.details = {
				simulatedEffect,
				historicalAccuracy: this.getHistoricalAccuracy(proposedAdjustment.type),
				similarCases: this.findSimilarCases(proposedAdjustment, currentAssignment)
			};

		} catch (error) {
			console.error('效果預測失敗:', error);
			prediction.predictedEffect = 0;
		}

		return prediction;
	}

	/**
	 * 比較調整效果
	 * @param {Array} adjustmentStrategies 調整策略列表
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 效果比較結果
	 */
	compareAdjustmentEffects(adjustmentStrategies, currentAssignment, students, seats, conditions) {
		const comparison = {
			timestamp: new Date().toISOString(),
			strategies: [],
			bestStrategy: null,
			ranking: [],
			summary: {},
			details: {}
		};

		try {
			// 1. 評估每個策略
			for (const strategy of adjustmentStrategies) {
				const prediction = this.predictAdjustmentEffect(
					currentAssignment, students, seats, conditions, strategy
				);

				comparison.strategies.push({
					strategy,
					prediction,
					score: this.calculateStrategyScore(prediction)
				});
			}

			// 2. 排序策略
			comparison.strategies.sort((a, b) => b.score - a.score);
			comparison.ranking = comparison.strategies.map(s => s.strategy.name);

			// 3. 選擇最佳策略
			if (comparison.strategies.length > 0) {
				comparison.bestStrategy = comparison.strategies[0];
			}

			// 4. 生成摘要
			comparison.summary = this.generateComparisonSummary(comparison.strategies);

			// 5. 詳細分析
			comparison.details = {
				effectivenessAnalysis: this.analyzeEffectiveness(comparison.strategies),
				riskAnalysis: this.analyzeRiskDistribution(comparison.strategies),
				confidenceAnalysis: this.analyzeConfidenceDistribution(comparison.strategies)
			};

		} catch (error) {
			console.error('效果比較失敗:', error);
		}

		return comparison;
	}

	/**
	 * 報告調整效果
	 * @param {Object} adjustmentResult 調整結果
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 效果報告
	 */
	reportAdjustmentEffect(adjustmentResult, students, seats, conditions) {
		const report = {
			timestamp: new Date().toISOString(),
			adjustmentResult,
			effectiveness: 0,
			efficiency: 0,
			impact: {},
			recommendations: [],
			details: {}
		};

		try {
			// 1. 計算效果性
			report.effectiveness = this.calculateEffectiveness(adjustmentResult);

			// 2. 計算效率
			report.efficiency = this.calculateEfficiency(adjustmentResult);

			// 3. 分析影響
			report.impact = {
				studentImpact: this.analyzeStudentImpact(new Map(), adjustmentResult.improvedAssignment || new Map(), students),
				conditionImpact: this.analyzeConditionImpact(new Map(), adjustmentResult.improvedAssignment || new Map(), conditions),
				seatImpact: this.analyzeSeatUtilization(new Map(), adjustmentResult.improvedAssignment || new Map(), seats)
			};

			// 4. 生成建議
			report.recommendations = this.generateRecommendations(adjustmentResult, report);

			// 5. 詳細分析
			report.details = {
				performanceAnalysis: this.analyzePerformance(adjustmentResult),
				riskAnalysis: this.analyzeRisk(adjustmentResult),
				improvementAnalysis: this.analyzeImprovement(adjustmentResult)
			};

		} catch (error) {
			console.error('效果報告生成失敗:', error);
		}

		return report;
	}

	/**
	 * 計算性能指標
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @param {Object} adjustmentDetails 調整詳情
	 * @returns {Object} 性能指標
	 */
	calculatePerformanceMetrics(originalAssignment, newAssignment, adjustmentDetails) {
		const metrics = {
			assignmentRate: 0,
			conditionSatisfaction: 0,
			studentSatisfaction: 0,
			overallScore: 0,
			improvement: 0,
			details: {}
		};

		try {
			// 1. 計算分配率
			metrics.assignmentRate = this.calculateAssignmentRate(newAssignment);

			// 2. 計算條件滿足度
			metrics.conditionSatisfaction = this.calculateConditionSatisfaction(newAssignment);

			// 3. 計算學生滿意度
			metrics.studentSatisfaction = this.calculateStudentSatisfaction(newAssignment);

			// 4. 計算整體分數
			metrics.overallScore = this.calculateOverallScore(metrics);

			// 5. 計算改進幅度
			const originalScore = this.calculateOverallScore({
				assignmentRate: this.calculateAssignmentRate(originalAssignment),
				conditionSatisfaction: this.calculateConditionSatisfaction(originalAssignment),
				studentSatisfaction: this.calculateStudentSatisfaction(originalAssignment)
			});
			metrics.improvement = metrics.overallScore - originalScore;

			// 6. 詳細指標
			metrics.details = {
				executionTime: adjustmentDetails.executionTime || 0,
				iterations: adjustmentDetails.iterations || 0,
				successRate: adjustmentDetails.success ? 1 : 0
			};

		} catch (error) {
			console.error('性能指標計算失敗:', error);
		}

		return metrics;
	}

	/**
	 * 分析分配變化
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @returns {Object} 變化分析
	 */
	analyzeAssignmentChanges(originalAssignment, newAssignment) {
		const changes = {
			totalChanges: 0,
			studentChanges: [],
			seatChanges: [],
			changeTypes: {
				added: 0,
				removed: 0,
				modified: 0
			},
			details: {}
		};

		try {
			const originalKeys = Array.from(originalAssignment.keys());
			const newKeys = Array.from(newAssignment.keys());

			// 1. 分析新增的分配
			for (const key of newKeys) {
				if (!originalAssignment.has(key)) {
					changes.studentChanges.push({
						studentId: key,
						type: 'added',
						oldSeat: null,
						newSeat: newAssignment.get(key)
					});
					changes.changeTypes.added++;
				}
			}

			// 2. 分析移除的分配
			for (const key of originalKeys) {
				if (!newAssignment.has(key)) {
					changes.studentChanges.push({
						studentId: key,
						type: 'removed',
						oldSeat: originalAssignment.get(key),
						newSeat: null
					});
					changes.changeTypes.removed++;
				}
			}

			// 3. 分析修改的分配
			for (const key of originalKeys) {
				if (newAssignment.has(key)) {
					const oldSeat = originalAssignment.get(key);
					const newSeat = newAssignment.get(key);
					if (JSON.stringify(oldSeat) !== JSON.stringify(newSeat)) {
						changes.studentChanges.push({
							studentId: key,
							type: 'modified',
							oldSeat,
							newSeat
						});
						changes.changeTypes.modified++;
					}
				}
			}

			// 4. 計算總變化數
			changes.totalChanges = changes.studentChanges.length;

			// 5. 詳細分析
			changes.details = {
				changeDistribution: this.analyzeChangeDistribution(changes.studentChanges),
				impactAnalysis: this.analyzeChangeImpact(changes.studentChanges)
			};

		} catch (error) {
			console.error('分配變化分析失敗:', error);
		}

		return changes;
	}

	/**
	 * 模擬調整
	 * @param {Map} currentAssignment 當前分配
	 * @param {Object} proposedAdjustment 提議的調整
	 * @returns {Map} 模擬後的分配
	 */
	simulateAdjustment(currentAssignment, proposedAdjustment) {
		const simulatedAssignment = new Map(currentAssignment);

		try {
			switch (proposedAdjustment.type) {
				case 'DIRECT_REMOVAL':
					// 模擬直接移除
					if (proposedAdjustment.studentId) {
						simulatedAssignment.delete(proposedAdjustment.studentId);
					}
					break;

				case 'SMART_SWAP':
					// 模擬智能交換
					if (proposedAdjustment.student1Id && proposedAdjustment.student2Id) {
						const seat1 = simulatedAssignment.get(proposedAdjustment.student1Id);
						const seat2 = simulatedAssignment.get(proposedAdjustment.student2Id);
						if (seat1 && seat2) {
							simulatedAssignment.set(proposedAdjustment.student1Id, seat2);
							simulatedAssignment.set(proposedAdjustment.student2Id, seat1);
						}
					}
					break;

				case 'CHAIN_ADJUSTMENT':
					// 模擬連鎖調整
					if (proposedAdjustment.chain) {
						for (const step of proposedAdjustment.chain) {
							if (step.studentId && step.newSeat) {
								simulatedAssignment.set(step.studentId, step.newSeat);
							}
						}
					}
					break;

				default:
					console.warn('未知的調整類型:', proposedAdjustment.type);
			}

		} catch (error) {
			console.error('調整模擬失敗:', error);
		}

		return simulatedAssignment;
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
		let confidence = 0.5; // 基礎置信度

		try {
			// 1. 基於歷史準確度
			const historicalAccuracy = this.getHistoricalAccuracy(proposedAdjustment.type);
			confidence += historicalAccuracy * 0.3;

			// 2. 基於調整複雜度
			const complexity = this.calculateAdjustmentComplexity(proposedAdjustment);
			confidence += (1 - complexity) * 0.2;

			// 3. 基於當前狀態穩定性
			const stability = this.calculateStateStability(currentAssignment, students, seats, conditions);
			confidence += stability * 0.2;

			// 4. 基於相似案例
			const similarCases = this.findSimilarCases(proposedAdjustment, currentAssignment);
			if (similarCases.length > 0) {
				const avgSuccess = similarCases.reduce((sum, case_) => sum + case_.success, 0) / similarCases.length;
				confidence += avgSuccess * 0.3;
			}

		} catch (error) {
			console.error('預測置信度計算失敗:', error);
		}

		return Math.min(1, Math.max(0, confidence));
	}

	/**
	 * 評估調整風險
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {string} 風險等級
	 */
	assessAdjustmentRisk(proposedAdjustment, currentAssignment, students, seats, conditions) {
		let riskScore = 0.5; // 基礎風險分數

		try {
			// 1. 基於調整類型
			const typeRisk = this.getAdjustmentTypeRisk(proposedAdjustment.type);
			riskScore += typeRisk * 0.3;

			// 2. 基於影響範圍
			const impactScope = this.calculateImpactScope(proposedAdjustment, currentAssignment);
			riskScore += impactScope * 0.3;

			// 3. 基於當前狀態
			const stateRisk = this.calculateStateRisk(currentAssignment, students, seats, conditions);
			riskScore += stateRisk * 0.2;

			// 4. 基於歷史失敗率
			const failureRate = this.getHistoricalFailureRate(proposedAdjustment.type);
			riskScore += failureRate * 0.2;

		} catch (error) {
			console.error('風險評估失敗:', error);
		}

		// 根據風險分數確定風險等級
		if (riskScore < this.riskThresholds.low) return 'low';
		else if (riskScore < this.riskThresholds.medium) return 'medium';
		else if (riskScore < this.riskThresholds.high) return 'high';
		else return 'critical';
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
		let probability = 0.5; // 基礎成功概率

		try {
			// 1. 基於歷史成功率
			const historicalSuccess = this.getHistoricalSuccessRate(proposedAdjustment.type);
			probability += historicalSuccess * 0.4;

			// 2. 基於當前條件
			const conditionCompatibility = this.calculateConditionCompatibility(proposedAdjustment, conditions);
			probability += conditionCompatibility * 0.3;

			// 3. 基於資源可用性
			const resourceAvailability = this.calculateResourceAvailability(proposedAdjustment, currentAssignment, seats);
			probability += resourceAvailability * 0.2;

			// 4. 基於衝突檢查
			const conflictLevel = this.calculateConflictLevel(proposedAdjustment, currentAssignment, students, conditions);
			probability += (1 - conflictLevel) * 0.1;

		} catch (error) {
			console.error('成功概率計算失敗:', error);
		}

		return Math.min(1, Math.max(0, probability));
	}

	// ==================== 輔助方法 ====================

	/**
	 * 計算整體效果
	 * @param {Object} measurement 測量結果
	 * @returns {number} 整體效果分數
	 */
	calculateOverallEffect(measurement) {
		const weights = this.evaluationConfig;
		return measurement.performanceMetrics.overallScore * weights.performanceWeight +
			(measurement.changes.totalChanges > 0 ? 0.5 : 1.0) * weights.changeWeight +
			(this.getRiskScore(measurement.riskAssessment) * weights.riskWeight);
	}

	/**
	 * 計算策略分數
	 * @param {Object} prediction 預測結果
	 * @returns {number} 策略分數
	 */
	calculateStrategyScore(prediction) {
		return prediction.predictedEffect * this.evaluationConfig.confidenceWeight +
			prediction.successProbability * this.evaluationConfig.successWeight;
	}

	/**
	 * 生成比較摘要
	 * @param {Array} strategies 策略列表
	 * @returns {Object} 比較摘要
	 */
	generateComparisonSummary(strategies) {
		return {
			totalStrategies: strategies.length,
			averageScore: strategies.reduce((sum, s) => sum + s.score, 0) / strategies.length,
			bestScore: strategies.length > 0 ? strategies[0].score : 0,
			worstScore: strategies.length > 0 ? strategies[strategies.length - 1].score : 0,
			scoreRange: strategies.length > 0 ? strategies[0].score - strategies[strategies.length - 1].score : 0
		};
	}

	/**
	 * 分析效果性
	 * @param {Array} strategies 策略列表
	 * @returns {Object} 效果性分析
	 */
	analyzeEffectiveness(strategies) {
		return {
			highEffectiveness: strategies.filter(s => s.prediction.predictedEffect > 0.7).length,
			mediumEffectiveness: strategies.filter(s => s.prediction.predictedEffect > 0.4 && s.prediction.predictedEffect <= 0.7).length,
			lowEffectiveness: strategies.filter(s => s.prediction.predictedEffect <= 0.4).length
		};
	}

	/**
	 * 分析風險分布
	 * @param {Array} strategies 策略列表
	 * @returns {Object} 風險分布分析
	 */
	analyzeRiskDistribution(strategies) {
		return {
			lowRisk: strategies.filter(s => s.prediction.riskLevel === 'low').length,
			mediumRisk: strategies.filter(s => s.prediction.riskLevel === 'medium').length,
			highRisk: strategies.filter(s => s.prediction.riskLevel === 'high').length,
			criticalRisk: strategies.filter(s => s.prediction.riskLevel === 'critical').length
		};
	}

	/**
	 * 分析置信度分布
	 * @param {Array} strategies 策略列表
	 * @returns {Object} 置信度分布分析
	 */
	analyzeConfidenceDistribution(strategies) {
		return {
			highConfidence: strategies.filter(s => s.prediction.confidence > 0.8).length,
			mediumConfidence: strategies.filter(s => s.prediction.confidence > 0.5 && s.prediction.confidence <= 0.8).length,
			lowConfidence: strategies.filter(s => s.prediction.confidence <= 0.5).length
		};
	}

	/**
	 * 計算效果性
	 * @param {Object} adjustmentResult 調整結果
	 * @returns {number} 效果性分數
	 */
	calculateEffectiveness(adjustmentResult) {
		return adjustmentResult.success ? 1.0 : 0.0;
	}

	/**
	 * 計算效率
	 * @param {Object} adjustmentResult 調整結果
	 * @returns {number} 效率分數
	 */
	calculateEfficiency(adjustmentResult) {
		const executionTime = adjustmentResult.executionTime || 1;
		const iterations = adjustmentResult.iterations || 1;
		return 1.0 / (executionTime * iterations);
	}

	/**
	 * 生成建議
	 * @param {Object} adjustmentResult 調整結果
	 * @param {Object} report 報告
	 * @returns {Array} 建議列表
	 */
	generateRecommendations(adjustmentResult, report) {
		const recommendations = [];

		if (report.effectiveness < 0.5) {
			recommendations.push('考慮使用不同的調整策略');
		}

		if (report.efficiency < 0.1) {
			recommendations.push('優化調整算法以提高效率');
		}

		if (adjustmentResult.iterations > 50) {
			recommendations.push('考慮增加收斂條件以減少迭代次數');
		}

		return recommendations;
	}

	// ==================== 簡化實現的輔助方法 ====================

	calculateAssignmentRate(assignment) {
		return assignment.size / 100; // 簡化實現
	}

	calculateConditionSatisfaction(assignment) {
		return 0.8; // 簡化實現
	}

	calculateStudentSatisfaction(assignment) {
		return 0.7; // 簡化實現
	}

	calculateOverallScore(metrics) {
		return metrics.assignmentRate * 0.3 + metrics.conditionSatisfaction * 0.3 + metrics.studentSatisfaction * 0.4;
	}

	getHistoricalAccuracy(type) {
		return 0.8; // 簡化實現
	}

	calculateAdjustmentComplexity(adjustment) {
		return 0.3; // 簡化實現
	}

	calculateStateStability(assignment, students, seats, conditions) {
		return 0.7; // 簡化實現
	}

	findSimilarCases(adjustment, assignment) {
		return []; // 簡化實現
	}

	getAdjustmentTypeRisk(type) {
		const riskMap = {
			'DIRECT_REMOVAL': 0.2,
			'SMART_SWAP': 0.4,
			'CHAIN_ADJUSTMENT': 0.6
		};
		return riskMap[type] || 0.5;
	}

	calculateImpactScope(adjustment, assignment) {
		return 0.3; // 簡化實現
	}

	calculateStateRisk(assignment, students, seats, conditions) {
		return 0.2; // 簡化實現
	}

	getHistoricalFailureRate(type) {
		return 0.1; // 簡化實現
	}

	getRiskScore(riskAssessment) {
		return 0.3; // 簡化實現
	}

	getHistoricalSuccessRate(type) {
		return 0.8; // 簡化實現
	}

	calculateConditionCompatibility(adjustment, conditions) {
		return 0.7; // 簡化實現
	}

	calculateResourceAvailability(adjustment, assignment, seats) {
		return 0.8; // 簡化實現
	}

	calculateConflictLevel(adjustment, assignment, students, conditions) {
		return 0.2; // 簡化實現
	}

	analyzeStudentImpact(originalAssignment, newAssignment, students) {
		return { impact: 'medium' }; // 簡化實現
	}

	analyzeConditionImpact(originalAssignment, newAssignment, conditions) {
		return { impact: 'low' }; // 簡化實現
	}

	analyzeSeatUtilization(originalAssignment, newAssignment, seats) {
		return { utilization: 0.8 }; // 簡化實現
	}

	analyzeChangeDistribution(changes) {
		return { distribution: 'even' }; // 簡化實現
	}

	analyzeChangeImpact(changes) {
		return { impact: 'moderate' }; // 簡化實現
	}

	analyzePerformance(adjustmentResult) {
		return { performance: 'good' }; // 簡化實現
	}

	analyzeRisk(adjustmentResult) {
		return { risk: 'low' }; // 簡化實現
	}

	analyzeImprovement(adjustmentResult) {
		return { improvement: 'significant' }; // 簡化實現
	}

	/**
	 * 設置評估配置
	 * @param {Object} config 配置對象
	 */
	setEvaluationConfig(config) {
		this.evaluationConfig = { ...this.evaluationConfig, ...config };
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
	}
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EffectEvaluator;
} else if (typeof window !== 'undefined') {
	window.EffectEvaluator = EffectEvaluator;
}
