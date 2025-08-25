// StudentScorer.js - 學生評分器
class StudentScorer {
    constructor(options = {}) {
        this.options = {
            enableComplexityBonus: options.enableComplexityBonus !== false,
            enableSpecialSeatBonus: options.enableSpecialSeatBonus !== false,
            enableConditionWeighting: options.enableConditionWeighting !== false,
            ...options
        };

        // 條件權重配置
        this.CONDITION_WEIGHTS = {
            assign_group: 10.0,      // 群組分配權重最高
            adjacent: 8.0,           // 相鄰條件權重較高
            adjacent_and_group: 9.0, // 相鄰且同群組權重最高
            group_area: 7.0,         // 群組區域權重中等
            not_adjacent: 5.0,       // 不相鄰條件權重較低
            assign_seat: 6.0         // 指定座位權重中等
        };

        this.studentScores = new Map();
        this.conditionScores = new Map();
    }

    /**
     * 計算所有學生的分數 - 遷移自 algorithms.js 的學生分數計算邏輯
     */
    calculateScores(students, conditions, currentAssignment = new Map()) {
        this.studentScores.clear();
        this.conditionScores.clear();

        // 初始化所有學生分數為0
        students.forEach(s => this.studentScores.set(s, 0));

        // 條件類型權重 - 遷移自 algorithms.js
        const CONDITION_WEIGHTS = {
            'assign_group': 10,
            'assign_student_group_to_seat_group': 10,
            'group_area': 8,
            'adjacent_and_group': 6,
            'adjacent': 3,
            'not_adjacent': 2
        };

        // 計算每個學生的分數 - 遷移自 algorithms.js
        conditions.forEach((condition, index) => {
            let studentsInCondition = [];

            // 處理 assign_student_group_to_seat_group 條件
            if (condition.type === 'assign_student_group_to_seat_group') {
                const studentGroupName = condition.studentGroupName;
                studentsInCondition = condition.students || [];
            } else {
                // 處理其他條件類型
                studentsInCondition = condition.students.flat();
            }

            const weight = CONDITION_WEIGHTS[condition.type] || 1;

            studentsInCondition.forEach(studentId => {
                // 嘗試多種ID格式，確保類型一致性
                let actualStudentId = null;
                const possibleIds = [
                    studentId,
                    String(studentId),
                    Number(studentId),
                    parseInt(studentId),
                    studentId.toString()
                ];

                // 找到匹配的ID
                for (const id of possibleIds) {
                    if (this.studentScores.has(id)) {
                        actualStudentId = id;
                        break;
                    }
                }

                if (actualStudentId !== null) {
                    let score = this.studentScores.get(actualStudentId);
                    score += weight;

                    // 特殊座位需求額外分數
                    if ((condition.type === 'assign_group' || condition.type === 'assign_student_group_to_seat_group') &&
                        condition.group && this.isSpecialSeatGroup(condition.group)) {
                        score += 5; // 額外分數
                    }

                    // 條件複雜度分數（參與學生數量）
                    const studentCount = studentsInCondition.length;
                    const complexityBonus = Math.min(studentCount * 0.5, 3);
                    score += complexityBonus; // 最多加3分

                    this.studentScores.set(actualStudentId, score);
                }
            });
        });

        return this.studentScores;
    }

    /**
     * 計算單個學生的分數
     */
    calculateStudentScore(student, seats, conditions, currentAssignment) {
        let totalScore = 0;
        const studentConditions = this.getStudentConditions(student.id, conditions);

        // 基礎分數
        totalScore += this.calculateBaseScore(student);

        // 條件權重分數
        if (this.options.enableConditionWeighting) {
            totalScore += this.calculateConditionWeight(student, studentConditions, currentAssignment);
        }

        // 特殊座位加分
        if (this.options.enableSpecialSeatBonus) {
            totalScore += this.calculateSpecialSeatBonus(student, seats);
        }

        // 複雜度加分
        if (this.options.enableComplexityBonus) {
            totalScore += this.calculateComplexityBonus(student, studentConditions);
        }

        return {
            totalScore: Math.round(totalScore * 100) / 100,
            baseScore: this.calculateBaseScore(student),
            conditionScore: this.options.enableConditionWeighting ?
                this.calculateConditionWeight(student, studentConditions, currentAssignment) : 0,
            specialSeatBonus: this.options.enableSpecialSeatBonus ?
                this.calculateSpecialSeatBonus(student, seats) : 0,
            complexityBonus: this.options.enableComplexityBonus ?
                this.calculateComplexityBonus(student, studentConditions) : 0,
            conditionCount: studentConditions.length,
            details: this.generateScoreDetails(student, studentConditions)
        };
    }

    /**
     * 計算基礎分數
     */
    calculateBaseScore(student) {
        let baseScore = 100; // 基礎分數

        // 根據學生屬性調整基礎分數
        if (student.priority) {
            baseScore += student.priority * 10; // 優先級加分
        }

        if (student.groupId) {
            baseScore += 5; // 有群組的學生加分
        }

        return baseScore;
    }

    /**
     * 計算條件權重
     */
    calculateConditionWeight(student, studentConditions, currentAssignment) {
        let conditionScore = 0;

        for (const condition of studentConditions) {
            const weight = this.CONDITION_WEIGHTS[condition.type] || 1.0;
            const satisfaction = this.calculateConditionSatisfaction(condition, currentAssignment);

            conditionScore += weight * satisfaction;

            // 記錄條件分數
            this.conditionScores.set(`${student.id}-${condition.type}`, {
                weight,
                satisfaction,
                score: weight * satisfaction
            });
        }

        return conditionScore;
    }

    /**
     * 計算條件滿足度
     */
    calculateConditionSatisfaction(condition, currentAssignment) {
        switch (condition.type) {
            case 'assign_group':
                return this.processAssignGroupCondition(condition, currentAssignment);
            case 'adjacent':
                return this.processAdjacentCondition(condition, currentAssignment);
            case 'group_area':
                return this.processGroupAreaCondition(condition, currentAssignment);
            case 'not_adjacent':
                return this.processNotAdjacentCondition(condition, currentAssignment);
            case 'adjacent_and_group':
                return this.processAdjacentAndGroupCondition(condition, currentAssignment);
            case 'assign_seat':
                return this.processAssignSeatCondition(condition, currentAssignment);
            default:
                return 0;
        }
    }

    /**
     * 處理 assign_group 條件
     */
    processAssignGroupCondition(condition, currentAssignment) {
        const studentId = condition.students[0];
        const targetGroup = condition.group;
        const studentSeat = currentAssignment.get(studentId);

        if (!studentSeat) {
            return 0; // 學生尚未分配座位
        }

        return studentSeat.groupId === targetGroup ? 1.0 : 0.0;
    }

    /**
     * 處理 adjacent 條件
     */
    processAdjacentCondition(condition, currentAssignment) {
        let satisfiedPairs = 0;
        const totalPairs = condition.students.length;

        for (const pair of condition.students) {
            if (pair.length !== 2) continue;

            const [student1, student2] = pair;
            const seat1 = currentAssignment.get(student1);
            const seat2 = currentAssignment.get(student2);

            if (seat1 && seat2 && this.areSeatsAdjacent(seat1, seat2)) {
                satisfiedPairs++;
            }
        }

        return totalPairs > 0 ? satisfiedPairs / totalPairs : 0;
    }

    /**
     * 處理 group_area 條件
     */
    processGroupAreaCondition(condition, currentAssignment) {
        const studentId = condition.students[0];
        const targetGroup = condition.group;
        const studentSeat = currentAssignment.get(studentId);

        if (!studentSeat) {
            return 0; // 學生尚未分配座位
        }

        return studentSeat.groupId === targetGroup ? 1.0 : 0.0;
    }

    /**
     * 處理 not_adjacent 條件
     */
    processNotAdjacentCondition(condition, currentAssignment) {
        let satisfiedPairs = 0;
        const totalPairs = condition.students.length;

        for (const pair of condition.students) {
            if (pair.length !== 2) continue;

            const [student1, student2] = pair;
            const seat1 = currentAssignment.get(student1);
            const seat2 = currentAssignment.get(student2);

            if (seat1 && seat2 && !this.areSeatsAdjacent(seat1, seat2)) {
                satisfiedPairs++;
            }
        }

        return totalPairs > 0 ? satisfiedPairs / totalPairs : 0;
    }

    /**
     * 處理 adjacent_and_group 條件
     */
    processAdjacentAndGroupCondition(condition, currentAssignment) {
        let satisfiedPairs = 0;
        const totalPairs = condition.students.length;
        const targetGroup = condition.group;

        for (const pair of condition.students) {
            if (pair.length !== 2) continue;

            const [student1, student2] = pair;
            const seat1 = currentAssignment.get(student1);
            const seat2 = currentAssignment.get(student2);

            if (seat1 && seat2 &&
                this.areSeatsAdjacent(seat1, seat2) &&
                seat1.groupId === targetGroup &&
                seat2.groupId === targetGroup) {
                satisfiedPairs++;
            }
        }

        return totalPairs > 0 ? satisfiedPairs / totalPairs : 0;
    }

    /**
     * 處理 assign_seat 條件
     */
    processAssignSeatCondition(condition, currentAssignment) {
        const studentId = condition.students[0];
        const targetSeat = condition.seat;
        const studentSeat = currentAssignment.get(studentId);

        if (!studentSeat) {
            return 0; // 學生尚未分配座位
        }

        return (studentSeat.row === targetSeat.row && studentSeat.col === targetSeat.col) ? 1.0 : 0.0;
    }

    /**
     * 檢查兩個座位是否相鄰
     */
    areSeatsAdjacent(seat1, seat2) {
        const rowDiff = Math.abs(seat1.row - seat2.row);
        const colDiff = Math.abs(seat1.col - seat2.col);

        // 相鄰定義：上下左右相鄰（不包括對角線）
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    /**
     * 計算特殊座位加分
     */
    calculateSpecialSeatBonus(student, seats) {
        let bonus = 0;

        // 檢查學生是否有特殊座位偏好
        if (student.preferredSeats) {
            for (const preferredSeat of student.preferredSeats) {
                const matchingSeat = seats.find(seat =>
                    seat.row === preferredSeat.row && seat.col === preferredSeat.col
                );

                if (matchingSeat) {
                    bonus += 5; // 每個偏好座位加分
                }
            }
        }

        // 檢查學生是否有特殊需求
        if (student.specialNeeds) {
            bonus += student.specialNeeds.length * 3; // 每個特殊需求加分
        }

        return bonus;
    }

    /**
     * 計算複雜度加分
     */
    calculateComplexityBonus(student, studentConditions) {
        let complexityScore = 0;

        // 條件數量加分
        complexityScore += studentConditions.length * 2;

        // 複雜條件類型加分
        for (const condition of studentConditions) {
            switch (condition.type) {
                case 'adjacent_and_group':
                    complexityScore += 5; // 最複雜的條件
                    break;
                case 'adjacent':
                case 'assign_group':
                    complexityScore += 3; // 中等複雜度
                    break;
                case 'group_area':
                case 'assign_seat':
                    complexityScore += 2; // 較簡單的條件
                    break;
                case 'not_adjacent':
                    complexityScore += 1; // 最簡單的條件
                    break;
            }
        }

        return complexityScore;
    }

    /**
     * 處理學生群組綁定
     */
    processStudentGroupBindings(students, conditions) {
        const groupBindings = new Map();

        // 收集群組綁定信息
        for (const condition of conditions) {
            if (condition.type === 'assign_group') {
                for (const studentId of condition.students) {
                    if (!groupBindings.has(studentId)) {
                        groupBindings.set(studentId, []);
                    }
                    groupBindings.get(studentId).push(condition.group);
                }
            }
        }

        // 更新學生群組信息
        for (const student of students) {
            if (groupBindings.has(student.id)) {
                const groups = groupBindings.get(student.id);
                if (groups.length === 1) {
                    student.groupId = groups[0];
                }
            }
        }

        return students;
    }

    /**
     * 計算群組分數
     */
    calculateGroupScore(groupId, students, currentAssignment) {
        const groupStudents = students.filter(s => s.groupId === groupId);
        let groupScore = 0;

        for (const student of groupStudents) {
            const studentScore = this.studentScores.get(student.id);
            if (studentScore) {
                groupScore += studentScore.totalScore;
            }
        }

        return {
            groupId,
            studentCount: groupStudents.length,
            totalScore: groupScore,
            averageScore: groupStudents.length > 0 ? groupScore / groupStudents.length : 0
        };
    }

    /**
     * 獲取學生條件
     */
    getStudentConditions(studentId, conditions) {
        return conditions.filter(condition => {
            if (Array.isArray(condition.students)) {
                return condition.students.includes(studentId);
            }
            return condition.students === studentId;
        });
    }

    /**
     * 生成分數詳情
     */
    generateScoreDetails(student, studentConditions) {
        const details = {
            studentId: student.id,
            conditionCount: studentConditions.length,
            conditions: studentConditions.map(condition => ({
                type: condition.type,
                weight: this.CONDITION_WEIGHTS[condition.type] || 1.0,
                description: this.getConditionDescription(condition)
            }))
        };

        return details;
    }

    /**
     * 獲取條件描述
     */
    getConditionDescription(condition) {
        const descriptions = {
            assign_group: `分配到群組 "${condition.group}"`,
            adjacent: `與其他學生相鄰`,
            group_area: `在群組 "${condition.group}" 區域內`,
            not_adjacent: `不與其他學生相鄰`,
            adjacent_and_group: `相鄰且在群組 "${condition.group}" 內`,
            assign_seat: `分配到指定座位 (${condition.seat.row}, ${condition.seat.col})`
        };

        return descriptions[condition.type] || `未知條件類型: ${condition.type}`;
    }

    /**
     * 獲取學生分數
     */
    getStudentScore(studentId) {
        return this.studentScores.get(studentId);
    }

    /**
     * 獲取所有學生分數
     */
    getAllStudentScores() {
        return this.studentScores;
    }

    /**
     * 獲取條件分數
     */
    getConditionScore(studentId, conditionType) {
        return this.conditionScores.get(`${studentId}-${conditionType}`);
    }

    /**
     * 判斷是否為特殊座位群組 - 遷移自 algorithms.js
     */
    isSpecialSeatGroup(groupName, seatsConfig) {
        const seatsInGroup = seatsConfig.filter(seat => 
            seat.isValid && seat.groupId === groupName
        );
        const totalValidSeats = seatsConfig.filter(seat => seat.isValid).length;
        
        // 如果該群組的座位數量少於總座位數的30%，則認為是特殊座位群組
        return seatsInGroup.length < totalValidSeats * 0.3;
    }

    /**
     * 學生排序邏輯 - 遷移自 algorithms.js
     */
    sortStudentsByPriority(students, studentScores) {
        // 先隨機打亂，然後根據改進的分數進行穩定排序
        const shuffledStudents = this.shuffleArray([...students]);
        
        return shuffledStudents.sort((a, b) => {
            const scoreA = studentScores[a.id] || 0;
            const scoreB = studentScores[b.id] || 0;
            // 分數高的學生優先。如果分數相同，則保持他們在隨機打亂後的相對順序（穩定排序）。
            return scoreB - scoreA;
        });
    }

    /**
     * Fisher-Yates (Knuth) 洗牌演算法 - 遷移自 algorithms.js
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * 重置分數
     */
    resetScores() {
        this.studentScores.clear();
        this.conditionScores.clear();
    }
}

module.exports = { StudentScorer };
