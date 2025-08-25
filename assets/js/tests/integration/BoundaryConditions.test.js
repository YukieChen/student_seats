/**
 * 邊界情況集成測試
 * 測試系統在邊界值、極限情況和異常情況下的行為
 */

// 導入測試框架
const { describe, it, beforeEach, afterEach } = require('mocha');
const { expect } = require('chai');

// 導入引擎組件
const SeatAssignmentEngine = require('../engines/SeatAssignmentEngine');
const AssignmentCache = require('../engines/AssignmentCache');
const Logger = require('../engines/Logger');
const ConflictChecker = require('../engines/ConflictChecker');
const DynamicAdjuster = require('../engines/DynamicAdjuster');

describe('BoundaryConditions Integration Tests', () => {
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

	describe('testBoundaryValues', () => {
		it('應該處理空數據集', () => {
			const emptyStudents = [];
			const emptySeats = [];

			const result = engine.assignSeats(emptyStudents, emptySeats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
			expect(result.assignments.length).to.equal(0);
		});

		it('應該處理單一學生和座位', () => {
			const singleStudent = [{ id: 'S1', name: 'Student1', preferences: [] }];
			const singleSeat = [{ id: 'A1', row: 1, col: 1 }];

			const result = engine.assignSeats(singleStudent, singleSeat);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
			expect(result.assignments.length).to.equal(1);
			expect(result.assignments[0].studentId).to.equal('S1');
			expect(result.assignments[0].seatId).to.equal('A1');
		});

		it('應該處理最大整數值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: Number.MAX_SAFE_INTEGER, col: Number.MAX_SAFE_INTEGER },
				{ id: 'A2', row: Number.MAX_SAFE_INTEGER - 1, col: Number.MAX_SAFE_INTEGER - 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理最小整數值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: Number.MIN_SAFE_INTEGER, col: Number.MIN_SAFE_INTEGER },
				{ id: 'A2', row: Number.MIN_SAFE_INTEGER + 1, col: Number.MIN_SAFE_INTEGER + 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理零值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 0, col: 0 },
				{ id: 'A2', row: 0, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理極長字符串', () => {
			const longString = 'A'.repeat(10000);
			const students = [
				{ id: longString, name: longString, preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: longString, row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理特殊字符', () => {
			const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			const students = [
				{ id: specialChars, name: specialChars, preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: specialChars, row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理Unicode字符', () => {
			const unicodeString = '中文測試🎉🚀💻';
			const students = [
				{ id: unicodeString, name: unicodeString, preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: unicodeString, row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理浮點數值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1.5, col: 2.7 },
				{ id: 'A2', row: 3.14159, col: 2.71828 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理布爾值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [], active: true },
				{ id: 'S2', name: 'Student2', preferences: [], active: false }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1, available: true },
				{ id: 'A2', row: 1, col: 2, available: false }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});
	});

	describe('testEdgeCases', () => {
		it('應該處理學生數量等於座位數量', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(3);
			expect(result.unassignedStudents.length).to.equal(0);
		});

		it('應該處理學生數量少於座位數量', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 },
				{ id: 'A4', row: 2, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(2);
			expect(result.unassignedSeats.length).to.equal(2);
		});

		it('應該處理學生數量多於座位數量', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] },
				{ id: 'S4', name: 'Student4', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(2);
			expect(result.unassignedStudents.length).to.equal(2);
		});

		it('應該處理所有學生都有相同偏好', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: ['A1'] },
				{ id: 'S2', name: 'Student2', preferences: ['A1'] },
				{ id: 'S3', name: 'Student3', preferences: ['A1'] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
			// 只有一個學生能分配到A1，其他需要分配給其他座位
			expect(result.assignments.some(a => a.seatId === 'A1')).to.be.true;
		});

		it('應該處理所有學生都沒有偏好', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(3);
		});

		it('應該處理所有座位都被預訂', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1, reserved: true },
				{ id: 'A2', row: 1, col: 2, reserved: true }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'no_available_seats')).to.be.true;
		});

		it('應該處理所有條件都衝突', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 }
			];

			const conflictingConditions = [
				{ type: 'adjacent', students: ['S1', 'S2'] },
				{ type: 'not_adjacent', students: ['S1', 'S2'] },
				{ type: 'adjacent', students: ['S2', 'S3'] },
				{ type: 'not_adjacent', students: ['S2', 'S3'] }
			];

			const result = engine.assignSeats(students, seats, conflictingConditions);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'conflicting_conditions')).to.be.true;
		});

		it('應該處理極大的數據集', () => {
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
			const result = engine.assignSeats(students, seats);
			const endTime = Date.now();

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(1000);
			expect(endTime - startTime).to.be.lessThan(30000); // 30秒內完成
		});

		it('應該處理極小的數據集', () => {
			const students = [{ id: 'S1', name: 'Student1', preferences: [] }];
			const seats = [{ id: 'A1', row: 1, col: 1 }];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments.length).to.equal(1);
			expect(result.assignments[0].studentId).to.equal('S1');
			expect(result.assignments[0].seatId).to.equal('A1');
		});
	});

	describe('testExceptionalCases', () => {
		it('應該處理重複的學生ID', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S1', name: 'Student2', preferences: [] }, // 重複ID
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 },
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'duplicate_student_id')).to.be.true;
		});

		it('應該處理重複的座位ID', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A1', row: 1, col: 2 }, // 重複ID
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'duplicate_seat_id')).to.be.true;
		});

		it('應該處理重疊的座位位置', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] },
				{ id: 'S3', name: 'Student3', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 1 }, // 重疊位置
				{ id: 'A3', row: 2, col: 1 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'overlapping_seats')).to.be.true;
		});

		it('應該處理無效的條件引用', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const invalidConditions = [
				{ type: 'adjacent', students: ['S1', 'S3'] }, // S3不存在
				{ type: 'group', students: ['S1', 'S2', 'S4'] } // S4不存在
			];

			const result = engine.assignSeats(students, seats, invalidConditions);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'invalid_student_reference')).to.be.true;
		});

		it('應該處理無效的座位引用', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: ['A3'] }, // A3不存在
				{ id: 'S2', name: 'Student2', preferences: ['A4'] }  // A4不存在
			];

			const seats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: 'A2', row: 1, col: 2 }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
			// 系統應該忽略無效的偏好並繼續分配
			expect(result.warnings).to.be.an('array');
			expect(result.warnings.some(w => w.type === 'invalid_preference')).to.be.true;
		});

		it('應該處理惡意輸入數據', () => {
			const maliciousStudents = [
				{ id: '<script>alert("xss")</script>', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const maliciousSeats = [
				{ id: 'A1', row: 1, col: 1 },
				{ id: '<script>alert("xss")</script>', row: 1, col: 2 }
			];

			const result = engine.assignSeats(maliciousStudents, maliciousSeats);

			// 系統應該能夠處理惡意輸入而不崩潰
			expect(result).to.be.an('object');
			expect(result.success).to.be.a('boolean');
		});

		it('應該處理極端數值', () => {
			const students = [
				{ id: 'S1', name: 'Student1', preferences: [] },
				{ id: 'S2', name: 'Student2', preferences: [] }
			];

			const seats = [
				{ id: 'A1', row: Infinity, col: -Infinity },
				{ id: 'A2', row: NaN, col: NaN }
			];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.false;
			expect(result.errors).to.be.an('array');
			expect(result.errors.some(e => e.type === 'invalid_coordinates')).to.be.true;
		});

		it('應該處理深層嵌套對象', () => {
			const deeplyNestedStudent = {
				id: 'S1',
				name: 'Student1',
				preferences: [],
				metadata: {
					profile: {
						details: {
							personal: {
								info: {
									data: {
										value: 'deep'
									}
								}
							}
						}
					}
				}
			};

			const students = [deeplyNestedStudent];
			const seats = [{ id: 'A1', row: 1, col: 1 }];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});

		it('應該處理循環引用對象', () => {
			const circularObject = { id: 'S1', name: 'Student1', preferences: [] };
			circularObject.self = circularObject; // 創建循環引用

			const students = [circularObject];
			const seats = [{ id: 'A1', row: 1, col: 1 }];

			const result = engine.assignSeats(students, seats);

			// 系統應該能夠處理循環引用而不崩潰
			expect(result).to.be.an('object');
			expect(result.success).to.be.a('boolean');
		});

		it('應該處理函數和對象混合', () => {
			const mixedStudent = {
				id: 'S1',
				name: 'Student1',
				preferences: [],
				validator: function () { return true; },
				metadata: { type: 'object' }
			};

			const students = [mixedStudent];
			const seats = [{ id: 'A1', row: 1, col: 1 }];

			const result = engine.assignSeats(students, seats);

			expect(result.success).to.be.true;
			expect(result.assignments).to.be.an('array');
		});
	});
});
