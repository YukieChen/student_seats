// Integration.test.js - 整合測試
import { SeatAssignmentEngine } from '../SeatAssignmentEngine.js';
import { ConflictChecker } from '../ConflictChecker.js';
import { StudentScorer } from '../StudentScorer.js';
import { SeatSelector } from '../SeatSelector.js';
import { DynamicAdjuster } from '../DynamicAdjuster.js';
import { StateValidator } from '../StateValidator.js';
import { AssignmentCache } from '../AssignmentCache.js';
import { Logger } from '../Logger.js';
import { CycleDetector } from '../CycleDetector.js';
import { TransactionalAssignment } from '../TransactionalAssignment.js';
import { AssignmentExplainer } from '../AssignmentExplainer.js';

// 簡單測試函數
function runTests() {
    console.log('開始整合測試...\n');

    let passedTests = 0;
    let totalTests = 0;

    function test(name, testFunction) {
        totalTests++;
        try {
            testFunction();
            console.log(`✅ ${name}`);
            passedTests++;
        } catch (error) {
            console.log(`❌ ${name}: ${error.message}`);
        }
    }

    // 測試數據
    const mockStudents = [
        { id: 'student1', name: '學生1' },
        { id: 'student2', name: '學生2' },
        { id: 'student3', name: '學生3' },
        { id: 'student4', name: '學生4' }
    ];

    const mockSeats = [
        { id: 'seat1', name: '座位1', group: 'A' },
        { id: 'seat2', name: '座位2', group: 'A' },
        { id: 'seat3', name: '座位3', group: 'B' },
        { id: 'seat4', name: '座位4', group: 'B' }
    ];

    const mockConditions = [
        {
            id: 'condition1',
            type: 'adjacent',
            students: [['student1', 'student2']],
            description: '學生1和學生2相鄰'
        },
        {
            id: 'condition2',
            type: 'group',
            students: [['student3', 'student4']],
            description: '學生3和學生4在同一群組'
        }
    ];

    // 測試 1: 模組初始化協作
    test('模組初始化協作', () => {
        const logger = new Logger();
        const cache = new AssignmentCache();
        const conflictChecker = new ConflictChecker(logger);
        const studentScorer = new StudentScorer(logger);
        const seatSelector = new SeatSelector(logger);
        const dynamicAdjuster = new DynamicAdjuster(logger);
        const stateValidator = new StateValidator(logger);
        const cycleDetector = new CycleDetector();
        const transaction = new TransactionalAssignment();
        const explainer = new AssignmentExplainer();

        const engine = new SeatAssignmentEngine({
            logger,
            cache,
            conflictChecker,
            studentScorer,
            seatSelector,
            dynamicAdjuster,
            stateValidator,
            cycleDetector,
            transaction,
            explainer
        });

        if (!engine.logger) throw new Error('Logger 應該被正確注入');
        if (!engine.cache) throw new Error('Cache 應該被正確注入');
        if (!engine.conflictChecker) throw new Error('ConflictChecker 應該被正確注入');
        if (!engine.studentScorer) throw new Error('StudentScorer 應該被正確注入');
        if (!engine.seatSelector) throw new Error('SeatSelector 應該被正確注入');
        if (!engine.dynamicAdjuster) throw new Error('DynamicAdjuster 應該被正確注入');
        if (!engine.stateValidator) throw new Error('StateValidator 應該被正確注入');
    });

    // 測試 2: 衝突檢查流程
    test('衝突檢查流程', () => {
        const logger = new Logger();
        const conflictChecker = new ConflictChecker(logger);
        
        conflictChecker.initialize(mockStudents, mockSeats, mockConditions);
        const result = conflictChecker.checkAllConflicts();
        
        if (!result.hasConflicts) throw new Error('應該檢測到衝突');
        if (!Array.isArray(result.conflicts)) throw new Error('衝突列表應該是陣列');
        if (result.conflicts.length === 0) throw new Error('應該有具體的衝突');
    });

    // 測試 3: 學生評分流程
    test('學生評分流程', () => {
        const logger = new Logger();
        const studentScorer = new StudentScorer(logger);
        
        const scores = studentScorer.calculateScores(mockStudents, mockConditions);
        
        if (!scores) throw new Error('應該返回分數');
        if (typeof scores !== 'object') throw new Error('分數應該是物件');
        if (Object.keys(scores).length !== mockStudents.length) throw new Error('每個學生都應該有分數');
    });

    // 測試 4: 座位選擇流程
    test('座位選擇流程', () => {
        const logger = new Logger();
        const seatSelector = new SeatSelector(logger);
        
        const availableSeats = seatSelector.getAvailableSeats(mockSeats, new Map());
        const candidateSeats = seatSelector.getCandidateSeats(availableSeats, mockStudents[0], mockConditions);
        
        if (!Array.isArray(availableSeats)) throw new Error('可用座位應該是陣列');
        if (!Array.isArray(candidateSeats)) throw new Error('候選座位應該是陣列');
        if (availableSeats.length !== mockSeats.length) throw new Error('所有座位都應該可用');
    });

    // 測試 5: 動態調整流程
    test('動態調整流程', () => {
        const logger = new Logger();
        const dynamicAdjuster = new DynamicAdjuster(logger);
        
        const currentAssignment = new Map([
            ['student1', 'seat1'],
            ['student2', 'seat2']
        ]);
        
        const adjustment = dynamicAdjuster.tryAdjustment(
            'student3',
            'seat3',
            currentAssignment,
            mockStudents,
            mockSeats,
            mockConditions
        );
        
        if (!adjustment) throw new Error('應該返回調整結果');
        if (typeof adjustment.success !== 'boolean') throw new Error('調整結果應該有成功標誌');
    });

    // 測試 6: 狀態驗證流程
    test('狀態驗證流程', () => {
        const logger = new Logger();
        const stateValidator = new StateValidator(logger);
        
        const assignment = new Map([
            ['student1', 'seat1'],
            ['student2', 'seat2'],
            ['student3', 'seat3']
        ]);
        
        const validation = stateValidator.validate(assignment, mockStudents, mockSeats, mockConditions);
        
        if (!validation.isValid) throw new Error('狀態應該有效');
        if (!validation.issues) throw new Error('應該有問題列表');
        if (!validation.suggestions) throw new Error('應該有建議');
    });

    // 測試 7: 緩存協作
    test('緩存協作', () => {
        const logger = new Logger();
        const cache = new AssignmentCache();
        
        // 測試條件檢查緩存
        const canSit = cache.canStudentSitHere('student1', 'seat1', mockConditions, new Map());
        
        if (typeof canSit !== 'boolean') throw new Error('緩存結果應該是布林值');
        
        const stats = cache.getCacheStats();
        if (!stats.hitRate) throw new Error('應該有命中率統計');
        if (!stats.totalRequests) throw new Error('應該有總請求數');
    });

    // 測試 8: 循環檢測協作
    test('循環檢測協作', () => {
        const cycleDetector = new CycleDetector();
        
        // 記錄一些調整
        cycleDetector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        cycleDetector.recordAdjustment('student2', 'seat2', 'CONFLICT_RESOLUTION');
        cycleDetector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        
        const cycleResult = cycleDetector.detectCycle('student1', 'seat1');
        
        if (!cycleResult.isCycle) throw new Error('應該檢測到循環');
        if (!cycleResult.confidence) throw new Error('應該有置信度');
    });

    // 測試 9: 事務性分配協作
    test('事務性分配協作', () => {
        const transaction = new TransactionalAssignment();
        
        // 執行分配操作
        const assignResult = transaction.assign('student1', { id: 'seat1', name: '座位1' }, { reason: 'TEST' });
        const commitResult = transaction.commit();
        
        if (!assignResult.success) throw new Error('分配應該成功');
        if (!commitResult.success) throw new Error('提交應該成功');
        
        const stats = transaction.getStatistics();
        if (stats.committedAssignments !== 1) throw new Error('應該有 1 個已提交分配');
    });

    // 測試 10: 結果解釋協作
    test('結果解釋協作', () => {
        const explainer = new AssignmentExplainer();
        
        const assignmentResult = {
            success: true,
            assignment: new Map([
                ['student1', 'seat1'],
                ['student2', 'seat2'],
                ['student3', 'seat3']
            ]),
            unassignedStudents: ['student4'],
            conflicts: [],
            performanceMetrics: {
                executionTime: 1500,
                memoryUsage: [100, 120, 110]
            }
        };
        
        const explanation = explainer.explainAssignment(assignmentResult, {
            students: mockStudents,
            seats: mockSeats,
            conditions: mockConditions
        });
        
        if (!explanation.summary) throw new Error('應該有摘要');
        if (!explanation.details) throw new Error('應該有詳細信息');
        if (!explanation.statistics) throw new Error('應該有統計');
    });

    // 測試 11: 完整引擎流程
    test('完整引擎流程', () => {
        const logger = new Logger();
        const cache = new AssignmentCache();
        const conflictChecker = new ConflictChecker(logger);
        const studentScorer = new StudentScorer(logger);
        const seatSelector = new SeatSelector(logger);
        const dynamicAdjuster = new DynamicAdjuster(logger);
        const stateValidator = new StateValidator(logger);
        const cycleDetector = new CycleDetector();
        const transaction = new TransactionalAssignment();
        const explainer = new AssignmentExplainer();

        const engine = new SeatAssignmentEngine({
            logger,
            cache,
            conflictChecker,
            studentScorer,
            seatSelector,
            dynamicAdjuster,
            stateValidator,
            cycleDetector,
            transaction,
            explainer
        });

        // 執行完整的座位分配流程
        const config = {
            students: mockStudents,
            seats: mockSeats,
            conditions: mockConditions
        };

        const result = engine.solveAssignment(config);
        
        if (!result) throw new Error('應該返回結果');
        if (typeof result.success !== 'boolean') throw new Error('結果應該有成功標誌');
        if (!result.assignment) throw new Error('應該有分配結果');
        if (!result.performanceMetrics) throw new Error('應該有性能指標');
    });

    // 測試 12: 性能監控協作
    test('性能監控協作', () => {
        const logger = new Logger();
        
        // 執行一些操作來產生性能數據
        logger.log('INFO', 'TEST', '測試開始');
        logger.log('WARN', 'TEST', '測試警告');
        logger.log('ERROR', 'TEST', '測試錯誤');
        
        const stats = logger.getPerformanceStats();
        
        if (!stats.totalLogs) throw new Error('應該有總日誌數');
        if (!stats.memoryUsage) throw new Error('應該有記憶體使用情況');
        if (!stats.executionTime) throw new Error('應該有執行時間');
    });

    // 測試 13: 錯誤處理協作
    test('錯誤處理協作', () => {
        const logger = new Logger();
        const engine = new SeatAssignmentEngine({ logger });
        
        // 測試錯誤分類
        const error = new Error('測試錯誤');
        const errorInfo = engine.classifyError(error);
        
        if (!errorInfo.type) throw new Error('應該有錯誤類型');
        if (!errorInfo.severity) throw new Error('應該有錯誤嚴重程度');
        if (!errorInfo.suggestions) throw new Error('應該有錯誤建議');
    });

    // 測試 14: 資源清理協作
    test('資源清理協作', () => {
        const logger = new Logger();
        const cache = new AssignmentCache();
        const cycleDetector = new CycleDetector();
        const transaction = new TransactionalAssignment();
        const explainer = new AssignmentExplainer();
        
        // 添加一些數據
        cache.canStudentSitHere('student1', 'seat1', mockConditions, new Map());
        cycleDetector.recordAdjustment('student1', 'seat1', 'TEST');
        transaction.assign('student1', { id: 'seat1', name: '座位1' }, { reason: 'TEST' });
        explainer.explainAssignment({ success: true, assignment: new Map() }, {});
        
        // 清理資源
        cache.clear();
        cycleDetector.clear();
        transaction.dispose();
        explainer.dispose();
        
        // 驗證清理結果
        const cacheStats = cache.getCacheStats();
        if (cacheStats.totalRequests !== 0) throw new Error('緩存應該被清理');
        if (cycleDetector.history.length !== 0) throw new Error('循環檢測器應該被清理');
        if (transaction.committedAssignments.size !== 0) throw new Error('事務應該被清理');
    });

    // 測試 15: 模組間數據流
    test('模組間數據流', () => {
        const logger = new Logger();
        const cache = new AssignmentCache();
        const conflictChecker = new ConflictChecker(logger);
        const studentScorer = new StudentScorer(logger);
        
        // 測試數據在模組間的流動
        conflictChecker.initialize(mockStudents, mockSeats, mockConditions);
        const conflictResult = conflictChecker.checkAllConflicts();
        
        if (conflictResult.hasConflicts) {
            // 如果有衝突，測試衝突處理流程
            const scores = studentScorer.calculateScores(mockStudents, mockConditions);
            const cacheKey = cache.generateCacheKey('student1', 'seat1', mockConditions);
            
            if (!scores) throw new Error('應該能計算分數');
            if (!cacheKey) throw new Error('應該能生成緩存鍵');
        }
        
        // 驗證日誌記錄
        const logs = logger.getLogs();
        if (logs.length === 0) throw new Error('應該有日誌記錄');
    });

    console.log(`\n整合測試完成: ${passedTests}/${totalTests} 通過`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有整合測試通過！模組協作正常');
    } else {
        console.log('⚠️ 部分整合測試失敗，需要檢查模組間協作');
    }
}

// 運行測試
runTests();
