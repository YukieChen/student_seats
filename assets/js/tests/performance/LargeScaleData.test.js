/**
 * 大規模數據性能測試
 * 測試系統在處理大規模數據時的表現
 */

// 導入測試框架
const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');

// 導入引擎組件
const SeatAssignmentEngine = require('../../engines/SeatAssignmentEngine');
const AssignmentCache = require('../../engines/AssignmentCache');
const Logger = require('../../engines/Logger');
const ConflictChecker = require('../../engines/ConflictChecker');
const DynamicAdjuster = require('../../engines/DynamicAdjuster');

describe('LargeScaleData Performance Tests', () => {
    let engine, cache, logger, checker, adjuster;

    beforeEach(() => {
        // 初始化組件
        logger = new Logger();
        cache = new AssignmentCache();
        checker = new ConflictChecker();
        adjuster = new DynamicAdjuster();
        engine = new SeatAssignmentEngine({
            cache,
            logger,
            checker,
            adjuster
        });
    });

    afterEach(() => {
        // 清理資源
        if (cache) cache.clear();
        if (logger) logger.clear();
    });

    describe('testLargeDatasets', () => {
        it('應該處理1000個學生和座位的分配', () => {
            const students = [];
            const seats = [];
            
            // 生成1000個學生
            for (let i = 0; i < 1000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 100)}`]
                });
            }

            // 生成1000個座位
            for (let i = 0; i < 1000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 50) + 1,
                    col: (i % 50) + 1
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(1000);
            expect(executionTime).to.be.lessThan(30000); // 30秒內完成
            expect(memoryUsed).to.be.lessThan(100 * 1024 * 1024); // 100MB以內
        });

        it('應該處理5000個學生和座位的分配', () => {
            const students = [];
            const seats = [];
            
            // 生成5000個學生
            for (let i = 0; i < 5000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 500)}`]
                });
            }

            // 生成5000個座位
            for (let i = 0; i < 5000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(5000);
            expect(executionTime).to.be.lessThan(120000); // 2分鐘內完成
            expect(memoryUsed).to.be.lessThan(500 * 1024 * 1024); // 500MB以內
        });

        it('應該處理10000個學生和座位的分配', () => {
            const students = [];
            const seats = [];
            
            // 生成10000個學生
            for (let i = 0; i < 10000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 1000)}`]
                });
            }

            // 生成10000個座位
            for (let i = 0; i < 10000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 200) + 1,
                    col: (i % 200) + 1
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(10000);
            expect(executionTime).to.be.lessThan(300000); // 5分鐘內完成
            expect(memoryUsed).to.be.lessThan(1000 * 1024 * 1024); // 1GB以內
        });

        it('應該處理大規模數據的複雜條件', () => {
            const students = [];
            const seats = [];
            
            // 生成2000個學生
            for (let i = 0; i < 2000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 200)}`]
                });
            }

            // 生成2000個座位
            for (let i = 0; i < 2000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            // 生成複雜條件
            const conditions = [];
            for (let i = 0; i < 100; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`]
                });
            }

            for (let i = 0; i < 50; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(2000);
            expect(executionTime).to.be.lessThan(60000); // 1分鐘內完成
            expect(memoryUsed).to.be.lessThan(200 * 1024 * 1024); // 200MB以內
        });

        it('應該處理大規模數據的緩存效果', () => {
            const students = [];
            const seats = [];
            
            // 生成3000個學生
            for (let i = 0; i < 3000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 300)}`]
                });
            }

            // 生成3000個座位
            for (let i = 0; i < 3000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 150) + 1,
                    col: (i % 150) + 1
                });
            }

            // 第一次執行（無緩存）
            const startTime1 = Date.now();
            const result1 = engine.assignSeats(students, seats);
            const endTime1 = Date.now();
            const executionTime1 = endTime1 - startTime1;

            expect(result1.success).to.be.true;

            // 第二次執行（有緩存）
            const startTime2 = Date.now();
            const result2 = engine.assignSeats(students, seats);
            const endTime2 = Date.now();
            const executionTime2 = endTime2 - startTime2;

            expect(result2.success).to.be.true;

            // 緩存應該提升性能
            expect(executionTime2).to.be.lessThan(executionTime1);
            expect(executionTime2).to.be.lessThan(executionTime1 * 0.5); // 至少提升50%
        });
    });

    describe('testDataScaling', () => {
        it('應該測試數據規模的線性擴展', () => {
            const scaleSizes = [100, 500, 1000, 2000, 5000];
            const performanceResults = [];

            for (const size of scaleSizes) {
                const students = [];
                const seats = [];
                
                // 生成指定規模的數據
                for (let i = 0; i < size; i++) {
                    students.push({
                        id: `S${i}`,
                        name: `Student${i}`,
                        preferences: [`A${Math.floor(Math.random() * size)}`]
                    });
                }

                for (let i = 0; i < size; i++) {
                    seats.push({
                        id: `A${i}`,
                        row: Math.floor(i / Math.sqrt(size)) + 1,
                        col: (i % Math.sqrt(size)) + 1
                    });
                }

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;
                expect(result.assignments.length).to.equal(size);

                performanceResults.push({
                    size,
                    executionTime,
                    memoryUsed,
                    assignmentsPerSecond: size / (executionTime / 1000)
                });
            }

            // 驗證性能擴展性
            for (let i = 1; i < performanceResults.length; i++) {
                const current = performanceResults[i];
                const previous = performanceResults[i - 1];
                
                // 執行時間增長應該相對合理
                const timeRatio = current.executionTime / previous.executionTime;
                const sizeRatio = current.size / previous.size;
                
                // 時間增長不應該超過數據增長的平方
                expect(timeRatio).to.be.lessThan(sizeRatio * sizeRatio);
            }
        });

        it('應該測試條件複雜度的擴展', () => {
            const students = [];
            const seats = [];
            
            // 固定規模的數據
            const size = 1000;
            for (let i = 0; i < size; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * size)}`]
                });
            }

            for (let i = 0; i < size; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 50) + 1,
                    col: (i % 50) + 1
                });
            }

            const conditionComplexities = [0, 50, 100, 200, 500];
            const performanceResults = [];

            for (const complexity of conditionComplexities) {
                const conditions = [];
                
                // 生成指定複雜度的條件
                for (let i = 0; i < complexity; i++) {
                    const conditionType = i % 3 === 0 ? 'adjacent' : i % 3 === 1 ? 'group' : 'not_adjacent';
                    const studentCount = conditionType === 'group' ? 4 : 2;
                    
                    const conditionStudents = [];
                    for (let j = 0; j < studentCount; j++) {
                        conditionStudents.push(`S${(i * studentCount + j) % size}`);
                    }
                    
                    conditions.push({
                        type: conditionType,
                        students: conditionStudents,
                        ...(conditionType === 'group' && { size: studentCount })
                    });
                }

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats, conditions);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                performanceResults.push({
                    complexity,
                    executionTime,
                    memoryUsed
                });
            }

            // 驗證條件複雜度對性能的影響
            for (let i = 1; i < performanceResults.length; i++) {
                const current = performanceResults[i];
                const previous = performanceResults[i - 1];
                
                // 執行時間增長應該相對合理
                const timeRatio = current.executionTime / previous.executionTime;
                const complexityRatio = current.complexity / previous.complexity;
                
                // 時間增長不應該超過複雜度增長的線性倍數
                expect(timeRatio).to.be.lessThan(complexityRatio * 2);
            }
        });

        it('應該測試緩存大小的擴展', () => {
            const students = [];
            const seats = [];
            
            // 固定規模的數據
            const size = 2000;
            for (let i = 0; i < size; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * size)}`]
                });
            }

            for (let i = 0; i < size; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            const cacheSizes = [100, 500, 1000, 2000, 5000];
            const performanceResults = [];

            for (const cacheSize of cacheSizes) {
                // 重新初始化緩存
                cache.clear();
                cache.setMaxSize(cacheSize);

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                performanceResults.push({
                    cacheSize,
                    executionTime,
                    memoryUsed,
                    hitRate: cache.getHitRate()
                });
            }

            // 驗證緩存大小對性能的影響
            for (let i = 1; i < performanceResults.length; i++) {
                const current = performanceResults[i];
                const previous = performanceResults[i - 1];
                
                // 更大的緩存應該有更好的命中率
                if (current.cacheSize > previous.cacheSize) {
                    expect(current.hitRate).to.be.at.least(previous.hitRate);
                }
            }
        });
    });

    describe('testDataPerformance', () => {
        it('應該分析大規模數據的性能指標', () => {
            const students = [];
            const seats = [];
            
            // 生成5000個學生
            for (let i = 0; i < 5000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 500)}`]
                });
            }

            // 生成5000個座位
            for (let i = 0; i < 5000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            
            const result = engine.assignSeats(students, seats);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage();
            const executionTime = endTime - startTime;

            expect(result.success).to.be.true;

            // 計算性能指標
            const performanceMetrics = {
                executionTime,
                memoryUsed: endMemory.heapUsed - startMemory.heapUsed,
                memoryPeak: endMemory.heapUsed,
                assignmentsPerSecond: 5000 / (executionTime / 1000),
                memoryPerAssignment: (endMemory.heapUsed - startMemory.heapUsed) / 5000,
                cacheHitRate: cache.getHitRate(),
                cacheSize: cache.getSize(),
                cacheEfficiency: cache.getEfficiency()
            };

            // 驗證性能指標
            expect(performanceMetrics.executionTime).to.be.lessThan(120000); // 2分鐘內
            expect(performanceMetrics.memoryUsed).to.be.lessThan(500 * 1024 * 1024); // 500MB以內
            expect(performanceMetrics.assignmentsPerSecond).to.be.greaterThan(10); // 每秒至少10個分配
            expect(performanceMetrics.memoryPerAssignment).to.be.lessThan(100 * 1024); // 每個分配100KB以內
            expect(performanceMetrics.cacheHitRate).to.be.at.least(0.5); // 至少50%命中率
        });

        it('應該分析不同搜索策略的性能', () => {
            const students = [];
            const seats = [];
            
            // 生成2000個學生
            for (let i = 0; i < 2000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 200)}`]
                });
            }

            // 生成2000個座位
            for (let i = 0; i < 2000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            const strategies = ['heuristic', 'depthFirst', 'breadthFirst', 'hybrid'];
            const strategyResults = {};

            for (const strategy of strategies) {
                // 重新初始化引擎
                engine = new SeatAssignmentEngine({
                    cache: new AssignmentCache(),
                    logger: new Logger(),
                    checker: new ConflictChecker(),
                    adjuster: new DynamicAdjuster()
                });

                engine.setSearchStrategy(strategy);

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                strategyResults[strategy] = {
                    executionTime,
                    memoryUsed,
                    assignmentsPerSecond: 2000 / (executionTime / 1000),
                    successRate: result.assignments.length / 2000
                };
            }

            // 驗證策略性能比較
            expect(strategyResults.heuristic.executionTime).to.be.lessThan(strategyResults.depthFirst.executionTime);
            expect(strategyResults.heuristic.executionTime).to.be.lessThan(strategyResults.breadthFirst.executionTime);
            expect(strategyResults.hybrid.executionTime).to.be.lessThan(strategyResults.depthFirst.executionTime);
        });

        it('應該分析內存使用模式', () => {
            const students = [];
            const seats = [];
            
            // 生成3000個學生
            for (let i = 0; i < 3000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 300)}`]
                });
            }

            // 生成3000個座位
            for (let i = 0; i < 3000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            const memorySnapshots = [];
            const interval = setInterval(() => {
                memorySnapshots.push({
                    timestamp: Date.now(),
                    memory: process.memoryUsage()
                });
            }, 100);

            const startTime = Date.now();
            const result = engine.assignSeats(students, seats);
            const endTime = Date.now();

            clearInterval(interval);

            expect(result.success).to.be.true;

            // 分析內存使用模式
            const memoryAnalysis = {
                peakMemory: Math.max(...memorySnapshots.map(s => s.memory.heapUsed)),
                averageMemory: memorySnapshots.reduce((sum, s) => sum + s.memory.heapUsed, 0) / memorySnapshots.length,
                memoryGrowth: memorySnapshots[memorySnapshots.length - 1].memory.heapUsed - memorySnapshots[0].memory.heapUsed,
                memoryStability: memorySnapshots.every((s, i) => i === 0 || Math.abs(s.memory.heapUsed - memorySnapshots[i - 1].memory.heapUsed) < 10 * 1024 * 1024) // 10MB以內的波動
            };

            // 驗證內存使用模式
            expect(memoryAnalysis.peakMemory).to.be.lessThan(300 * 1024 * 1024); // 300MB峰值
            expect(memoryAnalysis.memoryGrowth).to.be.lessThan(100 * 1024 * 1024); // 100MB增長
            expect(memoryAnalysis.memoryStability).to.be.true; // 內存使用穩定
        });
    });
});
