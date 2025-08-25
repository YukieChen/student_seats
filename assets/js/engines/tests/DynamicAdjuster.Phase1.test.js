/**
 * DynamicAdjuster Phase 1 功能測試 - 最簡版本
 */

const { DynamicAdjuster } = require('../DynamicAdjuster.js');

console.log('開始 DynamicAdjuster Phase 1 功能測試...\n');

// 測試數據
const mockConflict = {
	type: 'CONDITION_CONFLICT',
	studentId: 'student1',
	affectedStudents: ['student1', 'student2'],
	description: '測試衝突'
};

const mockCurrentAssignment = new Map([
	['student1', { row: 1, col: 1, groupId: 'group1' }],
	['student2', { row: 1, col: 2, groupId: 'group1' }]
]);

const mockStudents = [
	{ id: 'student1', name: '學生1', priority: 1 },
	{ id: 'student2', name: '學生2', priority: 2 }
];

const mockSeats = [
	{ row: 1, col: 1, groupId: 'group1' },
	{ row: 1, col: 2, groupId: 'group1' }
];

const mockConditions = [
	{
		type: 'ADJACENT',
		students: ['student1', 'student2'],
		description: '學生1和學生2必須相鄰'
	}
];

// 初始化 DynamicAdjuster 實例
const adjuster = new DynamicAdjuster();

// 測試 1: selectOptimalStrategy() 基本功能測試
console.log('測試 1: selectOptimalStrategy() 基本功能測試');
try {
	const strategy = adjuster.selectOptimalStrategy(
		mockConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	if (!strategy) throw new Error('應該返回策略對象');
	if (!strategy.name) throw new Error('策略應該有名稱');
	if (typeof strategy.priority !== 'number') throw new Error('策略應該有優先級');
	if (typeof strategy.maxAttempts !== 'number') throw new Error('策略應該有最大嘗試次數');
	if (!strategy.description) throw new Error('策略應該有描述');

	console.log(`✅ selectOptimalStrategy 應該返回有效的策略對象`);
	console.log(`選中策略: ${strategy.name}, 優先級: ${strategy.priority}`);
} catch (error) {
	console.log(`❌ selectOptimalStrategy 應該返回有效的策略對象: ${error.message}`);
}

// 測試 2: 根據衝突類型選擇策略
console.log('\n測試 2: 根據衝突類型選擇策略');
try {
	// 測試 TOTAL_COUNT 衝突
	const totalCountConflict = { ...mockConflict, type: 'TOTAL_COUNT' };
	const strategy1 = adjuster.selectOptimalStrategy(
		totalCountConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	// 測試 GROUP_CAPACITY 衝突
	const groupCapacityConflict = { ...mockConflict, type: 'GROUP_CAPACITY' };
	const strategy2 = adjuster.selectOptimalStrategy(
		groupCapacityConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	// 測試 CONDITION_CONFLICT 衝突
	const conditionConflict = { ...mockConflict, type: 'CONDITION_CONFLICT' };
	const strategy3 = adjuster.selectOptimalStrategy(
		conditionConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	if (!strategy1) throw new Error('TOTAL_COUNT 衝突應該返回策略');
	if (!strategy2) throw new Error('GROUP_CAPACITY 衝突應該返回策略');
	if (!strategy3) throw new Error('CONDITION_CONFLICT 衝突應該返回策略');

	console.log(`✅ 應該根據衝突類型選擇合適的策略`);
	console.log(`TOTAL_COUNT 策略: ${strategy1.name}, GROUP_CAPACITY 策略: ${strategy2.name}, CONDITION_CONFLICT 策略: ${strategy3.name}`);
} catch (error) {
	console.log(`❌ 應該根據衝突類型選擇合適的策略: ${error.message}`);
}

// 測試 3: learnFromStrategy() 基本功能測試
console.log('\n測試 3: learnFromStrategy() 基本功能測試');
try {
	const strategy = adjuster.STRATEGY_CONFIG.SMART_SWAP;
	const result = {
		success: true,
		attempts: 5,
		executionTime: 150,
		strategy: '智能互換'
	};

	// 執行學習
	adjuster.learnFromStrategy(
		strategy,
		result,
		mockConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	// 檢查性能統計是否被更新
	const performance = adjuster.getStrategyPerformance('智能互換');
	if (!performance) throw new Error('應該返回性能統計');
	if (performance.totalExecutions !== 1) throw new Error('總執行次數應該是1');
	if (performance.successfulExecutions !== 1) throw new Error('成功執行次數應該是1');
	if (performance.totalAttempts !== 5) throw new Error('總嘗試次數應該是5');
	if (performance.totalExecutionTime !== 150) throw new Error('總執行時間應該是150');
	if (performance.recentResults.length !== 1) throw new Error('最近結果數量應該是1');

	console.log(`✅ learnFromStrategy 應該正確記錄策略執行結果`);
	console.log(`SMART_SWAP 性能統計: 執行${performance.totalExecutions}次, 成功${performance.successfulExecutions}次`);
} catch (error) {
	console.log(`❌ learnFromStrategy 應該正確記錄策略執行結果: ${error.message}`);
}

// 測試 4: adaptStrategy() 基本功能測試
console.log('\n測試 4: adaptStrategy() 基本功能測試');
try {
	const strategyName = '智能互換';
	const originalConfig = { ...adjuster.STRATEGY_CONFIG.SMART_SWAP };

	// 模擬高性能表現
	const performance = {
		totalExecutions: 20,
		successfulExecutions: 18, // 90% 成功率
		totalAttempts: 100, // 平均5次嘗試
		totalExecutionTime: 8000, // 平均400ms
		recentResults: Array(10).fill({ success: true, attempts: 5, executionTime: 400 })
	};

	adjuster.strategyPerformance.set(strategyName, performance);

	// 執行適應
	adjuster.adaptStrategy(strategyName);

	// 檢查策略配置是否被調整
	const adaptedConfig = adjuster.STRATEGY_CONFIG.SMART_SWAP;
	if (adaptedConfig.priority === originalConfig.priority) throw new Error('優先級應該被調整');

	console.log(`✅ adaptStrategy 應該根據性能調整策略參數`);
	console.log(`SMART_SWAP 適應結果: 優先級從${originalConfig.priority}調整到${adaptedConfig.priority}`);
} catch (error) {
	console.log(`❌ adaptStrategy 應該根據性能調整策略參數: ${error.message}`);
}

// 測試 5: tryAdjustment 方法應該使用新的自適應功能
console.log('\n測試 5: tryAdjustment 方法應該使用新的自適應功能');
try {
	// 模擬 tryAdjustment 的調用
	const result = adjuster.tryAdjustment(
		mockConflict,
		mockCurrentAssignment,
		mockStudents,
		mockSeats,
		mockConditions
	);

	// 檢查結果包含執行時間
	if (!result.executionTime) throw new Error('結果應該包含執行時間');
	if (result.executionTime <= 0) throw new Error('執行時間應該大於0');

	// 檢查策略名稱
	if (!result.strategy) throw new Error('結果應該包含策略名稱');

	// 檢查是否產生了學習數據
	const allPerformance = adjuster.getAllStrategyPerformance();
	if (allPerformance.size === 0) throw new Error('應該產生學習數據');

	console.log(`✅ tryAdjustment 方法應該使用新的自適應功能`);
	console.log(`tryAdjustment 測試: 執行時間${result.executionTime}ms, 策略${result.strategy}, 學習數據${allPerformance.size}個`);
} catch (error) {
	console.log(`❌ tryAdjustment 方法應該使用新的自適應功能: ${error.message}`);
}

console.log('\n測試完成');
