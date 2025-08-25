/**
 * 測試原始算法引擎
 */

console.log('=== 測試原始算法引擎 ===');

async function testOriginalAlgorithm() {
    try {
        console.log('載入基於原始算法的座位分配引擎...');
        const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');
        const engine = new SeatAssignmentEngine();
        
        // 測試數據：40個學生，40個座位
        console.log('創建測試數據 (40個學生)...');
        const students = Array.from({ length: 40 }, (_, i) => ({ 
            id: i + 1, 
            name: `學生${i + 1}` 
        }));
        
        const seats = Array.from({ length: 40 }, (_, i) => ({ 
            id: `S${i + 1}`, 
            row: Math.floor(i / 10), 
            col: i % 10, 
            isValid: true, 
            groupId: `G${Math.floor(i / 10) + 1}` 
        }));
        
        const conditions = [
            {
                type: 'assign_group',
                students: [1, 2, 3, 4, 5],
                group: 'G1'
            }
        ];
        
        const testData = { students, seats, conditions };
        
        // 執行10次測試
        console.log('執行10次測試...');
        let successCount = 0;
        let totalTime = 0;
        
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            const result = await engine.solveAssignment(testData);
            const executionTime = Date.now() - startTime;
            
            console.log(`第 ${i + 1} 次: ${result.success ? '✅' : '❌'} (${executionTime}ms) - 分配: ${result.assignment ? result.assignment.length : 0}/40`);
            
            if (result.success) {
                successCount++;
            }
            totalTime += executionTime;
            
            // 如果執行時間超過1秒，停止測試
            if (executionTime > 1000) {
                console.log(`⚠️ 第 ${i + 1} 次執行時間過長 (${executionTime}ms)，停止測試`);
                break;
            }
        }
        
        console.log(`\n=== 測試結果 ===`);
        console.log(`成功率: ${(successCount / 10) * 100}% (${successCount}/10)`);
        console.log(`平均時間: ${(totalTime / 10).toFixed(1)}ms`);
        
        if (successCount >= 8) {
            console.log('🎉 測試通過！原始算法引擎工作正常');
            return true;
        } else {
            console.log('❌ 測試失敗！成功率過低');
            return false;
        }
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
        return false;
    }
}

// 執行測試
testOriginalAlgorithm().then(success => {
    console.log('\n=== 測試完成 ===');
    if (success) {
        console.log('✅ 系統已修復，可以正常使用！');
    } else {
        console.log('⚠️ 系統仍有問題');
    }
}).catch(error => {
    console.error('測試失敗:', error);
});
