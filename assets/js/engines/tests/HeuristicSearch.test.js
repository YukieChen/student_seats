// HeuristicSearch.test.js - 啟發式搜索測試
import { SeatAssignmentEngine } from '../SeatAssignmentEngine.js';

// 簡單測試函數
function runTests() {
    console.log('開始啟發式搜索測試...\n');

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

    // 測試 1: 啟發式搜索基本功能測試
    test('啟發式搜索基本功能測試', async () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        const config = {
            students: ['student1', 'student2', 'student3'],
            seats: [
                { row: 1, col: 1, groupId: 'A', isValid: true },
                { row: 1, col: 2, groupId: 'A', isValid: true },
                { row: 2, col: 1, groupId: 'B', isValid: true }
            ],
            conditions: [
                {
                    type: 'assign_group',
                    students: [['student1']],
                    group: 'A'
                }
            ],
            useHeuristicSearch: true
        };

        const result = await engine.solveAssignment(config);

        if (!result.success) throw new Error('啟發式搜索應該成功');
        if (!(result.assignment instanceof Map)) throw new Error('結果應該包含 Map 類型的分配');
        if (result.unassignedStudents.length !== 0) throw new Error('所有學生都應該被分配');
    });

    // 測試 2: 啟發式搜索與回溯搜索比較
    test('啟發式搜索與回溯搜索比較', async () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        const baseConfig = {
            students: ['student1', 'student2'],
            seats: [
                { row: 1, col: 1, groupId: 'A', isValid: true },
                { row: 1, col: 2, groupId: 'B', isValid: true }
            ],
            conditions: []
        };

        // 測試啟發式搜索
        const heuristicConfig = { ...baseConfig, useHeuristicSearch: true };
        const heuristicResult = await engine.solveAssignment(heuristicConfig);

        // 測試回溯搜索
        const backtrackConfig = { ...baseConfig, useHeuristicSearch: false };
        const backtrackResult = await engine.solveAssignment(backtrackConfig);

        // 兩種方法都應該成功
        if (!heuristicResult.success) throw new Error('啟發式搜索應該成功');
        if (!backtrackResult.success) throw new Error('回溯搜索應該成功');

        // 檢查性能指標
        if (!heuristicResult.performanceMetrics) throw new Error('啟發式搜索應該有性能指標');
        if (!backtrackResult.performanceMetrics) throw new Error('回溯搜索應該有性能指標');
    });

    // 測試 3: 啟發式搜索處理複雜條件
    test('啟發式搜索處理複雜條件', async () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        const config = {
            students: ['student1', 'student2', 'student3'],
            seats: [
                { row: 1, col: 1, groupId: 'A', isValid: true },
                { row: 1, col: 2, groupId: 'A', isValid: true },
                { row: 2, col: 1, groupId: 'B', isValid: true }
            ],
            conditions: [
                {
                    type: 'adjacent_and_group',
                    students: [['student1', 'student2']],
                    group: 'A'
                }
            ],
            useHeuristicSearch: true
        };

        const result = await engine.solveAssignment(config);

        // 應該能夠處理複雜條件
        if (!result.success) throw new Error('應該能夠處理複雜條件');
        if (result.assignment.size !== 3) throw new Error('應該分配所有3個學生');
    });

    // 測試 4: 啟發式搜索超時處理
    test('啟發式搜索超時處理', async () => {
        const engineWithShortTimeout = new SeatAssignmentEngine({
            timeout: 1, // 1毫秒超時
            logLevel: 'WARN'
        });

        const config = {
            students: Array.from({ length: 50 }, (_, i) => `student${i}`),
            seats: Array.from({ length: 50 }, (_, i) => ({
                row: Math.floor(i / 5) + 1,
                col: (i % 5) + 1,
                groupId: 'A',
                isValid: true
            })),
            conditions: [],
            useHeuristicSearch: true
        };

        const result = await engineWithShortTimeout.solveAssignment(config);

        // 應該因為超時而失敗
        if (result.success) throw new Error('應該因為超時而失敗');
        if (result.error !== '超時') throw new Error('錯誤信息應該是超時');
    });

    // 測試結果總結
    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    return { passed: passedTests, total: totalTests };
}

// 執行測試
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().then(result => {
        if (result.passed === result.total) {
            console.log('🎉 所有測試通過！');
            process.exit(0);
        } else {
            console.log('❌ 部分測試失敗');
            process.exit(1);
        }
    }).catch(error => {
        console.error('測試執行錯誤:', error);
        process.exit(1);
    });
}
