// AssignmentExplainer.test.js - 分配解釋器測試
const { AssignmentExplainer } = require('../AssignmentExplainer.js');
const { test, describe } = require('node:test');
const assert = require('node:assert');

// 模擬數據
const mockAssignmentResult = {
    success: true,
    assignment: new Map([
        ['S1', { id: 'seat1', row: 1, col: 1 }],
        ['S2', { id: 'seat2', row: 1, col: 2 }]
    ]),
    score: 85,
    executionTime: 2000,
    strategy: 'backtrack'
};

const mockConfig = {
    students: [
        { id: 'S1', name: '學生1', group: 'A' },
        { id: 'S2', name: '學生2', group: 'A' },
        { id: 'S3', name: '學生3', group: 'B' }
    ],
    seats: [
        { id: 'seat1', row: 1, col: 1, group: 'A' },
        { id: 'seat2', row: 1, col: 2, group: 'A' },
        { id: 'seat3', row: 2, col: 1, group: 'B' }
    ],
    conditions: [
        {
            type: 'adjacent',
            students: ['S1', 'S2'],
            seats: ['seat1', 'seat2'],
            weight: 10
        },
        {
            type: 'group',
            students: ['S3'],
            seats: ['seat3'],
            weight: 5
        }
    ],
    executionTime: 10000
};

const mockFailureResult = {
    success: false,
    error: 'TIMEOUT',
    executionTime: 30000,
    strategy: 'backtrack'
};

// 簡單測試函數
function runTests() {
    console.log('開始 AssignmentExplainer 測試...\n');

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

    // 測試 1: 構造函數測試
    test('應該正確初始化配置', () => {
        const explainer = new AssignmentExplainer();
        assert.strictEqual(explainer.options.enableDetailedAnalysis, true);
        assert.strictEqual(explainer.options.enableSuggestions, true);
        assert.strictEqual(explainer.options.maxReportLength, 10000);
        assert.ok(explainer.EXPLANATION_CONFIG);
        assert.deepStrictEqual(explainer.analysisHistory, []);
        explainer.dispose();
    });

    test('應該支持自定義配置', () => {
        const customExplainer = new AssignmentExplainer({
            enableDetailedAnalysis: false,
            maxReportLength: 5000
        });
        assert.strictEqual(customExplainer.options.enableDetailedAnalysis, false);
        assert.strictEqual(customExplainer.options.maxReportLength, 5000);
        customExplainer.dispose();
    });

    // 測試 2: explainAssignment 測試
    test('應該生成完整的解釋結果', () => {
        const explainer = new AssignmentExplainer();
        const explanation = explainer.explainAssignment(mockAssignmentResult, mockConfig);

        assert.ok(explanation.summary);
        assert.ok(explanation.details);
        assert.ok(explanation.statistics);
        assert.ok(explanation.quality);
        assert.ok(explanation.timestamp);

        assert.strictEqual(explanation.summary.success, true);
        assert.strictEqual(explanation.summary.totalStudents, 3);
        assert.strictEqual(explanation.summary.unassignedStudents, 1);
        explainer.dispose();
    });

    test('應該記錄分析歷史', () => {
        const explainer = new AssignmentExplainer();
        explainer.explainAssignment(mockAssignmentResult, mockConfig);
        assert.strictEqual(explainer.analysisHistory.length, 1);
        assert.ok(explainer.analysisHistory[0].timestamp);
        explainer.dispose();
    });

    // 測試 3: explainConditions 測試
    test('應該分析條件滿足情況', () => {
        const explainer = new AssignmentExplainer();
        const conditionAnalysis = explainer.explainConditions(mockConfig.conditions, mockAssignmentResult.assignment);

        assert.strictEqual(conditionAnalysis.totalConditions, 2);
        assert.ok(conditionAnalysis.satisfiedConditions);
        assert.ok(conditionAnalysis.unsatisfiedConditions);
        assert.ok(conditionAnalysis.conditionDetails);
        assert.ok(conditionAnalysis.satisfactionRate);
        explainer.dispose();
    });

    test('應該處理空條件列表', () => {
        const explainer = new AssignmentExplainer();
        const conditionAnalysis = explainer.explainConditions([], mockAssignmentResult.assignment);
        assert.strictEqual(conditionAnalysis.totalConditions, 0);
        assert.strictEqual(conditionAnalysis.satisfactionRate, 0);
        explainer.dispose();
    });

    // 測試 4: explainStrategy 測試
    test('應該解釋策略信息', () => {
        const explainer = new AssignmentExplainer();
        const strategyInfo = {
            strategy: 'backtrack',
            executionTime: 2000,
            successRate: 0.9
        };

        const explanation = explainer.explainStrategy(strategyInfo);

        assert.strictEqual(explanation.strategyUsed, 'backtrack');
        assert.ok(explanation.strategyDescription.includes('回溯算法'));
        assert.ok(explanation.performance);
        assert.ok(explanation.alternatives);
        assert.ok(explanation.recommendations);
        explainer.dispose();
    });

    // 測試 5: analyzeFailure 測試
    test('應該分析失敗原因', () => {
        const explainer = new AssignmentExplainer();
        const analysis = explainer.analyzeFailure(mockFailureResult);

        assert.strictEqual(analysis.failureType, 'TIMEOUT');
        assert.ok(analysis.rootCause);
        assert.ok(analysis.impact);
        assert.ok(analysis.timeline);
        explainer.dispose();
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
