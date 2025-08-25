// ConflictChecker.Phase1.3.minimal.test.js - 最小化測試
const { ConflictChecker } = require('../ConflictChecker.js');

console.log('=== 最小化測試 ConflictChecker Phase 1.3 ===');

try {
    const checker = new ConflictChecker();
    console.log('✓ ConflictChecker 實例創建成功');
    
    const testStudents = [{ id: 'student1', name: '學生1' }];
    const testSeats = [{ row: 1, col: 1, isValid: true, groupId: 'group1' }];
    const testConditions = [{ type: 'adjacent', students: [['student1', 'student1']] }];
    
    checker.initialize(testStudents, testSeats, testConditions);
    console.log('✓ 初始化成功');
    
    if (checker.processedConditions) {
        console.log('✓ 條件預處理功能存在');
    }
    
    if (checker.conditionCache) {
        console.log('✓ 條件緩存功能存在');
    }
    
    if (checker.conditionIndexes) {
        console.log('✓ 條件索引功能存在');
    }
    
    if (typeof checker.simplifyConditions === 'function') {
        console.log('✓ 條件簡化功能存在');
    }
    
    if (typeof checker.mergeConditions === 'function') {
        console.log('✓ 條件合併功能存在');
    }
    
    if (typeof checker.decomposeConditions === 'function') {
        console.log('✓ 條件分解功能存在');
    }
    
    if (typeof checker.validateConditions === 'function') {
        console.log('✓ 條件驗證功能存在');
    }
    
    console.log('=== Phase 1.3 基本功能驗證完成 ===');
    
} catch (error) {
    console.error('✗ 錯誤:', error.message);
}
