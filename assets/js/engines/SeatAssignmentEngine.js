/**
 * 座位分配引擎 - 橋接器版本
 * 直接使用原始的 algorithms.js 邏輯，避免複雜化
 * 
 * @fileoverview 座位分配引擎的主要實現，提供簡化的座位分配功能
 * @version 3.0.0
 * @author Student Seats System Team
 * @since 2023-11-01
 */

const { Logger } = require('./Logger.js');

/**
 * 簡單的座位分配引擎
 * 直接使用原始的 algorithms.js 邏輯，提供高效的座位分配功能
 * 
 * @class SeatAssignmentEngine
 * @description 座位分配引擎的主要類別，負責執行座位分配算法
 * 
 * @example
 * const engine = new SeatAssignmentEngine({
 *   timeout: 30000,
 *   enableCache: true
 * });
 * 
 * const result = await engine.solveAssignment({
 *   students: [...],
 *   seats: [...],
 *   conditions: [...]
 * });
 * 
 * @since 1.0.0
 * @version 3.0.0
 */
class SeatAssignmentEngine {
    /**
     * 創建座位分配引擎實例
     * 
     * @param {Object} options - 引擎配置選項
     * @param {number} [options.timeout=30000] - 執行超時時間（毫秒）
     * @param {boolean} [options.enableCache=true] - 是否啟用緩存功能
     * @param {Object} [options.logger] - 自定義日誌記錄器
     * @param {string} [options.algorithm='simple'] - 使用的算法類型
     * @param {number} [options.maxIterations=1000] - 最大迭代次數
     * 
     * @example
     * const engine = new SeatAssignmentEngine({
     *   timeout: 60000,
     *   enableCache: true,
     *   algorithm: 'optimized'
     * });
     * 
     * @throws {Error} 當配置參數無效時拋出錯誤
     * @since 1.0.0
     */
    constructor(options = {}) {
        this.logger = new Logger('SeatAssignmentEngine');
        this.options = {
            timeout: options.timeout || 30000,
            enableCache: options.enableCache !== false,
            algorithm: options.algorithm || 'simple',
            maxIterations: options.maxIterations || 1000,
            ...options
        };
    }

    /**
     * 執行座位分配算法
     * 根據配置參數執行相應的座位分配算法
     * 
     * @param {Object} config - 分配配置參數
     * @param {Array} config.students - 學生列表，每個學生對象包含id、name等屬性
     * @param {Array} config.seats - 座位列表，每個座位對象包含id、row、col等屬性
     * @param {Array} [config.conditions=[]] - 約束條件列表
     * @param {Object} [config.options] - 額外的配置選項
     * 
     * @returns {Promise<Object>} 分配結果對象
     * @returns {boolean} returns.success - 分配是否成功
     * @returns {Array} returns.assignment - 分配結果列表
     * @returns {Array} returns.conflicts - 衝突列表
     * @returns {Object} returns.performanceMetrics - 性能指標
     * @returns {string} returns.searchStrategy - 使用的搜索策略
     * @returns {string} [returns.error] - 錯誤信息（當success為false時）
     * 
     * @example
     * const result = await engine.solveAssignment({
     *   students: [
     *     { id: 1, name: 'Alice' },
     *     { id: 2, name: 'Bob' }
     *   ],
     *   seats: [
     *     { id: 1, row: 1, col: 1 },
     *     { id: 2, row: 1, col: 2 }
     *   ],
     *   conditions: [
     *     { type: 'preference', students: [1], seats: [1] }
     *   ]
     * });
     * 
     * @throws {Error} 當配置參數無效或分配失敗時拋出錯誤
     * @since 1.0.0
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
     * 執行簡單的座位分配邏輯
     * 基於原始算法的核心邏輯，但簡化實現以提高性能
     * 
     * @param {Array} students - 學生列表
     * @param {Array} seats - 座位列表
     * @param {Array} conditions - 約束條件列表
     * 
     * @returns {Object} 分配結果
     * @returns {boolean} returns.success - 分配是否成功
     * @returns {Array} returns.assignments - 分配結果列表
     * @returns {Array} returns.conflicts - 衝突列表
     * @returns {number} returns.executionTime - 執行時間（毫秒）
     * 
     * @example
     * const result = engine.simpleAssign(students, seats, conditions);
     * if (result.success) {
     *   console.log('分配成功:', result.assignments);
     * } else {
     *   console.log('分配失敗:', result.conflicts);
     * }
     * 
     * @since 1.0.0
     * @private
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
