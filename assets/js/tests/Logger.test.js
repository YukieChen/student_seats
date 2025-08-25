// Logger.test.js - 日誌測試
import { Logger } from '../engines/Logger.js';

describe('Logger', () => {
	let logger;
	let mockConsole;

	beforeEach(() => {
		// 模擬 console 對象
		mockConsole = {
			log: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			info: jest.fn(),
			debug: jest.fn()
		};

		logger = new Logger({
			logLevel: 'INFO',
			enableConsole: true,
			enableFile: false,
			maxLogSize: 1000
		});

		// 替換 console 對象
		global.console = mockConsole;
	});

	afterEach(() => {
		logger.dispose();
		jest.clearAllMocks();
	});

	describe('testLogging', () => {
		test('應該成功創建日誌實例', () => {
			expect(logger).toBeInstanceOf(Logger);
			expect(logger.options.logLevel).toBe('INFO');
			expect(logger.options.enableConsole).toBe(true);
		});

		test('應該能夠記錄不同級別的日誌', () => {
			logger.log('INFO', 'TestModule', '這是一條信息日誌');
			logger.log('ERROR', 'TestModule', '這是一條錯誤日誌');
			logger.log('WARN', 'TestModule', '這是一條警告日誌');
			logger.log('DEBUG', 'TestModule', '這是一條調試日誌');

			expect(mockConsole.info).toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalled();
			expect(mockConsole.warn).toHaveBeenCalled();
		});

		test('應該能夠記錄帶有詳細信息的日誌', () => {
			const details = {
				userId: 123,
				action: 'login',
				timestamp: Date.now()
			};

			logger.log('INFO', 'UserModule', '用戶登錄成功', details);

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('INFO'),
				expect.stringContaining('UserModule'),
				expect.stringContaining('用戶登錄成功'),
				details
			);
		});

		test('應該能夠記錄錯誤日誌', () => {
			const error = new Error('測試錯誤');
			logger.log('ERROR', 'ErrorModule', '發生錯誤', error);

			expect(mockConsole.error).toHaveBeenCalledWith(
				expect.stringContaining('ERROR'),
				expect.stringContaining('ErrorModule'),
				expect.stringContaining('發生錯誤'),
				error
			);
		});

		test('應該能夠記錄性能日誌', () => {
			const performanceData = {
				executionTime: 150,
				memoryUsage: '50MB',
				operation: 'database_query'
			};

			logger.log('INFO', 'PerformanceModule', '性能數據', performanceData);

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('INFO'),
				expect.stringContaining('PerformanceModule'),
				expect.stringContaining('性能數據'),
				performanceData
			);
		});

		test('應該能夠記錄多行日誌', () => {
			const multiLineMessage = `
                第一行日誌
                第二行日誌
                第三行日誌
            `;

			logger.log('INFO', 'MultiLineModule', multiLineMessage);

			expect(mockConsole.info).toHaveBeenCalledWith(
				expect.stringContaining('INFO'),
				expect.stringContaining('MultiLineModule'),
				expect.stringContaining('第一行日誌')
			);
		});

		test('應該能夠記錄帶有時間戳的日誌', () => {
			const startTime = Date.now();
			logger.log('INFO', 'TimestampModule', '帶時間戳的日誌');
			const endTime = Date.now();

			const logCall = mockConsole.info.mock.calls[0];
			const logMessage = logCall[0];

			// 檢查日誌包含時間戳
			expect(logMessage).toMatch(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
		});
	});

	describe('testLogLevels', () => {
		test('應該正確處理 DEBUG 級別', () => {
			logger = new Logger({ logLevel: 'DEBUG' });

			logger.log('DEBUG', 'DebugModule', '調試信息');
			logger.log('INFO', 'DebugModule', '一般信息');
			logger.log('WARN', 'DebugModule', '警告信息');
			logger.log('ERROR', 'DebugModule', '錯誤信息');

			expect(mockConsole.debug).toHaveBeenCalled();
			expect(mockConsole.info).toHaveBeenCalled();
			expect(mockConsole.warn).toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalled();
		});

		test('應該正確處理 INFO 級別', () => {
			logger = new Logger({ logLevel: 'INFO' });

			logger.log('DEBUG', 'InfoModule', '調試信息');
			logger.log('INFO', 'InfoModule', '一般信息');
			logger.log('WARN', 'InfoModule', '警告信息');
			logger.log('ERROR', 'InfoModule', '錯誤信息');

			expect(mockConsole.debug).not.toHaveBeenCalled();
			expect(mockConsole.info).toHaveBeenCalled();
			expect(mockConsole.warn).toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalled();
		});

		test('應該正確處理 WARN 級別', () => {
			logger = new Logger({ logLevel: 'WARN' });

			logger.log('DEBUG', 'WarnModule', '調試信息');
			logger.log('INFO', 'WarnModule', '一般信息');
			logger.log('WARN', 'WarnModule', '警告信息');
			logger.log('ERROR', 'WarnModule', '錯誤信息');

			expect(mockConsole.debug).not.toHaveBeenCalled();
			expect(mockConsole.info).not.toHaveBeenCalled();
			expect(mockConsole.warn).toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalled();
		});

		test('應該正確處理 ERROR 級別', () => {
			logger = new Logger({ logLevel: 'ERROR' });

			logger.log('DEBUG', 'ErrorModule', '調試信息');
			logger.log('INFO', 'ErrorModule', '一般信息');
			logger.log('WARN', 'ErrorModule', '警告信息');
			logger.log('ERROR', 'ErrorModule', '錯誤信息');

			expect(mockConsole.debug).not.toHaveBeenCalled();
			expect(mockConsole.info).not.toHaveBeenCalled();
			expect(mockConsole.warn).not.toHaveBeenCalled();
			expect(mockConsole.error).toHaveBeenCalled();
		});

		test('應該正確處理 OFF 級別', () => {
			logger = new Logger({ logLevel: 'OFF' });

			logger.log('DEBUG', 'OffModule', '調試信息');
			logger.log('INFO', 'OffModule', '一般信息');
			logger.log('WARN', 'OffModule', '警告信息');
			logger.log('ERROR', 'OffModule', '錯誤信息');

			expect(mockConsole.debug).not.toHaveBeenCalled();
			expect(mockConsole.info).not.toHaveBeenCalled();
			expect(mockConsole.warn).not.toHaveBeenCalled();
			expect(mockConsole.error).not.toHaveBeenCalled();
		});

		test('應該動態調整日誌級別', () => {
			logger = new Logger({ logLevel: 'ERROR' });

			// 初始只記錄錯誤
			logger.log('INFO', 'DynamicModule', '一般信息');
			expect(mockConsole.info).not.toHaveBeenCalled();

			// 調整為 INFO 級別
			logger.setLogLevel('INFO');
			logger.log('INFO', 'DynamicModule', '一般信息');
			expect(mockConsole.info).toHaveBeenCalled();
		});

		test('應該獲取當前日誌級別', () => {
			logger = new Logger({ logLevel: 'WARN' });

			const currentLevel = logger.getLogLevel();
			expect(currentLevel).toBe('WARN');
		});

		test('應該檢查日誌級別是否啟用', () => {
			logger = new Logger({ logLevel: 'INFO' });

			expect(logger.isLevelEnabled('DEBUG')).toBe(false);
			expect(logger.isLevelEnabled('INFO')).toBe(true);
			expect(logger.isLevelEnabled('WARN')).toBe(true);
			expect(logger.isLevelEnabled('ERROR')).toBe(true);
		});
	});

	describe('testLogExport', () => {
		test('應該能夠導出日誌到 JSON 格式', () => {
			// 記錄一些日誌
			logger.log('INFO', 'ExportModule', '導出測試信息');
			logger.log('ERROR', 'ExportModule', '導出測試錯誤');

			const exportedLogs = logger.exportLogs('json');

			expect(exportedLogs).toBeDefined();
			expect(typeof exportedLogs).toBe('string');

			const parsedLogs = JSON.parse(exportedLogs);
			expect(Array.isArray(parsedLogs)).toBe(true);
			expect(parsedLogs.length).toBeGreaterThan(0);
		});

		test('應該能夠導出日誌到 CSV 格式', () => {
			// 記錄一些日誌
			logger.log('INFO', 'CSVModule', 'CSV導出測試');
			logger.log('WARN', 'CSVModule', 'CSV警告測試');

			const exportedLogs = logger.exportLogs('csv');

			expect(exportedLogs).toBeDefined();
			expect(typeof exportedLogs).toBe('string');
			expect(exportedLogs).toContain('timestamp,level,module,message');
			expect(exportedLogs).toContain('CSV導出測試');
		});

		test('應該能夠導出日誌到 TXT 格式', () => {
			// 記錄一些日誌
			logger.log('INFO', 'TXTModule', 'TXT導出測試');
			logger.log('ERROR', 'TXTModule', 'TXT錯誤測試');

			const exportedLogs = logger.exportLogs('txt');

			expect(exportedLogs).toBeDefined();
			expect(typeof exportedLogs).toBe('string');
			expect(exportedLogs).toContain('TXT導出測試');
			expect(exportedLogs).toContain('TXT錯誤測試');
		});

		test('應該能夠按時間範圍導出日誌', () => {
			const startTime = Date.now();

			// 記錄一些日誌
			logger.log('INFO', 'TimeRangeModule', '時間範圍測試1');

			// 等待一秒
			setTimeout(() => {
				logger.log('INFO', 'TimeRangeModule', '時間範圍測試2');
			}, 100);

			const endTime = Date.now();

			const exportedLogs = logger.exportLogs('json', {
				startTime,
				endTime
			});

			expect(exportedLogs).toBeDefined();
		});

		test('應該能夠按日誌級別過濾導出', () => {
			// 記錄不同級別的日誌
			logger.log('DEBUG', 'FilterModule', '調試信息');
			logger.log('INFO', 'FilterModule', '一般信息');
			logger.log('WARN', 'FilterModule', '警告信息');
			logger.log('ERROR', 'FilterModule', '錯誤信息');

			const exportedLogs = logger.exportLogs('json', {
				levels: ['ERROR', 'WARN']
			});

			const parsedLogs = JSON.parse(exportedLogs);
			const hasDebug = parsedLogs.some(log => log.level === 'DEBUG');
			const hasInfo = parsedLogs.some(log => log.level === 'INFO');

			expect(hasDebug).toBe(false);
			expect(hasInfo).toBe(false);
		});

		test('應該能夠按模組過濾導出', () => {
			// 記錄不同模組的日誌
			logger.log('INFO', 'ModuleA', '模組A信息');
			logger.log('INFO', 'ModuleB', '模組B信息');
			logger.log('INFO', 'ModuleC', '模組C信息');

			const exportedLogs = logger.exportLogs('json', {
				modules: ['ModuleA', 'ModuleC']
			});

			const parsedLogs = JSON.parse(exportedLogs);
			const hasModuleA = parsedLogs.some(log => log.module === 'ModuleA');
			const hasModuleB = parsedLogs.some(log => log.module === 'ModuleB');
			const hasModuleC = parsedLogs.some(log => log.module === 'ModuleC');

			expect(hasModuleA).toBe(true);
			expect(hasModuleB).toBe(false);
			expect(hasModuleC).toBe(true);
		});

		test('應該能夠獲取日誌統計信息', () => {
			// 記錄一些日誌
			logger.log('INFO', 'StatsModule', '統計測試1');
			logger.log('ERROR', 'StatsModule', '統計測試2');
			logger.log('WARN', 'StatsModule', '統計測試3');
			logger.log('INFO', 'StatsModule', '統計測試4');

			const stats = logger.getLogStats();

			expect(stats.totalLogs).toBeGreaterThan(0);
			expect(stats.levels).toBeDefined();
			expect(stats.modules).toBeDefined();
			expect(stats.timeRange).toBeDefined();
		});

		test('應該能夠清理舊日誌', () => {
			// 記錄一些日誌
			logger.log('INFO', 'CleanupModule', '清理測試');

			const beforeCleanup = logger.getLogStats().totalLogs;
			logger.cleanupLogs(0); // 清理所有日誌
			const afterCleanup = logger.getLogStats().totalLogs;

			expect(afterCleanup).toBe(0);
			expect(afterCleanup).toBeLessThan(beforeCleanup);
		});

		test('應該能夠備份日誌', () => {
			// 記錄一些日誌
			logger.log('INFO', 'BackupModule', '備份測試');

			const backupResult = logger.backupLogs('test_backup');

			expect(backupResult.success).toBe(true);
			expect(backupResult.backupId).toBeDefined();
		});
	});
});
