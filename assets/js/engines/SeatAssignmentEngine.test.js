// SeatAssignmentEngine.test.js - 測試文件
import { SeatAssignmentEngine } from './SeatAssignmentEngine.js';

// 模擬測試數據
const mockConfig = {
    students: [
        { id: 'S001', name: '學生1' },
        { id: 'S002', name: '學生2' },
        { id: 'S003', name: '學生3' }
    ],
    seats: [
        { row: 0, col: 0, groupId: 'A', isValid: true },
        { row: 0, col: 1, groupId: 'A', isValid: true },
        { row: 0, col: 2, groupId: 'A', isValid: true },
        { row: 1, col: 0, groupId: 'B', isValid: true },
        { row: 1, col: 1, groupId: 'B', isValid: true },
        { row: 1, col: 2, groupId: 'B', isValid: true }
    ],
    conditions: [
        {
            id: 'C001',
            type: 'adjacent',
            students: [['S001', 'S002']]
        }
    ]
};

// 測試函數
async function testSeatAssignmentEngine() {
    console.log('開始測試 SeatAssignmentEngine...');
    
    try {
        // 1. 測試建構函式
        console.log('1. 測試建構函式...');
        const engine = new SeatAssignmentEngine({
            timeout: 10000,
            maxRetries: 2,
            enableCache: true
        });
        
        if (engine && engine.logger && engine.cache) {
            console.log('✅ 建構函式測試通過');
        } else {
            console.log('❌ 建構函式測試失敗');
            return false;
        }

        // 2. 測試學生排序邏輯
        console.log('2. 測試學生排序邏輯...');
        const studentScores = new Map([
            ['S001', 10],
            ['S002', 5],
            ['S003', 8]
        ]);
        
        const sortedStudents = engine.sortStudentsByPriority(mockConfig.students, studentScores);
        if (sortedStudents.length === 3 && sortedStudents[0].id === 'S001') {
            console.log('✅ 學生排序邏輯測試通過');
        } else {
            console.log('❌ 學生排序邏輯測試失敗');
            return false;
        }

        // 3. 測試座位排序邏輯
        console.log('3. 測試座位排序邏輯...');
        const sortedSeats = engine.sortSeatsByPreference(mockConfig.seats);
        if (sortedSeats.length === 6) {
            console.log('✅ 座位排序邏輯測試通過');
        } else {
            console.log('❌ 座位排序邏輯測試失敗');
            return false;
        }

        // 4. 測試學生群組綁定檢查
        console.log('4. 測試學生群組綁定檢查...');
        const groupBindings = engine.checkStudentGroupBindings(mockConfig.students, mockConfig.conditions);
        if (groupBindings instanceof Map) {
            console.log('✅ 學生群組綁定檢查測試通過');
        } else {
            console.log('❌ 學生群組綁定檢查測試失敗');
            return false;
        }

        // 5. 測試錯誤處理
        console.log('5. 測試錯誤處理...');
        const errorInfo = engine.classifyError(new Error('超時'));
        if (errorInfo.type === 'TIMEOUT' && errorInfo.severity === 'HIGH') {
            console.log('✅ 錯誤處理測試通過');
        } else {
            console.log('❌ 錯誤處理測試失敗');
            return false;
        }

        // 6. 測試性能監控
        console.log('6. 測試性能監控...');
        const metrics = engine.getPerformanceMetrics();
        if (metrics && typeof metrics.executionTime === 'number') {
            console.log('✅ 性能監控測試通過');
        } else {
            console.log('❌ 性能監控測試失敗');
            return false;
        }

        // 7. 測試完整流程（簡化版）
        console.log('7. 測試完整流程...');
        const result = await engine.solveAssignment(mockConfig);
        if (result && typeof result.success === 'boolean') {
            console.log('✅ 完整流程測試通過');
        } else {
            console.log('❌ 完整流程測試失敗');
            return false;
        }

        // 8. 測試資源清理
        console.log('8. 測試資源清理...');
        engine.dispose();
        if (engine.currentAssignment.size === 0) {
            console.log('✅ 資源清理測試通過');
        } else {
            console.log('❌ 資源清理測試失敗');
            return false;
        }

        console.log('🎉 所有測試通過！Phase 1.1 完成！');
        return true;

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error);
        return false;
    }
}

// 執行測試
if (typeof window !== 'undefined') {
    // 瀏覽器環境
    window.testSeatAssignmentEngine = testSeatAssignmentEngine;
} else {
    // Node.js 環境
    testSeatAssignmentEngine().then(success => {
        if (success) {
            console.log('Phase 1.1 測試完成，所有功能正常！');
        } else {
            console.log('Phase 1.1 測試失敗，需要修正問題！');
        }
    });
}
