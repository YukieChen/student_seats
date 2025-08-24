// SeatAssignmentEngine.js - 主引擎，協調各個組件
import { Logger } from './Logger.js';
import { AssignmentCache } from './AssignmentCache.js';
import { StateValidator } from './StateValidator.js';
import { ConflictChecker } from './ConflictChecker.js';
import { StudentScorer } from './StudentScorer.js';
import { SeatSelector } from './SeatSelector.js';
import { DynamicAdjuster } from './DynamicAdjuster.js';
import { CycleDetector } from './CycleDetector.js';
import { TransactionalAssignment } from './TransactionalAssignment.js';

export class SeatAssignmentEngine {
    constructor(options = {}) {
        this.logger = new Logger(options.logLevel || 'INFO');
        this.cache = new AssignmentCache();
        this.validator = new StateValidator();
        this.conflictChecker = new ConflictChecker();
        this.studentScorer = new StudentScorer();
        this.seatSelector = new SeatSelector();
        this.dynamicAdjuster = new DynamicAdjuster();
        this.cycleDetector = new CycleDetector();
        
        this.options = {
            timeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 3,
            enableCache: options.enableCache !== false,
            enableCycleDetection: options.enableCycleDetection !== false,
            ...options
        };
    }

    /**
     * 主要座位安排方法
     * @param {Object} config - 配置對象
     * @returns {Promise<Object>} 安排結果
     */
    async solveAssignment(config) {
        const startTime = Date.now();
        this.logger.log('INFO', 'Engine', '開始座位安排演算法', { config });

        try {
            // 1. 初始衝突檢查
            const conflicts = this.conflictChecker.checkInitialConflicts(config);
            if (conflicts.length > 0) {
                return { success: false, conflicts, error: '初始條件衝突' };
            }

            // 2. 計算學生分數
            const studentScores = this.studentScorer.calculateScores(config.students, config.conditions);

            // 3. 創建事務性分配狀態
            const transaction = new TransactionalAssignment(config.seats);

            // 4. 執行回溯演算法
            const result = await this.backtrackAssignment(
                config.students,
                transaction,
                config.conditions,
                studentScores,
                startTime
            );

            // 5. 驗證最終狀態
            this.validator.validate(transaction.getCurrentState());

            const endTime = Date.now();
            this.logger.log('INFO', 'Engine', '座位安排完成', {
                duration: endTime - startTime,
                success: result.success,
                unassignedCount: result.unassignedStudents?.length || 0
            });

            return result;

        } catch (error) {
            this.logger.log('ERROR', 'Engine', '座位安排失敗', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    /**
     * 回溯演算法核心
     */
    async backtrackAssignment(students, transaction, conditions, studentScores, startTime) {
        // 檢查超時
        if (Date.now() - startTime > this.options.timeout) {
            return { success: false, error: '超時' };
        }

        if (students.length === 0) {
            return { success: true, assignment: transaction.getCurrentState() };
        }

        const currentStudent = students[0];
        const availableSeats = this.seatSelector.getAvailableSeats(transaction.getCurrentState());
        const candidateSeats = this.seatSelector.getCandidateSeats(
            currentStudent, 
            availableSeats, 
            conditions
        );

        for (const seat of candidateSeats) {
            // 檢查循環
            if (this.options.enableCycleDetection && 
                this.cycleDetector.detectCycle(currentStudent, seat)) {
                continue;
            }

            // 嘗試分配
            transaction.assign(currentStudent, seat);
            
            if (this.validateAssignment(currentStudent, transaction.getCurrentState(), conditions)) {
                const nextStudents = students.filter(s => s !== currentStudent);
                const result = await this.backtrackAssignment(
                    nextStudents, 
                    transaction, 
                    conditions, 
                    studentScores, 
                    startTime
                );
                
                if (result.success) {
                    return result;
                }
            }

            // 回溯
            transaction.rollback();
        }

        // 嘗試動態調整
        if (await this.dynamicAdjuster.tryAdjustment(
            currentStudent, 
            transaction, 
            conditions, 
            studentScores
        )) {
            const nextStudents = students.filter(s => s !== currentStudent);
            return await this.backtrackAssignment(
                nextStudents, 
                transaction, 
                conditions, 
                studentScores, 
                startTime
            );
        }

        // 標記為未安排
        return { 
            success: false, 
            unassignedStudents: [currentStudent],
            assignment: transaction.getCurrentState()
        };
    }

    /**
     * 驗證分配是否有效
     */
    validateAssignment(studentId, assignment, conditions) {
        const studentConditions = conditions.filter(c => 
            c.students.flat().includes(studentId)
        );

        return studentConditions.every(condition => 
            this.conflictChecker.checkCondition(condition, assignment)
        );
    }

    /**
     * 清理資源
     */
    dispose() {
        this.cache.clear();
        this.cycleDetector.clear();
    }
}
