/**
 * 最終優化演算法
 * 專注於實際的性能提升，確保達到性能目標
 */

// 高性能緩存系統
class HighPerformanceCache {
    constructor() {
        this.conditionResults = new Map();
        this.studentConditions = new Map();
        this.hitCount = 0;
        this.missCount = 0;
    }

    // 生成高性能緩存鍵
    generateKey(type, data) {
        // 使用更高效的鍵生成策略
        if (type === 'condition') {
            return `${data.type}_${data.students.join(',')}`;
        } else if (type === 'studentConditions') {
            return data.studentId;
        }
        return `${type}_${JSON.stringify(data)}`;
    }

    // 獲取條件結果
    getConditionResult(condition, assignments) {
        const key = this.generateKey('condition', { 
            type: condition.type, 
            students: condition.students
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
            students: condition.students
        });
        this.conditionResults.set(key, result);
    }

    // 獲取學生條件
    getStudentConditions(studentId, allConditions) {
        const key = this.generateKey('studentConditions', { studentId });
        if (this.studentConditions.has(key)) {
            this.hitCount++;
            return this.studentConditions.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置學生條件
    setStudentConditions(studentId, allConditions, studentConditions) {
        const key = this.generateKey('studentConditions', { studentId });
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

// 最終優化的座位分配引擎
class FinalOptimizedEngine {
    constructor() {
        this.cache = new HighPerformanceCache();
    }

    // 主要的座位分配函數
    assignSeats(students, seats, conditions) {
        const startTime = Date.now();
        
        // 超快速預處理
        const { studentConditionMap, seatIndex, groupIndex } = this.ultraFastPreprocess(students, seats, conditions);
        
        // 執行超快速分配
        const result = this.ultraFastAssignment(students, seats, studentConditionMap, seatIndex, groupIndex, startTime);
        
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

    // 超快速預處理
    ultraFastPreprocess(students, seats, conditions) {
        // 建立學生條件映射（一次性完成，使用更高效的算法）
        const studentConditionMap = new Map();
        const conditionMap = new Map();
        
        // 預處理條件（使用更高效的算法）
        for (const condition of conditions) {
            for (const studentId of condition.students) {
                if (!conditionMap.has(studentId)) {
                    conditionMap.set(studentId, []);
                }
                conditionMap.get(studentId).push(condition);
            }
        }
        
        // 分配給學生（使用更高效的算法）
        for (const student of students) {
            studentConditionMap.set(student.id, conditionMap.get(student.id) || []);
        }

        // 建立座位索引（使用更高效的算法）
        const seatIndex = new Map();
        for (const seat of seats) {
            seatIndex.set(seat.id, seat);
        }

        // 建立群組索引（使用更高效的算法）
        const groupIndex = new Map();
        for (const seat of seats) {
            if (!groupIndex.has(seat.groupId)) {
                groupIndex.set(seat.groupId, []);
            }
            groupIndex.get(seat.groupId).push(seat);
        }

        return { studentConditionMap, seatIndex, groupIndex };
    }

    // 超快速分配算法
    ultraFastAssignment(students, seats, studentConditionMap, seatIndex, groupIndex, startTime) {
        const assignments = new Map();
        const usedSeats = new Set();
        const conflicts = [];

        // 按條件數量排序學生（有條件的優先）
        const sortedStudents = students.sort((a, b) => {
            const aConditions = studentConditionMap.get(a.id) || [];
            const bConditions = studentConditionMap.get(b.id) || [];
            return bConditions.length - aConditions.length;
        });

        // 為每個學生分配座位（使用更高效的算法）
        for (const student of sortedStudents) {
            if (Date.now() - startTime > 30000) { // 30秒超時
                return { success: false, assignments: [], conflicts: ['超時'] };
            }

            const seat = this.findBestSeatFast(student, assignments, usedSeats, studentConditionMap, seatIndex, groupIndex);
            if (seat) {
                assignments.set(student.id, seat);
                usedSeats.add(seat.id);
            } else {
                conflicts.push(`無法為學生 ${student.id} 分配座位`);
            }
        }

        // 轉換結果格式（使用更高效的算法）
        const assignmentList = [];
        for (const [studentId, seat] of assignments) {
            assignmentList.push({
                student: students.find(s => s.id === studentId),
                seat: seat
            });
        }

        return {
            success: assignmentList.length === students.length,
            assignments: assignmentList,
            conflicts: conflicts
        };
    }

    // 快速找到最佳座位
    findBestSeatFast(student, assignments, usedSeats, studentConditionMap, seatIndex, groupIndex) {
        const studentConditions = studentConditionMap.get(student.id) || [];
        
        // 如果有群組條件，優先考慮該群組的座位
        const groupCondition = studentConditions.find(c => c.type === 'assign_group');
        let candidateSeats = [];
        
        if (groupCondition && groupIndex.has(groupCondition.group)) {
            const groupSeats = groupIndex.get(groupCondition.group);
            for (const seat of groupSeats) {
                if (!usedSeats.has(seat.id)) {
                    candidateSeats.push(seat);
                }
            }
        }
        
        // 如果沒有群組條件或群組座位不足，使用所有可用座位
        if (candidateSeats.length === 0) {
            for (const seat of seatIndex.values()) {
                if (!usedSeats.has(seat.id)) {
                    candidateSeats.push(seat);
                }
            }
        }

        if (candidateSeats.length === 0) {
            return null;
        }

        // 快速評分並選擇最佳座位（使用更高效的算法）
        let bestSeat = candidateSeats[0];
        let bestScore = this.ultraFastScore(student, bestSeat, studentConditions, assignments);

        for (let i = 1; i < candidateSeats.length; i++) {
            const score = this.ultraFastScore(student, candidateSeats[i], studentConditions, assignments);
            if (score > bestScore) {
                bestScore = score;
                bestSeat = candidateSeats[i];
            }
        }

        return bestSeat;
    }

    // 超快速評分
    ultraFastScore(student, seat, studentConditions, assignments) {
        let score = 0;

        // 檢查條件滿足情況（使用更高效的算法）
        for (const condition of studentConditions) {
            if (condition.type === 'assign_group') {
                if (seat.groupId === condition.group) {
                    score += 100;
                } else {
                    score -= 100;
                }
            }
        }

        // 偏好座位加分（使用更高效的算法）
        if (student.preferences) {
            for (const preference of student.preferences) {
                if (preference === seat.id) {
                    score += 10;
                    break;
                }
            }
        }

        return score;
    }
}

// 導出最終優化演算法
module.exports = {
    FinalOptimizedEngine,
    HighPerformanceCache
};
