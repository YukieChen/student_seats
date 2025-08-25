// PruneDuplicateStates.test.js - 測試重複狀態剪枝功能
const { SeatAssignmentEngine } = require('../SeatAssignmentEngine.js');

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
    console.log('🚀 開始執行 PruneDuplicateStates 測試');
    
    let passedTests = 0;
    let totalTests = 0;

    // 測試基本剪枝功能
    totalTests++;
    if (test('基本剪枝功能', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
        const seats = [{ id: 1, row: 1, column: 1 }, { id: 2, row: 1, column: 2 }];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        const result = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== false) {
            throw new Error(`預期不剪枝，但得到: ${result.shouldPrune}`);
        }
    })) passedTests++;

    // 測試快取命中剪枝
    totalTests++;
    if (test('快取命中剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        // 第一次檢查
        const result1 = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        if (result1.shouldPrune !== false) {
            throw new Error(`第一次檢查預期不剪枝，但得到: ${result1.shouldPrune}`);
        }
        
        // 第二次檢查應該被剪枝（快取命中）
        const result2 = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        if (result2.shouldPrune !== true) {
            throw new Error(`第二次檢查預期剪枝，但得到: ${result2.shouldPrune}`);
        }
        if (result2.reason !== '重複狀態（快取命中）') {
            throw new Error(`預期原因: 重複狀態（快取命中），但得到: ${result2.reason}`);
        }
        if (result2.duplicateType !== 'cache_hit') {
            throw new Error(`預期重複類型: cache_hit，但得到: ${result2.duplicateType}`);
        }
    })) passedTests++;

    // 測試歷史記錄重複剪枝
    totalTests++;
    if (test('歷史記錄重複剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];
        const currentState = { depth: 1 };
        const currentAssignment = new Map();
        
        // 手動添加狀態到歷史記錄
        const stateKey = engine.generateNormalizedStateKey(students, seats, currentState, currentAssignment);
        engine.stateHistory.push({
            stateKey: stateKey,
            state: currentState,
            timestamp: Date.now(),
            depth: 1
        });
        
        const result = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '重複狀態（歷史記錄）') {
            throw new Error(`預期原因: 重複狀態（歷史記錄），但得到: ${result.reason}`);
        }
        if (result.duplicateType !== 'history_duplicate') {
            throw new Error(`預期重複類型: history_duplicate，但得到: ${result.duplicateType}`);
        }
    })) passedTests++;

    // 測試等價狀態剪枝
    totalTests++;
    if (test('等價狀態剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 1, column: 2 }
        ];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        // 先記錄一個狀態
        engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        // 使用不同的學生順序但相同的分配
        const permutedStudents = [
            { id: 2, name: 'Bob' },
            { id: 1, name: 'Alice' }
        ];
        
        const result = engine.pruneDuplicateStates(permutedStudents, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '等價狀態') {
            throw new Error(`預期原因: 等價狀態，但得到: ${result.reason}`);
        }
        if (result.duplicateType !== 'equivalent_state') {
            throw new Error(`預期重複類型: equivalent_state，但得到: ${result.duplicateType}`);
        }
    })) passedTests++;

    // 測試水平對稱狀態剪枝
    totalTests++;
    if (test('水平對稱狀態剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 1, column: 2 },
            { id: 3, row: 1, column: 3 },
            { id: 4, row: 1, column: 4 }
        ];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        // 創建水平對稱的分配
        currentAssignment.set(students[0], seats[0]); // 座位1
        currentAssignment.set(students[1], seats[3]); // 座位4（對稱）
        
        const result = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '對稱狀態') {
            throw new Error(`預期原因: 對稱狀態，但得到: ${result.reason}`);
        }
        if (result.duplicateType !== 'symmetric_state') {
            throw new Error(`預期重複類型: symmetric_state，但得到: ${result.duplicateType}`);
        }
        if (result.details.symmetricInfo.symmetryType !== 'horizontal') {
            throw new Error(`預期對稱類型: horizontal，但得到: ${result.details.symmetricInfo.symmetryType}`);
        }
    })) passedTests++;

    // 測試垂直對稱狀態剪枝
    totalTests++;
    if (test('垂直對稱狀態剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [
            { id: 1, name: 'Alice' },
            { id: 2, name: 'Bob' }
        ];
        const seats = [
            { id: 1, row: 1, column: 1 },
            { id: 2, row: 2, column: 1 },
            { id: 3, row: 3, column: 1 },
            { id: 4, row: 4, column: 1 }
        ];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        // 創建垂直對稱的分配
        currentAssignment.set(students[0], seats[0]); // 座位1
        currentAssignment.set(students[1], seats[3]); // 座位4（對稱）
        
        const result = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '對稱狀態') {
            throw new Error(`預期原因: 對稱狀態，但得到: ${result.reason}`);
        }
        if (result.duplicateType !== 'symmetric_state') {
            throw new Error(`預期重複類型: symmetric_state，但得到: ${result.duplicateType}`);
        }
        if (result.details.symmetricInfo.symmetryType !== 'vertical') {
            throw new Error(`預期對稱類型: vertical，但得到: ${result.details.symmetricInfo.symmetryType}`);
        }
    })) passedTests++;

    // 測試循環狀態剪枝
    totalTests++;
    if (test('循環狀態剪枝', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];
        const currentState = { 
            depth: 0,
            cyclePattern: ['A', 'B', 'C', 'D']
        };
        const currentAssignment = new Map();
        
        // 手動添加循環模式到歷史記錄
        const cycleLength = currentState.cyclePattern.length;
        for (let i = 0; i < cycleLength * 2; i++) {
            engine.stateHistory.push({
                stateKey: `cycle_${i}`,
                state: { cyclePattern: currentState.cyclePattern },
                timestamp: Date.now(),
                depth: i
            });
        }
        
        const result = engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (result.shouldPrune !== true) {
            throw new Error(`預期剪枝，但得到: ${result.shouldPrune}`);
        }
        if (result.reason !== '循環狀態') {
            throw new Error(`預期原因: 循環狀態，但得到: ${result.reason}`);
        }
        if (result.duplicateType !== 'cycle_state') {
            throw new Error(`預期重複類型: cycle_state，但得到: ${result.duplicateType}`);
        }
    })) passedTests++;

    // 測試統計信息記錄
    totalTests++;
    if (test('統計信息記錄', () => {
        const engine = new SeatAssignmentEngine();
        const students = [{ id: 1, name: 'Alice' }];
        const seats = [{ id: 1, row: 1, column: 1 }];
        const conditions = [];
        const currentState = { depth: 0 };
        const currentAssignment = new Map();
        
        // 執行多次剪枝檢查
        engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        engine.pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment);
        
        if (engine.duplicatePruningStats.totalChecks !== 3) {
            throw new Error(`預期總檢查次數: 3，但得到: ${engine.duplicatePruningStats.totalChecks}`);
        }
        if (engine.duplicatePruningStats.cacheHits !== 2) {
            throw new Error(`預期快取命中次數: 2，但得到: ${engine.duplicatePruningStats.cacheHits}`);
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
        const currentState = { depth: 0, assignedCount: 1 };
        const currentAssignment = new Map();
        currentAssignment.set(students[1], seats[1]);
        
        const stateKey = engine.generateNormalizedStateKey(students, seats, currentState, currentAssignment);
        
        // 狀態鍵應該包含標準化的信息
        if (!stateKey.includes('1,2')) {
            throw new Error(`狀態鍵應該包含標準化的學生ID: ${stateKey}`);
        }
        if (!stateKey.includes('1,2')) {
            throw new Error(`狀態鍵應該包含標準化的座位ID: ${stateKey}`);
        }
        if (!stateKey.includes('1:1')) {
            throw new Error(`狀態鍵應該包含分配信息: ${stateKey}`);
        }
    })) passedTests++;

    // 測試狀態標準化
    totalTests++;
    if (test('狀態標準化', () => {
        const engine = new SeatAssignmentEngine();
        const state = {
            depth: 2,
            assignedCount: 3,
            remainingStudents: [
                { id: 2, name: 'Bob' },
                { id: 1, name: 'Alice' }
            ],
            availableSeats: [
                { id: 3, row: 1, column: 3 },
                { id: 1, row: 1, column: 1 }
            ],
            cyclePattern: ['A', 'B', 'C']
        };
        
        const normalized = engine.normalizeStateInfo(state);
        const parsed = JSON.parse(normalized);
        
        if (parsed.depth !== 2) {
            throw new Error(`預期深度: 2，但得到: ${parsed.depth}`);
        }
        if (parsed.assignedCount !== 3) {
            throw new Error(`預期分配數量: 3，但得到: ${parsed.assignedCount}`);
        }
        if (parsed.remainingStudents !== '1,2') {
            throw new Error(`預期剩餘學生: 1,2，但得到: ${parsed.remainingStudents}`);
        }
        if (parsed.availableSeats !== '1,3') {
            throw new Error(`預期可用座位: 1,3，但得到: ${parsed.availableSeats}`);
        }
        if (parsed.cyclePattern !== 'A->B->C') {
            throw new Error(`預期循環模式: A->B->C，但得到: ${parsed.cyclePattern}`);
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
