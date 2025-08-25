// TransactionalAssignment.test.js - 事務性分配管理測試
import { TransactionalAssignment } from '../TransactionalAssignment.js';

// 簡單測試函數
function runTests() {
    console.log('開始 TransactionalAssignment 測試...\n');

    let passedTests = 0;
    let totalTests = 0;

    function test(name, testFunction) {
        totalTests++;
        try {
            testFunction();
            console.log(`✅ ${name}`);
            passedTests++;
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
        }
    }

    // 測試 1: 構造函數
    test('構造函數初始化', () => {
        const transaction = new TransactionalAssignment();
        if (!transaction.committedAssignments) throw new Error('committedAssignments 應該存在');
        if (!transaction.pendingAssignments) throw new Error('pendingAssignments 應該存在');
        if (!transaction.snapshots) throw new Error('snapshots 應該存在');
        if (!transaction.operationHistory) throw new Error('operationHistory 應該存在');
    });

    // 測試 2: 分配操作
    test('分配操作', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        const result = transaction.assign('student1', seat, { reason: 'INITIAL' });
        
        if (!result.success) throw new Error('分配應該成功');
        if (!result.operationId) throw new Error('應該有操作ID');
        if (transaction.pendingAssignments.size !== 1) throw new Error('待處理分配應該有 1 個');
        if (!transaction.pendingAssignments.has('student1')) throw new Error('學生1 應該在待處理分配中');
    });

    // 測試 3: 提交操作
    test('提交操作', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        const commitResult = transaction.commit();
        
        if (!commitResult.success) throw new Error('提交應該成功');
        if (transaction.committedAssignments.size !== 1) throw new Error('已提交分配應該有 1 個');
        if (transaction.pendingAssignments.size !== 0) throw new Error('待處理分配應該為空');
        if (transaction.snapshots.length !== 1) throw new Error('應該有 1 個快照');
    });

    // 測試 4: 回滾操作
    test('回滾操作', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        const rollbackResult = transaction.rollback();
        
        if (!rollbackResult.success) throw new Error('回滾應該成功');
        if (transaction.pendingAssignments.size !== 0) throw new Error('待處理分配應該為空');
        if (transaction.snapshots.length !== 1) throw new Error('應該有 1 個快照');
    });

    // 測試 5: 快照創建
    test('快照創建', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        const snapshotResult = transaction.createSnapshot('MANUAL');
        
        if (!snapshotResult.success) throw new Error('快照創建應該成功');
        if (!snapshotResult.snapshotId) throw new Error('應該有快照ID');
        if (transaction.snapshots.length !== 2) throw new Error('應該有 2 個快照');
    });

    // 測試 6: 當前狀態獲取
    test('當前狀態獲取', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        const currentState = transaction.getCurrentState();
        
        if (!currentState.committedAssignments) throw new Error('應該有已提交分配');
        if (!currentState.pendingAssignments) throw new Error('應該有待處理分配');
        if (!currentState.snapshots) throw new Error('應該有快照');
        if (currentState.committedAssignments.size !== 1) throw new Error('已提交分配應該有 1 個');
    });

    // 測試 7: 狀態恢復
    test('狀態恢復', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        const snapshotId = transaction.snapshots[0].id;
        
        transaction.assign('student2', { id: 'seat2', name: '座位2' }, { reason: 'PENDING' });
        
        const restoreResult = transaction.restoreState(snapshotId);
        
        if (!restoreResult.success) throw new Error('狀態恢復應該成功');
        if (transaction.pendingAssignments.size !== 0) throw new Error('待處理分配應該為空');
        if (transaction.committedAssignments.size !== 1) throw new Error('已提交分配應該有 1 個');
    });

    // 測試 8: 狀態比較
    test('狀態比較', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        const state1 = transaction.getCurrentState();
        transaction.assign('student2', { id: 'seat2', name: '座位2' }, { reason: 'PENDING' });
        const state2 = transaction.getCurrentState();
        
        const comparison = transaction.compareStates(state1, state2);
        
        if (!comparison.differences) throw new Error('應該有差異');
        if (comparison.differences.length === 0) throw new Error('應該檢測到差異');
        if (!comparison.summary) throw new Error('應該有比較摘要');
    });

    // 測試 9: 操作歷史
    test('操作歷史', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        if (transaction.operationHistory.length !== 2) throw new Error('應該有 2 個操作記錄');
        if (transaction.operationHistory[0].type !== 'ASSIGN') throw new Error('第一個操作應該是 ASSIGN');
        if (transaction.operationHistory[1].type !== 'COMMIT') throw new Error('第二個操作應該是 COMMIT');
    });

    // 測試 10: 歷史查詢
    test('歷史查詢', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        const queryResult = transaction.queryHistory({ type: 'ASSIGN' });
        
        if (queryResult.length !== 1) throw new Error('查詢結果應該有 1 個');
        if (queryResult[0].type !== 'ASSIGN') throw new Error('查詢結果應該是 ASSIGN 類型');
    });

    // 測試 11: 歷史清理
    test('歷史清理', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        transaction.clearHistory({ beforeTime: Date.now() });
        
        if (transaction.operationHistory.length !== 0) throw new Error('清理後歷史應該為空');
    });

    // 測試 12: 統計信息
    test('統計信息', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        transaction.assign('student2', { id: 'seat2', name: '座位2' }, { reason: 'PENDING' });
        
        const stats = transaction.getStatistics();
        
        if (!stats.totalOperations) throw new Error('應該有總操作數');
        if (!stats.committedAssignments) throw new Error('應該有已提交分配數');
        if (!stats.pendingAssignments) throw new Error('應該有待處理分配數');
        if (!stats.snapshots) throw new Error('應該有快照數');
        if (stats.totalOperations !== 3) throw new Error('總操作數應該為 3');
    });

    // 測試 13: 狀態驗證
    test('狀態驗證', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        
        const validation = transaction.validateState();
        
        if (!validation.isValid) throw new Error('狀態應該有效');
        if (!validation.issues) throw new Error('應該有問題列表');
        if (validation.issues.length > 0) throw new Error('不應該有問題');
    });

    // 測試 14: 邊界條件
    test('邊界條件', () => {
        const transaction = new TransactionalAssignment();
        
        // 測試空分配
        const emptyResult = transaction.assign('student1', null, { reason: 'TEST' });
        if (emptyResult.success) throw new Error('空分配應該失敗');
        
        // 測試重複分配
        const seat = { id: 'seat1', name: '座位1' };
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        const duplicateResult = transaction.assign('student1', seat, { reason: 'DUPLICATE' });
        if (duplicateResult.success) throw new Error('重複分配應該失敗');
    });

    // 測試 15: 資源清理
    test('資源清理', () => {
        const transaction = new TransactionalAssignment();
        const seat = { id: 'seat1', name: '座位1' };
        
        transaction.assign('student1', seat, { reason: 'INITIAL' });
        transaction.commit();
        
        if (transaction.committedAssignments.size === 0) throw new Error('應該有已提交分配');
        
        transaction.dispose();
        
        if (transaction.committedAssignments.size !== 0) throw new Error('清理後應該為空');
        if (transaction.pendingAssignments.size !== 0) throw new Error('清理後應該為空');
        if (transaction.snapshots.length !== 0) throw new Error('清理後應該為空');
        if (transaction.operationHistory.length !== 0) throw new Error('清理後應該為空');
    });

    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有測試通過！TransactionalAssignment.js 功能正常');
    } else {
        console.log('⚠️ 部分測試失敗，需要檢查');
    }
}

// 運行測試
runTests();
