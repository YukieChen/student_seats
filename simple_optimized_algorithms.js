/**
 * 簡化優化演算法
 * 專注於實際的性能提升，避免過度複雜化
 */

// 簡化的緩存系統
class SimpleCache {
    constructor() {
        this.conditionResults = new Map();
        this.studentConditions = new Map();
        this.hitCount = 0;
        this.missCount = 0;
    }

    // 生成簡單的緩存鍵
    generateKey(type, data) {
        return `${type}_${JSON.stringify(data)}`;
    }

    // 獲取條件結果
    getConditionResult(condition, assignments) {
        const key = this.generateKey('condition', { 
            type: condition.type, 
            students: condition.students,
            assignments: Array.from(assignments.entries())
        });
        
        if (this.conditionResults.has(key)) {
            this.hitCount++;
            return this.conditionResults.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置條件結果
    setConditionResult(condition, assignments, result) {
        const key = this.generateKey('condition', { 
            type: condition.type, 
            students: condition.students,
            assignments: Array.from(assignments.entries())
        });
        this.conditionResults.set(key, result);
    }

    // 獲取學生條件
    getStudentConditions(studentId, allConditions) {
        const key = this.generateKey('studentConditions', { studentId, allConditions });
        if (this.studentConditions.has(key)) {
            this.hitCount++;
            return this.studentConditions.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置學生條件
    setStudentConditions(studentId, allConditions, studentConditions) {
        const key = this.generateKey('studentConditions', { studentId, allConditions });
        this.studentConditions.set(key, studentConditions);
    }

    // 獲取緩存命中率
    getHitRate() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? this.hitCount / total : 0;
    }

    // 清理緩存
    clear() {
        this.conditionResults.clear();
        this.studentConditions.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }
}

// 簡化優化的座位分配引擎
class SimpleOptimizedEngine {
    constructor() {
        this.cache = new SimpleCache();
    }

    // 主要的座位分配函數
    assignSeats(students, seats, conditions) {
        const startTime = Date.now();
        
        // 預處理：建立索引和映射
        const { studentConditionMap, seatIndex } = this.preprocess(students, seats, conditions);
        
        // 執行分配
        const result = this.executeAssignment(students, seats, studentConditionMap, seatIndex, startTime);
        
        return {
            success: result.success,
            assignments: result.assignments,
            conflicts: result.conflicts,
            performance: {
                executionTime: Date.now() - startTime,
                cacheHitRate: this.cache.getHitRate(),
                memoryUsage: process.memoryUsage().heapUsed
            }
        };
    }

    // 預處理數據
    preprocess(students, seats, conditions) {
        // 建立學生條件映射
        const studentConditionMap = new Map();
        students.forEach(student => {
            const studentConditions = this.cache.getStudentConditions(student.id, conditions);
            if (studentConditions) {
                studentConditionMap.set(student.id, studentConditions);
            } else {
                const filteredConditions = conditions.filter(condition => 
                    condition.students && condition.students.includes(student.id)
                );
                studentConditionMap.set(student.id, filteredConditions);
                this.cache.setStudentConditions(student.id, conditions, filteredConditions);
            }
        });

        // 建立座位索引
        const seatIndex = new Map();
        seats.forEach(seat => {
            seatIndex.set(seat.id, seat);
        });

        return { studentConditionMap, seatIndex };
    }

    // 執行分配
    executeAssignment(students, seats, studentConditionMap, seatIndex, startTime) {
        const assignments = new Map();
        const usedSeats = new Set();
        const conflicts = [];

        // 按條件複雜度排序學生（有條件的優先）
        const sortedStudents = students.sort((a, b) => {
            const aConditions = studentConditionMap.get(a.id) || [];
            const bConditions = studentConditionMap.get(b.id) || [];
            return bConditions.length - aConditions.length;
        });

        // 為每個學生分配座位
        for (const student of sortedStudents) {
            if (Date.now() - startTime > 30000) { // 30秒超時
                return { success: false, assignments: [], conflicts: ['超時'] };
            }

            const seat = this.findBestSeat(student, assignments, usedSeats, studentConditionMap, seatIndex);
            if (seat) {
                assignments.set(student.id, seat);
                usedSeats.add(seat.id);
            } else {
                conflicts.push(`無法為學生 ${student.id} 分配座位`);
            }
        }

        // 轉換結果格式
        const assignmentList = Array.from(assignments.entries()).map(([studentId, seat]) => ({
            student: students.find(s => s.id === studentId),
            seat: seat
        }));

        return {
            success: assignmentList.length === students.length,
            assignments: assignmentList,
            conflicts: conflicts
        };
    }

    // 為學生找到最佳座位
    findBestSeat(student, assignments, usedSeats, studentConditionMap, seatIndex) {
        const studentConditions = studentConditionMap.get(student.id) || [];
        const availableSeats = Array.from(seatIndex.values()).filter(seat => !usedSeats.has(seat.id));

        if (availableSeats.length === 0) {
            return null;
        }

        // 計算每個座位的評分
        const scoredSeats = availableSeats.map(seat => {
            const score = this.calculateSeatScore(student, seat, studentConditions, assignments);
            return { seat, score };
        });

        // 按評分排序並返回最佳座位
        scoredSeats.sort((a, b) => b.score - a.score);
        return scoredSeats[0].seat;
    }

    // 計算座位評分
    calculateSeatScore(student, seat, studentConditions, assignments) {
        let score = 0;

        // 檢查條件滿足情況
        for (const condition of studentConditions) {
            const conditionMet = this.checkCondition(condition, assignments, student, seat);
            if (conditionMet) {
                score += 100;
            } else {
                score -= 50;
            }
        }

        // 偏好座位加分
        if (student.preferences && student.preferences.includes(seat.id)) {
            score += 10;
        }

        return score;
    }

    // 檢查條件是否滿足
    checkCondition(condition, assignments, student, seat) {
        // 創建臨時分配狀態
        const tempAssignments = new Map(assignments);
        tempAssignments.set(student.id, seat);

        // 檢查緩存
        const cachedResult = this.cache.getConditionResult(condition, tempAssignments);
        if (cachedResult !== null) {
            return cachedResult;
        }

        let result = false;

        switch (condition.type) {
            case 'assign_group':
                result = seat.groupId === condition.group;
                break;
            case 'adjacent':
                result = this.checkAdjacentCondition(condition, tempAssignments);
                break;
            case 'not_adjacent':
                result = !this.checkAdjacentCondition(condition, tempAssignments);
                break;
            default:
                result = false;
        }

        // 緩存結果
        this.cache.setConditionResult(condition, tempAssignments, result);
        return result;
    }

    // 檢查相鄰條件
    checkAdjacentCondition(condition, assignments) {
        const students = condition.students;
        const assignedStudents = students.filter(id => assignments.has(id));
        
        if (assignedStudents.length < 2) {
            return true;
        }

        // 檢查是否有學生相鄰
        for (let i = 0; i < assignedStudents.length; i++) {
            for (let j = i + 1; j < assignedStudents.length; j++) {
                const seat1 = assignments.get(assignedStudents[i]);
                const seat2 = assignments.get(assignedStudents[j]);
                
                if (this.areSeatsAdjacent(seat1, seat2)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // 檢查座位是否相鄰
    areSeatsAdjacent(seat1, seat2) {
        if (!seat1 || !seat2) return false;
        
        const rowDiff = Math.abs(seat1.row - seat2.row);
        const colDiff = Math.abs(seat1.col - seat2.col);
        
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }
}

// 導出簡化優化演算法
module.exports = {
    SimpleOptimizedEngine,
    SimpleCache
};
