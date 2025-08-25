// ConditionProcessor.js - 條件預處理器
const { Logger } = require('./Logger.js');

class ConditionProcessor {
	constructor(options = {}) {
		this.logger = new Logger(options.logLevel || 'INFO');
		this.options = {
			enableDetailedLogging: options.enableDetailedLogging !== false,
			maxProcessingTime: options.maxProcessingTime || 5000,
			...options
		};

		this.students = [];
		this.seats = [];
		this.conditions = [];
		this.processedConditions = [];
		this.processingStats = {
			totalConditions: 0,
			simplifiedConditions: 0,
			mergedConditions: 0,
			decomposedConditions: 0,
			validatedConditions: 0,
			processingTime: 0
		};
	}

	/**
	 * 初始化條件預處理器
	 */
	initialize(students, seats, conditions) {
		this.students = students || [];
		this.seats = seats || [];
		this.conditions = conditions || [];
		this.processedConditions = [];

		// 重置統計
		this.processingStats = {
			totalConditions: this.conditions.length,
			simplifiedConditions: 0,
			mergedConditions: 0,
			decomposedConditions: 0,
			validatedConditions: 0,
			processingTime: 0
		};

		this.logger.log('INFO', 'ConditionProcessor', '條件預處理器初始化完成', {
			studentCount: this.students.length,
			seatCount: this.seats.length,
			conditionCount: this.conditions.length
		});

		return this;
	}

	/**
	 * 執行完整的條件預處理
	 */
	preprocessConditions() {
		const startTime = Date.now();

		try {
			this.logger.log('INFO', 'ConditionProcessor', '開始條件預處理');

			// 1. 條件簡化
			const simplified = this.simplifyConditions();
			this.processingStats.simplifiedConditions = simplified.length;

			// 2. 條件合併
			const merged = this.mergeConditions(simplified);
			this.processingStats.mergedConditions = merged.length;

			// 3. 條件分解
			const decomposed = this.decomposeConditions(merged);
			this.processingStats.decomposedConditions = decomposed.length;

			// 4. 條件驗證
			const validated = this.validateConditions(decomposed);
			this.processingStats.validatedConditions = validated.length;

			this.processedConditions = validated;
			this.processingStats.processingTime = Date.now() - startTime;

			this.logger.log('INFO', 'ConditionProcessor', '條件預處理完成', {
				originalCount: this.conditions.length,
				finalCount: this.processedConditions.length,
				processingTime: this.processingStats.processingTime,
				stats: this.processingStats
			});

			return this.processedConditions;

		} catch (error) {
			this.logger.log('ERROR', 'ConditionProcessor', '條件預處理失敗', { error: error.message });
			throw error;
		}
	}

	/**
	 * 條件簡化
	 */
	simplifyConditions() {
		const simplified = [];

		for (const condition of this.conditions) {
			const simplifiedCondition = this.simplifySingleCondition(condition);
			if (simplifiedCondition) {
				simplified.push(simplifiedCondition);
			}
		}

		return simplified;
	}

	/**
	 * 簡化單個條件
	 */
	simplifySingleCondition(condition) {
		switch (condition.type) {
			case 'adjacent':
				return this.simplifyAdjacentCondition(condition);
			case 'assign_group':
				return this.simplifyAssignGroupCondition(condition);
			case 'group_area':
				return this.simplifyGroupAreaCondition(condition);
			case 'not_adjacent':
				return this.simplifyNotAdjacentCondition(condition);
			case 'assign_seat':
				return this.simplifyAssignSeatCondition(condition);
			default:
				return condition;
		}
	}

	/**
	 * 簡化相鄰條件
	 */
	simplifyAdjacentCondition(condition) {
		// 移除不存在的學生
		const validStudents = condition.students.filter(pair =>
			pair.every(studentId =>
				this.students.some(s => s.id === studentId)
			)
		);

		if (validStudents.length === 0) return null;

		return {
			...condition,
			students: validStudents
		};
	}

	/**
	 * 簡化分配群組條件
	 */
	simplifyAssignGroupCondition(condition) {
		// 移除不存在的學生
		const validStudents = condition.students.filter(studentId =>
			this.students.some(s => s.id === studentId)
		);

		if (validStudents.length === 0) return null;

		return {
			...condition,
			students: validStudents
		};
	}

	/**
	 * 簡化群組區域條件
	 */
	simplifyGroupAreaCondition(condition) {
		// 檢查群組是否存在
		const validGroups = condition.groups.filter(groupId =>
			this.seats.some(seat => seat.groupId === groupId)
		);

		if (validGroups.length === 0) return null;

		return {
			...condition,
			groups: validGroups
		};
	}

	/**
	 * 簡化不相鄰條件
	 */
	simplifyNotAdjacentCondition(condition) {
		// 移除不存在的學生
		const validStudents = condition.students.filter(pair =>
			pair.every(studentId =>
				this.students.some(s => s.id === studentId)
			)
		);

		if (validStudents.length === 0) return null;

		return {
			...condition,
			students: validStudents
		};
	}

	/**
	 * 簡化分配座位條件
	 */
	simplifyAssignSeatCondition(condition) {
		// 檢查學生是否存在
		if (!this.students.some(s => s.id === condition.studentId)) {
			return null;
		}

		// 檢查座位是否存在
		if (!this.seats.some(seat => seat.row === condition.seat.row && seat.col === condition.seat.col)) {
			return null;
		}

		return condition;
	}

	/**
	 * 條件合併
	 */
	mergeConditions(conditions) {
		const merged = [];
		const processed = new Set();

		for (let i = 0; i < conditions.length; i++) {
			if (processed.has(i)) continue;

			const mergeGroup = [conditions[i]];
			processed.add(i);

			// 尋找可以合併的條件
			for (let j = i + 1; j < conditions.length; j++) {
				if (processed.has(j)) continue;

				if (this.canMergeConditions(conditions[i], conditions[j])) {
					mergeGroup.push(conditions[j]);
					processed.add(j);
				}
			}

			// 合併條件組
			const mergedCondition = this.mergeConditionGroup(mergeGroup);
			if (mergedCondition) {
				merged.push(mergedCondition);
			}
		}

		return merged;
	}

	/**
	 * 檢查兩個條件是否可以合併
	 */
	canMergeConditions(condition1, condition2) {
		// 相同類型的條件可以合併
		if (condition1.type !== condition2.type) return false;

		// 檢查是否有重疊的學生
		const students1 = this.extractStudentsFromCondition(condition1);
		const students2 = this.extractStudentsFromCondition(condition2);

		const intersection = students1.filter(s => students2.includes(s));
		return intersection.length > 0;
	}

	/**
	 * 從條件中提取學生ID
	 */
	extractStudentsFromCondition(condition) {
		switch (condition.type) {
			case 'adjacent':
			case 'not_adjacent':
				return condition.students.flat();
			case 'assign_group':
				return condition.students;
			case 'assign_seat':
				return [condition.studentId];
			default:
				return [];
		}
	}

	/**
	 * 合併條件組
	 */
	mergeConditionGroup(conditions) {
		if (conditions.length === 1) return conditions[0];

		const firstCondition = conditions[0];
		const merged = { ...firstCondition };

		switch (firstCondition.type) {
			case 'adjacent':
			case 'not_adjacent':
				merged.students = conditions.reduce((acc, c) => [...acc, ...c.students], []);
				break;
			case 'assign_group':
				merged.students = conditions.reduce((acc, c) => [...acc, ...c.students], []);
				break;
			case 'group_area':
				merged.groups = conditions.reduce((acc, c) => [...acc, ...c.groups], []);
				break;
		}

		return merged;
	}

	/**
	 * 條件分解
	 */
	decomposeConditions(conditions) {
		const decomposed = [];

		for (const condition of conditions) {
			const decomposedConditions = this.decomposeSingleCondition(condition);
			decomposed.push(...decomposedConditions);
		}

		return decomposed;
	}

	/**
	 * 分解單個條件
	 */
	decomposeSingleCondition(condition) {
		// 複雜條件可以分解為多個簡單條件
		switch (condition.type) {
			case 'adjacent_and_group':
				return this.decomposeAdjacentAndGroupCondition(condition);
			case 'complex_condition':
				return this.decomposeComplexCondition(condition);
			default:
				return [condition];
		}
	}

	/**
	 * 分解相鄰且群組條件
	 */
	decomposeAdjacentAndGroupCondition(condition) {
		const decomposed = [];

		// 分解為相鄰條件
		if (condition.adjacentStudents) {
			decomposed.push({
				type: 'adjacent',
				students: condition.adjacentStudents,
				description: condition.description + ' (相鄰部分)'
			});
		}

		// 分解為群組條件
		if (condition.groupStudents) {
			decomposed.push({
				type: 'assign_group',
				students: condition.groupStudents,
				description: condition.description + ' (群組部分)'
			});
		}

		return decomposed;
	}

	/**
	 * 分解複雜條件
	 */
	decomposeComplexCondition(condition) {
		const decomposed = [];

		// 根據複雜條件的結構進行分解
		if (condition.subConditions) {
			for (const subCondition of condition.subConditions) {
				decomposed.push({
					...subCondition,
					parentConditionId: condition.id
				});
			}
		}

		return decomposed.length > 0 ? decomposed : [condition];
	}

	/**
	 * 條件驗證
	 */
	validateConditions(conditions) {
		const validated = [];
		const validationErrors = [];

		for (const condition of conditions) {
			const validationResult = this.validateSingleCondition(condition);

			if (validationResult.isValid) {
				validated.push(condition);
			} else {
				validationErrors.push({
					condition,
					errors: validationResult.errors
				});
			}
		}

		if (validationErrors.length > 0) {
			this.logger.log('WARN', 'ConditionProcessor', '條件驗證發現錯誤', {
				errorCount: validationErrors.length,
				errors: validationErrors
			});
		}

		return validated;
	}

	/**
	 * 驗證單個條件
	 */
	validateSingleCondition(condition) {
		const errors = [];

		// 檢查必要字段
		if (!condition.type) {
			errors.push('缺少條件類型');
		}

		if (!condition.id) {
			errors.push('缺少條件ID');
		}

		// 根據類型檢查特定字段
		switch (condition.type) {
			case 'adjacent':
			case 'not_adjacent':
				if (!condition.students || !Array.isArray(condition.students)) {
					errors.push('相鄰條件缺少學生列表');
				}
				break;
			case 'assign_group':
				if (!condition.students || !Array.isArray(condition.students)) {
					errors.push('群組條件缺少學生列表');
				}
				break;
			case 'group_area':
				if (!condition.groups || !Array.isArray(condition.groups)) {
					errors.push('群組區域條件缺少群組列表');
				}
				break;
			case 'assign_seat':
				if (!condition.studentId) {
					errors.push('分配座位條件缺少學生ID');
				}
				if (!condition.seat) {
					errors.push('分配座位條件缺少座位信息');
				}
				break;
		}

		return {
			isValid: errors.length === 0,
			errors
		};
	}

	/**
	 * 獲取處理統計
	 */
	getProcessingStats() {
		return { ...this.processingStats };
	}

	/**
	 * 獲取處理後的條件
	 */
	getProcessedConditions() {
		return [...this.processedConditions];
	}

	/**
	 * 清理資源
	 */
	dispose() {
		this.students = [];
		this.seats = [];
		this.conditions = [];
		this.processedConditions = [];
		this.processingStats = {
			totalConditions: 0,
			simplifiedConditions: 0,
			mergedConditions: 0,
			decomposedConditions: 0,
			validatedConditions: 0,
			processingTime: 0
		};
	}
}

module.exports = { ConditionProcessor };
