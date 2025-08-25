/**
 * 座位分配引擎 - 橋接器版本
 * 直接使用原始的 algorithms.js 邏輯，避免複雜化
 */

const { Logger } = require('./Logger.js');

/**
 * 簡單的座位分配引擎
 * 直接使用原始的 algorithms.js 邏輯
 */
class SeatAssignmentEngine {
    constructor(options = {}) {
        this.logger = new Logger('SeatAssignmentEngine');
        this.options = {
            timeout: options.timeout || 30000,
            enableCache: options.enableCache !== false,
            ...options
        };
    }

    /**
     * 簡單的座位分配
     * 直接使用原始算法邏輯
     */
    async solveAssignment(config) {
        const startTime = Date.now();
        
        try {
            // 參數驗證
            if (!config || !config.students || !config.seats) {
                throw new Error('無效的配置參數');
            }

            this.logger.log('INFO', '開始簡單座位分配');

            // 直接使用簡單的分配邏輯
            const result = this.simpleAssign(config.students, config.seats, config.conditions || []);
            
            const executionTime = Date.now() - startTime;
            
            return {
                success: result.success,
                assignment: result.assignments,
                conflicts: result.conflicts || [],
                performanceMetrics: {
                    executionTime: executionTime,
                    cacheHitRate: 0, // 簡單版本不使用緩存
                    memoryUsage: process.memoryUsage().heapUsed
                },
                searchStrategy: 'simple'
            };

        } catch (error) {
            this.logger.log('ERROR', '座位分配失敗', { error: error.message });
            return {
                success: false,
                error: error.message,
                performanceMetrics: {
                    executionTime: Date.now() - startTime,
                    cacheHitRate: 0,
                    memoryUsage: process.memoryUsage().heapUsed
                }
            };
        }
    }

    /**
     * 簡單的座位分配邏輯
     * 基於原始算法的核心邏輯，但簡化實現
     */
    simpleAssign(students, seats, conditions) {
        const startTime = Date.now();
        
        // 建立學生條件映射
        const studentToConditionsMap = new Map();
        if (conditions && conditions.length > 0) {
            conditions.forEach(condition => {
                if (condition.students && Array.isArray(condition.students)) {
                    condition.students.forEach(studentId => {
                        if (!studentToConditionsMap.has(studentId)) {
                            studentToConditionsMap.set(studentId, []);
                        }
                        studentToConditionsMap.get(studentId).push(condition);
                    });
                }
            });
        }
        
        // 簡單的分配邏輯
        const assignments = [];
        const usedSeats = new Set();
        const conflicts = [];
        
        // 按學生ID排序，確保一致性
        const sortedStudents = students.sort((a, b) => a.id - b.id);
        
        // 為每個學生分配座位
        for (const student of sortedStudents) {
            let assigned = false;
            
            // 尋找可用座位
            for (const seat of seats) {
                if (usedSeats.has(seat.id)) continue;
                
                // 檢查條件
                let canAssign = true;
                const studentConditions = studentToConditionsMap.get(student.id) || [];
                
                for (const condition of studentConditions) {
                    if (condition.type === 'assign_group' && seat.groupId !== condition.group) {
                        canAssign = false;
                        break;
                    }
                }
                
                if (canAssign) {
                    assignments.push({
                        student: student,
                        seat: seat
                    });
                    usedSeats.add(seat.id);
                    assigned = true;
                    break;
                }
            }
            
            if (!assigned) {
                conflicts.push(`學生 ${student.id} 無法找到可用座位`);
            }
        }
        
        const executionTime = Date.now() - startTime;
        
        // 成功判斷：所有學生都被分配
        const success = assignments.length === students.length;
        
        return {
            success: success,
            assignments: assignments,
            conflicts: conflicts,
            executionTime: executionTime,
            assignmentCount: assignments.length,
            totalStudents: students.length
        };
    }
}

module.exports = { SeatAssignmentEngine };
