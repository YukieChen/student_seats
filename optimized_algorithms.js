/**
 * 優化後的座位分配演算法
 * 目標：計算速度提升 50% 以上，內存使用減少 30% 以上
 */

// 緩存系統
class AssignmentCache {
    constructor() {
        this.conditionCache = new Map();
        this.seatScoreCache = new Map();
        this.studentConditionCache = new Map();
        this.hitCount = 0;
        this.missCount = 0;
    }

    // 生成緩存鍵
    generateCacheKey(type, data) {
        return `${type}_${JSON.stringify(data)}`;
    }

    // 檢查條件緩存
    getConditionResult(condition, assignment) {
        const key = this.generateCacheKey('condition', { condition, assignment: Array.from(assignment.entries()) });
        if (this.conditionCache.has(key)) {
            this.hitCount++;
            return this.conditionCache.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置條件緩存
    setConditionResult(condition, assignment, result) {
        const key = this.generateCacheKey('condition', { condition, assignment: Array.from(assignment.entries()) });
        this.conditionCache.set(key, result);
    }

    // 獲取座位評分緩存
    getSeatScore(studentId, seatId, availableSeats) {
        const key = this.generateCacheKey('seatScore', { studentId, seatId, availableSeats: availableSeats.map(s => s.id) });
        if (this.seatScoreCache.has(key)) {
            this.hitCount++;
            return this.seatScoreCache.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置座位評分緩存
    setSeatScore(studentId, seatId, availableSeats, score) {
        const key = this.generateCacheKey('seatScore', { studentId, seatId, availableSeats: availableSeats.map(s => s.id) });
        this.seatScoreCache.set(key, score);
    }

    // 獲取學生條件緩存
    getStudentConditions(studentId, conditions) {
        const key = this.generateCacheKey('studentConditions', { studentId, conditions });
        if (this.studentConditionCache.has(key)) {
            this.hitCount++;
            return this.studentConditionCache.get(key);
        }
        this.missCount++;
        return null;
    }

    // 設置學生條件緩存
    setStudentConditions(studentId, conditions, studentConditions) {
        const key = this.generateCacheKey('studentConditions', { studentId, conditions });
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
        this.seatScoreCache.clear();
        this.studentConditionCache.clear();
        this.hitCount = 0;
        this.missCount = 0;
    }
}

// 優化的座位分配引擎
class OptimizedSeatAssignmentEngine {
    constructor() {
        this.cache = new AssignmentCache();
        this.maxIterations = 10000; // 防止無限循環
        this.timeout = 30000; // 30秒超時
    }

    // 優化的座位分配主函數
    assignSeats(students, seats, conditions) {
        const startTime = Date.now();
        
        // 預處理數據
        const processedData = this.preprocessData(students, seats, conditions);
        
        // 使用優化的分配算法
        const result = this.optimizedAssignment(processedData, startTime);
        
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

    // 數據預處理
    preprocessData(students, seats, conditions) {
        // 建立學生條件映射（使用緩存）
        const studentToConditionsMap = new Map();
        
        students.forEach(student => {
            const studentConditions = this.getStudentConditions(student.id, conditions);
            if (studentConditions) {
                studentToConditionsMap.set(student.id, studentConditions);
            } else {
                const filteredConditions = this.filterConditionsForStudent(student.id, conditions);
                studentToConditionsMap.set(student.id, filteredConditions);
                this.cache.setStudentConditions(student.id, conditions, filteredConditions);
            }
        });

        // 建立座位索引（優化查找）
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

        return {
            students,
            seats,
            conditions,
            studentToConditionsMap,
            seatIndex,
            groupIndex
        };
    }

    // 獲取學生的條件（使用緩存）
    getStudentConditions(studentId, conditions) {
        return this.cache.getStudentConditions(studentId, conditions);
    }

    // 過濾學生的條件
    filterConditionsForStudent(studentId, conditions) {
        return conditions.filter(condition => 
            condition.students && condition.students.includes(studentId)
        );
    }

    // 優化的座位分配算法
    optimizedAssignment(processedData, startTime) {
        const { students, seats, studentToConditionsMap, seatIndex, groupIndex } = processedData;
        
        const assignments = new Map();
        const usedSeats = new Set();
        const conflicts = [];
        
        // 優先分配有特殊條件的學生
        const priorityStudents = [];
        const normalStudents = [];
        
        students.forEach(student => {
            const studentConditions = studentToConditionsMap.get(student.id) || [];
            if (studentConditions.length > 0) {
                priorityStudents.push(student);
            } else {
                normalStudents.push(student);
            }
        });

        // 分配優先學生
        for (const student of priorityStudents) {
            if (Date.now() - startTime > this.timeout) {
                return { success: false, assignments: [], conflicts: ['超時'] };
            }

            const assignment = this.assignStudentToSeat(student, assignments, usedSeats, studentToConditionsMap, seatIndex, groupIndex);
            if (assignment) {
                assignments.set(student.id, assignment);
                usedSeats.add(assignment.id);
            } else {
                conflicts.push(`無法為學生 ${student.id} 分配座位`);
            }
        }

        // 分配普通學生
        for (const student of normalStudents) {
            if (Date.now() - startTime > this.timeout) {
                return { success: false, assignments: [], conflicts: ['超時'] };
            }

            const assignment = this.assignStudentToSeat(student, assignments, usedSeats, studentToConditionsMap, seatIndex, groupIndex);
            if (assignment) {
                assignments.set(student.id, assignment);
                usedSeats.add(assignment.id);
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

    // 為單個學生分配座位
    assignStudentToSeat(student, assignments, usedSeats, studentToConditionsMap, seatIndex, groupIndex) {
        const studentConditions = studentToConditionsMap.get(student.id) || [];
        
        // 獲取可用座位
        const availableSeats = Array.from(seatIndex.values()).filter(seat => !usedSeats.has(seat.id));
        
        if (availableSeats.length === 0) {
            return null;
        }

        // 根據條件排序座位
        const sortedSeats = this.sortSeatsByConditions(student, availableSeats, studentConditions, assignments);
        
        // 返回最佳座位
        return sortedSeats.length > 0 ? sortedSeats[0] : null;
    }

    // 根據條件排序座位
    sortSeatsByConditions(student, availableSeats, studentConditions, assignments) {
        // 計算每個座位的評分
        const scoredSeats = availableSeats.map(seat => {
            const score = this.calculateSeatScore(student, seat, studentConditions, assignments);
            return { seat, score };
        });

        // 按評分排序（高分優先）
        return scoredSeats
            .sort((a, b) => b.score - a.score)
            .map(item => item.seat);
    }

    // 計算座位評分
    calculateSeatScore(student, seat, studentConditions, assignments) {
        let score = 0;

        // 檢查條件滿足情況
        for (const condition of studentConditions) {
            const conditionMet = this.checkCondition(condition, assignments, student, seat);
            if (conditionMet) {
                score += 100; // 條件滿足加分
            } else {
                score -= 50; // 條件不滿足減分
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
        // 使用緩存檢查條件結果
        const tempAssignments = new Map(assignments);
        tempAssignments.set(student.id, seat);
        
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
            return true; // 需要至少兩個學生才能檢查相鄰
        }

        // 簡化的相鄰檢查
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

// 導出優化後的演算法
module.exports = {
    OptimizedSeatAssignmentEngine,
    AssignmentCache
};
