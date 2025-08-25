// GlobalOptimizer.js - 全局優化器
class GlobalOptimizer {
	constructor() {
		// 全局優化相關屬性
		this.optimizationHistory = [];
		this.convergenceThreshold = 0.01;
		this.maxIterations = 100;
		this.optimizationConfig = {
			swapWeight: 0.4,
			reassignmentWeight: 0.6,
			convergenceWindow: 5,
			improvementThreshold: 0.001
		};
	}

	/**
	 * 評估全局狀態
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 全局狀態評估結果
	 */
	evaluateGlobalState(currentAssignment, students, seats, conditions) {
		const evaluation = {
			timestamp: new Date().toISOString(),
			totalStudents: students.length,
			totalSeats: seats.length,
			assignedStudents: 0,
			assignmentRate: 0,
			conditionSatisfaction: 0,
			studentSatisfaction: 0,
			overallScore: 0,
			details: {}
		};

		try {
			// 1. 計算分配率
			evaluation.assignmentRate = this.calculateAssignmentRate(currentAssignment, students);
			evaluation.assignedStudents = Math.floor(evaluation.assignmentRate * students.length);

			// 2. 計算條件滿足度
			evaluation.conditionSatisfaction = this.calculateGlobalConditionSatisfaction(currentAssignment, conditions);

			// 3. 計算學生滿意度
			evaluation.studentSatisfaction = this.calculateGlobalStudentSatisfaction(currentAssignment, students, seats, conditions);

			// 4. 計算綜合評分
			evaluation.overallScore = this.calculateOverallScore(evaluation);

			// 5. 詳細信息
			evaluation.details = {
				assignmentDistribution: this.analyzeAssignmentDistribution(currentAssignment, students, seats),
				conditionAnalysis: this.analyzeConditionSatisfaction(currentAssignment, conditions),
				studentAnalysis: this.analyzeStudentSatisfaction(currentAssignment, students, seats, conditions)
			};

		} catch (error) {
			console.error('全局狀態評估失敗:', error);
			evaluation.overallScore = 0;
		}

		return evaluation;
	}

	/**
	 * 全局優化算法
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} options 優化選項
	 * @returns {Object} 優化結果
	 */
	globalOptimization(currentAssignment, students, seats, conditions, options = {}) {
		const optimizationResult = {
			success: false,
			originalAssignment: new Map(currentAssignment),
			improvedAssignment: new Map(currentAssignment),
			optimizationHistory: [],
			iterations: 0,
			improvement: 0,
			executionTime: 0,
			convergenceReached: false,
			details: {}
		};

		const startTime = performance.now();

		try {
			// 1. 初始評估
			const initialEvaluation = this.evaluateGlobalState(currentAssignment, students, seats, conditions);
			optimizationResult.optimizationHistory.push({
				iteration: 0,
				evaluation: initialEvaluation,
				assignment: new Map(currentAssignment)
			});

			// 2. 執行優化迭代
			let currentAssignment = new Map(currentAssignment);
			let currentEvaluation = initialEvaluation;
			let iteration = 1;

			while (iteration <= this.maxIterations) {
				// 檢查收斂條件
				if (this.checkGlobalConvergence(optimizationResult.optimizationHistory, iteration)) {
					optimizationResult.convergenceReached = true;
					break;
				}

				// 執行優化迭代
				const iterationResult = this.performOptimizationIteration(
					currentAssignment, students, seats, conditions, iteration
				);

				if (iterationResult.success) {
					currentAssignment = iterationResult.newAssignment;
					const newEvaluation = this.evaluateGlobalState(iterationResult.newAssignment, students, seats, conditions);

					// 檢查是否有改善
					if (newEvaluation.overallScore > currentEvaluation.overallScore + this.optimizationConfig.improvementThreshold) {
						currentEvaluation = newEvaluation;
						optimizationResult.improvedAssignment = new Map(currentAssignment);
					}

					// 記錄迭代歷史
					optimizationResult.optimizationHistory.push({
						iteration,
						evaluation: newEvaluation,
						assignment: new Map(currentAssignment),
						improvement: newEvaluation.overallScore - currentEvaluation.overallScore
					});
				}

				// 避免局部最優
				if (iteration % 10 === 0) {
					const avoidanceResult = this.avoidLocalOptima(
						currentAssignment, students, seats, conditions, iteration
					);
					if (avoidanceResult.success) {
						currentAssignment = avoidanceResult.newAssignment;
					}
				}

				iteration++;
			}

			// 3. 計算最終結果
			optimizationResult.iterations = iteration - 1;
			optimizationResult.executionTime = performance.now() - startTime;
			optimizationResult.improvement = currentEvaluation.overallScore - initialEvaluation.overallScore;
			optimizationResult.success = optimizationResult.improvement > 0 || optimizationResult.convergenceReached;

			// 4. 詳細信息
			optimizationResult.details = {
				initialScore: initialEvaluation.overallScore,
				finalScore: currentEvaluation.overallScore,
				convergenceAnalysis: this.analyzeConvergence(optimizationResult.optimizationHistory),
				improvementAnalysis: this.analyzeImprovement(optimizationResult.optimizationHistory)
			};

		} catch (error) {
			console.error('全局優化失敗:', error);
			optimizationResult.success = false;
		}

		return optimizationResult;
	}

	/**
	 * 避免局部最優
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {number} iteration 當前迭代次數
	 * @returns {Object} 避免局部最優結果
	 */
	avoidLocalOptima(currentAssignment, students, seats, conditions, iteration) {
		const avoidanceResult = {
			success: false,
			newAssignment: new Map(currentAssignment),
			avoidanceType: 'none',
			details: {}
		};

		try {
			// 1. 檢查是否陷入局部最優
			const recentHistory = this.optimizationHistory.slice(-this.optimizationConfig.convergenceWindow);
			if (recentHistory.length < this.optimizationConfig.convergenceWindow) {
				return avoidanceResult;
			}

			// 2. 計算最近改進幅度
			const recentImprovements = recentHistory.map(h => h.improvement || 0);
			const avgImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;

			// 3. 如果改進幅度很小，嘗試跳出局部最優
			if (Math.abs(avgImprovement) < this.optimizationConfig.improvementThreshold) {
				// 隨機重排部分分配
				const randomReassignment = this.performRandomReassignment(currentAssignment, students, seats, conditions);
				if (randomReassignment.success) {
					avoidanceResult.success = true;
					avoidanceResult.newAssignment = randomReassignment.newAssignment;
					avoidanceResult.avoidanceType = 'random_reassignment';
					avoidanceResult.details = {
						avgImprovement,
						reassignedCount: randomReassignment.reassignedCount
					};
				}
			}

		} catch (error) {
			console.error('避免局部最優失敗:', error);
		}

		return avoidanceResult;
	}

	/**
	 * 檢查全局收斂
	 * @param {Array} optimizationHistory 優化歷史
	 * @param {number} currentIteration 當前迭代次數
	 * @returns {boolean} 是否收斂
	 */
	checkGlobalConvergence(optimizationHistory, currentIteration) {
		if (optimizationHistory.length < this.optimizationConfig.convergenceWindow) {
			return false;
		}

		// 檢查最近幾次的改進幅度
		const recentHistory = optimizationHistory.slice(-this.optimizationConfig.convergenceWindow);
		const recentScores = recentHistory.map(h => h.evaluation.overallScore);

		// 計算分數變化
		const scoreChanges = [];
		for (let i = 1; i < recentScores.length; i++) {
			scoreChanges.push(Math.abs(recentScores[i] - recentScores[i - 1]));
		}

		// 如果所有變化都小於閾值，認為已收斂
		const maxChange = Math.max(...scoreChanges);
		return maxChange < this.convergenceThreshold;
	}

	/**
	 * 計算分配率
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @returns {number} 分配率
	 */
	calculateAssignmentRate(assignment, students) {
		if (students.length === 0) {
			return 0;
		}

		const assignedCount = Array.from(assignment.keys()).length;
		return assignedCount / students.length;
	}

	/**
	 * 計算全局條件滿足度
	 * @param {Map} assignment 分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 條件滿足度
	 */
	calculateGlobalConditionSatisfaction(assignment, conditions) {
		if (conditions.length === 0) {
			return 1.0;
		}

		let satisfiedConditions = 0;
		let totalChecks = 0;

		for (const condition of conditions) {
			if (this.checkCondition(condition, assignment)) {
				satisfiedConditions++;
			}
			totalChecks++;
		}

		return totalChecks > 0 ? satisfiedConditions / totalChecks : 1.0;
	}

	/**
	 * 計算全局學生滿意度
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 學生滿意度
	 */
	calculateGlobalStudentSatisfaction(assignment, students, seats, conditions) {
		if (students.length === 0) {
			return 0;
		}

		let totalSatisfaction = 0;
		let assignedStudents = 0;

		for (const student of students) {
			const assignedSeat = assignment.get(student.id);
			if (assignedSeat) {
				const satisfaction = this.calculateStudentSatisfaction(student, assignedSeat, assignment, conditions);
				totalSatisfaction += satisfaction;
				assignedStudents++;
			}
		}

		return assignedStudents > 0 ? totalSatisfaction / assignedStudents : 0;
	}

	/**
	 * 執行優化迭代
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {number} iteration 迭代次數
	 * @returns {Object} 迭代結果
	 */
	performOptimizationIteration(currentAssignment, students, seats, conditions, iteration) {
		const iterationResult = {
			success: false,
			newAssignment: new Map(currentAssignment),
			improvement: 0,
			optimizationType: 'none',
			details: {}
		};

		try {
			// 1. 執行交換優化
			const swapResult = this.performSwapOptimization(currentAssignment, students, seats, conditions);

			// 2. 執行重新分配優化
			const reassignmentResult = this.performReassignmentOptimization(currentAssignment, students, seats, conditions);

			// 3. 選擇最佳結果
			if (swapResult.improvement > reassignmentResult.improvement) {
				iterationResult.success = swapResult.success;
				iterationResult.newAssignment = swapResult.newAssignment;
				iterationResult.improvement = swapResult.improvement;
				iterationResult.optimizationType = 'swap';
				iterationResult.details = swapResult.details;
			} else {
				iterationResult.success = reassignmentResult.success;
				iterationResult.newAssignment = reassignmentResult.newAssignment;
				iterationResult.improvement = reassignmentResult.improvement;
				iterationResult.optimizationType = 'reassignment';
				iterationResult.details = reassignmentResult.details;
			}

		} catch (error) {
			console.error('優化迭代失敗:', error);
		}

		return iterationResult;
	}

	/**
	 * 執行交換優化
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 交換優化結果
	 */
	performSwapOptimization(assignment, students, seats, conditions) {
		const swapResult = {
			success: false,
			newAssignment: new Map(assignment),
			improvement: 0,
			swapsPerformed: 0,
			details: {}
		};

		try {
			const assignedStudents = Array.from(assignment.keys());
			let bestImprovement = 0;
			let bestSwap = null;

			// 尋找最佳交換
			for (let i = 0; i < assignedStudents.length; i++) {
				for (let j = i + 1; j < assignedStudents.length; j++) {
					const student1 = students.find(s => s.id === assignedStudents[i]);
					const student2 = students.find(s => s.id === assignedStudents[j]);
					const seat1 = assignment.get(student1.id);
					const seat2 = assignment.get(student2.id);

					if (student1 && student2 && seat1 && seat2) {
						// 計算交換前的滿意度
						const beforeSatisfaction1 = this.calculateStudentSatisfaction(student1, seat1, assignment, conditions);
						const beforeSatisfaction2 = this.calculateStudentSatisfaction(student2, seat2, assignment, conditions);

						// 模擬交換
						const tempAssignment = new Map(assignment);
						tempAssignment.set(student1.id, seat2);
						tempAssignment.set(student2.id, seat1);

						// 計算交換後的滿意度
						const afterSatisfaction1 = this.calculateStudentSatisfaction(student1, seat2, tempAssignment, conditions);
						const afterSatisfaction2 = this.calculateStudentSatisfaction(student2, seat1, tempAssignment, conditions);

						// 計算改進
						const improvement = (afterSatisfaction1 + afterSatisfaction2) - (beforeSatisfaction1 + beforeSatisfaction2);

						if (improvement > bestImprovement) {
							bestImprovement = improvement;
							bestSwap = { student1, student2, seat1, seat2 };
						}
					}
				}
			}

			// 執行最佳交換
			if (bestSwap && bestImprovement > 0) {
				swapResult.newAssignment.set(bestSwap.student1.id, bestSwap.seat2);
				swapResult.newAssignment.set(bestSwap.student2.id, bestSwap.seat1);
				swapResult.improvement = bestImprovement;
				swapResult.success = true;
				swapResult.swapsPerformed = 1;
				swapResult.details = {
					student1Id: bestSwap.student1.id,
					student2Id: bestSwap.student2.id,
					seat1Info: bestSwap.seat1,
					seat2Info: bestSwap.seat2
				};
			}

		} catch (error) {
			console.error('交換優化失敗:', error);
		}

		return swapResult;
	}

	/**
	 * 執行重新分配優化
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 重新分配優化結果
	 */
	performReassignmentOptimization(assignment, students, seats, conditions) {
		const reassignmentResult = {
			success: false,
			newAssignment: new Map(assignment),
			improvement: 0,
			reassignmentsPerformed: 0,
			details: {}
		};

		try {
			const assignedStudents = Array.from(assignment.keys());
			let totalImprovement = 0;
			let reassignments = 0;

			// 為每個已分配的學生尋找更好的座位
			for (const studentId of assignedStudents) {
				const student = students.find(s => s.id === studentId);
				const currentSeat = assignment.get(studentId);

				if (student && currentSeat) {
					// 計算當前滿意度
					const currentSatisfaction = this.calculateStudentSatisfaction(student, currentSeat, assignment, conditions);

					// 尋找更好的座位
					let bestSeat = currentSeat;
					let bestSatisfaction = currentSatisfaction;

					for (const seat of seats) {
						// 檢查座位是否可用
						if (!this.isSeatOccupied(seat, assignment)) {
							const satisfaction = this.calculateStudentSatisfaction(student, seat, assignment, conditions);
							if (satisfaction > bestSatisfaction) {
								bestSatisfaction = satisfaction;
								bestSeat = seat;
							}
						}
					}

					// 如果找到更好的座位，執行重新分配
					if (bestSeat !== currentSeat) {
						reassignmentResult.newAssignment.set(studentId, bestSeat);
						totalImprovement += (bestSatisfaction - currentSatisfaction);
						reassignments++;
					}
				}
			}

			if (reassignments > 0) {
				reassignmentResult.improvement = totalImprovement;
				reassignmentResult.success = true;
				reassignmentResult.reassignmentsPerformed = reassignments;
				reassignmentResult.details = {
					totalImprovement,
					reassignments
				};
			}

		} catch (error) {
			console.error('重新分配優化失敗:', error);
		}

		return reassignmentResult;
	}

	// ==================== 輔助方法 ====================

	/**
	 * 計算綜合評分
	 * @param {Object} evaluation 評估結果
	 * @returns {number} 綜合評分
	 */
	calculateOverallScore(evaluation) {
		const weights = {
			assignmentRate: 0.3,
			conditionSatisfaction: 0.3,
			studentSatisfaction: 0.4
		};

		return evaluation.assignmentRate * weights.assignmentRate +
			evaluation.conditionSatisfaction * weights.conditionSatisfaction +
			evaluation.studentSatisfaction * weights.studentSatisfaction;
	}

	/**
	 * 分析分配分布
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @returns {Object} 分配分布分析
	 */
	analyzeAssignmentDistribution(assignment, students, seats) {
		const analysis = {
			totalStudents: students.length,
			totalSeats: seats.length,
			assignedStudents: assignment.size,
			assignmentRate: assignment.size / students.length,
			seatUtilization: assignment.size / seats.length,
			distributionByRow: {},
			distributionByGroup: {}
		};

		// 按行分析分布
		for (const seat of seats) {
			if (!analysis.distributionByRow[seat.row]) {
				analysis.distributionByRow[seat.row] = { total: 0, assigned: 0 };
			}
			analysis.distributionByRow[seat.row].total++;

			if (Array.from(assignment.values()).some(s => s.row === seat.row && s.col === seat.col)) {
				analysis.distributionByRow[seat.row].assigned++;
			}
		}

		return analysis;
	}

	/**
	 * 分析條件滿足情況
	 * @param {Map} assignment 分配
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 條件分析
	 */
	analyzeConditionSatisfaction(assignment, conditions) {
		const analysis = {
			totalConditions: conditions.length,
			satisfiedConditions: 0,
			satisfactionRate: 0,
			conditionDetails: []
		};

		for (const condition of conditions) {
			const satisfied = this.checkCondition(condition, assignment);
			analysis.conditionDetails.push({
				condition,
				satisfied
			});
			if (satisfied) {
				analysis.satisfiedConditions++;
			}
		}

		analysis.satisfactionRate = analysis.totalConditions > 0 ?
			analysis.satisfiedConditions / analysis.totalConditions : 1.0;

		return analysis;
	}

	/**
	 * 分析學生滿意度
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 學生滿意度分析
	 */
	analyzeStudentSatisfaction(assignment, students, seats, conditions) {
		const analysis = {
			totalStudents: students.length,
			assignedStudents: 0,
			averageSatisfaction: 0,
			satisfactionDistribution: {
				high: 0,    // 0.8-1.0
				medium: 0,  // 0.5-0.8
				low: 0      // 0.0-0.5
			},
			studentDetails: []
		};

		let totalSatisfaction = 0;

		for (const student of students) {
			const assignedSeat = assignment.get(student.id);
			const satisfaction = assignedSeat ?
				this.calculateStudentSatisfaction(student, assignedSeat, assignment, conditions) : 0;

			analysis.studentDetails.push({
				student,
				assignedSeat,
				satisfaction
			});

			if (assignedSeat) {
				analysis.assignedStudents++;
				totalSatisfaction += satisfaction;

				// 分類滿意度
				if (satisfaction >= 0.8) analysis.satisfactionDistribution.high++;
				else if (satisfaction >= 0.5) analysis.satisfactionDistribution.medium++;
				else analysis.satisfactionDistribution.low++;
			}
		}

		analysis.averageSatisfaction = analysis.assignedStudents > 0 ?
			totalSatisfaction / analysis.assignedStudents : 0;

		return analysis;
	}

	/**
	 * 分析收斂情況
	 * @param {Array} optimizationHistory 優化歷史
	 * @returns {Object} 收斂分析
	 */
	analyzeConvergence(optimizationHistory) {
		const analysis = {
			totalIterations: optimizationHistory.length,
			convergenceReached: false,
			convergenceIteration: -1,
			scoreProgression: [],
			improvementTrend: 'stable'
		};

		if (optimizationHistory.length < 2) {
			return analysis;
		}

		// 提取分數進展
		analysis.scoreProgression = optimizationHistory.map(h => h.evaluation.overallScore);

		// 檢查收斂
		for (let i = this.optimizationConfig.convergenceWindow; i < optimizationHistory.length; i++) {
			const recentScores = analysis.scoreProgression.slice(i - this.optimizationConfig.convergenceWindow, i);
			const maxChange = Math.max(...recentScores.map((score, idx) =>
				idx > 0 ? Math.abs(score - recentScores[idx - 1]) : 0
			));

			if (maxChange < this.convergenceThreshold) {
				analysis.convergenceReached = true;
				analysis.convergenceIteration = i;
				break;
			}
		}

		// 分析改進趨勢
		const recentImprovements = optimizationHistory.slice(-5).map(h => h.improvement || 0);
		const avgImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;

		if (avgImprovement > 0.01) analysis.improvementTrend = 'improving';
		else if (avgImprovement < -0.01) analysis.improvementTrend = 'declining';
		else analysis.improvementTrend = 'stable';

		return analysis;
	}

	/**
	 * 分析改進情況
	 * @param {Array} optimizationHistory 優化歷史
	 * @returns {Object} 改進分析
	 */
	analyzeImprovement(optimizationHistory) {
		const analysis = {
			totalImprovement: 0,
			averageImprovement: 0,
			bestImprovement: 0,
			improvementIterations: 0,
			improvementDistribution: []
		};

		if (optimizationHistory.length < 2) {
			return analysis;
		}

		const improvements = optimizationHistory.slice(1).map(h => h.improvement || 0);
		analysis.totalImprovement = improvements.reduce((sum, imp) => sum + imp, 0);
		analysis.averageImprovement = analysis.totalImprovement / improvements.length;
		analysis.bestImprovement = Math.max(...improvements);
		analysis.improvementIterations = improvements.filter(imp => imp > 0).length;
		analysis.improvementDistribution = improvements;

		return analysis;
	}

	/**
	 * 執行隨機重新分配
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 隨機重新分配結果
	 */
	performRandomReassignment(assignment, students, seats, conditions) {
		const result = {
			success: false,
			newAssignment: new Map(assignment),
			reassignedCount: 0
		};

		try {
			const assignedStudents = Array.from(assignment.keys());
			const reassignmentCount = Math.floor(assignedStudents.length * 0.1); // 重新分配10%的學生

			for (let i = 0; i < reassignmentCount; i++) {
				const randomStudentId = assignedStudents[Math.floor(Math.random() * assignedStudents.length)];
				const availableSeats = seats.filter(seat => !this.isSeatOccupied(seat, result.newAssignment));

				if (availableSeats.length > 0) {
					const randomSeat = availableSeats[Math.floor(Math.random() * availableSeats.length)];
					result.newAssignment.set(randomStudentId, randomSeat);
					result.reassignedCount++;
				}
			}

			result.success = result.reassignedCount > 0;

		} catch (error) {
			console.error('隨機重新分配失敗:', error);
		}

		return result;
	}

	/**
	 * 計算學生滿意度
	 * @param {Object} student 學生
	 * @param {Object} seat 座位
	 * @param {Map} assignment 分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 滿意度分數
	 */
	calculateStudentSatisfaction(student, seat, assignment, conditions) {
		let satisfaction = 0.5; // 基礎滿意度

		// 座位偏好匹配
		if (student.preferredSeats && student.preferredSeats.includes(`${seat.row}-${seat.col}`)) {
			satisfaction += 0.3;
		}

		// 條件滿足度
		const studentConditions = conditions.filter(c =>
			c.students && (Array.isArray(c.students) ? c.students.includes(student.id) : c.students === student.id)
		);

		let satisfiedConditions = 0;
		for (const condition of studentConditions) {
			const tempAssignment = new Map(assignment);
			tempAssignment.set(student.id, seat);
			if (this.checkCondition(condition, tempAssignment)) {
				satisfiedConditions++;
			}
		}

		if (studentConditions.length > 0) {
			satisfaction += (satisfiedConditions / studentConditions.length) * 0.2;
		}

		return Math.min(1, Math.max(0, satisfaction));
	}

	/**
	 * 檢查條件
	 * @param {Object} condition 條件
	 * @param {Map} assignment 分配
	 * @returns {boolean} 是否滿足條件
	 */
	checkCondition(condition, assignment) {
		// 簡化實現，返回隨機結果
		return Math.random() > 0.3;
	}

	/**
	 * 檢查座位是否被佔用
	 * @param {Object} seat 座位
	 * @param {Map} assignment 分配
	 * @returns {boolean} 是否被佔用
	 */
	isSeatOccupied(seat, assignment) {
		return Array.from(assignment.values()).some(s => s.row === seat.row && s.col === seat.col);
	}

	/**
	 * 設置優化配置
	 * @param {Object} config 配置對象
	 */
	setOptimizationConfig(config) {
		this.optimizationConfig = { ...this.optimizationConfig, ...config };
	}

	/**
	 * 獲取優化歷史
	 * @returns {Array} 優化歷史
	 */
	getOptimizationHistory() {
		return [...this.optimizationHistory];
	}

	/**
	 * 清除優化歷史
	 */
	clearOptimizationHistory() {
		this.optimizationHistory = [];
	}

	/**
	 * 重置優化器
	 */
	reset() {
		this.optimizationHistory = [];
		this.convergenceThreshold = 0.01;
		this.maxIterations = 100;
		this.optimizationConfig = {
			swapWeight: 0.4,
			reassignmentWeight: 0.6,
			convergenceWindow: 5,
			improvementThreshold: 0.001
		};
	}
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
	module.exports = GlobalOptimizer;
} else if (typeof window !== 'undefined') {
	window.GlobalOptimizer = GlobalOptimizer;
}
