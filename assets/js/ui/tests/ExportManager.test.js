/**
 * ExportManager 模組單元測試
 */
const ExportManager = require('../ExportManager.js');

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
			},
			toContain: (expected) => {
				if (typeof value === 'string' && !value.includes(expected)) {
					throw new Error(`期望字符串包含 "${expected}"，但得到 "${value}"`);
				} else if (Array.isArray(value) && !value.includes(expected)) {
					throw new Error(`期望數組包含 ${expected}，但得到 ${JSON.stringify(value)}`);
				}
			}
		};
	}

	runTests() {
		console.log('🚀 開始執行 ExportManager 測試...\n');

		// 模擬 logger
		const mockLogger = {
			log: () => { },
			error: () => { },
			warn: () => { },
			info: () => { }
		};

		this.describe('constructor', () => {
			this.test('應該正確初始化基本屬性', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				this.expect(exportManager.exportConfig).toBeDefined();
				this.expect(exportManager.formatSupport).toBeDefined();
				this.expect(exportManager.templates).toBeInstanceOf(Map);
				this.expect(exportManager.exportQueue).toBeInstanceOf(Array);
				this.expect(exportManager.exportHistory).toBeInstanceOf(Array);
				this.expect(exportManager.customFormats).toBeInstanceOf(Map);
			});

			this.test('應該使用默認配置', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				this.expect(exportManager.exportConfig.defaultFormat).toBe('json');
				this.expect(exportManager.exportConfig.autoDownload).toBe(true);
				this.expect(exportManager.exportConfig.includeMetadata).toBe(true);
				this.expect(exportManager.exportConfig.compression).toBe(false);
				this.expect(exportManager.exportConfig.maxFileSize).toBe(10 * 1024 * 1024);
			});

			this.test('應該正確設置自定義選項', () => {
				const customManager = new ExportManager({
					defaultFormat: 'csv',
					autoDownload: false,
					includeMetadata: false,
					compression: true,
					maxFileSize: 5 * 1024 * 1024
				});

				this.expect(customManager.exportConfig.defaultFormat).toBe('csv');
				this.expect(customManager.exportConfig.autoDownload).toBe(false);
				this.expect(customManager.exportConfig.includeMetadata).toBe(false);
				this.expect(customManager.exportConfig.compression).toBe(true);
				this.expect(customManager.exportConfig.maxFileSize).toBe(5 * 1024 * 1024);
			});
		});

		this.describe('exportToJSON', () => {
			this.test('應該成功導出JSON格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};

				const result = exportManager.exportToJSON(data);

				this.expect(result.success).toBe(true);
				this.expect(result.filename).toBe('export.json');
				this.expect(result.format).toBe('json');
				this.expect(result.size).toBeDefined();
				this.expect(result.data).toBeDefined();
				this.expect(result.blob).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});

			this.test('應該支持美化輸出', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = { test: 'value' };

				const result = exportManager.exportToJSON(data, { prettyPrint: true });

				this.expect(result.success).toBe(true);
				this.expect(result.data).toContain('\n');
			});

			this.test('應該支持包含元數據', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = { test: 'value' };

				const result = exportManager.exportToJSON(data, { includeMetadata: true });

				this.expect(result.success).toBe(true);
				this.expect(result.data).toContain('metadata');
				this.expect(result.data).toContain('exportedAt');
			});
		});

		this.describe('exportToCSV', () => {
			this.test('應該成功導出CSV格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [
					{ name: 'Alice', seat: 'A1' },
					{ name: 'Bob', seat: 'A2' }
				];

				const result = exportManager.exportToCSV(data);

				this.expect(result.success).toBe(true);
				this.expect(result.filename).toBe('export.csv');
				this.expect(result.format).toBe('csv');
				this.expect(result.size).toBeDefined();
				this.expect(result.data).toBeDefined();
				this.expect(result.data).toContain('name,seat');
				this.expect(result.data).toContain('Alice,A1');
			});

			this.test('應該支持自定義分隔符', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [
					{ name: 'Alice', seat: 'A1' }
				];

				const result = exportManager.exportToCSV(data, { delimiter: ';' });

				this.expect(result.success).toBe(true);
				this.expect(result.data).toContain('name;seat');
			});

			this.test('應該處理包含分隔符的值', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [
					{ name: 'Alice, Smith', seat: 'A1' }
				];

				const result = exportManager.exportToCSV(data);

				this.expect(result.success).toBe(true);
				this.expect(result.data).toContain('"Alice, Smith"');
			});
		});

		this.describe('exportToExcel', () => {
			this.test('應該成功導出Excel格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [
					{ name: 'Alice', seat: 'A1' },
					{ name: 'Bob', seat: 'A2' }
				];

				const result = exportManager.exportToExcel(data);

				this.expect(result.success).toBe(true);
				this.expect(result.filename).toBe('export.xlsx');
				this.expect(result.format).toBe('excel');
				this.expect(result.size).toBeDefined();
				this.expect(result.data).toBeDefined();
			});

			this.test('應該支持自定義工作表名稱', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [{ name: 'Alice', seat: 'A1' }];

				const result = exportManager.exportToExcel(data, { sheetName: 'Students' });

				this.expect(result.success).toBe(true);
			});
		});

		this.describe('exportToPDF', () => {
			this.test('應該成功導出PDF格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [
					{ name: 'Alice', seat: 'A1' },
					{ name: 'Bob', seat: 'A2' }
				];

				const result = exportManager.exportToPDF(data);

				this.expect(result.success).toBe(true);
				this.expect(result.filename).toBe('export.pdf');
				this.expect(result.format).toBe('pdf');
				this.expect(result.size).toBeDefined();
				this.expect(result.data).toBeDefined();
				this.expect(result.data).toContain('PDF Report');
			});

			this.test('應該支持自定義標題', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = [{ name: 'Alice', seat: 'A1' }];

				const result = exportManager.exportToPDF(data, { title: 'Custom Report' });

				this.expect(result.success).toBe(true);
				this.expect(result.data).toContain('Custom Report');
			});
		});

		this.describe('batchExportFiles', () => {
			this.test('應該成功批量導出文件', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const files = [
					{ data: { name: 'Alice' }, filename: 'alice.json' },
					{ data: { name: 'Bob' }, filename: 'bob.json' }
				];

				const result = exportManager.batchExportFiles(files);

				this.expect(result.success).toBe(true);
				this.expect(result.totalFiles).toBe(2);
				this.expect(result.format).toBe('json');
				this.expect(result.results).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('batchExportData', () => {
			this.test('應該成功批量導出數據', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const dataSets = {
					students: [{ name: 'Alice' }, { name: 'Bob' }],
					seats: [{ id: 'A1' }, { id: 'A2' }]
				};

				const result = exportManager.batchExportData(dataSets);

				this.expect(result.success).toBe(true);
				this.expect(result.totalDatasets).toBe(2);
				this.expect(result.format).toBe('json');
				this.expect(result.results).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('batchExportReports', () => {
			this.test('應該成功批量導出報告', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const reports = [
					{ name: 'Report1', content: 'Content 1' },
					{ name: 'Report2', content: 'Content 2' }
				];

				const result = exportManager.batchExportReports(reports);

				this.expect(result.success).toBe(true);
				this.expect(result.totalReports).toBe(2);
				this.expect(result.format).toBe('pdf');
				this.expect(result.results).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('batchExportConfigurations', () => {
			this.test('應該成功批量導出配置', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const configs = {
					config1: { setting1: 'value1' },
					config2: { setting2: 'value2' }
				};

				const result = exportManager.batchExportConfigurations(configs);

				this.expect(result.success).toBe(true);
				this.expect(result.totalConfigs).toBe(2);
				this.expect(result.format).toBe('json');
				this.expect(result.results).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('createTemplate', () => {
			this.test('應該成功創建模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const templateData = {
					format: 'json',
					prettyPrint: true,
					includeMetadata: true
				};

				const result = exportManager.createTemplate(templateData, {
					name: 'Test Template',
					description: 'A test template'
				});

				this.expect(result.success).toBe(true);
				this.expect(result.template).toBeDefined();
				this.expect(result.template.name).toBe('Test Template');
				this.expect(result.template.description).toBe('A test template');
				this.expect(result.template.format).toBe('json');
				this.expect(result.template.config).toEqual(templateData);
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('editTemplate', () => {
			this.test('應該成功編輯模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先創建一個模板
				const createResult = exportManager.createTemplate({ format: 'json' }, { name: 'Original' });
				const templateId = createResult.template.id;

				// 編輯模板
				const result = exportManager.editTemplate(templateId, { name: 'Updated' });

				this.expect(result.success).toBe(true);
				this.expect(result.template.name).toBe('Updated');
				this.expect(result.timestamp).toBeDefined();
			});

			this.test('應該處理不存在的模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				const result = exportManager.editTemplate('nonexistent', { name: 'Updated' });

				this.expect(result.success).toBe(false);
				this.expect(result.error).toContain('not found');
			});
		});

		this.describe('applyTemplate', () => {
			this.test('應該成功應用模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先創建一個模板
				const createResult = exportManager.createTemplate({ format: 'json' }, { name: 'Test Template' });
				const templateId = createResult.template.id;

				// 應用模板
				const data = { test: 'value' };
				const result = exportManager.applyTemplate(templateId, data);

				this.expect(result.success).toBe(true);
				this.expect(result.template).toBeDefined();
				this.expect(result.exportResult).toBeDefined();
				this.expect(result.exportResult.success).toBe(true);
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('manageTemplates', () => {
			this.test('應該成功列出模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 創建一個模板
				const result1 = exportManager.createTemplate({ format: 'json' }, { name: 'Template 1' });
				this.expect(result1.success).toBe(true);

				const result = exportManager.manageTemplates('list');

				this.expect(result.success).toBe(true);
				this.expect(result.templates).toBeDefined();
				this.expect(result.count).toBe(1);
				this.expect(result.timestamp).toBeDefined();
			});

			this.test('應該成功刪除模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先創建一個模板
				const createResult = exportManager.createTemplate({ format: 'json' }, { name: 'To Delete' });
				const templateId = createResult.template.id;

				// 刪除模板
				const result = exportManager.manageTemplates('delete', { templateId });

				this.expect(result.success).toBe(true);
				this.expect(result.deleted).toBe(true);
				this.expect(result.templateId).toBe(templateId);
				this.expect(result.timestamp).toBeDefined();
			});

			this.test('應該成功複製模板', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先創建一個模板
				const createResult = exportManager.createTemplate({ format: 'json' }, { name: 'Original' });
				const templateId = createResult.template.id;

				// 複製模板
				const result = exportManager.manageTemplates('duplicate', { templateId });

				this.expect(result.success).toBe(true);
				this.expect(result.template).toBeDefined();
				this.expect(result.template.name).toContain('(Copy)');
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('defineFormat', () => {
			this.test('應該成功定義自定義格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const formatConfig = {
					requiredFields: ['name', 'seat'],
					validation: 'strict'
				};

				const result = exportManager.defineFormat('custom', formatConfig, {
					description: 'Custom format for testing'
				});

				this.expect(result.success).toBe(true);
				this.expect(result.format).toBeDefined();
				this.expect(result.format.name).toBe('custom');
				this.expect(result.format.description).toBe('Custom format for testing');
				this.expect(result.format.enabled).toBe(true);
				this.expect(result.format.config).toEqual(formatConfig);
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('validateFormat', () => {
			this.test('應該成功驗證格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先定義一個格式
				exportManager.defineFormat('test', { requiredFields: ['name'] });

				// 驗證格式
				const data = { name: 'Alice', seat: 'A1' };
				const result = exportManager.validateFormat('test', data);

				this.expect(result.success).toBe(true);
				this.expect(result.format).toBe('test');
				this.expect(result.valid).toBe(true);
				this.expect(result.errors).toBeDefined();
				this.expect(result.warnings).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});

			this.test('應該檢測缺少的必需字段', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先定義一個格式
				exportManager.defineFormat('test', { requiredFields: ['name', 'seat'] });

				// 驗證格式（缺少必需字段）
				const data = { name: 'Alice' };
				const result = exportManager.validateFormat('test', data);

				this.expect(result.success).toBe(true);
				this.expect(result.valid).toBe(false);
				this.expect(result.errors).toContain("Required field 'seat' is missing");
			});
		});

		this.describe('convertFormat', () => {
			this.test('應該成功轉換格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });
				const data = { name: 'Alice', seat: 'A1' };

				const result = exportManager.convertFormat(data, 'json', 'csv');

				this.expect(result.success).toBe(true);
				this.expect(result.sourceFormat).toBe('json');
				this.expect(result.targetFormat).toBe('csv');
				this.expect(result.sourceExport).toBeDefined();
				this.expect(result.targetExport).toBeDefined();
				this.expect(result.sourceExport.success).toBe(true);
				this.expect(result.targetExport.success).toBe(true);
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('optimizeFormat', () => {
			this.test('應該成功優化格式', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 先定義一個格式
				exportManager.defineFormat('test', { optimization: 'enabled' });

				// 優化格式
				const data = { name: 'Alice', seat: 'A1' };
				const result = exportManager.optimizeFormat('test', data, {
					optimizeSize: true,
					optimizeSpeed: true
				});

				this.expect(result.success).toBe(true);
				this.expect(result.format).toBe('test');
				this.expect(result.optimizations).toBeDefined();
				this.expect(result.improvements).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('getExportStats', () => {
			this.test('應該返回正確的導出統計', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 添加一些測試數據
				exportManager.createTemplate({ format: 'json' }, { name: 'Template 1' });
				exportManager.defineFormat('custom', {});

				const stats = exportManager.getExportStats();

				this.expect(stats.templates).toBe(1);
				this.expect(stats.customFormats).toBe(1);
				this.expect(stats.exportHistory).toBe(0);
				this.expect(stats.supportedFormats).toBe(6); // json, csv, excel, pdf, xml, txt
				this.expect(stats.queueLength).toBe(0);
			});
		});

		this.describe('reset', () => {
			this.test('應該成功重置導出管理器', () => {
				const exportManager = new ExportManager({ logger: mockLogger });

				// 添加一些測試數據
				exportManager.createTemplate({ format: 'json' }, { name: 'Template 1' });
				exportManager.defineFormat('custom', {});

				const result = exportManager.reset();

				this.expect(result.success).toBe(true);
				this.expect(exportManager.templates.size).toBe(0);
				this.expect(exportManager.exportQueue.length).toBe(0);
				this.expect(exportManager.exportHistory.length).toBe(0);
				this.expect(exportManager.customFormats.size).toBe(0);
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
