// InitializeMultipleStarts.test.js - 多起點初始化測試
const { SeatAssignmentEngine } = require('../SeatAssignmentEngine.js');

// 簡單測試函數
function runTests() {
    console.log('開始多起點初始化測試...\n');

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
        { id: 'S1', name: 'Alice', academicScore: 85, behaviorScore: 90, specialNeeds: false },
        { id: 'S2', name: 'Bob', academicScore: 92, behaviorScore: 85, specialNeeds: false },
        { id: 'S3', name: 'Charlie', academicScore: 78, behaviorScore: 88, specialNeeds: true },
        { id: 'S4', name: 'Diana', academicScore: 95, behaviorScore: 92, specialNeeds: false },
        { id: 'S5', name: 'Eve', academicScore: 88, behaviorScore: 87, specialNeeds: false }
    ];

    const testSeats = [
        { id: 'seat_1_1', row: 1, col: 1, groupId: 'A' },
        { id: 'seat_1_2', row: 1, col: 2, groupId: 'A' },
        { id: 'seat_2_1', row: 2, col: 1, groupId: 'B' },
        { id: 'seat_2_2', row: 2, col: 2, groupId: 'B' },
        { id: 'seat_3_1', row: 3, col: 1, groupId: 'C' }
    ];

    const testConditions = [
        { type: 'adjacent', students: ['S1', 'S2'], seats: ['seat_1_1', 'seat_1_2'] },
        { type: 'group', students: ['S3'], groupId: 'C' },
        { type: 'distance', students: ['S4', 'S5'], minDistance: 2 }
    ];

    const testStudentScores = {
        'S1': 85,
        'S2': 92,
        'S3': 78,
        'S4': 95,
        'S5': 88
    };

    const testGroupBindings = new Map([
        ['S1', 'A'],
        ['S2', 'A'],
        ['S3', 'C'],
        ['S4', 'B'],
        ['S5', 'B']
    ]);

    const testStudentToConditionsMap = new Map([
        ['S1', [testConditions[0]]],
        ['S2', [testConditions[0]]],
        ['S3', [testConditions[1]]],
        ['S4', [testConditions[2]]],
        ['S5', [testConditions[2]]]
    ]);

    // 測試 1: 基本功能測試
    test('應該成功初始化多起點', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap
            );

            if (!result) throw new Error('結果不應該為空');
            if (!result.startPoints) throw new Error('應該包含起點列表');
            if (!result.metadata) throw new Error('應該包含元數據');
            if (!Array.isArray(result.startPoints)) throw new Error('起點列表應該是數組');
            if (result.startPoints.length === 0) throw new Error('應該至少有一個起點');
        } finally {
            engine.dispose();
        }
    });

    // 測試 2: 元數據測試
    test('應該返回正確的元數據', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap
            );

            if (result.metadata.totalStartPoints <= 0) throw new Error('起點數量應該大於0');
            if (result.metadata.generationTime <= 0) throw new Error('生成時間應該大於0');
            if (!Array.isArray(result.metadata.strategies)) throw new Error('策略列表應該是數組');
            if (result.metadata.originalStudentCount !== testStudents.length) throw new Error('學生數量不匹配');
            if (result.metadata.originalSeatCount !== testSeats.length) throw new Error('座位數量不匹配');
        } finally {
            engine.dispose();
        }
    });

    // 測試 3: 起點結構測試
    test('每個起點應該有正確的結構', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap
            );

            for (const startPoint of result.startPoints) {
                if (!startPoint.id) throw new Error('起點應該有ID');
                if (!startPoint.students) throw new Error('起點應該有學生列表');
                if (!startPoint.seats) throw new Error('起點應該有座位列表');
                if (!startPoint.conditions) throw new Error('起點應該有條件列表');
                if (!startPoint.studentScores) throw new Error('起點應該有學生分數');
                if (!startPoint.groupBindings) throw new Error('起點應該有群組綁定');
                if (!startPoint.studentToConditionsMap) throw new Error('起點應該有學生到條件映射');
                if (!startPoint.strategy) throw new Error('起點應該有策略');
                if (!startPoint.priority) throw new Error('起點應該有優先級');
                if (!startPoint.description) throw new Error('起點應該有描述');
            }
        } finally {
            engine.dispose();
        }
    });

    // 測試 4: 配置選項測試
    test('應該尊重 startPointCount 配置', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const options = { startPointCount: 3 };
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap,
                options
            );

            if (result.startPoints.length > 3) throw new Error('起點數量應該不超過3個');
        } finally {
            engine.dispose();
        }
    });

    // 測試 5: 策略配置測試
    test('應該尊重 strategies 配置', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const options = { strategies: ['heuristic'] };
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap,
                options
            );

            const usedStrategies = new Set(result.startPoints.map(sp => sp.strategy));
            if (!usedStrategies.has('heuristic')) throw new Error('應該包含啟發式策略');
        } finally {
            engine.dispose();
        }
    });

    // 測試 6: 數據完整性測試
    test('起點中的數據數量應該與原始數據一致', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const result = engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap
            );

            for (const startPoint of result.startPoints) {
                if (startPoint.students.length !== testStudents.length) {
                    throw new Error('學生數量不匹配');
                }
                if (startPoint.seats.length !== testSeats.length) {
                    throw new Error('座位數量不匹配');
                }
                if (startPoint.conditions.length !== testConditions.length) {
                    throw new Error('條件數量不匹配');
                }
            }
        } finally {
            engine.dispose();
        }
    });

    // 測試 7: 性能測試
    test('應該在合理時間內完成初始化', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            const startTime = Date.now();
            
            engine.initializeMultipleStarts(
                testStudents,
                testSeats,
                testConditions,
                testStudentScores,
                testGroupBindings,
                testStudentToConditionsMap
            );

            const endTime = Date.now();
            const executionTime = endTime - startTime;
            
            if (executionTime >= 1000) throw new Error('應該在1秒內完成');
        } finally {
            engine.dispose();
        }
    });

    // 測試 8: 錯誤處理測試
    test('應該處理空學生列表', () => {
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            logLevel: 'WARN'
        });

        try {
            let errorThrown = false;
            try {
                engine.initializeMultipleStarts(
                    [],
                    testSeats,
                    testConditions,
                    testStudentScores,
                    testGroupBindings,
                    testStudentToConditionsMap
                );
            } catch (error) {
                errorThrown = true;
            }
            
            if (!errorThrown) throw new Error('應該拋出錯誤');
        } finally {
            engine.dispose();
        }
    });

    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    return passedTests === totalTests;
}

// 運行測試
if (require.main === module) {
    runTests();
}

module.exports = { runTests };
