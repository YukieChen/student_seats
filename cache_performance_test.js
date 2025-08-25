/**
 * 緩存性能測試
 * 專門測試重複計算場景下的緩存效果
 */

const { FinalOptimizedEngine } = require('./final_optimized_algorithms.js');

// 性能測試函數
function runCachePerformanceTest(testName, testFunction) {
	console.log(`\n=== ${testName} ===`);

	const startTime = process.hrtime.bigint();
	const startMemory = process.memoryUsage();

	const result = testFunction();

	const endTime = process.hrtime.bigint();
	const endMemory = process.memoryUsage();

	const executionTime = Number(endTime - startTime) / 1000000; // 轉換為毫秒
	const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

	console.log(`執行時間: ${executionTime.toFixed(2)} ms`);
	console.log(`內存使用: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`);
	console.log(`結果: ${result.success ? '成功' : '失敗'}`);
	console.log(`分配數量: ${result.assignments ? result.assignments.length : 0}`);

	if (result.performance) {
		console.log(`緩存命中率: ${(result.performance.cacheHitRate * 100).toFixed(1)}%`);
	}

	return {
		testName,
		executionTime,
		memoryUsed,
		success: result.success,
		assignmentCount: result.assignments ? result.assignments.length : 0,
		cacheHitRate: result.performance ? result.performance.cacheHitRate : 0
	};
}

// 生成測試數據
function generateTestData(studentCount, seatCount) {
	const students = [];
	const seats = [];

	// 生成學生數據
	for (let i = 0; i < studentCount; i++) {
		students.push({
			id: `S${i}`,
			name: `Student${i}`,
			preferences: [`A${Math.floor(Math.random() * Math.min(seatCount, 100))}`]
		});
	}

	// 生成座位數據
	for (let i = 0; i < seatCount; i++) {
		seats.push({
			id: `A${i}`,
			row: Math.floor(i / 50) + 1,
			col: (i % 50) + 1,
			groupId: `Group${Math.floor(i / 100)}` // 添加群組ID
		});
	}

	return { students, seats };
}

// 生成複雜條件數據
function generateComplexConditions(studentCount) {
	const conditions = [];

	// 生成群組分配條件
	for (let i = 0; i < Math.floor(studentCount / 10); i++) {
		conditions.push({
			type: 'assign_group',
			group: `Group${i}`,
			students: [`S${i * 10}`, `S${i * 10 + 1}`, `S${i * 10 + 2}`]
		});
	}

	// 生成相鄰條件
	for (let i = 0; i < Math.floor(studentCount / 20); i++) {
		conditions.push({
			type: 'adjacent',
			students: [`S${i * 20}`, `S${i * 20 + 1}`]
		});
	}

	return conditions;
}

// 緩存性能測試
function runCachePerformanceTests() {
	console.log('開始緩存性能測試...\n');

	const results = [];

	// 測試數據
	const testData = generateTestData(100, 100);
	const conditions = generateComplexConditions(100);

	// 創建優化引擎
	const engine = new FinalOptimizedEngine();

	// 測試1: 第一次執行（無緩存）
	results.push(runCachePerformanceTest('第一次執行 (無緩存)', () => {
		return engine.assignSeats(testData.students, testData.seats, conditions);
	}));

	// 測試2: 第二次執行（有緩存）
	results.push(runCachePerformanceTest('第二次執行 (有緩存)', () => {
		return engine.assignSeats(testData.students, testData.seats, conditions);
	}));

	// 測試3: 第三次執行（更多緩存）
	results.push(runCachePerformanceTest('第三次執行 (更多緩存)', () => {
		return engine.assignSeats(testData.students, testData.seats, conditions);
	}));

	// 測試4: 部分數據變化（部分緩存）
	const modifiedStudents = [...testData.students];
	modifiedStudents[0] = { ...modifiedStudents[0], name: 'ModifiedStudent' };

	results.push(runCachePerformanceTest('部分數據變化 (部分緩存)', () => {
		return engine.assignSeats(modifiedStudents, testData.seats, conditions);
	}));

	// 測試5: 條件變化（部分緩存）
	const modifiedConditions = [...conditions];
	if (modifiedConditions.length > 0) {
		modifiedConditions[0] = { ...modifiedConditions[0], group: 'ModifiedGroup' };
	}

	results.push(runCachePerformanceTest('條件變化 (部分緩存)', () => {
		return engine.assignSeats(testData.students, testData.seats, modifiedConditions);
	}));

	// 生成緩存性能報告
	console.log('\n=== 緩存性能報告 ===');
	console.log('測試時間:', new Date().toISOString());
	console.log('Node.js版本:', process.version);
	console.log('平台:', process.platform);

	console.log('\n詳細結果:');
	results.forEach((result, index) => {
		console.log(`${index + 1}. ${result.testName}:`);
		console.log(`  執行時間: ${result.executionTime.toFixed(2)} ms`);
		console.log(`  內存使用: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
		console.log(`  緩存命中率: ${(result.cacheHitRate * 100).toFixed(1)}%`);
	});

	// 計算緩存效果
	const firstExecution = results[0];
	const secondExecution = results[1];
	const thirdExecution = results[2];

	const speedImprovement1 = ((firstExecution.executionTime - secondExecution.executionTime) / firstExecution.executionTime * 100);
	const speedImprovement2 = ((firstExecution.executionTime - thirdExecution.executionTime) / firstExecution.executionTime * 100);

	console.log('\n緩存效果分析:');
	console.log(`第一次到第二次執行速度提升: ${speedImprovement1.toFixed(1)}%`);
	console.log(`第一次到第三次執行速度提升: ${speedImprovement2.toFixed(1)}%`);
	console.log(`第二次執行緩存命中率: ${(secondExecution.cacheHitRate * 100).toFixed(1)}%`);
	console.log(`第三次執行緩存命中率: ${(thirdExecution.cacheHitRate * 100).toFixed(1)}%`);

	// 檢查緩存目標達成情況
	console.log('\n緩存目標達成情況:');
	console.log(`緩存命中率目標 (80%): ${thirdExecution.cacheHitRate >= 0.8 ? '✅ 達成' : '❌ 未達成'} (${(thirdExecution.cacheHitRate * 100).toFixed(1)}%)`);
	console.log(`速度提升目標 (50%): ${speedImprovement2 >= 50 ? '✅ 達成' : '❌ 未達成'} (${speedImprovement2.toFixed(1)}%)`);

	// 保存緩存測試數據
	const cacheTestData = {
		timestamp: new Date().toISOString(),
		nodeVersion: process.version,
		platform: process.platform,
		results: results,
		analysis: {
			speedImprovement1,
			speedImprovement2,
			secondExecutionCacheHitRate: secondExecution.cacheHitRate,
			thirdExecutionCacheHitRate: thirdExecution.cacheHitRate
		}
	};

	const fs = require('fs');
	fs.writeFileSync('cache_performance_test.json', JSON.stringify(cacheTestData, null, 2));
	console.log('\n緩存測試數據已保存到 cache_performance_test.json');

	return cacheTestData;
}

// 執行緩存性能測試
if (require.main === module) {
	runCachePerformanceTests();
}

module.exports = {
	runCachePerformanceTests
};
