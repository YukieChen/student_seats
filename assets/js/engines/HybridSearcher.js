/**
 * 混合搜索器模組
 * 負責動態選擇最適合的搜索方法
 */
const { Logger } = require('./Logger.js');

class HybridSearcher {
	constructor(options = {}) {
		this.logger = new Logger('HybridSearcher');
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
		this.performanceMetrics.executionSteps++;

		// 超時檢查
		if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
			this.logger.warn('混合搜索超時', {
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

		// 評估問題複雜度
		const complexity = this.evaluateProblemComplexity(students, seats, conditions, groupBindings);
		this.logger.debug('問題複雜度評估', complexity);

		// 選擇初始搜索策略
		const initialStrategy = this.selectInitialStrategy(complexity);
		this.logger.info(`混合搜索選擇初始策略: ${initialStrategy}`, { complexity });

		// 執行初始策略
		let result = await this.executeStrategy(
			initialStrategy,
			students,
			seats,
			conditions,
			studentScores,
			groupBindings,
			studentToConditionsMap,
			conflictChecker,
			backtrackAssignment
		);

		// 如果初始策略成功，返回結果
		if (result.success) {
			this.logger.info(`混合搜索成功使用策略: ${initialStrategy}`);
			return result;
		}

		// 如果初始策略失敗，嘗試其他策略
		const strategies = ['breadthFirst', 'depthFirst', 'heuristic', 'backtrack'];
		const triedStrategies = [initialStrategy];

		for (const strategy of strategies) {
			if (strategy === initialStrategy) continue;

			this.logger.info(`混合搜索切換到策略: ${strategy}`);

			result = await this.executeStrategy(
				strategy,
				students,
				seats,
				conditions,
				studentScores,
				groupBindings,
				studentToConditionsMap,
				conflictChecker,
				backtrackAssignment
			);

			triedStrategies.push(strategy);

			if (result.success) {
				this.logger.info(`混合搜索成功使用策略: ${strategy}`, { triedStrategies });
				return result;
			}

			// 檢查是否需要提前停止
			if (Date.now() - this.performanceMetrics.startTime > this.options.timeout * 0.8) {
				this.logger.warn('混合搜索接近超時，停止嘗試其他策略');
				break;
			}
		}

		// 所有策略都失敗
		this.logger.error('混合搜索所有策略都失敗', { triedStrategies });
		return {
			success: false,
			error: '所有搜索策略都失敗',
			unassignedStudents: students,
			assignment: new Map(this.currentAssignment),
			triedStrategies
		};
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
		const complexity = {
			studentCount: students.length,
			seatCount: seats.length,
			conditionCount: conditions.length,
			groupBindingCount: groupBindings ? groupBindings.size : 0,
			specialSeatCount: seats.filter(seat => this.isSpecialSeat(seat)).length,
			conditionTypes: {},
			overallScore: 0
		};

		// 分析條件類型分布
		conditions.forEach(condition => {
			complexity.conditionTypes[condition.type] = (complexity.conditionTypes[condition.type] || 0) + 1;
		});

		// 計算複雜度分數
		let score = 0;

		// 學生數量權重 (40%)
		const studentRatio = students.length / seats.length;
		if (students.length < 20) {
			score += 20; // 小規模
		} else if (students.length < 50) {
			score += 40; // 中等規模
		} else {
			score += 60; // 大規模
		}

		// 條件複雜度權重 (30%)
		const complexConditionTypes = ['adjacent_and_group', 'assign_group', 'not_adjacent'];
		const complexConditionCount = conditions.filter(c => complexConditionTypes.includes(c.type)).length;
		const conditionComplexityRatio = complexConditionCount / Math.max(conditions.length, 1);
		score += conditionComplexityRatio * 30;

		// 群組綁定複雜度權重 (20%)
		const groupBindingRatio = complexity.groupBindingCount / Math.max(students.length, 1);
		score += groupBindingRatio * 20;

		// 特殊座位需求權重 (10%)
		const specialSeatRatio = complexity.specialSeatCount / Math.max(seats.length, 1);
		score += specialSeatRatio * 10;

		complexity.overallScore = Math.round(score);
		complexity.complexityLevel = score < 30 ? 'low' : score < 60 ? 'medium' : 'high';

		return complexity;
	}

	/**
	 * 選擇初始搜索策略
	 * @param {Object} complexity 複雜度評估結果
	 * @returns {string} 策略名稱
	 */
	selectInitialStrategy(complexity) {
		const { studentCount, conditionCount, groupBindingCount, overallScore, complexityLevel } = complexity;

		// 基於複雜度等級的策略選擇
		if (complexityLevel === 'low') {
			// 低複雜度：優先使用啟發式搜索
			if (studentCount < 20 && conditionCount < 5) {
				return 'heuristic';
			}
			// 小規模但條件較多：使用廣度優先
			return 'breadthFirst';
		} else if (complexityLevel === 'medium') {
			// 中等複雜度：優先使用廣度優先搜索
			if (conditionCount > 10 || groupBindingCount > 5) {
				return 'breadthFirst';
			}
			// 中等規模但條件簡單：使用深度優先
			return 'depthFirst';
		} else {
			// 高複雜度：優先使用深度優先搜索
			if (studentCount > 50) {
				return 'depthFirst';
			}
			// 高複雜度但規模不大：使用廣度優先
			return 'breadthFirst';
		}
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
		this.logger.debug(`執行策略: ${strategy}`);

		switch (strategy) {
			case 'breadthFirst':
				return await this.breadthFirstSearch(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap,
					conflictChecker,
					backtrackAssignment
				);
			case 'depthFirst':
				return await this.depthFirstSearch(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap,
					conflictChecker,
					backtrackAssignment
				);
			case 'heuristic':
				return await this.heuristicSearch(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap,
					conflictChecker,
					backtrackAssignment
				);
			case 'backtrack':
				return await backtrackAssignment(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap
				);
			default:
				this.logger.warn(`未知策略: ${strategy}，使用回溯搜索`);
				return await backtrackAssignment(
					students,
					seats,
					conditions,
					studentScores,
					groupBindings,
					studentToConditionsMap
				);
		}
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
	 * 初始化混合搜索器
	 * @param {Object} options 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.currentAssignment.clear();
		this.performanceMetrics = {
			startTime: Date.now(),
			executionSteps: 0
		};
		this.logger.info('混合搜索器初始化完成');
	}

	/**
	 * 銷毀混合搜索器
	 */
	dispose() {
		this.currentAssignment.clear();
		this.logger.info('混合搜索器銷毀完成');
	}
}

module.exports = { HybridSearcher };
