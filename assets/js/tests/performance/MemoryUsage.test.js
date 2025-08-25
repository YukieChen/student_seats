/**
 * 內存使用性能測試
 * 測試系統的內存使用情況和優化效果
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

describe('MemoryUsage Performance Tests', () => {
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

		// 強制垃圾回收
		if (global.gc) {
			global.gc();
		}
	});

	describe('testMemoryUsage', () => {
		it('應該測試基本內存使用情況', () => {
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

			const initialMemory = process.memoryUsage();

			const startTime = Date.now();
			const result = engine.assignSeats(students, seats);
			const endTime = Date.now();

			const finalMemory = process.memoryUsage();
			const executionTime = endTime - startTime;

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(1000);

			// 計算內存使用指標
			const memoryMetrics = {
				heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
				heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
				external: finalMemory.external - initialMemory.external,
				rss: finalMemory.rss - initialMemory.rss,
				executionTime,
				memoryPerAssignment: (finalMemory.heapUsed - initialMemory.heapUsed) / 1000
			};

			// 驗證內存使用指標
			expect(memoryMetrics.heapUsed).to.be.lessThan(200 * 1024 * 1024); // 200MB以內
			expect(memoryMetrics.memoryPerAssignment).to.be.lessThan(200 * 1024); // 每個分配200KB以內
			expect(executionTime).to.be.lessThan(30000); // 30秒內完成
		});

		it('應該測試大規模數據的內存使用', () => {
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

			const initialMemory = process.memoryUsage();

			const startTime = Date.now();
			const result = engine.assignSeats(students, seats);
			const endTime = Date.now();

			const finalMemory = process.memoryUsage();
			const executionTime = endTime - startTime;

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(5000);

			// 計算內存使用指標
			const memoryMetrics = {
				heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
				heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
				external: finalMemory.external - initialMemory.external,
				rss: finalMemory.rss - initialMemory.rss,
				executionTime,
				memoryPerAssignment: (finalMemory.heapUsed - initialMemory.heapUsed) / 5000
			};

			// 驗證大規模數據的內存使用
			expect(memoryMetrics.heapUsed).to.be.lessThan(800 * 1024 * 1024); // 800MB以內
			expect(memoryMetrics.memoryPerAssignment).to.be.lessThan(160 * 1024); // 每個分配160KB以內
			expect(executionTime).to.be.lessThan(120000); // 2分鐘內完成
		});

		it('應該測試複雜條件對內存使用的影響', () => {
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
			for (let i = 0; i < 200; i++) {
				conditions.push({
					type: 'adjacent',
					students: [`S${i * 2}`, `S${i * 2 + 1}`],
					priority: 200 - i
				});
			}

			for (let i = 0; i < 100; i++) {
				conditions.push({
					type: 'group',
					students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
					size: 4,
					priority: 100 - i
				});
			}

			const initialMemory = process.memoryUsage();

			const startTime = Date.now();
			const result = engine.assignSeats(students, seats, conditions);
			const endTime = Date.now();

			const finalMemory = process.memoryUsage();
			const executionTime = endTime - startTime;

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(2000);

			// 計算內存使用指標
			const memoryMetrics = {
				heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
				heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
				external: finalMemory.external - initialMemory.external,
				rss: finalMemory.rss - initialMemory.rss,
				executionTime,
				memoryPerAssignment: (finalMemory.heapUsed - initialMemory.heapUsed) / 2000,
				memoryPerCondition: (finalMemory.heapUsed - initialMemory.heapUsed) / 300
			};

			// 驗證複雜條件的內存使用
			expect(memoryMetrics.heapUsed).to.be.lessThan(400 * 1024 * 1024); // 400MB以內
			expect(memoryMetrics.memoryPerAssignment).to.be.lessThan(200 * 1024); // 每個分配200KB以內
			expect(memoryMetrics.memoryPerCondition).to.be.lessThan(2 * 1024 * 1024); // 每個條件2MB以內
			expect(executionTime).to.be.lessThan(90000); // 1.5分鐘內完成
		});

		it('應該測試內存使用的線性擴展', () => {
			const dataSizes = [500, 1000, 2000, 4000];
			const memoryResults = [];

			for (const size of dataSizes) {
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

				const initialMemory = process.memoryUsage();

				const startTime = Date.now();
				const result = engine.assignSeats(students, seats);
				const endTime = Date.now();

				const finalMemory = process.memoryUsage();
				const executionTime = endTime - startTime;

				expect(result.success).to.be.true;
				expect(result.assignments.length).to.equal(size);

				memoryResults.push({
					size,
					heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
					memoryPerAssignment: (finalMemory.heapUsed - initialMemory.heapUsed) / size,
					executionTime
				});
			}

			// 驗證內存使用的線性擴展
			for (let i = 1; i < memoryResults.length; i++) {
				const current = memoryResults[i];
				const previous = memoryResults[i - 1];

				const sizeRatio = current.size / previous.size;
				const memoryRatio = current.heapUsed / previous.heapUsed;

				// 內存使用增長不應該超過數據增長的線性倍數
				expect(memoryRatio).to.be.lessThan(sizeRatio * 2);

				// 每個分配的內存使用應該相對穩定
				const memoryPerAssignmentRatio = current.memoryPerAssignment / previous.memoryPerAssignment;
				expect(memoryPerAssignmentRatio).to.be.lessThan(1.5); // 不應該超過50%的增長
			}
		});
	});

	describe('testMemoryLeaks', () => {
		it('應該測試長時間運行時的內存洩漏', () => {
			const students = [];
			const seats = [];

			// 生成基礎數據
			for (let i = 0; i < 1000; i++) {
				students.push({
					id: `S${i}`,
					name: `Student${i}`,
					preferences: [`A${Math.floor(Math.random() * 100)}`]
				});
			}

			for (let i = 0; i < 1000; i++) {
				seats.push({
					id: `A${i}`,
					row: Math.floor(i / 50) + 1,
					col: (i % 50) + 1
				});
			}

			const memorySnapshots = [];
			const executionTimes = [];

			// 執行多次分配，監控內存使用
			for (let i = 0; i < 20; i++) {
				const initialMemory = process.memoryUsage();

				const startTime = Date.now();
				const result = engine.assignSeats(students, seats);
				const endTime = Date.now();

				const finalMemory = process.memoryUsage();
				const executionTime = endTime - startTime;

				expect(result.success).to.be.true;
				expect(result.assignments.length).to.equal(1000);

				memorySnapshots.push({
					iteration: i,
					heapUsed: finalMemory.heapUsed,
					heapTotal: finalMemory.heapTotal,
					external: finalMemory.external,
					rss: finalMemory.rss
				});

				executionTimes.push(executionTime);

				// 清理緩存
				cache.clear();

				// 強制垃圾回收
				if (global.gc) {
					global.gc();
				}
			}

			// 分析內存使用趨勢
			const memoryAnalysis = {
				initialHeapUsed: memorySnapshots[0].heapUsed,
				finalHeapUsed: memorySnapshots[memorySnapshots.length - 1].heapUsed,
				memoryGrowth: memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed,
				averageExecutionTime: executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length,
				executionTimeStability: Math.max(...executionTimes) - Math.min(...executionTimes)
			};

			// 驗證沒有明顯的內存洩漏
			expect(memoryAnalysis.memoryGrowth).to.be.lessThan(50 * 1024 * 1024); // 增長不超過50MB
			expect(memoryAnalysis.executionTimeStability).to.be.lessThan(10000); // 執行時間穩定，差異不超過10秒
		});

		it('應該測試緩存導致的內存洩漏', () => {
			const students = [];
			const seats = [];

			// 生成基礎數據
			for (let i = 0; i < 800; i++) {
				students.push({
					id: `S${i}`,
					name: `Student${i}`,
					preferences: [`A${Math.floor(Math.random() * 80)}`]
				});
			}

			for (let i = 0; i < 800; i++) {
				seats.push({
					id: `A${i}`,
					row: Math.floor(i / 40) + 1,
					col: (i % 40) + 1
				});
			}

			const memorySnapshots = [];

			// 執行多次分配，保持緩存
			for (let i = 0; i < 15; i++) {
				const initialMemory = process.memoryUsage();

				const result = engine.assignSeats(students, seats);

				const finalMemory = process.memoryUsage();

				expect(result.success).to.be.true;
				expect(result.assignments.length).to.equal(800);

				memorySnapshots.push({
					iteration: i,
					heapUsed: finalMemory.heapUsed,
					cacheSize: cache.getSize(),
					hitRate: cache.getHitRate()
				});
			}

			// 分析緩存導致的內存增長
			const cacheMemoryAnalysis = {
				initialHeapUsed: memorySnapshots[0].heapUsed,
				finalHeapUsed: memorySnapshots[memorySnapshots.length - 1].heapUsed,
				memoryGrowth: memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed,
				finalCacheSize: memorySnapshots[memorySnapshots.length - 1].cacheSize,
				finalHitRate: memorySnapshots[memorySnapshots.length - 1].hitRate
			};

			// 驗證緩存內存使用合理
			expect(cacheMemoryAnalysis.memoryGrowth).to.be.lessThan(100 * 1024 * 1024); // 增長不超過100MB
			expect(cacheMemoryAnalysis.finalHitRate).to.be.greaterThan(0.5); // 命中率應該超過50%
		});

		it('應該測試條件處理導致的內存洩漏', () => {
			const students = [];
			const seats = [];

			// 生成基礎數據
			for (let i = 0; i < 600; i++) {
				students.push({
					id: `S${i}`,
					name: `Student${i}`,
					preferences: [`A${Math.floor(Math.random() * 60)}`]
				});
			}

			for (let i = 0; i < 600; i++) {
				seats.push({
					id: `A${i}`,
					row: Math.floor(i / 30) + 1,
					col: (i % 30) + 1
				});
			}

			const memorySnapshots = [];

			// 執行多次分配，每次使用不同的條件
			for (let i = 0; i < 10; i++) {
				const conditions = [];

				// 生成不同的條件組合
				for (let j = 0; j < 50; j++) {
					conditions.push({
						type: 'adjacent',
						students: [`S${(i * 50 + j) * 2}`, `S${(i * 50 + j) * 2 + 1}`],
						priority: 50 - j
					});
				}

				const initialMemory = process.memoryUsage();

				const result = engine.assignSeats(students, seats, conditions);

				const finalMemory = process.memoryUsage();

				expect(result.success).to.be.true;
				expect(result.assignments.length).to.equal(600);

				memorySnapshots.push({
					iteration: i,
					heapUsed: finalMemory.heapUsed,
					conditionCount: conditions.length
				});

				// 清理緩存
				cache.clear();

				// 強制垃圾回收
				if (global.gc) {
					global.gc();
				}
			}

			// 分析條件處理的內存使用
			const conditionMemoryAnalysis = {
				initialHeapUsed: memorySnapshots[0].heapUsed,
				finalHeapUsed: memorySnapshots[memorySnapshots.length - 1].heapUsed,
				memoryGrowth: memorySnapshots[memorySnapshots.length - 1].heapUsed - memorySnapshots[0].heapUsed,
				averageMemoryPerIteration: memorySnapshots.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0) / memorySnapshots.length
			};

			// 驗證條件處理沒有內存洩漏
			expect(conditionMemoryAnalysis.memoryGrowth).to.be.lessThan(30 * 1024 * 1024); // 增長不超過30MB
		});
	});

	describe('testMemoryOptimization', () => {
		it('應該測試內存優化策略的效果', () => {
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

			// 禁用內存優化
			engine.setMemoryOptimization(false);
			const startMemory1 = process.memoryUsage().heapUsed;
			const startTime1 = Date.now();

			const result1 = engine.assignSeats(students, seats);

			const endMemory1 = process.memoryUsage().heapUsed;
			const endTime1 = Date.now();
			const memoryUsed1 = endMemory1 - startMemory1;
			const executionTime1 = endTime1 - startTime1;

			expect(result1.success).to.be.true;

			// 啟用內存優化
			engine.setMemoryOptimization(true);
			const startMemory2 = process.memoryUsage().heapUsed;
			const startTime2 = Date.now();

			const result2 = engine.assignSeats(students, seats);

			const endMemory2 = process.memoryUsage().heapUsed;
			const endTime2 = Date.now();
			const memoryUsed2 = endMemory2 - startMemory2;
			const executionTime2 = endTime2 - startTime2;

			expect(result2.success).to.be.true;

			// 驗證內存優化效果
			expect(memoryUsed2).to.be.lessThan(memoryUsed1); // 優化後應該使用更少內存
			expect(memoryUsed2).to.be.lessThan(memoryUsed1 * 0.9); // 至少節省10%內存
		});

		it('應該測試垃圾回收對內存使用的影響', () => {
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

			// 執行分配
			const startMemory = process.memoryUsage();
			const result = engine.assignSeats(students, seats);
			const endMemory = process.memoryUsage();
			const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

			expect(result.success).to.be.true;

			// 強制垃圾回收
			if (global.gc) {
				global.gc();
				const afterGCMemory = process.memoryUsage();
				const memoryAfterGC = afterGCMemory.heapUsed - startMemory.heapUsed;

				// 驗證垃圾回收的效果
				expect(memoryAfterGC).to.be.lessThan(memoryUsed); // GC後應該釋放一些內存
				expect(memoryAfterGC).to.be.lessThan(memoryUsed * 0.8); // 至少釋放20%內存
			}
		});

		it('應該測試內存使用監控和報告', () => {
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

			// 執行分配
			const startMemory = process.memoryUsage();
			const startTime = Date.now();

			const result = engine.assignSeats(students, seats);

			const endMemory = process.memoryUsage();
			const endTime = Date.now();
			const executionTime = endTime - startTime;

			expect(result.success).to.be.true;

			// 獲取內存使用報告
			const memoryReport = engine.generateMemoryReport();

			// 驗證報告內容
			expect(memoryReport).to.be.an('object');
			expect(memoryReport.heapUsed).to.be.a('number');
			expect(memoryReport.heapTotal).to.be.a('number');
			expect(memoryReport.external).to.be.a('number');
			expect(memoryReport.rss).to.be.a('number');
			expect(memoryReport.executionTime).to.be.a('number');
			expect(memoryReport.memoryPerAssignment).to.be.a('number');
			expect(memoryReport.optimizationLevel).to.be.a('string');

			// 驗證報告數據的合理性
			expect(memoryReport.heapUsed).to.be.at.least(0);
			expect(memoryReport.heapTotal).to.be.at.least(memoryReport.heapUsed);
			expect(memoryReport.executionTime).to.be.at.least(0);
			expect(memoryReport.memoryPerAssignment).to.be.at.least(0);
			expect(memoryReport.memoryPerAssignment).to.be.lessThan(200 * 1024); // 每個分配200KB以內
		});

		it('應該測試內存使用警告和限制', () => {
			const students = [];
			const seats = [];

			// 生成大量數據來測試內存限制
			for (let i = 0; i < 3000; i++) {
				students.push({
					id: `S${i}`,
					name: `Student${i}`,
					preferences: [`A${Math.floor(Math.random() * 300)}`],
					metadata: {
						profile: {
							details: {
								personal: {
									info: {
										data: {
											value: 'large_data_for_memory_test'
										}
									}
								}
							}
						}
					}
				});
			}

			for (let i = 0; i < 3000; i++) {
				seats.push({
					id: `A${i}`,
					row: Math.floor(i / 150) + 1,
					col: (i % 150) + 1
				});
			}

			// 設置內存限制
			engine.setMemoryLimit(500 * 1024 * 1024); // 500MB限制

			const startMemory = process.memoryUsage();
			const startTime = Date.now();

			const result = engine.assignSeats(students, seats);

			const endMemory = process.memoryUsage();
			const endTime = Date.now();
			const executionTime = endTime - startTime;
			const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;

			expect(result.success).to.be.true;

			// 驗證內存限制的效果
			expect(memoryUsed).to.be.lessThan(500 * 1024 * 1024); // 不超過500MB
			expect(executionTime).to.be.lessThan(180000); // 3分鐘內完成

			// 檢查是否有內存警告
			const warnings = engine.getMemoryWarnings();
			expect(warnings).to.be.an('array');
		});
	});
});
