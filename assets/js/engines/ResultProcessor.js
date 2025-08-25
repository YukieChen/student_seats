/**
 * 結果處理器模組
 * 負責結果處理、合併、驗證和優化
 */
const { Logger } = require('./Logger.js');

class ResultProcessor {
    constructor(options = {}) {
        this.logger = new Logger('ResultProcessor');
        this.options = {
            enableValidation: options.enableValidation !== false,
            enableOptimization: options.enableOptimization !== false,
            ...options
        };
    }

    /**
     * 初始化結果處理器
     */
    initialize() {
        this.logger.info('初始化結果處理器', {
            enableValidation: this.options.enableValidation,
            enableOptimization: this.options.enableOptimization
        });
    }

    /**
     * 結果收集
     */
    collectResults(taskResults) {
        const collection = {
            successful: [],
            failed: [],
            partial: [],
            summary: {
                total: taskResults.length,
                successful: 0,
                failed: 0,
                partial: 0
            }
        };

        for (const result of taskResults) {
            if (result.success) {
                collection.successful.push(result);
                collection.summary.successful++;
            } else if (result.partial) {
                collection.partial.push(result);
                collection.summary.partial++;
            } else {
                collection.failed.push(result);
                collection.summary.failed++;
            }
        }

        return collection;
    }

    /**
     * 結果驗證
     */
    validateResults(result, validationRules = {}) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            score: 100
        };

        if (!result || typeof result !== 'object') {
            validation.isValid = false;
            validation.errors.push('結果格式無效');
            validation.score -= 50;
        }

        if (result.data && validationRules.requiredFields) {
            for (const field of validationRules.requiredFields) {
                if (!result.data.hasOwnProperty(field)) {
                    validation.isValid = false;
                    validation.errors.push(`缺少必需字段: ${field}`);
                    validation.score -= 10;
                }
            }
        }

        if (result.executionTime && validationRules.maxExecutionTime) {
            if (result.executionTime > validationRules.maxExecutionTime) {
                validation.warnings.push('執行時間超過預期');
                validation.score -= 5;
            }
        }

        return validation;
    }

    /**
     * 結果合併
     */
    mergeResults(results, mergeStrategy = {}) {
        const {
            strategy = 'sequential',
            conflictResolution = 'priority'
        } = mergeStrategy;

        let mergedResult;

        switch (strategy) {
            case 'sequential':
                mergedResult = this.mergeSequentially(results, conflictResolution);
                break;
            case 'parallel':
                mergedResult = this.mergeInParallel(results, conflictResolution);
                break;
            case 'hierarchical':
                mergedResult = this.mergeHierarchically(results, conflictResolution);
                break;
            default:
                mergedResult = this.mergeSequentially(results, conflictResolution);
        }

        return mergedResult;
    }

    /**
     * 順序合併
     */
    mergeSequentially(results, conflictResolution) {
        const merged = {
            assignment: new Map(),
            conflicts: [],
            score: 0,
            metadata: {
                mergedFrom: results.length,
                mergeStrategy: 'sequential',
                conflictResolution
            }
        };

        for (const result of results) {
            if (result.success && result.data) {
                if (result.data.assignment) {
                    for (const [studentId, seat] of result.data.assignment.entries()) {
                        if (merged.assignment.has(studentId)) {
                            const resolvedSeat = this.resolveConflict(
                                merged.assignment.get(studentId),
                                seat,
                                conflictResolution
                            );
                            merged.assignment.set(studentId, resolvedSeat);
                        } else {
                            merged.assignment.set(studentId, seat);
                        }
                    }
                }

                if (result.data.conflicts) {
                    merged.conflicts.push(...result.data.conflicts);
                }

                merged.score += result.data.score || 0;
            }
        }

        merged.score = merged.score / results.length;

        return merged;
    }

    /**
     * 並行合併
     */
    mergeInParallel(results, conflictResolution) {
        return this.mergeSequentially(results, conflictResolution);
    }

    /**
     * 層次合併
     */
    mergeHierarchically(results, conflictResolution) {
        return this.mergeSequentially(results, conflictResolution);
    }

    /**
     * 解決衝突
     */
    resolveConflict(existingSeat, newSeat, strategy) {
        switch (strategy) {
            case 'priority':
                return newSeat.priority > existingSeat.priority ? newSeat : existingSeat;
            case 'latest':
                return newSeat.timestamp > existingSeat.timestamp ? newSeat : existingSeat;
            case 'consensus':
                const existingScore = this.calculateSeatScore(existingSeat);
                const newScore = this.calculateSeatScore(newSeat);
                return newScore > existingScore ? newSeat : existingSeat;
            default:
                return existingSeat;
        }
    }

    /**
     * 計算座位分數
     */
    calculateSeatScore(seat) {
        let score = 0;
        
        if (seat.row === 0 || seat.col === 0) score += 10;
        
        if (seat.type === 'premium') score += 20;
        else if (seat.type === 'standard') score += 10;
        
        if (seat.timestamp) {
            score += Math.min(10, (Date.now() - seat.timestamp) / 1000);
        }
        
        return score;
    }

    /**
     * 結果優化
     */
    optimizeResults(mergedResult, optimizationOptions = {}) {
        const optimization = {
            originalResult: mergedResult,
            optimizedResult: { ...mergedResult },
            improvements: [],
            performance: {
                optimizationTime: 0,
                improvementScore: 0
            }
        };

        const startTime = Date.now();

        if (mergedResult.conflicts && mergedResult.conflicts.length > 0) {
            const conflictOptimization = this.optimizeConflicts(mergedResult.conflicts);
            optimization.optimizedResult.conflicts = conflictOptimization.optimizedConflicts;
            optimization.improvements.push('衝突數量減少: ' + conflictOptimization.improvement);
        }

        if (mergedResult.assignment) {
            const assignmentOptimization = this.optimizeAssignment(mergedResult.assignment);
            optimization.optimizedResult.assignment = assignmentOptimization.optimizedAssignment;
            optimization.improvements.push('分配質量提升: ' + assignmentOptimization.improvement);
        }

        optimization.performance.optimizationTime = Date.now() - startTime;
        optimization.performance.improvementScore = this.calculateImprovementScore(
            mergedResult,
            optimization.optimizedResult
        );

        return optimization;
    }

    /**
     * 優化衝突
     */
    optimizeConflicts(conflicts) {
        const uniqueConflicts = conflicts.filter((conflict, index, self) =>
            index === self.findIndex(c => 
                c.studentId === conflict.studentId && 
                c.seatId === conflict.seatId
            )
        );

        return {
            optimizedConflicts: uniqueConflicts,
            improvement: conflicts.length - uniqueConflicts.length
        };
    }

    /**
     * 優化分配
     */
    optimizeAssignment(assignment) {
        const optimizedAssignment = new Map();
        const duplicates = [];

        for (const [studentId, seat] of assignment.entries()) {
            if (optimizedAssignment.has(studentId)) {
                duplicates.push({ studentId, seat });
            } else {
                optimizedAssignment.set(studentId, seat);
            }
        }

        return {
            optimizedAssignment,
            improvement: duplicates.length
        };
    }

    /**
     * 計算改進分數
     */
    calculateImprovementScore(original, optimized) {
        let score = 0;

        if (original.conflicts && optimized.conflicts) {
            const conflictReduction = original.conflicts.length - optimized.conflicts.length;
            score += conflictReduction * 10;
        }

        if (optimized.score > original.score) {
            score += (optimized.score - original.score) * 100;
        }

        return score;
    }

    /**
     * 處理執行結果
     */
    processExecutionResults(results, distribution) {
        const processed = {
            completed: [],
            failed: [],
            partial: []
        };

        for (const result of results) {
            if (result.status === 'fulfilled') {
                processed.completed.push(result.value);
            } else {
                processed.failed.push(result.reason);
            }
        }

        return processed;
    }

    /**
     * 生成結果報告
     */
    generateResultReport(results, options = {}) {
        const {
            includeDetails = true,
            includePerformance = true,
            includeRecommendations = true
        } = options;

        const report = {
            summary: {
                totalResults: results.length,
                successfulResults: results.filter(r => r.success).length,
                failedResults: results.filter(r => !r.success).length,
                successRate: results.length > 0 ? results.filter(r => r.success).length / results.length : 0
            },
            timestamp: Date.now()
        };

        if (includeDetails) {
            report.details = {
                successful: results.filter(r => r.success),
                failed: results.filter(r => !r.success)
            };
        }

        if (includePerformance) {
            report.performance = this.calculateResultPerformance(results);
        }

        if (includeRecommendations) {
            report.recommendations = this.generateResultRecommendations(results);
        }

        return report;
    }

    /**
     * 計算結果性能
     */
    calculateResultPerformance(results) {
        const successfulResults = results.filter(r => r.success);
        const totalExecutionTime = successfulResults.reduce((sum, r) => sum + (r.executionTime || 0), 0);
        const averageExecutionTime = successfulResults.length > 0 ? totalExecutionTime / successfulResults.length : 0;

        return {
            totalExecutionTime,
            averageExecutionTime,
            totalResults: results.length,
            successfulResults: successfulResults.length,
            failedResults: results.length - successfulResults.length
        };
    }

    /**
     * 生成結果建議
     */
    generateResultRecommendations(results) {
        const recommendations = [];
        const successRate = results.length > 0 ? results.filter(r => r.success).length / results.length : 0;

        if (successRate < 0.8) {
            recommendations.push('成功率較低，建議檢查任務配置和錯誤處理機制');
        }

        if (successRate < 0.5) {
            recommendations.push('成功率很低，建議重新評估任務複雜度和資源分配');
        }

        const avgExecutionTime = this.calculateResultPerformance(results).averageExecutionTime;
        if (avgExecutionTime > 30000) {
            recommendations.push('平均執行時間較長，建議優化算法或增加並行度');
        }

        return recommendations;
    }

    /**
     * 驗證合併結果
     */
    validateMergedResult(mergedResult, validationRules = {}) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            score: 100
        };

        // 檢查基本結構
        if (!mergedResult || typeof mergedResult !== 'object') {
            validation.isValid = false;
            validation.errors.push('合併結果格式無效');
            validation.score -= 50;
        }

        // 檢查分配結果
        if (mergedResult.assignment && !(mergedResult.assignment instanceof Map)) {
            validation.isValid = false;
            validation.errors.push('分配結果格式無效');
            validation.score -= 20;
        }

        // 檢查衝突數量
        if (mergedResult.conflicts && Array.isArray(mergedResult.conflicts)) {
            if (mergedResult.conflicts.length > (validationRules.maxConflicts || 100)) {
                validation.warnings.push('衝突數量較多，可能需要進一步優化');
                validation.score -= 10;
            }
        }

        // 檢查分數
        if (typeof mergedResult.score === 'number') {
            if (mergedResult.score < (validationRules.minScore || 0)) {
                validation.warnings.push('合併結果分數較低');
                validation.score -= 5;
            }
        }

        return validation;
    }

    /**
     * 比較結果
     */
    compareResults(result1, result2, comparisonOptions = {}) {
        const {
            compareAssignments = true,
            compareConflicts = true,
            compareScores = true
        } = comparisonOptions;

        const comparison = {
            assignments: { identical: false, differences: [] },
            conflicts: { identical: false, differences: [] },
            scores: { identical: false, difference: 0 },
            overall: { identical: false, similarity: 0 }
        };

        if (compareAssignments && result1.assignment && result2.assignment) {
            comparison.assignments = this.compareAssignments(result1.assignment, result2.assignment);
        }

        if (compareConflicts && result1.conflicts && result2.conflicts) {
            comparison.conflicts = this.compareConflicts(result1.conflicts, result2.conflicts);
        }

        if (compareScores && typeof result1.score === 'number' && typeof result2.score === 'number') {
            comparison.scores.difference = result2.score - result1.score;
            comparison.scores.identical = Math.abs(comparison.scores.difference) < 0.001;
        }

        // 計算整體相似度
        let similarityScore = 0;
        let totalComparisons = 0;

        if (comparison.assignments.identical) similarityScore += 0.5;
        if (comparison.conflicts.identical) similarityScore += 0.3;
        if (comparison.scores.identical) similarityScore += 0.2;

        totalComparisons = 3;
        comparison.overall.similarity = similarityScore / totalComparisons;
        comparison.overall.identical = comparison.overall.similarity > 0.9;

        return comparison;
    }

    /**
     * 比較分配結果
     */
    compareAssignments(assignment1, assignment2) {
        const differences = [];
        const allStudents = new Set([...assignment1.keys(), ...assignment2.keys()]);

        for (const studentId of allStudents) {
            const seat1 = assignment1.get(studentId);
            const seat2 = assignment2.get(studentId);

            if (!seat1 && seat2) {
                differences.push({ studentId, type: 'added', seat: seat2 });
            } else if (seat1 && !seat2) {
                differences.push({ studentId, type: 'removed', seat: seat1 });
            } else if (seat1 && seat2) {
                if (seat1.row !== seat2.row || seat1.col !== seat2.col) {
                    differences.push({ studentId, type: 'changed', from: seat1, to: seat2 });
                }
            }
        }

        return {
            identical: differences.length === 0,
            differences
        };
    }

    /**
     * 比較衝突結果
     */
    compareConflicts(conflicts1, conflicts2) {
        const differences = [];
        const conflicts1Set = new Set(conflicts1.map(c => JSON.stringify(c)));
        const conflicts2Set = new Set(conflicts2.map(c => JSON.stringify(c)));

        for (const conflict of conflicts1) {
            const conflictStr = JSON.stringify(conflict);
            if (!conflicts2Set.has(conflictStr)) {
                differences.push({ type: 'removed', conflict });
            }
        }

        for (const conflict of conflicts2) {
            const conflictStr = JSON.stringify(conflict);
            if (!conflicts1Set.has(conflictStr)) {
                differences.push({ type: 'added', conflict });
            }
        }

        return {
            identical: differences.length === 0,
            differences
        };
    }

    /**
     * 銷毀結果處理器
     */
    dispose() {
        this.logger.info('開始銷毀結果處理器');
        this.logger.info('結果處理器銷毀完成');
    }
}

module.exports = { ResultProcessor };
