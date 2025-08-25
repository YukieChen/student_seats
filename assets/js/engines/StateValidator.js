// StateValidator.js - 狀態驗證器
class StateValidator {
	constructor(options = {}) {
		this.options = {
			enableAutoRepair: options.enableAutoRepair !== false,
			enableDetailedDiagnosis: options.enableDetailedDiagnosis !== false,
			maxRepairAttempts: options.maxRepairAttempts || 10,
			...options
		};

		// 驗證配置
		this.VALIDATION_CONFIG = {
			CONSISTENCY_CHECKS: {
				DUPLICATE_ASSIGNMENTS: true,
				MISSING_STUDENTS: true,
				INVALID_SEATS: true,
				CONDITION_VIOLATIONS: true
			},
			COMPLETENESS_CHECKS: {
				ALL_STUDENTS_ASSIGNED: true,
				ALL_SEATS_USED: false, // 允許未使用的座位
				REQUIRED_CONDITIONS_MET: true
			},
			REPAIR_STRATEGIES: {
				REMOVE_DUPLICATES: true,
				FILL_MISSING: true,
				VALIDATE_SEATS: true,
				FIX_CONDITIONS: true
			}
		};

		this.validationHistory = [];
		this.repairHistory = [];
		this.diagnosisResults = [];
	}

	/**
	 * 主要驗證方法
	 */
	validate(students, seats, conditions, currentAssignment) {
		this.validationHistory = [];
		this.diagnosisResults = [];

		const validationResult = {
			isValid: true,
			issues: [],
			warnings: [],
			suggestions: []
		};

		// 執行一致性檢查
		const consistencyResult = this.checkConsistency(students, seats, conditions, currentAssignment);
		validationResult.issues.push(...consistencyResult.issues);
		validationResult.warnings.push(...consistencyResult.warnings);

		// 執行完整性檢查
		const completenessResult = this.checkCompleteness(students, seats, conditions, currentAssignment);
		validationResult.issues.push(...completenessResult.issues);
		validationResult.warnings.push(...completenessResult.warnings);

		// 如果有問題，嘗試自動修復
		if (validationResult.issues.length > 0 && this.options.enableAutoRepair) {
			const repairResult = this.repairState(validationResult.issues, students, seats, conditions, currentAssignment);
			validationResult.repaired = repairResult.success;
			validationResult.repairDescription = repairResult.description;
			validationResult.newAssignment = repairResult.newAssignment;
		}

		// 更新驗證狀態
		validationResult.isValid = validationResult.issues.length === 0;

		// 記錄驗證歷史
		this.recordValidation(validationResult);

		return validationResult;
	}

	/**
	 * 檢查一致性
	 */
	checkConsistency(students, seats, conditions, currentAssignment) {
		const result = {
			issues: [],
			warnings: []
		};

		// 檢查重複分配
		if (this.VALIDATION_CONFIG.CONSISTENCY_CHECKS.DUPLICATE_ASSIGNMENTS) {
			const duplicateResult = this.checkDuplicateAssignments(currentAssignment);
			result.issues.push(...duplicateResult.issues);
			result.warnings.push(...duplicateResult.warnings);
		}

		// 檢查缺失學生
		if (this.VALIDATION_CONFIG.CONSISTENCY_CHECKS.MISSING_STUDENTS) {
			const missingResult = this.checkMissingStudents(students, currentAssignment);
			result.issues.push(...missingResult.issues);
			result.warnings.push(...missingResult.warnings);
		}

		// 檢查無效座位
		if (this.VALIDATION_CONFIG.CONSISTENCY_CHECKS.INVALID_SEATS) {
			const invalidResult = this.checkInvalidSeats(seats, currentAssignment);
			result.issues.push(...invalidResult.issues);
			result.warnings.push(...invalidResult.warnings);
		}

		// 檢查條件違反
		if (this.VALIDATION_CONFIG.CONSISTENCY_CHECKS.CONDITION_VIOLATIONS) {
			const conditionResult = this.checkConditionViolations(conditions, currentAssignment);
			result.issues.push(...conditionResult.issues);
			result.warnings.push(...conditionResult.warnings);
		}

		return result;
	}

	/**
	 * 檢查完整性
	 */
	checkCompleteness(students, seats, conditions, currentAssignment) {
		const result = {
			issues: [],
			warnings: []
		};

		// 檢查所有學生是否都已分配
		if (this.VALIDATION_CONFIG.COMPLETENESS_CHECKS.ALL_STUDENTS_ASSIGNED) {
			const assignmentResult = this.checkAllStudentsAssigned(students, currentAssignment);
			result.issues.push(...assignmentResult.issues);
			result.warnings.push(...assignmentResult.warnings);
		}

		// 檢查所有座位是否都已使用
		if (this.VALIDATION_CONFIG.COMPLETENESS_CHECKS.ALL_SEATS_USED) {
			const seatResult = this.checkAllSeatsUsed(seats, currentAssignment);
			result.issues.push(...seatResult.issues);
			result.warnings.push(...seatResult.warnings);
		}

		// 檢查必需條件是否滿足
		if (this.VALIDATION_CONFIG.COMPLETENESS_CHECKS.REQUIRED_CONDITIONS_MET) {
			const conditionResult = this.checkRequiredConditionsMet(conditions, currentAssignment);
			result.issues.push(...conditionResult.issues);
			result.warnings.push(...conditionResult.warnings);
		}

		return result;
	}

	// ==================== 一致性檢查方法 ====================

	/**
	 * 檢查重複分配
	 */
	checkDuplicateAssignments(currentAssignment) {
		const result = { issues: [], warnings: [] };
		const seatUsage = new Map();
		const studentUsage = new Map();

		for (const [studentId, seat] of currentAssignment.entries()) {
			const seatKey = `${seat.row}-${seat.col}`;

			// 檢查座位重複使用
			if (seatUsage.has(seatKey)) {
				result.issues.push({
					type: 'DUPLICATE_SEAT',
					severity: 'ERROR',
					description: `座位 (${seat.row}, ${seat.col}) 被多個學生使用`,
					seat: { row: seat.row, col: seat.col },
					students: [seatUsage.get(seatKey), studentId]
				});
			} else {
				seatUsage.set(seatKey, studentId);
			}

			// 檢查學生重複分配
			if (studentUsage.has(studentId)) {
				result.issues.push({
					type: 'DUPLICATE_STUDENT',
					severity: 'ERROR',
					description: `學生 ${studentId} 被分配多次`,
					studentId,
					seats: [studentUsage.get(studentId), seat]
				});
			} else {
				studentUsage.set(studentId, seat);
			}
		}

		return result;
	}

	/**
	 * 檢查缺失學生
	 */
	checkMissingStudents(students, currentAssignment) {
		const result = { issues: [], warnings: [] };
		const assignedStudents = new Set(currentAssignment.keys());
		const missingStudents = [];

		for (const student of students) {
			if (!assignedStudents.has(student.id)) {
				missingStudents.push(student.id);
			}
		}

		if (missingStudents.length > 0) {
			result.issues.push({
				type: 'MISSING_STUDENTS',
				severity: 'WARNING',
				description: `${missingStudents.length} 個學生未被分配座位`,
				missingStudents
			});
		}

		return result;
	}

	/**
	 * 檢查無效座位
	 */
	checkInvalidSeats(seats, currentAssignment) {
		const result = { issues: [], warnings: [] };
		const validSeats = new Set();

		// 建立有效座位集合
		for (const seat of seats) {
			validSeats.add(`${seat.row}-${seat.col}`);
		}

		// 檢查分配中的無效座位
		for (const [studentId, seat] of currentAssignment.entries()) {
			const seatKey = `${seat.row}-${seat.col}`;
			if (!validSeats.has(seatKey)) {
				result.issues.push({
					type: 'INVALID_SEAT',
					severity: 'ERROR',
					description: `學生 ${studentId} 被分配到無效座位 (${seat.row}, ${seat.col})`,
					studentId,
					seat: { row: seat.row, col: seat.col }
				});
			}
		}

		return result;
	}

	/**
	 * 檢查條件違反
	 */
	checkConditionViolations(conditions, currentAssignment) {
		const result = { issues: [], warnings: [] };

		for (const condition of conditions) {
			const violation = this.checkSingleCondition(condition, currentAssignment);
			if (violation) {
				result.issues.push(violation);
			}
		}

		return result;
	}

	/**
	 * 檢查單個條件
	 */
	checkSingleCondition(condition, currentAssignment) {
		switch (condition.type) {
			case 'adjacent':
				return this.checkAdjacentCondition(condition, currentAssignment);
			case 'not_adjacent':
				return this.checkNotAdjacentCondition(condition, currentAssignment);
			case 'assign_group':
				return this.checkAssignGroupCondition(condition, currentAssignment);
			case 'group_area':
				return this.checkGroupAreaCondition(condition, currentAssignment);
			case 'adjacent_and_group':
				return this.checkAdjacentAndGroupCondition(condition, currentAssignment);
			case 'assign_seat':
				return this.checkAssignSeatCondition(condition, currentAssignment);
			default:
				return null;
		}
	}

	/**
	 * 檢查相鄰條件
	 */
	checkAdjacentCondition(condition, currentAssignment) {
		for (const pair of condition.students) {
			if (pair.length !== 2) continue;

			const [student1, student2] = pair;
			const seat1 = currentAssignment.get(student1);
			const seat2 = currentAssignment.get(student2);

			if (seat1 && seat2) {
				const rowDiff = Math.abs(seat1.row - seat2.row);
				const colDiff = Math.abs(seat1.col - seat2.col);
				const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);

				if (!isAdjacent) {
					return {
						type: 'ADJACENT_VIOLATION',
						severity: 'ERROR',
						description: `學生 ${student1} 和 ${student2} 應該相鄰但不相鄰`,
						condition,
						students: [student1, student2],
						seats: [seat1, seat2]
					};
				}
			}
		}

		return null;
	}

	/**
	 * 檢查不相鄰條件
	 */
	checkNotAdjacentCondition(condition, currentAssignment) {
		for (const pair of condition.students) {
			if (pair.length !== 2) continue;

			const [student1, student2] = pair;
			const seat1 = currentAssignment.get(student1);
			const seat2 = currentAssignment.get(student2);

			if (seat1 && seat2) {
				const rowDiff = Math.abs(seat1.row - seat2.row);
				const colDiff = Math.abs(seat1.col - seat2.col);
				const isAdjacent = rowDiff <= 1 && colDiff <= 1;

				if (isAdjacent) {
					return {
						type: 'NOT_ADJACENT_VIOLATION',
						severity: 'ERROR',
						description: `學生 ${student1} 和 ${student2} 不應該相鄰但相鄰了`,
						condition,
						students: [student1, student2],
						seats: [seat1, seat2]
					};
				}
			}
		}

		return null;
	}

	/**
	 * 檢查指定群組條件
	 */
	checkAssignGroupCondition(condition, currentAssignment) {
		for (const studentId of condition.students) {
			const seat = currentAssignment.get(studentId);
			if (seat && seat.groupId !== condition.group) {
				return {
					type: 'ASSIGN_GROUP_VIOLATION',
					severity: 'ERROR',
					description: `學生 ${studentId} 應該在群組 ${condition.group} 但實際在 ${seat.groupId}`,
					condition,
					studentId,
					expectedGroup: condition.group,
					actualGroup: seat.groupId
				};
			}
		}

		return null;
	}

	/**
	 * 檢查群組區域條件
	 */
	checkGroupAreaCondition(condition, currentAssignment) {
		const studentId = condition.students[0];
		const seat = currentAssignment.get(studentId);

		if (seat && seat.groupId !== condition.group) {
			return {
				type: 'GROUP_AREA_VIOLATION',
				severity: 'ERROR',
				description: `學生 ${studentId} 應該在群組區域 ${condition.group} 但實際在 ${seat.groupId}`,
				condition,
				studentId,
				expectedGroup: condition.group,
				actualGroup: seat.groupId
			};
		}

		return null;
	}

	/**
	 * 檢查相鄰且同群組條件
	 */
	checkAdjacentAndGroupCondition(condition, currentAssignment) {
		for (const pair of condition.students) {
			if (pair.length !== 2) continue;

			const [student1, student2] = pair;
			const seat1 = currentAssignment.get(student1);
			const seat2 = currentAssignment.get(student2);

			if (seat1 && seat2) {
				const rowDiff = Math.abs(seat1.row - seat2.row);
				const colDiff = Math.abs(seat1.col - seat2.col);
				const isAdjacent = (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
				const isInGroup = seat1.groupId === condition.group && seat2.groupId === condition.group;

				if (!isAdjacent || !isInGroup) {
					return {
						type: 'ADJACENT_AND_GROUP_VIOLATION',
						severity: 'ERROR',
						description: `學生 ${student1} 和 ${student2} 應該相鄰且在群組 ${condition.group} 內`,
						condition,
						students: [student1, student2],
						seats: [seat1, seat2],
						isAdjacent,
						isInGroup
					};
				}
			}
		}

		return null;
	}

	/**
	 * 檢查指定座位條件
	 */
	checkAssignSeatCondition(condition, currentAssignment) {
		const studentId = condition.students[0];
		const seat = currentAssignment.get(studentId);
		const targetSeat = condition.seat;

		if (seat && (seat.row !== targetSeat.row || seat.col !== targetSeat.col)) {
			return {
				type: 'ASSIGN_SEAT_VIOLATION',
				severity: 'ERROR',
				description: `學生 ${studentId} 應該坐在座位 (${targetSeat.row}, ${targetSeat.col}) 但實際坐在 (${seat.row}, ${seat.col})`,
				condition,
				studentId,
				expectedSeat: targetSeat,
				actualSeat: seat
			};
		}

		return null;
	}

	// ==================== 完整性檢查方法 ====================

	/**
	 * 檢查所有學生是否都已分配
	 */
	checkAllStudentsAssigned(students, currentAssignment) {
		const result = { issues: [], warnings: [] };
		const assignedStudents = new Set(currentAssignment.keys());
		const unassignedStudents = [];

		for (const student of students) {
			if (!assignedStudents.has(student.id)) {
				unassignedStudents.push(student.id);
			}
		}

		if (unassignedStudents.length > 0) {
			result.issues.push({
				type: 'UNASSIGNED_STUDENTS',
				severity: 'WARNING',
				description: `${unassignedStudents.length} 個學生未被分配座位`,
				unassignedStudents
			});
		}

		return result;
	}

	/**
	 * 檢查所有座位是否都已使用
	 */
	checkAllSeatsUsed(seats, currentAssignment) {
		const result = { issues: [], warnings: [] };
		const usedSeats = new Set();

		for (const seat of currentAssignment.values()) {
			usedSeats.add(`${seat.row}-${seat.col}`);
		}

		const unusedSeats = [];
		for (const seat of seats) {
			if (!usedSeats.has(`${seat.row}-${seat.col}`)) {
				unusedSeats.push({ row: seat.row, col: seat.col });
			}
		}

		if (unusedSeats.length > 0) {
			result.warnings.push({
				type: 'UNUSED_SEATS',
				severity: 'INFO',
				description: `${unusedSeats.length} 個座位未被使用`,
				unusedSeats
			});
		}

		return result;
	}

	/**
	 * 檢查必需條件是否滿足
	 */
	checkRequiredConditionsMet(conditions, currentAssignment) {
		const result = { issues: [], warnings: [] };
		const requiredConditions = conditions.filter(condition => condition.required === true);

		for (const condition of requiredConditions) {
			const violation = this.checkSingleCondition(condition, currentAssignment);
			if (violation) {
				result.issues.push({
					...violation,
					type: 'REQUIRED_CONDITION_VIOLATION',
					description: `必需條件違反: ${violation.description}`
				});
			}
		}

		return result;
	}

	// ==================== 自動修復機制 ====================

	/**
	 * 修復狀態
	 */
	repairState(issues, students, seats, conditions, currentAssignment) {
		this.repairHistory = [];
		let newAssignment = new Map(currentAssignment);
		let repairAttempts = 0;

		for (const issue of issues) {
			if (repairAttempts >= this.options.maxRepairAttempts) {
				break;
			}

			const repairResult = this.repairIssue(issue, students, seats, conditions, newAssignment);
			if (repairResult.success) {
				newAssignment = repairResult.newAssignment;
				this.repairHistory.push({
					issue: issue.type,
					success: true,
					description: repairResult.description
				});
			} else {
				this.repairHistory.push({
					issue: issue.type,
					success: false,
					description: repairResult.description
				});
			}

			repairAttempts++;
		}

		return {
			success: this.repairHistory.some(r => r.success),
			newAssignment,
			description: `嘗試修復 ${this.repairHistory.length} 個問題，成功 ${this.repairHistory.filter(r => r.success).length} 個`,
			repairHistory: this.repairHistory
		};
	}

	/**
	 * 修復單個問題
	 */
	repairIssue(issue, students, seats, conditions, currentAssignment) {
		switch (issue.type) {
			case 'DUPLICATE_SEAT':
				return this.repairDuplicateSeat(issue, students, seats, conditions, currentAssignment);
			case 'DUPLICATE_STUDENT':
				return this.repairDuplicateStudent(issue, students, seats, conditions, currentAssignment);
			case 'INVALID_SEAT':
				return this.repairInvalidSeat(issue, students, seats, conditions, currentAssignment);
			case 'UNASSIGNED_STUDENTS':
				return this.repairUnassignedStudents(issue, students, seats, conditions, currentAssignment);
			default:
				return { success: false, newAssignment: currentAssignment, description: '不支援的問題類型' };
		}
	}

	/**
	 * 修復重複座位
	 */
	repairDuplicateSeat(issue, students, seats, conditions, currentAssignment) {
		const newAssignment = new Map(currentAssignment);
		const [student1, student2] = issue.students;

		// 移除第二個學生的分配
		newAssignment.delete(student2);

		return {
			success: true,
			newAssignment,
			description: `移除學生 ${student2} 的重複分配`
		};
	}

	/**
	 * 修復重複學生
	 */
	repairDuplicateStudent(issue, students, seats, conditions, currentAssignment) {
		const newAssignment = new Map(currentAssignment);
		const [seat1, seat2] = issue.seats;

		// 保留第一個座位分配，移除第二個
		const studentId = issue.studentId;
		newAssignment.set(studentId, seat1);

		return {
			success: true,
			newAssignment,
			description: `保留學生 ${studentId} 的第一個座位分配`
		};
	}

	/**
	 * 修復無效座位
	 */
	repairInvalidSeat(issue, students, seats, conditions, currentAssignment) {
		const newAssignment = new Map(currentAssignment);
		const studentId = issue.studentId;

		// 移除無效分配
		newAssignment.delete(studentId);

		return {
			success: true,
			newAssignment,
			description: `移除學生 ${studentId} 的無效座位分配`
		};
	}

	/**
	 * 修復未分配學生
	 */
	repairUnassignedStudents(issue, students, seats, conditions, currentAssignment) {
		const newAssignment = new Map(currentAssignment);
		const availableSeats = this.getAvailableSeats(seats, newAssignment);

		for (const studentId of issue.unassignedStudents) {
			if (availableSeats.length > 0) {
				const seat = availableSeats.shift();
				newAssignment.set(studentId, seat);
			}
		}

		return {
			success: issue.unassignedStudents.length <= availableSeats.length,
			newAssignment,
			description: `嘗試為 ${issue.unassignedStudents.length} 個未分配學生分配座位`
		};
	}

	// ==================== 詳細診斷 ====================

	/**
	 * 診斷問題
	 */
	diagnoseProblems(students, seats, conditions, currentAssignment) {
		if (!this.options.enableDetailedDiagnosis) {
			return { problems: [], suggestions: [] };
		}

		const problems = this.identifyProblems(students, seats, conditions, currentAssignment);
		const suggestions = this.generateSolutions(problems, students, seats, conditions);

		this.diagnosisResults = {
			problems,
			suggestions,
			timestamp: new Date().toISOString()
		};

		return this.diagnosisResults;
	}

	/**
	 * 識別問題
	 */
	identifyProblems(students, seats, conditions, currentAssignment) {
		const problems = [];

		// 分析分配模式
		const assignmentPattern = this.analyzeAssignmentPattern(currentAssignment);
		if (assignmentPattern.hasClusters) {
			problems.push({
				type: 'CLUSTERING',
				severity: 'MEDIUM',
				description: '檢測到學生分配聚集現象',
				details: assignmentPattern
			});
		}

		// 分析條件滿足度
		const conditionSatisfaction = this.analyzeConditionSatisfaction(conditions, currentAssignment);
		if (conditionSatisfaction.unsatisfiedCount > 0) {
			problems.push({
				type: 'CONDITION_SATISFACTION',
				severity: 'HIGH',
				description: `${conditionSatisfaction.unsatisfiedCount} 個條件未滿足`,
				details: conditionSatisfaction
			});
		}

		return problems;
	}

	/**
	 * 生成解決方案
	 */
	generateSolutions(problems, students, seats, conditions) {
		const suggestions = [];

		for (const problem of problems) {
			switch (problem.type) {
				case 'CLUSTERING':
					suggestions.push({
						problem: problem.type,
						suggestion: '考慮調整分配算法以避免聚集現象',
						priority: 'MEDIUM'
					});
					break;
				case 'CONDITION_SATISFACTION':
					suggestions.push({
						problem: problem.type,
						suggestion: '檢查條件定義是否合理，考慮放寬部分條件',
						priority: 'HIGH'
					});
					break;
			}
		}

		return suggestions;
	}

	// ==================== 輔助方法 ====================

	/**
	 * 記錄驗證
	 */
	recordValidation(result) {
		this.validationHistory.push({
			timestamp: new Date().toISOString(),
			result,
			issueCount: result.issues.length,
			warningCount: result.warnings.length
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
	 * 分析分配模式
	 */
	analyzeAssignmentPattern(currentAssignment) {
		const seats = Array.from(currentAssignment.values());
		const rows = seats.map(s => s.row);
		const cols = seats.map(s => s.col);

		// 簡單的聚集檢測
		const rowVariance = this.calculateVariance(rows);
		const colVariance = this.calculateVariance(cols);

		return {
			hasClusters: rowVariance < 2 || colVariance < 2,
			rowVariance,
			colVariance,
			totalAssignments: seats.length
		};
	}

	/**
	 * 分析條件滿足度
	 */
	analyzeConditionSatisfaction(conditions, currentAssignment) {
		let satisfiedCount = 0;
		let unsatisfiedCount = 0;
		const unsatisfiedConditions = [];

		for (const condition of conditions) {
			const violation = this.checkSingleCondition(condition, currentAssignment);
			if (violation) {
				unsatisfiedCount++;
				unsatisfiedConditions.push(condition);
			} else {
				satisfiedCount++;
			}
		}

		return {
			satisfiedCount,
			unsatisfiedCount,
			satisfactionRate: satisfiedCount / conditions.length,
			unsatisfiedConditions
		};
	}

	/**
	 * 計算方差
	 */
	calculateVariance(values) {
		if (values.length === 0) return 0;

		const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
		const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
		const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;

		return variance;
	}

	/**
	 * 獲取驗證歷史
	 */
	getValidationHistory() {
		return this.validationHistory;
	}

	/**
	 * 獲取修復歷史
	 */
	getRepairHistory() {
		return this.repairHistory;
	}

	/**
	 * 獲取診斷結果
	 */
	getDiagnosisResults() {
		return this.diagnosisResults;
	}

	/**
	 * 清除歷史記錄
	 */
	clearHistory() {
		this.validationHistory = [];
		this.repairHistory = [];
		this.diagnosisResults = [];
	}
}

module.exports = { StateValidator };
