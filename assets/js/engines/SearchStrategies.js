/**
 * 搜索策略管理器協調器
 * 整合啟發式搜索、深度優先搜索、廣度優先搜索和混合搜索功能
 */
const { HeuristicSearcher } = require('./HeuristicSearcher.js');
const { DepthFirstSearcher } = require('./DepthFirstSearcher.js');
const { BreadthFirstSearcher } = require('./BreadthFirstSearcher.js');
const { HybridSearcher } = require('./HybridSearcher.js');
const { Logger } = require('./Logger.js');

class SearchStrategies {
	constructor(options = {}) {
		this.logger = new Logger('SearchStrategies');
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

		// 初始化子模組
		this.heuristicSearcher = new HeuristicSearcher(options);
		this.depthFirstSearcher = new DepthFirstSearcher(options);
		this.breadthFirstSearcher = new BreadthFirstSearcher(options);
		this.hybridSearcher = new HybridSearcher(options);
	}

	/**
	 * 設置性能指標
	 * @param {Object} metrics 性能指標
	 */
	setPerformanceMetrics(metrics) {
		this.performanceMetrics = metrics;
		this.heuristicSearcher.setPerformanceMetrics(metrics);
		this.depthFirstSearcher.setPerformanceMetrics(metrics);
		this.breadthFirstSearcher.setPerformanceMetrics(metrics);
		this.hybridSearcher.setPerformanceMetrics(metrics);
	}

	/**
	 * 設置當前分配狀態
	 * @param {Map} assignment 當前分配狀態
	 */
	setCurrentAssignment(assignment) {
		this.currentAssignment = new Map(assignment);
		this.heuristicSearcher.setCurrentAssignment(assignment);
		this.depthFirstSearcher.setCurrentAssignment(assignment);
		this.breadthFirstSearcher.setCurrentAssignment(assignment);
		this.hybridSearcher.setCurrentAssignment(assignment);
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
		return await this.heuristicSearcher.heuristicSearch(
			students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment
		);
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
		return await this.depthFirstSearcher.depthFirstSearch(
			students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment
		);
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
		return await this.breadthFirstSearcher.breadthFirstSearch(
			students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment
		);
	}

	/**
	 * 混合搜索策略 - 動態選擇最適合的搜索方法
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} conflictChecker 衝突檢查器
	 * @param {Function} backtrackAssignment 回溯分配函數
	 * @returns {Promise<Object>} 搜索結果
	 */
	async hybridSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment) {
		return await this.hybridSearcher.hybridSearch(
			students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment
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
		return this.heuristicSearcher.evaluateState(students, seats, conditions, studentScores);
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
		return this.heuristicSearcher.calculateHeuristic(student, seat, conditions, studentScores, groupBindings);
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
		return this.heuristicSearcher.selectBestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker);
	}

	/**
	 * 檢查深度限制
	 * @returns {boolean} 是否達到深度限制
	 */
	checkDepthLimit() {
		return this.depthFirstSearcher.checkDepthLimit();
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
		return this.depthFirstSearcher.sortSeatsForDepthFirst(seats, student, conditions, studentScores, groupBindings);
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
		this.breadthFirstSearcher.initializeQueue(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap);
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
		return await this.breadthFirstSearcher.processQueueState(state, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker);
	}

	/**
	 * 將新狀態加入隊列
	 * @param {Array} newStates 新狀態列表
	 */
	enqueueStates(newStates) {
		this.breadthFirstSearcher.enqueueStates(newStates);
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
		return this.breadthFirstSearcher.evaluateBreadthScore(student, seat, conditions, studentScores, groupBindings, remainingStudents, availableSeats);
	}

	/**
	 * 獲取相鄰座位
	 * @param {Object} seat 當前座位
	 * @param {Array} availableSeats 可用座位列表
	 * @returns {Array} 相鄰座位列表
	 */
	getAdjacentSeats(seat, availableSeats) {
		return this.breadthFirstSearcher.getAdjacentSeats(seat, availableSeats);
	}

	/**
	 * 生成狀態鍵值
	 * @param {Map} assignment 分配狀態
	 * @param {Array} remainingStudents 剩餘學生
	 * @returns {string} 狀態鍵值
	 */
	generateStateKey(assignment, remainingStudents) {
		return this.breadthFirstSearcher.generateStateKey(assignment, remainingStudents);
	}

	/**
	 * 評估問題複雜度
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Map} groupBindings 群組綁定
	 * @returns {Object} 複雜度評估結果
	 */
	evaluateProblemComplexity(students, seats, conditions, groupBindings) {
		return this.hybridSearcher.evaluateProblemComplexity(students, seats, conditions, groupBindings);
	}

	/**
	 * 選擇初始搜索策略
	 * @param {Object} complexity 複雜度評估結果
	 * @returns {string} 策略名稱
	 */
	selectInitialStrategy(complexity) {
		return this.hybridSearcher.selectInitialStrategy(complexity);
	}

	/**
	 * 執行指定的搜索策略
	 * @param {string} strategy 策略名稱
	 * @param {Array} students 學生列表
	 * @param {Array} seats 座位列表
	 * @param {Array} conditions 條件列表
	 * @param {Object} studentScores 學生分數
	 * @param {Map} groupBindings 群組綁定
	 * @param {Map} studentToConditionsMap 學生到條件映射
	 * @param {Object} conflictChecker 衝突檢查器
	 * @param {Function} backtrackAssignment 回溯分配函數
	 * @returns {Promise<Object>} 搜索結果
	 */
	async executeStrategy(strategy, students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment) {
		return await this.hybridSearcher.executeStrategy(
			strategy, students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, conflictChecker, backtrackAssignment
		);
	}

	/**
	 * 獲取學生的相關條件
	 * @param {string} student 學生ID
	 * @param {Array} conditions 條件列表
	 * @returns {Array} 相關條件列表
	 */
	getStudentConditions(student, conditions) {
		return this.heuristicSearcher.getStudentConditions(student, conditions);
	}

	/**
	 * 檢查是否為特殊座位
	 * @param {Object} seat 座位
	 * @returns {boolean} 是否為特殊座位
	 */
	isSpecialSeat(seat) {
		return this.heuristicSearcher.isSpecialSeat(seat);
	}

	/**
	 * 初始化搜索策略管理器
	 * @param {Object} options 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.currentAssignment.clear();
		this.performanceMetrics.startTime = Date.now();
		this.performanceMetrics.executionSteps = 0;

		// 初始化子模組
		this.heuristicSearcher.initialize(options);
		this.depthFirstSearcher.initialize(options);
		this.breadthFirstSearcher.initialize(options);
		this.hybridSearcher.initialize(options);

		this.logger.info('搜索策略管理器初始化完成', {
			timeout: this.options.timeout,
			maxQueueSize: this.options.maxQueueSize
		});
	}

	/**
	 * 銷毀搜索策略管理器
	 */
	dispose() {
		this.heuristicSearcher.dispose();
		this.depthFirstSearcher.dispose();
		this.breadthFirstSearcher.dispose();
		this.hybridSearcher.dispose();
		this.logger.info('搜索策略管理器銷毀完成');
	}
}

module.exports = { SearchStrategies };
