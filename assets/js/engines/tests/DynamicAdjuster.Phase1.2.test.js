/**
 * DynamicAdjuster Phase 1.2 測試
 * 測試優先級優化、全局優化和調整效果評估功能
 */

const { DynamicAdjuster } = require('../DynamicAdjuster.js');

describe('DynamicAdjuster Phase 1.2 測試', () => {
	let adjuster;
	let mockStudents;
	let mockSeats;
	let mockConditions;
	let mockAssignment;

	beforeEach(() => {
		adjuster = new DynamicAdjuster();

		// 模擬數據
		mockStudents = [
			{ id: 'S1', name: '學生1', priority: 5, grade: 85, specialNeeds: false },
			{ id: 'S2', name: '學生2', priority: 3, grade: 90, specialNeeds: true },
			{ id: 'S3', name: '學生3', priority: 7, grade: 78, specialNeeds: false },
			{ id: 'S4', name: '學生4', priority: 2, grade: 92, specialNeeds: false }
		];

		mockSeats = [
			{ row: 1, col: 1, type: 'premium', groupId: 'G1' },
			{ row: 1, col: 2, type: 'standard', groupId: 'G1' },
			{ row: 2, col: 1, type: 'standard', groupId: 'G2' },
			{ row: 2, col: 2, type: 'standard', groupId: 'G2' }
		];

		mockConditions = [
			{ type: 'ADJACENT', students: ['S1', 'S2'], urgent: false },
			{ type: 'GROUP', students: ['S3', 'S4'], urgent: true },
			{ type: 'DISTANCE', students: ['S1'], urgent: false }
		];

		mockAssignment = new Map([
			['S1', { row: 1, col: 1, type: 'premium', groupId: 'G1' }],
			['S2', { row: 1, col: 2, type: 'standard', groupId: 'G1' }]
		]);
	});

	describe('優先級優化功能測試', () => {
		test('calculatePriority - 學生優先級計算', () => {
			const student = mockStudents[0];
			const priority = adjuster.calculatePriority(
				student, 'student', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(priority).toBeGreaterThan(0);
			expect(priority).toBeLessThanOrEqual(100);
			expect(typeof priority).toBe('number');
		});

		test('calculatePriority - 座位優先級計算', () => {
			const seat = mockSeats[0];
			const priority = adjuster.calculatePriority(
				seat, 'seat', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(priority).toBeGreaterThan(0);
			expect(priority).toBeLessThanOrEqual(100);
			expect(typeof priority).toBe('number');
		});

		test('calculatePriority - 條件優先級計算', () => {
			const condition = mockConditions[0];
			const priority = adjuster.calculatePriority(
				condition, 'condition', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(priority).toBeGreaterThan(0);
			expect(priority).toBeLessThanOrEqual(100);
			expect(typeof priority).toBe('number');
		});

		test('sortByPriority - 學生按優先級排序', () => {
			const sortedStudents = adjuster.sortByPriority(
				mockStudents, 'student', mockAssignment, mockStudents, mockSeats, mockConditions, 'desc'
			);

			expect(sortedStudents).toHaveLength(mockStudents.length);
			expect(Array.isArray(sortedStudents)).toBe(true);
		});

		test('adjustPriority - 動態優先級調整', () => {
			const student = mockStudents[0];
			const basePriority = 50;
			const adjustedPriority = adjuster.adjustPriority(
				student, 'student', basePriority, mockAssignment
			);

			expect(adjustedPriority).toBeGreaterThan(0);
			expect(adjustedPriority).toBeLessThanOrEqual(100);
			expect(typeof adjustedPriority).toBe('number');
		});

		test('resolvePriorityConflict - 優先級衝突解決', () => {
			const conflictingStudents = [mockStudents[0], mockStudents[1]];
			const result = adjuster.resolvePriorityConflict(
				conflictingStudents, 'student', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(result).toHaveProperty('resolved');
			expect(result).toHaveProperty('selectedItem');
			expect(result).toHaveProperty('resolutionMethod');
			expect(result).toHaveProperty('reason');
		});
	});

	describe('全局優化功能測試', () => {
		test('evaluateGlobalState - 全局狀態評估', () => {
			const evaluation = adjuster.evaluateGlobalState(
				mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(evaluation).toHaveProperty('overallScore');
			expect(evaluation).toHaveProperty('assignmentRate');
			expect(evaluation).toHaveProperty('conditionSatisfaction');
			expect(evaluation).toHaveProperty('studentSatisfaction');
			expect(evaluation).toHaveProperty('seatUtilization');
			expect(evaluation).toHaveProperty('conflictCount');
			expect(evaluation).toHaveProperty('optimizationPotential');
			expect(evaluation).toHaveProperty('details');
		});

		test('globalOptimization - 全局優化算法', () => {
			const options = {
				maxIterations: 10,
				improvementThreshold: 0.01,
				timeLimit: 5000
			};

			const result = adjuster.globalOptimization(
				mockAssignment, mockStudents, mockSeats, mockConditions, options
			);

			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('improvedAssignment');
			expect(result).toHaveProperty('initialScore');
			expect(result).toHaveProperty('finalScore');
			expect(result).toHaveProperty('improvement');
			expect(result).toHaveProperty('iterations');
			expect(result).toHaveProperty('executionTime');
			expect(result).toHaveProperty('convergenceReached');
			expect(result).toHaveProperty('localOptimaAvoided');
			expect(result).toHaveProperty('optimizationHistory');
			expect(result).toHaveProperty('details');
		});

		test('avoidLocalOptima - 局部最優避免', () => {
			const result = adjuster.avoidLocalOptima(
				mockAssignment, mockStudents, mockSeats, mockConditions, 5
			);

			expect(result).toHaveProperty('success');
			expect(result).toHaveProperty('newAssignment');
			expect(result).toHaveProperty('strategy');
			expect(result).toHaveProperty('perturbation');
			expect(result).toHaveProperty('details');
		});

		test('checkGlobalConvergence - 全局收斂檢查', () => {
			const mockHistory = [
				{ iteration: 1, score: 0.8, improvement: 0.1, strategy: 'swap' },
				{ iteration: 2, score: 0.82, improvement: 0.02, strategy: 'swap' },
				{ iteration: 3, score: 0.83, improvement: 0.01, strategy: 'swap' }
			];

			const result = adjuster.checkGlobalConvergence(mockHistory, 3);

			expect(result).toHaveProperty('converged');
			expect(result).toHaveProperty('convergenceType');
			expect(result).toHaveProperty('confidence');
			expect(result).toHaveProperty('details');
		});
	});

	describe('調整效果評估功能測試', () => {
		test('measureAdjustmentEffect - 調整效果測量', () => {
			const newAssignment = new Map([
				['S1', { row: 2, col: 1, type: 'standard', groupId: 'G2' }],
				['S2', { row: 2, col: 2, type: 'standard', groupId: 'G2' }]
			]);

			const adjustmentDetails = {
				strategy: 'swap',
				executionTime: 100,
				attempts: 3
			};

			const measurement = adjuster.measureAdjustmentEffect(
				mockAssignment, newAssignment, mockStudents, mockSeats, mockConditions, adjustmentDetails
			);

			expect(measurement).toHaveProperty('overallEffect');
			expect(measurement).toHaveProperty('assignmentEffect');
			expect(measurement).toHaveProperty('conditionEffect');
			expect(measurement).toHaveProperty('studentSatisfactionEffect');
			expect(measurement).toHaveProperty('conflictResolutionEffect');
			expect(measurement).toHaveProperty('performanceMetrics');
			expect(measurement).toHaveProperty('details');
		});

		test('predictAdjustmentEffect - 效果預測', () => {
			const proposedAdjustment = {
				type: 'swap',
				student1: 'S1',
				student2: 'S2'
			};

			const prediction = adjuster.predictAdjustmentEffect(
				mockAssignment, mockStudents, mockSeats, mockConditions, proposedAdjustment
			);

			expect(prediction).toHaveProperty('expectedEffect');
			expect(prediction).toHaveProperty('confidence');
			expect(prediction).toHaveProperty('riskLevel');
			expect(prediction).toHaveProperty('successProbability');
			expect(prediction).toHaveProperty('potentialBenefits');
			expect(prediction).toHaveProperty('potentialRisks');
			expect(prediction).toHaveProperty('recommendations');
		});

		test('compareAdjustmentEffects - 效果比較', () => {
			const adjustmentStrategies = [
				{ name: '策略1', type: 'swap', student1: 'S1', student2: 'S2' },
				{ name: '策略2', type: 'reassignment', student: 'S1', newSeat: { row: 2, col: 1 } },
				{ name: '策略3', type: 'removal', student: 'S1' }
			];

			const comparison = adjuster.compareAdjustmentEffects(
				adjustmentStrategies, mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(comparison).toHaveProperty('bestStrategy');
			expect(comparison).toHaveProperty('rankedStrategies');
			expect(comparison).toHaveProperty('comparisonMatrix');
			expect(comparison).toHaveProperty('recommendations');
			expect(comparison).toHaveProperty('details');
		});

		test('reportAdjustmentEffect - 效果報告', () => {
			const adjustmentResult = {
				success: true,
				improvedAssignment: new Map([
					['S1', { row: 2, col: 1, type: 'standard', groupId: 'G2' }],
					['S2', { row: 2, col: 2, type: 'standard', groupId: 'G2' }]
				]),
				improvement: 0.1,
				executionTime: 150,
				attempts: 5,
				strategy: 'swap'
			};

			const report = adjuster.reportAdjustmentEffect(
				adjustmentResult, mockStudents, mockSeats, mockConditions
			);

			expect(report).toHaveProperty('summary');
			expect(report).toHaveProperty('detailedAnalysis');
			expect(report).toHaveProperty('performanceMetrics');
			expect(report).toHaveProperty('recommendations');
			expect(report).toHaveProperty('timestamp');
			expect(report).toHaveProperty('metadata');
		});
	});

	describe('輔助方法測試', () => {
		test('getItemPriority - 獲取項目優先級', () => {
			const student = mockStudents[0];
			const priorityInfo = adjuster.getItemPriority(
				student, 'student', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(priorityInfo).toHaveProperty('item');
			expect(priorityInfo).toHaveProperty('itemType');
			expect(priorityInfo).toHaveProperty('basePriority');
			expect(priorityInfo).toHaveProperty('adjustedPriority');
			expect(priorityInfo).toHaveProperty('adjustments');
		});

		test('batchCalculatePriority - 批量計算優先級', () => {
			const priorityList = adjuster.batchCalculatePriority(
				mockStudents, 'student', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(Array.isArray(priorityList)).toBe(true);
			expect(priorityList).toHaveLength(mockStudents.length);
			priorityList.forEach(item => {
				expect(item).toHaveProperty('item');
				expect(item).toHaveProperty('basePriority');
				expect(item).toHaveProperty('adjustedPriority');
			});
		});

		test('getPriorityStatistics - 獲取優先級統計', () => {
			const statistics = adjuster.getPriorityStatistics(
				mockStudents, 'student', mockAssignment, mockStudents, mockSeats, mockConditions
			);

			expect(statistics).toHaveProperty('count');
			expect(statistics).toHaveProperty('average');
			expect(statistics).toHaveProperty('min');
			expect(statistics).toHaveProperty('max');
			expect(statistics).toHaveProperty('median');
			expect(statistics).toHaveProperty('variance');
		});
	});

	describe('錯誤處理測試', () => {
		test('空數據處理', () => {
			const emptyStudents = [];
			const emptySeats = [];
			const emptyConditions = [];
			const emptyAssignment = new Map();

			// 測試優先級計算
			const priority = adjuster.calculatePriority(
				null, 'student', emptyAssignment, emptyStudents, emptySeats, emptyConditions
			);
			expect(priority).toBe(0);

			// 測試排序
			const sorted = adjuster.sortByPriority(
				emptyStudents, 'student', emptyAssignment, emptyStudents, emptySeats, emptyConditions
			);
			expect(sorted).toEqual(emptyStudents);

			// 測試衝突解決
			const conflictResult = adjuster.resolvePriorityConflict(
				emptyStudents, 'student', emptyAssignment, emptyStudents, emptySeats, emptyConditions
			);
			expect(conflictResult.resolved).toBe(false);
		});

		test('無效參數處理', () => {
			// 測試無效的項目類型
			const priority = adjuster.calculatePriority(
				mockStudents[0], 'invalid_type', mockAssignment, mockStudents, mockSeats, mockConditions
			);
			expect(priority).toBe(0);

			// 測試無效的排序順序
			const sorted = adjuster.sortByPriority(
				mockStudents, 'student', mockAssignment, mockStudents, mockSeats, mockConditions, 'invalid_order'
			);
			expect(Array.isArray(sorted)).toBe(true);
		});
	});

	describe('性能測試', () => {
		test('大數據集處理', () => {
			// 創建大量測試數據
			const largeStudents = Array.from({ length: 100 }, (_, i) => ({
				id: `S${i + 1}`,
				name: `學生${i + 1}`,
				priority: Math.floor(Math.random() * 10),
				grade: Math.floor(Math.random() * 100),
				specialNeeds: Math.random() > 0.8
			}));

			const largeSeats = Array.from({ length: 100 }, (_, i) => ({
				row: Math.floor(i / 10) + 1,
				col: (i % 10) + 1,
				type: Math.random() > 0.5 ? 'premium' : 'standard',
				groupId: `G${Math.floor(i / 20) + 1}`
			}));

			const largeAssignment = new Map();
			for (let i = 0; i < 50; i++) {
				largeAssignment.set(largeStudents[i].id, largeSeats[i]);
			}

			const startTime = Date.now();

			// 測試優先級計算性能
			const priority = adjuster.calculatePriority(
				largeStudents[0], 'student', largeAssignment, largeStudents, largeSeats, mockConditions
			);

			const endTime = Date.now();
			const executionTime = endTime - startTime;

			expect(priority).toBeGreaterThan(0);
			expect(executionTime).toBeLessThan(1000); // 應該在1秒內完成
		});
	});
});

// 如果使用 Node.js 環境，導出測試
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { DynamicAdjuster };
}
