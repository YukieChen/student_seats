/**
 * 性能診斷腳本
 * 找出系統性能問題的根源
 */

console.log('=== 性能診斷開始 ===');

// 檢查模組載入
function checkModuleLoading() {
    console.log('\n1. 檢查模組載入...');
    
    const modules = [
        './assets/js/engines/CompatibilityLayer.js',
        './assets/js/engines/DataMigrator.js',
        './assets/js/engines/FeatureComparator.js',
        './assets/js/engines/DeploymentPlanner.js',
        './assets/js/engines/RiskController.js',
        './assets/js/engines/UserExperienceOptimizer.js'
    ];
    
    const results = [];
    
    for (const module of modules) {
        try {
            const startTime = Date.now();
            require(module);
            const loadTime = Date.now() - startTime;
            console.log(`✅ ${module}: ${loadTime}ms`);
            results.push({ module, success: true, loadTime });
        } catch (error) {
            console.log(`❌ ${module}: ${error.message}`);
            results.push({ module, success: false, error: error.message });
        }
    }
    
    return results;
}

// 檢查演算法性能
function checkAlgorithmPerformance() {
    console.log('\n2. 檢查演算法性能...');
    
    const testData = {
        students: Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `學生${i + 1}` })),
        seats: Array.from({ length: 50 }, (_, i) => ({ 
            id: `S${i + 1}`, 
            row: Math.floor(i / 10), 
            col: i % 10, 
            isValid: true, 
            groupId: `G${Math.floor(i / 10) + 1}` 
        })),
        conditions: []
    };
    
    // 測試簡單分配
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    try {
        const assignments = [];
        const usedSeats = new Set();
        
        for (let i = 0; i < testData.students.length && i < testData.seats.length; i++) {
            const student = testData.students[i];
            const seat = testData.seats[i];
            
            if (!usedSeats.has(seat.id)) {
                assignments.push({ student, seat });
                usedSeats.add(seat.id);
            }
        }
        
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const executionTime = endTime - startTime;
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
        
        console.log(`✅ 簡單分配完成:`);
        console.log(`   - 執行時間: ${executionTime}ms`);
        console.log(`   - 內存使用: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
        console.log(`   - 分配數量: ${assignments.length}/${testData.students.length}`);
        
        return {
            success: true,
            executionTime,
            memoryUsed,
            assignmentCount: assignments.length
        };
        
    } catch (error) {
        console.log(`❌ 演算法執行失敗: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 檢查緩存性能
function checkCachePerformance() {
    console.log('\n3. 檢查緩存性能...');
    
    try {
        const cache = new Map();
        const testSize = 10000;
        
        const startTime = Date.now();
        
        // 填充緩存
        for (let i = 0; i < testSize; i++) {
            cache.set(`key${i}`, `value${i}`);
        }
        
        // 讀取緩存
        let hits = 0;
        for (let i = 0; i < testSize; i++) {
            if (cache.has(`key${i}`)) {
                hits++;
            }
        }
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        const hitRate = (hits / testSize) * 100;
        
        console.log(`✅ 緩存測試完成:`);
        console.log(`   - 執行時間: ${executionTime}ms`);
        console.log(`   - 緩存大小: ${cache.size}`);
        console.log(`   - 命中率: ${hitRate.toFixed(2)}%`);
        
        return {
            success: true,
            executionTime,
            cacheSize: cache.size,
            hitRate
        };
        
    } catch (error) {
        console.log(`❌ 緩存測試失敗: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// 主診斷函數
async function runDiagnosis() {
    console.log('開始性能診斷...\n');
    
    const results = {
        moduleLoading: checkModuleLoading(),
        algorithmPerformance: checkAlgorithmPerformance(),
        cachePerformance: checkCachePerformance()
    };
    
    console.log('\n=== 診斷結果摘要 ===');
    
    // 模組載入結果
    const failedModules = results.moduleLoading.filter(r => !r.success);
    if (failedModules.length > 0) {
        console.log(`❌ 模組載入問題: ${failedModules.length} 個模組載入失敗`);
        failedModules.forEach(m => console.log(`   - ${m.module}: ${m.error}`));
    } else {
        console.log('✅ 所有模組載入正常');
    }
    
    // 演算法性能結果
    if (results.algorithmPerformance.success) {
        const perf = results.algorithmPerformance;
        if (perf.executionTime > 1000) {
            console.log(`⚠️ 演算法執行時間較長: ${perf.executionTime}ms`);
        } else {
            console.log('✅ 演算法性能正常');
        }
    } else {
        console.log(`❌ 演算法執行失敗: ${results.algorithmPerformance.error}`);
    }
    
    // 緩存性能結果
    if (results.cachePerformance.success) {
        const cache = results.cachePerformance;
        if (cache.hitRate < 80) {
            console.log(`⚠️ 緩存命中率較低: ${cache.hitRate.toFixed(2)}%`);
        } else {
            console.log('✅ 緩存性能正常');
        }
    } else {
        console.log(`❌ 緩存測試失敗: ${results.cachePerformance.error}`);
    }
    
    return results;
}

// 執行診斷
runDiagnosis().then(results => {
    console.log('\n=== 診斷完成 ===');
}).catch(error => {
    console.error('診斷過程中發生錯誤:', error);
});
