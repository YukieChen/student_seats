// AssignmentCache.test.js - 緩存測試
import { AssignmentCache } from '../engines/AssignmentCache.js';

describe('AssignmentCache', () => {
	let cache;
	let mockData;

	beforeEach(() => {
		cache = new AssignmentCache({
			maxCacheSize: 100,
			enableCompression: true,
			enableMonitoring: true
		});

		mockData = {
			students: [1, 2, 3, 4, 5],
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
					students: [[1, 2]]
				}
			]
		};
	});

	afterEach(() => {
		cache.clear();
	});

	describe('testCacheFunctionality', () => {
		test('應該成功創建緩存實例', () => {
			expect(cache).toBeInstanceOf(AssignmentCache);
			expect(cache.options.maxCacheSize).toBe(100);
			expect(cache.options.enableCompression).toBe(true);
		});

		test('應該能夠存儲和檢索數據', () => {
			const key = 'test_key';
			const value = { result: 'success', data: mockData };

			cache.set(key, value);
			const retrieved = cache.get(key);

			expect(retrieved).toEqual(value);
			expect(cache.has(key)).toBe(true);
		});

		test('應該處理緩存命中', () => {
			const key = 'hit_test';
			const value = { result: 'hit' };

			cache.set(key, value);
			const firstGet = cache.get(key);
			const secondGet = cache.get(key);

			expect(firstGet).toEqual(value);
			expect(secondGet).toEqual(value);

			const stats = cache.getCacheStats();
			expect(stats.hits).toBeGreaterThan(0);
		});

		test('應該處理緩存未命中', () => {
			const key = 'miss_test';

			const result = cache.get(key);

			expect(result).toBeUndefined();
			expect(cache.has(key)).toBe(false);

			const stats = cache.getCacheStats();
			expect(stats.misses).toBeGreaterThan(0);
		});

		test('應該能夠刪除緩存項', () => {
			const key = 'delete_test';
			const value = { result: 'to_delete' };

			cache.set(key, value);
			expect(cache.has(key)).toBe(true);

			cache.delete(key);
			expect(cache.has(key)).toBe(false);
			expect(cache.get(key)).toBeUndefined();
		});

		test('應該能夠清空緩存', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');

			expect(cache.size()).toBeGreaterThan(0);

			cache.clear();
			expect(cache.size()).toBe(0);
			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBeUndefined();
		});

		test('應該處理數據壓縮', () => {
			const key = 'compression_test';
			const largeData = {
				students: Array.from({ length: 1000 }, (_, i) => i),
				seats: Array.from({ length: 50 }, (_, row) =>
					Array.from({ length: 50 }, (_, col) => ({
						row, col, isValid: true, groupId: 'A', studentId: undefined
					}))
				),
				conditions: Array.from({ length: 100 }, (_, i) => ({
					type: 'adjacent',
					students: [[i, i + 1]]
				}))
			};

			cache.set(key, largeData);
			const retrieved = cache.get(key);

			expect(retrieved).toEqual(largeData);
		});
	});

	describe('testCachePerformance', () => {
		test('應該在合理時間內完成大量操作', () => {
			const startTime = Date.now();

			// 執行1000次存儲操作
			for (let i = 0; i < 1000; i++) {
				cache.set(`key_${i}`, { data: i, timestamp: Date.now() });
			}

			// 執行1000次檢索操作
			for (let i = 0; i < 1000; i++) {
				cache.get(`key_${i}`);
			}

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			expect(totalTime).toBeLessThan(5000); // 5秒內完成2000次操作
		});

		test('應該正確計算緩存命中率', () => {
			// 設置一些數據
			for (let i = 0; i < 10; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			// 執行一些命中操作
			for (let i = 0; i < 5; i++) {
				cache.get(`key_${i}`);
			}

			// 執行一些未命中操作
			for (let i = 10; i < 15; i++) {
				cache.get(`key_${i}`);
			}

			const stats = cache.getCacheStats();
			const hitRate = stats.hits / (stats.hits + stats.misses);

			expect(hitRate).toBeGreaterThan(0);
			expect(hitRate).toBeLessThanOrEqual(1);
		});

		test('應該監控緩存大小', () => {
			const initialSize = cache.size();

			// 添加一些數據
			for (let i = 0; i < 50; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			const finalSize = cache.size();
			expect(finalSize).toBeGreaterThan(initialSize);

			const sizeInfo = cache.monitorCacheSize();
			expect(sizeInfo.currentSize).toBeGreaterThan(0);
			expect(sizeInfo.maxSize).toBe(100);
		});

		test('應該監控緩存性能', () => {
			// 執行一些操作來生成性能數據
			for (let i = 0; i < 100; i++) {
				cache.set(`key_${i}`, { data: i });
				cache.get(`key_${i}`);
			}

			const performance = cache.monitorCachePerformance();

			expect(performance.hitRate).toBeGreaterThan(0);
			expect(performance.size).toBeGreaterThan(0);
			expect(performance.performance).toBeDefined();
		});

		test('應該生成緩存報告', () => {
			// 執行一些操作
			for (let i = 0; i < 20; i++) {
				cache.set(`key_${i}`, { data: i });
				cache.get(`key_${i}`);
			}

			const report = cache.generateCacheReport();

			expect(report.summary).toBeDefined();
			expect(report.performance).toBeDefined();
			expect(report.recommendations).toBeDefined();
		});
	});

	describe('testCacheCleanup', () => {
		test('應該執行LRU清理策略', () => {
			// 填充緩存
			for (let i = 0; i < 120; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			const beforeCleanup = cache.size();
			cache.lruCleanup(80); // 清理到80個項目
			const afterCleanup = cache.size();

			expect(afterCleanup).toBeLessThanOrEqual(80);
			expect(afterCleanup).toBeLessThan(beforeCleanup);
		});

		test('應該執行LFU清理策略', () => {
			// 填充緩存並設置不同的訪問頻率
			for (let i = 0; i < 100; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			// 讓某些項目被訪問更多次
			for (let j = 0; j < 10; j++) {
				for (let i = 0; i < 20; i++) {
					cache.get(`key_${i}`); // 前20個項目被訪問更多
				}
			}

			const beforeCleanup = cache.size();
			cache.lfuCleanup(60); // 清理到60個項目
			const afterCleanup = cache.size();

			expect(afterCleanup).toBeLessThanOrEqual(60);
			expect(afterCleanup).toBeLessThan(beforeCleanup);
		});

		test('應該執行自適應清理策略', () => {
			// 填充緩存
			for (let i = 0; i < 100; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			const beforeCleanup = cache.size();
			cache.adaptiveCleanup(70); // 清理到70個項目
			const afterCleanup = cache.size();

			expect(afterCleanup).toBeLessThanOrEqual(70);
			expect(afterCleanup).toBeLessThan(beforeCleanup);
		});

		test('應該選擇合適的清理策略', () => {
			// 填充緩存
			for (let i = 0; i < 100; i++) {
				cache.set(`key_${i}`, { data: i });
			}

			const beforeCleanup = cache.size();
			cache.selectCleanupStrategy('lru', 80);
			const afterCleanup = cache.size();

			expect(afterCleanup).toBeLessThanOrEqual(80);
			expect(afterCleanup).toBeLessThan(beforeCleanup);
		});

		test('應該處理緩存預熱', () => {
			const prewarmData = {
				students: [1, 2, 3, 4, 5],
				seats: mockData.seats,
				conditions: mockData.conditions
			};

			const prewarmResult = cache.executePrewarm(
				prewarmData.students,
				prewarmData.seats,
				prewarmData.conditions
			);

			expect(prewarmResult.success).toBe(true);
			expect(prewarmResult.cachedItems).toBeGreaterThan(0);
		});

		test('應該評估預熱效果', () => {
			const prewarmStats = {
				cachedItems: 10,
				cacheSize: 50,
				executionTime: 100
			};

			const effect = cache.evaluatePrewarmEffect(prewarmStats);

			expect(effect.effectiveness).toBeDefined();
			expect(effect.recommendations).toBeDefined();
		});

		test('應該優化預熱策略', () => {
			const prewarmStats = {
				cachedItems: 10,
				cacheSize: 50,
				executionTime: 100
			};

			const effect = { effectiveness: 0.8, recommendations: ['increase_cache_size'] };

			const optimization = cache.optimizePrewarm(prewarmStats, effect);

			expect(optimization.improvements).toBeDefined();
			expect(optimization.newStrategy).toBeDefined();
		});
	});
});
