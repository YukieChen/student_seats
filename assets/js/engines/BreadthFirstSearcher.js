/**
 * 廣度優先搜索器模組
 * 負責層級式搜索策略
 */
const { Logger } = require('./Logger.js');

class BreadthFirstSearcher {
	constructor(options = {}) {
		this.logger = new Logger('BreadthFirstSearcher');
		this.options = {
			timeout: options.timeout || 30000,
			maxQueueSize: options.maxQueueSize || 10000,
			...options
		};

		// 搜索狀態管理
		this.currentAssignment = new Map();
		this.performanceMetrics = {
			startTime: 0,
			executionSteps: 0
		};

		// 廣度優先搜索狀態
		this.searchQueue = [];
		this.visitedStates = new Set();
		this.currentBreadth = 0;
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
	 * 廣度優先搜索 - 層級式搜索策略
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
	async breadthFirstSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment) {
		this.performanceMetrics.executionSteps++;

		// 初始化廣度優先搜索
		this.searchQueue = [];
		this.visitedStates = new Set();
		this.currentBreadth = 0;

		// 超時檢查
		if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
			this.logger.warn('廣度優先搜索超時', {
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

		// 初始化搜索隊列
		this.initializeQueue(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap);

		// 處理隊列直到找到解或隊列為空
		while (this.searchQueue.length > 0) {
			// 檢查隊列大小限制
			if (this.searchQueue.length > this.options.maxQueueSize) {
				this.logger.warn('廣度優先搜索隊列過大，回退到回溯搜索', {
					queueSize: this.searchQueue.length,
					maxSize: this.options.maxQueueSize
				});
				return await backtrackAssignment(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap
				);
			}

			// 從隊列中取出一個狀態
			const currentState = this.searchQueue.shift();

			// 檢查是否已訪問過此狀態
			const stateKey = this.generateStateKey(currentState.assignment, currentState.remainingStudents);
			if (this.visitedStates.has(stateKey)) {
				continue;
			}
			this.visitedStates.add(stateKey);

			// 更新當前分配狀態
			this.currentAssignment = new Map(currentState.assignment);
			this.currentBreadth = currentState.depth;

			this.logger.debug('廣度優先處理狀態', {
				depth: currentState.depth,
				remainingStudents: currentState.remainingStudents.length,
				queueSize: this.searchQueue.length
			});

			// 檢查是否找到解
			if (currentState.remainingStudents.length === 0) {
				this.logger.info('廣度優先搜索找到解');
				return {
					success: true,
					assignment: new Map(this.currentAssignment),
					unassignedStudents: []
				};
			}

			// 處理當前狀態，生成新的候選狀態
			const newStates = await this.processQueueState(
				currentState,
				seats,
				conditions,
				studentScores,
				groupBindings,
				studentToConditionsMap,
				conflictChecker
			);

			// 將新狀態加入隊列
			this.enqueueStates(newStates);

			// 讓出控制權，避免阻塞 UI
			await new Promise(resolve => setTimeout(resolve, 0));
		}

		// 如果隊列為空且沒有找到解，回退到回溯搜索
		this.logger.debug('廣度優先搜索失敗，回退到回溯搜索');
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
	 * 初始化搜索隊列
	 * @param {Array} students 待分配學生列表
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 */
	initializeQueue(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
		// 創建初始狀態
		const initialState = {
			assignment: new Map(),
			remainingStudents: [...students],
			depth: 0,
			path: []
		};

		this.searchQueue = [initialState];
		this.visitedStates.clear();
		this.currentBreadth = 0;

		this.logger.debug('初始化廣度優先搜索隊列', {
			initialStudents: students.length,
			totalSeats: seats.length
		});
	}

	/**
	 * 處理隊列中的狀態
	 * @param {Object} state 當前狀態
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} conflictChecker 衝突檢查器
	 * @returns {Array} 新生成的狀態列表
	 */
	async processQueueState(state, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker) {
		const newStates = [];
		const currentStudent = state.remainingStudents[0];

		// 獲取所有可用座位
		const availableSeats = seats.filter(seat =>
			!Array.from(state.assignment.values()).some(assignedSeat =>
				assignedSeat.row === seat.row && assignedSeat.col === seat.col
			)
		);

		// 為當前學生嘗試所有可能的座位
		for (const seat of availableSeats) {
			// 檢查基本條件
			const tempAssignment = new Map(state.assignment);
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
				// 計算廣度優先分數
				const breadthScore = this.evaluateBreadthScore(
					currentStudent,
					seat,
					conditions,
					studentScores,
					groupBindings,
					state.remainingStudents,
					availableSeats
				);

				// 創建新狀態
				const newState = {
					assignment: tempAssignment,
					remainingStudents: state.remainingStudents.filter(s => s !== currentStudent),
					depth: state.depth + 1,
					path: [...state.path, { student: currentStudent, seat, breadthScore }]
				};

				newStates.push(newState);
			}
		}

		// 按廣度優先分數排序
		newStates.sort((a, b) => {
			const scoreA = a.path[a.path.length - 1]?.breadthScore || 0;
			const scoreB = b.path[b.path.length - 1]?.breadthScore || 0;
			return scoreB - scoreA;
		});

		return newStates;
	}

	/**
	 * 將新狀態加入隊列
	 * @param {Array} newStates 新狀態列表
	 */
	enqueueStates(newStates) {
		for (const state of newStates) {
			// 檢查隊列大小限制
			if (this.searchQueue.length >= this.options.maxQueueSize) {
				this.logger.warn('廣度優先搜索隊列已滿，跳過剩餘狀態');
				break;
			}

			this.searchQueue.push(state);
		}

		this.logger.debug('廣度優先搜索隊列更新', {
			newStatesCount: newStates.length,
			totalQueueSize: this.searchQueue.length
		});
	}

	/**
	 * 評估廣度優先分數
	 * @param {string} student 學生ID
	 * @param {Object} seat 座位
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Array} remainingStudents 剩餘學生
	 * @param {Array} availableSeats 可用座位
	 * @returns {number} 廣度優先分數
	 */
	evaluateBreadthScore(student, seat, conditions, studentScores, groupBindings, remainingStudents, availableSeats) {
		let breadthScore = 0;

		// 1. 學生優先級分數（高分學生優先）
		breadthScore += (studentScores[student] || 0) * 2;

		// 2. 廣度潛力分數（能讓更多學生在同一層級被分配的選項優先）
		const remainingSeatsAfterMove = availableSeats.filter(s =>
			s.row !== seat.row || s.col !== seat.col
		);
		const potentialAssignments = Math.min(remainingStudents.length - 1, remainingSeatsAfterMove.length);
		breadthScore += potentialAssignments * 25;

		// 3. 條件滿足度分數（滿足更多條件的移動優先）
		const studentConditions = conditions.filter(condition =>
			condition.students.some(studentList =>
				studentList.includes(student)
			)
		);

		for (const condition of studentConditions) {
			if (condition.type === 'assign_group' && seat.groupId === condition.group) {
				breadthScore += 35;
			} else if (condition.type === 'adjacent_and_group' && seat.groupId === condition.group) {
				breadthScore += 45;
			}
		}

		// 4. 群組綁定分數
		if (groupBindings && groupBindings.has(student)) {
			const binding = groupBindings.get(student);
			if (binding.type === 'assign_student_group_to_seat_group' &&
				seat.groupId === binding.seatGroup) {
				breadthScore += 65;
			}
		}

		// 5. 座位稀缺性分數（特殊座位優先）
		if (this.isSpecialSeat(seat)) {
			breadthScore += 55;
		}

		// 6. 位置偏好分數（前排優先）
		if (seat.row <= 3) {
			breadthScore += 12;
		}

		// 7. 廣度擴展分數（能讓搜索更廣的選項優先）
		const adjacentSeats = this.getAdjacentSeats(seat, availableSeats);
		breadthScore += adjacentSeats.length * 8;

		return breadthScore;
	}

	/**
	 * 獲取相鄰座位
	 * @param {Object} seat 當前座位
	 * @param {Array} availableSeats 可用座位列表
	 * @returns {Array} 相鄰座位列表
	 */
	getAdjacentSeats(seat, availableSeats) {
		return availableSeats.filter(s =>
			(Math.abs(s.row - seat.row) === 1 && s.col === seat.col) ||
			(Math.abs(s.col - seat.col) === 1 && s.row === seat.row)
		);
	}

	/**
	 * 生成狀態鍵值
	 * @param {Map} assignment 分配狀態
	 * @param {Array} remainingStudents 剩餘學生
	 * @returns {string} 狀態鍵值
	 */
	generateStateKey(assignment, remainingStudents) {
		const assignmentStr = Array.from(assignment.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([student, seat]) => `${student}:${seat.row},${seat.col}`)
			.join('|');

		const studentsStr = remainingStudents.sort().join(',');

		return `${assignmentStr}|${studentsStr}`;
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
	 * 初始化廣度優先搜索器
	 * @param {Object} options 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.currentAssignment.clear();
		this.searchQueue = [];
		this.visitedStates.clear();
		this.currentBreadth = 0;
		this.performanceMetrics = {
			startTime: Date.now(),
			executionSteps: 0
		};
		this.logger.info('廣度優先搜索器初始化完成');
	}

	/**
	 * 銷毀廣度優先搜索器
	 */
	dispose() {
		this.currentAssignment.clear();
		this.searchQueue = [];
		this.visitedStates.clear();
		this.logger.info('廣度優先搜索器銷毀完成');
	}
}

module.exports = { BreadthFirstSearcher };
