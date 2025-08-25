/**
 * 深度優先搜索器模組
 * 負責深度優先搜索策略
 */
const { Logger } = require('./Logger.js');

class DepthFirstSearcher {
	constructor(options = {}) {
		this.logger = new Logger('DepthFirstSearcher');
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

		// 深度優先搜索狀態
		this.currentDepth = 0;
		this.maxDepth = 0;
		this.depthHistory = [];
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
	 * 深度優先搜索 - 優化搜索策略
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
	async depthFirstSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment) {
		this.performanceMetrics.executionSteps++;

		// 初始化深度追蹤
		this.currentDepth = 0;
		this.maxDepth = students.length;
		this.depthHistory = [];

		// 超時檢查
		if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
			this.logger.warn('深度優先搜索超時', {
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

		// 檢查深度限制
		if (this.checkDepthLimit()) {
			this.logger.warn('達到深度限制', {
				currentDepth: this.currentDepth,
				maxDepth: this.maxDepth
			});
			return {
				success: false,
				error: '深度限制',
				unassignedStudents: students,
				assignment: new Map(this.currentAssignment)
			};
		}

		// 選擇當前學生
		const currentStudent = students[0];
		const remainingStudents = students.slice(1);

		// 獲取所有可用座位
		const availableSeats = seats.filter(seat =>
			!Array.from(this.currentAssignment.values()).some(assignedSeat =>
				assignedSeat.row === seat.row && assignedSeat.col === seat.col
			)
		);

		// 按深度優先策略排序座位
		const sortedSeats = this.sortSeatsForDepthFirst(availableSeats, currentStudent, conditions, studentScores, groupBindings);

		// 嘗試每個座位
		for (const seat of sortedSeats) {
			// 檢查基本條件
			const tempAssignment = new Map(this.currentAssignment);
			tempAssignment.set(currentStudent, seat);

			let isValidMove = true;
			const relevantConditions = this.getStudentConditions(currentStudent, conditions);

			for (const condition of relevantConditions) {
				if (!conflictChecker.checkCondition(condition, tempAssignment)) {
					isValidMove = false;
					break;
				}
			}

			if (isValidMove) {
				// 更新當前分配狀態
				this.currentAssignment.set(currentStudent, seat);
				this.currentDepth++;

				this.logger.debug('深度優先嘗試', {
					student: currentStudent,
					seat: { row: seat.row, col: seat.col, groupId: seat.groupId },
					depth: this.currentDepth
				});

				// 遞迴處理剩餘學生
				const result = await this.depthFirstSearch(
					remainingStudents,
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

				// 如果失敗，回滾並繼續嘗試
				this.currentAssignment.delete(currentStudent);
				this.currentDepth--;
			}
		}

		// 如果所有座位都失敗，回退到回溯搜索
		this.logger.debug('深度優先搜索失敗，回退到回溯搜索');
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
	 * 檢查深度限制
	 * @returns {boolean} 是否達到深度限制
	 */
	checkDepthLimit() {
		return this.currentDepth >= this.maxDepth;
	}

	/**
	 * 按深度優先策略排序座位
	 * @param {Array} seats 座位列表
	 * @param {string} student 學生ID
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @returns {Array} 排序後的座位列表
	 */
	sortSeatsForDepthFirst(seats, student, conditions, studentScores, groupBindings) {
		return seats.sort((a, b) => {
			const scoreA = this.calculateHeuristic(student, a, conditions, studentScores, groupBindings);
			const scoreB = this.calculateHeuristic(student, b, conditions, studentScores, groupBindings);
			return scoreB - scoreA;
		});
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
	 * 初始化深度優先搜索器
	 * @param {Object} options 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.currentAssignment.clear();
		this.currentDepth = 0;
		this.maxDepth = 0;
		this.depthHistory = [];
		this.performanceMetrics = {
			startTime: Date.now(),
			executionSteps: 0
		};
		this.logger.info('深度優先搜索器初始化完成');
	}

	/**
	 * 銷毀深度優先搜索器
	 */
	dispose() {
		this.currentAssignment.clear();
		this.depthHistory = [];
		this.logger.info('深度優先搜索器銷毀完成');
	}
}

module.exports = { DepthFirstSearcher };
