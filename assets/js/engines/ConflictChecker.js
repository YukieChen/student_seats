// ConflictChecker.js - 衝突檢查器
class ConflictChecker {
    constructor(options = {}) {
        this.options = {
            enableDetailedReporting: options.enableDetailedReporting !== false,
            enableAutoResolution: options.enableAutoResolution !== false,
            maxConflictsToReport: options.maxConflictsToReport || 50,
            ...options
        };

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

        // 優化條件檢查性能：預處理條件
        this.preprocessConditions();
        this.cacheConditions();
        this.indexConditions();
        this.optimizeConditions();

        return this;
    }

    /**
     * 執行完整的衝突檢查
     */
    checkAllConflicts() {
        this.conflicts = [];

        // 執行各種衝突檢查
        this.checkTotalCount();
        this.checkGroupCapacity();
        this.checkConditionConflicts();
        this.checkStudentGroupBindings();

        return {
            hasConflicts: this.conflicts.length > 0,
            conflicts: this.conflicts,
            summary: this.generateConflictSummary()
        };
    }

    // ==================== 初始衝突檢查 ====================

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
     * 檢查條件衝突 - 遷移自 algorithms.js 的條件檢查邏輯
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
                case 'assign_student_group_to_seat_group':
                    this.checkAssignStudentGroupToSeatGroupConditions(condition);
                    break;
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

    // ==================== 條件衝突檢查 ====================

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

            // 檢查學生是否存在
            if (!this.students.find(s => s.id === student1)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `相鄰條件中引用了不存在的學生: ${student1}`,
                    studentId: student1,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }

            if (!this.students.find(s => s.id === student2)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `相鄰條件中引用了不存在的學生: ${student2}`,
                    studentId: student2,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }
        }
    }

    /**
     * 檢查群組條件衝突
     */
    checkGroupConditions(condition) {
        const studentId = condition.students[0];
        const groupName = condition.group;

        // 檢查學生是否存在
        if (!this.students.find(s => s.id === studentId)) {
            this.conflicts.push({
                type: 'MISSING_STUDENT',
                severity: 'HIGH',
                description: `群組條件中引用了不存在的學生: ${studentId}`,
                studentId,
                suggestion: '移除不存在的學生或添加該學生到學生列表'
            });
        }

        // 檢查群組是否存在
        const groupExists = this.seats.some(seat => seat.groupId === groupName);
        if (!groupExists) {
            this.conflicts.push({
                type: 'MISSING_GROUP',
                severity: 'HIGH',
                description: `群組條件中引用了不存在的群組: ${groupName}`,
                groupName,
                suggestion: `創建群組 "${groupName}" 或修改條件使用現有群組`
            });
        }
    }

    /**
     * 檢查指定座位條件衝突
     */
    checkAssignSeatConditions(condition) {
        const studentId = condition.students[0];
        const seatRow = condition.seat.row;
        const seatCol = condition.seat.col;

        // 檢查學生是否存在
        if (!this.students.find(s => s.id === studentId)) {
            this.conflicts.push({
                type: 'MISSING_STUDENT',
                severity: 'HIGH',
                description: `指定座位條件中引用了不存在的學生: ${studentId}`,
                studentId,
                suggestion: '移除不存在的學生或添加該學生到學生列表'
            });
        }

        // 檢查座位是否存在
        const seatExists = this.seats.some(seat => seat.row === seatRow && seat.col === seatCol);
        if (!seatExists) {
            this.conflicts.push({
                type: 'MISSING_SEAT',
                severity: 'HIGH',
                description: `指定座位條件中引用了不存在的座位: (${seatRow}, ${seatCol})`,
                seat: { row: seatRow, col: seatCol },
                suggestion: '創建指定的座位或修改條件使用現有座位'
            });
        }
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

            // 檢查學生是否存在
            if (!this.students.find(s => s.id === student1)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `不相鄰條件中引用了不存在的學生: ${student1}`,
                    studentId: student1,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }

            if (!this.students.find(s => s.id === student2)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `不相鄰條件中引用了不存在的學生: ${student2}`,
                    studentId: student2,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }
        }
    }

    /**
     * 檢查指定群組條件衝突 - 遷移自 algorithms.js
     */
    checkAssignGroupConditions(condition) {
        const studentsInCondition = condition.students.flat();
        const groupName = condition.group;

        // 檢查每個學生是否存在
        for (const studentId of studentsInCondition) {
            if (!this.students.find(s => s.id === studentId)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `指定群組條件中引用了不存在的學生: ${studentId}`,
                    studentId,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }
        }

        // 檢查群組是否存在
        const groupExists = this.seats.some(seat => seat.groupId === groupName);
        if (!groupExists) {
            this.conflicts.push({
                type: 'MISSING_GROUP',
                severity: 'HIGH',
                description: `指定群組條件中引用了不存在的群組: ${groupName}`,
                groupName,
                suggestion: `創建群組 "${groupName}" 或修改條件使用現有群組`
            });
        }

        // 檢查群組容量
        const requiredSeats = studentsInCondition.length;
        const availableSeatsInGroup = this.seats.filter(seat =>
            seat.isValid && seat.groupId === groupName
        ).length;

        if (requiredSeats > availableSeatsInGroup) {
            this.conflicts.push({
                type: 'GROUP_CAPACITY',
                severity: 'HIGH',
                description: `群組 "${groupName}" 需要 ${requiredSeats} 個座位，但只有 ${availableSeatsInGroup} 個有效座位`,
                groupName,
                requiredSeats,
                availableSeats: availableSeatsInGroup,
                suggestion: `為群組 "${groupName}" 增加 ${requiredSeats - availableSeatsInGroup} 個座位，或將部分學生分配到其他群組`
            });
        }
    }

    /**
     * 檢查相鄰且同群組條件衝突 - 遷移自 algorithms.js
     */
    checkAdjacentAndGroupConditions(condition) {
        const studentsInCondition = condition.students.flat();
        const groupName = condition.group;

        // 檢查每個學生是否存在
        for (const studentId of studentsInCondition) {
            if (!this.students.find(s => s.id === studentId)) {
                this.conflicts.push({
                    type: 'MISSING_STUDENT',
                    severity: 'HIGH',
                    description: `相鄰且同群組條件中引用了不存在的學生: ${studentId}`,
                    studentId,
                    suggestion: '移除不存在的學生或添加該學生到學生列表'
                });
            }
        }

        // 檢查群組是否存在
        const groupExists = this.seats.some(seat => seat.groupId === groupName);
        if (!groupExists) {
            this.conflicts.push({
                type: 'MISSING_GROUP',
                severity: 'HIGH',
                description: `相鄰且同群組條件中引用了不存在的群組: ${groupName}`,
                groupName,
                suggestion: `創建群組 "${groupName}" 或修改條件使用現有群組`
            });
        }

        // 檢查群組容量
        const requiredSeats = studentsInCondition.length;
        const availableSeatsInGroup = this.seats.filter(seat =>
            seat.isValid && seat.groupId === groupName
        ).length;

        if (requiredSeats > availableSeatsInGroup) {
            this.conflicts.push({
                type: 'GROUP_CAPACITY',
                severity: 'HIGH',
                description: `相鄰且同群組 "${groupName}" 需要 ${requiredSeats} 個座位，但只有 ${availableSeatsInGroup} 個有效座位`,
                groupName,
                requiredSeats,
                availableSeats: availableSeatsInGroup,
                suggestion: `為群組 "${groupName}" 增加 ${requiredSeats - availableSeatsInGroup} 個座位，或將部分學生分配到其他群組`
            });
        }
    }

    /**
     * 檢查學生群組指定區域條件衝突 - 遷移自 algorithms.js
     */
    checkAssignStudentGroupToSeatGroupConditions(condition) {
        const seatGroupName = condition.group;
        const studentGroupName = condition.studentGroupName;

        // 檢查學生群組是否存在（這裡需要從外部傳入學生群組信息）
        // 暫時跳過學生群組檢查，因為 ConflictChecker 沒有學生群組信息

        // 檢查座位群組是否存在
        const groupExists = this.seats.some(seat => seat.groupId === seatGroupName);
        if (!groupExists) {
            this.conflicts.push({
                type: 'MISSING_GROUP',
                severity: 'HIGH',
                description: `學生群組指定區域條件中引用了不存在的座位群組: ${seatGroupName}`,
                groupName: seatGroupName,
                suggestion: `創建座位群組 "${seatGroupName}" 或修改條件使用現有群組`
            });
        }

        // 檢查座位群組容量（這裡需要從外部傳入學生群組信息）
        // 暫時跳過容量檢查，因為 ConflictChecker 沒有學生群組信息
    }

    // ==================== 衝突報告生成 ====================

    /**
     * 分類衝突
     */
    categorizeConflicts() {
        const categories = {
            CRITICAL: [],
            HIGH: [],
            MEDIUM: [],
            LOW: []
        };

        for (const conflict of this.conflicts) {
            categories[conflict.severity].push(conflict);
        }

        return categories;
    }

    /**
     * 生成衝突描述
     */
    generateConflictDescription(conflict) {
        const descriptions = {
            TOTAL_COUNT: `學生數量與座位數量不匹配`,
            GROUP_CAPACITY: `群組容量不足`,
            INVALID_ADJACENT_PAIR: `相鄰條件格式錯誤`,
            INVALID_NOT_ADJACENT_PAIR: `不相鄰條件格式錯誤`,
            MISSING_STUDENT: `引用了不存在的學生`,
            MISSING_GROUP: `引用了不存在的群組`,
            MISSING_SEAT: `引用了不存在的座位`,
            MULTIPLE_GROUP_BINDING: `學生被綁定到多個群組`
        };

        return descriptions[conflict.type] || `未知衝突類型: ${conflict.type}`;
    }

    /**
     * 生成解決建議
     */
    generateResolutionSuggestions(conflict) {
        if (conflict.suggestion) {
            return [conflict.suggestion];
        }

        const suggestions = {
            TOTAL_COUNT: [
                '增加座位數量',
                '減少學生數量',
                '調整座位佈局以容納更多學生'
            ],
            GROUP_CAPACITY: [
                '為該群組增加更多座位',
                '將部分學生重新分配到其他群組',
                '調整群組邊界以包含更多座位'
            ],
            MISSING_STUDENT: [
                '添加缺失的學生到學生列表',
                '移除引用該學生的條件',
                '檢查學生ID是否拼寫正確'
            ],
            MISSING_GROUP: [
                '創建缺失的群組',
                '修改條件使用現有群組',
                '檢查群組名稱是否拼寫正確'
            ],
            MISSING_SEAT: [
                '創建缺失的座位',
                '修改條件使用現有座位',
                '檢查座位座標是否正確'
            ]
        };

        return suggestions[conflict.type] || ['請檢查並修正衝突條件'];
    }

    /**
     * 生成衝突摘要
     */
    generateConflictSummary() {
        const categories = this.categorizeConflicts();
        const totalConflicts = this.conflicts.length;

        return {
            totalConflicts,
            criticalCount: categories.CRITICAL.length,
            highCount: categories.HIGH.length,
            mediumCount: categories.MEDIUM.length,
            lowCount: categories.LOW.length,
            hasCriticalConflicts: categories.CRITICAL.length > 0,
            hasHighConflicts: categories.HIGH.length > 0,
            canProceed: categories.CRITICAL.length === 0,
            recommendations: this.generateOverallRecommendations()
        };
    }

    /**
     * 生成整體建議
     */
    generateOverallRecommendations() {
        const categories = this.categorizeConflicts();
        const recommendations = [];

        if (categories.CRITICAL.length > 0) {
            recommendations.push('必須解決所有嚴重衝突才能繼續座位安排');
        }

        if (categories.HIGH.length > 0) {
            recommendations.push('建議解決高優先級衝突以確保最佳結果');
        }

        if (categories.MEDIUM.length > 0) {
            recommendations.push('考慮解決中等優先級衝突以改善安排質量');
        }

        if (this.conflicts.length === 0) {
            recommendations.push('沒有發現衝突，可以安全進行座位安排');
        }

        return recommendations;
    }

    /**
     * 獲取衝突報告
     */
    getConflictReport() {
        const categories = this.categorizeConflicts();
        const summary = this.generateConflictSummary();

        return {
            summary,
            categories,
            conflicts: this.conflicts.slice(0, this.options.maxConflictsToReport),
            totalConflicts: this.conflicts.length,
            timestamp: new Date().toISOString(),
            recommendations: summary.recommendations
        };
    }

    // ==================== 條件檢查方法 - 遷移自 algorithms.js ====================

    /**
     * 檢查條件是否滿足 - 遷移自 algorithms.js
     */
    checkCondition(condition, assignedStudentsMap) {
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
     * 檢查相鄰條件 - 遷移自 algorithms.js
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
     * 檢查群組區域條件 - 遷移自 algorithms.js
     */
    checkGroupArea(studentsInGroup, assignedStudentsMap) {
        const assignedSeatsInGroup = studentsInGroup
            .map(studentId => assignedStudentsMap.get(studentId))
            .filter(seat => seat !== undefined);

        if (assignedSeatsInGroup.length === 0) {
            return true; // 如果組內沒有學生被分配，則此條件暫時不衝突
        }

        // 簡化的連通性檢查
        return assignedSeatsInGroup.length > 0;
    }

    /**
     * 檢查不相鄰條件 - 遷移自 algorithms.js
     */
    checkNotAdjacent(studentA, studentB, assignedStudentsMap) {
        const seatA = assignedStudentsMap.get(studentA);
        const seatB = assignedStudentsMap.get(studentB);

        if (!seatA || !seatB) {
            return true; // 如果有學生尚未分配，則此條件暫時不衝突
        }

        const rowDiff = Math.abs(seatA.row - seatB.row);
        const colDiff = Math.abs(seatA.col - seatB.col);
        return !(rowDiff <= 1 && colDiff <= 1);
    }

    /**
     * 檢查指定群組條件 - 遷移自 algorithms.js
     */
    checkAssignGroup(student, groupName, assignedStudentsMap) {
        const seat = assignedStudentsMap.get(student);
        if (!seat) {
            return true; // 如果學生尚未分配，則此條件暫時不衝突
        }
        return seat.groupId === groupName;
    }

    /**
     * 檢查相鄰且同群組條件 - 遷移自 algorithms.js
     */
    checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap) {
        const seatA = assignedStudentsMap.get(studentA);
        const seatB = assignedStudentsMap.get(studentB);

        if (!seatA || !seatB) {
            return true; // 如果有學生尚未分配，則此條件暫時不衝突
        }

        const isAdjacent = (Math.abs(seatA.row - seatB.row) === 1 && seatA.col === seatB.col) ||
            (Math.abs(seatA.col - seatB.col) === 1 && seatA.row === seatB.row);
        const isInGroup = seatA.groupId === groupName && seatB.groupId === groupName;

        return isAdjacent && isInGroup;
    }

    // ==================== 條件檢查性能優化 ====================

    /**
     * 條件預處理 - 優化條件檢查性能
     */
    preprocessConditions() {
        this.processedConditions = new Map();
        this.conditionIndex = new Map();
        this.studentConditionMap = new Map();
        this.groupConditionMap = new Map();

        // 為每個條件建立索引
        for (let i = 0; i < this.conditions.length; i++) {
            const condition = this.conditions[i];
            this.processedConditions.set(i, this.preprocessSingleCondition(condition));
            this.indexCondition(i, condition);
        }
    }

    /**
     * 預處理單個條件
     */
    preprocessSingleCondition(condition) {
        const processed = {
            ...condition,
            studentIds: this.extractStudentIds(condition),
            groupIds: this.extractGroupIds(condition),
            seatIds: this.extractSeatIds(condition),
            complexity: this.calculateConditionComplexity(condition),
            dependencies: this.analyzeConditionDependencies(condition)
        };

        return processed;
    }

    /**
     * 提取條件中的學生ID
     */
    extractStudentIds(condition) {
        const studentIds = new Set();

        switch (condition.type) {
            case 'adjacent':
            case 'not_adjacent':
                condition.students.forEach(pair => {
                    pair.forEach(studentId => studentIds.add(studentId));
                });
                break;
            case 'group_area':
            case 'assign_seat':
                condition.students.forEach(studentId => studentIds.add(studentId));
                break;
            case 'assign_group':
            case 'adjacent_and_group':
                condition.students.flat().forEach(studentId => studentIds.add(studentId));
                break;
        }

        return Array.from(studentIds);
    }

    /**
     * 提取條件中的群組ID
     */
    extractGroupIds(condition) {
        const groupIds = new Set();

        if (condition.group) {
            groupIds.add(condition.group);
        }

        if (condition.studentGroupName) {
            groupIds.add(condition.studentGroupName);
        }

        return Array.from(groupIds);
    }

    /**
     * 提取條件中的座位ID
     */
    extractSeatIds(condition) {
        const seatIds = new Set();

        if (condition.seat) {
            seatIds.add(`${condition.seat.row}-${condition.seat.col}`);
        }

        return Array.from(seatIds);
    }

    /**
     * 計算條件複雜度
     */
    calculateConditionComplexity(condition) {
        let complexity = 1;

        switch (condition.type) {
            case 'adjacent':
            case 'not_adjacent':
                complexity = condition.students.length * 2;
                break;
            case 'group_area':
                complexity = condition.students.length;
                break;
            case 'assign_seat':
                complexity = 1;
                break;
            case 'assign_group':
                complexity = condition.students.flat().length;
                break;
            case 'adjacent_and_group':
                complexity = condition.students.flat().length * 2;
                break;
        }

        return complexity;
    }

    /**
     * 分析條件依賴關係
     */
    analyzeConditionDependencies(condition) {
        const dependencies = {
            students: this.extractStudentIds(condition),
            groups: this.extractGroupIds(condition),
            seats: this.extractSeatIds(condition),
            conflicts: []
        };

        return dependencies;
    }

    /**
     * 索引條件
     */
    indexCondition(conditionIndex, condition) {
        // 建立學生到條件的映射
        const studentIds = this.extractStudentIds(condition);
        studentIds.forEach(studentId => {
            if (!this.studentConditionMap.has(studentId)) {
                this.studentConditionMap.set(studentId, []);
            }
            this.studentConditionMap.get(studentId).push(conditionIndex);
        });

        // 建立群組到條件的映射
        const groupIds = this.extractGroupIds(condition);
        groupIds.forEach(groupId => {
            if (!this.groupConditionMap.has(groupId)) {
                this.groupConditionMap.set(groupId, []);
            }
            this.groupConditionMap.get(groupId).push(conditionIndex);
        });

        // 建立條件類型索引
        if (!this.conditionIndex.has(condition.type)) {
            this.conditionIndex.set(condition.type, []);
        }
        this.conditionIndex.get(condition.type).push(conditionIndex);
    }

    /**
     * 條件緩存 - 優化條件檢查性能
     */
    cacheConditions() {
        this.conditionCache = new Map();
        this.cacheHits = 0;
        this.cacheMisses = 0;

        // 預計算常用條件組合
        this.precomputeCommonConditions();
    }

    /**
     * 預計算常用條件組合
     */
    precomputeCommonConditions() {
        // 預計算學生對的相鄰檢查
        const studentPairs = this.extractAllStudentPairs();
        studentPairs.forEach(pair => {
            const cacheKey = `adjacent_${pair[0]}_${pair[1]}`;
            this.conditionCache.set(cacheKey, {
                type: 'adjacent_check',
                pair: pair,
                computed: false
            });
        });
    }

    /**
     * 提取所有學生對
     */
    extractAllStudentPairs() {
        const pairs = new Set();

        this.conditions.forEach(condition => {
            if (condition.type === 'adjacent' || condition.type === 'not_adjacent') {
                condition.students.forEach(pair => {
                    const sortedPair = pair.sort();
                    pairs.add(`${sortedPair[0]}-${sortedPair[1]}`);
                });
            }
        });

        return Array.from(pairs).map(pair => pair.split('-'));
    }

    /**
     * 條件索引 - 優化條件檢查性能
     */
    indexConditions() {
        this.conditionIndexes = {
            byType: new Map(),
            byStudent: new Map(),
            byGroup: new Map(),
            bySeat: new Map(),
            byComplexity: new Map()
        };

        this.conditions.forEach((condition, index) => {
            this.buildConditionIndexes(condition, index);
        });
    }

    /**
     * 建立條件索引
     */
    buildConditionIndexes(condition, index) {
        // 按類型索引
        if (!this.conditionIndexes.byType.has(condition.type)) {
            this.conditionIndexes.byType.set(condition.type, []);
        }
        this.conditionIndexes.byType.get(condition.type).push(index);

        // 按學生索引
        const studentIds = this.extractStudentIds(condition);
        studentIds.forEach(studentId => {
            if (!this.conditionIndexes.byStudent.has(studentId)) {
                this.conditionIndexes.byStudent.set(studentId, []);
            }
            this.conditionIndexes.byStudent.get(studentId).push(index);
        });

        // 按群組索引
        const groupIds = this.extractGroupIds(condition);
        groupIds.forEach(groupId => {
            if (!this.conditionIndexes.byGroup.has(groupId)) {
                this.conditionIndexes.byGroup.set(groupId, []);
            }
            this.conditionIndexes.byGroup.get(groupId).push(index);
        });

        // 按複雜度索引
        const complexity = this.calculateConditionComplexity(condition);
        if (!this.conditionIndexes.byComplexity.has(complexity)) {
            this.conditionIndexes.byComplexity.set(complexity, []);
        }
        this.conditionIndexes.byComplexity.get(complexity).push(index);
    }

    /**
     * 條件優化 - 優化條件檢查性能
     */
    optimizeConditions() {
        // 重新排序條件以提高檢查效率
        this.conditions = this.reorderConditionsByComplexity();

        // 合併相似條件
        this.mergeSimilarConditions();

        // 移除冗餘條件
        this.removeRedundantConditions();

        // 重新建立索引
        this.indexConditions();
    }

    /**
     * 按複雜度重新排序條件
     */
    reorderConditionsByComplexity() {
        return this.conditions.sort((a, b) => {
            const complexityA = this.calculateConditionComplexity(a);
            const complexityB = this.calculateConditionComplexity(b);

            // 簡單條件優先檢查
            return complexityA - complexityB;
        });
    }

    /**
     * 合併相似條件
     */
    mergeSimilarConditions() {
        const mergedConditions = [];
        const processed = new Set();

        for (let i = 0; i < this.conditions.length; i++) {
            if (processed.has(i)) continue;

            const currentCondition = this.conditions[i];
            const similarConditions = [currentCondition];
            processed.add(i);

            // 尋找相似條件
            for (let j = i + 1; j < this.conditions.length; j++) {
                if (processed.has(j)) continue;

                if (this.areConditionsSimilar(currentCondition, this.conditions[j])) {
                    similarConditions.push(this.conditions[j]);
                    processed.add(j);
                }
            }

            // 合併相似條件
            if (similarConditions.length > 1) {
                mergedConditions.push(this.mergeConditionGroup(similarConditions));
            } else {
                mergedConditions.push(currentCondition);
            }
        }

        this.conditions = mergedConditions;
    }

    /**
     * 檢查兩個條件是否相似
     */
    areConditionsSimilar(condition1, condition2) {
        if (condition1.type !== condition2.type) return false;

        switch (condition1.type) {
            case 'adjacent':
            case 'not_adjacent':
                return this.areAdjacentConditionsSimilar(condition1, condition2);
            case 'assign_group':
                return condition1.group === condition2.group;
            default:
                return false;
        }
    }

    /**
     * 檢查相鄰條件是否相似
     */
    areAdjacentConditionsSimilar(condition1, condition2) {
        const pairs1 = new Set(condition1.students.map(pair => pair.sort().join(',')));
        const pairs2 = new Set(condition2.students.map(pair => pair.sort().join(',')));

        // 檢查是否有重疊的學生對
        for (const pair of pairs1) {
            if (pairs2.has(pair)) return true;
        }

        return false;
    }

    /**
     * 合併條件組
     */
    mergeConditionGroup(conditions) {
        if (conditions.length === 0) return null;

        const firstCondition = conditions[0];

        switch (firstCondition.type) {
            case 'adjacent':
            case 'not_adjacent':
                return this.mergeAdjacentConditions(conditions);
            case 'assign_group':
                return this.mergeAssignGroupConditions(conditions);
            default:
                return firstCondition;
        }
    }

    /**
     * 合併相鄰條件
     */
    mergeAdjacentConditions(conditions) {
        const allPairs = new Set();

        conditions.forEach(condition => {
            condition.students.forEach(pair => {
                allPairs.add(JSON.stringify(pair.sort()));
            });
        });

        return {
            type: conditions[0].type,
            students: Array.from(allPairs).map(pair => JSON.parse(pair))
        };
    }

    /**
     * 合併指定群組條件
     */
    mergeAssignGroupConditions(conditions) {
        const allStudents = new Set();
        const group = conditions[0].group;

        conditions.forEach(condition => {
            condition.students.flat().forEach(student => {
                allStudents.add(student);
            });
        });

        return {
            type: 'assign_group',
            students: [Array.from(allStudents)],
            group: group
        };
    }

    /**
     * 移除冗餘條件
     */
    removeRedundantConditions() {
        this.conditions = this.conditions.filter((condition, index) => {
            return !this.isConditionRedundant(condition, index);
        });
    }

    /**
     * 檢查條件是否冗餘
     */
    isConditionRedundant(condition, currentIndex) {
        for (let i = 0; i < currentIndex; i++) {
            if (this.areConditionsEquivalent(condition, this.conditions[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * 檢查兩個條件是否等價
     */
    areConditionsEquivalent(condition1, condition2) {
        if (condition1.type !== condition2.type) return false;

        switch (condition1.type) {
            case 'adjacent':
            case 'not_adjacent':
                return this.areAdjacentConditionsEquivalent(condition1, condition2);
            case 'assign_group':
                return condition1.group === condition2.group &&
                    this.areStudentArraysEquivalent(condition1.students.flat(), condition2.students.flat());
            default:
                return false;
        }
    }

    /**
     * 檢查相鄰條件是否等價
     */
    areAdjacentConditionsEquivalent(condition1, condition2) {
        const pairs1 = new Set(condition1.students.map(pair => pair.sort().join(',')));
        const pairs2 = new Set(condition2.students.map(pair => pair.sort().join(',')));

        if (pairs1.size !== pairs2.size) return false;

        for (const pair of pairs1) {
            if (!pairs2.has(pair)) return false;
        }

        return true;
    }

    /**
     * 檢查學生數組是否等價
     */
    areStudentArraysEquivalent(array1, array2) {
        if (array1.length !== array2.length) return false;

        const set1 = new Set(array1);
        const set2 = new Set(array2);

        for (const student of set1) {
            if (!set2.has(student)) return false;
        }

        return true;
    }

    // ==================== 條件預處理 ====================

    /**
     * 條件簡化 - 實現條件預處理
     */
    simplifyConditions() {
        const simplified = [];
        
        for (const condition of this.conditions) {
            const simplifiedCondition = this.simplifySingleCondition(condition);
            if (simplifiedCondition) {
                simplified.push(simplifiedCondition);
            }
        }
        
        return simplified;
    }

    /**
     * 簡化單個條件
     */
    simplifySingleCondition(condition) {
        switch (condition.type) {
            case 'adjacent':
                return this.simplifyAdjacentCondition(condition);
            case 'assign_group':
                return this.simplifyAssignGroupCondition(condition);
            case 'group_area':
                return this.simplifyGroupAreaCondition(condition);
            default:
                return condition;
        }
    }

    /**
     * 簡化相鄰條件
     */
    simplifyAdjacentCondition(condition) {
        // 移除不存在的學生
        const validStudents = condition.students.filter(pair => 
            pair.every(studentId => 
                this.students.some(s => s.id === studentId)
            )
        );
        
        if (validStudents.length === 0) return null;
        
        return {
            ...condition,
            students: validStudents
        };
    }

    /**
     * 簡化分配群組條件
     */
    simplifyAssignGroupCondition(condition) {
        // 移除不存在的學生
        const validStudents = condition.students.filter(studentId => 
            this.students.some(s => s.id === studentId)
        );
        
        if (validStudents.length === 0) return null;
        
        return {
            ...condition,
            students: validStudents
        };
    }

    /**
     * 簡化群組區域條件
     */
    simplifyGroupAreaCondition(condition) {
        // 檢查群組是否存在
        const validGroups = condition.groups.filter(groupId => 
            this.seats.some(seat => seat.groupId === groupId)
        );
        
        if (validGroups.length === 0) return null;
        
        return {
            ...condition,
            groups: validGroups
        };
    }

    /**
     * 條件合併 - 實現條件預處理
     */
    mergeConditions() {
        const merged = [];
        const processed = new Set();
        
        for (let i = 0; i < this.conditions.length; i++) {
            if (processed.has(i)) continue;
            
            const mergeGroup = [this.conditions[i]];
            processed.add(i);
            
            for (let j = i + 1; j < this.conditions.length; j++) {
                if (processed.has(j)) continue;
                
                if (this.canMergeConditions(this.conditions[i], this.conditions[j])) {
                    mergeGroup.push(this.conditions[j]);
                    processed.add(j);
                }
            }
            
            if (mergeGroup.length > 1) {
                const mergedCondition = this.mergeConditionSet(mergeGroup);
                if (mergedCondition) {
                    merged.push(mergedCondition);
                }
            } else {
                merged.push(mergeGroup[0]);
            }
        }
        
        return merged;
    }

    /**
     * 檢查是否可以合併條件
     */
    canMergeConditions(condition1, condition2) {
        if (condition1.type !== condition2.type) return false;
        
        switch (condition1.type) {
            case 'adjacent':
                return this.canMergeAdjacentConditions(condition1, condition2);
            case 'assign_group':
                return this.canMergeAssignGroupConditions(condition1, condition2);
            case 'group_area':
                return this.canMergeGroupAreaConditions(condition1, condition2);
            default:
                return false;
        }
    }

    /**
     * 檢查是否可以合併相鄰條件
     */
    canMergeAdjacentConditions(condition1, condition2) {
        // 檢查是否有共同的學生
        const students1 = new Set(condition1.students.flat());
        const students2 = new Set(condition2.students.flat());
        
        for (const student of students1) {
            if (students2.has(student)) return true;
        }
        
        return false;
    }

    /**
     * 檢查是否可以合併分配群組條件
     */
    canMergeAssignGroupConditions(condition1, condition2) {
        return condition1.group === condition2.group;
    }

    /**
     * 檢查是否可以合併群組區域條件
     */
    canMergeGroupAreaConditions(condition1, condition2) {
        const groups1 = new Set(condition1.groups);
        const groups2 = new Set(condition2.groups);
        
        for (const group of groups1) {
            if (groups2.has(group)) return true;
        }
        
        return false;
    }

    /**
     * 合併條件集合
     */
    mergeConditionSet(conditions) {
        if (conditions.length === 0) return null;
        if (conditions.length === 1) return conditions[0];
        
        const type = conditions[0].type;
        
        switch (type) {
            case 'adjacent':
                return this.mergeAdjacentConditionSet(conditions);
            case 'assign_group':
                return this.mergeAssignGroupConditionSet(conditions);
            default:
                return conditions[0];
        }
    }

    /**
     * 合併相鄰條件集合
     */
    mergeAdjacentConditionSet(conditions) {
        const allStudents = [];
        
        for (const condition of conditions) {
            allStudents.push(...condition.students);
        }
        
        return {
            type: 'adjacent',
            students: allStudents
        };
    }

    /**
     * 合併分配群組條件集合
     */
    mergeAssignGroupConditionSet(conditions) {
        const allStudents = [];
        const group = conditions[0].group;
        
        for (const condition of conditions) {
            allStudents.push(...condition.students);
        }
        
        return {
            type: 'assign_group',
            students: allStudents,
            group: group
        };
    }

    /**
     * 條件分解 - 實現條件預處理
     */
    decomposeConditions() {
        const decomposed = [];
        
        for (const condition of this.conditions) {
            const decomposedConditions = this.decomposeSingleCondition(condition);
            decomposed.push(...decomposedConditions);
        }
        
        return decomposed;
    }

    /**
     * 分解單個條件
     */
    decomposeSingleCondition(condition) {
        switch (condition.type) {
            case 'adjacent_and_group':
                return this.decomposeAdjacentAndGroupCondition(condition);
            case 'adjacent':
                return this.decomposeAdjacentCondition(condition);
            case 'assign_group':
                return this.decomposeAssignGroupCondition(condition);
            default:
                return [condition];
        }
    }

    /**
     * 分解相鄰條件
     */
    decomposeAdjacentCondition(condition) {
        const decomposed = [];
        
        for (const pair of condition.students) {
            decomposed.push({
                type: 'adjacent',
                students: [pair]
            });
        }
        
        return decomposed;
    }

    /**
     * 分解分配群組條件
     */
    decomposeAssignGroupCondition(condition) {
        const decomposed = [];
        
        for (const studentId of condition.students) {
            decomposed.push({
                type: 'assign_group',
                students: [studentId],
                group: condition.group
            });
        }
        
        return decomposed;
    }

    /**
     * 分解相鄰和群組條件
     */
    decomposeAdjacentAndGroupCondition(condition) {
        const decomposed = [];
        
        // 分解為相鄰條件
        decomposed.push({
            type: 'adjacent',
            students: condition.students
        });
        
        // 分解為分配群組條件
        for (const pair of condition.students) {
            for (const studentId of pair) {
                decomposed.push({
                    type: 'assign_group',
                    students: [studentId],
                    group: condition.group
                });
            }
        }
        
        return decomposed;
    }

    /**
     * 條件驗證 - 實現條件預處理
     */
    validateConditions() {
        const valid = [];
        const invalid = [];
        const warnings = [];
        
        for (const condition of this.conditions) {
            const result = this.validateSingleCondition(condition);
            
            if (result.isValid) {
                valid.push(condition);
                if (result.warnings.length > 0) {
                    warnings.push(...result.warnings);
                }
            } else {
                invalid.push({
                    condition: condition,
                    errors: result.errors
                });
            }
        }
        
        return {
            valid: valid,
            invalid: invalid,
            warnings: warnings
        };
    }

    /**
     * 驗證單個條件
     */
    validateSingleCondition(condition) {
        const result = {
            isValid: true,
            errors: [],
            warnings: []
        };
        
        switch (condition.type) {
            case 'adjacent':
                this.validateAdjacentCondition(condition, result);
                break;
            case 'assign_group':
                this.validateAssignGroupCondition(condition, result);
                break;
            case 'group_area':
                this.validateGroupAreaCondition(condition, result);
                break;
            case 'assign_seat':
                this.validateAssignSeatCondition(condition, result);
                break;
            case 'adjacent_and_group':
                this.validateAdjacentAndGroupCondition(condition, result);
                break;
            default:
                result.isValid = false;
                result.errors.push(`未知的條件類型: ${condition.type}`);
        }
        
        return result;
    }

    /**
     * 驗證相鄰條件
     */
    validateAdjacentCondition(condition, result) {
        if (!condition.students || !Array.isArray(condition.students)) {
            result.isValid = false;
            result.errors.push('相鄰條件缺少學生數組');
            return;
        }
        
        for (const pair of condition.students) {
            if (!Array.isArray(pair) || pair.length !== 2) {
                result.isValid = false;
                result.errors.push('相鄰條件中的學生對必須包含兩個學生');
                return;
            }
            
            for (const studentId of pair) {
                if (!this.students.some(s => s.id === studentId)) {
                    result.warnings.push(`學生 ${studentId} 不存在`);
                }
            }
        }
    }

    /**
     * 驗證分配群組條件
     */
    validateAssignGroupCondition(condition, result) {
        if (!condition.students || !Array.isArray(condition.students)) {
            result.isValid = false;
            result.errors.push('分配群組條件缺少學生數組');
            return;
        }
        
        if (!condition.group) {
            result.isValid = false;
            result.errors.push('分配群組條件缺少群組ID');
            return;
        }
        
        for (const studentId of condition.students) {
            if (!this.students.some(s => s.id === studentId)) {
                result.warnings.push(`學生 ${studentId} 不存在`);
            }
        }
        
        if (!this.seats.some(s => s.groupId === condition.group)) {
            result.warnings.push(`群組 ${condition.group} 不存在`);
        }
    }

    /**
     * 驗證群組區域條件
     */
    validateGroupAreaCondition(condition, result) {
        if (!condition.groups || !Array.isArray(condition.groups)) {
            result.isValid = false;
            result.errors.push('群組區域條件缺少群組數組');
            return;
        }
        
        for (const groupId of condition.groups) {
            if (!this.seats.some(s => s.groupId === groupId)) {
                result.warnings.push(`群組 ${groupId} 不存在`);
            }
        }
    }

    /**
     * 驗證分配座位條件
     */
    validateAssignSeatCondition(condition, result) {
        if (!condition.student) {
            result.isValid = false;
            result.errors.push('分配座位條件缺少學生ID');
            return;
        }
        
        if (!condition.seat) {
            result.isValid = false;
            result.errors.push('分配座位條件缺少座位信息');
            return;
        }
        
        if (!this.students.some(s => s.id === condition.student)) {
            result.warnings.push(`學生 ${condition.student} 不存在`);
        }
    }

    /**
     * 驗證相鄰和群組條件
     */
    validateAdjacentAndGroupCondition(condition, result) {
        this.validateAdjacentCondition(condition, result);
        
        if (result.isValid && condition.group) {
            if (!this.seats.some(s => s.groupId === condition.group)) {
                result.warnings.push(`群組 ${condition.group} 不存在`);
            }
        }
    }

    // ==================== 條件緩存 ====================

    /**
     * 條件結果緩存 - 添加條件緩存
     */
    cacheConditionResults() {
        this.conditionResultCache = new Map();
        this.cacheStats = {
            hits: 0,
            misses: 0,
            size: 0,
            maxSize: 1000
        };
    }

    /**
     * 緩存條件檢查結果
     */
    cacheConditionResult(condition, assignedStudentsMap, result) {
        const cacheKey = this.generateConditionCacheKey(condition, assignedStudentsMap);

        if (this.conditionResultCache.size >= this.cacheStats.maxSize) {
            this.evictOldestCacheEntry();
        }

        this.conditionResultCache.set(cacheKey, {
            result: result,
            timestamp: Date.now(),
            accessCount: 1
        });

        this.cacheStats.size = this.conditionResultCache.size;
    }

    /**
     * 從緩存獲取條件檢查結果
     */
    getCachedConditionResult(condition, assignedStudentsMap) {
        const cacheKey = this.generateConditionCacheKey(condition, assignedStudentsMap);
        const cached = this.conditionResultCache.get(cacheKey);

        if (cached) {
            cached.accessCount++;
            cached.lastAccess = Date.now();
            this.cacheStats.hits++;
            return cached.result;
        }

        this.cacheStats.misses++;
        return null;
    }

    /**
     * 生成條件緩存鍵
     */
    generateConditionCacheKey(condition, assignedStudentsMap) {
        const conditionStr = JSON.stringify(condition);
        const assignmentStr = JSON.stringify(Array.from(assignedStudentsMap.entries()));
        return `${conditionStr}_${assignmentStr}`;
    }

    /**
     * 驅逐最舊的緩存條目
     */
    evictOldestCacheEntry() {
        let oldestKey = null;
        let oldestTime = Date.now();

        for (const [key, value] of this.conditionResultCache) {
            if (value.timestamp < oldestTime) {
                oldestTime = value.timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.conditionResultCache.delete(oldestKey);
        }
    }

    /**
     * 緩存失效處理 - 添加條件緩存
     */
    invalidateCache() {
        this.conditionResultCache.clear();
        this.cacheStats.size = 0;
        this.cacheStats.hits = 0;
        this.cacheStats.misses = 0;
    }

    /**
     * 部分緩存失效
     */
    invalidatePartialCache(invalidationPattern) {
        const keysToRemove = [];

        for (const [key, value] of this.conditionResultCache) {
            if (this.matchesInvalidationPattern(key, invalidationPattern)) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            this.conditionResultCache.delete(key);
        });

        this.cacheStats.size = this.conditionResultCache.size;
    }

    /**
     * 檢查緩存鍵是否匹配失效模式
     */
    matchesInvalidationPattern(cacheKey, pattern) {
        try {
            const keyData = JSON.parse(cacheKey.split('_')[0]);
            return this.conditionMatchesPattern(keyData, pattern);
        } catch (e) {
            return false;
        }
    }

    /**
     * 檢查條件是否匹配模式
     */
    conditionMatchesPattern(condition, pattern) {
        if (pattern.type && condition.type !== pattern.type) {
            return false;
        }

        if (pattern.students) {
            const conditionStudents = this.extractStudentIds(condition);
            const patternStudents = pattern.students;

            for (const student of patternStudents) {
                if (!conditionStudents.includes(student)) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 緩存更新 - 添加條件緩存
     */
    updateCache() {
        // 更新緩存統計
        this.updateCacheStatistics();

        // 清理過期的緩存條目
        this.cleanupExpiredCacheEntries();

        // 優化緩存大小
        this.optimizeCacheSize();
    }

    /**
     * 更新緩存統計
     */
    updateCacheStatistics() {
        let totalAccessCount = 0;
        let totalAge = 0;

        for (const [key, value] of this.conditionResultCache) {
            totalAccessCount += value.accessCount;
            totalAge += (Date.now() - value.timestamp);
        }

        this.cacheStats.averageAccessCount = totalAccessCount / this.conditionResultCache.size;
        this.cacheStats.averageAge = totalAge / this.conditionResultCache.size;
    }

    /**
     * 清理過期的緩存條目
     */
    cleanupExpiredCacheEntries() {
        const maxAge = 5 * 60 * 1000; // 5分鐘
        const currentTime = Date.now();
        const keysToRemove = [];

        for (const [key, value] of this.conditionResultCache) {
            if (currentTime - value.timestamp > maxAge) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => {
            this.conditionResultCache.delete(key);
        });

        this.cacheStats.size = this.conditionResultCache.size;
    }

    /**
     * 優化緩存大小
     */
    optimizeCacheSize() {
        if (this.conditionResultCache.size <= this.cacheStats.maxSize) {
            return;
        }

        // 按訪問次數和年齡排序
        const entries = Array.from(this.conditionResultCache.entries()).map(([key, value]) => ({
            key,
            value,
            score: value.accessCount / (Date.now() - value.timestamp + 1)
        }));

        entries.sort((a, b) => a.score - b.score);

        // 移除分數最低的條目
        const toRemove = entries.slice(0, this.conditionResultCache.size - this.cacheStats.maxSize);
        toRemove.forEach(entry => {
            this.conditionResultCache.delete(entry.key);
        });

        this.cacheStats.size = this.conditionResultCache.size;
    }

    /**
     * 緩存統計 - 添加條件緩存
     */
    cacheStatistics() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
            ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
            : 0;

        return {
            size: this.cacheStats.size,
            maxSize: this.cacheStats.maxSize,
            hits: this.cacheStats.hits,
            misses: this.cacheStats.misses,
            hitRate: hitRate,
            averageAccessCount: this.cacheStats.averageAccessCount || 0,
            averageAge: this.cacheStats.averageAge || 0,
            efficiency: this.calculateCacheEfficiency()
        };
    }

    /**
     * 計算緩存效率
     */
    calculateCacheEfficiency() {
        const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
            ? this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses)
            : 0;

        const sizeEfficiency = this.cacheStats.size / this.cacheStats.maxSize;

        return {
            hitRate: hitRate,
            sizeEfficiency: sizeEfficiency,
            overallEfficiency: hitRate * (1 - sizeEfficiency)
        };
    }

    /**
     * 獲取緩存性能報告
     */
    getCachePerformanceReport() {
        const stats = this.cacheStatistics();

        return {
            summary: {
                totalRequests: stats.hits + stats.misses,
                hitRate: `${(stats.hitRate * 100).toFixed(2)}%`,
                cacheSize: `${stats.size}/${stats.maxSize}`,
                efficiency: `${(stats.efficiency.overallEfficiency * 100).toFixed(2)}%`
            },
            details: stats,
            recommendations: this.generateCacheRecommendations(stats)
        };
    }

    /**
     * 生成緩存優化建議
     */
    generateCacheRecommendations(stats) {
        const recommendations = [];

        if (stats.hitRate < 0.5) {
            recommendations.push('緩存命中率較低，考慮調整緩存策略或增加緩存大小');
        }

        if (stats.size >= stats.maxSize * 0.9) {
            recommendations.push('緩存接近滿載，考慮增加最大緩存大小或優化緩存清理策略');
        }

        if (stats.efficiency.overallEfficiency < 0.3) {
            recommendations.push('緩存效率較低，考慮重新設計緩存鍵生成策略');
        }

        if (recommendations.length === 0) {
            recommendations.push('緩存運行良好，無需調整');
        }

        return recommendations;
    }

    // ==================== 條件簡化 ====================

    /**
     * 冗餘條件移除 - 實現條件簡化
     */
    removeRedundantConditions() {
        const nonRedundantConditions = [];
        const processedConditions = new Set();
        
        for (let i = 0; i < this.conditions.length; i++) {
            const currentCondition = this.conditions[i];
            const conditionKey = this.generateConditionKey(currentCondition);
            
            if (processedConditions.has(conditionKey)) {
                continue; // 跳過已處理的條件
            }
            
            // 檢查是否為冗餘條件
            if (!this.isConditionRedundant(currentCondition, i)) {
                nonRedundantConditions.push(currentCondition);
                processedConditions.add(conditionKey);
            }
        }
        
        this.conditions = nonRedundantConditions;
        return this.conditions;
    }

    /**
     * 生成條件鍵
     */
    generateConditionKey(condition) {
        return JSON.stringify({
            type: condition.type,
            students: condition.students ? condition.students.sort() : [],
            group: condition.group,
            seat: condition.seat
        });
    }

    /**
     * 檢查條件是否冗餘
     */
    isConditionRedundant(condition, currentIndex) {
        // 檢查與之前條件的關係
        for (let i = 0; i < currentIndex; i++) {
            const previousCondition = this.conditions[i];
            
            if (this.areConditionsRedundant(condition, previousCondition)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 檢查兩個條件是否冗餘
     */
    areConditionsRedundant(condition1, condition2) {
        if (condition1.type !== condition2.type) {
            return false;
        }
        
        switch (condition1.type) {
            case 'adjacent':
            case 'not_adjacent':
                return this.areAdjacentConditionsRedundant(condition1, condition2);
            case 'assign_group':
                return this.areAssignGroupConditionsRedundant(condition1, condition2);
            case 'group_area':
                return this.areGroupAreaConditionsRedundant(condition1, condition2);
            default:
                return false;
        }
    }

    /**
     * 檢查相鄰條件是否冗餘
     */
    areAdjacentConditionsRedundant(condition1, condition2) {
        const pairs1 = new Set(condition1.students.map(pair => pair.sort().join(',')));
        const pairs2 = new Set(condition2.students.map(pair => pair.sort().join(',')));
        
        // 檢查是否有重疊的學生對
        for (const pair of pairs1) {
            if (pairs2.has(pair)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 檢查指定群組條件是否冗餘
     */
    areAssignGroupConditionsRedundant(condition1, condition2) {
        if (condition1.group !== condition2.group) {
            return false;
        }
        
        const students1 = new Set(condition1.students.flat());
        const students2 = new Set(condition2.students.flat());
        
        // 檢查是否有重疊的學生
        for (const student of students1) {
            if (students2.has(student)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 檢查群組區域條件是否冗餘
     */
    areGroupAreaConditionsRedundant(condition1, condition2) {
        const students1 = new Set(condition1.students);
        const students2 = new Set(condition2.students);
        
        // 檢查是否有重疊的學生
        for (const student of students1) {
            if (students2.has(student)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 矛盾條件檢測 - 實現條件簡化
     */
    detectContradictoryConditions() {
        const contradictions = [];
        
        for (let i = 0; i < this.conditions.length; i++) {
            for (let j = i + 1; j < this.conditions.length; j++) {
                const contradiction = this.checkConditionContradiction(
                    this.conditions[i], 
                    this.conditions[j]
                );
                
                if (contradiction) {
                    contradictions.push({
                        condition1: this.conditions[i],
                        condition2: this.conditions[j],
                        type: contradiction.type,
                        description: contradiction.description,
                        severity: contradiction.severity
                    });
                }
            }
        }
        
        return contradictions;
    }

    /**
     * 檢查兩個條件是否矛盾
     */
    checkConditionContradiction(condition1, condition2) {
        // 檢查相鄰 vs 不相鄰矛盾
        if ((condition1.type === 'adjacent' && condition2.type === 'not_adjacent') ||
            (condition1.type === 'not_adjacent' && condition2.type === 'adjacent')) {
            return this.checkAdjacentContradiction(condition1, condition2);
        }
        
        // 檢查群組分配矛盾
        if (condition1.type === 'assign_group' && condition2.type === 'assign_group') {
            return this.checkGroupAssignmentContradiction(condition1, condition2);
        }
        
        return null;
    }

    /**
     * 檢查相鄰條件矛盾
     */
    checkAdjacentContradiction(adjacentCondition, notAdjacentCondition) {
        const adjacentPairs = new Set(adjacentCondition.students.map(pair => pair.sort().join(',')));
        const notAdjacentPairs = new Set(notAdjacentCondition.students.map(pair => pair.sort().join(',')));
        
        for (const pair of adjacentPairs) {
            if (notAdjacentPairs.has(pair)) {
                return {
                    type: 'ADJACENT_CONTRADICTION',
                    description: `學生對 ${pair} 同時被要求相鄰和不相鄰`,
                    severity: 'CRITICAL'
                };
            }
        }
        
        return null;
    }

    /**
     * 檢查群組分配矛盾
     */
    checkGroupAssignmentContradiction(condition1, condition2) {
        const students1 = new Set(condition1.students.flat());
        const students2 = new Set(condition2.students.flat());
        const commonStudents = [];
        
        for (const student of students1) {
            if (students2.has(student)) {
                commonStudents.push(student);
            }
        }
        
        if (commonStudents.length > 0 && condition1.group !== condition2.group) {
            return {
                type: 'GROUP_ASSIGNMENT_CONTRADICTION',
                description: `學生 ${commonStudents.join(', ')} 被分配到不同的群組: ${condition1.group} 和 ${condition2.group}`,
                severity: 'HIGH'
            };
        }
        
        return null;
    }

    /**
     * 條件等價性檢查 - 實現條件簡化
     */
    checkConditionEquivalence() {
        const equivalenceGroups = [];
        const processed = new Set();
        
        for (let i = 0; i < this.conditions.length; i++) {
            if (processed.has(i)) continue;
            
            const currentCondition = this.conditions[i];
            const equivalentConditions = [currentCondition];
            processed.add(i);
            
            // 尋找等價條件
            for (let j = i + 1; j < this.conditions.length; j++) {
                if (processed.has(j)) continue;
                
                if (this.areConditionsEquivalent(currentCondition, this.conditions[j])) {
                    equivalentConditions.push(this.conditions[j]);
                    processed.add(j);
                }
            }
            
            if (equivalentConditions.length > 1) {
                equivalenceGroups.push({
                    representative: equivalentConditions[0],
                    equivalents: equivalentConditions.slice(1),
                    count: equivalentConditions.length
                });
            }
        }
        
        return equivalenceGroups;
    }

    /**
     * 檢查兩個條件是否等價
     */
    areConditionsEquivalent(condition1, condition2) {
        if (condition1.type !== condition2.type) {
            return false;
        }
        
        switch (condition1.type) {
            case 'adjacent':
            case 'not_adjacent':
                return this.areAdjacentConditionsEquivalent(condition1, condition2);
            case 'assign_group':
                return this.areAssignGroupConditionsEquivalent(condition1, condition2);
            case 'group_area':
                return this.areGroupAreaConditionsEquivalent(condition1, condition2);
            default:
                return false;
        }
    }

    /**
     * 檢查相鄰條件是否等價
     */
    areAdjacentConditionsEquivalent(condition1, condition2) {
        const pairs1 = new Set(condition1.students.map(pair => pair.sort().join(',')));
        const pairs2 = new Set(condition2.students.map(pair => pair.sort().join(',')));
        
        if (pairs1.size !== pairs2.size) {
            return false;
        }
        
        for (const pair of pairs1) {
            if (!pairs2.has(pair)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 檢查指定群組條件是否等價
     */
    areAssignGroupConditionsEquivalent(condition1, condition2) {
        if (condition1.group !== condition2.group) {
            return false;
        }
        
        const students1 = new Set(condition1.students.flat());
        const students2 = new Set(condition2.students.flat());
        
        if (students1.size !== students2.size) {
            return false;
        }
        
        for (const student of students1) {
            if (!students2.has(student)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 檢查群組區域條件是否等價
     */
    areGroupAreaConditionsEquivalent(condition1, condition2) {
        const students1 = new Set(condition1.students);
        const students2 = new Set(condition2.students);
        
        if (students1.size !== students2.size) {
            return false;
        }
        
        for (const student of students1) {
            if (!students2.has(student)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 條件優化建議 - 實現條件簡化
     */
    suggestConditionOptimization() {
        const suggestions = [];
        
        // 檢查冗餘條件
        const redundantConditions = this.findRedundantConditions();
        if (redundantConditions.length > 0) {
            suggestions.push({
                type: 'REMOVE_REDUNDANT',
                description: `發現 ${redundantConditions.length} 個冗餘條件`,
                conditions: redundantConditions,
                action: '移除冗餘條件以提高性能'
            });
        }
        
        // 檢查矛盾條件
        const contradictions = this.detectContradictoryConditions();
        if (contradictions.length > 0) {
            suggestions.push({
                type: 'RESOLVE_CONTRADICTIONS',
                description: `發現 ${contradictions.length} 個矛盾條件`,
                contradictions: contradictions,
                action: '解決矛盾條件以確保一致性'
            });
        }
        
        // 檢查等價條件
        const equivalenceGroups = this.checkConditionEquivalence();
        if (equivalenceGroups.length > 0) {
            suggestions.push({
                type: 'MERGE_EQUIVALENT',
                description: `發現 ${equivalenceGroups.length} 組等價條件`,
                groups: equivalenceGroups,
                action: '合併等價條件以簡化邏輯'
            });
        }
        
        // 檢查複雜條件
        const complexConditions = this.findComplexConditions();
        if (complexConditions.length > 0) {
            suggestions.push({
                type: 'SIMPLIFY_COMPLEX',
                description: `發現 ${complexConditions.length} 個複雜條件`,
                conditions: complexConditions,
                action: '分解複雜條件以提高可讀性'
            });
        }
        
        return suggestions;
    }

    /**
     * 尋找冗餘條件
     */
    findRedundantConditions() {
        const redundant = [];
        
        for (let i = 0; i < this.conditions.length; i++) {
            if (this.isConditionRedundant(this.conditions[i], i)) {
                redundant.push({
                    index: i,
                    condition: this.conditions[i],
                    reason: '與之前的條件重複'
                });
            }
        }
        
        return redundant;
    }

    /**
     * 尋找複雜條件
     */
    findComplexConditions() {
        const complex = [];
        
        for (let i = 0; i < this.conditions.length; i++) {
            const condition = this.conditions[i];
            const complexity = this.calculateConditionComplexity(condition);
            
            if (complexity > 10) { // 複雜度閾值
                complex.push({
                    index: i,
                    condition: condition,
                    complexity: complexity,
                    reason: '條件複雜度過高'
                });
            }
        }
        
        return complex;
    }

    /**
     * 生成條件優化報告
     */
    generateConditionOptimizationReport() {
        const suggestions = this.suggestConditionOptimization();
        const summary = {
            totalConditions: this.conditions.length,
            redundantCount: suggestions.filter(s => s.type === 'REMOVE_REDUNDANT').length,
            contradictionCount: suggestions.filter(s => s.type === 'RESOLVE_CONTRADICTIONS').length,
            equivalentCount: suggestions.filter(s => s.type === 'MERGE_EQUIVALENT').length,
            complexCount: suggestions.filter(s => s.type === 'SIMPLIFY_COMPLEX').length
        };
        
        return {
            summary: summary,
            suggestions: suggestions,
            recommendations: this.generateOptimizationRecommendations(summary)
        };
    }

    /**
     * 生成優化建議
     */
    generateOptimizationRecommendations(summary) {
        const recommendations = [];
        
        if (summary.redundantCount > 0) {
            recommendations.push(`建議移除 ${summary.redundantCount} 個冗餘條件以提高性能`);
        }
        
        if (summary.contradictionCount > 0) {
            recommendations.push(`建議解決 ${summary.contradictionCount} 個矛盾條件以確保一致性`);
        }
        
        if (summary.equivalentCount > 0) {
            recommendations.push(`建議合併 ${summary.equivalentCount} 組等價條件以簡化邏輯`);
        }
        
        if (summary.complexCount > 0) {
            recommendations.push(`建議分解 ${summary.complexCount} 個複雜條件以提高可讀性`);
        }
        
        if (recommendations.length === 0) {
            recommendations.push('條件設置良好，無需優化');
        }
        
        return recommendations;
    }
}

module.exports = { ConflictChecker };
