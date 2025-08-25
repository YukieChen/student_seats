// PerformanceBenchmark.test.js - 性能基準測試
import { SeatAssignmentEngine } from '../../engines/SeatAssignmentEngine.js';
import { AssignmentCache } from '../../engines/AssignmentCache.js';
import { Logger } from '../../engines/Logger.js';

describe('PerformanceBenchmark Integration Tests', () => {
    let engine;
    let cache;
    let logger;

    beforeEach(() => {
        logger = new Logger({
            logLevel: 'ERROR',
            enableConsole: false,
            enableFile: false
        });

        cache = new AssignmentCache({
            maxCacheSize: 10000,
            enableCompression: true,
            enableMonitoring: true
        });

        engine = new SeatAssignmentEngine({
            logLevel: 'ERROR',
            timeout: 120000, // 2分鐘超時
            enableCache: true,
            enableCycleDetection: true,
            cache: cache,
            logger: logger
        });
    });

    afterEach(() => {
        engine.dispose();
        cache.dispose();
        logger.dispose();
    });

    describe('testBenchmarks', () => {
        test('應該執行小規模基準測試', async () => {
            const smallConfig = {
                students: Array.from({length: 10}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(smallConfig);
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(result.success).toBe(true);
            expect(executionTime).toBeLessThan(5000); // 5秒內完成

            // 記錄基準數據
            const benchmark = {
                testType: 'small_scale',
                studentCount: 10,
                seatCount: 25,
                conditionCount: 1,
                executionTime: executionTime,
                success: result.success,
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            };

            expect(benchmark.executionTime).toBeLessThan(5000);
            expect(benchmark.success).toBe(true);
        });

        test('應該執行中規模基準測試', async () => {
            const mediumConfig = {
                students: Array.from({length: 30}, (_, i) => i + 1),
                seats: Array.from({length: 8}, (_, row) =>
                    Array.from({length: 8}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: Array.from({length: 15}, (_, i) => [i * 2 + 1, i * 2 + 2])
                    },
                    {
                        type: 'not_adjacent',
                        students: [[1, 3], [5, 7], [9, 11]]
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(mediumConfig);
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(result.success).toBe(true);
            expect(executionTime).toBeLessThan(15000); // 15秒內完成

            const benchmark = {
                testType: 'medium_scale',
                studentCount: 30,
                seatCount: 64,
                conditionCount: 2,
                executionTime: executionTime,
                success: result.success,
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            };

            expect(benchmark.executionTime).toBeLessThan(15000);
            expect(benchmark.success).toBe(true);
        });

        test('應該執行大規模基準測試', async () => {
            const largeConfig = {
                students: Array.from({length: 50}, (_, i) => i + 1),
                seats: Array.from({length: 10}, (_, row) =>
                    Array.from({length: 10}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: Array.from({length: 25}, (_, i) => [i * 2 + 1, i * 2 + 2])
                    },
                    {
                        type: 'not_adjacent',
                        students: [[1, 3], [5, 7], [9, 11], [13, 15], [17, 19]]
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(largeConfig);
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(result.success).toBe(true);
            expect(executionTime).toBeLessThan(30000); // 30秒內完成

            const benchmark = {
                testType: 'large_scale',
                studentCount: 50,
                seatCount: 100,
                conditionCount: 2,
                executionTime: executionTime,
                success: result.success,
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            };

            expect(benchmark.executionTime).toBeLessThan(30000);
            expect(benchmark.success).toBe(true);
        });

        test('應該執行複雜條件基準測試', async () => {
            const complexConfig = {
                students: Array.from({length: 20}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]
                    },
                    {
                        type: 'not_adjacent',
                        students: [[11, 12], [13, 14], [15, 16], [17, 18], [19, 20]]
                    },
                    {
                        type: 'assign_group',
                        students: Array.from({length: 10}, (_, i) => i + 1),
                        group: 'A'
                    },
                    {
                        type: 'assign_group',
                        students: Array.from({length: 10}, (_, i) => i + 11),
                        group: 'B'
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(complexConfig);
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(result.success).toBe(true);
            expect(executionTime).toBeLessThan(20000); // 20秒內完成

            const benchmark = {
                testType: 'complex_conditions',
                studentCount: 20,
                seatCount: 25,
                conditionCount: 4,
                executionTime: executionTime,
                success: result.success,
                memoryUsage: performance.memory?.usedJSHeapSize || 0
            };

            expect(benchmark.executionTime).toBeLessThan(20000);
            expect(benchmark.success).toBe(true);
        });
    });

    describe('testPerformanceComparison', () => {
        test('應該比較不同搜索策略的性能', async () => {
            const config = {
                students: Array.from({length: 15}, (_, i) => i + 1),
                seats: Array.from({length: 4}, (_, row) =>
                    Array.from({length: 4}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8]]
                    }
                ]
            };

            const strategies = ['heuristic', 'depthFirst', 'breadthFirst', 'hybrid'];
            const performanceResults = {};

            for (const strategy of strategies) {
                engine.setSearchStrategy(strategy);
                cache.clear(); // 清理緩存以確保公平比較

                const startTime = Date.now();
                const result = await engine.solveAssignment(config);
                const endTime = Date.now();

                performanceResults[strategy] = {
                    executionTime: endTime - startTime,
                    success: result.success,
                    memoryUsage: performance.memory?.usedJSHeapSize || 0
                };
            }

            // 驗證所有策略都成功
            for (const strategy of strategies) {
                expect(performanceResults[strategy].success).toBe(true);
            }

            // 找出最佳策略
            const bestStrategy = Object.entries(performanceResults)
                .filter(([_, data]) => data.success)
                .sort(([_, a], [__, b]) => a.executionTime - b.executionTime)[0];

            expect(bestStrategy).toBeDefined();
            expect(bestStrategy[1].executionTime).toBeLessThan(10000); // 最佳策略應在10秒內完成
        });

        test('應該比較緩存開啟和關閉的性能', async () => {
            const config = {
                students: Array.from({length: 12}, (_, i) => i + 1),
                seats: Array.from({length: 4}, (_, row) =>
                    Array.from({length: 4}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12]]
                    }
                ]
            };

            // 測試緩存開啟
            engine.enableCache = true;
            cache.clear();
            const startTimeWithCache = Date.now();
            const resultWithCache = await engine.solveAssignment(config);
            const endTimeWithCache = Date.now();
            const timeWithCache = endTimeWithCache - startTimeWithCache;

            // 測試緩存關閉
            engine.enableCache = false;
            const startTimeWithoutCache = Date.now();
            const resultWithoutCache = await engine.solveAssignment(config);
            const endTimeWithoutCache = Date.now();
            const timeWithoutCache = endTimeWithoutCache - startTimeWithoutCache;

            expect(resultWithCache.success).toBe(true);
            expect(resultWithoutCache.success).toBe(true);

            // 驗證緩存效果（開啟緩存應該更快或至少不慢）
            expect(timeWithCache).toBeLessThanOrEqual(timeWithoutCache * 1.2); // 允許20%的誤差
        });

        test('應該比較不同數據規模的性能擴展性', async () => {
            const scales = [10, 20, 30, 40];
            const performanceData = {};

            for (const scale of scales) {
                const config = {
                    students: Array.from({length: scale}, (_, i) => i + 1),
                    seats: Array.from({length: Math.ceil(Math.sqrt(scale))}, (_, row) =>
                        Array.from({length: Math.ceil(Math.sqrt(scale))}, (_, col) => ({
                            row, col, isValid: true, groupId: 'A', studentId: undefined
                        }))
                    ),
                    conditions: []
                };

                cache.clear();
                const startTime = Date.now();
                const result = await engine.solveAssignment(config);
                const endTime = Date.now();

                performanceData[scale] = {
                    executionTime: endTime - startTime,
                    success: result.success,
                    studentCount: scale,
                    seatCount: config.seats.length * config.seats[0].length
                };
            }

            // 驗證所有規模都成功
            for (const scale of scales) {
                expect(performanceData[scale].success).toBe(true);
            }

            // 驗證性能擴展性（執行時間應該隨規模增加而增加，但不應該指數增長）
            const times = scales.map(scale => performanceData[scale].executionTime);
            for (let i = 1; i < times.length; i++) {
                const ratio = times[i] / times[i-1];
                expect(ratio).toBeLessThan(4); // 規模增加一倍，時間不應該超過4倍
            }
        });

        test('應該比較不同條件複雜度的性能', async () => {
            const config = {
                students: Array.from({length: 16}, (_, i) => i + 1),
                seats: Array.from({length: 4}, (_, row) =>
                    Array.from({length: 4}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: []
            };

            const conditionComplexities = [
                { name: 'simple', conditions: [] },
                { name: 'adjacent_only', conditions: [
                    { type: 'adjacent', students: [[1, 2], [3, 4], [5, 6], [7, 8]] }
                ]},
                { name: 'mixed', conditions: [
                    { type: 'adjacent', students: [[1, 2], [3, 4], [5, 6], [7, 8]] },
                    { type: 'not_adjacent', students: [[9, 10], [11, 12]] }
                ]},
                { name: 'complex', conditions: [
                    { type: 'adjacent', students: [[1, 2], [3, 4], [5, 6], [7, 8]] },
                    { type: 'not_adjacent', students: [[9, 10], [11, 12], [13, 14], [15, 16]] },
                    { type: 'assign_group', students: Array.from({length: 8}, (_, i) => i + 1), group: 'A' }
                ]}
            ];

            const complexityResults = {};

            for (const complexity of conditionComplexities) {
                config.conditions = complexity.conditions;
                cache.clear();

                const startTime = Date.now();
                const result = await engine.solveAssignment(config);
                const endTime = Date.now();

                complexityResults[complexity.name] = {
                    executionTime: endTime - startTime,
                    success: result.success,
                    conditionCount: complexity.conditions.length
                };
            }

            // 驗證所有複雜度都成功
            for (const complexity of conditionComplexities) {
                expect(complexityResults[complexity.name].success).toBe(true);
            }

            // 驗證複雜度對性能的影響
            expect(complexityResults.simple.executionTime).toBeLessThan(complexityResults.complex.executionTime);
        });
    });

    describe('testPerformanceReporting', () => {
        test('應該生成完整的性能報告', async () => {
            const config = {
                students: Array.from({length: 25}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: Array.from({length: 12}, (_, i) => [i * 2 + 1, i * 2 + 2])
                    }
                ]
            };

            const startTime = Date.now();
            const startMemory = performance.memory?.usedJSHeapSize || 0;
            const result = await engine.solveAssignment(config);
            const endTime = Date.now();
            const endMemory = performance.memory?.usedJSHeapSize || 0;

            const executionTime = endTime - startTime;
            const memoryUsage = endMemory - startMemory;

            // 獲取性能指標
            const performanceMetrics = engine.getPerformanceMetrics();
            const cacheStats = cache.getCacheStats();
            const logStats = logger.getLogStats();

            const performanceReport = {
                summary: {
                    testName: 'comprehensive_performance_test',
                    timestamp: new Date().toISOString(),
                    success: result.success,
                    executionTime: executionTime,
                    memoryUsage: memoryUsage
                },
                details: {
                    studentCount: config.students.length,
                    seatCount: config.seats.length * config.seats[0].length,
                    conditionCount: config.conditions.length,
                    engineMetrics: performanceMetrics,
                    cacheStats: cacheStats,
                    logStats: logStats
                },
                analysis: {
                    performanceRating: executionTime < 5000 ? 'excellent' : 
                                      executionTime < 10000 ? 'good' : 
                                      executionTime < 20000 ? 'acceptable' : 'poor',
                    memoryEfficiency: memoryUsage < 50 * 1024 * 1024 ? 'excellent' : 
                                     memoryUsage < 100 * 1024 * 1024 ? 'good' : 
                                     memoryUsage < 200 * 1024 * 1024 ? 'acceptable' : 'poor',
                    cacheEffectiveness: cacheStats.hitRate > 0.8 ? 'excellent' : 
                                       cacheStats.hitRate > 0.6 ? 'good' : 
                                       cacheStats.hitRate > 0.4 ? 'acceptable' : 'poor'
                },
                recommendations: []
            };

            // 生成建議
            if (executionTime > 10000) {
                performanceReport.recommendations.push('考慮優化搜索算法或增加緩存大小');
            }
            if (memoryUsage > 100 * 1024 * 1024) {
                performanceReport.recommendations.push('考慮優化記憶體使用或減少並發處理');
            }
            if (cacheStats.hitRate < 0.5) {
                performanceReport.recommendations.push('考慮調整緩存策略或增加緩存大小');
            }

            expect(performanceReport.summary.success).toBe(true);
            expect(performanceReport.summary.executionTime).toBeLessThan(30000);
            expect(performanceReport.analysis.performanceRating).toBeDefined();
            expect(performanceReport.recommendations).toBeDefined();
        });

        test('應該生成基準比較報告', async () => {
            const baselineConfig = {
                students: Array.from({length: 20}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: []
            };

            // 執行基準測試
            const baselineStart = Date.now();
            const baselineResult = await engine.solveAssignment(baselineConfig);
            const baselineEnd = Date.now();
            const baselineTime = baselineEnd - baselineStart;

            // 執行優化後測試
            cache.clear();
            engine.enableCache = true;
            const optimizedStart = Date.now();
            const optimizedResult = await engine.solveAssignment(baselineConfig);
            const optimizedEnd = Date.now();
            const optimizedTime = optimizedEnd - optimizedStart;

            const comparisonReport = {
                baseline: {
                    executionTime: baselineTime,
                    success: baselineResult.success,
                    cacheEnabled: false
                },
                optimized: {
                    executionTime: optimizedTime,
                    success: optimizedResult.success,
                    cacheEnabled: true
                },
                improvement: {
                    timeReduction: ((baselineTime - optimizedTime) / baselineTime * 100).toFixed(2) + '%',
                    performanceGain: baselineTime / optimizedTime,
                    isSignificant: (baselineTime - optimizedTime) / baselineTime > 0.1
                },
                analysis: {
                    recommendation: optimizedTime < baselineTime ? 
                        '優化有效，建議保持當前配置' : 
                        '需要進一步優化或調整策略'
                }
            };

            expect(comparisonReport.baseline.success).toBe(true);
            expect(comparisonReport.optimized.success).toBe(true);
            expect(comparisonReport.improvement.timeReduction).toBeDefined();
            expect(comparisonReport.analysis.recommendation).toBeDefined();
        });

        test('應該生成趨勢分析報告', async () => {
            const testRuns = [];
            const config = {
                students: Array.from({length: 15}, (_, i) => i + 1),
                seats: Array.from({length: 4}, (_, row) =>
                    Array.from({length: 4}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8]]
                    }
                ]
            };

            // 執行多次測試
            for (let i = 0; i < 5; i++) {
                cache.clear();
                const startTime = Date.now();
                const result = await engine.solveAssignment(config);
                const endTime = Date.now();

                testRuns.push({
                    run: i + 1,
                    executionTime: endTime - startTime,
                    success: result.success,
                    timestamp: new Date().toISOString()
                });
            }

            const trendReport = {
                testRuns: testRuns,
                statistics: {
                    averageTime: testRuns.reduce((sum, run) => sum + run.executionTime, 0) / testRuns.length,
                    minTime: Math.min(...testRuns.map(run => run.executionTime)),
                    maxTime: Math.max(...testRuns.map(run => run.executionTime)),
                    standardDeviation: calculateStandardDeviation(testRuns.map(run => run.executionTime))
                },
                trend: {
                    isStable: Math.max(...testRuns.map(run => run.executionTime)) - 
                             Math.min(...testRuns.map(run => run.executionTime)) < 1000,
                    trendDirection: testRuns[testRuns.length - 1].executionTime < testRuns[0].executionTime ? 
                                   'improving' : 'stable'
                },
                recommendations: []
            };

            if (!trendReport.trend.isStable) {
                trendReport.recommendations.push('性能不穩定，建議檢查系統負載和資源使用');
            }
            if (trendReport.statistics.averageTime > 10000) {
                trendReport.recommendations.push('平均執行時間過長，建議優化算法');
            }

            expect(trendReport.statistics.averageTime).toBeLessThan(20000);
            expect(trendReport.trend.isStable).toBeDefined();
            expect(trendReport.recommendations).toBeDefined();
        });
    });

    // 輔助函數
    function calculateStandardDeviation(values) {
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
        return Math.sqrt(avgSquaredDiff);
    }
});
