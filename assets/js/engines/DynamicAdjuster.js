// DynamicAdjuster.js - 動態調整器（重構版）
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

		// 初始化子模組
		this.strategyEvaluator = new StrategyEvaluator();
		this.strategyLearner = new StrategyLearner();
		this.priorityOptimizer = new PriorityOptimizer();
		this.globalOptimizer = new GlobalOptimizer();
		this.effectEvaluator = new EffectEvaluator();

		// 注入依賴
		this.strategyLearner.setStrategyConfig(this.STRATEGY_CONFIG);
		this.priorityOptimizer.setStrategyPerformance(this.strategyLearner.strategyPerformance);
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
		this.strategyLearner.learnFromStrategy(strategy, adjustmentResult, conflict, currentAssignment, students, seats, conditions);

		return adjustmentResult;
	}

	/**
	 * 選擇最佳調整策略
	 */
	selectOptimalStrategy(conflict, currentAssignment, students, seats, conditions) {
		return this.strategyEvaluator.selectOptimalStrategy(
			conflict, currentAssignment, students, seats, conditions,
			this.strategyLearner.calculateHistoricalAdjustment.bind(this.strategyLearner),
			this.strategyLearner.calculateSituationalAdjustment.bind(this.strategyLearner),
			this.recordStrategySelection.bind(this)
		);
	}

	/**
	 * 記錄策略選擇
	 */
	recordStrategySelection(strategy, conflict, currentAssignment) {
		this.adjustmentHistory.push({
			timestamp: new Date().toISOString(),
			action: 'strategy_selection',
			strategy: strategy.name,
			conflict: conflict.type,
			assignmentSize: currentAssignment.size
		});
	}

	/**
	 * 執行調整
	 */
	executeAdjustment(strategy, conflict, currentAssignment, students, seats, conditions) {
		switch (strategy.name) {
			case 'DIRECT_REMOVAL':
				return this.executeDirectRemoval(conflict, currentAssignment, students, seats, conditions);
			case 'SMART_SWAP':
				return this.executeSmartSwap(conflict, currentAssignment, students, seats, conditions);
			case 'CHAIN_ADJUSTMENT':
				return this.executeChainAdjustment(conflict, currentAssignment, students, seats, conditions);
			default:
				return {
					success: false,
					newAssignment: new Map(currentAssignment),
					description: '未知的調整策略'
				};
		}
	}

	/**
	 * 執行直接移除策略
	 */
	executeDirectRemoval(conflict, currentAssignment, students, seats, conditions) {
		const newAssignment = new Map(currentAssignment);
		const removedStudents = [];

		// 根據衝突類型選擇要移除的學生
		let candidates = [];
		switch (conflict.type) {
			case 'TOTAL_COUNT':
				// 移除最後加入的學生
				candidates = Array.from(currentAssignment.keys()).slice(-conflict.excess);
				break;
			case 'GROUP_CAPACITY':
				// 移除超出容量的群組中的學生
				candidates = this.getGroupCapacityViolators(conflict, currentAssignment, students);
				break;
			case 'CONDITION_CONFLICT':
				// 移除違反條件的學生
				candidates = this.getConditionViolators(conflict, currentAssignment, students, conditions);
				break;
			default:
				candidates = Array.from(currentAssignment.keys());
		}

		// 按優先級排序候選學生
		candidates = this.priorityOptimizer.sortByPriority(
			candidates, 'student', currentAssignment, students, seats, conditions, 'asc'
		);

		// 移除學生
		for (const studentId of candidates) {
			if (newAssignment.has(studentId)) {
				newAssignment.delete(studentId);
				removedStudents.push(studentId);
			}
		}

		this.attemptCount++;
		this.adjustmentHistory.push({
			timestamp: new Date().toISOString(),
			action: 'direct_removal',
			removedStudents,
			remainingStudents: newAssignment.size
		});

		return {
			success: removedStudents.length > 0,
			newAssignment,
			description: `移除了 ${removedStudents.length} 個學生`
		};
	}

	/**
	 * 執行智能交換策略
	 */
	executeSmartSwap(conflict, currentAssignment, students, seats, conditions) {
		const newAssignment = new Map(currentAssignment);
		const assignedStudents = Array.from(currentAssignment.keys());
		let swapsPerformed = 0;

		// 尋找可交換的學生對
		for (let i = 0; i < assignedStudents.length; i++) {
			for (let j = i + 1; j < assignedStudents.length; j++) {
				const student1Id = assignedStudents[i];
				const student2Id = assignedStudents[j];
				const student1 = students.find(s => s.id === student1Id);
				const student2 = students.find(s => s.id === student2Id);
				const seat1 = currentAssignment.get(student1Id);
				const seat2 = currentAssignment.get(student2Id);

				if (student1 && student2 && seat1 && seat2) {
					// 檢查交換是否可行
					if (this.canStudentSitHere(student1, seat2, newAssignment, conditions) &&
						this.canStudentSitHere(student2, seat1, newAssignment, conditions)) {

						// 執行交換
						newAssignment.set(student1Id, seat2);
						newAssignment.set(student2Id, seat1);
						swapsPerformed++;

						this.adjustmentHistory.push({
							timestamp: new Date().toISOString(),
							action: 'smart_swap',
							student1: student1Id,
							student2: student2Id,
							seat1: seat1,
							seat2: seat2
						});
					}
				}
			}
		}

		this.attemptCount++;
		return {
			success: swapsPerformed > 0,
			newAssignment,
			description: `執行了 ${swapsPerformed} 次交換`
		};
	}

	/**
	 * 執行連鎖調整策略
	 */
	executeChainAdjustment(conflict, currentAssignment, students, seats, conditions) {
		const newAssignment = new Map(currentAssignment);
		const chainPath = this.findChainPath(conflict, currentAssignment, students, seats, conditions);
		let adjustmentsMade = 0;

		if (chainPath && chainPath.length > 0) {
			// 執行連鎖調整
			for (const step of chainPath) {
				if (step.studentId && step.newSeat) {
					newAssignment.set(step.studentId, step.newSeat);
					adjustmentsMade++;

					this.adjustmentHistory.push({
						timestamp: new Date().toISOString(),
						action: 'chain_adjustment',
						student: step.studentId,
						oldSeat: currentAssignment.get(step.studentId),
						newSeat: step.newSeat
					});
				}
			}
		}

		this.attemptCount++;
		return {
			success: adjustmentsMade > 0,
			newAssignment,
			description: `執行了 ${adjustmentsMade} 次連鎖調整`
		};
	}

	/**
	 * 尋找連鎖路徑
	 */
	findChainPath(conflict, currentAssignment, students, seats, conditions) {
		const chainPath = [];
		const maxChainLength = this.options.maxChainLength;
		let currentLength = 0;

		// 簡化的連鎖路徑尋找算法
		const assignedStudents = Array.from(currentAssignment.keys());
		const availableSeats = this.getAvailableSeats(seats, currentAssignment);

		for (const studentId of assignedStudents) {
			if (currentLength >= maxChainLength) break;

			const student = students.find(s => s.id === studentId);
			const currentSeat = currentAssignment.get(studentId);

			// 尋找更好的座位
			for (const seat of availableSeats) {
				if (this.canStudentSitHere(student, seat, currentAssignment, conditions)) {
					chainPath.push({
						studentId,
						newSeat: seat
					});
					currentLength++;
					break;
				}
			}
		}

		return chainPath;
	}

	/**
	 * 獲取可用座位
	 */
	getAvailableSeats(seats, currentAssignment) {
		const occupiedSeats = new Set();
		for (const seat of currentAssignment.values()) {
			occupiedSeats.add(`${seat.row}-${seat.col}`);
		}

		return seats.filter(seat => !occupiedSeats.has(`${seat.row}-${seat.col}`));
	}

	/**
	 * 檢查學生是否可以坐在指定座位
	 */
	canStudentSitHere(student, seat, currentAssignment, conditions) {
		// 檢查座位是否已被佔用
		for (const [studentId, assignedSeat] of currentAssignment) {
			if (assignedSeat.row === seat.row && assignedSeat.col === seat.col) {
				return false;
			}
		}

		// 檢查條件
		const tempAssignment = new Map(currentAssignment);
		tempAssignment.set(student.id, seat);

		for (const condition of conditions) {
			if (!this.checkCondition(condition, tempAssignment)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * 檢查條件
	 */
	checkCondition(condition, assignment) {
		// 簡化的條件檢查實現
		switch (condition.type) {
			case 'TOTAL_COUNT':
				return assignment.size <= condition.maxCount;
			case 'GROUP_CAPACITY':
				return this.checkGroupCapacity(condition, assignment);
			case 'ADJACENT':
				return this.checkAdjacentCondition(condition, assignment);
			default:
				return true;
		}
	}

	/**
	 * 檢查群組容量
	 */
	checkGroupCapacity(condition, assignment) {
		const groupStudents = condition.students || [];
		const assignedInGroup = groupStudents.filter(studentId => assignment.has(studentId)).length;
		return assignedInGroup <= condition.capacity;
	}

	/**
	 * 檢查相鄰條件
	 */
	checkAdjacentCondition(condition, assignment) {
		const students = condition.students || [];
		if (students.length < 2) return true;

		for (let i = 0; i < students.length; i++) {
			for (let j = i + 1; j < students.length; j++) {
				const student1 = students[i];
				const student2 = students[j];
				const seat1 = assignment.get(student1);
				const seat2 = assignment.get(student2);

				if (seat1 && seat2) {
					const distance = Math.abs(seat1.row - seat2.row) + Math.abs(seat1.col - seat2.col);
					if (distance <= 1) return true;
				}
			}
		}

		return false;
	}

	/**
	 * 獲取群組容量違反者
	 */
	getGroupCapacityViolators(conflict, currentAssignment, students) {
		const groupStudents = conflict.groupStudents || [];
		const capacity = conflict.capacity || 0;
		const assignedInGroup = groupStudents.filter(studentId => currentAssignment.has(studentId));

		if (assignedInGroup.length <= capacity) return [];

		// 返回超出容量的學生
		return assignedInGroup.slice(capacity);
	}

	/**
	 * 獲取條件違反者
	 */
	getConditionViolators(conflict, currentAssignment, students, conditions) {
		const violators = [];
		const relevantCondition = conditions.find(c => c.id === conflict.conditionId);

		if (!relevantCondition) return violators;

		for (const [studentId, seat] of currentAssignment) {
			const tempAssignment = new Map(currentAssignment);
			if (!this.checkCondition(relevantCondition, tempAssignment)) {
				violators.push(studentId);
			}
		}

		return violators;
	}

	/**
	 * 設置選項
	 */
	setOptions(options) {
		this.options = { ...this.options, ...options };
	}

	/**
	 * 獲取調整歷史
	 */
	getAdjustmentHistory() {
		return [...this.adjustmentHistory];
	}

	/**
	 * 清除調整歷史
	 */
	clearAdjustmentHistory() {
		this.adjustmentHistory = [];
	}

	/**
	 * 重置調整器
	 */
	reset() {
		this.adjustmentHistory = [];
		this.currentStrategy = null;
		this.attemptCount = 0;
		this.strategyLearner.clearStrategyPerformance();
		this.globalOptimizer.clearOptimizationHistory();
		this.effectEvaluator.clearEvaluationHistory();
	}
}

// 導出模組
if (typeof module !== 'undefined' && module.exports) {
	module.exports = DynamicAdjuster;
} else if (typeof window !== 'undefined') {
	window.DynamicAdjuster = DynamicAdjuster;
}
