/**
 * 錯誤處理集成測試
 * 測試系統在各種錯誤情況下的行為和恢復能力
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

describe('ErrorHandling Integration Tests', () => {
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

    describe('testErrorScenarios', () => {
        it('應該處理無效的學生數據', () => {
            const invalidStudents = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: '' },
                { id: 'S3', name: 'Student3', preferences: 'invalid' },
                { id: 'S4' }, // 缺少必要屬性
                { id: 'S5', name: 'Student5', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(invalidStudents, seats);
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.length).to.be.greaterThan(0);
            expect(result.errors[0]).to.have.property('type', 'validation');
        });

        it('應該處理無效的座位數據', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const invalidSeats = [
                { id: null, row: 1, col: 1 },
                { id: 'A2', row: -1, col: 2 },
                { id: 'A3', row: 1, col: 'invalid' },
                { id: 'A4' }, // 缺少必要屬性
                { id: 'A5', row: 1, col: 1, constraints: 'invalid' }
            ];

            const result = engine.assignSeats(students, invalidSeats);
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.length).to.be.greaterThan(0);
            expect(result.errors[0]).to.have.property('type', 'validation');
        });

        it('應該處理無效的條件配置', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const invalidConditions = [
                { type: 'invalid_type', students: ['S1', 'S2'] },
                { type: 'adjacent', students: null },
                { type: 'group', students: ['S1'], size: -1 },
                { type: 'not_adjacent', students: [] },
                { type: 'adjacent', students: ['S1', 'S2'], priority: 'invalid' }
            ];

            const result = engine.assignSeats(students, seats, invalidConditions);
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.length).to.be.greaterThan(0);
            expect(result.errors[0]).to.have.property('type', 'condition');
        });

        it('應該處理循環依賴條件', () => {
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

            const circularConditions = [
                { type: 'adjacent', students: ['S1', 'S2'] },
                { type: 'adjacent', students: ['S2', 'S3'] },
                { type: 'not_adjacent', students: ['S1', 'S3'] },
                { type: 'adjacent', students: ['S3', 'S1'] } // 創建循環
            ];

            const result = engine.assignSeats(students, seats, circularConditions);
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.some(e => e.type === 'circular_dependency')).to.be.true;
        });

        it('應該處理內存不足情況', () => {
            // 創建大量數據來模擬內存壓力
            const students = [];
            const seats = [];
            
            // 生成大量學生數據
            for (let i = 0; i < 1000; i++) {
                students.push({
                    id: `S${i}`,
                    name: `Student${i}`,
                    preferences: [`A${Math.floor(Math.random() * 100)}`]
                });
            }

            // 生成大量座位數據
            for (let i = 0; i < 1000; i++) {
                seats.push({
                    id: `A${i}`,
                    row: Math.floor(i / 50) + 1,
                    col: (i % 50) + 1
                });
            }

            // 設置較小的內存限制
            const originalMemoryLimit = process.memoryUsage().heapUsed;
            
            const result = engine.assignSeats(students, seats);
            
            // 檢查是否觸發了內存保護機制
            if (!result.success) {
                expect(result.errors.some(e => e.type === 'memory_limit')).to.be.true;
            }
        });

        it('應該處理超時情況', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            // 設置極短的超時時間
            engine.setTimeout(1); // 1毫秒

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.some(e => e.type === 'timeout')).to.be.true;
        });

        it('應該處理緩存錯誤', () => {
            // 模擬緩存錯誤
            const originalGet = cache.get;
            cache.get = () => { throw new Error('Cache read error'); };

            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            // 恢復原始方法
            cache.get = originalGet;
            
            expect(result.success).to.be.false;
            expect(result.errors).to.be.an('array');
            expect(result.errors.some(e => e.type === 'cache_error')).to.be.true;
        });

        it('應該處理日誌錯誤', () => {
            // 模擬日誌錯誤
            const originalLog = logger.log;
            logger.log = () => { throw new Error('Log write error'); };

            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            // 恢復原始方法
            logger.log = originalLog;
            
            // 日誌錯誤不應該影響主要功能
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });
    });

    describe('testErrorRecovery', () => {
        it('應該從配置錯誤中恢復', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            // 第一次嘗試：無效配置
            const invalidConditions = [
                { type: 'invalid_type', students: ['S1', 'S2'] }
            ];

            let result = engine.assignSeats(students, seats, invalidConditions);
            expect(result.success).to.be.false;

            // 第二次嘗試：有效配置
            const validConditions = [
                { type: 'adjacent', students: ['S1', 'S2'] }
            ];

            result = engine.assignSeats(students, seats, validConditions);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });

        it('應該從數據錯誤中恢復', () => {
            // 第一次嘗試：無效學生數據
            let students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            let result = engine.assignSeats(students, seats);
            expect(result.success).to.be.false;

            // 第二次嘗試：修正後的數據
            students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            result = engine.assignSeats(students, seats);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });

        it('應該從緩存錯誤中恢復', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            // 模擬緩存錯誤
            const originalGet = cache.get;
            cache.get = () => { throw new Error('Cache read error'); };

            let result = engine.assignSeats(students, seats);
            expect(result.success).to.be.false;

            // 恢復緩存功能
            cache.get = originalGet;

            result = engine.assignSeats(students, seats);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });

        it('應該從超時錯誤中恢復', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            // 第一次嘗試：極短超時
            engine.setTimeout(1);
            let result = engine.assignSeats(students, seats);
            expect(result.success).to.be.false;

            // 第二次嘗試：正常超時
            engine.setTimeout(30000); // 30秒
            result = engine.assignSeats(students, seats);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });

        it('應該從內存錯誤中恢復', () => {
            // 模擬內存不足
            const originalMemoryUsage = process.memoryUsage;
            process.memoryUsage = () => ({ heapUsed: 1024 * 1024 * 1024 }); // 1GB

            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            let result = engine.assignSeats(students, seats);
            expect(result.success).to.be.false;

            // 恢復正常內存監控
            process.memoryUsage = originalMemoryUsage;

            result = engine.assignSeats(students, seats);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });

        it('應該從組件錯誤中恢復', () => {
            const students = [
                { id: 'S1', name: 'Student1', preferences: [] },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            // 模擬組件錯誤
            const originalCheck = checker.checkConflicts;
            checker.checkConflicts = () => { throw new Error('Component error'); };

            let result = engine.assignSeats(students, seats);
            expect(result.success).to.be.false;

            // 恢復組件功能
            checker.checkConflicts = originalCheck;

            result = engine.assignSeats(students, seats);
            expect(result.success).to.be.true;
            expect(result.assignments).to.be.an('array');
        });
    });

    describe('testErrorReporting', () => {
        it('應該生成詳細的錯誤報告', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: '', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: -1, col: 1 },
                { id: 'A2', row: 1, col: 'invalid' }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport).to.be.an('object');
            expect(result.errorReport.summary).to.be.a('string');
            expect(result.errorReport.details).to.be.an('array');
            expect(result.errorReport.recommendations).to.be.an('array');
        });

        it('應該分類錯誤類型', () => {
            const students = [
                { id: null, name: 'Student1' }, // 驗證錯誤
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const conditions = [
                { type: 'invalid_type', students: ['S1', 'S2'] } // 條件錯誤
            ];

            const result = engine.assignSeats(students, seats, conditions);
            
            expect(result.success).to.be.false;
            expect(result.errorReport).to.be.an('object');
            expect(result.errorReport.errorTypes).to.be.an('object');
            expect(result.errorReport.errorTypes.validation).to.be.greaterThan(0);
            expect(result.errorReport.errorTypes.condition).to.be.greaterThan(0);
        });

        it('應該提供錯誤修復建議', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport.recommendations).to.be.an('array');
            expect(result.errorReport.recommendations.length).to.be.greaterThan(0);
            
            // 檢查建議的具體性
            const recommendations = result.errorReport.recommendations;
            expect(recommendations.some(r => r.includes('id'))).to.be.true;
            expect(recommendations.some(r => r.includes('修復'))).to.be.true;
        });

        it('應該記錄錯誤統計信息', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: '', preferences: [] },
                { id: 'S3', name: 'Student3', preferences: 'invalid' }
            ];

            const seats = [
                { id: 'A1', row: -1, col: 1 },
                { id: 'A2', row: 1, col: 'invalid' }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport.statistics).to.be.an('object');
            expect(result.errorReport.statistics.totalErrors).to.be.a('number');
            expect(result.errorReport.statistics.errorCount).to.be.a('number');
            expect(result.errorReport.statistics.recoveryAttempts).to.be.a('number');
        });

        it('應該提供錯誤上下文信息', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport.context).to.be.an('object');
            expect(result.errorReport.context.inputSize).to.be.an('object');
            expect(result.errorReport.context.inputSize.students).to.be.a('number');
            expect(result.errorReport.context.inputSize.seats).to.be.a('number');
            expect(result.errorReport.context.timestamp).to.be.a('string');
        });

        it('應該支持錯誤報告導出', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport.export).to.be.a('function');
            
            // 測試導出功能
            const exportedReport = result.errorReport.export('json');
            expect(exportedReport).to.be.a('string');
            
            const parsedReport = JSON.parse(exportedReport);
            expect(parsedReport).to.have.property('summary');
            expect(parsedReport).to.have.property('details');
        });

        it('應該記錄錯誤時間線', () => {
            const students = [
                { id: null, name: 'Student1' },
                { id: 'S2', name: 'Student2', preferences: [] }
            ];

            const seats = [
                { id: 'A1', row: 1, col: 1 },
                { id: 'A2', row: 1, col: 2 }
            ];

            const result = engine.assignSeats(students, seats);
            
            expect(result.success).to.be.false;
            expect(result.errorReport.timeline).to.be.an('array');
            expect(result.errorReport.timeline.length).to.be.greaterThan(0);
            
            // 檢查時間線條目
            const timelineEntry = result.errorReport.timeline[0];
            expect(timelineEntry).to.have.property('timestamp');
            expect(timelineEntry).to.have.property('error');
            expect(timelineEntry).to.have.property('phase');
        });
    });
});
