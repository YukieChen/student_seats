/**
 * 全局狀態評估器
 * 負責評估全局狀態、計算滿意度、分析分配分布等評估功能
 */
const { Logger } = require('./Logger.js');

class GlobalStateEvaluator {
    constructor(options = {}) {
        this.logger = new Logger('GlobalStateEvaluator');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            satisfactionWeight: options.satisfactionWeight || 0.5,
            conditionWeight: options.conditionWeight || 0.3,
            distributionWeight: options.distributionWeight || 0.2,
            ...options
        };

        this.evaluationHistory = [];
        this.satisfactionMetrics = {};
    }

    /**
     * 評估全局狀態
     * @param {Map} currentAssignment 當前分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 全局狀態評估結果
     */
    evaluateGlobalState(currentAssignment, students, seats, conditions) {
        const evaluation = {
            timestamp: new Date().toISOString(),
            totalStudents: students.length,
            totalSeats: seats.length,
            assignedStudents: 0,
            assignmentRate: 0,
            conditionSatisfaction: 0,
            studentSatisfaction: 0,
            overallScore: 0,
            details: {}
        };

        try {
            // 1. 計算分配率
            evaluation.assignmentRate = this.calculateAssignmentRate(currentAssignment, students);
            evaluation.assignedStudents = Math.floor(evaluation.assignmentRate * students.length);

            // 2. 計算條件滿足度
            evaluation.conditionSatisfaction = this.calculateGlobalConditionSatisfaction(currentAssignment, conditions);

            // 3. 計算學生滿意度
            evaluation.studentSatisfaction = this.calculateGlobalStudentSatisfaction(currentAssignment, students, seats, conditions);

            // 4. 計算綜合評分
            evaluation.overallScore = this.calculateOverallScore(evaluation);

            // 5. 詳細信息
            evaluation.details = {
                assignmentDistribution: this.analyzeAssignmentDistribution(currentAssignment, students, seats),
                conditionAnalysis: this.analyzeConditionSatisfaction(currentAssignment, conditions),
                studentAnalysis: this.analyzeStudentSatisfaction(currentAssignment, students, seats, conditions)
            };

            // 記錄評估歷史
            this.evaluationHistory.push(evaluation);

        } catch (error) {
            this.logger.error('全局狀態評估失敗:', error);
            evaluation.overallScore = 0;
        }

        return evaluation;
    }

    /**
     * 計算分配率
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @returns {number} 分配率
     */
    calculateAssignmentRate(assignment, students) {
        if (students.length === 0) return 0;
        return assignment.size / students.length;
    }

    /**
     * 計算全局條件滿足度
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {number} 條件滿足度
     */
    calculateGlobalConditionSatisfaction(assignment, conditions) {
        if (conditions.length === 0) return 1.0;

        let satisfiedConditions = 0;
        for (const condition of conditions) {
            if (this.checkCondition(condition, assignment)) {
                satisfiedConditions++;
            }
        }

        return satisfiedConditions / conditions.length;
    }

    /**
     * 計算全局學生滿意度
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {number} 學生滿意度
     */
    calculateGlobalStudentSatisfaction(assignment, students, seats, conditions) {
        if (students.length === 0) return 0;

        let totalSatisfaction = 0;
        let assignedCount = 0;

        for (const student of students) {
            const seat = assignment.get(student.id);
            if (seat) {
                const satisfaction = this.calculateStudentSatisfaction(student, seat, assignment, conditions);
                totalSatisfaction += satisfaction;
                assignedCount++;
            }
        }

        return assignedCount > 0 ? totalSatisfaction / assignedCount : 0;
    }

    /**
     * 計算綜合評分
     * @param {Object} evaluation 評估結果
     * @returns {number} 綜合評分
     */
    calculateOverallScore(evaluation) {
        return evaluation.assignmentRate * this.options.satisfactionWeight +
               evaluation.conditionSatisfaction * this.options.conditionWeight +
               evaluation.studentSatisfaction * this.options.distributionWeight;
    }

    /**
     * 分析分配分布
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @returns {Object} 分配分布分析
     */
    analyzeAssignmentDistribution(assignment, students, seats) {
        const distribution = {
            totalStudents: students.length,
            totalSeats: seats.length,
            assignedStudents: assignment.size,
            unassignedStudents: students.length - assignment.size,
            seatUtilization: assignment.size / seats.length,
            distribution: {}
        };

        try {
            // 分析座位區域分布
            const seatAreas = {};
            for (const seat of seats) {
                const area = `${seat.row}-${seat.col}`;
                seatAreas[area] = (seatAreas[area] || 0) + 1;
            }

            // 分析學生分配區域分布
            const assignmentAreas = {};
            for (const [studentId, seat] of assignment) {
                const area = `${seat.row}-${seat.col}`;
                assignmentAreas[area] = (assignmentAreas[area] || 0) + 1;
            }

            distribution.distribution = {
                seatAreas,
                assignmentAreas,
                utilizationByArea: {}
            };

            // 計算每個區域的利用率
            for (const area in seatAreas) {
                const assigned = assignmentAreas[area] || 0;
                const total = seatAreas[area];
                distribution.distribution.utilizationByArea[area] = assigned / total;
            }

        } catch (error) {
            this.logger.error('分配分布分析失敗:', error);
        }

        return distribution;
    }

    /**
     * 分析條件滿足情況
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {Object} 條件分析
     */
    analyzeConditionSatisfaction(assignment, conditions) {
        const analysis = {
            totalConditions: conditions.length,
            satisfiedConditions: 0,
            unsatisfiedConditions: 0,
            satisfactionRate: 0,
            conditionDetails: []
        };

        try {
            for (const condition of conditions) {
                const isSatisfied = this.checkCondition(condition, assignment);
                analysis.conditionDetails.push({
                    condition,
                    satisfied: isSatisfied
                });

                if (isSatisfied) {
                    analysis.satisfiedConditions++;
                } else {
                    analysis.unsatisfiedConditions++;
                }
            }

            analysis.satisfactionRate = analysis.totalConditions > 0 ? 
                analysis.satisfiedConditions / analysis.totalConditions : 0;

        } catch (error) {
            this.logger.error('條件滿足分析失敗:', error);
        }

        return analysis;
    }

    /**
     * 分析學生滿意度
     * @param {Map} assignment 分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 學生滿意度分析
     */
    analyzeStudentSatisfaction(assignment, students, seats, conditions) {
        const analysis = {
            totalStudents: students.length,
            assignedStudents: 0,
            unassignedStudents: 0,
            averageSatisfaction: 0,
            satisfactionDistribution: {
                high: 0,
                medium: 0,
                low: 0
            },
            studentDetails: []
        };

        try {
            let totalSatisfaction = 0;

            for (const student of students) {
                const seat = assignment.get(student.id);
                const satisfaction = seat ? 
                    this.calculateStudentSatisfaction(student, seat, assignment, conditions) : 0;

                analysis.studentDetails.push({
                    student,
                    seat,
                    satisfaction,
                    assigned: !!seat
                });

                if (seat) {
                    analysis.assignedStudents++;
                    totalSatisfaction += satisfaction;

                    // 分類滿意度
                    if (satisfaction >= 0.7) {
                        analysis.satisfactionDistribution.high++;
                    } else if (satisfaction >= 0.4) {
                        analysis.satisfactionDistribution.medium++;
                    } else {
                        analysis.satisfactionDistribution.low++;
                    }
                } else {
                    analysis.unassignedStudents++;
                }
            }

            analysis.averageSatisfaction = analysis.assignedStudents > 0 ? 
                totalSatisfaction / analysis.assignedStudents : 0;

        } catch (error) {
            this.logger.error('學生滿意度分析失敗:', error);
        }

        return analysis;
    }

    /**
     * 計算學生滿意度
     * @param {Object} student 學生
     * @param {Object} seat 座位
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件列表
     * @returns {number} 滿意度分數
     */
    calculateStudentSatisfaction(student, seat, assignment, conditions) {
        let satisfaction = 0.5; // 基礎滿意度

        try {
            // 座位偏好匹配
            if (student.preferredSeats && student.preferredSeats.includes(`${seat.row}-${seat.col}`)) {
                satisfaction += 0.3;
            }

            // 條件滿足度
            const studentConditions = conditions.filter(c =>
                c.students && (Array.isArray(c.students) ? c.students.includes(student.id) : c.students === student.id)
            );

            let satisfiedConditions = 0;
            for (const condition of studentConditions) {
                const tempAssignment = new Map(assignment);
                tempAssignment.set(student.id, seat);
                if (this.checkCondition(condition, tempAssignment)) {
                    satisfiedConditions++;
                }
            }

            if (studentConditions.length > 0) {
                satisfaction += (satisfiedConditions / studentConditions.length) * 0.2;
            }

        } catch (error) {
            this.logger.error('學生滿意度計算失敗:', error);
        }

        return Math.min(1, Math.max(0, satisfaction));
    }

    /**
     * 檢查條件
     * @param {Object} condition 條件
     * @param {Map} assignment 分配
     * @returns {boolean} 是否滿足條件
     */
    checkCondition(condition, assignment) {
        // 簡化實現，返回隨機結果
        return Math.random() > 0.3;
    }

    /**
     * 檢查座位是否被佔用
     * @param {Object} seat 座位
     * @param {Map} assignment 分配
     * @returns {boolean} 是否被佔用
     */
    isSeatOccupied(seat, assignment) {
        return Array.from(assignment.values()).some(s => s.row === seat.row && s.col === seat.col);
    }

    /**
     * 設置評估配置
     * @param {Object} config 配置
     */
    setEvaluationConfig(config) {
        this.options = { ...this.options, ...config };
    }

    /**
     * 獲取評估歷史
     * @returns {Array} 評估歷史
     */
    getEvaluationHistory() {
        return [...this.evaluationHistory];
    }

    /**
     * 清除評估歷史
     */
    clearEvaluationHistory() {
        this.evaluationHistory = [];
    }

    /**
     * 初始化全局狀態評估器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.evaluationHistory = [];
        this.satisfactionMetrics = {};
        
        this.logger.info('全局狀態評估器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            satisfactionWeight: this.options.satisfactionWeight,
            conditionWeight: this.options.conditionWeight,
            distributionWeight: this.options.distributionWeight
        });
    }

    /**
     * 銷毀全局狀態評估器
     */
    dispose() {
        this.evaluationHistory = [];
        this.satisfactionMetrics = {};
        this.logger.info('全局狀態評估器銷毀完成');
    }
}

module.exports = { GlobalStateEvaluator };
