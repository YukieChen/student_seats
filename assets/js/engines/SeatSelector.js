// SeatSelector.js - 座位選擇器
class SeatSelector {
    constructor(options = {}) {
        this.options = {
            enableRandomness: options.enableRandomness !== false,
            randomnessFactor: options.randomnessFactor || 0.1,
            enableGroupPriority: options.enableGroupPriority !== false,
            enableConditionMatching: options.enableConditionMatching !== false,
            maxCandidates: options.maxCandidates || 10,
            ...options
        };

        this.seatScores = new Map();
        this.selectionHistory = [];
        this.seatsConfig = options.seatsConfig || [];
    }

    /**
     * 獲取可用座位
     */
    getAvailableSeats(seats, currentAssignment) {
        const assignedSeats = new Set();
        
        // 收集已分配的座位
        for (const seat of currentAssignment.values()) {
            assignedSeats.add(`${seat.row}-${seat.col}`);
        }
        
        // 返回未分配的座位
        return seats.filter(seat => !assignedSeats.has(`${seat.row}-${seat.col}`));
    }

    /**
     * 獲取候選座位
     */
    getCandidateSeats(student, seats, currentAssignment, conditions) {
        const availableSeats = this.getAvailableSeats(seats, currentAssignment);
        const candidateSeats = [];
        
        for (const seat of availableSeats) {
            const score = this.scoreSeat(student, seat, currentAssignment, conditions);
            if (score > 0) {
                candidateSeats.push({
                    seat,
                    score,
                    reasons: this.getScoreReasons(student, seat, currentAssignment, conditions)
                });
            }
        }
        
        // 按分數排序並限制候選數量
        candidateSeats.sort((a, b) => b.score - a.score);
        return candidateSeats.slice(0, this.options.maxCandidates);
    }

    /**
     * 過濾有效座位
     */
    filterValidSeats(student, seats, currentAssignment, studentToConditionsMap) {
        const validSeats = [];
        
        for (const seat of seats) {
            // 檢查學生是否可以坐在這個座位
            const canSit = this.canStudentSitHere(student, seat, currentAssignment, studentToConditionsMap);
            if (canSit) {
                validSeats.push(seat);
            }
        }
        
        return validSeats;
    }

    /**
     * 檢查學生是否可以坐在指定座位
     */
    canStudentSitHere(student, seat, currentAssignment, studentToConditionsMap) {
        const tempAssignment = new Map(currentAssignment);
        tempAssignment.set(student.id, seat);
        
        const studentConditions = studentToConditionsMap.get(student.id) || [];
        
        for (const condition of studentConditions) {
            if (!this.checkCondition(condition, tempAssignment)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * 檢查條件是否滿足
     */
    checkCondition(condition, assignment) {
        switch (condition.type) {
            case 'adjacent':
                return this.checkAdjacent(condition.students, assignment);
            case 'group_area':
                return this.checkGroupArea(condition.students[0], assignment);
            case 'not_adjacent':
                return this.checkNotAdjacent(condition.students, assignment);
            case 'assign_group':
                return this.checkAssignGroup(condition.students, condition.group, assignment);
            case 'adjacent_and_group':
                return this.checkAdjacentAndGroup(condition.students, condition.group, assignment);
            case 'assign_seat':
                return this.checkAssignSeat(condition.students[0], condition.seat, assignment);
            default:
                return true;
        }
    }

    /**
     * 檢查相鄰條件
     */
    checkAdjacent(students, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const rowDiff = Math.abs(seatA.row - seatB.row);
            const colDiff = Math.abs(seatA.col - seatB.col);
            return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
        });
    }

    /**
     * 檢查群組區域條件
     */
    checkGroupArea(studentId, assignment) {
        const seat = assignment.get(studentId);
        return seat && seat.groupId;
    }

    /**
     * 檢查不相鄰條件
     */
    checkNotAdjacent(students, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const rowDiff = Math.abs(seatA.row - seatB.row);
            const colDiff = Math.abs(seatA.col - seatB.col);
            return !(rowDiff <= 1 && colDiff <= 1);
        });
    }

    /**
     * 檢查指定群組條件
     */
    checkAssignGroup(students, groupName, assignment) {
        return students.every(s => {
            const seat = assignment.get(s[0]);
            if (!seat) return true;
            return seat.groupId === groupName;
        });
    }

    /**
     * 檢查相鄰且同群組條件
     */
    checkAdjacentAndGroup(students, groupName, assignment) {
        return students.every(pair => {
            const seatA = assignment.get(pair[0]);
            const seatB = assignment.get(pair[1]);
            
            if (!seatA || !seatB) return true;
            
            const isAdjacent = (Math.abs(seatA.row - seatB.row) === 1 && seatA.col === seatB.col) ||
                              (Math.abs(seatA.col - seatB.col) === 1 && seatA.row === seatB.row);
            const isInGroup = seatA.groupId === groupName && seatB.groupId === groupName;
            
            return isAdjacent && isInGroup;
        });
    }

    /**
     * 檢查指定座位條件
     */
    checkAssignSeat(studentId, targetSeat, assignment) {
        const seat = assignment.get(studentId);
        if (!seat) return true;
        return seat.row === targetSeat.row && seat.col === targetSeat.col;
    }

    // ==================== 座位排序策略 ====================

    /**
     * 動態排序座位 - 遷移自 algorithms.js 的座位排序邏輯
     */
    sortSeatsDynamically(candidateSeats, student, currentAssignment, conditions) {
        let sortedSeats = [...candidateSeats];
        
        // 按群組優先級排序
        if (this.options.enableGroupPriority) {
            sortedSeats = this.sortByGroupPriority(sortedSeats, student);
        }
        
        // 按條件匹配度排序
        if (this.options.enableConditionMatching) {
            sortedSeats = this.sortByConditionMatch(sortedSeats, student, currentAssignment, conditions);
        }
        
        // 添加隨機性
        if (this.options.enableRandomness) {
            sortedSeats = this.addRandomness(sortedSeats);
        }
        
        return sortedSeats;
    }

    /**
     * 根據學生需求動態排序座位 - 遷移自 algorithms.js
     */
    getSortedSeatsForStudent(studentId, availableSeats, conditions) {
        const studentConditions = this.getStudentConditions(studentId, conditions);
        
        // 檢查學生是否有特殊座位要求
        const needsSpecialSeat = studentConditions.some(condition => 
            condition.type === 'assign_group' && this.isSpecialSeatGroup(condition.group, this.seatsConfig)
        );
        
        // 根據學生需求排序座位
        return availableSeats.sort((a, b) => {
            const aIsSpecial = this.isSpecialSeat(a);
            const bIsSpecial = this.isSpecialSeat(b);
            
            if (needsSpecialSeat) {
                // 需要特殊座位的學生，特殊座位優先
                if (aIsSpecial && !bIsSpecial) return -1;
                if (!aIsSpecial && bIsSpecial) return 1;
            } else {
                // 普通學生，普通座位優先
                if (!aIsSpecial && bIsSpecial) return -1;
                if (aIsSpecial && !bIsSpecial) return 1;
            }
            
            // 其他條件相同時，保持隨機性
            return 0;
        });
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
     * 判斷是否為特殊座位 - 遷移自 algorithms.js
     */
    isSpecialSeat(seat) {
        // 這裡需要從配置中獲取座位信息
        // 暫時返回 false，實際實現時需要從 config 中獲取
        return false;
    }

    /**
     * 按群組優先級排序
     */
    sortByGroupPriority(candidateSeats, student) {
        return candidateSeats.sort((a, b) => {
            const aGroupMatch = a.seat.groupId === student.groupId ? 1 : 0;
            const bGroupMatch = b.seat.groupId === student.groupId ? 1 : 0;
            
            if (aGroupMatch !== bGroupMatch) {
                return bGroupMatch - aGroupMatch;
            }
            
            return b.score - a.score;
        });
    }

    /**
     * 按條件匹配度排序
     */
    sortByConditionMatch(candidateSeats, student, currentAssignment, conditions) {
        return candidateSeats.sort((a, b) => {
            const aConditionSatisfaction = this.calculateConditionSatisfaction(student, a.seat, currentAssignment, conditions);
            const bConditionSatisfaction = this.calculateConditionSatisfaction(student, b.seat, currentAssignment, conditions);
            
            if (aConditionSatisfaction !== bConditionSatisfaction) {
                return bConditionSatisfaction - aConditionSatisfaction;
            }
            
            return b.score - a.score;
        });
    }

    /**
     * 添加隨機性
     */
    addRandomness(candidateSeats) {
        return candidateSeats.map(candidate => ({
            ...candidate,
            randomScore: candidate.score * (1 + (Math.random() - 0.5) * this.options.randomnessFactor)
        })).sort((a, b) => b.randomScore - a.randomScore);
    }

    // ==================== 啟發式評分 ====================

    /**
     * 評分座位
     */
    scoreSeat(student, seat, currentAssignment, conditions) {
        let score = 0;
        
        // 基礎分數
        score += this.calculateBaseSeatScore(seat);
        
        // 條件滿足度分數
        score += this.calculateConditionSatisfaction(student, seat, currentAssignment, conditions);
        
        // 鄰居影響分數
        score += this.evaluateNeighborImpact(student, seat, currentAssignment);
        
        // 群組匹配分數
        if (student.groupId && seat.groupId === student.groupId) {
            score += 10;
        }
        
        return Math.round(score * 100) / 100;
    }

    /**
     * 計算基礎座位分數
     */
    calculateBaseSeatScore(seat) {
        let score = 50; // 基礎分數
        
        // 前排座位加分
        if (seat.row <= 2) {
            score += 5;
        }
        
        // 中間列座位加分
        const totalCols = 9; // 假設總共9列
        const middleCols = Math.floor(totalCols / 2);
        if (seat.col >= middleCols - 1 && seat.col <= middleCols + 1) {
            score += 3;
        }
        
        // 特殊座位加分
        if (seat.isSpecial) {
            score += 15;
        }
        
        return score;
    }

    /**
     * 計算條件滿足度
     */
    calculateConditionSatisfaction(student, seat, currentAssignment, conditions) {
        const tempAssignment = new Map(currentAssignment);
        tempAssignment.set(student.id, seat);
        
        let satisfaction = 0;
        const studentConditions = this.getStudentConditions(student.id, conditions);
        
        for (const condition of studentConditions) {
            if (this.checkCondition(condition, tempAssignment)) {
                satisfaction += this.getConditionWeight(condition.type);
            }
        }
        
        return satisfaction;
    }

    /**
     * 評估鄰居影響
     */
    evaluateNeighborImpact(student, seat, currentAssignment) {
        let impact = 0;
        const neighbors = this.getNeighboringSeats(seat);
        
        for (const neighbor of neighbors) {
            const neighborStudent = this.getStudentAtSeat(neighbor, currentAssignment);
            if (neighborStudent) {
                impact += this.calculateNeighborCompatibility(student, neighborStudent);
            }
        }
        
        return impact;
    }

    /**
     * 獲取鄰近座位
     */
    getNeighboringSeats(seat) {
        const neighbors = [];
        for (let dRow = -1; dRow <= 1; dRow++) {
            for (let dCol = -1; dCol <= 1; dCol++) {
                if (dRow === 0 && dCol === 0) continue;
                
                const nRow = seat.row + dRow;
                const nCol = seat.col + dCol;
                
                // 假設座位範圍是 0-8
                if (nRow >= 0 && nRow < 9 && nCol >= 0 && nCol < 9) {
                    neighbors.push({ row: nRow, col: nCol });
                }
            }
        }
        return neighbors;
    }

    /**
     * 獲取座位上的學生
     */
    getStudentAtSeat(seat, currentAssignment) {
        for (const [studentId, assignedSeat] of currentAssignment.entries()) {
            if (assignedSeat.row === seat.row && assignedSeat.col === seat.col) {
                return { id: studentId, seat: assignedSeat };
            }
        }
        return null;
    }

    /**
     * 計算鄰居相容性
     */
    calculateNeighborCompatibility(student1, student2) {
        let compatibility = 0;
        
        // 同群組加分
        if (student1.groupId && student2.groupId && student1.groupId === student2.groupId) {
            compatibility += 5;
        }
        
        // 特殊需求相容性檢查
        if (student1.specialNeeds && student2.specialNeeds) {
            // 這裡可以添加更複雜的相容性邏輯
            compatibility += 2;
        }
        
        return compatibility;
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
     * 獲取條件權重
     */
    getConditionWeight(conditionType) {
        const weights = {
            assign_group: 10,
            adjacent: 8,
            adjacent_and_group: 9,
            group_area: 7,
            not_adjacent: 5,
            assign_seat: 6
        };
        
        return weights[conditionType] || 1;
    }

    /**
     * 獲取評分原因
     */
    getScoreReasons(student, seat, currentAssignment, conditions) {
        const reasons = [];
        
        // 基礎分數原因
        const baseScore = this.calculateBaseSeatScore(seat);
        if (baseScore > 50) {
            reasons.push(`基礎座位分數: ${baseScore}`);
        }
        
        // 群組匹配原因
        if (student.groupId && seat.groupId === student.groupId) {
            reasons.push('群組匹配');
        }
        
        // 條件滿足原因
        const conditionSatisfaction = this.calculateConditionSatisfaction(student, seat, currentAssignment, conditions);
        if (conditionSatisfaction > 0) {
            reasons.push(`條件滿足度: ${conditionSatisfaction}`);
        }
        
        // 鄰居影響原因
        const neighborImpact = this.evaluateNeighborImpact(student, seat, currentAssignment);
        if (neighborImpact > 0) {
            reasons.push(`鄰居相容性: ${neighborImpact}`);
        }
        
        return reasons;
    }

    /**
     * 記錄選擇歷史
     */
    recordSelection(student, seat, score, reasons) {
        this.selectionHistory.push({
            timestamp: new Date().toISOString(),
            studentId: student.id,
            seat: { row: seat.row, col: seat.col },
            score,
            reasons,
            groupId: seat.groupId
        });
    }

    /**
     * 獲取選擇歷史
     */
    getSelectionHistory() {
        return this.selectionHistory;
    }

    /**
     * 清除選擇歷史
     */
    clearSelectionHistory() {
        this.selectionHistory = [];
    }

    /**
     * 獲取座位評分統計
     */
    getSeatScoreStats() {
        const scores = Array.from(this.seatScores.values());
        if (scores.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0 };
        }
        
        const sum = scores.reduce((acc, score) => acc + score, 0);
        const average = sum / scores.length;
        const min = Math.min(...scores);
        const max = Math.max(...scores);
        
        return {
            count: scores.length,
            average: Math.round(average * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100
        };
    }
}

module.exports = { SeatSelector };
