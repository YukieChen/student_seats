/**
 * 緩存效果性能測試
 * 測試系統緩存機制的效果和性能
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

describe('CacheEffectiveness Performance Tests', () => {
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

    describe('testCacheHitRate', () => {
        it('應該測試重複請求的緩存命中率', () => {
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

            const hitRates = [];
            const executionTimes = [];

            // 執行多次相同的請求
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                const result = engine.assignSeats(students, seats);
                const endTime = Date.now();
                
                expect(result.success).to.be.true;
                
                const executionTime = endTime - startTime;
                const hitRate = cache.getHitRate();
                
                hitRates.push(hitRate);
                executionTimes.push(executionTime);
            }

            // 驗證緩存命中率的提升
            expect(hitRates[0]).to.be.lessThan(hitRates[9]); // 最後一次應該有更高的命中率
            expect(hitRates[9]).to.be.greaterThan(0.5); // 最終命中率應該超過50%
            
            // 驗證執行時間的減少
            expect(executionTimes[9]).to.be.lessThan(executionTimes[0]); // 最後一次應該更快
        });

        it('應該測試部分重複請求的緩存命中率', () => {
            const baseStudents = [];
            const baseSeats = [];
            
            // 生成基礎數據
            for (let i = 0; i < 500; i++) {
                baseStudents.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 50)}`]
                });
            }

            for (let i = 0; i < 500; i++) {
                baseSeats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 25) + 1,
                    col: (i % 25) + 1
                });
            }

            const hitRates = [];
            const executionTimes = [];

            // 執行部分重複的請求
            for (let i = 0; i < 5; i++) {
                // 添加一些新的學生和座位
                const students = [...baseStudents];
                const seats = [...baseSeats];
                
                for (let j = 0; j < 100; j++) {
                    students.push({
                        id: `S${500 + i * 100 + j}`,
                        name: `Student${500 + i * 100 + j}`,
                        preferences: [`A${Math.floor(Math.random() * 50)}`]
                    });
                    
                    seats.push({
                        id: `A${500 + i * 100 + j}`,
                        row: Math.floor((500 + i * 100 + j) / 25) + 1,
                        col: ((500 + i * 100 + j) % 25) + 1
                    });
                }

                const startTime = Date.now();
                const result = engine.assignSeats(students, seats);
                const endTime = Date.now();
                
                expect(result.success).to.be.true;
                
                const executionTime = endTime - startTime;
                const hitRate = cache.getHitRate();
                
                hitRates.push(hitRate);
                executionTimes.push(executionTime);
            }

            // 驗證緩存命中率
            expect(hitRates[0]).to.be.lessThan(hitRates[4]); // 應該有提升
            expect(hitRates[4]).to.be.greaterThan(0.3); // 最終命中率應該超過30%
        });

        it('應該測試不同緩存大小的命中率', () => {
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

            const cacheSizes = [100, 500, 1000, 2000, 5000];
            const hitRateResults = {};

            for (const cacheSize of cacheSizes) {
                // 重新初始化緩存
                cache.clear();
                cache.setMaxSize(cacheSize);

                // 執行多次請求
                for (let i = 0; i < 5; i++) {
                    const result = engine.assignSeats(students, seats);
                    expect(result.success).to.be.true;
                }

                hitRateResults[cacheSize] = cache.getHitRate();
            }

            // 驗證緩存大小對命中率的影響
            expect(hitRateResults[100]).to.be.lessThan(hitRateResults[500]);
            expect(hitRateResults[500]).to.be.lessThan(hitRateResults[1000]);
            expect(hitRateResults[1000]).to.be.lessThan(hitRateResults[2000]);
            expect(hitRateResults[2000]).to.be.lessThan(hitRateResults[5000]);
        });

        it('應該測試緩存清理對命中率的影響', () => {
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

            // 第一次執行，建立緩存
            const result1 = engine.assignSeats(students, seats);
            expect(result1.success).to.be.true;
            const hitRate1 = cache.getHitRate();

            // 第二次執行，應該有緩存命中
            const result2 = engine.assignSeats(students, seats);
            expect(result2.success).to.be.true;
            const hitRate2 = cache.getHitRate();

            // 清理緩存
            cache.clear();
            const hitRateAfterClear = cache.getHitRate();

            // 第三次執行，緩存被清理，應該重新建立
            const result3 = engine.assignSeats(students, seats);
            expect(result3.success).to.be.true;
            const hitRate3 = cache.getHitRate();

            // 驗證緩存清理的效果
            expect(hitRate2).to.be.greaterThan(hitRate1); // 第二次應該有更高的命中率
            expect(hitRateAfterClear).to.equal(0); // 清理後命中率應該為0
            expect(hitRate3).to.be.lessThan(hitRate2); // 清理後重新執行，命中率應該降低
        });
    });

    describe('testCachePerformance', () => {
        it('應該測試緩存對執行時間的影響', () => {
            const students = [];
            const seats = [];
            
            // 生成1500個學生
            for (let i = 0; i < 1500; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 150)}`]
                });
            }

            // 生成1500個座位
            for (let i = 0; i < 1500; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 75) + 1,
                    col: (i % 75) + 1
                });
            }

            // 禁用緩存
            cache.disable();
            const startTime1 = Date.now();
            const result1 = engine.assignSeats(students, seats);
            const endTime1 = Date.now();
            const executionTime1 = endTime1 - startTime1;
            expect(result1.success).to.be.true;

            // 啟用緩存
            cache.enable();
            const startTime2 = Date.now();
            const result2 = engine.assignSeats(students, seats);
            const endTime2 = Date.now();
            const executionTime2 = endTime2 - startTime2;
            expect(result2.success).to.be.true;

            // 再次執行（應該有緩存）
            const startTime3 = Date.now();
            const result3 = engine.assignSeats(students, seats);
            const endTime3 = Date.now();
            const executionTime3 = endTime3 - startTime3;
            expect(result3.success).to.be.true;

            // 驗證緩存對性能的影響
            expect(executionTime2).to.be.lessThan(executionTime1); // 啟用緩存後應該更快
            expect(executionTime3).to.be.lessThan(executionTime2); // 第二次執行應該更快
            expect(executionTime3).to.be.lessThan(executionTime1 * 0.5); // 至少提升50%
        });

        it('應該測試緩存對內存使用的影響', () => {
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

            // 禁用緩存
            cache.disable();
            const startMemory1 = process.memoryUsage().heapUsed;
            const result1 = engine.assignSeats(students, seats);
            const endMemory1 = process.memoryUsage().heapUsed;
            const memoryUsed1 = endMemory1 - startMemory1;
            expect(result1.success).to.be.true;

            // 啟用緩存
            cache.enable();
            const startMemory2 = process.memoryUsage().heapUsed;
            const result2 = engine.assignSeats(students, seats);
            const endMemory2 = process.memoryUsage().heapUsed;
            const memoryUsed2 = endMemory2 - startMemory2;
            expect(result2.success).to.be.true;

            // 再次執行
            const startMemory3 = process.memoryUsage().heapUsed;
            const result3 = engine.assignSeats(students, seats);
            const endMemory3 = process.memoryUsage().heapUsed;
            const memoryUsed3 = endMemory3 - startMemory3;
            expect(result3.success).to.be.true;

            // 驗證緩存對內存使用的影響
            expect(memoryUsed2).to.be.greaterThan(memoryUsed1); // 啟用緩存會增加內存使用
            expect(memoryUsed3).to.be.lessThan(memoryUsed2); // 第二次執行應該使用更少內存
        });

        it('應該測試緩存大小對性能的影響', () => {
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

            const cacheSizes = [100, 500, 1000, 2000, 5000];
            const performanceResults = {};

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

                performanceResults[cacheSize] = {
                    executionTime,
                    memoryUsed,
                    hitRate: cache.getHitRate(),
                    cacheSize: cache.getSize()
                };
            }

            // 驗證緩存大小對性能的影響
            for (let i = 1; i < cacheSizes.length; i++) {
                const currentSize = cacheSizes[i];
                const previousSize = cacheSizes[i - 1];
                
                const currentResult = performanceResults[currentSize];
                const previousResult = performanceResults[previousSize];
                
                // 更大的緩存應該有更好的命中率
                expect(currentResult.hitRate).to.be.at.least(previousResult.hitRate);
                
                // 但內存使用也會增加
                expect(currentResult.memoryUsed).to.be.at.least(previousResult.memoryUsed);
            }
        });

        it('應該測試緩存策略的性能差異', () => {
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

            const strategies = ['LRU', 'LFU', 'adaptive'];
            const strategyResults = {};

            for (const strategy of strategies) {
                // 重新初始化緩存
                cache.clear();
                cache.setStrategy(strategy);

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                // 執行多次請求
                for (let i = 0; i < 5; i++) {
                    const result = engine.assignSeats(students, seats);
                    expect(result.success).to.be.true;
                }
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                strategyResults[strategy] = {
                    executionTime,
                    memoryUsed,
                    hitRate: cache.getHitRate(),
                    efficiency: cache.getEfficiency()
                };
            }

            // 驗證不同策略的性能
            expect(strategyResults.LRU.executionTime).to.be.lessThan(60000); // 1分鐘內
            expect(strategyResults.LFU.executionTime).to.be.lessThan(60000); // 1分鐘內
            expect(strategyResults.adaptive.executionTime).to.be.lessThan(60000); // 1分鐘內
        });
    });

    describe('testCacheOptimization', () => {
        it('應該測試緩存預熱的效果', () => {
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

            // 執行預熱
            const prewarmStartTime = Date.now();
            cache.prewarmStrategy(students, seats);
            const prewarmEndTime = Date.now();
            const prewarmTime = prewarmEndTime - prewarmStartTime;

            // 執行實際分配
            const startTime = Date.now();
            const result = engine.assignSeats(students, seats);
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            expect(result.success).to.be.true;
            expect(prewarmTime).to.be.lessThan(30000); // 預熱時間應該在30秒內
            expect(executionTime).to.be.lessThan(15000); // 執行時間應該在15秒內
            expect(cache.getHitRate()).to.be.greaterThan(0.7); // 預熱後命中率應該超過70%
        });

        it('應該測試緩存壓縮的效果', () => {
            const students = [];
            const seats = [];
            
            // 生成大量數據來測試壓縮
            for (let i = 0; i < 2000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 200)}`],
                    metadata: {
                        profile: {
                            details: {
                                personal: {
                                    info: {
                                        data: {
                                            value: 'deep_nested_data_for_compression_test'
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            }

            for (let i = 0; i < 2000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 100) + 1,
                    col: (i % 100) + 1
                });
            }

            // 禁用壓縮
            cache.setCompression(false);
            const startMemory1 = process.memoryUsage().heapUsed;
            const result1 = engine.assignSeats(students, seats);
            const endMemory1 = process.memoryUsage().heapUsed;
            const memoryUsed1 = endMemory1 - startMemory1;
            expect(result1.success).to.be.true;

            // 啟用壓縮
            cache.setCompression(true);
            const startMemory2 = process.memoryUsage().heapUsed;
            const result2 = engine.assignSeats(students, seats);
            const endMemory2 = process.memoryUsage().heapUsed;
            const memoryUsed2 = endMemory2 - startMemory2;
            expect(result2.success).to.be.true;

            // 驗證壓縮效果
            expect(memoryUsed2).to.be.lessThan(memoryUsed1); // 壓縮後應該使用更少內存
            expect(memoryUsed2).to.be.lessThan(memoryUsed1 * 0.8); // 至少節省20%內存
        });

        it('應該測試緩存清理策略的效果', () => {
            const students = [];
            const seats = [];
            
            // 生成1500個學生
            for (let i = 0; i < 1500; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 150)}`]
                });
            }

            // 生成1500個座位
            for (let i = 0; i < 1500; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 75) + 1,
                    col: (i % 75) + 1
                });
            }

            // 設置較小的緩存大小
            cache.setMaxSize(100);

            // 執行多次分配，觸發清理
            const performanceResults = [];
            for (let i = 0; i < 10; i++) {
                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                performanceResults.push({
                    executionTime,
                    memoryUsed,
                    hitRate: cache.getHitRate(),
                    cacheSize: cache.getSize()
                });
            }

            // 驗證清理策略的效果
            for (let i = 0; i < performanceResults.length; i++) {
                const result = performanceResults[i];
                
                // 緩存大小不應該超過限制
                expect(result.cacheSize).to.be.lessThan(150); // 允許一些緩衝
                
                // 內存使用應該相對穩定
                expect(result.memoryUsed).to.be.lessThan(200 * 1024 * 1024); // 200MB以內
            }
        });

        it('應該測試緩存監控和報告', () => {
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

            // 執行多次分配
            for (let i = 0; i < 5; i++) {
                const result = engine.assignSeats(students, seats);
                expect(result.success).to.be.true;
            }

            // 獲取緩存報告
            const cacheReport = cache.generateCacheReport();

            // 驗證報告內容
            expect(cacheReport).to.be.an('object');
            expect(cacheReport.hitRate).to.be.a('number');
            expect(cacheReport.missRate).to.be.a('number');
            expect(cacheReport.size).to.be.a('number');
            expect(cacheReport.maxSize).to.be.a('number');
            expect(cacheReport.efficiency).to.be.a('number');
            expect(cacheReport.statistics).to.be.an('object');

            // 驗證報告數據的合理性
            expect(cacheReport.hitRate).to.be.at.least(0);
            expect(cacheReport.hitRate).to.be.at.most(1);
            expect(cacheReport.missRate).to.be.at.least(0);
            expect(cacheReport.missRate).to.be.at.most(1);
            expect(cacheReport.size).to.be.at.least(0);
            expect(cacheReport.size).to.be.at.most(cacheReport.maxSize);
            expect(cacheReport.efficiency).to.be.at.least(0);
            expect(cacheReport.efficiency).to.be.at.most(1);
        });
    });
});
