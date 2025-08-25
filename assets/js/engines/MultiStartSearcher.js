// MultiStartSearcher.js - 多起點搜索器
const { Logger } = require('./Logger.js');

class MultiStartSearcher {
	constructor(options = {}) {
		this.logger = new Logger(options.logLevel || 'INFO');
		this.options = {
			timeout: options.timeout || 30000,
			maxWorkers: options.maxWorkers || 4,
			...options
		};

		// 性能指標
		this.performanceMetrics = {
			startTime: 0,
			executionSteps: 0
		};

		// 搜索狀態
		this.currentAssignment = new Map();
		this.seatsConfig = [];
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
	 * 設置座位配置
	 * @param {Array} seats 座位配置
	 */
	setSeatsConfig(seats) {
		this.seatsConfig = seats;
	}

	/**
	 * 多起點初始化 - 生成多個不同的搜索起點
	 * @param {Array} students 待分配學生列表
	 * @param {Array} seats 可用座位列表
	 * @param {Array} conditions 分配條件
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} options 配置選項
	 * @returns {Object} 多起點配置
	 */
	initializeMultipleStarts(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options = {}) {
		// 輸入驗證
		if (!students || students.length === 0) {
			throw new Error('學生列表不能為空');
		}
		if (!seats || seats.length === 0) {
			throw new Error('座位列表不能為空');
		}
		if (!studentScores || Object.keys(studentScores).length === 0) {
			throw new Error('學生分數不能為空');
		}

		const startTime = Date.now();
		this.logger.log('INFO', 'MultiStartSearcher', '開始多起點初始化', {
			studentCount: students.length,
			seatCount: seats.length,
			options
		});

		const {
			startPointCount = 5,
			strategies = ['heuristic', 'depthFirst', 'breadthFirst'],
			enableRandomization = true,
			enableGroupOptimization = true
		} = options;

		const startPoints = [];
		const usedStrategies = new Set();

		try {
			// 策略 1: 基於不同學生排序的起點
			if (strategies.includes('heuristic')) {
				const heuristicStartPoints = this.generateHeuristicStartPoints(
					students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
				);
				startPoints.push(...heuristicStartPoints);
				usedStrategies.add('heuristic');
			}

			// 策略 2: 基於不同座位排序的起點
			if (strategies.includes('depthFirst')) {
				const depthFirstStartPoints = this.generateDepthFirstStartPoints(
					students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
				);
				startPoints.push(...depthFirstStartPoints);
				usedStrategies.add('depthFirst');
			}

			// 策略 3: 基於隨機化的起點
			if (enableRandomization && strategies.includes('breadthFirst')) {
				const randomStartPoints = this.generateRandomStartPoints(
					students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
				);
				startPoints.push(...randomStartPoints);
				usedStrategies.add('breadthFirst');
			}

			// 策略 4: 基於群組優化的起點
			if (enableGroupOptimization) {
				const groupStartPoints = this.generateGroupOptimizedStartPoints(
					students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
				);
				startPoints.push(...groupStartPoints);
				usedStrategies.add('groupOptimized');
			}

			// 限制起點數量並分配優先級
			const limitedStartPoints = this.limitAndPrioritizeStartPoints(startPoints, startPointCount);

			const generationTime = Date.now() - startTime;

			this.logger.log('INFO', 'MultiStartSearcher', '多起點初始化完成', {
				totalGenerated: startPoints.length,
				finalCount: limitedStartPoints.length,
				generationTime,
				strategies: Array.from(usedStrategies)
			});

			return {
				startPoints: limitedStartPoints,
				metadata: {
					totalStartPoints: limitedStartPoints.length,
					generationTime,
					strategies: Array.from(usedStrategies),
					originalStudentCount: students.length,
					originalSeatCount: seats.length
				}
			};

		} catch (error) {
			this.logger.log('ERROR', 'MultiStartSearcher', '多起點初始化失敗', { error: error.message });
			throw new Error(`多起點初始化失敗: ${error.message}`);
		}
	}

	/**
	 * 並行搜索 - 使用多個起點同時進行搜索
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} options 配置選項
	 * @param {Function} searchFunction 搜索函數
	 * @returns {Promise<Object>} 並行搜索結果
	 */
	async parallelSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options = {}, searchFunction) {
		const startTime = Date.now();
		this.logger.log('INFO', 'MultiStartSearcher', '開始並行搜索', {
			studentCount: students.length,
			seatCount: seats.length,
			options
		});

		const {
			maxWorkers = this.options.maxWorkers,
			timeout = this.options.timeout,
			enableProgressCallback = true,
			progressCallback = null
		} = options;

		try {
			// 0. 設置座位配置
			this.setSeatsConfig(seats);

			// 1. 初始化多個起點
			const startPointsResult = this.initializeMultipleStarts(
				students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options
			);

			if (!startPointsResult.startPoints || startPointsResult.startPoints.length === 0) {
				throw new Error('無法生成有效的搜索起點');
			}

			// 2. 創建並行搜索任務
			const searchTasks = this.createParallelSearchTasks(
				startPointsResult.startPoints,
				maxWorkers,
				options
			);

			// 3. 執行並行搜索
			const searchResults = await this.executeParallelSearch(
				searchTasks,
				timeout,
				enableProgressCallback,
				progressCallback,
				searchFunction
			);

			// 4. 合併搜索結果
			const mergedResults = this.mergeParallelSearchResults(searchResults);

			// 5. 選擇最佳解決方案
			const bestSolution = this.selectBestParallelSolution(mergedResults);

			const totalTime = Date.now() - startTime;

			this.logger.log('INFO', 'MultiStartSearcher', '並行搜索完成', {
				totalStartPoints: startPointsResult.startPoints.length,
				completedTasks: searchResults.length,
				totalTime,
				bestSolutionScore: bestSolution.score
			});

			return {
				success: true,
				solution: bestSolution.assignment,
				score: bestSolution.score,
				metadata: {
					totalStartPoints: startPointsResult.startPoints.length,
					completedTasks: searchResults.length,
					totalTime,
					parallelEfficiency: this.calculateParallelEfficiency(searchResults, totalTime),
					searchCoverage: this.calculateSearchCoverage(searchResults, startPointsResult.startPoints.length)
				}
			};

		} catch (error) {
			this.logger.log('ERROR', 'MultiStartSearcher', '並行搜索失敗', { error: error.message });
			return {
				success: false,
				error: error.message,
				metadata: {
					totalTime: Date.now() - startTime
				}
			};
		}
	}

	/**
	 * 生成啟發式搜索起點
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {number} count 起點數量
	 * @returns {Array} 啟發式起點列表
	 */
	generateHeuristicStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
		const startPoints = [];

		for (let i = 0; i < count; i++) {
			// 基於分數的學生排序變體
			const sortedStudents = this.sortStudentsByPriority(students, studentScores);

			// 創建不同的學生排序變體
			let variantStudents;
			if (i === 0) {
				// 原始排序
				variantStudents = [...sortedStudents];
			} else if (i === 1) {
				// 反向排序
				variantStudents = [...sortedStudents].reverse();
			} else if (i === 2) {
				// 隨機打亂
				variantStudents = this.shuffleArray([...sortedStudents]);
			} else {
				// 基於不同權重的排序
				const weightedScores = this.calculateWeightedScores(students, studentScores, i);
				variantStudents = this.sortStudentsByPriority(students, weightedScores);
			}

			startPoints.push({
				id: `heuristic_start_${i + 1}`,
				students: variantStudents,
				seats: [...seats],
				conditions: [...conditions],
				studentScores: { ...studentScores },
				groupBindings: new Map(groupBindings),
				studentToConditionsMap: new Map(studentToConditionsMap),
				strategy: 'heuristic',
				priority: i + 1,
				description: `啟發式起點 ${i + 1} - ${this.getStudentOrderDescription(variantStudents, sortedStudents)}`
			});
		}

		return startPoints;
	}

	/**
	 * 生成深度優先搜索起點
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {number} count 起點數量
	 * @returns {Array} 深度優先起點列表
	 */
	generateDepthFirstStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
		const startPoints = [];

		for (let i = 0; i < count; i++) {
			// 基於座位偏好的排序變體
			const sortedSeats = this.sortSeatsByPreference(seats);

			// 創建不同的座位排序變體
			let variantSeats;
			if (i === 0) {
				// 原始座位排序
				variantSeats = [...sortedSeats];
			} else if (i === 1) {
				// 反向座位排序
				variantSeats = [...sortedSeats].reverse();
			} else if (i === 2) {
				// 隨機座位排序
				variantSeats = this.shuffleArray([...sortedSeats]);
			} else {
				// 基於不同標準的座位排序
				variantSeats = this.sortSeatsByAlternativeCriteria(seats, i);
			}

			startPoints.push({
				id: `depthFirst_start_${i + 1}`,
				students: [...students],
				seats: variantSeats,
				conditions: [...conditions],
				studentScores: { ...studentScores },
				groupBindings: new Map(groupBindings),
				studentToConditionsMap: new Map(studentToConditionsMap),
				strategy: 'depthFirst',
				priority: i + 1,
				description: `深度優先起點 ${i + 1} - ${this.getSeatOrderDescription(variantSeats, sortedSeats)}`
			});
		}

		return startPoints;
	}

	/**
	 * 生成隨機搜索起點
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {number} count 起點數量
	 * @returns {Array} 隨機起點列表
	 */
	generateRandomStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
		const startPoints = [];

		for (let i = 0; i < count; i++) {
			// 隨機化學生和座位
			const randomStudents = this.shuffleArray([...students]);
			const randomSeats = this.shuffleArray([...seats]);

			startPoints.push({
				id: `random_start_${i + 1}`,
				students: randomStudents,
				seats: randomSeats,
				conditions: [...conditions],
				studentScores: { ...studentScores },
				groupBindings: new Map(groupBindings),
				studentToConditionsMap: new Map(studentToConditionsMap),
				strategy: 'breadthFirst',
				priority: i + 1,
				description: `隨機起點 ${i + 1} - 完全隨機化`
			});
		}

		return startPoints;
	}

	/**
	 * 生成群組優化起點
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {number} count 起點數量
	 * @returns {Array} 群組優化起點列表
	 */
	generateGroupOptimizedStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
		const startPoints = [];

		// 按群組組織學生
		const studentsByGroup = this.groupStudentsByGroup(students, groupBindings);
		const seatsByGroup = this.groupSeatsByGroup(seats);

		for (let i = 0; i < count; i++) {
			// 創建群組優化的學生排序
			const groupOptimizedStudents = this.createGroupOptimizedOrder(studentsByGroup, i);

			// 創建群組優化的座位排序
			const groupOptimizedSeats = this.createGroupOptimizedSeatOrder(seatsByGroup, i);

			startPoints.push({
				id: `groupOptimized_start_${i + 1}`,
				students: groupOptimizedStudents,
				seats: groupOptimizedSeats,
				conditions: [...conditions],
				studentScores: { ...studentScores },
				groupBindings: new Map(groupBindings),
				studentToConditionsMap: new Map(studentToConditionsMap),
				strategy: 'groupOptimized',
				priority: i + 1,
				description: `群組優化起點 ${i + 1} - 群組優先策略`
			});
		}

		return startPoints;
	}

	/**
	 * 限制並優先級排序起點
	 * @param {Array} startPoints 所有起點
	 * @param {number} maxCount 最大數量
	 * @returns {Array} 限制後的起點列表
	 */
	limitAndPrioritizeStartPoints(startPoints, maxCount) {
		// 按優先級排序
		startPoints.sort((a, b) => a.priority - b.priority);

		// 限制數量
		return startPoints.slice(0, maxCount);
	}

	/**
	 * 創建並行搜索任務
	 * @param {Array} startPoints 起點列表
	 * @param {number} maxWorkers 最大工作線程數
	 * @param {Object} options 配置選項
	 * @returns {Array} 搜索任務列表
	 */
	createParallelSearchTasks(startPoints, maxWorkers, options) {
		const tasks = [];
		const tasksPerWorker = Math.ceil(startPoints.length / maxWorkers);

		for (let i = 0; i < startPoints.length; i += tasksPerWorker) {
			const workerTasks = startPoints.slice(i, i + tasksPerWorker);
			tasks.push({
				workerId: Math.floor(i / tasksPerWorker),
				tasks: workerTasks,
				options: { ...options }
			});
		}

		this.logger.log('DEBUG', 'MultiStartSearcher', '創建並行搜索任務', {
			totalStartPoints: startPoints.length,
			maxWorkers,
			totalTasks: tasks.length,
			tasksPerWorker
		});

		return tasks;
	}

	/**
	 * 執行並行搜索
	 * @param {Array} searchTasks 搜索任務列表
	 * @param {number} timeout 超時時間
	 * @param {boolean} enableProgressCallback 是否啟用進度回調
	 * @param {Function} progressCallback 進度回調函數
	 * @param {Function} searchFunction 搜索函數
	 * @returns {Promise<Array>} 搜索結果列表
	 */
	async executeParallelSearch(searchTasks, timeout, enableProgressCallback, progressCallback, searchFunction) {
		const results = [];
		const startTime = Date.now();
		let completedTasks = 0;

		// 創建並行執行器
		const executeTask = async (task) => {
			const taskResults = [];

			for (const startPoint of task.tasks) {
				try {
					const result = await this.executeSingleSearchTask(startPoint, searchFunction);
					taskResults.push({
						startPointId: startPoint.id,
						result: result,
						workerId: task.workerId
					});
				} catch (error) {
					this.logger.log('ERROR', 'MultiStartSearcher', '單個搜索任務失敗', {
						startPointId: startPoint.id,
						error: error.message
					});
					taskResults.push({
						startPointId: startPoint.id,
						result: { success: false, error: error.message },
						workerId: task.workerId
					});
				}

				completedTasks++;
				if (enableProgressCallback && progressCallback) {
					const progress = (completedTasks / searchTasks.reduce((sum, t) => sum + t.tasks.length, 0)) * 100;
					progressCallback(progress, completedTasks);
				}

				// 檢查超時
				if (Date.now() - startTime > timeout) {
					this.logger.log('WARN', 'MultiStartSearcher', '並行搜索超時', {
						elapsed: Date.now() - startTime,
						timeout
					});
					break;
				}
			}

			return taskResults;
		};

		// 並行執行所有任務
		const taskPromises = searchTasks.map(executeTask);
		const taskResults = await Promise.allSettled(taskPromises);

		// 收集結果
		for (const taskResult of taskResults) {
			if (taskResult.status === 'fulfilled') {
				results.push(...taskResult.value);
			} else {
				this.logger.log('ERROR', 'MultiStartSearcher', '任務執行失敗', {
					error: taskResult.reason
				});
			}
		}

		return results;
	}

	/**
	 * 執行單個搜索任務
	 * @param {Object} startPoint 起點
	 * @param {Function} searchFunction 搜索函數
	 * @returns {Promise<Object>} 搜索結果
	 */
	async executeSingleSearchTask(startPoint, searchFunction) {
		this.logger.log('DEBUG', 'MultiStartSearcher', '執行單個搜索任務', {
			startPointId: startPoint.id,
			strategy: startPoint.strategy
		});

		try {
			// 調用搜索函數
			const result = await searchFunction(
				startPoint.students,
				startPoint.seats,
				startPoint.conditions,
				startPoint.studentScores,
				startPoint.groupBindings,
				startPoint.studentToConditionsMap
			);

			return {
				...result,
				startPointId: startPoint.id,
				strategy: startPoint.strategy,
				priority: startPoint.priority
			};

		} catch (error) {
			this.logger.log('ERROR', 'MultiStartSearcher', '單個搜索任務執行失敗', {
				startPointId: startPoint.id,
				error: error.message
			});

			return {
				success: false,
				error: error.message,
				startPointId: startPoint.id,
				strategy: startPoint.strategy,
				priority: startPoint.priority
			};
		}
	}

	/**
	 * 合併並行搜索結果
	 * @param {Array} searchResults 搜索結果列表
	 * @returns {Array} 合併後的結果
	 */
	mergeParallelSearchResults(searchResults) {
		const mergedResults = [];

		for (const result of searchResults) {
			if (result.result && result.result.success) {
				mergedResults.push({
					assignment: result.result.assignment,
					score: this.calculateSolutionScore(result.result.assignment, result.result),
					startPointId: result.startPointId,
					strategy: result.strategy,
					priority: result.priority,
					metadata: result.result.metadata || {}
				});
			}
		}

		// 按分數排序
		mergedResults.sort((a, b) => b.score - a.score);

		this.logger.log('INFO', 'MultiStartSearcher', '合併並行搜索結果', {
			totalResults: searchResults.length,
			successfulResults: mergedResults.length,
			bestScore: mergedResults.length > 0 ? mergedResults[0].score : 0
		});

		return mergedResults;
	}

	/**
	 * 選擇最佳並行解決方案
	 * @param {Array} mergedResults 合併後的結果
	 * @returns {Object} 最佳解決方案
	 */
	selectBestParallelSolution(mergedResults) {
		if (mergedResults.length === 0) {
			return {
				assignment: new Map(),
				score: 0,
				startPointId: null,
				strategy: null
			};
		}

		const bestSolution = mergedResults[0];

		this.logger.log('INFO', 'MultiStartSearcher', '選擇最佳並行解決方案', {
			bestScore: bestSolution.score,
			startPointId: bestSolution.startPointId,
			strategy: bestSolution.strategy,
			totalCandidates: mergedResults.length
		});

		return bestSolution;
	}

	// 輔助方法

	/**
	 * 計算加權分數
	 * @param {Array} students 學生列表
	 * @param {Object} studentScores 原始分數
	 * @param {number} weightIndex 權重索引
	 * @returns {Object} 加權分數
	 */
	calculateWeightedScores(students, studentScores, weightIndex) {
		const weights = [
			{ academic: 0.4, behavior: 0.3, special: 0.3 },
			{ academic: 0.6, behavior: 0.2, special: 0.2 },
			{ academic: 0.2, behavior: 0.6, special: 0.2 },
			{ academic: 0.3, behavior: 0.2, special: 0.5 }
		];

		const weight = weights[weightIndex % weights.length];
		const weightedScores = {};

		for (const student of students) {
			const originalScore = studentScores[student.id] || 0;
			weightedScores[student.id] = originalScore * (0.8 + Math.random() * 0.4); // 添加隨機變異
		}

		return weightedScores;
	}

	/**
	 * 基於替代標準排序座位
	 * @param {Array} seats 座位列表
	 * @param {number} criteriaIndex 標準索引
	 * @returns {Array} 排序後的座位
	 */
	sortSeatsByAlternativeCriteria(seats, criteriaIndex) {
		const criteria = [
			(a, b) => (a.row - b.row) || (a.col - b.col), // 按行列排序
			(a, b) => (b.row - a.row) || (b.col - a.col), // 反向行列排序
			(a, b) => (a.groupId || a.group || '').localeCompare(b.groupId || b.group || ''), // 按群組排序
			(a, b) => (b.groupId || b.group || '').localeCompare(a.groupId || a.group || '')  // 反向群組排序
		];

		const criteriaFunc = criteria[criteriaIndex % criteria.length];
		return [...seats].sort(criteriaFunc);
	}

	/**
	 * 按群組組織學生
	 * @param {Array} students 學生列表
	 * @param {Map} groupBindings 群組綁定
	 * @returns {Map} 按群組組織的學生
	 */
	groupStudentsByGroup(students, groupBindings) {
		const studentsByGroup = new Map();

		for (const student of students) {
			const groupId = groupBindings.get(student.id) || 'default';
			if (!studentsByGroup.has(groupId)) {
				studentsByGroup.set(groupId, []);
			}
			studentsByGroup.get(groupId).push(student);
		}

		return studentsByGroup;
	}

	/**
	 * 按群組組織座位
	 * @param {Array} seats 座位列表
	 * @returns {Map} 按群組組織的座位
	 */
	groupSeatsByGroup(seats) {
		const seatsByGroup = new Map();

		for (const seat of seats) {
			const groupId = seat.groupId || seat.group || 'default';
			if (!seatsByGroup.has(groupId)) {
				seatsByGroup.set(groupId, []);
			}
			seatsByGroup.get(groupId).push(seat);
		}

		return seatsByGroup;
	}

	/**
	 * 創建群組優化順序
	 * @param {Map} studentsByGroup 按群組組織的學生
	 * @param {number} strategyIndex 策略索引
	 * @returns {Array} 群組優化的學生順序
	 */
	createGroupOptimizedOrder(studentsByGroup, strategyIndex) {
		const strategies = [
			// 策略1: 按群組大小排序
			() => {
				const sortedGroups = Array.from(studentsByGroup.entries())
					.sort((a, b) => b[1].length - a[1].length);
				return sortedGroups.flatMap(([groupId, students]) => students);
			},
			// 策略2: 按群組ID排序
			() => {
				const sortedGroups = Array.from(studentsByGroup.entries())
					.sort((a, b) => a[0].localeCompare(b[0]));
				return sortedGroups.flatMap(([groupId, students]) => students);
			},
			// 策略3: 交錯群組
			() => {
				const groups = Array.from(studentsByGroup.values());
				const result = [];
				let maxLength = Math.max(...groups.map(g => g.length));

				for (let i = 0; i < maxLength; i++) {
					for (const group of groups) {
						if (i < group.length) {
							result.push(group[i]);
						}
					}
				}
				return result;
			}
		];

		const strategy = strategies[strategyIndex % strategies.length];
		return strategy();
	}

	/**
	 * 創建群組優化座位順序
	 * @param {Map} seatsByGroup 按群組組織的座位
	 * @param {number} strategyIndex 策略索引
	 * @returns {Array} 群組優化的座位順序
	 */
	createGroupOptimizedSeatOrder(seatsByGroup, strategyIndex) {
		const strategies = [
			// 策略1: 按群組大小排序
			() => {
				const sortedGroups = Array.from(seatsByGroup.entries())
					.sort((a, b) => b[1].length - a[1].length);
				return sortedGroups.flatMap(([groupId, seats]) => seats);
			},
			// 策略2: 按群組ID排序
			() => {
				const sortedGroups = Array.from(seatsByGroup.entries())
					.sort((a, b) => a[0].localeCompare(b[0]));
				return sortedGroups.flatMap(([groupId, seats]) => seats);
			},
			// 策略3: 交錯群組
			() => {
				const groups = Array.from(seatsByGroup.values());
				const result = [];
				let maxLength = Math.max(...groups.map(g => g.length));

				for (let i = 0; i < maxLength; i++) {
					for (const group of groups) {
						if (i < group.length) {
							result.push(group[i]);
						}
					}
				}
				return result;
			}
		];

		const strategy = strategies[strategyIndex % strategies.length];
		return strategy();
	}

	/**
	 * 獲取學生順序描述
	 * @param {Array} variantStudents 變體學生順序
	 * @param {Array} originalStudents 原始學生順序
	 * @returns {string} 描述
	 */
	getStudentOrderDescription(variantStudents, originalStudents) {
		if (variantStudents.length === originalStudents.length) {
			const isReversed = variantStudents[0] === originalStudents[originalStudents.length - 1];
			const isShuffled = !isReversed && variantStudents[0] !== originalStudents[0];

			if (isReversed) return '反向排序';
			if (isShuffled) return '隨機排序';
			return '原始排序';
		}
		return '自定義排序';
	}

	/**
	 * 獲取座位順序描述
	 * @param {Array} variantSeats 變體座位順序
	 * @param {Array} originalSeats 原始座位順序
	 * @returns {string} 描述
	 */
	getSeatOrderDescription(variantSeats, originalSeats) {
		if (variantSeats.length === originalSeats.length) {
			const isReversed = variantSeats[0] === originalSeats[originalSeats.length - 1];
			const isShuffled = !isReversed && variantSeats[0] !== originalSeats[0];

			if (isReversed) return '反向排序';
			if (isShuffled) return '隨機排序';
			return '原始排序';
		}
		return '自定義排序';
	}

	/**
	 * 計算解決方案分數
	 * @param {Map} assignment 分配結果
	 * @param {Object} result 搜索結果
	 * @returns {number} 分數
	 */
	calculateSolutionScore(assignment, result) {
		let score = 0;

		// 基本分數：成功分配的分數
		if (result.success) {
			score += 1000;
		}

		// 分配完整性分數
		if (assignment && assignment.size > 0) {
			score += assignment.size * 10;
		}

		// 無未分配學生的獎勵
		if (result.unassignedStudents && result.unassignedStudents.length === 0) {
			score += 500;
		}

		// 性能分數（執行時間越短越好）
		if (result.metadata && result.metadata.executionTime) {
			score += Math.max(0, 100 - result.metadata.executionTime / 100);
		}

		return score;
	}

	/**
	 * 計算並行效率
	 * @param {Array} searchResults 搜索結果
	 * @param {number} totalTime 總時間
	 * @returns {number} 並行效率
	 */
	calculateParallelEfficiency(searchResults, totalTime) {
		if (searchResults.length === 0) return 0;

		const successfulResults = searchResults.filter(r => r.result && r.result.success);
		const efficiency = successfulResults.length / searchResults.length;

		return Math.round(efficiency * 100);
	}

	/**
	 * 計算搜索覆蓋率
	 * @param {Array} searchResults 搜索結果
	 * @param {number} totalStartPoints 總起點數
	 * @returns {number} 搜索覆蓋率
	 */
	calculateSearchCoverage(searchResults, totalStartPoints) {
		if (totalStartPoints === 0) return 0;

		const uniqueStartPoints = new Set(searchResults.map(r => r.startPointId));
		const coverage = uniqueStartPoints.size / totalStartPoints;

		return Math.round(coverage * 100);
	}

	/**
	 * 按優先級排序學生
	 * @param {Array} students 學生列表
	 * @param {Object} studentScores 學生分數
	 * @returns {Array} 排序後的學生
	 */
	sortStudentsByPriority(students, studentScores) {
		return [...students].sort((a, b) => {
			const scoreA = studentScores[a.id] || 0;
			const scoreB = studentScores[b.id] || 0;
			return scoreB - scoreA;
		});
	}

	/**
	 * 按偏好排序座位
	 * @param {Array} seats 座位列表
	 * @returns {Array} 排序後的座位
	 */
	sortSeatsByPreference(seats) {
		return [...seats].sort((a, b) => {
			// 前排優先
			if (a.row !== b.row) {
				return a.row - b.row;
			}
			// 左側優先
			return a.col - b.col;
		});
	}

	/**
	 * 隨機打亂陣列
	 * @param {Array} array 要打亂的陣列
	 * @returns {Array} 打亂後的陣列
	 */
	shuffleArray(array) {
		const shuffled = [...array];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}
}

module.exports = { MultiStartSearcher };
