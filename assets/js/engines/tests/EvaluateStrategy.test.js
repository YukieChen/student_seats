// EvaluateStrategy.test.js - 策略評估測試
const { DynamicAdjuster } = require('../DynamicAdjuster.js');

// 簡單測試函數
function runTests() {
	console.log('開始策略評估測試...\n');

	let passedTests = 0;
	let totalTests = 0;

	function test(name, testFunction) {
		totalTests++;
		try {
			testFunction();
			console.log(`✅ ${name}`);
			passedTests++;
		} catch (error) {
			console.log(`❌ ${name}: ${error.message}`);
		}
	}

	// 測試數據
	const testConflict = {
		type: 'GROUP_CAPACITY',
		studentId: 'S1',
		groupId: 'A',
		affectedStudents: ['S1', 'S2']
	};

	const testAssignment = new Map([
		['S1', { id: 'seat1', row: 1, col: 1, group: 'A' }],
		['S2', { id: 'seat2', row: 1, col: 2, group: 'A' }],
		['S3', { id: 'seat3', row: 2, col: 1, group: 'B' }]
	]);

	const testStudents = [
		{ id: 'S1', name: '學生1', group: 'A', priority: 1 },
		{ id: 'S2', name: '學生2', group: 'A', priority: 2 },
		{ id: 'S3', name: '學生3', group: 'B', priority: 1 }
	];

	const testSeats = [
		{ id: 'seat1', row: 1, col: 1, group: 'A' },
		{ id: 'seat2', row: 1, col: 2, group: 'A' },
		{ id: 'seat3', row: 2, col: 1, group: 'B' }
	];

	const testConditions = [
		{ type: 'ADJACENT', students: ['S1', 'S2'], value: true }
	];

	const testStrategy = {
		name: 'SMART_SWAP',
		priority: 2,
		maxAttempts: 20,
		description: '智能互換'
	};

	// 測試 1: 基本功能測試
	test('應該能夠執行策略評估', () => {
		const adjuster = new DynamicAdjuster();

		const result = adjuster.evaluateStrategy(
			testStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		if (!result) throw new Error('應該返回評估結果');
		if (typeof result.overallScore !== 'number') throw new Error('應該返回數值評分');
		if (result.overallScore < 0 || result.overallScore > 1) throw new Error('評分應該在0-1之間');
		if (!result.factors) throw new Error('應該包含詳細因素');

		console.log(`策略評估結果: ${result.strategyName}, 綜合評分: ${result.overallScore.toFixed(3)}`);
	});

	// 測試 2: 適用性評估測試
	test('應該評估策略適用性', () => {
		const adjuster = new DynamicAdjuster();

		const result = adjuster.evaluateStrategy(
			testStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		if (!result.factors.applicability) throw new Error('應該包含適用性評估');
		if (typeof result.factors.applicability.score !== 'number') throw new Error('適用性評分應該是數值');
		if (result.factors.applicability.score < 0 || result.factors.applicability.score > 1) throw new Error('適用性評分應該在0-1之間');

		console.log(`適用性評分: ${result.factors.applicability.score.toFixed(3)}`);
	});

	// 測試 3: 效果評估測試
	test('應該評估策略效果', () => {
		const adjuster = new DynamicAdjuster();

		const result = adjuster.evaluateStrategy(
			testStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		if (!result.factors.effectiveness) throw new Error('應該包含效果評估');
		if (typeof result.factors.effectiveness.score !== 'number') throw new Error('效果評分應該是數值');
		if (result.factors.effectiveness.score < 0 || result.factors.effectiveness.score > 1) throw new Error('效果評分應該在0-1之間');

		console.log(`效果評分: ${result.factors.effectiveness.score.toFixed(3)}`);
	});

	// 測試 4: 效率評估測試
	test('應該評估策略效率', () => {
		const adjuster = new DynamicAdjuster();

		const result = adjuster.evaluateStrategy(
			testStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		if (!result.factors.efficiency) throw new Error('應該包含效率評估');
		if (typeof result.factors.efficiency.score !== 'number') throw new Error('效率評分應該是數值');
		if (result.factors.efficiency.score < 0 || result.factors.efficiency.score > 1) throw new Error('效率評分應該在0-1之間');

		console.log(`效率評分: ${result.factors.efficiency.score.toFixed(3)}`);
	});

	// 測試 5: 風險評估測試
	test('應該評估策略風險', () => {
		const adjuster = new DynamicAdjuster();

		const result = adjuster.evaluateStrategy(
			testStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		if (!result.factors.risk) throw new Error('應該包含風險評估');
		if (typeof result.factors.risk.score !== 'number') throw new Error('風險評分應該是數值');
		if (result.factors.risk.score < 0 || result.factors.risk.score > 1) throw new Error('風險評分應該在0-1之間');

		console.log(`風險評分: ${result.factors.risk.score.toFixed(3)}`);
	});

	// 測試 6: 不同策略比較測試
	test('應該能夠比較不同策略', () => {
		const adjuster = new DynamicAdjuster();

		const strategies = [
			{ name: 'DIRECT_REMOVAL', priority: 1, maxAttempts: 10 },
			{ name: 'SMART_SWAP', priority: 2, maxAttempts: 20 },
			{ name: 'CHAIN_ADJUSTMENT', priority: 3, maxAttempts: 30 }
		];

		const evaluations = strategies.map(strategy =>
			adjuster.evaluateStrategy(
				strategy,
				testConflict,
				testAssignment,
				testStudents,
				testSeats,
				testConditions
			)
		);

		if (evaluations.length !== strategies.length) throw new Error('應該評估所有策略');

		// 檢查評分是否合理
		evaluations.forEach(eval => {
			if (eval.overallScore < 0 || eval.overallScore > 1) throw new Error('所有評分應該在0-1之間');
		});

		console.log(`策略比較結果:`);
		evaluations.forEach(eval => {
			console.log(`  ${eval.strategyName}: ${eval.overallScore.toFixed(3)}`);
		});
	});

	// 測試 7: 錯誤處理測試
	test('應該處理無效輸入', () => {
		const adjuster = new DynamicAdjuster();

		// 測試無效策略
		const invalidStrategy = null;
		const result = adjuster.evaluateStrategy(
			invalidStrategy,
			testConflict,
			testAssignment,
			testStudents,
			testSeats,
			testConditions
		);

		// 即使輸入無效，也應該返回結果（評分為0）
		if (!result) throw new Error('應該返回結果');
		if (typeof result.overallScore !== 'number') throw new Error('應該返回數值評分');

		console.log(`無效策略評分: ${result.overallScore}`);
	});

	// 測試 8: 性能測試
	test('應該在合理時間內完成評估', () => {
		const adjuster = new DynamicAdjuster();

		const startTime = Date.now();

		// 執行多次評估
		for (let i = 0; i < 100; i++) {
			adjuster.evaluateStrategy(
				testStrategy,
				testConflict,
				testAssignment,
				testStudents,
				testSeats,
				testConditions
			);
		}

		const endTime = Date.now();
		const processingTime = endTime - startTime;

		if (processingTime > 1000) throw new Error('處理時間不應該超過1秒');

		console.log(`性能測試: 100次評估耗時 ${processingTime}ms`);
	});

	// 輸出測試結果
	console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
	console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

	return passedTests === totalTests;
}

// 如果直接運行此文件，則執行測試
if (require.main === module) {
	runTests();
}

module.exports = { runTests };
