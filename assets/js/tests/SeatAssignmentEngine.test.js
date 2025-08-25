// SeatAssignmentEngine.test.js - 主引擎測試
import { SeatAssignmentEngine } from '../engines/SeatAssignmentEngine.js';

describe('SeatAssignmentEngine', () => {
    let engine;
    let mockConfig;

    beforeEach(() => {
        engine = new SeatAssignmentEngine({
            logLevel: 'ERROR', // 測試時只顯示錯誤
            timeout: 5000,
            enableCache: true,
            enableCycleDetection: true
        });

        mockConfig = {
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
                },
                {
                    type: 'assign_group',
                    students: [[3]],
                    group: 'A'
                }
            ]
        };
    });

    afterEach(() => {
        engine.dispose();
    });

    describe('testBasicFunctionality', () => {
        test('應該成功創建引擎實例', () => {
            expect(engine).toBeInstanceOf(SeatAssignmentEngine);
            expect(engine.options.timeout).toBe(5000);
            expect(engine.options.enableCache).toBe(true);
        });

        test('應該能夠解決簡單的座位安排問題', async () => {
            const result = await engine.solveAssignment(mockConfig);
            
            expect(result.success).toBe(true);
            expect(result.assignment).toBeDefined();
            expect(result.unassignedStudents).toBeUndefined();
        });

        test('應該處理無解的情況', async () => {
            // 創建一個無解的配置
            const impossibleConfig = {
                students: [1, 2, 3],
                seats: [
                    [{ row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined }]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2]]
                    }
                ]
            };

            const result = await engine.solveAssignment(impossibleConfig);
            
            expect(result.success).toBe(false);
            expect(result.unassignedStudents).toBeDefined();
            expect(result.unassignedStudents.length).toBeGreaterThan(0);
        });

        test('應該正確處理相鄰條件', async () => {
            const adjacentConfig = {
                students: [1, 2],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2]]
                    }
                ]
            };

            const result = await engine.solveAssignment(adjacentConfig);
            
            expect(result.success).toBe(true);
            
            // 驗證學生1和2確實相鄰
            const assignment = result.assignment;
            const seat1 = findStudentSeat(assignment, 1);
            const seat2 = findStudentSeat(assignment, 2);
            
            expect(areSeatsAdjacent(seat1, seat2)).toBe(true);
        });

        test('應該正確處理群組條件', async () => {
            const groupConfig = {
                students: [1, 2],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'B', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'assign_group',
                        students: [[1]],
                        group: 'A'
                    }
                ]
            };

            const result = await engine.solveAssignment(groupConfig);
            
            expect(result.success).toBe(true);
            
            // 驗證學生1坐在群組A的座位
            const assignment = result.assignment;
            const seat1 = findStudentSeat(assignment, 1);
            
            expect(seat1.groupId).toBe('A');
        });

        test('應該處理空配置', async () => {
            const emptyConfig = {
                students: [],
                seats: [],
                conditions: []
            };

            const result = await engine.solveAssignment(emptyConfig);
            
            expect(result.success).toBe(true);
            expect(result.assignment).toBeDefined();
        });
    });

    describe('testErrorHandling', () => {
        test('應該處理無效的配置', async () => {
            const invalidConfig = {
                students: null,
                seats: [],
                conditions: []
            };

            const result = await engine.solveAssignment(invalidConfig);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('應該處理無效的座位配置', async () => {
            const invalidSeatsConfig = {
                students: [1, 2],
                seats: null,
                conditions: []
            };

            const result = await engine.solveAssignment(invalidSeatsConfig);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('應該處理無效的條件配置', async () => {
            const invalidConditionsConfig = {
                students: [1, 2],
                seats: [
                    [{ row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined }]
                ],
                conditions: null
            };

            const result = await engine.solveAssignment(invalidConditionsConfig);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('應該處理循環依賴條件', async () => {
            const circularConfig = {
                students: [1, 2, 3],
                seats: [
                    [
                        { row: 0, col: 0, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 0, col: 1, isValid: true, groupId: 'A', studentId: undefined },
                        { row: 1, col: 0, isValid: true, groupId: 'A', studentId: undefined }
                    ]
                ],
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [2, 3], [3, 1]] // 循環依賴
                    }
                ]
            };

            const result = await engine.solveAssignment(circularConfig);
            
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    describe('testPerformance', () => {
        test('應該在超時時間內完成', async () => {
            const startTime = Date.now();
            const result = await engine.solveAssignment(mockConfig);
            const endTime = Date.now();
            
            expect(endTime - startTime).toBeLessThan(5000);
            expect(result.success).toBe(true);
        });

        test('應該正確處理超時情況', async () => {
            // 創建一個複雜的配置來測試超時
            const complexConfig = {
                students: Array.from({length: 20}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6]]
                    }
                ]
            };

            const fastEngine = new SeatAssignmentEngine({ timeout: 1 }); // 1ms超時
            const result = await fastEngine.solveAssignment(complexConfig);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('超時');
        });

        test('應該正確使用緩存', async () => {
            const result1 = await engine.solveAssignment(mockConfig);
            const result2 = await engine.solveAssignment(mockConfig);
            
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            
            const cacheStats = engine.cache.getCacheStats();
            expect(cacheStats.hits).toBeGreaterThan(0);
        });

        test('應該處理大規模數據', async () => {
            const largeConfig = {
                students: Array.from({length: 50}, (_, i) => i + 1),
                seats: Array.from({length: 10}, (_, row) =>
                    Array.from({length: 10}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: []
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(largeConfig);
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(30000); // 30秒內完成
        });

        test('應該處理複雜條件組合', async () => {
            const complexConditionsConfig = {
                students: Array.from({length: 10}, (_, i) => i + 1),
                seats: Array.from({length: 5}, (_, row) =>
                    Array.from({length: 5}, (_, col) => ({
                        row, col, isValid: true, groupId: 'A', studentId: undefined
                    }))
                ),
                conditions: [
                    {
                        type: 'adjacent',
                        students: [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]
                    },
                    {
                        type: 'assign_group',
                        students: [[1, 3, 5]],
                        group: 'A'
                    },
                    {
                        type: 'not_adjacent',
                        students: [[2, 4], [6, 8]]
                    }
                ]
            };

            const startTime = Date.now();
            const result = await engine.solveAssignment(complexConditionsConfig);
            const endTime = Date.now();
            
            expect(result.success).toBe(true);
            expect(endTime - startTime).toBeLessThan(10000); // 10秒內完成
        });
    });

    // 輔助方法
    function findStudentSeat(assignment, studentId) {
        for (const [student, seat] of assignment.entries()) {
            if (student === studentId) {
                return seat;
            }
        }
        return null;
    }

    function areSeatsAdjacent(seat1, seat2) {
        if (!seat1 || !seat2) return false;
        
        const rowDiff = Math.abs(seat1.row - seat2.row);
        const colDiff = Math.abs(seat1.col - seat2.col);
        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    }
});
