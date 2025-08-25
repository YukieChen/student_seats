// EarlyTermination.test.js - 早期終止功能測試
import { SeatAssignmentEngine } from '../SeatAssignmentEngine.js';

// 自定義測試函數
async function test(name, testFunction) {
	try {
		console.log(`🧪 測試: ${name}`);
		await testFunction();
		console.log(`✅ ${name} - 通過`);
	} catch (error) {
		console.log(`❌ ${name} - 失敗: ${error.message}`);
		throw error;
	}
}

// 自定義測試運行器
async function runTests() {
	console.log('🚀 開始早期終止功能測試...\n');

	const engine = new SeatAssignmentEngine();

	// 測試基本終止條件
	await test('基本終止條件 - 所有學生已分配', () => {
		const result = engine.earlyTermination([], [{ id: 1 }], []);
		if (!result.shouldTerminate || result.reason !== '所有學生已分配') {
			throw new Error('應該檢測到所有學生已分配');
		}
	});

	await test('基本終止條件 - 無可用座位', () => {
		const result = engine.earlyTermination(['Alice'], [], []);
		if (!result.shouldTerminate || result.reason !== '無可用座位') {
			throw new Error('應該檢測到無可用座位');
		}
	});

	// 測試無解情況檢查
	await test('無解情況 - 座位數量不足', () => {
		const students = ['Alice', 'Bob', 'Charlie'];
		const seats = [{ id: 1 }, { id: 2 }]; // 只有2個座位，但有3個學生
		const result = engine.earlyTermination(students, seats, []);
		if (!result.shouldTerminate || result.reason !== '檢測到無解情況') {
			throw new Error('應該檢測到座位數量不足的無解情況');
		}
	});

	await test('無解情況 - 特殊座位需求無法滿足', () => {
		const students = ['Alice', 'Bob'];
		const seats = [{ id: 1, isSpecial: false }, { id: 2, isSpecial: false }];
		const conditions = [
			{ type: 'assign_seat', studentId: 'Alice', seatId: 'special_seat_1' },
			{ type: 'assign_seat', studentId: 'Bob', seatId: 'special_seat_2' }
		];
		const result = engine.earlyTermination(students, seats, conditions);
		if (!result.shouldTerminate || result.reason !== '檢測到無解情況') {
			throw new Error('應該檢測到特殊座位需求無法滿足');
		}
	});

	// 測試群組條件衝突
	await test('群組條件衝突檢查', () => {
		const students = ['Alice', 'Bob'];
		const seats = [{ id: 1, groupId: 'A' }];
		const conditions = [
			{ type: 'assign_group', studentId: 'Alice', groupId: 'A' },
			{ type: 'assign_group', studentId: 'Bob', groupId: 'B' }
		];
		const result = engine.earlyTermination(students, seats, conditions);
		if (!result.shouldTerminate || result.reason !== '檢測到無解情況') {
			throw new Error('應該檢測到群組條件衝突');
		}
	});

	// 測試局部最優陷阱
	await test('局部最優陷阱 - 重複狀態', () => {
		const currentState = {
			repeatedStates: 15 // 超過閾值10
		};
		const result = engine.earlyTermination(['Alice'], [{ id: 1 }], [], currentState);
		if (!result.shouldTerminate || result.reason !== '檢測到局部最優陷阱') {
			throw new Error('應該檢測到重複狀態陷阱');
		}
	});

	await test('局部最優陷阱 - 無進展狀態', () => {
		const currentState = {
			noProgressSteps: 60 // 超過閾值50
		};
		const result = engine.earlyTermination(['Alice'], [{ id: 1 }], [], currentState);
		if (!result.shouldTerminate || result.reason !== '檢測到局部最優陷阱') {
			throw new Error('應該檢測到無進展狀態陷阱');
		}
	});

	// 測試進度停滯
	await test('進度停滯檢查', () => {
		const currentState = {
			lastProgressTime: Date.now() - 6000 // 6秒前，超過5秒閾值
		};
		const result = engine.earlyTermination(['Alice'], [{ id: 1 }], [], currentState);
		if (!result.shouldTerminate || result.reason !== '進度停滯') {
			throw new Error('應該檢測到進度停滯');
		}
	});

	// 測試正常情況（不應該終止）
	await test('正常情況 - 不應該終止', () => {
		const students = ['Alice', 'Bob'];
		const seats = [{ id: 1 }, { id: 2 }];
		const result = engine.earlyTermination(students, seats, []);
		if (result.shouldTerminate) {
			throw new Error('正常情況不應該終止');
		}
	});

	// 測試置信度計算
	await test('置信度計算', () => {
		const result = engine.earlyTermination([], [{ id: 1 }], []);
		if (result.confidence !== 1.0) {
			throw new Error('所有學生已分配應該有100%置信度');
		}
	});

	console.log('\n🎉 所有早期終止功能測試完成！');
}

// 執行測試
runTests().catch(console.error);
