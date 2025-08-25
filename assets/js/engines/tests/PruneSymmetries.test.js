// PruneSymmetries.test.js - 對稱性剪枝測試
const { SeatAssignmentEngine } = require('../SeatAssignmentEngine.js');

// 簡單測試函數
function runTests() {
    console.log('開始對稱性剪枝測試...\n');

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
    const testCandidates = [
        { id: 'seat1', row: 1, col: 1, group: 'A' },
        { id: 'seat2', row: 1, col: 2, group: 'A' },
        { id: 'seat3', row: 2, col: 1, group: 'B' },
        { id: 'seat4', row: 2, col: 2, group: 'B' },
        { id: 'seat5', row: 3, col: 1, group: 'A' },
        { id: 'seat6', row: 3, col: 2, group: 'A' }
    ];

    const testAssignment = new Map([
        ['S1', { id: 'seat0', row: 0, col: 0, group: 'A' }],
        ['S2', { id: 'seat7', row: 4, col: 1, group: 'B' }]
    ]);

    const testCurrentState = {
        currentStudent: { id: 'S3', name: '學生3', group: 'A' },
        remainingStudents: [
            { id: 'S4', name: '學生4', group: 'B' },
            { id: 'S5', name: '學生5', group: 'A' }
        ]
    };

    // 測試 1: 基本功能測試
    test('應該能夠執行對稱性剪枝', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            const result = engine.pruneSymmetries(
                testCandidates,
                testCurrentState,
                testAssignment
            );

            if (!Array.isArray(result)) throw new Error('應該返回數組');
            if (result.length > testCandidates.length) throw new Error('剪枝後數量不應該增加');
            if (result.length === 0) throw new Error('應該至少保留一個候選');
            
            console.log(`剪枝結果: ${result.length}/${testCandidates.length} 候選保留`);
        } finally {
            engine.dispose();
        }
    });

    // 測試 2: 空候選處理
    test('應該處理空候選列表', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            const result = engine.pruneSymmetries(
                [],
                testCurrentState,
                testAssignment
            );

            if (!Array.isArray(result)) throw new Error('應該返回數組');
            if (result.length !== 0) throw new Error('空輸入應該返回空數組');
        } finally {
            engine.dispose();
        }
    });

    // 測試 3: 單個候選處理
    test('應該處理單個候選', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            const singleCandidate = [testCandidates[0]];
            const result = engine.pruneSymmetries(
                singleCandidate,
                testCurrentState,
                testAssignment
            );

            if (!Array.isArray(result)) throw new Error('應該返回數組');
            if (result.length !== 1) throw new Error('單個候選應該保留');
            if (result[0].id !== singleCandidate[0].id) throw new Error('候選應該保持不變');
        } finally {
            engine.dispose();
        }
    });

    // 測試 4: 對稱候選檢測
    test('應該檢測對稱候選', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            // 創建對稱的候選
            const symmetricCandidates = [
                { id: 'seat1', row: 1, col: 1, group: 'A' },
                { id: 'seat2', row: 1, col: 1, group: 'A' }, // 相同位置
                { id: 'seat3', row: 2, col: 2, group: 'A' },
                { id: 'seat4', row: 2, col: 2, group: 'A' }  // 相同位置
            ];

            const result = engine.pruneSymmetries(
                symmetricCandidates,
                testCurrentState,
                testAssignment
            );

            if (!Array.isArray(result)) throw new Error('應該返回數組');
            if (result.length >= symmetricCandidates.length) throw new Error('應該剪枝對稱候選');
            
            console.log(`對稱檢測結果: ${result.length}/${symmetricCandidates.length} 候選保留`);
        } finally {
            engine.dispose();
        }
    });

    // 測試 5: 錯誤處理
    test('應該處理錯誤情況', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            // 傳入無效數據
            const result = engine.pruneSymmetries(
                null,
                testCurrentState,
                testAssignment
            );

            // 即使輸入無效，也應該返回原始候選或空數組
            if (!Array.isArray(result)) throw new Error('應該返回數組');
        } finally {
            engine.dispose();
        }
    });

    // 測試 6: 性能測試
    test('應該在合理時間內完成', () => {
        const engine = new SeatAssignmentEngine({
            logLevel: 'WARN',
            timeout: 10000
        });

        try {
            // 創建較大的候選列表
            const largeCandidates = [];
            for (let i = 0; i < 100; i++) {
                largeCandidates.push({
                    id: `seat${i}`,
                    row: Math.floor(i / 10),
                    col: i % 10,
                    group: i % 2 === 0 ? 'A' : 'B'
                });
            }

            const startTime = Date.now();
            const result = engine.pruneSymmetries(
                largeCandidates,
                testCurrentState,
                testAssignment
            );
            const endTime = Date.now();

            if (!Array.isArray(result)) throw new Error('應該返回數組');
            if (endTime - startTime > 1000) throw new Error('處理時間不應該超過1秒');
            
            console.log(`性能測試: ${result.length}/${largeCandidates.length} 候選保留，處理時間: ${endTime - startTime}ms`);
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
