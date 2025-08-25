// PruneInvalidPaths.test.js - 測試無效路徑剪枝功能
import { SeatAssignmentEngine } from '../SeatAssignmentEngine.js';

// 自定義測試框架
function test(name, testFunction) {
    console.log(`\n🧪 測試: ${name}`);
    try {
        testFunction();
        console.log(`✅ ${name} - 通過`);
        return true;
    } catch (error) {
        console.log(`❌ ${name} - 失敗: ${error.message}`);
        console.error(error);
        return false;
    }
}

function runTests() {
    console.log('🚀 開始執行 PruneInvalidPaths 測試');

    let passedTests = 0;
    let totalTests = 0;

    // 測試基本剪枝功能
    totalTests++;
    if (test('基本剪枝功能', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        const seats = [{ id: 1, row: 1, column: 1 }, { id: 2, row: 1, column: 2 }];
        const conditions = [];

        const result = engine.pruneInvalidPaths(students, seats, conditions);

        if (result.shouldPrune !== false) {
            throw new Error(`預期不剪枝，但得到: ${result.shouldPrune}`);
        }
    })) passedTests++;

    // 測試已嘗試狀態的剪枝
    totalTests++;
    if (test('已嘗試狀態剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];

        // 第一次檢查
        const result1 = engine.pruneInvalidPaths(students, seats, conditions);
        if (result1.shouldPrune !== false) {
            throw new Error(`第一次檢查預期不剪枝，但得到: ${result1.shouldPrune}`);
        }

        // 記錄無效路徑
        const stateKey = engine.generateStateKey(students, seats, {});
        engine.invalidPathsCache.add(stateKey);

        // 第二次檢查應該被剪枝
        const result2 = engine.pruneInvalidPaths(students, seats, conditions);
        if (result2.shouldPrune !== true) {
            throw new Error(`第二次檢查預期剪枝，但得到: ${result2.shouldPrune}`);
        }
        if (result2.reason !== '已嘗試過的無效狀態') {
            throw new Error(`預期原因: 已嘗試過的無效狀態，但得到: ${result2.reason}`);
        }
    })) passedTests++;

    // 測試資源不足剪枝
    totalTests++;
    if (test('資源不足剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' },
            { id: 3, name: 'Charlie' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 1, column: 2 }
        ]; // 座位數量少於學生數量
        const conditions = [];

        const result = engine.pruneInvalidPaths(students, seats, conditions);

        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '資源不足') {
            throw new Error(`預期原因: 資源不足，但得到: ${result.reason}`);
        }
        if (result.details.resourceType !== 'basic_seats') {
            throw new Error(`預期資源類型: basic_seats，但得到: ${result.details.resourceType}`);
        }
    })) passedTests++;

    // 測試相鄰條件衝突剪枝
    totalTests++;
    if (test('相鄰條件衝突剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 2, column: 2 } // 不相鄰的座位
        ];
        const conditions = [
            {
                type: 'adjacent',
                student1: { id: 1, name: 'Alice' },
                student2: { id: 2, name: 'Bob' }
            }
        ];

        const proposedAssignment = new Map();
        proposedAssignment.set(students[0], seats[0]);
        proposedAssignment.set(students[1], seats[1]);

        const result = engine.pruneInvalidPaths(students, seats, conditions, {}, proposedAssignment);

        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '會導致衝突的狀態') {
            throw new Error(`預期原因: 會導致衝突的狀態，但得到: ${result.reason}`);
        }
        if (result.details.conflictType !== 'adjacent_condition') {
            throw new Error(`預期衝突類型: adjacent_condition，但得到: ${result.details.conflictType}`);
        }
    })) passedTests++;

    // 測試群組條件衝突剪枝
    totalTests++;
    if (test('群組條件衝突剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice', group: 'A' },
            { id: 2, name: 'Bob', group: 'A' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 1, column: 2 }
        ];
        const conditions = [
            {
                type: 'assign_group',
                group: 'A',
                seat: { id: 1, row: 1, column: 1 }
            }
        ];

        const proposedAssignment = new Map();
        proposedAssignment.set(students[0], seats[0]);
        proposedAssignment.set(students[1], seats[1]); // 第二個學生分配到不同座位

        const result = engine.pruneInvalidPaths(students, seats, conditions, {}, proposedAssignment);

        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '會導致衝突的狀態') {
            throw new Error(`預期原因: 會導致衝突的狀態，但得到: ${result.reason}`);
        }
        if (result.details.conflictType !== 'group_condition') {
            throw new Error(`預期衝突類型: group_condition，但得到: ${result.details.conflictType}`);
        }
    })) passedTests++;

    // 測試約束違反剪枝
    totalTests++;
    if (test('約束違反剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice', group: 'A' },
            { id: 2, name: 'Bob', group: 'A' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 1, column: 2 }
        ]; // 有足夠的座位，但群組條件無法滿足
        const conditions = [
            {
                type: 'assign_group',
                group: 'A',
                seat: { id: 3, row: 2, column: 1 } // 指定一個不存在的座位
            }
        ];

        const result = engine.pruneInvalidPaths(students, seats, conditions);

        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '違反約束條件') {
            throw new Error(`預期原因: 違反約束條件，但得到: ${result.reason}`);
        }
        if (result.details.constraintType !== 'group_constraint') {
            throw new Error(`預期約束類型: group_constraint，但得到: ${result.details.constraintType}`);
        }
    })) passedTests++;

    // 測試無效模式剪枝
    totalTests++;
    if (test('無效模式剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];

        // 記錄循環模式（長度大於3）
        const cyclePattern = ['A', 'B', 'C', 'D', 'E'];
        const patternKey = engine.generatePatternKey(cyclePattern);
        engine.invalidPathPatterns.set(patternKey, { count: 1, lastSeen: Date.now() });

        const currentState = {
            cyclePattern: cyclePattern
        };

        const result = engine.pruneInvalidPaths(students, seats, conditions, currentState);

        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '匹配已知無效模式') {
            throw new Error(`預期原因: 匹配已知無效模式，但得到: ${result.reason}`);
        }
        if (result.details.patternType !== 'cycle_pattern') {
            throw new Error(`預期模式類型: cycle_pattern，但得到: ${result.details.patternType}`);
        }
    })) passedTests++;

    // 測試統計信息
    totalTests++;
    if (test('統計信息記錄', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];

        // 執行多次剪枝檢查
        engine.pruneInvalidPaths(students, seats, conditions);
        engine.pruneInvalidPaths(students, seats, conditions);
        engine.pruneInvalidPaths(students, seats, conditions);

        if (engine.pruningStats.totalChecks !== 3) {
            throw new Error(`預期總檢查次數: 3，但得到: ${engine.pruningStats.totalChecks}`);
        }
    })) passedTests++;

    // 測試狀態鍵生成
    totalTests++;
    if (test('狀態鍵生成', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 2, name: 'Bob' },
            { id: 1, name: 'Alice' }
        ];
        const seats = [
            { id: 2, row: 1, column: 2 },
            { id: 1, row: 1, column: 1 }
        ];

        const stateKey = engine.generateStateKey(students, seats, {});

        // 狀態鍵應該包含排序後的學生和座位ID
        if (!stateKey.includes('1,2')) {
            throw new Error(`狀態鍵應該包含排序後的學生ID: ${stateKey}`);
        }
        if (!stateKey.includes('1,2')) {
            throw new Error(`狀態鍵應該包含排序後的座位ID: ${stateKey}`);
        }
    })) passedTests++;

    // 測試座位相鄰檢查
    totalTests++;
    if (test('座位相鄰檢查', () => {
        const engine = new SeatAssignmentEngine();

        const seat1 = { id: 1, row: 1, column: 1 };
        const seat2 = { id: 2, row: 1, column: 2 }; // 相鄰
        const seat3 = { id: 3, row: 2, column: 1 }; // 相鄰
        const seat4 = { id: 4, row: 2, column: 2 }; // 不相鄰

        if (!engine.areSeatsAdjacent(seat1, seat2)) {
            throw new Error('座位1和座位2應該相鄰');
        }
        if (!engine.areSeatsAdjacent(seat1, seat3)) {
            throw new Error('座位1和座位3應該相鄰');
        }
        if (engine.areSeatsAdjacent(seat1, seat4)) {
            throw new Error('座位1和座位4不應該相鄰');
        }
    })) passedTests++;

    console.log(`\n📊 測試結果: ${passedTests}/${totalTests} 通過`);

    if (passedTests === totalTests) {
        console.log('🎉 所有測試通過！');
    } else {
        console.log('⚠️ 部分測試失敗');
    }
}

// 執行測試
runTests();
