/**
 * 全面測試腳本
 * 測試修復後的座位分配引擎
 */

console.log('=== 全面測試開始 ===');

// 測試修復後的引擎
async function testFixedEngine() {
    try {
        console.log('載入修復後的座位分配引擎...');
        const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');
        const engine = new SeatAssignmentEngine();
        
        // 測試案例1：基本分配
        console.log('\n--- 測試案例1：基本分配 ---');
        const testCase1 = {
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
            conditions: []
        };
        
        const result1 = await engine.solveAssignment(testCase1);
        console.log(`結果: ${result1.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`分配數量: ${result1.assignment ? result1.assignment.length : 0}/${testCase1.students.length}`);
        console.log(`執行時間: ${result1.performanceMetrics.executionTime}ms`);
        
        // 測試案例2：有條件的分配
        console.log('\n--- 測試案例2：有條件的分配 ---');
        const testCase2 = {
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
        
        const result2 = await engine.solveAssignment(testCase2);
        console.log(`結果: ${result2.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`分配數量: ${result2.assignment ? result2.assignment.length : 0}/${testCase2.students.length}`);
        console.log(`執行時間: ${result2.performanceMetrics.executionTime}ms`);
        
        // 測試案例3：座位不足的情況
        console.log('\n--- 測試案例3：座位不足 ---');
        const testCase3 = {
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
                { id: 'A3', row: 0, col: 2, isValid: true, groupId: 'G1' }
            ],
            conditions: []
        };
        
        const result3 = await engine.solveAssignment(testCase3);
        console.log(`結果: ${result3.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`分配數量: ${result3.assignment ? result3.assignment.length : 0}/${testCase3.students.length}`);
        console.log(`執行時間: ${result3.performanceMetrics.executionTime}ms`);
        
        // 測試案例4：大規模測試
        console.log('\n--- 測試案例4：大規模測試 (40個學生) ---');
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
        
        const testCase4 = {
            students: students,
            seats: seats,
            conditions: [
                {
                    type: 'assign_group',
                    students: [1, 2, 3, 4, 5],
                    group: 'G1'
                }
            ]
        };
        
        const result4 = await engine.solveAssignment(testCase4);
        console.log(`結果: ${result4.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`分配數量: ${result4.assignment ? result4.assignment.length : 0}/${testCase4.students.length}`);
        console.log(`執行時間: ${result4.performanceMetrics.executionTime}ms`);
        
        // 多次測試
        console.log('\n--- 多次測試 (10次) ---');
        let successCount = 0;
        let totalTime = 0;
        
        for (let i = 0; i < 10; i++) {
            const startTime = Date.now();
            const result = await engine.solveAssignment(testCase4);
            const executionTime = Date.now() - startTime;
            
            if (result.success) {
                successCount++;
            }
            totalTime += executionTime;
            
            console.log(`第 ${i + 1} 次: ${result.success ? '✅' : '❌'} (${executionTime}ms)`);
        }
        
        console.log(`\n總結:`);
        console.log(`成功率: ${(successCount / 10) * 100}% (${successCount}/10)`);
        console.log(`平均時間: ${(totalTime / 10).toFixed(1)}ms`);
        
        return successCount >= 8; // 至少80%成功率
        
    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error.message);
        return false;
    }
}

// 執行測試
testFixedEngine().then(success => {
    console.log('\n=== 測試完成 ===');
    if (success) {
        console.log('🎉 修復成功！系統現在應該可以正常使用！');
    } else {
        console.log('⚠️ 仍有問題，需要進一步修復');
    }
}).catch(error => {
    console.error('測試失敗:', error);
});
