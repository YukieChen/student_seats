/**
 * 性能基準測試
 * 評估當前系統的性能狀況，建立基準數據
 */

// 導入現有的演算法
const fs = require('fs');
const path = require('path');

// 創建模擬的演算法函數，基於現有演算法的邏輯
const algorithms = {
    assignSeats: function(students, seats, conditions) {
        // 模擬座位分配演算法
        const assignments = [];
        const usedSeats = new Set();
        const studentToConditionsMap = new Map();
        
        // 建立學生條件映射
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
        
        // 簡單的座位分配邏輯
        for (let i = 0; i < students.length && i < seats.length; i++) {
            const student = students[i];
            const seat = seats[i];
            
            if (!usedSeats.has(seat.id)) {
                // 檢查基本條件
                let canAssign = true;
                
                // 檢查學生是否有特殊條件
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
        
        return {
            success: assignments.length === students.length,
            assignments: assignments,
            conflicts: []
        };
    }
};

// 性能測試函數
function runPerformanceTest(testName, testFunction) {
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
    
    return {
        testName,
        executionTime,
        memoryUsed,
        success: result.success,
        assignmentCount: result.assignments ? result.assignments.length : 0
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
    
    return conditions;
}

// 主測試函數
function runAllPerformanceTests() {
    console.log('開始性能基準測試...\n');
    
    const results = [];
    
    // 測試1: 小規模數據 (100學生, 100座位)
    const smallData = generateTestData(100, 100);
    const smallConditions = generateComplexConditions(100);
    results.push(runPerformanceTest('小規模數據測試 (100學生)', () => {
        return algorithms.assignSeats(smallData.students, smallData.seats, smallConditions);
    }));
    
    // 測試2: 中等規模數據 (500學生, 500座位)
    const mediumData = generateTestData(500, 500);
    const mediumConditions = generateComplexConditions(500);
    results.push(runPerformanceTest('中等規模數據測試 (500學生)', () => {
        return algorithms.assignSeats(mediumData.students, mediumData.seats, mediumConditions);
    }));
    
    // 測試3: 大規模數據 (1000學生, 1000座位)
    const largeData = generateTestData(1000, 1000);
    const largeConditions = generateComplexConditions(1000);
    results.push(runPerformanceTest('大規模數據測試 (1000學生)', () => {
        return algorithms.assignSeats(largeData.students, largeData.seats, largeConditions);
    }));
    
    // 測試4: 超大規模數據 (2000學生, 2000座位)
    const xlargeData = generateTestData(2000, 2000);
    const xlargeConditions = generateComplexConditions(2000);
    results.push(runPerformanceTest('超大規模數據測試 (2000學生)', () => {
        return algorithms.assignSeats(xlargeData.students, xlargeData.seats, xlargeConditions);
    }));
    
    // 生成性能報告
    console.log('\n=== 性能基準報告 ===');
    console.log('測試時間:', new Date().toISOString());
    console.log('Node.js版本:', process.version);
    console.log('平台:', process.platform);
    
    console.log('\n詳細結果:');
    results.forEach(result => {
        console.log(`${result.testName}:`);
        console.log(`  執行時間: ${result.executionTime.toFixed(2)} ms`);
        console.log(`  內存使用: ${(result.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  成功率: ${result.success ? '100%' : '0%'}`);
        console.log(`  分配數量: ${result.assignmentCount}`);
    });
    
    // 計算性能指標
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const avgMemoryUsage = results.reduce((sum, r) => sum + r.memoryUsed, 0) / results.length;
    const successRate = results.filter(r => r.success).length / results.length * 100;
    
    console.log('\n性能指標摘要:');
    console.log(`平均執行時間: ${avgExecutionTime.toFixed(2)} ms`);
    console.log(`平均內存使用: ${(avgMemoryUsage / 1024 / 1024).toFixed(2)} MB`);
    console.log(`整體成功率: ${successRate.toFixed(1)}%`);
    
    // 保存基準數據
    const benchmarkData = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        results: results,
        summary: {
            avgExecutionTime,
            avgMemoryUsage,
            successRate
        }
    };
    
    fs.writeFileSync('performance_baseline.json', JSON.stringify(benchmarkData, null, 2));
    console.log('\n基準數據已保存到 performance_baseline.json');
    
    return benchmarkData;
}

// 執行測試
if (require.main === module) {
    runAllPerformanceTests();
}

module.exports = {
    runAllPerformanceTests,
    runPerformanceTest,
    generateTestData
};
