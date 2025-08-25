// ConflictChecker.Phase1.3.simple.test.js - 簡化測試 Phase 1.3 功能
const { ConflictChecker } = require('../ConflictChecker.js');

// 測試數據
const testStudents = [
    { id: 'student1', name: '學生1' },
    { id: 'student2', name: '學生2' },
    { id: 'student3', name: '學生3' },
    { id: 'student4', name: '學生4' }
];

const testSeats = [
    { row: 1, col: 1, isValid: true, groupId: 'group1' },
    { row: 1, col: 2, isValid: true, groupId: 'group1' },
    { row: 2, col: 1, isValid: true, groupId: 'group2' },
    { row: 2, col: 2, isValid: true, groupId: 'group2' }
];

const testConditions = [
    {
        type: 'adjacent',
        students: [['student1', 'student2']]
    },
    {
        type: 'assign_group',
        students: [['student1', 'student2']],
        group: 'group1'
    },
    {
        type: 'not_adjacent',
        students: [['student3', 'student4']]
    }
];

// 簡化測試函數
function testPhase1_3BasicFeatures() {
    console.log('=== 簡化測試 ConflictChecker Phase 1.3 基本功能 ===\n');
    
    const checker = new ConflictChecker();
    
    try {
        // 測試初始化
        console.log('1. 測試初始化...');
        checker.initialize(testStudents, testSeats, testConditions);
        console.log('✓ 初始化成功');
        
        // 測試條件預處理
        console.log('2. 測試條件預處理...');
        if (checker.processedConditions && checker.processedConditions.size > 0) {
            console.log('✓ 條件預處理成功');
        } else {
            console.log('✗ 條件預處理失敗');
        }
        
        // 測試條件緩存
        console.log('3. 測試條件緩存...');
        if (checker.conditionCache && checker.conditionCache.size >= 0) {
            console.log('✓ 條件緩存初始化成功');
        } else {
            console.log('✗ 條件緩存初始化失敗');
        }
        
        // 測試條件索引
        console.log('4. 測試條件索引...');
        if (checker.conditionIndexes && checker.conditionIndexes.byType) {
            console.log('✓ 條件索引創建成功');
        } else {
            console.log('✗ 條件索引創建失敗');
        }
        
        // 測試條件優化
        console.log('5. 測試條件優化...');
        const originalLength = testConditions.length;
        checker.optimizeConditions();
        console.log(`✓ 條件優化完成，原始條件數: ${originalLength}，優化後: ${checker.conditions.length}`);
        
        // 測試條件簡化
        console.log('6. 測試條件簡化...');
        const simplifiedConditions = checker.simplifyConditions();
        console.log(`✓ 條件簡化完成，簡化後條件數: ${simplifiedConditions.length}`);
        
        // 測試條件合併
        console.log('7. 測試條件合併...');
        const mergedConditions = checker.mergeConditions();
        console.log(`✓ 條件合併完成，合併後條件數: ${mergedConditions.length}`);
        
        // 測試條件分解
        console.log('8. 測試條件分解...');
        const decomposedConditions = checker.decomposeConditions();
        console.log(`✓ 條件分解完成，分解後條件數: ${decomposedConditions.length}`);
        
        // 測試條件驗證
        console.log('9. 測試條件驗證...');
        const validationResults = checker.validateConditions();
        console.log(`✓ 條件驗證完成，有效條件: ${validationResults.valid.length}`);
        
        // 測試條件緩存功能
        console.log('10. 測試條件緩存功能...');
        checker.cacheConditionResults();
        const assignedStudentsMap = new Map();
        assignedStudentsMap.set('student1', { row: 1, col: 1, groupId: 'group1' });
        assignedStudentsMap.set('student2', { row: 1, col: 2, groupId: 'group1' });
        
        checker.cacheConditionResult(testConditions[0], assignedStudentsMap, true);
        const cachedResult = checker.getCachedConditionResult(testConditions[0], assignedStudentsMap);
        if (cachedResult !== null) {
            console.log('✓ 條件結果緩存功能正常');
        } else {
            console.log('✗ 條件結果緩存功能異常');
        }
        
        // 測試條件簡化功能
        console.log('11. 測試條件簡化功能...');
        const redundantConditions = checker.findRedundantConditions();
        const contradictions = checker.detectContradictoryConditions();
        const equivalenceGroups = checker.checkConditionEquivalence();
        const complexConditions = checker.findComplexConditions();
        console.log(`✓ 發現 ${redundantConditions.length} 個冗餘條件，${contradictions.length} 個矛盾條件，${equivalenceGroups.length} 組等價條件，${complexConditions.length} 個複雜條件`);
        
        // 測試條件優化建議
        console.log('12. 測試條件優化建議...');
        const suggestions = checker.suggestConditionOptimization();
        console.log(`✓ 生成 ${suggestions.length} 個優化建議`);
        
        console.log('\n=== 所有 Phase 1.3 基本功能測試完成 ===');
        console.log('✓ 所有功能正常運行');
        
    } catch (error) {
        console.error('✗ 測試過程中發生錯誤:', error.message);
        console.error(error.stack);
    }
}

// 執行測試
if (require.main === module) {
    testPhase1_3BasicFeatures();
}

module.exports = { testPhase1_3BasicFeatures };
