/**
 * 性能分析腳本
 * 比較舊算法和新模組的性能差異
 */

console.log('=== 性能分析開始 ===');

// 模擬舊的 algorithms.js 的簡單高效算法
function oldAlgorithm(students, seats, conditions) {
    const startTime = Date.now();
    
    // 簡單高效的座位分配邏輯
    const assignments = [];
    const usedSeats = new Set();
    const studentToConditionsMap = new Map();
    
    // 建立學生條件映射（簡化版）
    if (conditions && conditions.length > 0) {
        conditions.forEach(condition => {
            condition.students.forEach(studentId => {
                if (!studentToConditionsMap.has(studentId)) {
                    studentToConditionsMap.set(studentId, []);
                }
                studentToConditionsMap.get(studentId).push(condition);
            });
        });
    }
    
    // 快速分配邏輯
    for (let i = 0; i < students.length && i < seats.length; i++) {
        const student = students[i];
        const seat = seats[i];
        
        if (!usedSeats.has(seat.id)) {
            // 簡單的條件檢查
            let canAssign = true;
            const studentConditions = studentToConditionsMap.get(student.id) || [];
            
            for (const condition of studentConditions) {
                if (condition.type === 'assign_group' && seat.groupId !== condition.group) {
                    canAssign = false;
                    break;
                }
            }
            
            if (canAssign) {
                assignments.push({
                    student: student,
                    seat: seat
                });
                usedSeats.add(seat.id);
            }
        }
    }
    
    const executionTime = Date.now() - startTime;
    
    return {
        success: assignments.length === students.length,
        assignments: assignments,
        conflicts: [],
        executionTime: executionTime
    };
}

// 測試數據生成
function generateTestData(size = 50) {
    const students = Array.from({ length: size }, (_, i) => ({ 
        id: i + 1, 
        name: `學生${i + 1}` 
    }));
    
    const seats = Array.from({ length: size }, (_, i) => ({ 
        id: `S${i + 1}`, 
        row: Math.floor(i / 10), 
        col: i % 10, 
        isValid: true, 
        groupId: `G${Math.floor(i / 10) + 1}` 
    }));
    
    const conditions = [
        {
            type: 'assign_group',
            students: [1, 2, 3],
            group: 'G1'
        },
        {
            type: 'adjacent',
            students: [4, 5]
        }
    ];
    
    return { students, seats, conditions };
}

// 性能測試
function runPerformanceTest(testName, algorithm, testData, iterations = 5) {
    console.log(`\n=== ${testName} ===`);
    
    const results = [];
    let successCount = 0;
    let totalTime = 0;
    
    for (let i = 0; i < iterations; i++) {
        console.log(`執行第 ${i + 1} 次測試...`);
        
        const startTime = Date.now();
        const startMemory = process.memoryUsage();
        
        const result = algorithm(testData.students, testData.seats, testData.conditions);
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const executionTime = endTime - startTime;
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
        
        results.push({
            iteration: i + 1,
            success: result.success,
            executionTime: executionTime,
            memoryUsed: memoryUsed,
            assignmentCount: result.assignments ? result.assignments.length : 0
        });
        
        if (result.success) {
            successCount++;
        }
        totalTime += executionTime;
        
        console.log(`  結果: ${result.success ? '✅ 成功' : '❌ 失敗'}`);
        console.log(`  時間: ${executionTime}ms`);
        console.log(`  內存: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  分配: ${result.assignments ? result.assignments.length : 0}/${testData.students.length}`);
    }
    
    const successRate = (successCount / iterations) * 100;
    const avgTime = totalTime / iterations;
    
    console.log(`\n${testName} 總結:`);
    console.log(`  成功率: ${successRate.toFixed(1)}% (${successCount}/${iterations})`);
    console.log(`  平均時間: ${avgTime.toFixed(1)}ms`);
    console.log(`  總時間: ${totalTime}ms`);
    
    return {
        testName,
        successRate,
        avgTime,
        totalTime,
        results
    };
}

// 主測試函數
async function runAnalysis() {
    console.log('開始性能分析...\n');
    
    const testData = generateTestData(50);
    console.log(`測試數據: ${testData.students.length} 個學生, ${testData.seats.length} 個座位`);
    
    // 測試舊算法
    const oldResults = runPerformanceTest('舊算法 (algorithms.js)', oldAlgorithm, testData, 5);
    
    // 測試新模組（如果可用）
    try {
        console.log('\n嘗試載入新模組進行比較...');
        const { SeatAssignmentEngine } = require('./assets/js/engines/SeatAssignmentEngine.js');
        const engine = new SeatAssignmentEngine();
        
        const newAlgorithm = (students, seats, conditions) => {
            return engine.solveAssignment({
                students: students,
                seats: seats,
                conditions: conditions
            });
        };
        
        const newResults = runPerformanceTest('新模組 (SeatAssignmentEngine)', newAlgorithm, testData, 5);
        
        // 比較結果
        console.log('\n=== 性能比較 ===');
        console.log(`舊算法成功率: ${oldResults.successRate.toFixed(1)}%`);
        console.log(`新模組成功率: ${newResults.successRate.toFixed(1)}%`);
        console.log(`舊算法平均時間: ${oldResults.avgTime.toFixed(1)}ms`);
        console.log(`新模組平均時間: ${newResults.avgTime.toFixed(1)}ms`);
        
        const timeRatio = newResults.avgTime / oldResults.avgTime;
        console.log(`性能比率: ${timeRatio.toFixed(2)}x (新模組比舊算法慢 ${timeRatio.toFixed(2)} 倍)`);
        
    } catch (error) {
        console.log(`❌ 無法載入新模組: ${error.message}`);
        console.log('建議: 暫時禁用新模組，恢復使用舊算法');
    }
    
    return { oldResults };
}

// 執行分析
runAnalysis().then(results => {
    console.log('\n=== 分析完成 ===');
    console.log('建議: 如果新模組性能明顯下降，建議暫時回退到舊算法');
}).catch(error => {
    console.error('分析過程中發生錯誤:', error);
});
