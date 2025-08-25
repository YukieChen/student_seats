/**
 * @fileoverview 衝突檢查器模組
 * 
 * 負責檢查座位安排中的各種衝突，包括條件衝突、容量衝突、群組綁定衝突等。
 * 整合了多個子模組來提供完整的衝突檢查和報告功能。
 * 
 * 主要功能：
 * - 條件衝突檢查
 * - 容量衝突檢查
 * - 群組綁定衝突檢查
 * - 衝突報告生成
 * - 衝突解決建議
 * 
 * @module ConflictChecker
 * @version 2.0.0
 * @author Student Seats System
 * @since 2024-01-01
 * @requires ConditionProcessor
 * @requires ConditionCache
 * @requires ConditionSimplifier
 * @requires ConflictReporter
 * @requires Logger
 */

const { ConditionProcessor } = require('./ConditionProcessor.js');
const { ConditionCache } = require('./ConditionCache.js');
const { ConditionSimplifier } = require('./ConditionSimplifier.js');
const { ConflictReporter } = require('./ConflictReporter.js');
const { Logger } = require('./Logger.js');

/**
 * 衝突檢查器類別
 * 
 * 負責檢查座位安排中的各種衝突，提供完整的衝突檢查和報告功能。
 * 整合了多個子模組來實現不同的衝突檢查功能。
 * 
 * @class ConflictChecker
 * @example
 * const checker = new ConflictChecker({
 *   enableDetailedReporting: true,
 *   enableAutoResolution: false,
 *   maxConflictsToReport: 50
 * });
 * 
 * checker.initialize(students, seats, conditions);
 * const result = checker.checkAllConflicts();
 */
class ConflictChecker {
    constructor(options = {}) {
        this.logger = new Logger('ConflictChecker');
        this.options = {
            enableDetailedReporting: options.enableDetailedReporting !== false,
            enableAutoResolution: options.enableAutoResolution !== false,
            maxConflictsToReport: options.maxConflictsToReport || 50,
            ...options
        };

        // 初始化子模組
        this.conditionProcessor = new ConditionProcessor();
        this.conditionCache = new ConditionCache();
        this.conditionSimplifier = new ConditionSimplifier();
        this.conflictReporter = new ConflictReporter();

        this.students = [];
        this.seats = [];
        this.conditions = [];
        this.conflicts = [];
        this.resolutionSuggestions = new Map();
    }

    /**
     * 初始化衝突檢查器
     */
    initialize(students, seats, conditions) {
        this.students = students;
        this.seats = seats;
        this.conditions = conditions;
        this.conflicts = [];
        this.resolutionSuggestions.clear();

        this.logger.info('初始化衝突檢查器', {
            studentCount: students.length,
            seatCount: seats.length,
            conditionCount: conditions.length
        });

        // 初始化子模組
        this.conditionProcessor.initialize(conditions);
        this.conditionCache.initialize();
        this.conditionSimplifier.initialize(conditions);
        this.conflictReporter.initialize([], this.options);

        // 預處理條件
        this.preprocessConditions();

        return this;
    }

    /**
     * 執行完整的衝突檢查
     */
    checkAllConflicts() {
        this.logger.info('開始執行完整衝突檢查');
        const startTime = Date.now();

        this.conflicts = [];

        // 1. 基本衝突檢查
        this.checkTotalCount();
        this.checkGroupCapacity();
        this.checkStudentGroupBindings();

        // 2. 條件衝突檢查
        this.checkConditionConflicts();

        // 3. 條件簡化檢查
        this.checkConditionSimplification();

        // 4. 生成衝突報告
        this.conflictReporter.initialize(this.conflicts, this.options);
        const report = this.conflictReporter.getConflictReport();

        const processingTime = Date.now() - startTime;
        this.logger.info('衝突檢查完成', {
            conflictCount: this.conflicts.length,
            processingTime: processingTime
        });

        // 為了向後兼容，返回陣列格式
        return this.conflicts;
    }

    /**
     * 執行完整的衝突檢查並返回詳細結果
     */
    checkAllConflictsDetailed() {
        this.logger.info('開始執行完整衝突檢查');
        const startTime = Date.now();

        this.conflicts = [];

        // 1. 基本衝突檢查
        this.checkTotalCount();
        this.checkGroupCapacity();
        this.checkStudentGroupBindings();

        // 2. 條件衝突檢查
        this.checkConditionConflicts();

        // 3. 條件簡化檢查
        this.checkConditionSimplification();

        // 4. 生成衝突報告
        this.conflictReporter.initialize(this.conflicts, this.options);
        const report = this.conflictReporter.getConflictReport();

        const processingTime = Date.now() - startTime;
        this.logger.info('衝突檢查完成', {
            conflictCount: this.conflicts.length,
            processingTime: processingTime
        });

        return {
            hasConflicts: this.conflicts.length > 0,
            conflicts: this.conflicts,
            summary: report.summary,
            report: report
        };
    }

    /**
     * 預處理條件
     */
    preprocessConditions() {
        // 使用 ConditionProcessor 進行條件預處理
        const processedConditions = this.conditionProcessor.preprocessConditions();
        this.conditions = processedConditions;

        // 使用 ConditionSimplifier 進行條件簡化
        const simplificationResult = this.conditionSimplifier.simplifyConditions();
        this.conditions = simplificationResult.simplifiedConditions;

        this.logger.info('條件預處理完成', {
            originalCount: simplificationResult.originalCount,
            finalCount: this.conditions.length,
            redundantRemoved: simplificationResult.redundantRemoved
        });
    }

    /**
     * 檢查總體數量衝突
     */
    checkTotalCount() {
        if (this.students.length > this.seats.length) {
            this.conflicts.push({
                type: 'TOTAL_COUNT',
                severity: 'CRITICAL',
                description: `學生數量 (${this.students.length}) 超過座位數量 (${this.seats.length})`,
                students: this.students.map(s => s.id),
                seats: this.seats.map(s => ({ row: s.row, col: s.col })),
                suggestion: '增加座位數量或減少學生數量'
            });
        }
    }

    /**
     * 檢查群組容量衝突
     */
    checkGroupCapacity() {
        const groupSeats = new Map();
        const groupStudents = new Map();

        // 統計每個群組的座位數
        for (const seat of this.seats) {
            if (seat.groupId) {
                groupSeats.set(seat.groupId, (groupSeats.get(seat.groupId) || 0) + 1);
            }
        }

        // 統計每個群組的學生數
        for (const student of this.students) {
            if (student.groupId) {
                groupStudents.set(student.groupId, (groupStudents.get(student.groupId) || 0) + 1);
            }
        }

        // 檢查群組容量衝突
        for (const [groupId, studentCount] of groupStudents) {
            const seatCount = groupSeats.get(groupId) || 0;
            if (studentCount > seatCount) {
                this.conflicts.push({
                    type: 'GROUP_CAPACITY',
                    severity: 'HIGH',
                    description: `群組 "${groupId}" 的學生數量 (${studentCount}) 超過可用座位 (${seatCount})`,
                    groupId,
                    studentCount,
                    seatCount,
                    suggestion: `為群組 "${groupId}" 增加 ${studentCount - seatCount} 個座位，或將部分學生分配到其他群組`
                });
            }
        }
    }

    /**
     * 檢查學生群組綁定
     */
    checkStudentGroupBindings() {
        const groupBindings = new Map();

        // 收集群組綁定信息
        for (const condition of this.conditions) {
            if (condition.type === 'assign_group') {
                for (const studentId of condition.students) {
                    if (!groupBindings.has(studentId)) {
                        groupBindings.set(studentId, []);
                    }
                    groupBindings.get(studentId).push(condition.group);
                }
            }
        }

        // 檢查多重綁定衝突
        for (const [studentId, groups] of groupBindings) {
            if (groups.length > 1) {
                this.conflicts.push({
                    type: 'MULTIPLE_GROUP_BINDING',
                    severity: 'MEDIUM',
                    description: `學生 "${studentId}" 被綁定到多個群組: ${groups.join(', ')}`,
                    studentId,
                    groups,
                    suggestion: '移除重複的群組綁定，確保每個學生只綁定到一個群組'
                });
            }
        }
    }

    /**
     * 檢查條件衝突
     */
    checkConditionConflicts() {
        for (const condition of this.conditions) {
            switch (condition.type) {
                case 'adjacent':
                    this.checkAdjacentConditions(condition);
                    break;
                case 'group_area':
                    this.checkGroupConditions(condition);
                    break;
                case 'assign_seat':
                    this.checkAssignSeatConditions(condition);
                    break;
                case 'not_adjacent':
                    this.checkNotAdjacentConditions(condition);
                    break;
                case 'assign_group':
                    this.checkAssignGroupConditions(condition);
                    break;
                case 'adjacent_and_group':
                    this.checkAdjacentAndGroupConditions(condition);
                    break;
            }
        }
    }

    /**
     * 檢查條件簡化
     */
    checkConditionSimplification() {
        // 使用 ConditionSimplifier 檢查條件問題
        const contradictions = this.conditionSimplifier.detectContradictoryConditions();
        const complexConditions = this.conditionSimplifier.findComplexConditions();

        // 將簡化問題轉換為衝突
        contradictions.forEach(contradiction => {
            this.conflicts.push({
                type: contradiction.type,
                severity: contradiction.severity,
                description: contradiction.description,
                condition1: contradiction.condition1,
                condition2: contradiction.condition2,
                suggestion: '解決條件矛盾以確保一致性'
            });
        });

        complexConditions.forEach(complex => {
            this.conflicts.push({
                type: 'COMPLEX_CONDITION',
                severity: 'LOW',
                description: `條件複雜度過高 (${complex.complexity})`,
                condition: complex.condition,
                complexity: complex.complexity,
                suggestion: '分解複雜條件以提高可讀性和性能'
            });
        });
    }

    /**
     * 檢查相鄰條件衝突
     */
    checkAdjacentConditions(condition) {
        const studentPairs = condition.students;

        for (const pair of studentPairs) {
            if (pair.length !== 2) {
                this.conflicts.push({
                    type: 'INVALID_ADJACENT_PAIR',
                    severity: 'MEDIUM',
                    description: `相鄰條件包含無效的學生對: ${JSON.stringify(pair)}`,
                    pair,
                    suggestion: '相鄰條件必須包含恰好兩個學生'
                });
                continue;
            }

            const [student1, student2] = pair;
            this.checkStudentExists(student1, '相鄰條件');
            this.checkStudentExists(student2, '相鄰條件');
        }
    }

    /**
     * 檢查群組條件衝突
     */
    checkGroupConditions(condition) {
        const studentId = condition.students[0];
        const groupName = condition.group;

        this.checkStudentExists(studentId, '群組條件');
        this.checkGroupExists(groupName, '群組條件');
    }

    /**
     * 檢查指定座位條件衝突
     */
    checkAssignSeatConditions(condition) {
        const studentId = condition.students[0];
        const seatRow = condition.seat.row;
        const seatCol = condition.seat.col;

        this.checkStudentExists(studentId, '指定座位條件');
        this.checkSeatExists(seatRow, seatCol, '指定座位條件');
    }

    /**
     * 檢查不相鄰條件衝突
     */
    checkNotAdjacentConditions(condition) {
        const studentPairs = condition.students;

        for (const pair of studentPairs) {
            if (pair.length !== 2) {
                this.conflicts.push({
                    type: 'INVALID_NOT_ADJACENT_PAIR',
                    severity: 'MEDIUM',
                    description: `不相鄰條件包含無效的學生對: ${JSON.stringify(pair)}`,
                    pair,
                    suggestion: '不相鄰條件必須包含恰好兩個學生'
                });
                continue;
            }

            const [student1, student2] = pair;
            this.checkStudentExists(student1, '不相鄰條件');
            this.checkStudentExists(student2, '不相鄰條件');
        }
    }

    /**
     * 檢查指定群組條件衝突
     */
    checkAssignGroupConditions(condition) {
        const studentIds = condition.students.flat();
        const groupName = condition.group;

        for (const studentId of studentIds) {
            this.checkStudentExists(studentId, '指定群組條件');
        }
        this.checkGroupExists(groupName, '指定群組條件');
    }

    /**
     * 檢查相鄰且同群組條件衝突
     */
    checkAdjacentAndGroupConditions(condition) {
        const studentPairs = condition.students;
        const groupName = condition.group;

        for (const pair of studentPairs) {
            if (pair.length !== 2) {
                this.conflicts.push({
                    type: 'INVALID_ADJACENT_AND_GROUP_PAIR',
                    severity: 'MEDIUM',
                    description: `相鄰且同群組條件包含無效的學生對: ${JSON.stringify(pair)}`,
                    pair,
                    suggestion: '相鄰且同群組條件必須包含恰好兩個學生'
                });
                continue;
            }

            const [student1, student2] = pair;
            this.checkStudentExists(student1, '相鄰且同群組條件');
            this.checkStudentExists(student2, '相鄰且同群組條件');
        }
        this.checkGroupExists(groupName, '相鄰且同群組條件');
    }

    /**
     * 檢查學生是否存在
     */
    checkStudentExists(studentId, context) {
        if (!this.students.find(s => s.id === studentId)) {
            this.conflicts.push({
                type: 'MISSING_STUDENT',
                severity: 'HIGH',
                description: `${context}中引用了不存在的學生: ${studentId}`,
                studentId,
                suggestion: '移除不存在的學生或添加該學生到學生列表'
            });
        }
    }

    /**
     * 檢查群組是否存在
     */
    checkGroupExists(groupName, context) {
        const groupExists = this.seats.some(seat => seat.groupId === groupName);
        if (!groupExists) {
            this.conflicts.push({
                type: 'MISSING_GROUP',
                severity: 'HIGH',
                description: `${context}中引用了不存在的群組: ${groupName}`,
                groupName,
                suggestion: `創建群組 "${groupName}" 或修改條件使用現有群組`
            });
        }
    }

    /**
     * 檢查座位是否存在
     */
    checkSeatExists(seatRow, seatCol, context) {
        const seatExists = this.seats.some(seat => seat.row === seatRow && seat.col === seatCol);
        if (!seatExists) {
            this.conflicts.push({
                type: 'MISSING_SEAT',
                severity: 'HIGH',
                description: `${context}中引用了不存在的座位: (${seatRow}, ${seatCol})`,
                seat: { row: seatRow, col: seatCol },
                suggestion: '創建指定的座位或修改條件使用現有座位'
            });
        }
    }

    /**
     * 獲取衝突報告
     */
    getConflictReport() {
        return this.conflictReporter.getConflictReport();
    }

    /**
     * 獲取簡化衝突報告
     */
    getSimplifiedConflictReport() {
        return this.conflictReporter.getSimplifiedConflictReport();
    }

    /**
     * 檢查條件是否滿足
     */
    checkCondition(student, seat, condition, assignment) {
        // 創建臨時分配來檢查條件
        const tempAssignment = new Map(assignment);
        tempAssignment.set(student.id, seat);

        // 使用緩存檢查
        const cacheKey = this.conditionCache.generateConditionCacheKey(condition, tempAssignment);
        const cachedResult = this.conditionCache.getCachedConditionResult(cacheKey);

        if (cachedResult !== null) {
            return cachedResult;
        }

        // 執行條件檢查
        const result = this.executeConditionCheck(condition, tempAssignment);

        // 緩存結果
        this.conditionCache.cacheConditionResult(cacheKey, result);

        return result;
    }

    /**
     * 執行條件檢查
     */
    executeConditionCheck(condition, assignedStudentsMap) {
        switch (condition.type) {
            case 'adjacent':
                return condition.students.every(pair =>
                    this.checkAdjacent(pair[0], pair[1], assignedStudentsMap)
                );
            case 'group_area':
                return this.checkGroupArea(condition.students[0], assignedStudentsMap);
            case 'not_adjacent':
                return condition.students.every(pair =>
                    this.checkNotAdjacent(pair[0], pair[1], assignedStudentsMap)
                );
            case 'assign_group':
                return condition.students.every(s =>
                    this.checkAssignGroup(s[0], condition.group, assignedStudentsMap)
                );
            case 'adjacent_and_group':
                return condition.students.every(pair =>
                    this.checkAdjacentAndGroup(pair[0], pair[1], condition.group, assignedStudentsMap)
                );
            default:
                return true;
        }
    }

    /**
     * 檢查相鄰條件
     */
    checkAdjacent(studentA, studentB, assignedStudentsMap) {
        const seatA = assignedStudentsMap.get(studentA);
        const seatB = assignedStudentsMap.get(studentB);

        if (!seatA || !seatB) {
            return true; // 如果有學生尚未分配，則此條件暫時不衝突
        }

        const rowDiff = Math.abs(seatA.row - seatB.row);
        const colDiff = Math.abs(seatA.col - seatB.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    /**
     * 檢查群組區域條件
     */
    checkGroupArea(studentsInGroup, assignedStudentsMap) {
        const assignedSeatsInGroup = studentsInGroup
            .map(studentId => assignedStudentsMap.get(studentId))
            .filter(seat => seat !== undefined);

        return assignedSeatsInGroup.length > 0;
    }

    /**
     * 檢查不相鄰條件
     */
    checkNotAdjacent(studentA, studentB, assignedStudentsMap) {
        const seatA = assignedStudentsMap.get(studentA);
        const seatB = assignedStudentsMap.get(studentB);

        if (!seatA || !seatB) {
            return true;
        }

        const rowDiff = Math.abs(seatA.row - seatB.row);
        const colDiff = Math.abs(seatA.col - seatB.col);
        return !(rowDiff <= 1 && colDiff <= 1);
    }

    /**
     * 檢查指定群組條件
     */
    checkAssignGroup(student, groupName, assignedStudentsMap) {
        const seat = assignedStudentsMap.get(student);
        if (!seat) {
            return true;
        }
        return seat.groupId === groupName;
    }

    /**
     * 檢查相鄰且同群組條件
     */
    checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap) {
        const seatA = assignedStudentsMap.get(studentA);
        const seatB = assignedStudentsMap.get(studentB);

        if (!seatA || !seatB) {
            return true;
        }

        const isAdjacent = (Math.abs(seatA.row - seatB.row) === 1 && seatA.col === seatB.col) ||
            (Math.abs(seatA.col - seatB.col) === 1 && seatA.row === seatB.row);
        const isInGroup = seatA.groupId === groupName && seatB.groupId === groupName;

        return isAdjacent && isInGroup;
    }

    /**
     * 清理資源
     */
    dispose() {
        this.conditionProcessor.dispose();
        this.conditionCache.dispose();
        this.conditionSimplifier.dispose();
        this.conflictReporter.dispose();

        this.students = [];
        this.seats = [];
        this.conditions = [];
        this.conflicts = [];
        this.resolutionSuggestions.clear();

        this.logger.info('衝突檢查器資源已清理');
    }
}

module.exports = { ConflictChecker };
