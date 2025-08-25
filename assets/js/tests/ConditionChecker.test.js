// ConditionChecker.test.js - 條件檢查測試
import { ConflictChecker } from '../engines/ConflictChecker.js';

describe('ConditionChecker', () => {
	let checker;
	let mockAssignment;

	beforeEach(() => {
		checker = new ConflictChecker({
			enableCycleDetection: true,
			enableOptimization: true
		});

		mockAssignment = new Map();
		// 設置一些基本的座位分配
		mockAssignment.set(1, { row: 0, col: 0, groupId: 'A' });
		mockAssignment.set(2, { row: 0, col: 1, groupId: 'A' });
		mockAssignment.set(3, { row: 1, col: 0, groupId: 'B' });
		mockAssignment.set(4, { row: 1, col: 1, groupId: 'B' });
	});

	afterEach(() => {
		checker.dispose();
	});

	describe('testAdjacentConditions', () => {
		test('應該正確檢查相鄰條件', () => {
			const condition = {
				type: 'adjacent',
				students: [[1, 2]]
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true);
			expect(result.details).toBeDefined();
		});

		test('應該檢測不相鄰的學生', () => {
			const condition = {
				type: 'adjacent',
				students: [[1, 3]] // 學生1和3不相鄰
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false);
			expect(result.details).toBeDefined();
		});

		test('應該處理多組相鄰條件', () => {
			const condition = {
				type: 'adjacent',
				students: [[1, 2], [3, 4]]
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true);
			expect(result.details).toBeDefined();
		});

		test('應該處理對角線相鄰', () => {
			// 設置對角線相鄰的座位
			const diagonalAssignment = new Map();
			diagonalAssignment.set(1, { row: 0, col: 0, groupId: 'A' });
			diagonalAssignment.set(2, { row: 1, col: 1, groupId: 'A' });

			const condition = {
				type: 'adjacent',
				students: [[1, 2]]
			};

			const result = checker.checkCondition(condition, diagonalAssignment);

			expect(result.satisfied).toBe(true);
		});

		test('應該處理邊界相鄰', () => {
			// 設置邊界相鄰的座位
			const boundaryAssignment = new Map();
			boundaryAssignment.set(1, { row: 0, col: 0, groupId: 'A' });
			boundaryAssignment.set(2, { row: 0, col: 1, groupId: 'A' });

			const condition = {
				type: 'adjacent',
				students: [[1, 2]]
			};

			const result = checker.checkCondition(condition, boundaryAssignment);

			expect(result.satisfied).toBe(true);
		});

		test('應該處理不相鄰的條件', () => {
			const condition = {
				type: 'not_adjacent',
				students: [[1, 3]] // 學生1和3不應該相鄰
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true); // 1和3確實不相鄰
		});

		test('應該檢測違反不相鄰條件', () => {
			const condition = {
				type: 'not_adjacent',
				students: [[1, 2]] // 學生1和2不應該相鄰
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false); // 1和2確實相鄰
		});
	});

	describe('testGroupConditions', () => {
		test('應該正確檢查群組分配條件', () => {
			const condition = {
				type: 'assign_group',
				students: [[1, 2]],
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true);
			expect(result.details).toBeDefined();
		});

		test('應該檢測群組分配違規', () => {
			const condition = {
				type: 'assign_group',
				students: [[1, 3]], // 學生1在群組A，學生3在群組B
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false);
			expect(result.details).toBeDefined();
		});

		test('應該處理群組區域條件', () => {
			const condition = {
				type: 'group_area',
				students: [[1, 2]],
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true);
			expect(result.details).toBeDefined();
		});

		test('應該檢測群組區域違規', () => {
			const condition = {
				type: 'group_area',
				students: [[1, 3]], // 學生1在群組A，學生3在群組B
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false);
			expect(result.details).toBeDefined();
		});

		test('應該處理群組大小限制', () => {
			const condition = {
				type: 'group_size_limit',
				group: 'A',
				maxSize: 2
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true); // 群組A只有2個學生
		});

		test('應該檢測群組大小超限', () => {
			// 添加更多學生到群組A
			mockAssignment.set(5, { row: 2, col: 0, groupId: 'A' });
			mockAssignment.set(6, { row: 2, col: 1, groupId: 'A' });

			const condition = {
				type: 'group_size_limit',
				group: 'A',
				maxSize: 2
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false); // 群組A有4個學生，超過限制
		});

		test('應該處理群組平衡條件', () => {
			const condition = {
				type: 'group_balance',
				groups: ['A', 'B'],
				maxDifference: 1
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true); // 群組A和B各有2個學生
		});

		test('應該檢測群組不平衡', () => {
			// 添加更多學生到群組A
			mockAssignment.set(5, { row: 2, col: 0, groupId: 'A' });
			mockAssignment.set(6, { row: 2, col: 1, groupId: 'A' });

			const condition = {
				type: 'group_balance',
				groups: ['A', 'B'],
				maxDifference: 1
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false); // 群組A有4個學生，群組B有2個學生
		});
	});

	describe('testComplexConditions', () => {
		test('應該處理複合條件（相鄰+群組）', () => {
			const condition = {
				type: 'adjacent_and_group',
				students: [[1, 2]],
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(true);
			expect(result.details).toBeDefined();
		});

		test('應該檢測複合條件違規', () => {
			const condition = {
				type: 'adjacent_and_group',
				students: [[1, 3]], // 學生1和3不相鄰，且不在同一群組
				group: 'A'
			};

			const result = checker.checkCondition(condition, mockAssignment);

			expect(result.satisfied).toBe(false);
			expect(result.details).toBeDefined();
		});

		test('應該處理條件鏈', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]]
				},
				{
					type: 'assign_group',
					students: [[1, 2]],
					group: 'A'
				},
				{
					type: 'not_adjacent',
					students: [[1, 3]]
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.allSatisfied).toBe(true);
			expect(result.satisfiedCount).toBe(3);
			expect(result.totalCount).toBe(3);
		});

		test('應該檢測條件鏈中的違規', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]]
				},
				{
					type: 'assign_group',
					students: [[1, 3]], // 違規：學生1在群組A，學生3在群組B
					group: 'A'
				},
				{
					type: 'not_adjacent',
					students: [[1, 3]]
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.allSatisfied).toBe(false);
			expect(result.satisfiedCount).toBe(2);
			expect(result.totalCount).toBe(3);
		});

		test('應該處理條件優先級', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]],
					priority: 'high'
				},
				{
					type: 'assign_group',
					students: [[1, 2]],
					group: 'A',
					priority: 'medium'
				},
				{
					type: 'not_adjacent',
					students: [[1, 3]],
					priority: 'low'
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.allSatisfied).toBe(true);
			expect(result.priorityResults).toBeDefined();
		});

		test('應該處理條件依賴關係', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]],
					id: 'condition1'
				},
				{
					type: 'assign_group',
					students: [[1, 2]],
					group: 'A',
					id: 'condition2',
					dependsOn: 'condition1'
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.allSatisfied).toBe(true);
			expect(result.dependencyResults).toBeDefined();
		});

		test('應該處理循環依賴檢測', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]],
					id: 'condition1',
					dependsOn: 'condition2'
				},
				{
					type: 'assign_group',
					students: [[1, 2]],
					group: 'A',
					id: 'condition2',
					dependsOn: 'condition1'
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.hasCircularDependency).toBe(true);
			expect(result.circularDependencies).toBeDefined();
		});

		test('應該處理條件衝突檢測', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 2]]
				},
				{
					type: 'not_adjacent',
					students: [[1, 2]] // 與第一個條件衝突
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.hasConflicts).toBe(true);
			expect(result.conflicts).toBeDefined();
		});

		test('應該處理條件優化建議', () => {
			const conditions = [
				{
					type: 'adjacent',
					students: [[1, 3]] // 不相鄰
				},
				{
					type: 'assign_group',
					students: [[1, 3]], // 不同群組
					group: 'A'
				}
			];

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.optimizationSuggestions).toBeDefined();
			expect(result.optimizationSuggestions.length).toBeGreaterThan(0);
		});

		test('應該處理條件性能分析', () => {
			const conditions = Array.from({ length: 100 }, (_, i) => ({
				type: 'adjacent',
				students: [[i, i + 1]]
			}));

			const result = checker.checkAllConditions(conditions, mockAssignment);

			expect(result.performanceMetrics).toBeDefined();
			expect(result.performanceMetrics.executionTime).toBeDefined();
			expect(result.performanceMetrics.conditionCount).toBe(100);
		});

		test('應該處理條件驗證', () => {
			const invalidCondition = {
				type: 'invalid_type',
				students: [[1, 2]]
			};

			const result = checker.validateCondition(invalidCondition);

			expect(result.isValid).toBe(false);
			expect(result.errors).toBeDefined();
		});

		test('應該處理條件簡化', () => {
			const redundantConditions = [
				{
					type: 'adjacent',
					students: [[1, 2]]
				},
				{
					type: 'adjacent',
					students: [[2, 1]] // 重複條件
				}
			];

			const result = checker.simplifyConditions(redundantConditions);

			expect(result.simplifiedConditions.length).toBeLessThan(redundantConditions.length);
			expect(result.removedConditions).toBeDefined();
		});
	});
});
