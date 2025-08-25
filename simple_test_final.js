/**
 * 最終簡單測試
 */

console.log('=== 最終簡單測試 ===');

async function testSimpleEngine() {
	try {
		console.log('載入簡單座位分配引擎...');
		const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');
		const engine = new SeatAssignmentEngine();

		// 簡單測試數據
		const testData = {
			students: [
				{ id: 1, name: '學生1' },
				{ id: 2, name: '學生2' },
				{ id: 3, name: '學生3' }
			],
			seats: [
				{ id: 'A1', row: 0, col: 0, isValid: true, groupId: 'G1' },
				{ id: 'A2', row: 0, col: 1, isValid: true, groupId: 'G1' },
				{ id: 'A3', row: 0, col: 2, isValid: true, groupId: 'G1' }
			],
			conditions: []
		};

		console.log('執行測試...');
		const result = await engine.solveAssignment(testData);

		console.log(`結果: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
		console.log(`分配數量: ${result.assignment ? result.assignment.length : 0}/${testData.students.length}`);
		console.log(`執行時間: ${result.performanceMetrics.executionTime}ms`);

		if (result.success) {
			console.log('🎉 測試成功！系統可以正常使用');
			return true;
		} else {
			console.log('❌ 測試失敗');
			return false;
		}

	} catch (error) {
		console.error('❌ 測試錯誤:', error.message);
		return false;
	}
}

// 執行測試
testSimpleEngine().then(success => {
	console.log('\n=== 測試完成 ===');
	if (success) {
		console.log('✅ 系統已修復！');
	} else {
		console.log('⚠️ 系統仍有問題');
	}
}).catch(error => {
	console.error('測試失敗:', error);
});
