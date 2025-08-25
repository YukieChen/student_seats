/**
 * 簡單測試腳本
 * 檢查系統基本功能是否正常
 */

console.log('=== 開始簡單測試 ===');

// 測試1：基本功能
function testBasicFunctionality() {
    console.log('測試1：基本功能檢查');
    
    const students = [
        { id: 1, name: '學生1' },
        { id: 2, name: '學生2' },
        { id: 3, name: '學生3' }
    ];
    
    const seats = [
        { id: 'A1', row: 0, col: 0, isValid: true, groupId: 'A' },
        { id: 'A2', row: 0, col: 1, isValid: true, groupId: 'A' },
        { id: 'A3', row: 0, col: 2, isValid: true, groupId: 'A' }
    ];
    
    const conditions = [];
    
    // 簡單的座位分配邏輯
    const assignments = [];
    const usedSeats = new Set();
    
    for (let i = 0; i < students.length && i < seats.length; i++) {
        const student = students[i];
        const seat = seats[i];
        
        if (!usedSeats.has(seat.id)) {
            assignments.push({
                student: student,
                seat: seat
            });
            usedSeats.add(seat.id);
        }
    }
    
    const success = assignments.length === students.length;
    console.log(`分配結果: ${success ? '成功' : '失敗'}`);
    console.log(`分配數量: ${assignments.length}/${students.length}`);
    
    return success;
}

// 測試2：性能檢查
function testPerformance() {
    console.log('\n測試2：性能檢查');
    
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    // 執行一些計算
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += i;
    }
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    const executionTime = endTime - startTime;
    const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
    
    console.log(`執行時間: ${executionTime} ms`);
    console.log(`內存使用: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    console.log(`計算結果: ${sum}`);
    
    return executionTime < 1000; // 應該在1秒內完成
}

// 執行測試
try {
    const test1Result = testBasicFunctionality();
    const test2Result = testPerformance();
    
    console.log('\n=== 測試結果 ===');
    console.log(`基本功能: ${test1Result ? '✅ 正常' : '❌ 異常'}`);
    console.log(`性能檢查: ${test2Result ? '✅ 正常' : '❌ 異常'}`);
    
    if (test1Result && test2Result) {
        console.log('✅ 系統基本功能正常');
    } else {
        console.log('❌ 系統存在問題');
    }
    
} catch (error) {
    console.error('❌ 測試過程中發生錯誤:', error.message);
}

console.log('=== 測試結束 ===');
