// ParallelSearch.test.js - 並行搜索測試
const { SeatAssignmentEngine } = require('../SeatAssignmentEngine.js');

// 簡單測試函數
function runTests() {
    console.log('開始並行搜索測試...\n');

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

    // 測試數據
    const testStudents = [
        { id: 'S1', name: '學生1', group: 'A' },
        { id: 'S2', name: '學生2', group: 'A' },
        { id: 'S3', name: '學生3', group: 'B' },
        { id: 'S4', name: '學生4', group: 'B' }
    ];

    const testSeats = [
        { id: 'seat1', row: 1, col: 1, group: 'A' },
        { id: 'seat2', row: 1, col: 2, group: 'A' },
        { id: 'seat3', row: 2, col: 1, group: 'B' },
        { id: 'seat4', row: 2, col: 2, group: 'B' }
    ];

    const testConditions = [
        {
            type: 'adjacent',
            students: ['S1', 'S2'],
            seats: ['seat1', 'seat2'],
            weight: 10
        }
    ];

    // 測試 1: 基本功能測試
    test('應該能夠執行並行搜索', async () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            const studentScores = { 'S1': 10, 'S2': 8, 'S3': 6, 'S4': 4 };
            const groupBindings = new Map();
            const studentToConditionsMap = new Map();

            console.log('開始執行並行搜索...');
            const result = await engine.parallelSearch(
                testStudents,
                testSeats,
                testConditions,
                studentScores,
                groupBindings,
                studentToConditionsMap,
                {
                    maxWorkers: 2,
                    timeout: 5000,
                    enableProgressCallback: false
                }
            );

            console.log('並行搜索結果:', result);

            if (!result.success) {
                console.log('搜索失敗，錯誤信息:', result.error);
                throw new Error(`搜索失敗: ${result.error}`);
            }
            if (!result.solution) throw new Error('應該返回解決方案');
            if (result.score < 0) throw new Error('分數應該大於等於0');
            if (!result.metadata) throw new Error('應該返回元數據');
            if (result.metadata.totalStartPoints <= 0) throw new Error('應該有起點');
            if (result.metadata.completedTasks <= 0) throw new Error('應該有完成的任務');
        } catch (error) {
            console.log('測試執行錯誤:', error.message);
            throw error;
        } finally {
            engine.dispose();
        }
    });

    // 輸出測試結果
    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    console.log(`成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    return passedTests === totalTests;
}

// 如果直接運行此文件，則執行測試
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
