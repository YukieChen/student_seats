// FullFlow.test.js - 完整流程集成測試
import { SeatAssignmentEngine } from '../../engines/SeatAssignmentEngine.js';
import { AssignmentCache } from '../../engines/AssignmentCache.js';
import { Logger } from '../../engines/Logger.js';
import { ConflictChecker } from '../../engines/ConflictChecker.js';
import { DynamicAdjuster } from '../../engines/DynamicAdjuster.js';

describe('FullFlow Integration Tests', () => {
    let engine;
    let cache;
    let logger;
    let checker;
    let adjuster;

    beforeEach(() => {
        // 初始化所有組件
        logger = new Logger({
            logLevel: 'INFO',
            enableConsole: false,
            enableFile: false
        });

        cache = new AssignmentCache({
            maxCacheSize: 1000,
            enableCompression: true,
            enableMonitoring: true
        });

        checker = new ConflictChecker({
            enableCycleDetection: true,
            enableOptimization: true
        });

        adjuster = new DynamicAdjuster({
            enableStrategyLearning: true,
            enablePriorityOptimization: true
        });

        engine = new SeatAssignmentEngine({
            logLevel: 'INFO',
            timeout: 30000,
            enableCache: true,
            enableCycleDetection: true,
            cache: cache,
            logger: logger,
            conflictChecker: checker,
            dynamicAdjuster: adjuster
        });
    });

    afterEach(() => {
        engine.dispose();
        cache.dispose();
        logger.dispose();
        checker.dispose();
        adjuster.dispose();
    });

    describe('testEndToEnd', () => {
        test('應該完成完整的座位分配流程', async () => {
            const config = {
                students: [1, 2, 3, 4, 5, 6, 7, 8],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 2, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 3, isValid: true, groupId: 'A', studentId: undefined }
                    ],
                    [
                        { row: 1, col: 0, isValid: true, groupId: 'B', studentId: undefined },
                        { row: 1, col: 1, isValid: true, groupId: 'B', studentId: undefined },
                        { row: 1, col: 2, isValid: true, groupId: 'B', studentId: undefined },
                        { row: 1, col: 3, isValid: true, groupId: 'B', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8]]
                    },
                    {
                        type: 'assign_group',
                        students: [[1, 2, 3, 4]],
                        group: 'A'
                    },
                    {
                        type: 'assign_group',
                        students: [[5, 6, 7, 8]],
                        group: 'B'
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(config);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.assignment).toBeDefined();
            expect(result.assignment.size).toBe(8);
            expect(endTime - startTime).toBeLessThan(30000); // 30秒內完成

            // 驗證所有學生都被分配了座位
            for (let i = 1; i <= 8; i++) {
                expect(result.assignment.has(i)).toBe(true);
            }

            // 驗證條件滿足
            const validationResult = checker.checkAllConditions(config.conditions, result.assignment);
            expect(validationResult.allSatisfied).toBe(true);
        });

        test('應該處理複雜的端到端場景', async () => {
            const complexConfig = {
                students: Array.from({length: 20}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, 
                        groupId: row < 3 ? 'A' : 'B', 
                        studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]
                    },
                    {
                        type: 'not_adjacent',
                        students: [[11, 12], [13, 14], [15, 16]]
                    },
                    {
                        type: 'assign_group',
                        students: Array.from({length: 12}, (_, i) => i + 1),
                        group: 'A'
                    },
                    {
                        type: 'assign_group',
                        students: Array.from({length: 8}, (_, i) => i + 13),
                        group: 'B'
                    }
                ]
            };

            const result = await engine.solveAssignment(complexConfig);

            expect(result.success).toBe(true);
            expect(result.assignment.size).toBe(20);

            // 驗證群組分配
            const groupAStudents = Array.from({length: 12}, (_, i) => i + 1);
            const groupBStudents = Array.from({length: 8}, (_, i) => i + 13);

            for (const studentId of groupAStudents) {
                const seat = result.assignment.get(studentId);
                expect(seat.groupId).toBe('A');
            }

            for (const studentId of groupBStudents) {
                const seat = result.assignment.get(studentId);
                expect(seat.groupId).toBe('B');
            }
        });

        test('應該處理無解情況的端到端流程', async () => {
            const impossibleConfig = {
                students: [1, 2, 3, 4],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4]]
                    },
                    {
                        type: 'not_adjacent',
                        students: [[1, 3]]
                    }
                ]
            };

            const result = await engine.solveAssignment(impossibleConfig);

            expect(result.success).toBe(false);
            expect(result.unassignedStudents).toBeDefined();
            expect(result.unassignedStudents.length).toBeGreaterThan(0);
            expect(result.error).toBeDefined();
        });

        test('應該處理大規模數據的端到端流程', async () => {
            const largeConfig = {
                students: Array.from({length: 50}, (_, i) => i + 1),
                seats: Array.from({length: 10}, (_, row) =>
                    Array.from({length: 10}, (_, col) => ({
                        row, col, isValid: true, 
                        groupId: row < 5 ? 'A' : 'B', 
                        studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: Array.from({length: 25}, (_, i) => [i * 2 + 1, i * 2 + 2])
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(largeConfig);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(result.assignment.size).toBe(50);
            expect(endTime - startTime).toBeLessThan(60000); // 60秒內完成
        });
    });

    describe('testFlowValidation', () => {
        test('應該驗證完整的分配流程', async () => {
            const config = {
                students: [1, 2, 3, 4],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined }
                    ],
                    [
                        { row: 1, col: 0, isValid: true, groupId: 'B', studentId: undefined },
                        { row: 1, col: 1, isValid: true, groupId: 'B', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4]]
                    }
                ]
            };

            const result = await engine.solveAssignment(config);

            // 驗證分配結果
            expect(result.success).toBe(true);
            expect(result.assignment.size).toBe(4);

            // 驗證條件滿足
            const validationResult = checker.checkAllConditions(config.conditions, result.assignment);
            expect(validationResult.allSatisfied).toBe(true);

            // 驗證緩存使用
            const cacheStats = cache.getCacheStats();
            expect(cacheStats.hits).toBeGreaterThanOrEqual(0);

            // 驗證日誌記錄
            const logStats = logger.getLogStats();
            expect(logStats.totalLogs).toBeGreaterThan(0);
        });

        test('應該驗證流程中的錯誤處理', async () => {
            const invalidConfig = {
                students: null,
                seats: [],
                conditions: []
            };

            const result = await engine.solveAssignment(invalidConfig);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();

            // 驗證錯誤日誌記錄
            const logStats = logger.getLogStats();
            const errorLogs = logStats.levels?.ERROR || 0;
            expect(errorLogs).toBeGreaterThan(0);
        });

        test('應該驗證流程中的性能指標', async () => {
            const config = {
                students: Array.from({length: 10}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: []
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(config);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(10000); // 10秒內完成

            // 驗證性能指標
            const performanceMetrics = engine.getPerformanceMetrics();
            expect(performanceMetrics.executionTime).toBeDefined();
            expect(performanceMetrics.memoryUsage).toBeDefined();
        });

        test('應該驗證流程中的緩存效果', async () => {
            const config = {
                students: [1, 2, 3, 4],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined }
                    ]
                ],
                conditions: []
            };

            // 第一次執行
            const result1 = await engine.solveAssignment(config);
            expect(result1.success).toBe(true);

            // 第二次執行（應該使用緩存）
            const result2 = await engine.solveAssignment(config);
            expect(result2.success).toBe(true);

            // 驗證緩存命中
            const cacheStats = cache.getCacheStats();
            expect(cacheStats.hits).toBeGreaterThan(0);
        });
    });

    describe('testFlowOptimization', () => {
        test('應該優化分配流程性能', async () => {
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
                        students: Array.from({length: 7}, (_, i) => [i * 2 + 1, i * 2 + 2])
                    }
                ]
            };

            // 記錄優化前的性能
            const beforeOptimization = Date.now();
            const result1 = await engine.solveAssignment(config);
            const afterOptimization = Date.now();
            const time1 = afterOptimization - beforeOptimization;

            // 清理緩存，重新執行
            cache.clear();
            const beforeSecondRun = Date.now();
            const result2 = await engine.solveAssignment(config);
            const afterSecondRun = Date.now();
            const time2 = afterSecondRun - beforeSecondRun;

            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);

            // 驗證性能改進（第二次應該更快）
            expect(time2).toBeLessThanOrEqual(time1);
        });

        test('應該優化記憶體使用', async () => {
            const config = {
                students: Array.from({length: 20}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: []
            };

            // 執行多次分配，監控記憶體使用
            const memoryUsage = [];
            for (let i = 0; i < 5; i++) {
                const startMemory = performance.memory?.usedJSHeapSize || 0;
                await engine.solveAssignment(config);
                const endMemory = performance.memory?.usedJSHeapSize || 0;
                memoryUsage.push(endMemory - startMemory);
            }

            // 驗證記憶體使用穩定
            const avgMemoryUsage = memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length;
            expect(avgMemoryUsage).toBeLessThan(100 * 1024 * 1024); // 100MB以內
        });

        test('應該優化條件檢查效率', async () => {
            const complexConditions = Array.from({length: 50}, (_, i) => ({
                type: 'adjacent',
                students: [[i * 2 + 1, i * 2 + 2]]
            }));

            const config = {
                students: Array.from({length: 100}, (_, i) => i + 1),
                seats: Array.from({length: 10}, (_, row) =>
                    Array.from({length: 10}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: complexConditions
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(config);
            const endTime = Date.now();

            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(30000); // 30秒內完成

            // 驗證條件檢查效率
            const validationTime = Date.now();
            const validationResult = checker.checkAllConditions(complexConditions, result.assignment);
            const validationEndTime = Date.now();

            expect(validationResult.allSatisfied).toBe(true);
            expect(validationEndTime - validationTime).toBeLessThan(5000); // 5秒內完成條件檢查
        });

        test('應該優化緩存策略', async () => {
            const config = {
                students: [1, 2, 3, 4],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined }
                    ]
                ],
                conditions: []
            };

            // 執行多次，測試緩存優化
            const executionTimes = [];
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                await engine.solveAssignment(config);
                const endTime = Date.now();
                executionTimes.push(endTime - startTime);
            }

            // 驗證後續執行時間減少（緩存效果）
            const firstHalf = executionTimes.slice(0, 5);
            const secondHalf = executionTimes.slice(5);
            const avgFirstHalf = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
            const avgSecondHalf = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

            expect(avgSecondHalf).toBeLessThanOrEqual(avgFirstHalf);

            // 驗證緩存統計
            const cacheStats = cache.getCacheStats();
            expect(cacheStats.hits).toBeGreaterThan(0);
            expect(cacheStats.hitRate).toBeGreaterThan(0.5); // 命中率超過50%
        });

        test('應該優化搜索策略', async () => {
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

            // 測試不同搜索策略的性能
            const strategies = ['heuristic', 'depthFirst', 'breadthFirst', 'hybrid'];
            const strategyTimes = {};

            for (const strategy of strategies) {
                engine.setSearchStrategy(strategy);
                const startTime = Date.now();
                const result = await engine.solveAssignment(config);
                const endTime = Date.now();
                
                expect(result.success).toBe(true);
                strategyTimes[strategy] = endTime - startTime;
            }

            // 驗證至少有一種策略在合理時間內完成
            const minTime = Math.min(...Object.values(strategyTimes));
            expect(minTime).toBeLessThan(10000); // 10秒內完成
        });
    });
});
