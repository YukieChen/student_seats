// AssignmentExplainer.simple.test.js - 簡單測試
import { AssignmentExplainer } from '../AssignmentExplainer.js';

// 模擬數據
const mockAssignmentResult = {
    success: true,
    assignment: new Map([
        ['student1', 'seat1'],
        ['student2', 'seat2'],
        ['student3', 'seat3']
    ]),
    unassignedStudents: ['student4'],
    conflicts: [],
    performanceMetrics: {
        executionTime: 1500,
        memoryUsage: [100, 120, 110],
        cacheStats: { hitRate: 0.8 }
    },
    totalStudents: 4
};

const mockConfig = {
    students: [
        { id: 'student1', name: '學生1' },
        { id: 'student2', name: '學生2' },
        { id: 'student3', name: '學生3' },
        { id: 'student4', name: '學生4' }
    ],
    seats: [
        { id: 'seat1', name: '座位1' },
        { id: 'seat2', name: '座位2' },
        { id: 'seat3', name: '座位3' }
    ],
    conditions: [
        { id: 'condition1', type: 'preference', students: [['student1']] },
        { id: 'condition2', type: 'group', students: [['student2', 'student3']] }
    ]
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

    // 測試 1: 構造函數
    test('構造函數初始化', () => {
        const explainer = new AssignmentExplainer();
        if (!explainer.options.enableDetailedAnalysis) throw new Error('enableDetailedAnalysis 應該為 true');
        if (!explainer.options.enableSuggestions) throw new Error('enableSuggestions 應該為 true');
        if (explainer.options.maxReportLength !== 10000) throw new Error('maxReportLength 應該為 10000');
        if (!explainer.EXPLANATION_CONFIG) throw new Error('EXPLANATION_CONFIG 應該存在');
        if (!Array.isArray(explainer.analysisHistory)) throw new Error('analysisHistory 應該是陣列');
    });

    // 測試 2: 自定義配置
    test('自定義配置', () => {
        const explainer = new AssignmentExplainer({
            enableDetailedAnalysis: false,
            maxReportLength: 5000
        });
        if (explainer.options.enableDetailedAnalysis) throw new Error('enableDetailedAnalysis 應該為 false');
        if (explainer.options.maxReportLength !== 5000) throw new Error('maxReportLength 應該為 5000');
    });

    // 測試 3: 解釋分配結果
    test('解釋分配結果', () => {
        const explainer = new AssignmentExplainer();
        const explanation = explainer.explainAssignment(mockAssignmentResult, mockConfig);

        if (!explanation.summary) throw new Error('應該有 summary');
        if (!explanation.details) throw new Error('應該有 details');
        if (!explanation.statistics) throw new Error('應該有 statistics');
        if (!explanation.quality) throw new Error('應該有 quality');
        if (!explanation.timestamp) throw new Error('應該有 timestamp');

        if (explanation.summary.success !== true) throw new Error('success 應該為 true');
        if (explanation.summary.totalStudents !== 3) throw new Error('totalStudents 應該為 3');
        if (explanation.summary.unassignedStudents !== 1) throw new Error('unassignedStudents 應該為 1');
    });

    // 測試 4: 解釋條件
    test('解釋條件', () => {
        const explainer = new AssignmentExplainer();
        const conditionAnalysis = explainer.explainConditions(mockConfig.conditions, mockAssignmentResult.assignment);

        if (conditionAnalysis.totalConditions !== 2) throw new Error('totalConditions 應該為 2');
        if (typeof conditionAnalysis.satisfiedConditions !== 'number') throw new Error('satisfiedConditions 應該是數字');
        if (typeof conditionAnalysis.unsatisfiedConditions !== 'number') throw new Error('unsatisfiedConditions 應該是數字');
        if (!Array.isArray(conditionAnalysis.conditionDetails)) throw new Error('conditionDetails 應該是陣列');
        if (typeof conditionAnalysis.satisfactionRate !== 'number') throw new Error('satisfactionRate 應該是數字');
    });

    // 測試 5: 解釋策略
    test('解釋策略', () => {
        const explainer = new AssignmentExplainer();
        const strategyInfo = {
            strategy: 'backtrack',
            executionTime: 2000,
            successRate: 0.9
        };

        const explanation = explainer.explainStrategy(strategyInfo);

        if (explanation.strategyUsed !== 'backtrack') throw new Error('strategyUsed 應該為 backtrack');
        if (!explanation.strategyDescription.includes('回溯算法')) throw new Error('應該包含策略描述');
        if (!explanation.performance) throw new Error('應該有 performance');
        if (!Array.isArray(explanation.alternatives)) throw new Error('alternatives 應該是陣列');
        if (!Array.isArray(explanation.recommendations)) throw new Error('recommendations 應該是陣列');
    });

    // 測試 6: 分析失敗
    test('分析失敗', () => {
        const explainer = new AssignmentExplainer();
        const failureResult = {
            success: false,
            error: '執行超時',
            unassignedStudents: ['student1', 'student2'],
            conflicts: [{ type: 'preference', description: '偏好衝突' }],
            performanceMetrics: {
                startTime: Date.now() - 10000,
                endTime: Date.now(),
                executionTime: 10000
            }
        };

        const analysis = explainer.analyzeFailure(failureResult);

        if (analysis.failureType !== 'TIMEOUT') throw new Error('failureType 應該為 TIMEOUT');
        if (!analysis.rootCause) throw new Error('應該有 rootCause');
        if (!analysis.impact) throw new Error('應該有 impact');
        if (!analysis.timeline) throw new Error('應該有 timeline');
        if (!Array.isArray(analysis.suggestions)) throw new Error('suggestions 應該是陣列');
    });

    // 測試 7: 生成建議
    test('生成建議', () => {
        const explainer = new AssignmentExplainer();
        const analysisResult = {
            failureType: 'TIMEOUT',
            conditionSatisfactionRate: 0.7
        };

        const suggestions = explainer.generateSuggestions(analysisResult);

        if (!Array.isArray(suggestions)) throw new Error('suggestions 應該是陣列');
        if (suggestions.length === 0) throw new Error('應該有建議');
        if (!suggestions[0].priority) throw new Error('建議應該有 priority');
        if (!suggestions[0].category) throw new Error('建議應該有 category');
        if (!suggestions[0].title) throw new Error('建議應該有 title');
        if (!suggestions[0].description) throw new Error('建議應該有 description');
    });

    // 測試 8: 優先級排序
    test('優先級排序', () => {
        const explainer = new AssignmentExplainer();
        const suggestions = [
            { priority: 'low', title: '低優先級' },
            { priority: 'high', title: '高優先級' },
            { priority: 'medium', title: '中優先級' }
        ];

        const prioritized = explainer.prioritizeSuggestions(suggestions);

        if (prioritized[0].priority !== 'high') throw new Error('第一個應該是 high');
        if (prioritized[1].priority !== 'medium') throw new Error('第二個應該是 medium');
        if (prioritized[2].priority !== 'low') throw new Error('第三個應該是 low');
    });

    // 測試 9: 生成報告
    test('生成報告', () => {
        const explainer = new AssignmentExplainer();
        const report = explainer.generateReport(mockAssignmentResult, mockConfig);

        if (!report.summary) throw new Error('應該有 summary');
        if (!report.details) throw new Error('應該有 details');
        if (!report.recommendations) throw new Error('應該有 recommendations');
        if (!report.statistics) throw new Error('應該有 statistics');
        if (!report.metadata) throw new Error('應該有 metadata');

        if (!report.metadata.generatedAt) throw new Error('應該有 generatedAt');
        if (report.metadata.version !== '1.0') throw new Error('version 應該為 1.0');
    });

    // 測試 10: 格式化報告
    test('格式化報告', () => {
        const explainer = new AssignmentExplainer();
        const report = explainer.generateReport(mockAssignmentResult, mockConfig);

        const jsonFormat = explainer.formatReport(report, 'JSON');
        const textFormat = explainer.formatReport(report, 'TEXT');
        const markdownFormat = explainer.formatReport(report, 'MARKDOWN');

        if (!jsonFormat.includes('"summary"')) throw new Error('JSON 格式應該包含 summary');
        if (!textFormat.includes('座位分配報告')) throw new Error('文本格式應該包含標題');
        if (!markdownFormat.includes('# 座位分配報告')) throw new Error('Markdown 格式應該包含標題');
    });

    // 測試 11: 計算分配率
    test('計算分配率', () => {
        const explainer = new AssignmentExplainer();
        const rate = explainer.calculateAssignmentRate(mockAssignmentResult);
        
        if (rate !== 0.75) throw new Error('分配率應該為 0.75 (3/4)');
    });

    // 測試 12: 評估分配質量
    test('評估分配質量', () => {
        const explainer = new AssignmentExplainer();
        const quality = explainer.assessAssignmentQuality(mockAssignmentResult, mockConfig);

        if (typeof quality.overallScore !== 'number') throw new Error('overallScore 應該是數字');
        if (typeof quality.completeness !== 'number') throw new Error('completeness 應該是數字');
        if (typeof quality.efficiency !== 'number') throw new Error('efficiency 應該是數字');
        if (typeof quality.satisfaction !== 'number') throw new Error('satisfaction 應該是數字');
        if (!Array.isArray(quality.issues)) throw new Error('issues 應該是陣列');

        if (quality.completeness !== 0.75) throw new Error('completeness 應該為 0.75');
        if (quality.overallScore < 0 || quality.overallScore > 1) throw new Error('overallScore 應該在 0-1 之間');
    });

    // 測試 13: 分析衝突
    test('分析衝突', () => {
        const explainer = new AssignmentExplainer();
        const conflicts = [
            { type: 'preference', description: '偏好衝突1' },
            { type: 'group', description: '群組衝突1' },
            { type: 'preference', description: '偏好衝突2' }
        ];

        const analysis = explainer.analyzeConflicts(conflicts);

        if (analysis.count !== 3) throw new Error('count 應該為 3');
        if (analysis.conflicts.length !== 3) throw new Error('conflicts 長度應該為 3');
        if (analysis.types.preference !== 2) throw new Error('preference 類型應該為 2');
        if (analysis.types.group !== 1) throw new Error('group 類型應該為 1');
        if (analysis.severity !== 'MEDIUM') throw new Error('severity 應該為 MEDIUM');
    });

    // 測試 14: 資源清理
    test('資源清理', () => {
        const explainer = new AssignmentExplainer();
        explainer.explainAssignment(mockAssignmentResult, mockConfig);
        
        if (explainer.analysisHistory.length === 0) throw new Error('應該有分析歷史');
        
        explainer.dispose();
        
        if (explainer.analysisHistory.length !== 0) throw new Error('dispose 後應該清空歷史');
    });

    // 測試 15: 配置常量
    test('配置常量', () => {
        const explainer = new AssignmentExplainer();
        
        if (explainer.EXPLANATION_CONFIG.DETAIL_LEVELS.BASIC !== 'basic') throw new Error('BASIC 應該為 basic');
        if (explainer.EXPLANATION_CONFIG.REPORT_FORMATS.JSON !== 'json') throw new Error('JSON 應該為 json');
        if (explainer.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.HIGH !== 'high') throw new Error('HIGH 應該為 high');
    });

    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有測試通過！AssignmentExplainer.js 功能正常');
    } else {
        console.log('⚠️ 部分測試失敗，需要檢查');
    }
}

// 運行測試
runTests();
