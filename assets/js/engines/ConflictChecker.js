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
}

module.exports = { ConflictChecker };
