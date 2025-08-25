// AssignmentExplainer.test.js
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

const mockFailureResult = {
    success: false,
    error: '執行超時',
    unassignedStudents: ['student1', 'student2'],
    conflicts: [
        { type: 'preference', description: '偏好衝突' }
    ],
    performanceMetrics: {
        startTime: Date.now() - 10000,
        endTime: Date.now(),
        executionTime: 10000
    }
};

describe('AssignmentExplainer', () => {
    let explainer;

    beforeEach(() => {
        explainer = new AssignmentExplainer();
    });

    afterEach(() => {
        explainer.dispose();
    });

    describe('constructor', () => {
        test('應該正確初始化配置', () => {
            expect(explainer.options.enableDetailedAnalysis).toBe(true);
            expect(explainer.options.enableSuggestions).toBe(true);
            expect(explainer.options.maxReportLength).toBe(10000);
            expect(explainer.EXPLANATION_CONFIG).toBeDefined();
            expect(explainer.analysisHistory).toEqual([]);
        });

        test('應該支持自定義配置', () => {
            const customExplainer = new AssignmentExplainer({
                enableDetailedAnalysis: false,
                maxReportLength: 5000
            });
            expect(customExplainer.options.enableDetailedAnalysis).toBe(false);
            expect(customExplainer.options.maxReportLength).toBe(5000);
        });
    });

    describe('explainAssignment', () => {
        test('應該生成完整的解釋結果', () => {
            const explanation = explainer.explainAssignment(mockAssignmentResult, mockConfig);

            expect(explanation).toHaveProperty('summary');
            expect(explanation).toHaveProperty('details');
            expect(explanation).toHaveProperty('statistics');
            expect(explanation).toHaveProperty('quality');
            expect(explanation).toHaveProperty('timestamp');

            expect(explanation.summary.success).toBe(true);
            expect(explanation.summary.totalStudents).toBe(3);
            expect(explanation.summary.unassignedStudents).toBe(1);
        });

        test('應該記錄分析歷史', () => {
            explainer.explainAssignment(mockAssignmentResult, mockConfig);
            expect(explainer.analysisHistory).toHaveLength(1);
            expect(explainer.analysisHistory[0]).toHaveProperty('timestamp');
        });
    });

    describe('explainConditions', () => {
        test('應該分析條件滿足情況', () => {
            const conditionAnalysis = explainer.explainConditions(mockConfig.conditions, mockAssignmentResult.assignment);

            expect(conditionAnalysis.totalConditions).toBe(2);
            expect(conditionAnalysis).toHaveProperty('satisfiedConditions');
            expect(conditionAnalysis).toHaveProperty('unsatisfiedConditions');
            expect(conditionAnalysis).toHaveProperty('conditionDetails');
            expect(conditionAnalysis).toHaveProperty('satisfactionRate');
        });

        test('應該處理空條件列表', () => {
            const conditionAnalysis = explainer.explainConditions([], mockAssignmentResult.assignment);
            expect(conditionAnalysis.totalConditions).toBe(0);
            expect(conditionAnalysis.satisfactionRate).toBe(0);
        });
    });

    describe('explainStrategy', () => {
        test('應該解釋策略信息', () => {
            const strategyInfo = {
                strategy: 'backtrack',
                executionTime: 2000,
                successRate: 0.9
            };

            const explanation = explainer.explainStrategy(strategyInfo);

            expect(explanation.strategyUsed).toBe('backtrack');
            expect(explanation.strategyDescription).toContain('回溯算法');
            expect(explanation).toHaveProperty('performance');
            expect(explanation).toHaveProperty('alternatives');
            expect(explanation).toHaveProperty('recommendations');
        });
    });

    describe('analyzeFailure', () => {
        test('應該分析失敗原因', () => {
            const analysis = explainer.analyzeFailure(mockFailureResult);

            expect(analysis.failureType).toBe('TIMEOUT');
            expect(analysis).toHaveProperty('rootCause');
            expect(analysis).toHaveProperty('impact');
            expect(analysis).toHaveProperty('timeline');
            expect(analysis).toHaveProperty('suggestions');
        });

        test('應該正確分類不同類型的失敗', () => {
            const conflictFailure = { ...mockFailureResult, error: '條件衝突' };
            const memoryFailure = { ...mockFailureResult, error: '記憶體不足' };
            const incompleteFailure = { ...mockFailureResult, error: null, unassignedStudents: ['student1'] };

            expect(explainer.categorizeFailure(conflictFailure)).toBe('CONFLICT');
            expect(explainer.categorizeFailure(memoryFailure)).toBe('MEMORY');
            expect(explainer.categorizeFailure(incompleteFailure)).toBe('INCOMPLETE_ASSIGNMENT');
        });
    });

    describe('assessFailureImpact', () => {
        test('應該評估失敗影響', () => {
            const impact = explainer.assessFailureImpact(mockFailureResult);

            expect(impact.severity).toBe('HIGH');
            expect(impact.affectedStudents).toBe(2);
            expect(impact.performanceImpact).toBe('SIGNIFICANT');
            expect(impact.userExperienceImpact).toBe('MINIMAL');
        });

        test('應該根據不同失敗類型評估影響', () => {
            const conflictFailure = { ...mockFailureResult, error: '條件衝突', unassignedStudents: [] };
            const impact = explainer.assessFailureImpact(conflictFailure);
            expect(impact.severity).toBe('MEDIUM');
        });
    });

    describe('generateSuggestions', () => {
        test('應該生成改進建議', () => {
            const analysisResult = {
                failureType: 'TIMEOUT',
                conditionSatisfactionRate: 0.7
            };

            const suggestions = explainer.generateSuggestions(analysisResult);

            expect(Array.isArray(suggestions)).toBe(true);
            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions[0]).toHaveProperty('priority');
            expect(suggestions[0]).toHaveProperty('category');
            expect(suggestions[0]).toHaveProperty('title');
            expect(suggestions[0]).toHaveProperty('description');
        });

        test('應該根據條件滿足率生成建議', () => {
            const analysisResult = {
                failureType: 'SUCCESS',
                conditionSatisfactionRate: 0.6
            };

            const suggestions = explainer.generateSuggestions(analysisResult);
            const conditionSuggestion = suggestions.find(s => s.category === 'CONDITIONS');
            expect(conditionSuggestion).toBeDefined();
        });
    });

    describe('prioritizeSuggestions', () => {
        test('應該按優先級排序建議', () => {
            const suggestions = [
                { priority: 'LOW', title: '低優先級' },
                { priority: 'HIGH', title: '高優先級' },
                { priority: 'MEDIUM', title: '中優先級' }
            ];

            const prioritized = explainer.prioritizeSuggestions(suggestions);

            expect(prioritized[0].priority).toBe('HIGH');
            expect(prioritized[1].priority).toBe('MEDIUM');
            expect(prioritized[2].priority).toBe('LOW');
        });
    });

    describe('assessSuggestionFeasibility', () => {
        test('應該評估建議可行性', () => {
            const suggestion = {
                category: 'PERFORMANCE',
                title: '優化算法'
            };

            const feasibility = explainer.assessSuggestionFeasibility(suggestion, {});

            expect(feasibility.isFeasible).toBe(true);
            expect(feasibility.difficulty).toBe('MEDIUM');
            expect(feasibility.estimatedEffort).toBe('MEDIUM');
            expect(Array.isArray(feasibility.risks)).toBe(true);
        });

        test('應該根據不同類別評估可行性', () => {
            const capacitySuggestion = { category: 'CAPACITY' };
            const logicSuggestion = { category: 'LOGIC' };

            const capacityFeasibility = explainer.assessSuggestionFeasibility(capacitySuggestion, {});
            const logicFeasibility = explainer.assessSuggestionFeasibility(logicSuggestion, {});

            expect(capacityFeasibility.difficulty).toBe('HARD');
            expect(logicFeasibility.difficulty).toBe('EASY');
        });
    });

    describe('generateReport', () => {
        test('應該生成詳細報告', () => {
            const report = explainer.generateReport(mockAssignmentResult, mockConfig);

            expect(report).toHaveProperty('header');
            expect(report).toHaveProperty('summary');
            expect(report).toHaveProperty('details');
            expect(report).toHaveProperty('recommendations');
            expect(report).toHaveProperty('statistics');
            expect(report).toHaveProperty('metadata');

            expect(report.metadata.generatedAt).toBeDefined();
            expect(report.metadata.version).toBe('1.0');
        });
    });

    describe('formatReport', () => {
        test('應該支持多種格式', () => {
            const report = explainer.generateReport(mockAssignmentResult, mockConfig);

            const jsonFormat = explainer.formatReport(report, 'JSON');
            const textFormat = explainer.formatReport(report, 'TEXT');
            const markdownFormat = explainer.formatReport(report, 'MARKDOWN');

            expect(jsonFormat).toContain('"summary"');
            expect(textFormat).toContain('座位分配報告');
            expect(markdownFormat).toContain('# 座位分配報告');
        });

        test('應該默認使用文本格式', () => {
            const report = explainer.generateReport(mockAssignmentResult, mockConfig);
            const defaultFormat = explainer.formatReport(report);
            expect(defaultFormat).toContain('座位分配報告');
        });
    });

    describe('exportReport', () => {
        test('應該導出報告', () => {
            const report = explainer.generateReport(mockAssignmentResult, mockConfig);
            const exportResult = explainer.exportReport(report, 'JSON');

            expect(exportResult.success).toBe(true);
            expect(exportResult.filename).toContain('assignment_report_');
            expect(exportResult.filename).toContain('.json');
            expect(exportResult.content).toBeDefined();
            expect(exportResult.size).toBeGreaterThan(0);
            expect(exportResult.format).toBe('JSON');
        });

        test('應該支持自定義文件名', () => {
            const report = explainer.generateReport(mockAssignmentResult, mockConfig);
            const customFilename = 'custom_report.json';
            const exportResult = explainer.exportReport(report, 'JSON', customFilename);

            expect(exportResult.filename).toBe(customFilename);
        });
    });

    describe('calculateAssignmentRate', () => {
        test('應該計算分配率', () => {
            const rate = explainer.calculateAssignmentRate(mockAssignmentResult);
            expect(rate).toBe(0.75); // 3/4 = 0.75
        });

        test('應該處理零學生情況', () => {
            const emptyResult = { assignment: new Map(), totalStudents: 0 };
            const rate = explainer.calculateAssignmentRate(emptyResult);
            expect(rate).toBe(0);
        });
    });

    describe('assessAssignmentQuality', () => {
        test('應該評估分配質量', () => {
            const quality = explainer.assessAssignmentQuality(mockAssignmentResult, mockConfig);

            expect(quality).toHaveProperty('overallScore');
            expect(quality).toHaveProperty('completeness');
            expect(quality).toHaveProperty('efficiency');
            expect(quality).toHaveProperty('satisfaction');
            expect(quality).toHaveProperty('issues');

            expect(quality.completeness).toBe(0.75); // 3/4
            expect(quality.overallScore).toBeGreaterThan(0);
            expect(quality.overallScore).toBeLessThanOrEqual(1);
        });
    });

    describe('analyzeConflicts', () => {
        test('應該分析衝突', () => {
            const conflicts = [
                { type: 'preference', description: '偏好衝突1' },
                { type: 'group', description: '群組衝突1' },
                { type: 'preference', description: '偏好衝突2' }
            ];

            const analysis = explainer.analyzeConflicts(conflicts);

            expect(analysis.count).toBe(3);
            expect(analysis.conflicts).toEqual(conflicts);
            expect(analysis.types.preference).toBe(2);
            expect(analysis.types.group).toBe(1);
            expect(analysis.severity).toBe('MEDIUM');
        });

        test('應該處理空衝突列表', () => {
            const analysis = explainer.analyzeConflicts([]);
            expect(analysis.count).toBe(0);
            expect(analysis.severity).toBe('NONE');
        });
    });

    describe('dispose', () => {
        test('應該清理資源', () => {
            explainer.explainAssignment(mockAssignmentResult, mockConfig);
            expect(explainer.analysisHistory.length).toBeGreaterThan(0);

            explainer.dispose();
            expect(explainer.analysisHistory).toEqual([]);
        });
    });

    describe('配置常量', () => {
        test('應該定義正確的配置常量', () => {
            expect(explainer.EXPLANATION_CONFIG.DETAIL_LEVELS.BASIC).toBe('basic');
            expect(explainer.EXPLANATION_CONFIG.REPORT_FORMATS.JSON).toBe('json');
            expect(explainer.EXPLANATION_CONFIG.SUGGESTION_PRIORITIES.HIGH).toBe('high');
        });
    });

    describe('錯誤處理', () => {
        test('應該處理無效的分配結果', () => {
            const invalidResult = null;
            const explanation = explainer.explainAssignment(invalidResult, mockConfig);

            expect(explanation.summary.success).toBe(false);
            expect(explanation.summary.totalStudents).toBe(0);
        });

        test('應該處理無效的配置', () => {
            const explanation = explainer.explainAssignment(mockAssignmentResult, null);
            expect(explanation).toBeDefined();
        });
    });
});
