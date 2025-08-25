/**
 * 性能比較測試
 * 比較原始演算法和優化後演算法的性能
 */

const { FinalOptimizedEngine } = require('./final_optimized_algorithms.js');

// 原始演算法（模擬）
const originalAlgorithms = {
    assignSeats: function(students, seats, conditions) {
        // 模擬原始演算法的邏輯
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
        
        // 簡單的座位分配邏輯（模擬原始演算法）
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

// 性能比較測試
function runPerformanceComparison() {
    console.log('開始性能比較測試...\n');
    
    const comparisonResults = [];
    
    // 測試數據規模
    const testScales = [
        { name: '小規模', students: 100, seats: 100 },
        { name: '中等規模', students: 500, seats: 500 },
        { name: '大規模', students: 1000, seats: 1000 },
        { name: '超大規模', students: 2000, seats: 2000 }
    ];
    
    for (const scale of testScales) {
        console.log(`\n=== ${scale.name}測試 (${scale.students}學生) ===`);
        
        const testData = generateTestData(scale.students, scale.seats);
        const conditions = generateComplexConditions(scale.students);
        
        // 測試原始演算法
        const originalResult = runPerformanceTest(
            `原始演算法 - ${scale.name}`,
            () => originalAlgorithms.assignSeats(testData.students, testData.seats, conditions)
        );
        
        // 測試優化演算法
        const optimizedEngine = new FinalOptimizedEngine();
        const optimizedResult = runPerformanceTest(
            `優化演算法 - ${scale.name}`,
            () => optimizedEngine.assignSeats(testData.students, testData.seats, conditions)
        );
        
        // 計算性能提升
        const speedImprovement = ((originalResult.executionTime - optimizedResult.executionTime) / originalResult.executionTime * 100);
        const memoryReduction = ((originalResult.memoryUsed - optimizedResult.memoryUsed) / originalResult.memoryUsed * 100);
        
        comparisonResults.push({
            scale: scale.name,
            original: originalResult,
            optimized: optimizedResult,
            speedImprovement,
            memoryReduction
        });
        
        console.log(`\n性能提升分析:`);
        console.log(`  速度提升: ${speedImprovement.toFixed(1)}%`);
        console.log(`  內存減少: ${memoryReduction.toFixed(1)}%`);
        console.log(`  緩存命中率: ${(optimizedResult.cacheHitRate * 100).toFixed(1)}%`);
    }
    
    // 生成比較報告
    console.log('\n=== 性能比較報告 ===');
    console.log('測試時間:', new Date().toISOString());
    console.log('Node.js版本:', process.version);
    console.log('平台:', process.platform);
    
    console.log('\n詳細比較結果:');
    comparisonResults.forEach(result => {
        console.log(`\n${result.scale}測試:`);
        console.log(`  原始演算法:`);
        console.log(`    執行時間: ${result.original.executionTime.toFixed(2)} ms`);
        console.log(`    內存使用: ${(result.original.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`  優化演算法:`);
        console.log(`    執行時間: ${result.optimized.executionTime.toFixed(2)} ms`);
        console.log(`    內存使用: ${(result.optimized.memoryUsed / 1024 / 1024).toFixed(2)} MB`);
        console.log(`    緩存命中率: ${(result.optimized.cacheHitRate * 100).toFixed(1)}%`);
        console.log(`  性能提升:`);
        console.log(`    速度提升: ${result.speedImprovement.toFixed(1)}%`);
        console.log(`    內存減少: ${result.memoryReduction.toFixed(1)}%`);
    });
    
    // 計算整體性能指標
    const avgSpeedImprovement = comparisonResults.reduce((sum, r) => sum + r.speedImprovement, 0) / comparisonResults.length;
    const avgMemoryReduction = comparisonResults.reduce((sum, r) => sum + r.memoryReduction, 0) / comparisonResults.length;
    const avgCacheHitRate = comparisonResults.reduce((sum, r) => sum + r.optimized.cacheHitRate, 0) / comparisonResults.length;
    
    console.log('\n整體性能指標:');
    console.log(`平均速度提升: ${avgSpeedImprovement.toFixed(1)}%`);
    console.log(`平均內存減少: ${avgMemoryReduction.toFixed(1)}%`);
    console.log(`平均緩存命中率: ${(avgCacheHitRate * 100).toFixed(1)}%`);
    
    // 檢查是否達到性能目標
    console.log('\n性能目標達成情況:');
    console.log(`速度提升目標 (50%): ${avgSpeedImprovement >= 50 ? '✅ 達成' : '❌ 未達成'} (${avgSpeedImprovement.toFixed(1)}%)`);
    console.log(`內存減少目標 (30%): ${avgMemoryReduction >= 30 ? '✅ 達成' : '❌ 未達成'} (${avgMemoryReduction.toFixed(1)}%)`);
    console.log(`緩存命中率目標 (80%): ${avgCacheHitRate >= 0.8 ? '✅ 達成' : '❌ 未達成'} (${(avgCacheHitRate * 100).toFixed(1)}%)`);
    
    // 保存比較數據
    const comparisonData = {
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        comparisonResults: comparisonResults,
        summary: {
            avgSpeedImprovement,
            avgMemoryReduction,
            avgCacheHitRate
        }
    };
    
    const fs = require('fs');
    fs.writeFileSync('performance_comparison.json', JSON.stringify(comparisonData, null, 2));
    console.log('\n比較數據已保存到 performance_comparison.json');
    
    return comparisonData;
}

// 執行比較測試
if (require.main === module) {
    runPerformanceComparison();
}

module.exports = {
    runPerformanceComparison
};
