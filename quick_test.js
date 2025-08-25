/**
 * 快速測試腳本
 * 測試簡化後的座位分配引擎
 */

console.log('=== 快速測試開始 ===');

// 測試簡化的引擎
async function testSimplifiedEngine() {
	try {
		console.log('載入簡化的座位分配引擎...');
		const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');
		const engine = new SeatAssignmentEngine();

		console.log('創建測試數據...');
		const testData = {
			students: [
				{ id: 1, name: '學生1' },
				{ id: 2, name: '學生2' },
				{ id: 3, name: '學生3' },
				{ id: 4, name: '學生4' },
				{ id: 5, name: '學生5' }
			],
			seats: [
				{ id: 'A1', row: 0, col: 0, isValid: true, groupId: 'G1' },
				{ id: 'A2', row: 0, col: 1, isValid: true, groupId: 'G1' },
				{ id: 'A3', row: 0, col: 2, isValid: true, groupId: 'G1' },
				{ id: 'B1', row: 1, col: 0, isValid: true, groupId: 'G2' },
				{ id: 'B2', row: 1, col: 1, isValid: true, groupId: 'G2' }
			],
			conditions: [
				{
					type: 'assign_group',
					students: [1, 2],
					group: 'G1'
				}
			]
		};

		console.log('執行座位分配...');
		const startTime = Date.now();

		const result = await engine.solveAssignment(testData);

		const executionTime = Date.now() - startTime;

		console.log('\n=== 測試結果 ===');
		console.log(`執行時間: ${executionTime}ms`);
		console.log(`成功: ${result.success ? '✅ 是' : '❌ 否'}`);
		console.log(`分配數量: ${result.assignment ? result.assignment.length : 0}/${testData.students.length}`);

		if (result.performanceMetrics) {
			console.log(`性能指標:`);
			console.log(`  - 執行時間: ${result.performanceMetrics.executionTime}ms`);
			console.log(`  - 緩存命中率: ${result.performanceMetrics.cacheHitRate.toFixed(2)}%`);
			console.log(`  - 內存使用: ${(result.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
		}

		if (result.conflicts && result.conflicts.length > 0) {
			console.log(`衝突: ${result.conflicts.length} 個`);
			result.conflicts.forEach(conflict => console.log(`  - ${conflict}`));
		}

		if (result.success) {
			console.log('\n✅ 簡化引擎測試成功！');
			console.log('建議: 現在可以安全使用簡化版本的引擎');
		} else {
			console.log('\n❌ 簡化引擎測試失敗');
			if (result.error) {
				console.log(`錯誤: ${result.error}`);
			}
		}

		return result.success;

	} catch (error) {
		console.error('❌ 測試過程中發生錯誤:', error.message);
		return false;
	}
}

// 執行測試
testSimplifiedEngine().then(success => {
	console.log('\n=== 測試完成 ===');
	if (success) {
		console.log('🎉 系統已修復，可以正常使用！');
	} else {
		console.log('⚠️ 系統仍有問題，需要進一步修復');
	}
}).catch(error => {
	console.error('測試失敗:', error);
});
