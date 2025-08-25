/**
 * 有效優化演算法
 * 專注於實際的性能提升，避免過度複雜化
 */

// 高效的緩存系統
class EfficientCache {
    constructor() {
        this.conditionCache = new Map();
        this.studentConditionCache = new Map();
        this.hitCount = 0;
        this.missCount = 0;
    }

    // 生成高效的緩存鍵
    generateKey(type, data) {
        // 使用更簡單的鍵生成策略
        if (type === 'condition') {
            return `${type}_${data.type}_${data.students.join(',')}`;
        } else if (type === 'studentConditions') {
            return `${type}_${data.studentId}`;
        }
        return `${type}_${JSON.stringify(data)}`;
    }

    // 獲取條件結果
    getConditionResult(condition, assignments) {
        const key = this.generateKey('condition', { 
            type: condition.type, 
            students: condition.students
        });
        
        if (this.conditionCache.has(key)) {
            this.hitCount++;
            return this.conditionCache.get(key);
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
        this.conditionCache.set(key, result);
    }

    // 獲取學生條件
    getStudentConditions(studentId, allConditions) {
        const key = this.generateKey('studentConditions', { studentId });
        if (this.studentConditionCache.has(key)) {
            this.hitCount++;
            return this.studentConditionCache.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置學生條件
    setStudentConditions(studentId, allConditions, studentConditions) {
        const key = this.generateKey('studentConditions', { studentId });
        this.studentConditionCache.set(key, studentConditions);
    }

    // 獲取緩存命中率
    getHitRate() {
        const total = this.hitCount + this.missCount;
        return total > 0 ? this.hitCount / total : 0;
    }

    // 清理緩存
    clear() {
        this.conditionCache.clear();
        this.studentConditionCache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }
}

// 有效優化的座位分配引擎
class EffectiveOptimizedEngine {
    constructor() {
        this.cache = new EfficientCache();
    }

    // 主要的座位分配函數
    assignSeats(students, seats, conditions) {
        const startTime = Date.now();
        
        // 快速預處理
        const { studentConditionMap, seatIndex, groupIndex } = this.quickPreprocess(students, seats, conditions);
        
        // 執行高效分配
        const result = this.efficientAssignment(students, seats, studentConditionMap, seatIndex, groupIndex, startTime);
        
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

    // 快速預處理
    quickPreprocess(students, seats, conditions) {
        // 建立學生條件映射（一次性完成）
        const studentConditionMap = new Map();
        const conditionMap = new Map();
        
        // 預處理條件
        conditions.forEach(condition => {
            condition.students.forEach(studentId => {
                if (!conditionMap.has(studentId)) {
                    conditionMap.set(studentId, []);
                }
                conditionMap.get(studentId).push(condition);
            });
        });
        
        // 分配給學生
        students.forEach(student => {
            studentConditionMap.set(student.id, conditionMap.get(student.id) || []);
        });

        // 建立座位索引
        const seatIndex = new Map();
        seats.forEach(seat => {
            seatIndex.set(seat.id, seat);
        });

        // 建立群組索引
        const groupIndex = new Map();
        seats.forEach(seat => {
            if (!groupIndex.has(seat.groupId)) {
                groupIndex.set(seat.groupId, []);
            }
            groupIndex.get(seat.groupId).push(seat);
        });

        return { studentConditionMap, seatIndex, groupIndex };
    }

    // 高效分配算法
    efficientAssignment(students, seats, studentConditionMap, seatIndex, groupIndex, startTime) {
        const assignments = new Map();
        const usedSeats = new Set();
        const conflicts = [];

        // 按條件數量排序學生（有條件的優先）
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

            const seat = this.findOptimalSeat(student, assignments, usedSeats, studentConditionMap, seatIndex, groupIndex);
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

    // 找到最優座位
    findOptimalSeat(student, assignments, usedSeats, studentConditionMap, seatIndex, groupIndex) {
        const studentConditions = studentConditionMap.get(student.id) || [];
        
        // 如果有群組條件，優先考慮該群組的座位
        const groupCondition = studentConditions.find(c => c.type === 'assign_group');
        let candidateSeats = [];
        
        if (groupCondition && groupIndex.has(groupCondition.group)) {
            candidateSeats = groupIndex.get(groupCondition.group).filter(seat => !usedSeats.has(seat.id));
        }
        
        // 如果沒有群組條件或群組座位不足，使用所有可用座位
        if (candidateSeats.length === 0) {
            candidateSeats = Array.from(seatIndex.values()).filter(seat => !usedSeats.has(seat.id));
        }

        if (candidateSeats.length === 0) {
            return null;
        }

        // 快速評分並選擇最佳座位
        let bestSeat = candidateSeats[0];
        let bestScore = this.quickScore(student, bestSeat, studentConditions, assignments);

        for (let i = 1; i < candidateSeats.length; i++) {
            const score = this.quickScore(student, candidateSeats[i], studentConditions, assignments);
            if (score > bestScore) {
                bestScore = score;
                bestSeat = candidateSeats[i];
            }
        }

        return bestSeat;
    }

    // 快速評分
    quickScore(student, seat, studentConditions, assignments) {
        let score = 0;

        // 檢查條件滿足情況（簡化版）
        for (const condition of studentConditions) {
            if (condition.type === 'assign_group') {
                if (seat.groupId === condition.group) {
                    score += 100;
                } else {
                    score -= 100;
                }
            }
        }

        // 偏好座位加分
        if (student.preferences && student.preferences.includes(seat.id)) {
            score += 10;
        }

        return score;
    }
}

// 導出有效優化演算法
module.exports = {
    EffectiveOptimizedEngine,
    EfficientCache
};
