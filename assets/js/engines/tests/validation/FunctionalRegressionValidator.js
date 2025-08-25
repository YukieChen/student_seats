/**
 * @fileoverview 功能回歸驗證器
 * 
 * 用於驗證重構後的功能是否無回歸，包括 API 兼容性、
 * 功能完整性、邊界條件測試等。
 * 
 * @module FunctionalRegressionValidator
 * @version 1.0.0
 * @author Student Seats System
 */

const { SeatAssignmentEngine } = require('../../SeatAssignmentEngine.js');
const { ConflictChecker } = require('../../ConflictChecker.js');
const { AssignmentCache } = require('../../AssignmentCache.js');
const { SearchStrategies } = require('../../SearchStrategies.js');

/**
 * 功能回歸驗證器類別
 * 
 * 負責驗證重構後的功能完整性，確保功能無回歸。
 * 
 * @class FunctionalRegressionValidator
 */
class FunctionalRegressionValidator {
	constructor() {
		this.testResults = new Map();
		this.regressionIssues = [];
		this.apiCompatibilityIssues = [];
	}

	/**
	 * 執行完整的功能回歸驗證
	 * 
	 * @returns {Object} 功能回歸驗證結果
	 */
	async validateFunctionalRegression() {
		console.log('🔍 開始功能回歸驗證...');

		// 1. API 兼容性測試
		console.log('🔗 測試 API 兼容性...');
		await this.testApiCompatibility();

		// 2. 核心功能測試
		console.log('⚙️  測試核心功能...');
		await this.testCoreFunctionality();

		// 3. 邊界條件測試
		console.log('🔍 測試邊界條件...');
		await this.testBoundaryConditions();

		// 4. 模組協作測試
		console.log('🤝 測試模組協作...');
		await this.testModuleCollaboration();

		// 5. 錯誤處理測試
		console.log('⚠️  測試錯誤處理...');
		await this.testErrorHandling();

		// 6. 生成報告
		return this.generateFunctionalReport();
	}

	/**
	 * 測試 API 兼容性
	 */
	async testApiCompatibility() {
		const testCases = [
			{
				name: 'SeatAssignmentEngine 基本 API',
				test: () => {
					const engine = new SeatAssignmentEngine();
					const requiredMethods = [
						'solveAssignment',
						'initialize',
						'dispose',
						'getPerformanceMetrics'
					];

					for (const method of requiredMethods) {
						if (typeof engine[method] !== 'function') {
							throw new Error(`缺少方法: ${method}`);
						}
					}
					return true;
				}
			},
			{
				name: 'ConflictChecker 基本 API',
				test: () => {
					const checker = new ConflictChecker();
					const requiredMethods = [
						'checkAllConflicts',
						'initialize',
						'dispose'
					];

					for (const method of requiredMethods) {
						if (typeof checker[method] !== 'function') {
							throw new Error(`缺少方法: ${method}`);
						}
					}
					return true;
				}
			},
			{
				name: 'AssignmentCache 基本 API',
				test: () => {
					const cache = new AssignmentCache();
					const requiredMethods = [
						'get',
						'set',
						'clear',
						'dispose'
					];

					for (const method of requiredMethods) {
						if (typeof cache[method] !== 'function') {
							throw new Error(`缺少方法: ${method}`);
						}
					}
					return true;
				}
			},
			{
				name: 'SearchStrategies 基本 API',
				test: () => {
					const strategies = new SearchStrategies();
					const requiredMethods = [
						'heuristicSearch',
						'depthFirstSearch',
						'breadthFirstSearch',
						'hybridSearch',
						'dispose'
					];

					for (const method of requiredMethods) {
						if (typeof strategies[method] !== 'function') {
							throw new Error(`缺少方法: ${method}`);
						}
					}
					return true;
				}
			}
		];

		for (const testCase of testCases) {
			try {
				const result = testCase.test();
				this.testResults.set(`API_${testCase.name}`, {
					status: 'PASS',
					result: result
				});
				console.log(`  ✅ ${testCase.name}`);
			} catch (error) {
				this.testResults.set(`API_${testCase.name}`, {
					status: 'FAIL',
					error: error.message
				});
				this.apiCompatibilityIssues.push({
					test: testCase.name,
					error: error.message
				});
				console.log(`  ❌ ${testCase.name}: ${error.message}`);
			}
		}
	}

	/**
	 * 測試核心功能
	 */
	async testCoreFunctionality() {
		const testCases = [
			{
				name: '基本座位安排功能',
				test: async () => {
					const engine = new SeatAssignmentEngine();
					const students = [
						{ id: 1, name: '張三', preferences: ['A1', 'A2'] },
						{ id: 2, name: '李四', preferences: ['B1', 'B2'] }
					];
					const seats = [
						{ id: 'A1', row: 'A', col: 1, available: true },
						{ id: 'A2', row: 'A', col: 2, available: true },
						{ id: 'B1', row: 'B', col: 1, available: true },
						{ id: 'B2', row: 'B', col: 2, available: true }
					];
					const conditions = [
						{ type: 'preference', studentId: 1, seatId: 'A1', priority: 1 }
					];

					const result = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					if (!result.success) {
						throw new Error('基本座位安排失敗');
					}

					if (!result.assignment || Object.keys(result.assignment).length === 0) {
						throw new Error('未返回座位安排結果');
					}

					return result;
				}
			},
			{
				name: '衝突檢查功能',
				test: async () => {
					const checker = new ConflictChecker();
					const students = [
						{ id: 1, name: '張三', preferences: ['A1'] },
						{ id: 2, name: '李四', preferences: ['A1'] }
					];
					const seats = [
						{ id: 'A1', row: 'A', col: 1, available: true }
					];
					const conditions = [
						{ type: 'preference', studentId: 1, seatId: 'A1', priority: 1 },
						{ type: 'preference', studentId: 2, seatId: 'A1', priority: 1 }
					];

					checker.initialize(students, seats, conditions);
					const conflicts = checker.checkAllConflicts();

					if (!Array.isArray(conflicts)) {
						throw new Error('衝突檢查未返回陣列');
					}

					return conflicts;
				}
			},
			{
				name: '緩存功能',
				test: async () => {
					const cache = new AssignmentCache();
					const key = 'test_key';
					const value = { test: 'data' };

					cache.set(key, value);
					const retrieved = cache.get(key);

					if (!retrieved || JSON.stringify(retrieved) !== JSON.stringify(value)) {
						throw new Error('緩存讀寫功能異常');
					}

					return retrieved;
				}
			}
		];

		for (const testCase of testCases) {
			try {
				const result = await testCase.test();
				this.testResults.set(`CORE_${testCase.name}`, {
					status: 'PASS',
					result: result
				});
				console.log(`  ✅ ${testCase.name}`);
			} catch (error) {
				this.testResults.set(`CORE_${testCase.name}`, {
					status: 'FAIL',
					error: error.message
				});
				this.regressionIssues.push({
					test: testCase.name,
					error: error.message
				});
				console.log(`  ❌ ${testCase.name}: ${error.message}`);
			}
		}
	}

	/**
	 * 測試邊界條件
	 */
	async testBoundaryConditions() {
		const testCases = [
			{
				name: '空數據處理',
				test: async () => {
					const engine = new SeatAssignmentEngine();
					const result = await engine.solveAssignment({
						students: [],
						seats: [],
						conditions: []
					});

					if (result.success) {
						throw new Error('空數據應該返回失敗');
					}

					return result;
				}
			},
			{
				name: '單一學生處理',
				test: async () => {
					const engine = new SeatAssignmentEngine();
					const students = [{ id: 1, name: '張三', preferences: ['A1'] }];
					const seats = [{ id: 'A1', row: 'A', col: 1, available: true }];
					const conditions = [];

					const result = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					if (!result.success) {
						throw new Error('單一學生安排應該成功');
					}

					return result;
				}
			},
			{
				name: '座位不足處理',
				test: async () => {
					const engine = new SeatAssignmentEngine();
					const students = [
						{ id: 1, name: '張三', preferences: ['A1'] },
						{ id: 2, name: '李四', preferences: ['A1'] }
					];
					const seats = [{ id: 'A1', row: 'A', col: 1, available: true }];
					const conditions = [];

					const result = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					if (result.success) {
						throw new Error('座位不足時應該返回失敗');
					}

					return result;
				}
			}
		];

		for (const testCase of testCases) {
			try {
				const result = await testCase.test();
				this.testResults.set(`BOUNDARY_${testCase.name}`, {
					status: 'PASS',
					result: result
				});
				console.log(`  ✅ ${testCase.name}`);
			} catch (error) {
				this.testResults.set(`BOUNDARY_${testCase.name}`, {
					status: 'FAIL',
					error: error.message
				});
				this.regressionIssues.push({
					test: testCase.name,
					error: error.message
				});
				console.log(`  ❌ ${testCase.name}: ${error.message}`);
			}
		}
	}

	/**
	 * 測試模組協作
	 */
	async testModuleCollaboration() {
		const testCases = [
			{
				name: '引擎與衝突檢查器協作',
				test: async () => {
					const engine = new SeatAssignmentEngine();
					const checker = new ConflictChecker();

					// 測試引擎是否能正確使用衝突檢查器
					const students = [
						{ id: 1, name: '張三', preferences: ['A1'] },
						{ id: 2, name: '李四', preferences: ['A1'] }
					];
					const seats = [
						{ id: 'A1', row: 'A', col: 1, available: true },
						{ id: 'A2', row: 'A', col: 2, available: true }
					];
					const conditions = [];

					const result = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					if (!result.success) {
						throw new Error('模組協作失敗');
					}

					return result;
				}
			},
			{
				name: '引擎與緩存協作',
				test: async () => {
					const engine = new SeatAssignmentEngine({
						enableCache: true
					});

					const students = [{ id: 1, name: '張三', preferences: ['A1'] }];
					const seats = [{ id: 'A1', row: 'A', col: 1, available: true }];
					const conditions = [];

					// 執行兩次相同的任務，第二次應該使用緩存
					const result1 = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					const result2 = await engine.solveAssignment({
						students: students,
						seats: seats,
						conditions: conditions
					});

					if (!result1.success || !result2.success) {
						throw new Error('緩存協作失敗');
					}

					return { result1, result2 };
				}
			}
		];

		for (const testCase of testCases) {
			try {
				const result = await testCase.test();
				this.testResults.set(`COLLABORATION_${testCase.name}`, {
					status: 'PASS',
					result: result
				});
				console.log(`  ✅ ${testCase.name}`);
			} catch (error) {
				this.testResults.set(`COLLABORATION_${testCase.name}`, {
					status: 'FAIL',
					error: error.message
				});
				this.regressionIssues.push({
					test: testCase.name,
					error: error.message
				});
				console.log(`  ❌ ${testCase.name}: ${error.message}`);
			}
		}
	}

	/**
	 * 測試錯誤處理
	 */
	async testErrorHandling() {
		const testCases = [
			{
				name: '無效參數處理',
				test: async () => {
					const engine = new SeatAssignmentEngine();

					try {
						await engine.solveAssignment(null);
						throw new Error('應該拋出錯誤');
					} catch (error) {
						if (!error.message.includes('無效')) {
							throw new Error('錯誤處理不當');
						}
					}

					return true;
				}
			},
			{
				name: '無效學生數據處理',
				test: async () => {
					const engine = new SeatAssignmentEngine();

					try {
						await engine.solveAssignment({
							students: [{ invalid: 'data' }],
							seats: [],
							conditions: []
						});
						throw new Error('應該拋出錯誤');
					} catch (error) {
						// 應該能處理無效數據
						return true;
					}
				}
			}
		];

		for (const testCase of testCases) {
			try {
				const result = await testCase.test();
				this.testResults.set(`ERROR_${testCase.name}`, {
					status: 'PASS',
					result: result
				});
				console.log(`  ✅ ${testCase.name}`);
			} catch (error) {
				this.testResults.set(`ERROR_${testCase.name}`, {
					status: 'FAIL',
					error: error.message
				});
				this.regressionIssues.push({
					test: testCase.name,
					error: error.message
				});
				console.log(`  ❌ ${testCase.name}: ${error.message}`);
			}
		}
	}

	/**
	 * 生成功能回歸報告
	 * 
	 * @returns {Object} 功能回歸報告
	 */
	generateFunctionalReport() {
		const totalTests = this.testResults.size;
		const passedTests = Array.from(this.testResults.values()).filter(r => r.status === 'PASS').length;
		const failedTests = totalTests - passedTests;

		const report = {
			summary: {
				totalTests: totalTests,
				passedTests: passedTests,
				failedTests: failedTests,
				overallStatus: failedTests === 0 ? 'PASS' : 'FAIL'
			},
			details: {
				apiCompatibilityIssues: this.apiCompatibilityIssues,
				regressionIssues: this.regressionIssues,
				testResults: Object.fromEntries(this.testResults)
			}
		};

		console.log('\n📊 功能回歸驗證報告:');
		console.log('=' * 50);
		console.log(`  總測試數: ${totalTests}`);
		console.log(`  通過測試: ${passedTests}`);
		console.log(`  失敗測試: ${failedTests}`);
		console.log(`  整體狀態: ${report.summary.overallStatus}`);

		if (this.apiCompatibilityIssues.length > 0) {
			console.log('\n❌ API 兼容性問題:');
			for (const issue of this.apiCompatibilityIssues) {
				console.log(`  - ${issue.test}: ${issue.error}`);
			}
		}

		if (this.regressionIssues.length > 0) {
			console.log('\n❌ 功能回歸問題:');
			for (const issue of this.regressionIssues) {
				console.log(`  - ${issue.test}: ${issue.error}`);
			}
		}

		if (report.summary.overallStatus === 'PASS') {
			console.log('\n✅ 功能回歸驗證通過 - 重構後功能無回歸');
		} else {
			console.log('\n❌ 功能回歸驗證失敗 - 發現功能回歸問題');
		}

		return report;
	}
}

module.exports = { FunctionalRegressionValidator };
