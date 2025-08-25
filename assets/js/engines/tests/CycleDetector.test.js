// CycleDetector.test.js - 循環檢測系統測試
import { CycleDetector } from '../CycleDetector.js';

// 簡單測試函數
function runTests() {
    console.log('開始 CycleDetector 測試...\n');

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

    // 測試 1: 構造函數
    test('構造函數初始化', () => {
        const detector = new CycleDetector();
        if (!detector.adjustmentHistory) throw new Error('adjustmentHistory 應該存在');
        if (!detector.cyclePatterns) throw new Error('cyclePatterns 應該存在');
        if (!detector.options) throw new Error('options 應該存在');
        if (detector.options.maxHistorySize !== 1000) throw new Error('maxHistorySize 應該為 1000');
    });

    // 測試 2: 自定義配置
    test('自定義配置', () => {
        const detector = new CycleDetector({
            maxHistorySize: 50,
            cycleDetectionThreshold: 3
        });
        if (detector.options.maxHistorySize !== 50) throw new Error('maxHistorySize 應該為 50');
        if (detector.options.cycleDetectionThreshold !== 3) throw new Error('cycleDetectionThreshold 應該為 3');
    });

    // 測試 3: 記錄調整
    test('記錄調整', () => {
        const detector = new CycleDetector();
        detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        
        if (detector.adjustmentHistory.length !== 1) throw new Error('歷史記錄應該有 1 條');
        if (detector.adjustmentHistory[0].studentId !== 'student1') throw new Error('學生ID 應該為 student1');
        if (detector.adjustmentHistory[0].seatId !== 'seat1') throw new Error('座位ID 應該為 seat1');
        if (detector.adjustmentHistory[0].reason !== 'CONFLICT_RESOLUTION') throw new Error('原因應該為 CONFLICT_RESOLUTION');
    });

    // 測試 4: 循環檢測
    test('循環檢測', () => {
        const detector = new CycleDetector({ cycleDetectionThreshold: 2 });
        
        // 添加一些調整記錄
        detector.recordAdjustment('student1', 'seat1', 'INITIAL');
        detector.recordAdjustment('student2', 'seat2', 'INITIAL');
        detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        
        const cycleResult = detector.detectCycle('student1', 'seat1');
        
        if (!cycleResult.isCycle) throw new Error('應該檢測到循環');
        if (cycleResult.confidence < 0.5) throw new Error('置信度應該大於 0.5');
        if (!cycleResult.pattern) throw new Error('應該有循環模式');
    });

    // 測試 5: 循環避免
    test('循環避免', () => {
        const detector = new CycleDetector();
        
        // 添加多次相同調整
        for (let i = 0; i < 5; i++) {
            detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        }
        
        const avoidResult = detector.avoidCycle('student1', 'seat1');
        
        if (!avoidResult.shouldAvoid) throw new Error('應該建議避免');
        if (!avoidResult.strategy) throw new Error('應該有避免策略');
        if (!avoidResult.reason) throw new Error('應該有避免原因');
    });

    // 測試 6: 歷史管理
    test('歷史管理', () => {
        const detector = new CycleDetector({ maxHistorySize: 3 });
        
        // 添加多條記錄
        detector.recordAdjustment('student1', 'seat1', 'INITIAL');
        detector.recordAdjustment('student2', 'seat2', 'INITIAL');
        detector.recordAdjustment('student3', 'seat3', 'INITIAL');
        detector.recordAdjustment('student4', 'seat4', 'INITIAL');
        
        if (detector.adjustmentHistory.length !== 3) throw new Error('歷史記錄應該限制為 3 條');
        
        // 測試歷史查詢
        const queryResult = detector.queryHistory({ studentId: 'student3' });
        if (queryResult.length !== 1) throw new Error('查詢結果應該有 1 條');
    });

    // 測試 7: 歷史清理
    test('歷史清理', () => {
        const detector = new CycleDetector();
        
        detector.recordAdjustment('student1', 'seat1', 'INITIAL');
        detector.recordAdjustment('student2', 'seat2', 'INITIAL');
        
        detector.cleanHistory({ maxAge: 0 }); // 清理所有記錄
        
        if (detector.adjustmentHistory.length !== 0) throw new Error('清理後歷史應該為空');
    });

    // 測試 8: 循環統計
    test('循環統計', () => {
        const detector = new CycleDetector();
        
        // 添加一些調整記錄
        for (let i = 0; i < 10; i++) {
            detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
            detector.recordAdjustment('student2', 'seat2', 'CONFLICT_RESOLUTION');
        }
        
        const stats = detector.countCycles();
        if (typeof stats.totalCycles !== 'number') throw new Error('總循環數應該是數字');
        if (stats.totalCycles < 0) throw new Error('總循環數應該大於等於 0');
    });

    // 測試 9: 循環分析
    test('循環分析', () => {
        const detector = new CycleDetector();
        
        // 添加一些調整記錄
        for (let i = 0; i < 5; i++) {
            detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        }
        
        const analysis = detector.analyzeCycles();
        
        if (!analysis.patterns) throw new Error('應該有模式列表');
        if (!analysis.studentCycles) throw new Error('應該有學生循環分析');
        if (!analysis.seatCycles) throw new Error('應該有座位循環分析');
        if (!analysis.timeDistribution) throw new Error('應該有時間分布分析');
        if (!analysis.recommendations) throw new Error('應該有建議');
    });

    // 測試 10: 循環報告
    test('循環報告', () => {
        const detector = new CycleDetector();
        
        // 添加一些調整記錄
        detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        
        const report = detector.generateCycleReport();
        
        if (!report.summary) throw new Error('應該有摘要');
        if (!report.details) throw new Error('應該有詳細信息');
        if (!report.recommendations) throw new Error('應該有建議');
        if (!report.timestamp) throw new Error('應該有時間戳');
    });

    // 測試 11: 統計更新
    test('統計更新', () => {
        const detector = new CycleDetector();
        
        detector.recordAdjustment('student1', 'seat1', 'CONFLICT_RESOLUTION');
        
        if (detector.operationCount !== 1) throw new Error('操作計數應該為 1');
        if (detector.cycleCount !== 0) throw new Error('循環計數應該為 0');
    });

    // 測試 12: 資源清理
    test('資源清理', () => {
        const detector = new CycleDetector();
        
        detector.recordAdjustment('student1', 'seat1', 'INITIAL');
        detector.recordAdjustment('student2', 'seat2', 'INITIAL');
        
        if (detector.adjustmentHistory.length === 0) throw new Error('應該有歷史記錄');
        
        detector.clear();
        
        if (detector.adjustmentHistory.length !== 0) throw new Error('清理後歷史應該為空');
        if (detector.operationCount !== 0) throw new Error('清理後操作計數應該重置');
    });

    // 測試 13: 邊界條件
    test('邊界條件', () => {
        const detector = new CycleDetector({ maxHistorySize: 1 });
        
        detector.recordAdjustment('student1', 'seat1', 'INITIAL');
        detector.recordAdjustment('student2', 'seat2', 'INITIAL');
        
        if (detector.adjustmentHistory.length !== 1) throw new Error('應該限制為 1 條記錄');
        if (detector.adjustmentHistory[0].studentId !== 'student2') throw new Error('應該保留最新的記錄');
    });

    // 測試 14: 錯誤處理
    test('錯誤處理', () => {
        const detector = new CycleDetector();
        
        // 測試無效參數
        detector.recordAdjustment(null, 'seat1', 'INITIAL');
        detector.recordAdjustment('student1', null, 'INITIAL');
        detector.recordAdjustment('student1', 'seat1', null);
        
        // 應該不會拋出錯誤，而是靜默處理
        if (detector.adjustmentHistory.length !== 3) throw new Error('應該記錄所有調整');
    });

    // 測試 15: 性能測試
    test('性能測試', () => {
        const detector = new CycleDetector({ maxHistorySize: 1000 });
        const startTime = Date.now();
        
        // 添加大量記錄
        for (let i = 0; i < 1000; i++) {
            detector.recordAdjustment(`student${i}`, `seat${i}`, 'INITIAL');
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        if (duration > 1000) throw new Error('性能測試應該在 1 秒內完成');
        if (detector.adjustmentHistory.length !== 1000) throw new Error('應該有 1000 條記錄');
    });

    console.log(`\n測試完成: ${passedTests}/${totalTests} 通過`);
    
    if (passedTests === totalTests) {
        console.log('🎉 所有測試通過！CycleDetector.js 功能正常');
    } else {
        console.log('⚠️ 部分測試失敗，需要檢查');
    }
}

// 運行測試
runTests();
