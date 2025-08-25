// ConflictChecker.Phase1.3.basic.test.js - 基本功能檢查
console.log('=== 基本功能檢查 ===');

try {
    const { ConflictChecker } = require('../ConflictChecker.js');
    console.log('✓ 模組載入成功');
    
    const checker = new ConflictChecker();
    console.log('✓ 實例創建成功');
    
    // 檢查方法是否存在
    const methods = [
        'simplifyConditions',
        'mergeConditions', 
        'decomposeConditions',
        'validateConditions',
        'cacheConditionResults',
        'findRedundantConditions',
        'detectContradictoryConditions',
        'checkConditionEquivalence',
        'suggestConditionOptimization'
    ];
    
    let successCount = 0;
    for (const method of methods) {
        if (typeof checker[method] === 'function') {
            console.log(`✓ ${method} 方法存在`);
            successCount++;
        } else {
            console.log(`✗ ${method} 方法缺失`);
        }
    }
    
    console.log(`\n=== 檢查完成: ${successCount}/${methods.length} 個方法存在 ===`);
    
} catch (error) {
    console.error('✗ 錯誤:', error.message);
}
