/**
 * 效果分析器
 * 負責分析調整效果、計算性能指標、分析分配變化等核心功能
 */
const { Logger } = require('./Logger.js');

class EffectAnalyzer {
    constructor(options = {}) {
        this.logger = new Logger('EffectAnalyzer');
        this.options = {
            enableDetailedAnalysis: options.enableDetailedAnalysis !== false,
            performanceWeight: options.performanceWeight || 0.4,
            changeWeight: options.changeWeight || 0.3,
            riskWeight: options.riskWeight || 0.3,
            ...options
        };

        this.analysisHistory = [];
        this.performanceMetrics = {};
    }

    /**
     * 測量調整效果
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} adjustmentDetails 調整詳情
     * @returns {Object} 效果測量結果
     */
    measureAdjustmentEffect(originalAssignment, newAssignment, students, seats, conditions, adjustmentDetails) {
        const measurement = {
            timestamp: new Date().toISOString(),
            originalAssignment: new Map(originalAssignment),
            newAssignment: new Map(newAssignment),
            adjustmentDetails,
            overallEffect: 0,
            performanceMetrics: {},
            changes: {},
            details: {}
        };

        try {
            // 1. 計算性能指標
            measurement.performanceMetrics = this.calculatePerformanceMetrics(
                originalAssignment, newAssignment, adjustmentDetails
            );

            // 2. 分析分配變化
            measurement.changes = this.analyzeAssignmentChanges(originalAssignment, newAssignment);

            // 3. 計算整體效果
            measurement.overallEffect = this.calculateOverallEffect(measurement);

            // 4. 詳細信息
            measurement.details = {
                studentImpact: this.analyzeStudentImpact(originalAssignment, newAssignment, students),
                conditionImpact: this.analyzeConditionImpact(originalAssignment, newAssignment, conditions),
                seatUtilization: this.analyzeSeatUtilization(originalAssignment, newAssignment, seats)
            };

            // 記錄分析歷史
            this.analysisHistory.push(measurement);

        } catch (error) {
            this.logger.error('效果測量失敗:', error);
            measurement.overallEffect = 0;
        }

        return measurement;
    }

    /**
     * 計算性能指標
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Object} adjustmentDetails 調整詳情
     * @returns {Object} 性能指標
     */
    calculatePerformanceMetrics(originalAssignment, newAssignment, adjustmentDetails) {
        const metrics = {
            assignmentRate: 0,
            conditionSatisfaction: 0,
            studentSatisfaction: 0,
            seatUtilization: 0,
            changeCount: 0,
            improvementScore: 0
        };

        try {
            // 計算分配率
            metrics.assignmentRate = this.calculateAssignmentRate(newAssignment);
            
            // 計算條件滿意度
            metrics.conditionSatisfaction = this.calculateConditionSatisfaction(newAssignment);
            
            // 計算學生滿意度
            metrics.studentSatisfaction = this.calculateStudentSatisfaction(newAssignment);
            
            // 計算座位利用率
            metrics.seatUtilization = this.calculateSeatUtilization(newAssignment);
            
            // 計算變化數量
            metrics.changeCount = this.calculateChangeCount(originalAssignment, newAssignment);
            
            // 計算改進分數
            metrics.improvementScore = this.calculateImprovementScore(originalAssignment, newAssignment);

        } catch (error) {
            this.logger.error('性能指標計算失敗:', error);
        }

        return metrics;
    }

    /**
     * 分析分配變化
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @returns {Object} 變化分析
     */
    analyzeAssignmentChanges(originalAssignment, newAssignment) {
        const changes = {
            added: [],
            removed: [],
            modified: [],
            unchanged: [],
            totalChanges: 0,
            changeDistribution: {},
            changeImpact: {}
        };

        try {
            // 分析新增的分配
            for (const [studentId, seat] of newAssignment) {
                if (!originalAssignment.has(studentId)) {
                    changes.added.push({ studentId, seat });
                }
            }

            // 分析移除的分配
            for (const [studentId, seat] of originalAssignment) {
                if (!newAssignment.has(studentId)) {
                    changes.removed.push({ studentId, seat });
                }
            }

            // 分析修改的分配
            for (const [studentId, newSeat] of newAssignment) {
                const originalSeat = originalAssignment.get(studentId);
                if (originalSeat && originalSeat !== newSeat) {
                    changes.modified.push({ studentId, originalSeat, newSeat });
                }
            }

            // 分析未變化的分配
            for (const [studentId, seat] of originalAssignment) {
                if (newAssignment.has(studentId) && newAssignment.get(studentId) === seat) {
                    changes.unchanged.push({ studentId, seat });
                }
            }

            // 計算總變化數
            changes.totalChanges = changes.added.length + changes.removed.length + changes.modified.length;

            // 分析變化分布
            changes.changeDistribution = this.analyzeChangeDistribution(changes);

            // 分析變化影響
            changes.changeImpact = this.analyzeChangeImpact(changes);

        } catch (error) {
            this.logger.error('分配變化分析失敗:', error);
        }

        return changes;
    }

    /**
     * 計算整體效果
     * @param {Object} measurement 測量結果
     * @returns {number} 整體效果分數
     */
    calculateOverallEffect(measurement) {
        let overallEffect = 0;

        try {
            const { performanceMetrics, changes } = measurement;
            
            // 基於性能指標的效果
            const performanceEffect = this.calculateOverallScore(performanceMetrics);
            
            // 基於變化的效果
            const changeEffect = this.calculateChangeEffect(changes);
            
            // 綜合計算
            overallEffect = performanceEffect * this.options.performanceWeight + 
                          changeEffect * this.options.changeWeight;

        } catch (error) {
            this.logger.error('整體效果計算失敗:', error);
        }

        return Math.max(0, Math.min(1, overallEffect));
    }

    /**
     * 分析學生影響
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} students 學生列表
     * @returns {Object} 學生影響分析
     */
    analyzeStudentImpact(originalAssignment, newAssignment, students) {
        const impact = {
            affectedStudents: [],
            positiveImpact: [],
            negativeImpact: [],
            neutralImpact: [],
            impactLevel: 'low'
        };

        try {
            for (const student of students) {
                const originalSeat = originalAssignment.get(student.id);
                const newSeat = newAssignment.get(student.id);
                
                if (originalSeat !== newSeat) {
                    impact.affectedStudents.push(student.id);
                    
                    // 簡化的影響評估
                    if (newSeat && !originalSeat) {
                        impact.positiveImpact.push(student.id);
                    } else if (!newSeat && originalSeat) {
                        impact.negativeImpact.push(student.id);
                    } else if (newSeat && originalSeat) {
                        impact.neutralImpact.push(student.id);
                    }
                }
            }

            // 確定影響等級
            const totalAffected = impact.affectedStudents.length;
            const totalStudents = students.length;
            const impactRatio = totalAffected / totalStudents;

            if (impactRatio > 0.5) {
                impact.impactLevel = 'high';
            } else if (impactRatio > 0.2) {
                impact.impactLevel = 'medium';
            } else {
                impact.impactLevel = 'low';
            }

        } catch (error) {
            this.logger.error('學生影響分析失敗:', error);
        }

        return impact;
    }

    /**
     * 分析條件影響
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} conditions 條件列表
     * @returns {Object} 條件影響分析
     */
    analyzeConditionImpact(originalAssignment, newAssignment, conditions) {
        const impact = {
            satisfiedConditions: 0,
            unsatisfiedConditions: 0,
            newSatisfied: 0,
            newUnsatisfied: 0,
            impactLevel: 'low'
        };

        try {
            // 簡化的條件影響分析
            const originalSatisfied = this.countSatisfiedConditions(originalAssignment, conditions);
            const newSatisfied = this.countSatisfiedConditions(newAssignment, conditions);
            
            impact.satisfiedConditions = newSatisfied;
            impact.unsatisfiedConditions = conditions.length - newSatisfied;
            impact.newSatisfied = Math.max(0, newSatisfied - originalSatisfied);
            impact.newUnsatisfied = Math.max(0, originalSatisfied - newSatisfied);

            // 確定影響等級
            const changeRatio = Math.abs(newSatisfied - originalSatisfied) / conditions.length;
            
            if (changeRatio > 0.3) {
                impact.impactLevel = 'high';
            } else if (changeRatio > 0.1) {
                impact.impactLevel = 'medium';
            } else {
                impact.impactLevel = 'low';
            }

        } catch (error) {
            this.logger.error('條件影響分析失敗:', error);
        }

        return impact;
    }

    /**
     * 分析座位利用率
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @param {Array} seats 座位列表
     * @returns {Object} 座位利用率分析
     */
    analyzeSeatUtilization(originalAssignment, newAssignment, seats) {
        const utilization = {
            originalUtilization: 0,
            newUtilization: 0,
            improvement: 0,
            utilizationLevel: 'low'
        };

        try {
            utilization.originalUtilization = originalAssignment.size / seats.length;
            utilization.newUtilization = newAssignment.size / seats.length;
            utilization.improvement = utilization.newUtilization - utilization.originalUtilization;

            // 確定利用率等級
            if (utilization.newUtilization > 0.9) {
                utilization.utilizationLevel = 'high';
            } else if (utilization.newUtilization > 0.7) {
                utilization.utilizationLevel = 'medium';
            } else {
                utilization.utilizationLevel = 'low';
            }

        } catch (error) {
            this.logger.error('座位利用率分析失敗:', error);
        }

        return utilization;
    }

    /**
     * 計算分配率
     * @param {Map} assignment 分配
     * @returns {number} 分配率
     */
    calculateAssignmentRate(assignment) {
        return assignment.size > 0 ? 1 : 0; // 簡化實現
    }

    /**
     * 計算條件滿意度
     * @param {Map} assignment 分配
     * @returns {number} 條件滿意度
     */
    calculateConditionSatisfaction(assignment) {
        return 0.8; // 簡化實現
    }

    /**
     * 計算學生滿意度
     * @param {Map} assignment 分配
     * @returns {number} 學生滿意度
     */
    calculateStudentSatisfaction(assignment) {
        return 0.7; // 簡化實現
    }

    /**
     * 計算座位利用率
     * @param {Map} assignment 分配
     * @returns {number} 座位利用率
     */
    calculateSeatUtilization(assignment) {
        return 0.9; // 簡化實現
    }

    /**
     * 計算變化數量
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @returns {number} 變化數量
     */
    calculateChangeCount(originalAssignment, newAssignment) {
        let count = 0;
        
        for (const [studentId, seat] of newAssignment) {
            if (!originalAssignment.has(studentId) || originalAssignment.get(studentId) !== seat) {
                count++;
            }
        }
        
        return count;
    }

    /**
     * 計算改進分數
     * @param {Map} originalAssignment 原始分配
     * @param {Map} newAssignment 新分配
     * @returns {number} 改進分數
     */
    calculateImprovementScore(originalAssignment, newAssignment) {
        return 0.6; // 簡化實現
    }

    /**
     * 計算整體分數
     * @param {Object} metrics 指標
     * @returns {number} 整體分數
     */
    calculateOverallScore(metrics) {
        return metrics.assignmentRate * 0.3 + 
               metrics.conditionSatisfaction * 0.3 + 
               metrics.studentSatisfaction * 0.4;
    }

    /**
     * 計算變化效果
     * @param {Object} changes 變化
     * @returns {number} 變化效果
     */
    calculateChangeEffect(changes) {
        return 0.5; // 簡化實現
    }

    /**
     * 分析變化分布
     * @param {Object} changes 變化
     * @returns {Object} 變化分布
     */
    analyzeChangeDistribution(changes) {
        return { distribution: 'even' }; // 簡化實現
    }

    /**
     * 分析變化影響
     * @param {Object} changes 變化
     * @returns {Object} 變化影響
     */
    analyzeChangeImpact(changes) {
        return { impact: 'moderate' }; // 簡化實現
    }

    /**
     * 計算滿意條件數量
     * @param {Map} assignment 分配
     * @param {Array} conditions 條件
     * @returns {number} 滿意條件數量
     */
    countSatisfiedConditions(assignment, conditions) {
        return Math.floor(conditions.length * 0.8); // 簡化實現
    }

    /**
     * 設置分析配置
     * @param {Object} config 配置
     */
    setAnalysisConfig(config) {
        this.options = { ...this.options, ...config };
    }

    /**
     * 獲取分析歷史
     * @returns {Array} 分析歷史
     */
    getAnalysisHistory() {
        return [...this.analysisHistory];
    }

    /**
     * 清除分析歷史
     */
    clearAnalysisHistory() {
        this.analysisHistory = [];
    }

    /**
     * 初始化效果分析器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.analysisHistory = [];
        this.performanceMetrics = {};
        
        this.logger.info('效果分析器初始化完成', {
            enableDetailedAnalysis: this.options.enableDetailedAnalysis,
            performanceWeight: this.options.performanceWeight,
            changeWeight: this.options.changeWeight,
            riskWeight: this.options.riskWeight
        });
    }

    /**
     * 銷毀效果分析器
     */
    dispose() {
        this.analysisHistory = [];
        this.performanceMetrics = {};
        this.logger.info('效果分析器銷毀完成');
    }
}

module.exports = { EffectAnalyzer };
