/**
 * 複雜條件性能測試
 * 測試系統在處理複雜條件時的表現
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

describe('ComplexConditions Performance Tests', () => {
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

    describe('testComplexConditions', () => {
        it('應該處理大量相鄰條件', () => {
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

            // 生成大量相鄰條件
            const conditions = [];
            for (let i = 0; i < 200; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`]
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(1000);
            expect(executionTime).to.be.lessThan(60000); // 1分鐘內完成
            expect(memoryUsed).to.be.lessThan(200 * 1024 * 1024); // 200MB以內
        });

        it('應該處理大量群組條件', () => {
            const students = [];
            const seats = [];
            
            // 生成1200個學生
            for (let i = 0; i < 1200; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 120)}`]
                });
            }

            // 生成1200個座位
            for (let i = 0; i < 1200; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 60) + 1,
                    col: (i % 60) + 1
                });
            }

            // 生成大量群組條件
            const conditions = [];
            for (let i = 0; i < 100; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(1200);
            expect(executionTime).to.be.lessThan(90000); // 1.5分鐘內完成
            expect(memoryUsed).to.be.lessThan(300 * 1024 * 1024); // 300MB以內
        });

        it('應該處理大量不相鄰條件', () => {
            const students = [];
            const seats = [];
            
            // 生成800個學生
            for (let i = 0; i < 800; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 80)}`]
                });
            }

            // 生成800個座位
            for (let i = 0; i < 800; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 40) + 1,
                    col: (i % 40) + 1
                });
            }

            // 生成大量不相鄰條件
            const conditions = [];
            for (let i = 0; i < 150; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`]
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(800);
            expect(executionTime).to.be.lessThan(45000); // 45秒內完成
            expect(memoryUsed).to.be.lessThan(150 * 1024 * 1024); // 150MB以內
        });

        it('應該處理複雜的條件鏈', () => {
            const students = [];
            const seats = [];
            
            // 生成500個學生
            for (let i = 0; i < 500; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 50)}`]
                });
            }

            // 生成500個座位
            for (let i = 0; i < 500; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 25) + 1,
                    col: (i % 25) + 1
                });
            }

            // 生成複雜的條件鏈
            const conditions = [];
            
            // 相鄰條件鏈
            for (let i = 0; i < 50; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 3}`, `S${i * 3 + 1}`],
                    priority: i + 1
                });
            }

            // 群組條件鏈
            for (let i = 0; i < 25; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4,
                    priority: i + 51
                });
            }

            // 不相鄰條件鏈
            for (let i = 0; i < 40; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`],
                    priority: i + 76
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(500);
            expect(executionTime).to.be.lessThan(30000); // 30秒內完成
            expect(memoryUsed).to.be.lessThan(100 * 1024 * 1024); // 100MB以內
        });

        it('應該處理高優先級條件', () => {
            const students = [];
            const seats = [];
            
            // 生成600個學生
            for (let i = 0; i < 600; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 60)}`]
                });
            }

            // 生成600個座位
            for (let i = 0; i < 600; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 30) + 1,
                    col: (i % 30) + 1
                });
            }

            // 生成高優先級條件
            const conditions = [];
            
            // 高優先級相鄰條件
            for (let i = 0; i < 30; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`],
                    priority: 100 - i // 高優先級
                });
            }

            // 中優先級群組條件
            for (let i = 0; i < 20; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 3}`, `S${i * 3 + 1}`, `S${i * 3 + 2}`],
                    size: 3,
                    priority: 50 - i // 中優先級
                });
            }

            // 低優先級不相鄰條件
            for (let i = 0; i < 25; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`],
                    priority: 10 - i // 低優先級
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(600);
            expect(executionTime).to.be.lessThan(45000); // 45秒內完成
            expect(memoryUsed).to.be.lessThan(150 * 1024 * 1024); // 150MB以內
        });
    });

    describe('testConditionCombinations', () => {
        it('應該處理相鄰和群組條件的組合', () => {
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

            // 生成相鄰和群組條件的組合
            const conditions = [];
            
            // 相鄰條件
            for (let i = 0; i < 100; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`]
                });
            }

            // 群組條件
            for (let i = 0; i < 50; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(1000);
            expect(executionTime).to.be.lessThan(75000); // 1.25分鐘內完成
            expect(memoryUsed).to.be.lessThan(250 * 1024 * 1024); // 250MB以內
        });

        it('應該處理群組和不相鄰條件的組合', () => {
            const students = [];
            const seats = [];
            
            // 生成800個學生
            for (let i = 0; i < 800; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 80)}`]
                });
            }

            // 生成800個座位
            for (let i = 0; i < 800; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 40) + 1,
                    col: (i % 40) + 1
                });
            }

            // 生成群組和不相鄰條件的組合
            const conditions = [];
            
            // 群組條件
            for (let i = 0; i < 40; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4
                });
            }

            // 不相鄰條件
            for (let i = 0; i < 60; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`]
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(800);
            expect(executionTime).to.be.lessThan(60000); // 1分鐘內完成
            expect(memoryUsed).to.be.lessThan(200 * 1024 * 1024); // 200MB以內
        });

        it('應該處理三種條件的混合組合', () => {
            const students = [];
            const seats = [];
            
            // 生成1200個學生
            for (let i = 0; i < 1200; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 120)}`]
                });
            }

            // 生成1200個座位
            for (let i = 0; i < 1200; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 60) + 1,
                    col: (i % 60) + 1
                });
            }

            // 生成三種條件的混合組合
            const conditions = [];
            
            // 相鄰條件
            for (let i = 0; i < 80; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`],
                    priority: 80 - i
                });
            }

            // 群組條件
            for (let i = 0; i < 60; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4,
                    priority: 60 - i
                });
            }

            // 不相鄰條件
            for (let i = 0; i < 100; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 2}`, `S${i * 2 + 1}`],
                    priority: 40 - i
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(1200);
            expect(executionTime).to.be.lessThan(90000); // 1.5分鐘內完成
            expect(memoryUsed).to.be.lessThan(300 * 1024 * 1024); // 300MB以內
        });

        it('應該處理條件依賴關係', () => {
            const students = [];
            const seats = [];
            
            // 生成600個學生
            for (let i = 0; i < 600; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 60)}`]
                });
            }

            // 生成600個座位
            for (let i = 0; i < 600; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 30) + 1,
                    col: (i % 30) + 1
                });
            }

            // 生成有依賴關係的條件
            const conditions = [];
            
            // 主要群組條件
            for (let i = 0; i < 20; i++) {
                conditions.push({
                    type: 'group',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`, `S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    size: 4,
                    priority: 100,
                    id: `group_${i}`
                });
            }

            // 依賴於群組的相鄰條件
            for (let i = 0; i < 20; i++) {
                conditions.push({
                    type: 'adjacent',
                    students: [`S${i * 4}`, `S${i * 4 + 1}`],
                    priority: 80,
                    dependsOn: `group_${i}`
                });
            }

            // 依賴於相鄰的不相鄰條件
            for (let i = 0; i < 15; i++) {
                conditions.push({
                    type: 'not_adjacent',
                    students: [`S${i * 4 + 2}`, `S${i * 4 + 3}`],
                    priority: 60,
                    dependsOn: `adjacent_${i}`
                });
            }

            const startTime = Date.now();
            const startMemory = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats, conditions);
            
            const endTime = Date.now();
            const endMemory = process.memoryUsage().heapUsed;
            const executionTime = endTime - startTime;
            const memoryUsed = endMemory - startMemory;

            expect(result.success).to.be.true;
            expect(result.assignments.length).to.equal(600);
            expect(executionTime).to.be.lessThan(45000); // 45秒內完成
            expect(memoryUsed).to.be.lessThan(150 * 1024 * 1024); // 150MB以內
        });
    });

    describe('testConditionPerformance', () => {
        it('應該分析條件複雜度對性能的影響', () => {
            const students = [];
            const seats = [];
            
            // 固定規模的數據
            const size = 1000;
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
                    row: Math.floor(i / 50) + 1,
                    col: (i % 50) + 1
                });
            }

            const conditionComplexities = [0, 50, 100, 200, 400];
            const performanceResults = [];

            for (const complexity of conditionComplexities) {
                const conditions = [];
                
                // 生成指定複雜度的條件
                for (let i = 0; i < complexity; i++) {
                    const conditionType = i % 3 === 0 ? 'adjacent' : i % 3 === 1 ? 'group' : 'not_adjacent';
                    const studentCount = conditionType === 'group' ? 4 : 2;
                    
                    const conditionStudents = [];
                    for (let j = 0; j < studentCount; j++) {
                        conditionStudents.push(`S${(i * studentCount + j) % size}`);
                    }
                    
                    conditions.push({
                        type: conditionType,
                        students: conditionStudents,
                        priority: complexity - i,
                        ...(conditionType === 'group' && { size: studentCount })
                    });
                }

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats, conditions);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                performanceResults.push({
                    complexity,
                    executionTime,
                    memoryUsed,
                    conditionsPerSecond: complexity / (executionTime / 1000)
                });
            }

            // 驗證條件複雜度對性能的影響
            for (let i = 1; i < performanceResults.length; i++) {
                const current = performanceResults[i];
                const previous = performanceResults[i - 1];
                
                // 執行時間增長應該相對合理
                const timeRatio = current.executionTime / previous.executionTime;
                const complexityRatio = current.complexity / previous.complexity;
                
                // 時間增長不應該超過複雜度增長的線性倍數
                expect(timeRatio).to.be.lessThan(complexityRatio * 3);
            }
        });

        it('應該分析不同條件類型的性能差異', () => {
            const students = [];
            const seats = [];
            
            // 固定規模的數據
            const size = 800;
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
                    row: Math.floor(i / 40) + 1,
                    col: (i % 40) + 1
                });
            }

            const conditionTypes = ['adjacent', 'group', 'not_adjacent'];
            const typeResults = {};

            for (const conditionType of conditionTypes) {
                const conditions = [];
                const conditionCount = 100;
                
                // 生成指定類型的條件
                for (let i = 0; i < conditionCount; i++) {
                    const studentCount = conditionType === 'group' ? 4 : 2;
                    const conditionStudents = [];
                    
                    for (let j = 0; j < studentCount; j++) {
                        conditionStudents.push(`S${(i * studentCount + j) % size}`);
                    }
                    
                    conditions.push({
                        type: conditionType,
                        students: conditionStudents,
                        ...(conditionType === 'group' && { size: studentCount })
                    });
                }

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats, conditions);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                typeResults[conditionType] = {
                    executionTime,
                    memoryUsed,
                    conditionsPerSecond: conditionCount / (executionTime / 1000)
                };
            }

            // 驗證不同條件類型的性能差異
            expect(typeResults.adjacent.executionTime).to.be.lessThan(typeResults.group.executionTime);
            expect(typeResults.not_adjacent.executionTime).to.be.lessThan(typeResults.group.executionTime);
        });

        it('應該分析條件優先級對性能的影響', () => {
            const students = [];
            const seats = [];
            
            // 固定規模的數據
            const size = 600;
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
                    row: Math.floor(i / 30) + 1,
                    col: (i % 30) + 1
                });
            }

            const priorityLevels = [10, 50, 100, 200, 500];
            const priorityResults = {};

            for (const priority of priorityLevels) {
                const conditions = [];
                const conditionCount = 80;
                
                // 生成指定優先級的條件
                for (let i = 0; i < conditionCount; i++) {
                    conditions.push({
                        type: 'adjacent',
                        students: [`S${i * 2}`, `S${i * 2 + 1}`],
                        priority: priority - i
                    });
                }

                const startTime = Date.now();
                const startMemory = process.memoryUsage().heapUsed;
                
                const result = engine.assignSeats(students, seats, conditions);
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage().heapUsed;
                const executionTime = endTime - startTime;
                const memoryUsed = endMemory - startMemory;

                expect(result.success).to.be.true;

                priorityResults[priority] = {
                    executionTime,
                    memoryUsed,
                    averagePriority: priority / 2
                };
            }

            // 驗證優先級對性能的影響
            for (let i = 1; i < priorityLevels.length; i++) {
                const currentPriority = priorityLevels[i];
                const previousPriority = priorityLevels[i - 1];
                
                const currentResult = priorityResults[currentPriority];
                const previousResult = priorityResults[previousPriority];
                
                // 更高優先級可能需要更多處理時間
                const timeRatio = currentResult.executionTime / previousResult.executionTime;
                const priorityRatio = currentPriority / previousPriority;
                
                // 時間增長不應該超過優先級增長的平方根
                expect(timeRatio).to.be.lessThan(Math.sqrt(priorityRatio) * 2);
            }
        });
    });
});
