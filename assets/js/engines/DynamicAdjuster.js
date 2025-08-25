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
}

module.exports = { DynamicAdjuster };
