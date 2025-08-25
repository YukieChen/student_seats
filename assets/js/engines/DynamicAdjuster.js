// DynamicAdjuster.js - 動態調整器
class DynamicAdjuster {
	constructor(options = {}) {
		this.options = {
			enableDirectRemoval: options.enableDirectRemoval !== false,
			enableSmartSwap: options.enableSmartSwap !== false,
			enableChainAdjustment: options.enableChainAdjustment !== false,
			maxAdjustmentAttempts: options.maxAdjustmentAttempts || 100,
			maxChainLength: options.maxChainLength || 5,
			...options
		};

		// 策略配置
		this.STRATEGY_CONFIG = {
			DIRECT_REMOVAL: {
				name: '直接踢出',
				priority: 1,
				maxAttempts: 10,
				description: '直接移除衝突學生並重新分配'
			},
			SMART_SWAP: {
				name: '智能互換',
				priority: 2,
				maxAttempts: 20,
				description: '尋找可互換的學生對來解決衝突'
			},
			CHAIN_ADJUSTMENT: {
				name: '連鎖調整',
				priority: 3,
				maxAttempts: 30,
				description: '通過連鎖反應調整多個學生位置'
			}
		};

		this.adjustmentHistory = [];
		this.currentStrategy = null;
		this.attemptCount = 0;

		// 策略學習和適應相關屬性
		this.strategyPerformance = new Map(); // 策略性能統計
		this.strategyLearningRate = 0.1; // 學習率
		this.adaptationThreshold = 0.05; // 適應閾值
		this.performanceWindow = 50; // 性能統計窗口大小
	}

	/**
	 * 嘗試調整分配
	 */
	tryAdjustment(conflict, currentAssignment, students, seats, conditions) {
		this.attemptCount = 0;
		this.adjustmentHistory = [];

		// 記錄開始時間
		const startTime = Date.now();

		// 選擇最佳調整策略
		const strategy = this.selectOptimalStrategy(conflict, currentAssignment, students, seats, conditions);
		this.currentStrategy = strategy;

		// 執行調整
		const result = this.executeAdjustment(strategy, conflict, currentAssignment, students, seats, conditions);

		// 計算執行時間
		const executionTime = Date.now() - startTime;

		// 準備結果對象
		const adjustmentResult = {
			success: result.success,
			newAssignment: result.newAssignment,
			strategy: strategy.name,
			attempts: this.attemptCount,
			history: this.adjustmentHistory,
			description: result.description,
			executionTime: executionTime
		};

		// 從策略執行結果中學習
		this.learnFromStrategy(strategy, adjustmentResult, conflict, currentAssignment, students, seats, conditions);

		return adjustmentResult;
	}

	/**
	 * 選擇調整策略（保留向後兼容性）
	 * @deprecated 使用 selectOptimalStrategy() 替代
	 */
	selectStrategy(conflict) {
		// 為了向後兼容，使用簡單的選擇邏輯
		const strategies = Object.values(this.STRATEGY_CONFIG);

		// 根據衝突類型選擇策略
		switch (conflict.type) {
			case 'TOTAL_COUNT':
				return this.STRATEGY_CONFIG.DIRECT_REMOVAL;
			case 'GROUP_CAPACITY':
				return this.STRATEGY_CONFIG.SMART_SWAP;
			case 'CONDITION_CONFLICT':
				return this.STRATEGY_CONFIG.CHAIN_ADJUSTMENT;
			default:
				// 按優先級選擇策略
				return strategies.sort((a, b) => a.priority - b.priority)[0];
		}
	}

	/**
	 * 執行調整
	 */
	executeAdjustment(strategy, conflict, currentAssignment, students, seats, conditions) {
		switch (strategy.name) {
			case '直接踢出':
				return this.executeDirectRemoval(conflict, currentAssignment, students, seats, conditions);
			case '智能互換':
				return this.executeSmartSwap(conflict, currentAssignment, students, seats, conditions);
			case '連鎖調整':
				return this.executeChainAdjustment(conflict, currentAssignment, students, seats, conditions);
			default:
				return { success: false, newAssignment: currentAssignment, description: '未知策略' };
		}
	}

	// ==================== 直接踢出策略 ====================

	/**
	 * 執行直接踢出策略
	 */
	executeDirectRemoval(conflict, currentAssignment, students, seats, conditions) {
		const candidates = this.selectCandidatesForRemoval(conflict, currentAssignment, students);

		for (const candidate of candidates) {
			this.attemptCount++;

			// 記錄嘗試
			this.recordAdjustmentAttempt('DIRECT_REMOVAL', {
				studentId: candidate.studentId,
				reason: candidate.reason,
				attempt: this.attemptCount
			});

			// 嘗試移除候選學生
			const result = this.executeDirectRemoval(candidate, currentAssignment, students, seats, conditions);

			if (result.success) {
				return {
					success: true,
					newAssignment: result.newAssignment,
					description: `成功移除學生 ${candidate.studentId} 並重新分配`
				};
			}

			if (this.attemptCount >= this.STRATEGY_CONFIG.DIRECT_REMOVAL.maxAttempts) {
				break;
			}
		}

		return {
			success: false,
			newAssignment: currentAssignment,
			description: '直接踢出策略失敗，無法找到合適的候選學生'
		};
	}

	/**
	 * 選擇移除候選學生
	 */
	selectCandidatesForRemoval(conflict, currentAssignment, students) {
		const candidates = [];

		// 根據衝突類型選擇候選學生
		switch (conflict.type) {
			case 'TOTAL_COUNT':
				// 選擇分數最低的學生
				const studentScores = this.calculateStudentScores(students, currentAssignment);
				const sortedStudents = Array.from(studentScores.entries())
					.sort((a, b) => a[1] - b[1]);

				for (const [studentId, score] of sortedStudents) {
					candidates.push({
						studentId,
						reason: `分數最低 (${score})`,
						priority: score
					});
				}
				break;

			case 'GROUP_CAPACITY':
				// 選擇目標群組外的學生
				const targetGroup = conflict.groupId;
				for (const [studentId, seat] of currentAssignment.entries()) {
					if (seat.groupId !== targetGroup) {
						candidates.push({
							studentId,
							reason: `不在目標群組 ${targetGroup}`,
							priority: 1
						});
					}
				}
				break;

			default:
				// 選擇隨機學生
				for (const [studentId] of currentAssignment.entries()) {
					candidates.push({
						studentId,
						reason: '隨機選擇',
						priority: Math.random()
					});
				}
		}

		// 按優先級排序
		return candidates.sort((a, b) => a.priority - b.priority);
	}

	/**
	 * 執行直接移除
	 */
	executeDirectRemoval(candidate, currentAssignment, students, seats, conditions) {
		const newAssignment = new Map(currentAssignment);

		// 移除候選學生
		newAssignment.delete(candidate.studentId);

		// 嘗試重新分配該學生
		const reassignmentResult = this.tryReassignment(candidate.studentId, newAssignment, students, seats, conditions);

		if (reassignmentResult.success) {
			return {
				success: true,
				newAssignment: reassignmentResult.newAssignment
			};
		}

		return { success: false, newAssignment };
	}

	/**
	 * 嘗試重新分配
	 */
	tryReassignment(studentId, currentAssignment, students, seats, conditions) {
		const student = students.find(s => s.id === studentId);
		if (!student) {
			return { success: false, newAssignment: currentAssignment };
		}

		// 獲取可用座位
		const availableSeats = this.getAvailableSeats(seats, currentAssignment);

		// 檢查每個可用座位
		for (const seat of availableSeats) {
			if (this.canStudentSitHere(student, seat, currentAssignment, conditions)) {
				const newAssignment = new Map(currentAssignment);
				newAssignment.set(studentId, seat);

				return {
					success: true,
					newAssignment
				};
			}
		}

		return { success: false, newAssignment: currentAssignment };
	}

	// ==================== 智能互換策略 ====================

	/**
	 * 執行智能互換策略
	 */
	executeSmartSwap(conflict, currentAssignment, students, seats, conditions) {
		const swapCandidates = this.selectSwapCandidates(conflict, currentAssignment, students);

		for (const candidate of swapCandidates) {
			this.attemptCount++;

			// 記錄嘗試
			this.recordAdjustmentAttempt('SMART_SWAP', {
				student1: candidate.student1,
				student2: candidate.student2,
				reason: candidate.reason,
				attempt: this.attemptCount
			});

			// 檢查互換可行性
			if (this.checkSwapFeasibility(candidate, currentAssignment, students, seats, conditions)) {
				const result = this.executeSwap(candidate, currentAssignment);

				if (result.success) {
					return {
						success: true,
						newAssignment: result.newAssignment,
						description: `成功互換學生 ${candidate.student1} 和 ${candidate.student2}`
					};
				}
			}

			if (this.attemptCount >= this.STRATEGY_CONFIG.SMART_SWAP.maxAttempts) {
				break;
			}
		}

		return {
			success: false,
			newAssignment: currentAssignment,
			description: '智能互換策略失敗，無法找到合適的互換對'
		};
	}

	/**
	 * 選擇互換候選
	 */
	selectSwapCandidates(conflict, currentAssignment, students) {
		const candidates = [];
		const assignedStudents = Array.from(currentAssignment.keys());

		// 生成所有可能的學生對
		for (let i = 0; i < assignedStudents.length; i++) {
			for (let j = i + 1; j < assignedStudents.length; j++) {
				const student1 = assignedStudents[i];
				const student2 = assignedStudents[j];

				// 計算互換的潛在效益
				const benefit = this.calculateSwapBenefit(student1, student2, currentAssignment, conflict);

				if (benefit > 0) {
					candidates.push({
						student1,
						student2,
						benefit,
						reason: `互換效益: ${benefit}`
					});
				}
			}
		}

		// 按效益排序
		return candidates.sort((a, b) => b.benefit - a.benefit);
	}

	/**
	 * 檢查互換可行性
	 */
	checkSwapFeasibility(candidate, currentAssignment, students, seats, conditions) {
		const { student1, student2 } = candidate;
		const seat1 = currentAssignment.get(student1);
		const seat2 = currentAssignment.get(student2);

		if (!seat1 || !seat2) {
			return false;
		}

		// 創建臨時分配
		const tempAssignment = new Map(currentAssignment);
		tempAssignment.set(student1, seat2);
		tempAssignment.set(student2, seat1);

		// 檢查兩個學生是否都能滿足條件
		const student1Obj = students.find(s => s.id === student1);
		const student2Obj = students.find(s => s.id === student2);

		if (!student1Obj || !student2Obj) {
			return false;
		}

		return this.canStudentSitHere(student1Obj, seat2, tempAssignment, conditions) &&
			this.canStudentSitHere(student2Obj, seat1, tempAssignment, conditions);
	}

	/**
	 * 執行互換
	 */
	executeSwap(candidate, currentAssignment) {
		const { student1, student2 } = candidate;
		const seat1 = currentAssignment.get(student1);
		const seat2 = currentAssignment.get(student2);

		if (!seat1 || !seat2) {
			return { success: false, newAssignment: currentAssignment };
		}

		const newAssignment = new Map(currentAssignment);
		newAssignment.set(student1, seat2);
		newAssignment.set(student2, seat1);

		return {
			success: true,
			newAssignment
		};
	}

	// ==================== 連鎖調整策略 ====================

	/**
	 * 執行連鎖調整策略
	 */
	executeChainAdjustment(conflict, currentAssignment, students, seats, conditions) {
		const chainPath = this.findChainPath(conflict, currentAssignment, students, seats, conditions);

		if (chainPath.length === 0) {
			return {
				success: false,
				newAssignment: currentAssignment,
				description: '無法找到有效的連鎖路徑'
			};
		}

		this.attemptCount++;

		// 記錄嘗試
		this.recordAdjustmentAttempt('CHAIN_ADJUSTMENT', {
			chainLength: chainPath.length,
			path: chainPath.map(p => p.studentId),
			attempt: this.attemptCount
		});

		// 執行連鎖調整
		const result = this.executeChainAdjustment(chainPath, currentAssignment);

		if (result.success) {
			return {
				success: true,
				newAssignment: result.newAssignment,
				description: `成功執行連鎖調整，涉及 ${chainPath.length} 個學生`
			};
		}

		return {
			success: false,
			newAssignment: currentAssignment,
			description: '連鎖調整執行失敗'
		};
	}

	/**
	 * 尋找連鎖路徑
	 */
	findChainPath(conflict, currentAssignment, students, seats, conditions) {
		const chainPath = [];
		const visited = new Set();
		const maxLength = this.options.maxChainLength;

		// 從衝突學生開始
		const conflictStudent = this.getConflictStudent(conflict, currentAssignment);
		if (!conflictStudent) {
			return chainPath;
		}

		this.findChainPathRecursive(conflictStudent, chainPath, visited, currentAssignment, students, seats, conditions, maxLength);

		return chainPath;
	}

	/**
	 * 遞歸尋找連鎖路徑
	 */
	findChainPathRecursive(currentStudent, chainPath, visited, currentAssignment, students, seats, conditions, maxLength) {
		if (chainPath.length >= maxLength || visited.has(currentStudent)) {
			return;
		}

		visited.add(currentStudent);
		chainPath.push({ studentId: currentStudent, seat: currentAssignment.get(currentStudent) });

		// 尋找下一個可調整的學生
		const nextStudent = this.findNextStudentInChain(currentStudent, currentAssignment, students, seats, conditions);

		if (nextStudent) {
			this.findChainPathRecursive(nextStudent, chainPath, visited, currentAssignment, students, seats, conditions, maxLength);
		}
	}

	/**
	 * 執行連鎖調整
	 */
	executeChainAdjustment(chainPath, currentAssignment) {
		if (chainPath.length < 2) {
			return { success: false, newAssignment: currentAssignment };
		}

		const newAssignment = new Map(currentAssignment);

		// 執行連鎖移動
		for (let i = 0; i < chainPath.length - 1; i++) {
			const current = chainPath[i];
			const next = chainPath[i + 1];

			newAssignment.set(current.studentId, next.seat);
		}

		// 最後一個學生移動到第一個位置
		const first = chainPath[0];
		const last = chainPath[chainPath.length - 1];
		newAssignment.set(last.studentId, first.seat);

		return {
			success: true,
			newAssignment
		};
	}

	/**
	 * 驗證連鎖
	 */
	validateChain(chainPath, newAssignment, students, conditions) {
		for (const chainItem of chainPath) {
			const student = students.find(s => s.id === chainItem.studentId);
			if (!student) {
				return false;
			}

			const seat = newAssignment.get(chainItem.studentId);
			if (!seat) {
				return false;
			}

			if (!this.canStudentSitHere(student, seat, newAssignment, conditions)) {
				return false;
			}
		}

		return true;
	}

	// ==================== 輔助方法 ====================

	/**
	 * 記錄調整嘗試
	 */
	recordAdjustmentAttempt(strategy, details) {
		this.adjustmentHistory.push({
			timestamp: new Date().toISOString(),
			strategy,
			details,
			attemptNumber: this.attemptCount
		});
	}

	/**
	 * 獲取可用座位
	 */
	getAvailableSeats(seats, currentAssignment) {
		const assignedSeats = new Set();

		for (const seat of currentAssignment.values()) {
			assignedSeats.add(`${seat.row}-${seat.col}`);
		}

		return seats.filter(seat => !assignedSeats.has(`${seat.row}-${seat.col}`));
	}

	/**
	 * 檢查學生是否可以坐在指定座位
	 */
	canStudentSitHere(student, seat, currentAssignment, conditions) {
		const tempAssignment = new Map(currentAssignment);
		tempAssignment.set(student.id, seat);

		const studentConditions = this.getStudentConditions(student.id, conditions);

		for (const condition of studentConditions) {
			if (!this.checkCondition(condition, tempAssignment)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 檢查條件是否滿足
	 */
	checkCondition(condition, assignment) {
		// 這裡應該調用條件檢查邏輯
		// 簡化實現，實際應該使用完整的條件檢查系統
		return true;
	}

	/**
	 * 獲取學生條件
	 */
	getStudentConditions(studentId, conditions) {
		return conditions.filter(condition => {
			if (Array.isArray(condition.students)) {
				return condition.students.includes(studentId);
			}
			return condition.students === studentId;
		});
	}

	/**
	 * 計算學生分數
	 */
	calculateStudentScores(students, currentAssignment) {
		const scores = new Map();

		for (const student of students) {
			const seat = currentAssignment.get(student.id);
			if (seat) {
				// 簡化的分數計算
				let score = 100;
				if (student.priority) {
					score += student.priority * 10;
				}
				scores.set(student.id, score);
			}
		}

		return scores;
	}

	/**
	 * 計算互換效益
	 */
	calculateSwapBenefit(student1, student2, currentAssignment, conflict) {
		// 簡化的效益計算
		return Math.random() * 10; // 隨機效益值
	}

	/**
	 * 獲取衝突學生
	 */
	getConflictStudent(conflict, currentAssignment) {
		// 根據衝突類型獲取相關學生
		if (conflict.studentId) {
			return conflict.studentId;
		}

		// 返回第一個已分配的學生
		const assignedStudents = Array.from(currentAssignment.keys());
		return assignedStudents.length > 0 ? assignedStudents[0] : null;
	}

	/**
	 * 尋找連鎖中的下一個學生
	 */
	findNextStudentInChain(currentStudent, currentAssignment, students, seats, conditions) {
		// 簡化實現，實際應該有更複雜的邏輯
		const assignedStudents = Array.from(currentAssignment.keys());
		const availableStudents = assignedStudents.filter(id => id !== currentStudent);

		return availableStudents.length > 0 ? availableStudents[0] : null;
	}

	/**
	 * 獲取調整歷史
	 */
	getAdjustmentHistory() {
		return this.adjustmentHistory;
	}

	/**
	 * 清除調整歷史
	 */
	clearAdjustmentHistory() {
		this.adjustmentHistory = [];
	}

	/**
	 * 獲取當前策略
	 */
	getCurrentStrategy() {
		return this.currentStrategy;
	}

	/**
	 * 獲取嘗試次數
	 */
	getAttemptCount() {
		return this.attemptCount;
	}

	// ==================== 自適應策略選擇 ====================

	/**
	 * 策略評估 - 評估策略的適用性和效果
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

	// ==================== 自適應策略選擇 ====================

	/**
	 * 策略選擇算法 - 選擇最佳策略
	 * @param {Object} conflict 衝突信息
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 選中的最佳策略
	 */
	selectOptimalStrategy(conflict, currentAssignment, students, seats, conditions) {
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
		const historicalAdjustment = this.calculateHistoricalAdjustment(strategyScores);

		// 3. 考慮當前情況的特殊因素
		const situationalAdjustment = this.calculateSituationalAdjustment(conflict, currentAssignment, strategyScores);

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
		this.recordStrategySelection({
			conflict,
			evaluations,
			finalScores,
			selectedStrategy: bestStrategy,
			selectionReason: 'optimal_score'
		});

		return bestStrategy || strategies[0]; // 如果沒有找到最佳策略，返回第一個
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

	// ==================== 策略選擇輔助方法 ====================

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

	// ==================== 策略學習輔助方法 ====================

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

	// ==================== 策略適應輔助方法 ====================

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

	// ==================== 記錄和統計方法 ====================

	/**
	 * 記錄策略選擇
	 * @param {Object} selectionData 選擇數據
	 */
	recordStrategySelection(selectionData) {
		// 這裡可以記錄策略選擇的詳細信息
		// 用於後續分析和調試
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

	// ==================== 優先級優化功能 ====================

	/**
	 * 計算優先級 - 計算學生、座位或條件的優先級
	 * @param {Object} item 項目對象（學生、座位或條件）
	 * @param {string} itemType 項目類型（'student', 'seat', 'condition'）
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 優先級分數
	 */
	calculatePriority(item, itemType, currentAssignment, students, seats, conditions) {
		if (!item) {
			return 0;
		}

		let priority = 0;

		switch (itemType) {
			case 'student':
				priority = this.calculateStudentPriority(item, currentAssignment, students, seats, conditions);
				break;
			case 'seat':
				priority = this.calculateSeatPriority(item, currentAssignment, students, seats, conditions);
				break;
			case 'condition':
				priority = this.calculateConditionPriority(item, currentAssignment, students, seats, conditions);
				break;
			case 'strategy':
				priority = this.calculateStrategyPriority(item, currentAssignment, students, seats, conditions);
				break;
			default:
				priority = 0;
		}

		// 應用動態調整
		priority = this.applyDynamicPriorityAdjustment(item, itemType, priority, currentAssignment);

		return Math.max(0, Math.min(100, priority)); // 限制在0-100範圍內
	}

	/**
	 * 計算學生優先級
	 * @param {Object} student 學生對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 學生優先級
	 */
	calculateStudentPriority(student, currentAssignment, students, seats, conditions) {
		let priority = 50; // 基礎優先級

		// 1. 學生個人屬性優先級
		if (student.priority) {
			priority += student.priority * 10;
		}

		// 2. 特殊需求優先級
		if (student.specialNeeds) {
			priority += 20;
		}

		// 3. 學生成績優先級
		if (student.grade) {
			priority += student.grade * 2;
		}

		// 4. 當前分配狀態優先級
		const currentSeat = currentAssignment.get(student.id);
		if (currentSeat) {
			// 已分配的學生，根據分配質量調整優先級
			const assignmentQuality = this.calculateAssignmentQuality(student, currentSeat, currentAssignment, conditions);
			priority += assignmentQuality * 5;
		} else {
			// 未分配的學生，提高優先級
			priority += 15;
		}

		// 5. 條件滿足度優先級
		const conditionSatisfaction = this.calculateConditionSatisfaction(student, currentAssignment, conditions);
		priority += conditionSatisfaction * 10;

		// 6. 歷史表現優先級
		const historicalPerformance = this.getStudentHistoricalPerformance(student.id);
		priority += historicalPerformance * 5;

		return priority;
	}

	/**
	 * 計算座位優先級
	 * @param {Object} seat 座位對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 座位優先級
	 */
	calculateSeatPriority(seat, currentAssignment, students, seats, conditions) {
		let priority = 50; // 基礎優先級

		// 1. 座位位置優先級
		if (seat.row === 1) {
			priority += 10; // 前排優先
		} else if (seat.row <= 3) {
			priority += 5; // 前三排優先
		}

		// 2. 座位類型優先級
		if (seat.type === 'premium') {
			priority += 15;
		} else if (seat.type === 'standard') {
			priority += 5;
		}

		// 3. 座位可用性優先級
		const isOccupied = Array.from(currentAssignment.values()).some(s =>
			s.row === seat.row && s.col === seat.col
		);
		if (!isOccupied) {
			priority += 10; // 空座位優先
		}

		// 4. 座位條件匹配度優先級
		const conditionMatchScore = this.calculateSeatConditionMatch(seat, students, conditions);
		priority += conditionMatchScore * 8;

		// 5. 座位群組優先級
		if (seat.groupId) {
			const groupDemand = this.calculateGroupDemand(seat.groupId, students, currentAssignment);
			priority += groupDemand * 5;
		}

		return priority;
	}

	/**
	 * 計算條件優先級
	 * @param {Object} condition 條件對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 條件優先級
	 */
	calculateConditionPriority(condition, currentAssignment, students, seats, conditions) {
		let priority = 50; // 基礎優先級

		// 1. 條件類型優先級
		const typePriority = {
			'ADJACENT': 20,
			'GROUP': 15,
			'DISTANCE': 10,
			'SPECIAL': 25
		};
		priority += typePriority[condition.type] || 10;

		// 2. 條件緊急程度優先級
		if (condition.urgent) {
			priority += 20;
		}

		// 3. 條件影響範圍優先級
		const affectedStudents = this.getConditionAffectedStudents(condition, students);
		priority += affectedStudents.length * 3;

		// 4. 條件滿足度優先級
		const satisfactionRate = this.calculateConditionSatisfactionRate(condition, currentAssignment);
		if (satisfactionRate < 0.5) {
			priority += 15; // 低滿足度提高優先級
		}

		// 5. 條件複雜度優先級
		const complexity = this.calculateConditionComplexity(condition);
		priority += complexity * 5;

		return priority;
	}

	/**
	 * 計算策略優先級
	 * @param {Object} strategy 策略對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 策略優先級
	 */
	calculateStrategyPriority(strategy, currentAssignment, students, seats, conditions) {
		let priority = strategy.priority || 50; // 基礎優先級

		// 1. 策略歷史成功率優先級
		const performance = this.strategyPerformance.get(strategy.name);
		if (performance && performance.totalExecutions > 0) {
			const successRate = performance.successfulExecutions / performance.totalExecutions;
			priority += successRate * 20;
		}

		// 2. 策略效率優先級
		if (performance && performance.totalExecutions > 0) {
			const avgAttempts = performance.totalAttempts / performance.totalExecutions;
			const avgTime = performance.totalExecutionTime / performance.totalExecutions;

			// 嘗試次數效率
			const attemptEfficiency = Math.max(0, 1 - (avgAttempts / 20));
			priority += attemptEfficiency * 10;

			// 時間效率
			const timeEfficiency = Math.max(0, 1 - (avgTime / 1000));
			priority += timeEfficiency * 10;
		}

		// 3. 策略適用性優先級
		const applicability = this.evaluateStrategyApplicability(strategy, currentAssignment, students, seats, conditions);
		priority += applicability * 15;

		return priority;
	}

	/**
	 * 按優先級排序 - 對項目列表按優先級進行排序
	 * @param {Array} items 項目列表
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {string} sortOrder 排序順序（'asc' 或 'desc'）
	 * @returns {Array} 排序後的項目列表
	 */
	sortByPriority(items, itemType, currentAssignment, students, seats, conditions, sortOrder = 'desc') {
		if (!Array.isArray(items) || items.length === 0) {
			return items;
		}

		// 計算每個項目的優先級
		const itemsWithPriority = items.map(item => ({
			item,
			priority: this.calculatePriority(item, itemType, currentAssignment, students, seats, conditions)
		}));

		// 按優先級排序
		itemsWithPriority.sort((a, b) => {
			if (sortOrder === 'desc') {
				return b.priority - a.priority; // 降序（高優先級在前）
			} else {
				return a.priority - b.priority; // 升序（低優先級在前）
			}
		});

		// 返回排序後的項目（不包含優先級信息）
		return itemsWithPriority.map(item => item.item);
	}

	/**
	 * 動態優先級調整 - 根據當前情況動態調整優先級
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @param {number} basePriority 基礎優先級
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 調整後的優先級
	 */
	adjustPriority(item, itemType, basePriority, currentAssignment) {
		let adjustedPriority = basePriority;

		// 1. 時間因素調整
		const timeAdjustment = this.calculateTimeBasedAdjustment(item, itemType);
		adjustedPriority += timeAdjustment;

		// 2. 資源競爭調整
		const competitionAdjustment = this.calculateCompetitionAdjustment(item, itemType, currentAssignment);
		adjustedPriority += competitionAdjustment;

		// 3. 歷史表現調整
		const historicalAdjustment = this.calculateHistoricalAdjustment(item, itemType);
		adjustedPriority += historicalAdjustment;

		// 4. 緊急程度調整
		const urgencyAdjustment = this.calculateUrgencyAdjustment(item, itemType);
		adjustedPriority += urgencyAdjustment;

		// 5. 系統負載調整
		const loadAdjustment = this.calculateSystemLoadAdjustment(currentAssignment);
		adjustedPriority += loadAdjustment;

		return Math.max(0, Math.min(100, adjustedPriority));
	}

	/**
	 * 優先級衝突解決 - 解決多個項目之間的優先級衝突
	 * @param {Array} conflictingItems 衝突項目列表
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 衝突解決結果
	 */
	resolvePriorityConflict(conflictingItems, itemType, currentAssignment, students, seats, conditions) {
		if (!Array.isArray(conflictingItems) || conflictingItems.length === 0) {
			return {
				resolved: false,
				selectedItem: null,
				resolutionMethod: 'no_conflict',
				reason: '沒有衝突項目'
			};
		}

		// 1. 計算所有項目的綜合優先級
		const itemsWithPriority = conflictingItems.map(item => ({
			item,
			priority: this.calculatePriority(item, itemType, currentAssignment, students, seats, conditions),
			adjustedPriority: this.adjustPriority(item, itemType,
				this.calculatePriority(item, itemType, currentAssignment, students, seats, conditions),
				currentAssignment)
		}));

		// 2. 按調整後的優先級排序
		itemsWithPriority.sort((a, b) => b.adjustedPriority - a.adjustedPriority);

		// 3. 檢查是否有明顯的優先級差異
		const topPriority = itemsWithPriority[0].adjustedPriority;
		const secondPriority = itemsWithPriority.length > 1 ? itemsWithPriority[1].adjustedPriority : 0;
		const priorityDifference = topPriority - secondPriority;

		// 4. 根據優先級差異選擇解決方法
		let resolutionMethod = 'priority_based';
		let reason = '基於優先級選擇';

		if (priorityDifference < 5) {
			// 優先級差異很小，使用其他方法
			resolutionMethod = 'tie_breaker';
			reason = '優先級差異小，使用平局打破方法';

			// 使用平局打破方法
			const tieBreakerResult = this.applyTieBreaker(itemsWithPriority, itemType, currentAssignment);
			return {
				resolved: true,
				selectedItem: tieBreakerResult.selectedItem,
				resolutionMethod: tieBreakerResult.method,
				reason: tieBreakerResult.reason
			};
		}

		// 5. 返回最高優先級的項目
		return {
			resolved: true,
			selectedItem: itemsWithPriority[0].item,
			resolutionMethod,
			reason,
			priorityScore: topPriority,
			allPriorities: itemsWithPriority.map(item => ({
				item: item.item,
				priority: item.priority,
				adjustedPriority: item.adjustedPriority
			}))
		};
	}

	// ==================== 優先級計算輔助方法 ====================

	/**
	 * 計算分配質量
	 * @param {Object} student 學生對象
	 * @param {Object} seat 座位對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 分配質量分數
	 */
	calculateAssignmentQuality(student, seat, currentAssignment, conditions) {
		let quality = 50; // 基礎質量

		// 檢查條件滿足度
		const studentConditions = this.getStudentConditions(student.id, conditions);
		let satisfiedConditions = 0;
		let totalConditions = studentConditions.length;

		for (const condition of studentConditions) {
			const tempAssignment = new Map(currentAssignment);
			tempAssignment.set(student.id, seat);

			if (this.checkCondition(condition, tempAssignment)) {
				satisfiedConditions++;
			}
		}

		if (totalConditions > 0) {
			quality += (satisfiedConditions / totalConditions) * 30;
		}

		// 座位偏好匹配
		if (student.preferredSeats && student.preferredSeats.includes(`${seat.row}-${seat.col}`)) {
			quality += 20;
		}

		return quality;
	}

	/**
	 * 計算條件滿足度
	 * @param {Object} student 學生對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 條件滿足度
	 */
	calculateConditionSatisfaction(student, currentAssignment, conditions) {
		const studentConditions = this.getStudentConditions(student.id, conditions);
		if (studentConditions.length === 0) {
			return 1.0;
		}

		let satisfiedCount = 0;
		for (const condition of studentConditions) {
			if (this.checkCondition(condition, currentAssignment)) {
				satisfiedCount++;
			}
		}

		return satisfiedCount / studentConditions.length;
	}

	/**
	 * 獲取學生歷史表現
	 * @param {string} studentId 學生ID
	 * @returns {number} 歷史表現分數
	 */
	getStudentHistoricalPerformance(studentId) {
		// 這裡可以從歷史數據中獲取學生的表現
		// 簡化實現，返回隨機分數
		return Math.random() * 10;
	}

	/**
	 * 計算座位條件匹配度
	 * @param {Object} seat 座位對象
	 * @param {Array} students 學生列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 匹配度分數
	 */
	calculateSeatConditionMatch(seat, students, conditions) {
		let matchScore = 0;
		let totalChecks = 0;

		for (const student of students) {
			for (const condition of conditions) {
				if (this.isStudentInCondition(student.id, condition)) {
					totalChecks++;
					if (this.doesSeatSatisfyCondition(seat, condition)) {
						matchScore++;
					}
				}
			}
		}

		return totalChecks > 0 ? matchScore / totalChecks : 0;
	}

	/**
	 * 計算群組需求
	 * @param {string} groupId 群組ID
	 * @param {Array} students 學生列表
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 群組需求分數
	 */
	calculateGroupDemand(groupId, students, currentAssignment) {
		let groupStudents = 0;
		let assignedGroupStudents = 0;

		for (const student of students) {
			if (student.groupId === groupId) {
				groupStudents++;
				if (currentAssignment.has(student.id)) {
					assignedGroupStudents++;
				}
			}
		}

		return groupStudents > 0 ? (groupStudents - assignedGroupStudents) / groupStudents : 0;
	}

	/**
	 * 獲取條件影響的學生
	 * @param {Object} condition 條件對象
	 * @param {Array} students 學生列表
	 * @returns {Array} 影響的學生列表
	 */
	getConditionAffectedStudents(condition, students) {
		if (!condition.students) {
			return [];
		}

		const affectedIds = Array.isArray(condition.students) ? condition.students : [condition.students];
		return students.filter(student => affectedIds.includes(student.id));
	}

	/**
	 * 計算條件滿足率
	 * @param {Object} condition 條件對象
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 滿足率
	 */
	calculateConditionSatisfactionRate(condition, currentAssignment) {
		// 簡化實現，返回隨機滿足率
		return Math.random();
	}

	/**
	 * 計算條件複雜度
	 * @param {Object} condition 條件對象
	 * @returns {number} 複雜度分數
	 */
	calculateConditionComplexity(condition) {
		let complexity = 1;

		// 根據條件類型調整複雜度
		switch (condition.type) {
			case 'ADJACENT':
				complexity = 2;
				break;
			case 'GROUP':
				complexity = 3;
				break;
			case 'DISTANCE':
				complexity = 4;
				break;
			case 'SPECIAL':
				complexity = 5;
				break;
		}

		// 根據影響學生數量調整複雜度
		if (condition.students) {
			const studentCount = Array.isArray(condition.students) ? condition.students.length : 1;
			complexity += studentCount * 0.5;
		}

		return Math.min(complexity, 10);
	}

	/**
	 * 評估策略適用性
	 * @param {Object} strategy 策略對象
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 適用性分數
	 */
	evaluateStrategyApplicability(strategy, currentAssignment, students, seats, conditions) {
		// 簡化實現，返回隨機適用性分數
		return Math.random();
	}

	// ==================== 動態調整輔助方法 ====================

	/**
	 * 計算基於時間的調整
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @returns {number} 時間調整值
	 */
	calculateTimeBasedAdjustment(item, itemType) {
		// 簡化實現，返回隨機調整值
		return (Math.random() - 0.5) * 10;
	}

	/**
	 * 計算競爭調整
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 競爭調整值
	 */
	calculateCompetitionAdjustment(item, itemType, currentAssignment) {
		// 簡化實現，返回隨機調整值
		return (Math.random() - 0.5) * 5;
	}

	/**
	 * 計算歷史調整
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @returns {number} 歷史調整值
	 */
	calculateHistoricalAdjustment(item, itemType) {
		// 簡化實現，返回隨機調整值
		return (Math.random() - 0.5) * 3;
	}

	/**
	 * 計算緊急程度調整
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @returns {number} 緊急程度調整值
	 */
	calculateUrgencyAdjustment(item, itemType) {
		// 簡化實現，返回隨機調整值
		return (Math.random() - 0.5) * 8;
	}

	/**
	 * 計算系統負載調整
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 系統負載調整值
	 */
	calculateSystemLoadAdjustment(currentAssignment) {
		// 簡化實現，返回隨機調整值
		return (Math.random() - 0.5) * 4;
	}

	/**
	 * 應用動態優先級調整
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @param {number} basePriority 基礎優先級
	 * @param {Map} currentAssignment 當前分配
	 * @returns {number} 調整後的優先級
	 */
	applyDynamicPriorityAdjustment(item, itemType, basePriority, currentAssignment) {
		return this.adjustPriority(item, itemType, basePriority, currentAssignment);
	}

	// ==================== 衝突解決輔助方法 ====================

	/**
	 * 應用平局打破方法
	 * @param {Array} itemsWithPriority 帶優先級的項目列表
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Object} 平局打破結果
	 */
	applyTieBreaker(itemsWithPriority, itemType, currentAssignment) {
		// 1. 隨機選擇（最簡單的平局打破方法）
		const randomIndex = Math.floor(Math.random() * itemsWithPriority.length);

		return {
			selectedItem: itemsWithPriority[randomIndex].item,
			method: 'random_selection',
			reason: '優先級相同，隨機選擇'
		};
	}

	/**
	 * 檢查學生是否在條件中
	 * @param {string} studentId 學生ID
	 * @param {Object} condition 條件對象
	 * @returns {boolean} 是否在條件中
	 */
	isStudentInCondition(studentId, condition) {
		if (!condition.students) {
			return false;
		}

		if (Array.isArray(condition.students)) {
			return condition.students.includes(studentId);
		}

		return condition.students === studentId;
	}

	/**
	 * 檢查座位是否滿足條件
	 * @param {Object} seat 座位對象
	 * @param {Object} condition 條件對象
	 * @returns {boolean} 是否滿足條件
	 */
	doesSeatSatisfyCondition(seat, condition) {
		// 簡化實現，返回隨機結果
		return Math.random() > 0.5;
	}

	// ==================== 優先級管理方法 ====================

	/**
	 * 獲取項目優先級
	 * @param {Object} item 項目對象
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 優先級信息
	 */
	getItemPriority(item, itemType, currentAssignment, students, seats, conditions) {
		const basePriority = this.calculatePriority(item, itemType, currentAssignment, students, seats, conditions);
		const adjustedPriority = this.adjustPriority(item, itemType, basePriority, currentAssignment);

		return {
			item,
			itemType,
			basePriority,
			adjustedPriority,
			adjustments: {
				time: this.calculateTimeBasedAdjustment(item, itemType),
				competition: this.calculateCompetitionAdjustment(item, itemType, currentAssignment),
				historical: this.calculateHistoricalAdjustment(item, itemType),
				urgency: this.calculateUrgencyAdjustment(item, itemType),
				systemLoad: this.calculateSystemLoadAdjustment(currentAssignment)
			}
		};
	}

	/**
	 * 批量計算優先級
	 * @param {Array} items 項目列表
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Array} 帶優先級的項目列表
	 */
	batchCalculatePriority(items, itemType, currentAssignment, students, seats, conditions) {
		return items.map(item => this.getItemPriority(item, itemType, currentAssignment, students, seats, conditions));
	}

	/**
	 * 獲取優先級統計
	 * @param {Array} items 項目列表
	 * @param {string} itemType 項目類型
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 優先級統計信息
	 */
	getPriorityStatistics(items, itemType, currentAssignment, students, seats, conditions) {
		const priorities = items.map(item =>
			this.calculatePriority(item, itemType, currentAssignment, students, seats, conditions)
		);

		if (priorities.length === 0) {
			return {
				count: 0,
				average: 0,
				min: 0,
				max: 0,
				median: 0,
				variance: 0
			};
		}

		const sorted = priorities.sort((a, b) => a - b);
		const sum = priorities.reduce((acc, val) => acc + val, 0);
		const average = sum / priorities.length;
		const variance = priorities.reduce((acc, val) => acc + Math.pow(val - average, 2), 0) / priorities.length;

		return {
			count: priorities.length,
			average: average,
			min: sorted[0],
			max: sorted[sorted.length - 1],
			median: sorted[Math.floor(sorted.length / 2)],
			variance: variance
		};
	}

	// ==================== 全局優化算法 ====================

	/**
	 * 全局狀態評估 - 評估當前分配狀態的整體質量
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 全局狀態評估結果
	 */
	evaluateGlobalState(currentAssignment, students, seats, conditions) {
		const evaluation = {
			overallScore: 0,
			assignmentRate: 0,
			conditionSatisfaction: 0,
			studentSatisfaction: 0,
			seatUtilization: 0,
			conflictCount: 0,
			optimizationPotential: 0,
			details: {}
		};

		try {
			// 1. 分配率評估
			evaluation.assignmentRate = this.calculateAssignmentRate(currentAssignment, students);
			evaluation.details.assignmentRate = {
				assignedStudents: currentAssignment.size,
				totalStudents: students.length,
				rate: evaluation.assignmentRate
			};

			// 2. 條件滿足度評估
			evaluation.conditionSatisfaction = this.calculateGlobalConditionSatisfaction(currentAssignment, conditions);
			evaluation.details.conditionSatisfaction = {
				satisfiedConditions: 0,
				totalConditions: conditions.length,
				rate: evaluation.conditionSatisfaction
			};

			// 3. 學生滿意度評估
			evaluation.studentSatisfaction = this.calculateGlobalStudentSatisfaction(currentAssignment, students, seats, conditions);
			evaluation.details.studentSatisfaction = {
				satisfiedStudents: 0,
				totalStudents: students.length,
				rate: evaluation.studentSatisfaction
			};

			// 4. 座位利用率評估
			evaluation.seatUtilization = this.calculateSeatUtilization(currentAssignment, seats);
			evaluation.details.seatUtilization = {
				usedSeats: currentAssignment.size,
				totalSeats: seats.length,
				rate: evaluation.seatUtilization
			};

			// 5. 衝突數量評估
			evaluation.conflictCount = this.countGlobalConflicts(currentAssignment, students, seats, conditions);
			evaluation.details.conflictCount = {
				conflicts: evaluation.conflictCount,
				severity: this.assessConflictSeverity(evaluation.conflictCount, students.length)
			};

			// 6. 優化潛力評估
			evaluation.optimizationPotential = this.calculateOptimizationPotential(currentAssignment, students, seats, conditions);
			evaluation.details.optimizationPotential = {
				potential: evaluation.optimizationPotential,
				areas: this.identifyOptimizationAreas(currentAssignment, students, seats, conditions)
			};

			// 7. 綜合評分計算
			evaluation.overallScore = this.calculateOverallGlobalScore(evaluation);

		} catch (error) {
			console.error('全局狀態評估失敗:', error);
			evaluation.overallScore = 0;
		}

		return evaluation;
	}

	/**
	 * 全局優化算法 - 執行全局優化來改善分配狀態
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} options 優化選項
	 * @returns {Object} 全局優化結果
	 */
	globalOptimization(currentAssignment, students, seats, conditions, options = {}) {
		const optimizationOptions = {
			maxIterations: options.maxIterations || 50,
			improvementThreshold: options.improvementThreshold || 0.01,
			timeLimit: options.timeLimit || 30000, // 30秒
			enableLocalOptimaAvoidance: options.enableLocalOptimaAvoidance !== false,
			enableConvergenceCheck: options.enableConvergenceCheck !== false,
			...options
		};

		const optimizationResult = {
			success: false,
			improvedAssignment: new Map(currentAssignment),
			initialScore: 0,
			finalScore: 0,
			improvement: 0,
			iterations: 0,
			executionTime: 0,
			convergenceReached: false,
			localOptimaAvoided: false,
			optimizationHistory: [],
			details: {}
		};

		const startTime = Date.now();

		try {
			// 1. 評估初始狀態
			const initialEvaluation = this.evaluateGlobalState(currentAssignment, students, seats, conditions);
			optimizationResult.initialScore = initialEvaluation.overallScore;
			optimizationResult.improvedAssignment = new Map(currentAssignment);

			// 2. 執行迭代優化
			let currentAssignment = new Map(optimizationResult.improvedAssignment);
			let currentScore = optimizationResult.initialScore;
			let consecutiveNoImprovement = 0;
			let bestAssignment = new Map(currentAssignment);
			let bestScore = currentScore;

			for (let iteration = 0; iteration < optimizationOptions.maxIterations; iteration++) {
				// 檢查時間限制
				if (Date.now() - startTime > optimizationOptions.timeLimit) {
					optimizationResult.details.terminationReason = 'time_limit_reached';
					break;
				}

				// 檢查收斂
				if (optimizationOptions.enableConvergenceCheck &&
					this.checkGlobalConvergence(optimizationResult.optimizationHistory, iteration)) {
					optimizationResult.convergenceReached = true;
					optimizationResult.details.terminationReason = 'convergence_reached';
					break;
				}

				// 執行單次優化
				const iterationResult = this.performOptimizationIteration(
					currentAssignment, students, seats, conditions, iteration
				);

				// 評估新狀態
				const newEvaluation = this.evaluateGlobalState(iterationResult.newAssignment, students, seats, conditions);
				const newScore = newEvaluation.overallScore;

				// 記錄優化歷史
				optimizationResult.optimizationHistory.push({
					iteration,
					score: newScore,
					improvement: newScore - currentScore,
					strategy: iterationResult.strategy,
					changes: iterationResult.changes
				});

				// 檢查改進
				if (newScore > bestScore) {
					bestScore = newScore;
					bestAssignment = new Map(iterationResult.newAssignment);
					consecutiveNoImprovement = 0;
				} else {
					consecutiveNoImprovement++;
				}

				// 更新當前狀態
				currentAssignment = new Map(iterationResult.newAssignment);
				currentScore = newScore;

				// 檢查改進閾值
				if (Math.abs(newScore - currentScore) < optimizationOptions.improvementThreshold) {
					consecutiveNoImprovement++;
				}

				// 避免局部最優
				if (optimizationOptions.enableLocalOptimaAvoidance &&
					consecutiveNoImprovement > 5) {
					const avoidanceResult = this.avoidLocalOptima(
						currentAssignment, students, seats, conditions, iteration
					);
					if (avoidanceResult.success) {
						currentAssignment = new Map(avoidanceResult.newAssignment);
						optimizationResult.localOptimaAvoided = true;
						consecutiveNoImprovement = 0;
					}
				}

				optimizationResult.iterations = iteration + 1;
			}

			// 3. 設置最終結果
			optimizationResult.improvedAssignment = bestAssignment;
			optimizationResult.finalScore = bestScore;
			optimizationResult.improvement = bestScore - optimizationResult.initialScore;
			optimizationResult.success = optimizationResult.improvement > 0;
			optimizationResult.executionTime = Date.now() - startTime;

			// 4. 生成詳細報告
			optimizationResult.details = this.generateOptimizationReport(optimizationResult, students, seats, conditions);

		} catch (error) {
			console.error('全局優化失敗:', error);
			optimizationResult.success = false;
			optimizationResult.details.error = error.message;
		}

		return optimizationResult;
	}

	/**
	 * 局部最優避免 - 避免陷入局部最優解
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
			strategy: 'none',
			perturbation: 0,
			details: {}
		};

		try {
			// 1. 評估當前狀態的局部性
			const localityAssessment = this.assessLocalOptimaLocality(currentAssignment, students, seats, conditions);

			if (localityAssessment.isLocalOptima) {
				// 2. 選擇避免策略
				const avoidanceStrategy = this.selectAvoidanceStrategy(localityAssessment, iteration);
				avoidanceResult.strategy = avoidanceStrategy.name;

				// 3. 執行避免策略
				switch (avoidanceStrategy.name) {
					case 'random_perturbation':
						avoidanceResult.newAssignment = this.performRandomPerturbation(currentAssignment, students, seats, conditions);
						break;
					case 'strategic_swap':
						avoidanceResult.newAssignment = this.performStrategicSwap(currentAssignment, students, seats, conditions);
						break;
					case 'partial_reset':
						avoidanceResult.newAssignment = this.performPartialReset(currentAssignment, students, seats, conditions);
						break;
					case 'temperature_increase':
						avoidanceResult.newAssignment = this.performTemperatureIncrease(currentAssignment, students, seats, conditions);
						break;
					default:
						avoidanceResult.newAssignment = new Map(currentAssignment);
				}

				// 4. 驗證新分配的有效性
				if (this.validateAssignment(avoidanceResult.newAssignment, students, seats, conditions)) {
					avoidanceResult.success = true;
					avoidanceResult.perturbation = this.calculatePerturbationLevel(currentAssignment, avoidanceResult.newAssignment);
				}

				// 5. 記錄避免詳情
				avoidanceResult.details = {
					localityAssessment,
					avoidanceStrategy,
					perturbationLevel: avoidanceResult.perturbation
				};
			}

		} catch (error) {
			console.error('局部最優避免失敗:', error);
			avoidanceResult.success = false;
			avoidanceResult.details.error = error.message;
		}

		return avoidanceResult;
	}

	/**
	 * 全局收斂檢查 - 檢查優化過程是否已收斂
	 * @param {Array} optimizationHistory 優化歷史
	 * @param {number} currentIteration 當前迭代次數
	 * @returns {Object} 收斂檢查結果
	 */
	checkGlobalConvergence(optimizationHistory, currentIteration) {
		const convergenceResult = {
			converged: false,
			convergenceType: 'none',
			confidence: 0,
			details: {}
		};

		if (optimizationHistory.length < 10) {
			return convergenceResult;
		}

		try {
			// 1. 檢查分數收斂
			const scoreConvergence = this.checkScoreConvergence(optimizationHistory);
			if (scoreConvergence.converged) {
				convergenceResult.converged = true;
				convergenceResult.convergenceType = 'score_convergence';
				convergenceResult.confidence = scoreConvergence.confidence;
				convergenceResult.details.scoreConvergence = scoreConvergence;
			}

			// 2. 檢查改進收斂
			const improvementConvergence = this.checkImprovementConvergence(optimizationHistory);
			if (improvementConvergence.converged) {
				convergenceResult.converged = true;
				convergenceResult.convergenceType = 'improvement_convergence';
				convergenceResult.confidence = Math.max(convergenceResult.confidence, improvementConvergence.confidence);
				convergenceResult.details.improvementConvergence = improvementConvergence;
			}

			// 3. 檢查策略收斂
			const strategyConvergence = this.checkStrategyConvergence(optimizationHistory);
			if (strategyConvergence.converged) {
				convergenceResult.converged = true;
				convergenceResult.convergenceType = 'strategy_convergence';
				convergenceResult.confidence = Math.max(convergenceResult.confidence, strategyConvergence.confidence);
				convergenceResult.details.strategyConvergence = strategyConvergence;
			}

			// 4. 綜合收斂評估
			convergenceResult.details = {
				scoreConvergence,
				improvementConvergence,
				strategyConvergence,
				totalIterations: currentIteration,
				historyLength: optimizationHistory.length
			};

		} catch (error) {
			console.error('收斂檢查失敗:', error);
			convergenceResult.converged = false;
			convergenceResult.details.error = error.message;
		}

		return convergenceResult;
	}

	// ==================== 全局優化輔助方法 ====================

	/**
	 * 計算分配率
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @returns {number} 分配率
	 */
	calculateAssignmentRate(assignment, students) {
		return students.length > 0 ? assignment.size / students.length : 0;
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
		for (const condition of conditions) {
			if (this.checkCondition(condition, assignment)) {
				satisfiedConditions++;
			}
		}

		return satisfiedConditions / conditions.length;
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
		for (const student of students) {
			const seat = assignment.get(student.id);
			if (seat) {
				const satisfaction = this.calculateStudentSatisfaction(student, seat, assignment, conditions);
				totalSatisfaction += satisfaction;
			}
		}

		return totalSatisfaction / students.length;
	}

	/**
	 * 計算座位利用率
	 * @param {Map} assignment 分配
	 * @param {Array} seats 座位列表
	 * @returns {number} 座位利用率
	 */
	calculateSeatUtilization(assignment, seats) {
		return seats.length > 0 ? assignment.size / seats.length : 0;
	}

	/**
	 * 計算學生滿意度
	 * @param {Object} student 學生對象
	 * @param {Object} seat 座位對象
	 * @param {Map} assignment 分配
	 * @param {Array} conditions 條件列表
	 * @returns {number} 滿意度分數
	 */
	calculateStudentSatisfaction(student, seat, assignment, conditions) {
		let satisfaction = 0.5; // 基礎滿意度

		// 條件滿足度
		const conditionSatisfaction = this.calculateConditionSatisfaction(student, assignment, conditions);
		satisfaction += conditionSatisfaction * 0.3;

		// 座位偏好
		if (student.preferredSeats && student.preferredSeats.includes(`${seat.row}-${seat.col}`)) {
			satisfaction += 0.2;
		}

		// 座位質量
		if (seat.type === 'premium') {
			satisfaction += 0.1;
		}

		return Math.min(1, Math.max(0, satisfaction));
	}

	/**
	 * 計算全局衝突數量
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 衝突數量
	 */
	countGlobalConflicts(assignment, students, seats, conditions) {
		let conflictCount = 0;

		// 檢查條件衝突
		for (const condition of conditions) {
			if (!this.checkCondition(condition, assignment)) {
				conflictCount++;
			}
		}

		// 檢查座位重複分配
		const usedSeats = new Set();
		for (const seat of assignment.values()) {
			const seatKey = `${seat.row}-${seat.col}`;
			if (usedSeats.has(seatKey)) {
				conflictCount++;
			}
			usedSeats.add(seatKey);
		}

		return conflictCount;
	}

	/**
	 * 評估衝突嚴重性
	 * @param {number} conflictCount 衝突數量
	 * @param {number} totalStudents 總學生數
	 * @returns {string} 嚴重性等級
	 */
	assessConflictSeverity(conflictCount, totalStudents) {
		const conflictRate = totalStudents > 0 ? conflictCount / totalStudents : 0;

		if (conflictRate < 0.1) return 'low';
		if (conflictRate < 0.3) return 'medium';
		if (conflictRate < 0.5) return 'high';
		return 'critical';
	}

	/**
	 * 計算優化潛力
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 優化潛力
	 */
	calculateOptimizationPotential(assignment, students, seats, conditions) {
		let potential = 0;

		// 未分配學生的潛力
		const unassignedStudents = students.length - assignment.size;
		potential += unassignedStudents * 0.2;

		// 條件不滿足的潛力
		const unsatisfiedConditions = conditions.filter(condition => !this.checkCondition(condition, assignment)).length;
		potential += unsatisfiedConditions * 0.3;

		// 座位利用率潛力
		const utilizationRate = this.calculateSeatUtilization(assignment, seats);
		if (utilizationRate < 0.8) {
			potential += (0.8 - utilizationRate) * 0.4;
		}

		return Math.min(1, potential);
	}

	/**
	 * 識別優化區域
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Array} 優化區域列表
	 */
	identifyOptimizationAreas(assignment, students, seats, conditions) {
		const areas = [];

		// 未分配學生區域
		if (assignment.size < students.length) {
			areas.push({
				type: 'unassigned_students',
				priority: 'high',
				count: students.length - assignment.size
			});
		}

		// 條件衝突區域
		const unsatisfiedConditions = conditions.filter(condition => !this.checkCondition(condition, assignment));
		if (unsatisfiedConditions.length > 0) {
			areas.push({
				type: 'condition_conflicts',
				priority: 'high',
				count: unsatisfiedConditions.length
			});
		}

		// 座位利用率區域
		const utilizationRate = this.calculateSeatUtilization(assignment, seats);
		if (utilizationRate < 0.8) {
			areas.push({
				type: 'low_utilization',
				priority: 'medium',
				rate: utilizationRate
			});
		}

		return areas;
	}

	/**
	 * 計算綜合全局評分
	 * @param {Object} evaluation 評估結果
	 * @returns {number} 綜合評分
	 */
	calculateOverallGlobalScore(evaluation) {
		const weights = {
			assignmentRate: 0.25,
			conditionSatisfaction: 0.30,
			studentSatisfaction: 0.25,
			seatUtilization: 0.10,
			conflictCount: -0.10 // 負權重，衝突越多分數越低
		};

		let score = 0;
		score += evaluation.assignmentRate * weights.assignmentRate;
		score += evaluation.conditionSatisfaction * weights.conditionSatisfaction;
		score += evaluation.studentSatisfaction * weights.studentSatisfaction;
		score += evaluation.seatUtilization * weights.seatUtilization;
		score += Math.max(0, 1 - evaluation.conflictCount / 10) * Math.abs(weights.conflictCount);

		return Math.min(1, Math.max(0, score));
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
		// 選擇優化策略
		const strategies = ['swap_optimization', 'reassignment_optimization', 'condition_optimization'];
		const selectedStrategy = strategies[iteration % strategies.length];

		let newAssignment = new Map(currentAssignment);
		let changes = [];

		switch (selectedStrategy) {
			case 'swap_optimization':
				const swapResult = this.performSwapOptimization(currentAssignment, students, seats, conditions);
				newAssignment = swapResult.newAssignment;
				changes = swapResult.changes;
				break;
			case 'reassignment_optimization':
				const reassignmentResult = this.performReassignmentOptimization(currentAssignment, students, seats, conditions);
				newAssignment = reassignmentResult.newAssignment;
				changes = reassignmentResult.changes;
				break;
			case 'condition_optimization':
				const conditionResult = this.performConditionOptimization(currentAssignment, students, seats, conditions);
				newAssignment = conditionResult.newAssignment;
				changes = conditionResult.changes;
				break;
		}

		return {
			newAssignment,
			strategy: selectedStrategy,
			changes
		};
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
		const newAssignment = new Map(assignment);
		const changes = [];

		// 尋找可優化的交換
		const assignedStudents = Array.from(assignment.keys());
		for (let i = 0; i < assignedStudents.length; i++) {
			for (let j = i + 1; j < assignedStudents.length; j++) {
				const student1 = assignedStudents[i];
				const student2 = assignedStudents[j];
				const seat1 = assignment.get(student1);
				const seat2 = assignment.get(student2);

				// 檢查交換是否會改善情況
				const currentScore = this.calculateAssignmentQuality(
					students.find(s => s.id === student1), seat1, assignment, conditions
				) + this.calculateAssignmentQuality(
					students.find(s => s.id === student2), seat2, assignment, conditions
				);

				// 模擬交換
				const tempAssignment = new Map(assignment);
				tempAssignment.set(student1, seat2);
				tempAssignment.set(student2, seat1);

				const newScore = this.calculateAssignmentQuality(
					students.find(s => s.id === student1), seat2, tempAssignment, conditions
				) + this.calculateAssignmentQuality(
					students.find(s => s.id === student2), seat1, tempAssignment, conditions
				);

				if (newScore > currentScore) {
					newAssignment.set(student1, seat2);
					newAssignment.set(student2, seat1);
					changes.push({
						type: 'swap',
						student1,
						student2,
						improvement: newScore - currentScore
					});
					break; // 只執行一次交換
				}
			}
			if (changes.length > 0) break;
		}

		return { newAssignment, changes };
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
		const newAssignment = new Map(assignment);
		const changes = [];

		// 尋找未分配的學生
		const unassignedStudents = students.filter(student => !assignment.has(student.id));
		const availableSeats = seats.filter(seat =>
			!Array.from(assignment.values()).some(s => s.row === seat.row && s.col === seat.col)
		);

		for (const student of unassignedStudents) {
			let bestSeat = null;
			let bestScore = -1;

			for (const seat of availableSeats) {
				const score = this.calculateAssignmentQuality(student, seat, newAssignment, conditions);
				if (score > bestScore) {
					bestScore = score;
					bestSeat = seat;
				}
			}

			if (bestSeat) {
				newAssignment.set(student.id, bestSeat);
				changes.push({
					type: 'reassignment',
					student: student.id,
					seat: bestSeat,
					score: bestScore
				});
			}
		}

		return { newAssignment, changes };
	}

	/**
	 * 執行條件優化
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 條件優化結果
	 */
	performConditionOptimization(assignment, students, seats, conditions) {
		const newAssignment = new Map(assignment);
		const changes = [];

		// 找出不滿足的條件
		const unsatisfiedConditions = conditions.filter(condition => !this.checkCondition(condition, assignment));

		for (const condition of unsatisfiedConditions) {
			// 嘗試通過調整分配來滿足條件
			const adjustmentResult = this.adjustAssignmentForCondition(condition, newAssignment, students, seats, conditions);
			if (adjustmentResult.success) {
				newAssignment.clear();
				adjustmentResult.newAssignment.forEach((value, key) => newAssignment.set(key, value));
				changes.push({
					type: 'condition_adjustment',
					condition: condition.type,
					adjustments: adjustmentResult.adjustments
				});
			}
		}

		return { newAssignment, changes };
	}

	/**
	 * 為條件調整分配
	 * @param {Object} condition 條件對象
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 調整結果
	 */
	adjustAssignmentForCondition(condition, assignment, students, seats, conditions) {
		// 簡化實現，返回失敗結果
		return {
			success: false,
			newAssignment: new Map(assignment),
			adjustments: []
		};
	}

	/**
	 * 驗證分配
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {boolean} 是否有效
	 */
	validateAssignment(assignment, students, seats, conditions) {
		// 檢查是否有重複分配
		const usedSeats = new Set();
		for (const seat of assignment.values()) {
			const seatKey = `${seat.row}-${seat.col}`;
			if (usedSeats.has(seatKey)) {
				return false;
			}
			usedSeats.add(seatKey);
		}

		// 檢查座位是否有效
		for (const seat of assignment.values()) {
			const isValidSeat = seats.some(s => s.row === seat.row && s.col === seat.col);
			if (!isValidSeat) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 生成優化報告
	 * @param {Object} optimizationResult 優化結果
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 優化報告
	 */
	generateOptimizationReport(optimizationResult, students, seats, conditions) {
		const finalEvaluation = this.evaluateGlobalState(
			optimizationResult.improvedAssignment, students, seats, conditions
		);

		return {
			initialEvaluation: {
				score: optimizationResult.initialScore,
				assignmentRate: this.calculateAssignmentRate(new Map(), students),
				conditionSatisfaction: this.calculateGlobalConditionSatisfaction(new Map(), conditions)
			},
			finalEvaluation: {
				score: optimizationResult.finalScore,
				assignmentRate: this.calculateAssignmentRate(optimizationResult.improvedAssignment, students),
				conditionSatisfaction: this.calculateGlobalConditionSatisfaction(optimizationResult.improvedAssignment, conditions)
			},
			improvement: {
				score: optimizationResult.improvement,
				percentage: optimizationResult.initialScore > 0 ?
					(optimizationResult.improvement / optimizationResult.initialScore) * 100 : 0
			},
			performance: {
				iterations: optimizationResult.iterations,
				executionTime: optimizationResult.executionTime,
				iterationsPerSecond: optimizationResult.executionTime > 0 ?
					optimizationResult.iterations / (optimizationResult.executionTime / 1000) : 0
			},
			convergence: {
				reached: optimizationResult.convergenceReached,
				localOptimaAvoided: optimizationResult.localOptimaAvoided
			}
		};
	}

	// ==================== 局部最優避免輔助方法 ====================

	/**
	 * 評估局部最優的局部性
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 局部性評估結果
	 */
	assessLocalOptimaLocality(assignment, students, seats, conditions) {
		// 簡化實現
		return {
			isLocalOptima: Math.random() > 0.7,
			confidence: Math.random(),
			factors: {
				scoreStability: Math.random(),
				strategyRepetition: Math.random(),
				improvementRate: Math.random()
			}
		};
	}

	/**
	 * 選擇避免策略
	 * @param {Object} localityAssessment 局部性評估
	 * @param {number} iteration 迭代次數
	 * @returns {Object} 避免策略
	 */
	selectAvoidanceStrategy(localityAssessment, iteration) {
		const strategies = [
			{ name: 'random_perturbation', weight: 0.3 },
			{ name: 'strategic_swap', weight: 0.3 },
			{ name: 'partial_reset', weight: 0.2 },
			{ name: 'temperature_increase', weight: 0.2 }
		];

		// 根據迭代次數調整策略權重
		if (iteration > 30) {
			strategies[2].weight += 0.1; // 增加部分重置的權重
			strategies[3].weight += 0.1; // 增加溫度增加的權重
		}

		// 隨機選擇策略
		const random = Math.random();
		let cumulativeWeight = 0;
		for (const strategy of strategies) {
			cumulativeWeight += strategy.weight;
			if (random <= cumulativeWeight) {
				return strategy;
			}
		}

		return strategies[0];
	}

	/**
	 * 執行隨機擾動
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Map} 新的分配
	 */
	performRandomPerturbation(assignment, students, seats, conditions) {
		const newAssignment = new Map(assignment);
		const assignedStudents = Array.from(assignment.keys());

		// 隨機交換一些學生
		const swapCount = Math.floor(assignedStudents.length * 0.1); // 交換10%的學生
		for (let i = 0; i < swapCount; i++) {
			const index1 = Math.floor(Math.random() * assignedStudents.length);
			const index2 = Math.floor(Math.random() * assignedStudents.length);

			if (index1 !== index2) {
				const student1 = assignedStudents[index1];
				const student2 = assignedStudents[index2];
				const seat1 = assignment.get(student1);
				const seat2 = assignment.get(student2);

				newAssignment.set(student1, seat2);
				newAssignment.set(student2, seat1);
			}
		}

		return newAssignment;
	}

	/**
	 * 執行戰略交換
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Map} 新的分配
	 */
	performStrategicSwap(assignment, students, seats, conditions) {
		const newAssignment = new Map(assignment);
		const assignedStudents = Array.from(assignment.keys());

		// 尋找最不滿意的學生進行交換
		const studentSatisfactions = assignedStudents.map(studentId => ({
			studentId,
			satisfaction: this.calculateStudentSatisfaction(
				students.find(s => s.id === studentId),
				assignment.get(studentId),
				assignment,
				conditions
			)
		}));

		studentSatisfactions.sort((a, b) => a.satisfaction - b.satisfaction);

		// 交換最不滿意的學生
		if (studentSatisfactions.length >= 2) {
			const student1 = studentSatisfactions[0].studentId;
			const student2 = studentSatisfactions[1].studentId;
			const seat1 = assignment.get(student1);
			const seat2 = assignment.get(student2);

			newAssignment.set(student1, seat2);
			newAssignment.set(student2, seat1);
		}

		return newAssignment;
	}

	/**
	 * 執行部分重置
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Map} 新的分配
	 */
	performPartialReset(assignment, students, seats, conditions) {
		const newAssignment = new Map(assignment);
		const assignedStudents = Array.from(assignment.keys());

		// 重置20%的學生分配
		const resetCount = Math.floor(assignedStudents.length * 0.2);
		const studentsToReset = assignedStudents.slice(0, resetCount);

		for (const studentId of studentsToReset) {
			newAssignment.delete(studentId);
		}

		return newAssignment;
	}

	/**
	 * 執行溫度增加
	 * @param {Map} assignment 分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Map} 新的分配
	 */
	performTemperatureIncrease(assignment, students, seats, conditions) {
		// 溫度增加相當於增加隨機性
		return this.performRandomPerturbation(assignment, students, seats, conditions);
	}

	/**
	 * 計算擾動水平
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @returns {number} 擾動水平
	 */
	calculatePerturbationLevel(originalAssignment, newAssignment) {
		let changes = 0;
		let total = originalAssignment.size;

		for (const [studentId, seat] of originalAssignment) {
			const newSeat = newAssignment.get(studentId);
			if (!newSeat || newSeat.row !== seat.row || newSeat.col !== seat.col) {
				changes++;
			}
		}

		return total > 0 ? changes / total : 0;
	}

	// ==================== 收斂檢查輔助方法 ====================

	/**
	 * 檢查分數收斂
	 * @param {Array} optimizationHistory 優化歷史
	 * @returns {Object} 分數收斂結果
	 */
	checkScoreConvergence(optimizationHistory) {
		if (optimizationHistory.length < 10) {
			return { converged: false, confidence: 0 };
		}

		const recentScores = optimizationHistory.slice(-10).map(h => h.score);
		const variance = this.calculateVariance(recentScores);
		const mean = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

		// 如果方差很小，認為已收斂
		const converged = variance < 0.001;
		const confidence = Math.max(0, 1 - variance * 1000);

		return { converged, confidence };
	}

	/**
	 * 檢查改進收斂
	 * @param {Array} optimizationHistory 優化歷史
	 * @returns {Object} 改進收斂結果
	 */
	checkImprovementConvergence(optimizationHistory) {
		if (optimizationHistory.length < 10) {
			return { converged: false, confidence: 0 };
		}

		const recentImprovements = optimizationHistory.slice(-10).map(h => h.improvement);
		const positiveImprovements = recentImprovements.filter(imp => imp > 0).length;
		const averageImprovement = recentImprovements.reduce((sum, imp) => sum + imp, 0) / recentImprovements.length;

		// 如果最近很少有正改進，認為已收斂
		const converged = positiveImprovements < 3 && averageImprovement < 0.001;
		const confidence = Math.max(0, 1 - positiveImprovements / 10);

		return { converged, confidence };
	}

	/**
	 * 檢查策略收斂
	 * @param {Array} optimizationHistory 優化歷史
	 * @returns {Object} 策略收斂結果
	 */
	checkStrategyConvergence(optimizationHistory) {
		if (optimizationHistory.length < 10) {
			return { converged: false, confidence: 0 };
		}

		const recentStrategies = optimizationHistory.slice(-10).map(h => h.strategy);
		const strategyCounts = new Map();

		for (const strategy of recentStrategies) {
			strategyCounts.set(strategy, (strategyCounts.get(strategy) || 0) + 1);
		}

		// 如果某個策略佔主導地位，認為已收斂
		const maxCount = Math.max(...strategyCounts.values());
		const converged = maxCount >= 7; // 70%以上使用同一策略
		const confidence = maxCount / 10;

		return { converged, confidence };
	}

	// ==================== 調整效果評估 ====================

	/**
	 * 調整效果測量 - 測量調整策略的實際效果
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} adjustmentDetails 調整詳情
	 * @returns {Object} 調整效果測量結果
	 */
	measureAdjustmentEffect(originalAssignment, newAssignment, students, seats, conditions, adjustmentDetails) {
		const measurement = {
			overallEffect: 0,
			assignmentEffect: 0,
			conditionEffect: 0,
			studentSatisfactionEffect: 0,
			conflictResolutionEffect: 0,
			performanceMetrics: {},
			details: {}
		};

		try {
			// 1. 評估原始狀態
			const originalEvaluation = this.evaluateGlobalState(originalAssignment, students, seats, conditions);

			// 2. 評估新狀態
			const newEvaluation = this.evaluateGlobalState(newAssignment, students, seats, conditions);

			// 3. 計算各項效果
			measurement.overallEffect = newEvaluation.overallScore - originalEvaluation.overallScore;
			measurement.assignmentEffect = newEvaluation.assignmentRate - originalEvaluation.assignmentRate;
			measurement.conditionEffect = newEvaluation.conditionSatisfaction - originalEvaluation.conditionSatisfaction;
			measurement.studentSatisfactionEffect = newEvaluation.studentSatisfaction - originalEvaluation.studentSatisfaction;
			measurement.conflictResolutionEffect = originalEvaluation.conflictCount - newEvaluation.conflictCount;

			// 4. 計算性能指標
			measurement.performanceMetrics = this.calculatePerformanceMetrics(
				originalAssignment, newAssignment, adjustmentDetails
			);

			// 5. 生成詳細報告
			measurement.details = {
				originalState: originalEvaluation,
				newState: newEvaluation,
				changes: this.analyzeAssignmentChanges(originalAssignment, newAssignment),
				adjustmentDetails
			};

		} catch (error) {
			console.error('調整效果測量失敗:', error);
			measurement.overallEffect = 0;
		}

		return measurement;
	}

	/**
	 * 效果預測 - 預測調整策略的可能效果
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} proposedAdjustment 提議的調整
	 * @returns {Object} 效果預測結果
	 */
	predictAdjustmentEffect(currentAssignment, students, seats, conditions, proposedAdjustment) {
		const prediction = {
			expectedEffect: 0,
			confidence: 0,
			riskLevel: 'low',
			successProbability: 0,
			potentialBenefits: [],
			potentialRisks: [],
			recommendations: []
		};

		try {
			// 1. 模擬調整效果
			const simulatedAssignment = this.simulateAdjustment(currentAssignment, proposedAdjustment);
			const simulatedEffect = this.measureAdjustmentEffect(
				currentAssignment, simulatedAssignment, students, seats, conditions, proposedAdjustment
			);

			prediction.expectedEffect = simulatedEffect.overallEffect;

			// 2. 計算預測置信度
			prediction.confidence = this.calculatePredictionConfidence(
				proposedAdjustment, currentAssignment, students, seats, conditions
			);

			// 3. 評估風險水平
			prediction.riskLevel = this.assessAdjustmentRisk(proposedAdjustment, currentAssignment, students, seats, conditions);

			// 4. 計算成功概率
			prediction.successProbability = this.calculateSuccessProbability(
				proposedAdjustment, currentAssignment, students, seats, conditions
			);

			// 5. 識別潛在好處和風險
			prediction.potentialBenefits = this.identifyPotentialBenefits(simulatedEffect);
			prediction.potentialRisks = this.identifyPotentialRisks(proposedAdjustment, currentAssignment);

			// 6. 生成建議
			prediction.recommendations = this.generateAdjustmentRecommendations(
				prediction, proposedAdjustment, currentAssignment
			);

		} catch (error) {
			console.error('效果預測失敗:', error);
			prediction.expectedEffect = 0;
			prediction.confidence = 0;
		}

		return prediction;
	}

	/**
	 * 效果比較 - 比較不同調整策略的效果
	 * @param {Array} adjustmentStrategies 調整策略列表
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 效果比較結果
	 */
	compareAdjustmentEffects(adjustmentStrategies, currentAssignment, students, seats, conditions) {
		const comparison = {
			bestStrategy: null,
			rankedStrategies: [],
			comparisonMatrix: {},
			recommendations: [],
			details: {}
		};

		try {
			// 1. 評估每個策略
			const strategyEvaluations = [];
			for (const strategy of adjustmentStrategies) {
				const prediction = this.predictAdjustmentEffect(
					currentAssignment, students, seats, conditions, strategy
				);

				strategyEvaluations.push({
					strategy,
					prediction,
					score: this.calculateStrategyScore(prediction, strategy)
				});
			}

			// 2. 排序策略
			strategyEvaluations.sort((a, b) => b.score - a.score);
			comparison.rankedStrategies = strategyEvaluations.map(evaluation => ({
				strategy: evaluation.strategy,
				score: evaluation.score,
				prediction: evaluation.prediction
			}));

			// 3. 選擇最佳策略
			if (strategyEvaluations.length > 0) {
				comparison.bestStrategy = strategyEvaluations[0];
			}

			// 4. 生成比較矩陣
			comparison.comparisonMatrix = this.generateComparisonMatrix(strategyEvaluations);

			// 5. 生成建議
			comparison.recommendations = this.generateComparisonRecommendations(comparison);

			// 6. 詳細分析
			comparison.details = {
				totalStrategies: adjustmentStrategies.length,
				averageScore: strategyEvaluations.reduce((sum, evaluation) => sum + evaluation.score, 0) / strategyEvaluations.length,
				scoreRange: {
					min: Math.min(...strategyEvaluations.map(evaluation => evaluation.score)),
					max: Math.max(...strategyEvaluations.map(evaluation => evaluation.score))
				}
			};

		} catch (error) {
			console.error('效果比較失敗:', error);
		}

		return comparison;
	}

	/**
	 * 效果報告 - 生成調整效果的詳細報告
	 * @param {Object} adjustmentResult 調整結果
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 效果報告
	 */
	reportAdjustmentEffect(adjustmentResult, students, seats, conditions) {
		const report = {
			summary: {},
			detailedAnalysis: {},
			performanceMetrics: {},
			recommendations: [],
			timestamp: new Date().toISOString(),
			metadata: {}
		};

		try {
			// 1. 生成摘要
			report.summary = this.generateEffectSummary(adjustmentResult);

			// 2. 詳細分析
			report.detailedAnalysis = this.generateDetailedAnalysis(adjustmentResult, students, seats, conditions);

			// 3. 性能指標
			report.performanceMetrics = this.generatePerformanceReport(adjustmentResult);

			// 4. 建議
			report.recommendations = this.generateEffectRecommendations(adjustmentResult);

			// 5. 元數據
			report.metadata = {
				studentsCount: students.length,
				seatsCount: seats.length,
				conditionsCount: conditions.length,
				adjustmentType: adjustmentResult.strategy || 'unknown',
				executionTime: adjustmentResult.executionTime || 0
			};

		} catch (error) {
			console.error('效果報告生成失敗:', error);
			report.summary.error = error.message;
		}

		return report;
	}

	// ==================== 調整效果評估輔助方法 ====================

	/**
	 * 計算性能指標
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @param {Object} adjustmentDetails 調整詳情
	 * @returns {Object} 性能指標
	 */
	calculatePerformanceMetrics(originalAssignment, newAssignment, adjustmentDetails) {
		return {
			assignmentChanges: newAssignment.size - originalAssignment.size,
			studentMovement: this.calculateStudentMovement(originalAssignment, newAssignment),
			seatUtilizationChange: this.calculateSeatUtilizationChange(originalAssignment, newAssignment),
			executionEfficiency: adjustmentDetails.executionTime || 0,
			attemptEfficiency: adjustmentDetails.attempts || 0
		};
	}

	/**
	 * 分析分配變化
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @returns {Object} 變化分析
	 */
	analyzeAssignmentChanges(originalAssignment, newAssignment) {
		const changes = {
			added: [],
			removed: [],
			modified: [],
			totalChanges: 0
		};

		// 找出新增的分配
		for (const [studentId, seat] of newAssignment) {
			if (!originalAssignment.has(studentId)) {
				changes.added.push({ studentId, seat });
			}
		}

		// 找出移除的分配
		for (const [studentId, seat] of originalAssignment) {
			if (!newAssignment.has(studentId)) {
				changes.removed.push({ studentId, seat });
			}
		}

		// 找出修改的分配
		for (const [studentId, newSeat] of newAssignment) {
			const originalSeat = originalAssignment.get(studentId);
			if (originalSeat && (originalSeat.row !== newSeat.row || originalSeat.col !== newSeat.col)) {
				changes.modified.push({ studentId, originalSeat, newSeat });
			}
		}

		changes.totalChanges = changes.added.length + changes.removed.length + changes.modified.length;

		return changes;
	}

	/**
	 * 模擬調整
	 * @param {Map} currentAssignment 當前分配
	 * @param {Object} proposedAdjustment 提議的調整
	 * @returns {Map} 模擬的分配
	 */
	simulateAdjustment(currentAssignment, proposedAdjustment) {
		const simulatedAssignment = new Map(currentAssignment);

		// 根據調整類型執行模擬
		switch (proposedAdjustment.type) {
			case 'swap':
				if (proposedAdjustment.student1 && proposedAdjustment.student2) {
					const seat1 = simulatedAssignment.get(proposedAdjustment.student1);
					const seat2 = simulatedAssignment.get(proposedAdjustment.student2);
					if (seat1 && seat2) {
						simulatedAssignment.set(proposedAdjustment.student1, seat2);
						simulatedAssignment.set(proposedAdjustment.student2, seat1);
					}
				}
				break;
			case 'reassignment':
				if (proposedAdjustment.student && proposedAdjustment.newSeat) {
					simulatedAssignment.set(proposedAdjustment.student, proposedAdjustment.newSeat);
				}
				break;
			case 'removal':
				if (proposedAdjustment.student) {
					simulatedAssignment.delete(proposedAdjustment.student);
				}
				break;
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
	 * @returns {number} 置信度
	 */
	calculatePredictionConfidence(proposedAdjustment, currentAssignment, students, seats, conditions) {
		let confidence = 0.5; // 基礎置信度

		// 根據調整類型調整置信度
		switch (proposedAdjustment.type) {
			case 'swap':
				confidence += 0.2; // 交換通常比較可預測
				break;
			case 'reassignment':
				confidence += 0.1; // 重新分配中等可預測
				break;
			case 'removal':
				confidence += 0.3; // 移除最可預測
				break;
		}

		// 根據歷史數據調整置信度
		const historicalConfidence = this.getHistoricalConfidence(proposedAdjustment.type);
		confidence = (confidence + historicalConfidence) / 2;

		return Math.min(1, Math.max(0, confidence));
	}

	/**
	 * 評估調整風險
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {string} 風險水平
	 */
	assessAdjustmentRisk(proposedAdjustment, currentAssignment, students, seats, conditions) {
		let riskScore = 0;

		// 根據調整類型評估風險
		switch (proposedAdjustment.type) {
			case 'swap':
				riskScore = 0.3; // 低風險
				break;
			case 'reassignment':
				riskScore = 0.5; // 中等風險
				break;
			case 'removal':
				riskScore = 0.7; // 高風險
				break;
		}

		// 根據影響範圍調整風險
		const affectedStudents = this.getAffectedStudents(proposedAdjustment, currentAssignment);
		riskScore += affectedStudents.length * 0.1;

		// 根據條件複雜度調整風險
		const conditionComplexity = this.assessConditionComplexity(conditions);
		riskScore += conditionComplexity * 0.2;

		if (riskScore < 0.3) return 'low';
		if (riskScore < 0.6) return 'medium';
		return 'high';
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
		let probability = 0.5; // 基礎概率

		// 根據調整類型調整概率
		switch (proposedAdjustment.type) {
			case 'swap':
				probability += 0.2;
				break;
			case 'reassignment':
				probability += 0.1;
				break;
			case 'removal':
				probability += 0.3;
				break;
		}

		// 根據可行性檢查調整概率
		const feasibility = this.checkAdjustmentFeasibility(proposedAdjustment, currentAssignment, students, seats, conditions);
		probability *= feasibility;

		return Math.min(1, Math.max(0, probability));
	}

	/**
	 * 識別潛在好處
	 * @param {Object} simulatedEffect 模擬效果
	 * @returns {Array} 潛在好處列表
	 */
	identifyPotentialBenefits(simulatedEffect) {
		const benefits = [];

		if (simulatedEffect.overallEffect > 0) {
			benefits.push('整體分配質量提升');
		}
		if (simulatedEffect.assignmentEffect > 0) {
			benefits.push('分配率改善');
		}
		if (simulatedEffect.conditionEffect > 0) {
			benefits.push('條件滿足度提升');
		}
		if (simulatedEffect.studentSatisfactionEffect > 0) {
			benefits.push('學生滿意度提升');
		}
		if (simulatedEffect.conflictResolutionEffect > 0) {
			benefits.push('衝突解決');
		}

		return benefits;
	}

	/**
	 * 識別潛在風險
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Array} 潛在風險列表
	 */
	identifyPotentialRisks(proposedAdjustment, currentAssignment) {
		const risks = [];

		// 根據調整類型識別風險
		switch (proposedAdjustment.type) {
			case 'swap':
				risks.push('可能影響其他學生的分配');
				break;
			case 'reassignment':
				risks.push('可能導致新的衝突');
				risks.push('可能影響學生的學習環境');
				break;
			case 'removal':
				risks.push('學生可能無法重新分配');
				risks.push('可能降低整體分配率');
				break;
		}

		return risks;
	}

	/**
	 * 生成調整建議
	 * @param {Object} prediction 預測結果
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Array} 建議列表
	 */
	generateAdjustmentRecommendations(prediction, proposedAdjustment, currentAssignment) {
		const recommendations = [];

		if (prediction.expectedEffect > 0.1) {
			recommendations.push('建議執行此調整，預期效果良好');
		} else if (prediction.expectedEffect > 0) {
			recommendations.push('可以考慮執行此調整，但效果有限');
		} else {
			recommendations.push('不建議執行此調整，可能產生負面效果');
		}

		if (prediction.riskLevel === 'high') {
			recommendations.push('建議在執行前進行更詳細的風險評估');
		}

		if (prediction.confidence < 0.7) {
			recommendations.push('預測置信度較低，建議謹慎執行');
		}

		return recommendations;
	}

	/**
	 * 計算策略分數
	 * @param {Object} prediction 預測結果
	 * @param {Object} strategy 策略對象
	 * @returns {number} 策略分數
	 */
	calculateStrategyScore(prediction, strategy) {
		let score = 0;

		// 預期效果權重最高
		score += prediction.expectedEffect * 0.4;

		// 成功概率
		score += prediction.successProbability * 0.3;

		// 置信度
		score += prediction.confidence * 0.2;

		// 風險調整（風險越低分數越高）
		const riskAdjustment = {
			'low': 0.1,
			'medium': 0.05,
			'high': 0
		};
		score += riskAdjustment[prediction.riskLevel] || 0;

		return Math.min(1, Math.max(0, score));
	}

	/**
	 * 生成比較矩陣
	 * @param {Array} strategyEvaluations 策略評估列表
	 * @returns {Object} 比較矩陣
	 */
	generateComparisonMatrix(strategyEvaluations) {
		const matrix = {};

		for (let i = 0; i < strategyEvaluations.length; i++) {
			const strategy1 = strategyEvaluations[i];
			const strategy1Name = strategy1.strategy.name || `strategy_${i}`;
			matrix[strategy1Name] = {};

			for (let j = 0; j < strategyEvaluations.length; j++) {
				const strategy2 = strategyEvaluations[j];
				const strategy2Name = strategy2.strategy.name || `strategy_${j}`;
				matrix[strategy1Name][strategy2Name] = {
					scoreDifference: strategy1.score - strategy2.score,
					effectivenessComparison: strategy1.prediction.expectedEffect - strategy2.prediction.expectedEffect,
					riskComparison: this.compareRiskLevels(strategy1.prediction.riskLevel, strategy2.prediction.riskLevel)
				};
			}
		}

		return matrix;
	}

	/**
	 * 生成比較建議
	 * @param {Object} comparison 比較結果
	 * @returns {Array} 建議列表
	 */
	generateComparisonRecommendations(comparison) {
		const recommendations = [];

		if (comparison.bestStrategy) {
			recommendations.push(`推薦使用策略: ${comparison.bestStrategy.strategy.name || '未命名策略'}`);
		}

		if (comparison.rankedStrategies.length > 1) {
			const scoreDifference = comparison.rankedStrategies[0].score - comparison.rankedStrategies[1].score;
			if (scoreDifference < 0.1) {
				recommendations.push('前幾個策略分數相近，建議根據具體情況選擇');
			}
		}

		return recommendations;
	}

	/**
	 * 生成效果摘要
	 * @param {Object} adjustmentResult 調整結果
	 * @returns {Object} 效果摘要
	 */
	generateEffectSummary(adjustmentResult) {
		return {
			success: adjustmentResult.success || false,
			overallImprovement: adjustmentResult.improvement || 0,
			executionTime: adjustmentResult.executionTime || 0,
			attempts: adjustmentResult.attempts || 0,
			strategy: adjustmentResult.strategy || 'unknown'
		};
	}

	/**
	 * 生成詳細分析
	 * @param {Object} adjustmentResult 調整結果
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {Object} 詳細分析
	 */
	generateDetailedAnalysis(adjustmentResult, students, seats, conditions) {
		return {
			beforeState: this.evaluateGlobalState(new Map(), students, seats, conditions),
			afterState: this.evaluateGlobalState(adjustmentResult.improvedAssignment || new Map(), students, seats, conditions),
			changes: this.analyzeAssignmentChanges(new Map(), adjustmentResult.improvedAssignment || new Map())
		};
	}

	/**
	 * 生成性能報告
	 * @param {Object} adjustmentResult 調整結果
	 * @returns {Object} 性能報告
	 */
	generatePerformanceReport(adjustmentResult) {
		return {
			executionTime: adjustmentResult.executionTime || 0,
			attempts: adjustmentResult.attempts || 0,
			efficiency: adjustmentResult.executionTime > 0 ? adjustmentResult.attempts / (adjustmentResult.executionTime / 1000) : 0,
			successRate: adjustmentResult.success ? 1 : 0
		};
	}

	/**
	 * 生成效果建議
	 * @param {Object} adjustmentResult 調整結果
	 * @returns {Array} 效果建議
	 */
	generateEffectRecommendations(adjustmentResult) {
		const recommendations = [];

		if (adjustmentResult.success) {
			recommendations.push('調整成功，建議保持當前配置');
		} else {
			recommendations.push('調整失敗，建議嘗試其他策略');
		}

		if (adjustmentResult.executionTime > 5000) {
			recommendations.push('執行時間較長，建議優化算法效率');
		}

		if (adjustmentResult.attempts > 50) {
			recommendations.push('嘗試次數較多，建議改進策略選擇');
		}

		return recommendations;
	}

	// ==================== 輔助計算方法 ====================

	/**
	 * 計算學生移動
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @returns {number} 學生移動數量
	 */
	calculateStudentMovement(originalAssignment, newAssignment) {
		let movements = 0;
		for (const [studentId, originalSeat] of originalAssignment) {
			const newSeat = newAssignment.get(studentId);
			if (newSeat && (originalSeat.row !== newSeat.row || originalSeat.col !== newSeat.col)) {
				movements++;
			}
		}
		return movements;
	}

	/**
	 * 計算座位利用率變化
	 * @param {Map} originalAssignment 原始分配
	 * @param {Map} newAssignment 新分配
	 * @returns {number} 利用率變化
	 */
	calculateSeatUtilizationChange(originalAssignment, newAssignment) {
		return newAssignment.size - originalAssignment.size;
	}

	/**
	 * 獲取歷史置信度
	 * @param {string} adjustmentType 調整類型
	 * @returns {number} 歷史置信度
	 */
	getHistoricalConfidence(adjustmentType) {
		// 簡化實現，返回隨機置信度
		return Math.random() * 0.3 + 0.5; // 0.5-0.8
	}

	/**
	 * 獲取受影響的學生
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @returns {Array} 受影響的學生列表
	 */
	getAffectedStudents(proposedAdjustment, currentAssignment) {
		const affected = [];

		switch (proposedAdjustment.type) {
			case 'swap':
				if (proposedAdjustment.student1) affected.push(proposedAdjustment.student1);
				if (proposedAdjustment.student2) affected.push(proposedAdjustment.student2);
				break;
			case 'reassignment':
			case 'removal':
				if (proposedAdjustment.student) affected.push(proposedAdjustment.student);
				break;
		}

		return affected;
	}

	/**
	 * 評估條件複雜度
	 * @param {Array} conditions 條件列表
	 * @returns {number} 複雜度分數
	 */
	assessConditionComplexity(conditions) {
		return Math.min(1, conditions.length / 10); // 條件越多越複雜
	}

	/**
	 * 檢查調整可行性
	 * @param {Object} proposedAdjustment 提議的調整
	 * @param {Map} currentAssignment 當前分配
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @returns {number} 可行性分數
	 */
	checkAdjustmentFeasibility(proposedAdjustment, currentAssignment, students, seats, conditions) {
		// 簡化實現，返回隨機可行性分數
		return Math.random() * 0.4 + 0.6; // 0.6-1.0
	}

	/**
	 * 比較風險水平
	 * @param {string} risk1 風險水平1
	 * @param {string} risk2 風險水平2
	 * @returns {string} 比較結果
	 */
	compareRiskLevels(risk1, risk2) {
		const riskOrder = { 'low': 1, 'medium': 2, 'high': 3 };
		const order1 = riskOrder[risk1] || 2;
		const order2 = riskOrder[risk2] || 2;

		if (order1 < order2) return 'lower';
		if (order1 > order2) return 'higher';
		return 'same';
	}
}

module.exports = { DynamicAdjuster };
