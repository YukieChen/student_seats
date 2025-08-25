/**
 * 啟發式搜索器模組
 * 負責基於啟發式規則的智能搜索策略
 */
const { Logger } = require('./Logger.js');

class HeuristicSearcher {
	constructor(options = {}) {
		this.logger = new Logger('HeuristicSearcher');
		this.options = {
			timeout: options.timeout || 30000,
			...options
		};

		// 搜索狀態管理
		this.currentAssignment = new Map();
		this.performanceMetrics = {
			startTime: 0,
			executionSteps: 0
		};
	}

	/**
	 * 設置性能指標
	 * @param {Object} metrics 性能指標
	 */
	setPerformanceMetrics(metrics) {
		this.performanceMetrics = metrics;
	}

	/**
	 * 設置當前分配狀態
	 * @param {Map} assignment 當前分配狀態
	 */
	setCurrentAssignment(assignment) {
		this.currentAssignment = new Map(assignment);
	}

	/**
	 * 啟發式搜索 - 基於啟發式規則的智能搜索
	 * @param {Array} students 待分配學生列表
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} conflictChecker 衝突檢查器
	 * @param {Function} backtrackAssignment 回溯分配函數
	 * @returns {Promise<Object>} 搜索結果
	 */
	async heuristicSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment) {
		this.performanceMetrics.executionSteps++;

		// 超時檢查
		if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
			this.logger.warn('啟發式搜索超時', {
				elapsed: Date.now() - this.performanceMetrics.startTime,
				timeout: this.options.timeout
			});
			return {
				success: false,
				error: '超時',
				unassignedStudents: students,
				assignment: new Map(this.currentAssignment)
			};
		}

		// 基本情況：所有學生都已分配
		if (students.length === 0) {
			return {
				success: true,
				assignment: new Map(this.currentAssignment),
				unassignedStudents: []
			};
		}

		// 評估當前狀態
		const currentStateScore = this.evaluateState(students, seats, conditions, studentScores);

		// 選擇最佳移動
		const bestMove = this.selectBestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker);

		if (!bestMove) {
			this.logger.warn('無法找到有效的啟發式移動');
			return {
				success: false,
				error: '無有效移動',
				unassignedStudents: students,
				assignment: new Map(this.currentAssignment)
			};
		}

		const { student, seat, heuristicScore } = bestMove;

		this.logger.debug('啟發式選擇', {
			student,
			seat: { row: seat.row, col: seat.col, groupId: seat.groupId },
			heuristicScore,
			stateScore: currentStateScore
		});

		// 執行移動
		this.currentAssignment.set(student, seat);

		// 檢查條件是否滿足
		const relevantConditions = this.getStudentConditions(student, conditions);
		let allConditionsMet = true;

		for (const condition of relevantConditions) {
			if (!conflictChecker.checkCondition(condition, this.currentAssignment)) {
				allConditionsMet = false;
				break;
			}
		}

		if (allConditionsMet) {
			// 遞迴處理剩餘學生
			const nextStudents = students.filter(s => s !== student);
			const result = await this.heuristicSearch(
				nextStudents,
				seats,
				conditions,
				studentScores,
				groupBindings,
				studentToConditionsMap,
				conflictChecker,
				backtrackAssignment
			);

			if (result.success) {
				return result;
			}
		}

		// 如果當前移動失敗，回滾並嘗試其他選項
		this.currentAssignment.delete(student);

		// 如果啟發式搜索失敗，回退到回溯搜索
		this.logger.debug('啟發式搜索失敗，回退到回溯搜索');
		return await backtrackAssignment(
			students,
			seats,
			conditions,
			studentScores,
			groupBindings,
			studentToConditionsMap
		);
	}

	/**
	 * 評估當前狀態的分數
	 * @param {Array} students 待分配學生列表
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @returns {number} 狀態分數
	 */
	evaluateState(students, seats, conditions, studentScores) {
		let score = 0;

		// 1. 已分配學生的分數
		for (const [student, seat] of this.currentAssignment) {
			score += studentScores[student] || 0;
		}

		// 2. 剩餘學生和座位的匹配度
		const availableSeats = seats.filter(seat =>
			!Array.from(this.currentAssignment.values()).some(assignedSeat =>
				assignedSeat.row === seat.row && assignedSeat.col === seat.col
			)
		);

		// 3. 特殊座位稀缺性評估
		const specialSeats = availableSeats.filter(seat => this.isSpecialSeat(seat));
		const specialSeatRatio = specialSeats.length / Math.max(availableSeats.length, 1);
		score += (1 - specialSeatRatio) * 100; // 特殊座位越少，分數越高

		// 4. 條件複雜度評估
		const complexConditions = conditions.filter(condition =>
			condition.type === 'adjacent_and_group' ||
			condition.type === 'assign_student_group_to_seat_group'
		);
		score -= complexConditions.length * 10; // 複雜條件越多，分數越低

		return score;
	}

	/**
	 * 計算啟發式分數
	 * @param {string} student 學生ID
	 * @param {Object} seat 座位
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @returns {number} 啟發式分數
	 */
	calculateHeuristic(student, seat, conditions, studentScores, groupBindings) {
		let heuristicScore = 0;

		// 1. 學生優先級分數
		heuristicScore += (studentScores[student] || 0) * 2;

		// 2. 座位稀缺性分數
		if (this.isSpecialSeat(seat)) {
			heuristicScore += 50;
		}

		// 3. 條件滿足度分數
		const studentConditions = conditions.filter(condition =>
			condition.students.some(studentList =>
				studentList.includes(student)
			)
		);

		for (const condition of studentConditions) {
			if (condition.type === 'assign_group' && seat.groupId === condition.group) {
				heuristicScore += 30;
			} else if (condition.type === 'adjacent_and_group' && seat.groupId === condition.group) {
				heuristicScore += 40;
			}
		}

		// 4. 群組綁定分數
		if (groupBindings && groupBindings.has(student)) {
			const binding = groupBindings.get(student);
			if (binding.type === 'assign_student_group_to_seat_group' &&
				seat.groupId === binding.seatGroup) {
				heuristicScore += 60;
			}
		}

		// 5. 位置偏好分數（前排優先）
		if (seat.row <= 3) {
			heuristicScore += 10;
		}

		return heuristicScore;
	}

	/**
	 * 選擇最佳移動
	 * @param {Array} students 待分配學生列表
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} conflictChecker 衝突檢查器
	 * @returns {Object|null} 最佳移動或null
	 */
	selectBestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker) {
		const moves = [];

		// 獲取所有可用座位
		const availableSeats = seats.filter(seat =>
			!Array.from(this.currentAssignment.values()).some(assignedSeat =>
				assignedSeat.row === seat.row && assignedSeat.col === seat.col
			)
		);

		// 為每個學生計算所有可能的移動
		for (const student of students) {
			for (const seat of availableSeats) {
				// 檢查基本條件
				const tempAssignment = new Map(this.currentAssignment);
				tempAssignment.set(student, seat);

				let isValidMove = true;
				const relevantConditions = this.getStudentConditions(student, conditions);

				for (const condition of relevantConditions) {
					if (!conflictChecker.checkCondition(condition, tempAssignment)) {
						isValidMove = false;
						break;
					}
				}

				if (isValidMove) {
					const heuristicScore = this.calculateHeuristic(
						student,
						seat,
						conditions,
						studentScores,
						groupBindings
					);

					moves.push({
						student,
						seat,
						heuristicScore
					});
				}
			}
		}

		// 按啟發式分數排序，選擇最佳移動
		moves.sort((a, b) => b.heuristicScore - a.heuristicScore);

		return moves.length > 0 ? moves[0] : null;
	}

	/**
	 * 獲取學生的相關條件
	 * @param {string} student 學生ID
	 * @param {Array} conditions 條件列表
	 * @returns {Array} 相關條件列表
	 */
	getStudentConditions(student, conditions) {
		return conditions.filter(condition =>
			condition.students.some(studentList =>
				studentList.includes(student)
			)
		);
	}

	/**
	 * 檢查是否為特殊座位
	 * @param {Object} seat 座位
	 * @returns {boolean} 是否為特殊座位
	 */
	isSpecialSeat(seat) {
		return seat.isSpecial || seat.groupId === 'special' || seat.row === 1;
	}

	/**
	 * 初始化啟發式搜索器
	 * @param {Object} options 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.currentAssignment.clear();
		this.performanceMetrics = {
			startTime: Date.now(),
			executionSteps: 0
		};
		this.logger.info('啟發式搜索器初始化完成');
	}

	/**
	 * 銷毀啟發式搜索器
	 */
	dispose() {
		this.currentAssignment.clear();
		this.logger.info('啟發式搜索器銷毀完成');
	}
}

module.exports = { HeuristicSearcher };
