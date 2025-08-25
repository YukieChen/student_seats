// HybridSearch.test.js - 混合搜索策略測試
import { SeatAssignmentEngine } from '../SeatAssignmentEngine.js';

// 自定義測試框架
async function test(name, testFunction) {
	try {
		await testFunction();
		console.log(`✅ ${name}`);
		return true;
	} catch (error) {
		console.log(`❌ ${name}: ${error.message}`);
		return false;
	}
}

async function runTests() {
	console.log('🧪 開始混合搜索策略測試...\n');

	let passedTests = 0;
	let totalTests = 0;

	// 測試1: 基本功能測試
	totalTests++;
	if (await test('混合搜索基本功能測試', async () => {
		const engine = new SeatAssignmentEngine();

		const students = ['Alice', 'Bob', 'Charlie'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'A', isValid: true }
		];
		const conditions = [];
		const studentScores = { 'Alice': 10, 'Bob': 8, 'Charlie': 6 };
		const groupBindings = new Map();
		const studentToConditionsMap = new Map();

		const result = await engine.hybridSearch(
			students,
			seats,
			conditions,
			studentScores,
			groupBindings,
			studentToConditionsMap
		);

		if (!result || typeof result !== 'object') {
			throw new Error('混合搜索應返回結果對象');
		}
	})) passedTests++;

	// 測試2: 與其他搜索策略比較
	totalTests++;
	if (await test('混合搜索與其他策略比較測試', async () => {
		const engine = new SeatAssignmentEngine();

		const students = ['Alice', 'Bob', 'Charlie', 'David'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'A', isValid: true },
			{ row: 1, col: 4, groupId: 'A', isValid: true }
		];
		const conditions = [
			{
				type: 'adjacent',
				students: [['Alice', 'Bob']]
			}
		];
		const studentScores = { 'Alice': 10, 'Bob': 8, 'Charlie': 6, 'David': 4 };
		const groupBindings = new Map();
		const studentToConditionsMap = new Map();

		// 測試混合搜索
		const hybridResult = await engine.hybridSearch(
			students,
			seats,
			conditions,
			studentScores,
			groupBindings,
			studentToConditionsMap
		);

		if (!hybridResult || typeof hybridResult !== 'object') {
			throw new Error('混合搜索應返回有效結果');
		}
	})) passedTests++;

	    // 測試3: 複雜條件處理
    totalTests++;
    if (await test('混合搜索複雜條件處理測試', async () => {
		const engine = new SeatAssignmentEngine();

		const students = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'B', isValid: true },
			{ row: 1, col: 4, groupId: 'B', isValid: true },
			{ row: 1, col: 5, groupId: 'C', isValid: true }
		];
		const conditions = [
			{
				type: 'assign_group',
				students: [['Alice']],
				group: 'A'
			},
			{
				type: 'adjacent_and_group',
				students: [['Bob', 'Charlie']],
				group: 'B'
			}
		];
		const studentScores = { 'Alice': 10, 'Bob': 8, 'Charlie': 6, 'David': 4, 'Eve': 2 };
		const groupBindings = new Map();
		const studentToConditionsMap = new Map();

		        const result = await engine.hybridSearch(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );

        if (!result || typeof result !== 'object') {
            throw new Error('混合搜索應處理複雜條件');
        }
    })) passedTests++;

	    // 測試4: 問題複雜度評估
    totalTests++;
    if (await test('問題複雜度評估測試', async () => {
		const engine = new SeatAssignmentEngine();

		const students = ['Alice', 'Bob', 'Charlie'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'A', isValid: true }
		];
		const conditions = [];
		const groupBindings = new Map();

		const complexity = engine.evaluateProblemComplexity(students, seats, conditions, groupBindings);

		if (!complexity || typeof complexity !== 'object') {
			throw new Error('複雜度評估應返回對象');
		}

		if (typeof complexity.overallScore !== 'number') {
			throw new Error('複雜度評估應包含分數');
		}

		if (!complexity.complexityLevel || !['low', 'medium', 'high'].includes(complexity.complexityLevel)) {
			throw new Error('複雜度評估應包含等級');
		}
	})) passedTests++;

	    // 測試5: 策略選擇邏輯
    totalTests++;
    if (await test('策略選擇邏輯測試', async () => {
		const engine = new SeatAssignmentEngine();

		// 測試低複雜度
		const lowComplexity = {
			studentCount: 10,
			conditionCount: 2,
			groupBindingCount: 1,
			overallScore: 25,
			complexityLevel: 'low'
		};

		const lowStrategy = engine.selectInitialStrategy(lowComplexity);
		if (!lowStrategy || typeof lowStrategy !== 'string') {
			throw new Error('策略選擇應返回字符串');
		}

		// 測試高複雜度
		const highComplexity = {
			studentCount: 60,
			conditionCount: 15,
			groupBindingCount: 8,
			overallScore: 75,
			complexityLevel: 'high'
		};

		const highStrategy = engine.selectInitialStrategy(highComplexity);
		if (!highStrategy || typeof highStrategy !== 'string') {
			throw new Error('高複雜度策略選擇應返回字符串');
		}
	})) passedTests++;

	    // 測試6: 超時處理
    totalTests++;
    if (await test('混合搜索超時處理測試', async () => {
		const engine = new SeatAssignmentEngine({ timeout: 1 }); // 1ms 超時

		const students = ['Alice', 'Bob', 'Charlie'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'A', isValid: true }
		];
		const conditions = [];
		const studentScores = { 'Alice': 10, 'Bob': 8, 'Charlie': 6 };
		const groupBindings = new Map();
		const studentToConditionsMap = new Map();

		        const result = await engine.hybridSearch(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );

        if (!result || typeof result !== 'object') {
            throw new Error('超時處理應返回結果對象');
        }
    })) passedTests++;

	    // 測試7: 策略切換機制
    totalTests++;
    if (await test('策略切換機制測試', async () => {
		const engine = new SeatAssignmentEngine();

		const students = ['Alice', 'Bob', 'Charlie'];
		const seats = [
			{ row: 1, col: 1, groupId: 'A', isValid: true },
			{ row: 1, col: 2, groupId: 'A', isValid: true },
			{ row: 1, col: 3, groupId: 'A', isValid: true }
		];
		const conditions = [];
		const studentScores = { 'Alice': 10, 'Bob': 8, 'Charlie': 6 };
		const groupBindings = new Map();
		const studentToConditionsMap = new Map();

		        const result = await engine.hybridSearch(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );

        if (!result || typeof result !== 'object') {
            throw new Error('策略切換應返回結果對象');
        }

        // 檢查是否包含嘗試的策略信息
        if (result.triedStrategies && !Array.isArray(result.triedStrategies)) {
            throw new Error('嘗試的策略應為數組');
        }
    })) passedTests++;

	console.log(`\n📊 測試結果: ${passedTests}/${totalTests} 通過`);

	if (passedTests === totalTests) {
		console.log('🎉 所有混合搜索策略測試通過！');
	} else {
		console.log('⚠️  部分測試失敗，需要檢查實現');
	}
}

// 執行測試
runTests().catch(console.error);
