/**
 * DebugPanel 模組單元測試
 */
const DebugPanel = require('../DebugPanel.js');

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
		console.log('🚀 開始執行 DebugPanel 測試...\n');

		// 模擬 logger
		const mockLogger = {
			log: () => { },
			error: () => { },
			warn: () => { },
			info: () => { }
		};

		this.describe('constructor', () => {
			this.test('應該正確初始化基本屬性', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				this.expect(debugPanel.debugConfig).toBeDefined();
				this.expect(debugPanel.toolPanel).toBeDefined();
				this.expect(debugPanel.stateHistory).toBeInstanceOf(Array);
				this.expect(debugPanel.variableWatches).toBeInstanceOf(Map);
				this.expect(debugPanel.logEntries).toBeInstanceOf(Array);
				this.expect(debugPanel.performanceData).toBeInstanceOf(Array);
				this.expect(debugPanel.executionSteps).toBeInstanceOf(Array);
				this.expect(debugPanel.problemHistory).toBeInstanceOf(Array);
				this.expect(debugPanel.isRecording).toBe(false);
				this.expect(debugPanel.isPlaying).toBe(false);
				this.expect(debugPanel.currentStepIndex).toBe(0);
			});

			this.test('應該使用默認配置', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				this.expect(debugPanel.debugConfig.enabled).toBe(true);
				this.expect(debugPanel.debugConfig.logLevel).toBe('info');
				this.expect(debugPanel.debugConfig.autoRefresh).toBe(true);
				this.expect(debugPanel.debugConfig.refreshInterval).toBe(1000);
				this.expect(debugPanel.debugConfig.maxLogEntries).toBe(1000);
			});

			this.test('應該正確設置自定義選項', () => {
				const customPanel = new DebugPanel({
					enabled: false,
					logLevel: 'debug',
					autoRefresh: false,
					refreshInterval: 2000,
					maxLogEntries: 500
				});

				this.expect(customPanel.debugConfig.enabled).toBe(false);
				this.expect(customPanel.debugConfig.logLevel).toBe('debug');
				this.expect(customPanel.debugConfig.autoRefresh).toBe(false);
				this.expect(customPanel.debugConfig.refreshInterval).toBe(2000);
				this.expect(customPanel.debugConfig.maxLogEntries).toBe(500);
			});
		});

		this.describe('displayStatePanel', () => {
			this.test('應該成功顯示狀態面板', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const stateData = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};

				const result = debugPanel.displayStatePanel(stateData);

				this.expect(result.success).toBe(true);
				this.expect(result.panelId).toBe('state-panel');
				this.expect(result.data).toBeDefined();
				this.expect(debugPanel.toolPanel.statePanel).toBeDefined();
				this.expect(debugPanel.stateHistory.length).toBe(1);
			});
		});

		this.describe('displayVariableWatchPanel', () => {
			this.test('應該成功顯示變數監視面板', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const variables = {
					studentCount: 30,
					seatCount: 30,
					assignmentCount: 25
				};

				const result = debugPanel.displayVariableWatchPanel(variables);

				this.expect(result.success).toBe(true);
				this.expect(result.panelId).toBe('variable-watch-panel');
				this.expect(result.data).toBeDefined();
				this.expect(debugPanel.toolPanel.variableWatchPanel).toBeDefined();
				this.expect(debugPanel.variableWatches.size).toBe(3);
			});
		});

		this.describe('displayLogPanel', () => {
			this.test('應該成功顯示日誌面板', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const logData = {
					level: 'info',
					message: 'Test log message',
					source: 'test',
					data: { test: true }
				};

				const result = debugPanel.displayLogPanel(logData);

				this.expect(result.success).toBe(true);
				this.expect(result.panelId).toBe('log-panel');
				this.expect(result.data).toBeDefined();
				this.expect(debugPanel.toolPanel.logPanel).toBeDefined();
				this.expect(debugPanel.logEntries.length).toBe(1);
			});
		});

		this.describe('displayPerformancePanel', () => {
			this.test('應該成功顯示性能監控面板', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const performanceData = {
					executionTime: 1500,
					memoryUsage: 256,
					cpuUsage: 45,
					iterations: 1000
				};

				const result = debugPanel.displayPerformancePanel(performanceData);

				this.expect(result.success).toBe(true);
				this.expect(result.panelId).toBe('performance-panel');
				this.expect(result.data).toBeDefined();
				this.expect(debugPanel.toolPanel.performancePanel).toBeDefined();
				this.expect(debugPanel.performanceData.length).toBe(1);
			});
		});

		this.describe('checkCurrentState', () => {
			this.test('應該成功檢查當前狀態', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const stateData = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};

				const result = debugPanel.checkCurrentState(stateData);

				this.expect(result.success).toBe(true);
				this.expect(result.checks).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('trackStateChanges', () => {
			this.test('應該成功追蹤狀態變更', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const newState = {
					students: ['Alice', 'Bob', 'Charlie'],
					seats: ['A1', 'A2', 'A3'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2', 'Charlie': 'A3' }
				};

				const result = debugPanel.trackStateChanges(newState);

				this.expect(result.success).toBe(true);
				this.expect(result.changes).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
				this.expect(debugPanel.stateHistory.length).toBe(1);
			});
		});

		this.describe('validateState', () => {
			this.test('應該成功驗證狀態', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const stateData = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};

				const result = debugPanel.validateState(stateData);

				this.expect(result.success).toBe(true);
				this.expect(result.isValid).toBeDefined();
				this.expect(result.validations).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('repairState', () => {
			this.test('應該成功修復狀態', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const stateData = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};
				const issues = [
					{ type: 'missing_assignment', student: 'Charlie' }
				];

				const result = debugPanel.repairState(stateData, issues);

				this.expect(result.success).toBe(true);
				this.expect(result.repairs).toBeDefined();
				this.expect(result.repairedState).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('recordExecutionSteps', () => {
			this.test('應該成功記錄執行步驟', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const steps = [
					{ step: 1, action: 'Initialize students' },
					{ step: 2, action: 'Assign seats' },
					{ step: 3, action: 'Validate assignments' }
				];

				const result = debugPanel.recordExecutionSteps(steps);

				this.expect(result.success).toBe(true);
				this.expect(result.stepsRecorded).toBe(3);
				this.expect(result.totalSteps).toBe(3);
				this.expect(result.timestamp).toBeDefined();
				this.expect(debugPanel.isRecording).toBe(true);
			});
		});

		this.describe('controlStepPlayback', () => {
			this.test('應該成功控制步驟回放', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				// 先記錄一些步驟
				debugPanel.recordExecutionSteps([
					{ step: 1, action: 'Step 1' },
					{ step: 2, action: 'Step 2' },
					{ step: 3, action: 'Step 3' }
				]);

				const result = debugPanel.controlStepPlayback('play');

				this.expect(result.success).toBe(true);
				this.expect(result.control).toBe('play');
				this.expect(result.currentStep).toBe(0);
				this.expect(result.totalSteps).toBe(3);
				this.expect(result.isPlaying).toBe(true);
			});

			this.test('應該成功暫停步驟回放', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				debugPanel.recordExecutionSteps([
					{ step: 1, action: 'Step 1' },
					{ step: 2, action: 'Step 2' }
				]);
				debugPanel.controlStepPlayback('play');

				const result = debugPanel.controlStepPlayback('pause');

				this.expect(result.success).toBe(true);
				this.expect(result.control).toBe('pause');
				this.expect(result.isPlaying).toBe(false);
			});

			this.test('應該成功跳轉到指定步驟', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				debugPanel.recordExecutionSteps([
					{ step: 1, action: 'Step 1' },
					{ step: 2, action: 'Step 2' },
					{ step: 3, action: 'Step 3' }
				]);

				const result = debugPanel.controlStepPlayback('jump', { targetIndex: 2 });

				this.expect(result.success).toBe(true);
				this.expect(result.control).toBe('jump');
				this.expect(result.currentStep).toBe(2);
			});
		});

		this.describe('analyzeSteps', () => {
			this.test('應該成功分析步驟', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const steps = [
					{ step: 1, action: 'Step 1', timing: 100 },
					{ step: 2, action: 'Step 2', timing: 200 },
					{ step: 3, action: 'Step 3', timing: 150 }
				];

				const result = debugPanel.analyzeSteps(steps);

				this.expect(result.success).toBe(true);
				this.expect(result.analysis).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('optimizeSteps', () => {
			this.test('應該成功優化步驟', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const steps = [
					{ step: 1, action: 'Step 1', timing: 100 },
					{ step: 2, action: 'Step 2', timing: 200 },
					{ step: 3, action: 'Step 3', timing: 150 }
				];
				const analysis = {
					performance: { analysis: {} },
					patterns: { patterns: [] },
					bottlenecks: { bottlenecks: [] }
				};

				const result = debugPanel.optimizeSteps(steps, analysis);

				this.expect(result.success).toBe(true);
				this.expect(result.optimizations).toBeDefined();
				this.expect(result.optimizedSteps).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('autoDiagnoseProblems', () => {
			this.test('應該成功自動診斷問題', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const data = {
					students: ['Alice', 'Bob'],
					seats: ['A1', 'A2'],
					assignments: { 'Alice': 'A1', 'Bob': 'A2' }
				};

				const result = debugPanel.autoDiagnoseProblems(data);

				this.expect(result.success).toBe(true);
				this.expect(result.problems).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
				this.expect(debugPanel.problemHistory.length).toBe(1);
			});
		});

		this.describe('categorizeProblems', () => {
			this.test('應該成功分類問題', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const problems = [
					{ type: 'error', message: 'Error 1' },
					{ type: 'warning', message: 'Warning 1' },
					{ type: 'performance', message: 'Performance issue 1' }
				];

				const result = debugPanel.categorizeProblems(problems);

				this.expect(result.success).toBe(true);
				this.expect(result.categories).toBeDefined();
				this.expect(result.summary).toBeDefined();
				this.expect(result.summary.total).toBe(3);
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('suggestSolutions', () => {
			this.test('應該成功建議解決方案', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const problems = [
					{ type: 'error', message: 'Error 1' },
					{ type: 'warning', message: 'Warning 1' }
				];

				const result = debugPanel.suggestSolutions(problems);

				this.expect(result.success).toBe(true);
				this.expect(result.solutions).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('fixProblems', () => {
			this.test('應該成功修復問題', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });
				const problems = [
					{ type: 'error', message: 'Error 1' }
				];
				const solutions = [
					{ type: 'fix', message: 'Fix for Error 1' }
				];

				const result = debugPanel.fixProblems(problems, solutions);

				this.expect(result.success).toBe(true);
				this.expect(result.fixes).toBeDefined();
				this.expect(result.timestamp).toBeDefined();
			});
		});

		this.describe('getDebugStats', () => {
			this.test('應該返回正確的調試統計', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });

				// 添加一些測試數據
				debugPanel.displayStatePanel({});
				debugPanel.displayVariableWatchPanel({ test: 'value' });
				debugPanel.displayLogPanel({ message: 'test' });
				debugPanel.displayPerformancePanel({});
				debugPanel.recordExecutionSteps([{ step: 1, action: 'test' }]);
				debugPanel.autoDiagnoseProblems({});

				const stats = debugPanel.getDebugStats();

				this.expect(stats.stateHistory).toBe(1);
				this.expect(stats.variableWatches).toBe(1);
				this.expect(stats.logEntries).toBe(1);
				this.expect(stats.performanceData).toBe(1);
				this.expect(stats.executionSteps).toBe(1);
				this.expect(stats.problemHistory).toBe(1);
				this.expect(stats.isRecording).toBe(true);
				this.expect(stats.isPlaying).toBe(false);
				this.expect(stats.currentStepIndex).toBe(0);
			});
		});

		this.describe('reset', () => {
			this.test('應該成功重置調試面板', () => {
				const debugPanel = new DebugPanel({ logger: mockLogger });

				// 添加一些測試數據
				debugPanel.displayStatePanel({});
				debugPanel.displayVariableWatchPanel({ test: 'value' });
				debugPanel.displayLogPanel({ message: 'test' });
				debugPanel.displayPerformancePanel({});
				debugPanel.recordExecutionSteps([{ step: 1, action: 'test' }]);
				debugPanel.autoDiagnoseProblems({});

				const result = debugPanel.reset();

				this.expect(result.success).toBe(true);
				this.expect(debugPanel.stateHistory.length).toBe(0);
				this.expect(debugPanel.variableWatches.size).toBe(0);
				this.expect(debugPanel.logEntries.length).toBe(0);
				this.expect(debugPanel.performanceData.length).toBe(0);
				this.expect(debugPanel.executionSteps.length).toBe(0);
				this.expect(debugPanel.problemHistory.length).toBe(0);
				this.expect(debugPanel.isRecording).toBe(false);
				this.expect(debugPanel.isPlaying).toBe(false);
				this.expect(debugPanel.currentStepIndex).toBe(0);
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
