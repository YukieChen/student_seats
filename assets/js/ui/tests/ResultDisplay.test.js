/**
 * ResultDisplay 模組單元測試
 */
const ResultDisplay = require('../ResultDisplay.js');

// 簡單的測試框架
class SimpleTestFramework {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }

    describe(name, testFunction) {
        console.log(`\n📋 測試套件: ${name}`);
        testFunction();
    }

    test(name, testFunction) {
        try {
            testFunction();
            console.log(`  ✅ ${name}`);
            this.passed++;
        } catch (error) {
            console.log(`  ❌ ${name}: ${error.message}`);
            this.failed++;
        }
    }

    expect(value) {
        return {
            toBe: (expected) => {
                if (value !== expected) {
                    throw new Error(`期望 ${expected}，但得到 ${value}`);
                }
            },
            toBeDefined: () => {
                if (value === undefined) {
                    throw new Error('期望值被定義，但得到 undefined');
                }
            },
            toBeNull: () => {
                if (value !== null) {
                    throw new Error(`期望 null，但得到 ${value}`);
                }
            },
            toBeInstanceOf: (constructor) => {
                if (!(value instanceof constructor)) {
                    throw new Error(`期望 ${constructor.name} 的實例，但得到 ${typeof value}`);
                }
            },
            toEqual: (expected) => {
                if (JSON.stringify(value) !== JSON.stringify(expected)) {
                    throw new Error(`期望 ${JSON.stringify(expected)}，但得到 ${JSON.stringify(value)}`);
                }
            }
        };
    }

    runTests() {
        console.log('🚀 開始執行 ResultDisplay 測試...\n');
        
        // 模擬 logger
        const mockLogger = {
            log: () => {},
            error: () => {},
            warn: () => {},
            info: () => {}
        };

        this.describe('constructor', () => {
            this.test('應該正確初始化基本屬性', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                this.expect(resultDisplay.displayConfig).toBeDefined();
                this.expect(resultDisplay.themeSystem).toBeDefined();
                this.expect(resultDisplay.currentTheme).toBeDefined();
                this.expect(resultDisplay.charts).toBeInstanceOf(Map);
                this.expect(resultDisplay.animations).toBeInstanceOf(Map);
                this.expect(resultDisplay.progressData).toBeNull();
                this.expect(resultDisplay.comparisonData).toBeNull();
            });

            this.test('應該使用默認主題', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                this.expect(resultDisplay.displayConfig.theme).toBe('default');
            });

            this.test('應該正確設置自定義選項', () => {
                const customDisplay = new ResultDisplay({
                    theme: 'dark',
                    animationSpeed: 2000,
                    chartType: 'svg'
                });
                
                this.expect(customDisplay.displayConfig.theme).toBe('dark');
                this.expect(customDisplay.displayConfig.animationSpeed).toBe(2000);
                this.expect(customDisplay.displayConfig.chartType).toBe('svg');
            });
        });

        this.describe('generateSeatingChart', () => {
            this.test('應該成功生成座位安排圖表', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const assignmentData = {
                    students: ['Alice', 'Bob', 'Charlie'],
                    seats: ['A1', 'A2', 'A3'],
                    assignments: { 'Alice': 'A1', 'Bob': 'A2', 'Charlie': 'A3' }
                };

                const result = resultDisplay.generateSeatingChart(assignmentData);

                this.expect(result.success).toBe(true);
                this.expect(result.chartId).toBe('seating-chart');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.charts.has('seating-chart')).toBe(true);
            });
        });

        this.describe('generateConditionSatisfactionChart', () => {
            this.test('應該成功生成條件滿足度圖表', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const conditionData = {
                    conditions: ['Condition1', 'Condition2'],
                    satisfactionRates: [85, 92],
                    violations: [3, 1]
                };

                const result = resultDisplay.generateConditionSatisfactionChart(conditionData);

                this.expect(result.success).toBe(true);
                this.expect(result.chartId).toBe('condition-satisfaction-chart');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.charts.has('condition-satisfaction-chart')).toBe(true);
            });
        });

        this.describe('generatePerformanceChart', () => {
            this.test('應該成功生成性能統計圖表', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const performanceData = {
                    executionTime: 1500,
                    memoryUsage: 256,
                    cpuUsage: 45,
                    iterations: 1000
                };

                const result = resultDisplay.generatePerformanceChart(performanceData);

                this.expect(result.success).toBe(true);
                this.expect(result.chartId).toBe('performance-chart');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.charts.has('performance-chart')).toBe(true);
            });
        });

        this.describe('generateComparisonChart', () => {
            this.test('應該成功生成結果比較圖表', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const comparisonData = {
                    solutions: ['Solution1', 'Solution2'],
                    metrics: {
                        executionTime: [1000, 1200],
                        satisfactionRate: [85, 90]
                    }
                };

                const result = resultDisplay.generateComparisonChart(comparisonData);

                this.expect(result.success).toBe(true);
                this.expect(result.chartId).toBe('comparison-chart');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.charts.has('comparison-chart')).toBe(true);
            });
        });

        this.describe('animateAssignmentProcess', () => {
            this.test('應該成功創建分配過程動畫', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const assignmentSteps = [
                    { step: 1, action: 'Assign Alice to A1' },
                    { step: 2, action: 'Assign Bob to A2' },
                    { step: 3, action: 'Assign Charlie to A3' }
                ];

                const result = resultDisplay.animateAssignmentProcess(assignmentSteps);

                this.expect(result.success).toBe(true);
                this.expect(result.animationId).toBe('assignment-process');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.animations.has('assignment-process')).toBe(true);
            });
        });

        this.describe('animateAdjustmentProcess', () => {
            this.test('應該成功創建調整過程動畫', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const adjustmentSteps = [
                    { step: 1, change: 'Move Alice from A1 to A2' },
                    { step: 2, change: 'Move Bob from A2 to A3' }
                ];

                const result = resultDisplay.animateAdjustmentProcess(adjustmentSteps);

                this.expect(result.success).toBe(true);
                this.expect(result.animationId).toBe('adjustment-process');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.animations.has('adjustment-process')).toBe(true);
            });
        });

        this.describe('animateConflictResolution', () => {
            this.test('應該成功創建衝突解決動畫', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const conflictSteps = [
                    { step: 1, conflict: 'Alice and Bob want A1', solution: 'Assign Alice to A1, Bob to A2' },
                    { step: 2, conflict: 'Charlie needs A2', solution: 'Assign Charlie to A3' }
                ];

                const result = resultDisplay.animateConflictResolution(conflictSteps);

                this.expect(result.success).toBe(true);
                this.expect(result.animationId).toBe('conflict-resolution');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.animations.has('conflict-resolution')).toBe(true);
            });
        });

        this.describe('animateCompletion', () => {
            this.test('應該成功創建完成慶祝動畫', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const completionData = {
                    totalStudents: 30,
                    totalSeats: 30,
                    satisfactionRate: 95,
                    executionTime: 1500
                };

                const result = resultDisplay.animateCompletion(completionData);

                this.expect(result.success).toBe(true);
                this.expect(result.animationId).toBe('completion-celebration');
                this.expect(result.data).toBeDefined();
                this.expect(resultDisplay.animations.has('completion-celebration')).toBe(true);
            });
        });

        this.describe('displayProgressBar', () => {
            this.test('應該成功顯示進度條', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const progressData = {
                    current: 50,
                    total: 100,
                    percentage: 50,
                    status: 'Processing'
                };

                const result = resultDisplay.displayProgressBar(progressData);

                this.expect(result.success).toBe(true);
                this.expect(result.progressId).toBe('main-progress');
                this.expect(resultDisplay.progressData).toBeDefined();
            });
        });

        this.describe('displayProgressPercentage', () => {
            this.test('應該成功顯示進度百分比', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const percentage = 75;

                const result = resultDisplay.displayProgressPercentage(percentage);

                this.expect(result.success).toBe(true);
                this.expect(result.percentageId).toBe('progress-percentage');
                this.expect(result.data.value).toBe(75);
            });
        });

        this.describe('displayProgressDetails', () => {
            this.test('應該成功顯示進度詳情', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const details = {
                    currentStep: 'Assigning students',
                    completedSteps: 5,
                    totalSteps: 10,
                    estimatedTimeRemaining: '2 minutes'
                };

                const result = resultDisplay.displayProgressDetails(details);

                this.expect(result.success).toBe(true);
                this.expect(result.detailsId).toBe('progress-details');
                this.expect(result.data.data).toEqual(details);
            });
        });

        this.describe('displayProgressEstimate', () => {
            this.test('應該成功顯示進度預估', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const estimateData = {
                    timeRemaining: '5 minutes',
                    accuracy: '85%',
                    factors: ['Complexity: High', 'Data size: Large']
                };

                const result = resultDisplay.displayProgressEstimate(estimateData);

                this.expect(result.success).toBe(true);
                this.expect(result.estimateId).toBe('progress-estimate');
                this.expect(result.data.data).toEqual(estimateData);
            });
        });

        this.describe('compareMultipleSolutions', () => {
            this.test('應該成功比較多個方案', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const solutions = [
                    { name: 'Solution1', score: 85, time: 1000 },
                    { name: 'Solution2', score: 90, time: 1200 },
                    { name: 'Solution3', score: 88, time: 1100 }
                ];

                const result = resultDisplay.compareMultipleSolutions(solutions);

                this.expect(result.success).toBe(true);
                this.expect(result.comparisonId).toBe('multiple-solutions');
                this.expect(resultDisplay.comparisonData).toBeDefined();
            });
        });

        this.describe('comparePerformance', () => {
            this.test('應該成功比較性能', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const performanceData = {
                    solution1: { executionTime: 1000, memoryUsage: 256, cpuUsage: 45 },
                    solution2: { executionTime: 1200, memoryUsage: 300, cpuUsage: 50 }
                };

                const result = resultDisplay.comparePerformance(performanceData);

                this.expect(result.success).toBe(true);
                this.expect(result.performanceId).toBe('performance-comparison');
                this.expect(result.data.data).toEqual(performanceData);
            });
        });

        this.describe('compareConditionSatisfaction', () => {
            this.test('應該成功比較條件滿足度', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const conditionData = {
                    solution1: { satisfactionRate: 85, violations: 3 },
                    solution2: { satisfactionRate: 90, violations: 1 }
                };

                const result = resultDisplay.compareConditionSatisfaction(conditionData);

                this.expect(result.success).toBe(true);
                this.expect(result.conditionId).toBe('condition-satisfaction-comparison');
                this.expect(result.data.data).toEqual(conditionData);
            });
        });

        this.describe('compareUserPreferences', () => {
            this.test('應該成功比較用戶偏好', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const preferenceData = {
                    preferences: ['Speed', 'Accuracy', 'Simplicity'],
                    weights: [0.4, 0.4, 0.2],
                    conflicts: ['Speed vs Accuracy']
                };

                const result = resultDisplay.compareUserPreferences(preferenceData);

                this.expect(result.success).toBe(true);
                this.expect(result.preferenceId).toBe('user-preferences-comparison');
                this.expect(result.data.data).toEqual(preferenceData);
            });
        });

        this.describe('switchTheme', () => {
            this.test('應該成功切換到現有主題', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const result = resultDisplay.switchTheme('dark');

                this.expect(result.success).toBe(true);
                this.expect(result.theme).toBe('dark');
                this.expect(resultDisplay.displayConfig.theme).toBe('dark');
            });

            this.test('應該處理不存在的主題', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                const result = resultDisplay.switchTheme('nonexistent');

                this.expect(result.success).toBe(false);
                this.expect(result.error).toBe("Theme 'nonexistent' not found");
            });
        });

        this.describe('getDisplayStats', () => {
            this.test('應該返回正確的顯示統計', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                // 添加一些測試數據
                resultDisplay.generateSeatingChart({});
                resultDisplay.animateAssignmentProcess([]);
                resultDisplay.displayProgressBar({});

                const stats = resultDisplay.getDisplayStats();

                this.expect(stats.charts).toBe(1);
                this.expect(stats.animations).toBe(1);
                this.expect(stats.theme).toBe('default');
                this.expect(stats.progressData).toBe(true);
                this.expect(stats.comparisonData).toBe(false);
            });
        });

        this.describe('reset', () => {
            this.test('應該成功重置顯示器', () => {
                const resultDisplay = new ResultDisplay({ logger: mockLogger });
                // 添加一些測試數據
                resultDisplay.generateSeatingChart({});
                resultDisplay.animateAssignmentProcess([]);
                resultDisplay.displayProgressBar({});
                resultDisplay.compareMultipleSolutions([]);

                const result = resultDisplay.reset();

                this.expect(result.success).toBe(true);
                this.expect(resultDisplay.charts.size).toBe(0);
                this.expect(resultDisplay.animations.size).toBe(0);
                this.expect(resultDisplay.progressData).toBeNull();
                this.expect(resultDisplay.comparisonData).toBeNull();
            });
        });

        console.log(`\n📊 測試結果: ${this.passed} 通過, ${this.failed} 失敗`);
        
        if (this.failed === 0) {
            console.log('🎉 所有測試都通過了！');
            return true;
        } else {
            console.log('❌ 有測試失敗，請檢查錯誤信息');
            return false;
        }
    }
}

// 運行測試
if (require.main === module) {
    const testFramework = new SimpleTestFramework();
    const success = testFramework.runTests();
    
    if (!success) {
        process.exit(1);
    }
}
