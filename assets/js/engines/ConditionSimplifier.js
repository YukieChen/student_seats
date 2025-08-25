/**
 * 條件簡化模組
 * 負責檢測和處理條件中的冗餘、矛盾、等價等問題
 * 提供條件優化建議和報告
 */

const { Logger } = require('./Logger.js');

class ConditionSimplifier {
    constructor() {
        this.logger = new Logger('ConditionSimplifier');
        this.conditions = [];
        this.simplificationStats = {
            totalConditions: 0,
            redundantRemoved: 0,
            contradictionsFound: 0,
            equivalentGroups: 0,
            complexConditions: 0,
            processingTime: 0
        };
    }

    /**
     * 初始化條件簡化器
     * @param {Array} conditions 條件列表
     */
    initialize(conditions = []) {
        this.conditions = [...conditions];
        this.simplificationStats = {
            totalConditions: conditions.length,
            redundantRemoved: 0,
            contradictionsFound: 0,
            equivalentGroups: 0,
            complexConditions: 0,
            processingTime: 0
        };
        
        this.logger.info('條件簡化器初始化完成', { conditionCount: conditions.length });
    }

    /**
     * 執行完整的條件簡化流程
     * @returns {Object} 簡化結果
     */
    simplifyConditions() {
        const startTime = Date.now();
        this.logger.info('開始條件簡化流程');

        const result = {
            originalCount: this.conditions.length,
            simplifiedConditions: [],
            redundantRemoved: 0,
            contradictions: [],
            equivalenceGroups: [],
            complexConditions: [],
            suggestions: [],
            processingTime: 0
        };

        // 1. 移除冗餘條件
        const redundantResult = this.removeRedundantConditions();
        result.redundantRemoved = redundantResult.removedCount;
        result.simplifiedConditions = redundantResult.conditions;

        // 2. 檢測矛盾條件
        result.contradictions = this.detectContradictoryConditions();

        // 3. 檢測等價條件
        result.equivalenceGroups = this.checkConditionEquivalence();

        // 4. 檢測複雜條件
        result.complexConditions = this.findComplexConditions();

        // 5. 生成優化建議
        result.suggestions = this.suggestConditionOptimization();

        result.processingTime = Date.now() - startTime;
        this.simplificationStats.processingTime = result.processingTime;

        this.logger.info('條件簡化流程完成', {
            originalCount: result.originalCount,
            finalCount: result.simplifiedConditions.length,
            processingTime: result.processingTime
        });

        return result;
    }

    /**
     * 冗餘條件移除
     * @returns {Object} 移除結果
     */
    removeRedundantConditions() {
        const nonRedundantConditions = [];
        const processedConditions = new Set();
        let removedCount = 0;
        
        for (let i = 0; i < this.conditions.length; i++) {
            const currentCondition = this.conditions[i];
            const conditionKey = this.generateConditionKey(currentCondition);
            
            if (processedConditions.has(conditionKey)) {
                removedCount++;
                continue;
            }
            
            if (!this.isConditionRedundant(currentCondition, i)) {
                nonRedundantConditions.push(currentCondition);
                processedConditions.add(conditionKey);
            } else {
                removedCount++;
            }
        }
        
        this.simplificationStats.redundantRemoved = removedCount;
        this.logger.info('冗餘條件移除完成', { removedCount, remainingCount: nonRedundantConditions.length });
        
        return {
            conditions: nonRedundantConditions,
            removedCount: removedCount
        };
    }

    /**
     * 生成條件鍵
     * @param {Object} condition 條件對象
     * @returns {string} 條件鍵
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
     * @param {Object} condition 條件對象
     * @param {number} currentIndex 當前索引
     * @returns {boolean} 是否冗餘
     */
    isConditionRedundant(condition, currentIndex) {
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否冗餘
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否冗餘
     */
    areAdjacentConditionsRedundant(condition1, condition2) {
        const pairs1 = new Set(condition1.students.map(pair => pair.sort().join(',')));
        const pairs2 = new Set(condition2.students.map(pair => pair.sort().join(',')));
        
        for (const pair of pairs1) {
            if (pairs2.has(pair)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 檢查指定群組條件是否冗餘
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否冗餘
     */
    areAssignGroupConditionsRedundant(condition1, condition2) {
        if (condition1.group !== condition2.group) {
            return false;
        }
        
        const students1 = new Set(condition1.students.flat());
        const students2 = new Set(condition2.students.flat());
        
        for (const student of students1) {
            if (students2.has(student)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 檢查群組區域條件是否冗餘
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否冗餘
     */
    areGroupAreaConditionsRedundant(condition1, condition2) {
        const students1 = new Set(condition1.students);
        const students2 = new Set(condition2.students);
        
        for (const student of students1) {
            if (students2.has(student)) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * 矛盾條件檢測
     * @returns {Array} 矛盾條件列表
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
        
        this.simplificationStats.contradictionsFound = contradictions.length;
        this.logger.info('矛盾條件檢測完成', { contradictionCount: contradictions.length });
        
        return contradictions;
    }

    /**
     * 檢查兩個條件是否矛盾
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {Object|null} 矛盾信息
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
     * @param {Object} adjacentCondition 相鄰條件
     * @param {Object} notAdjacentCondition 不相鄰條件
     * @returns {Object|null} 矛盾信息
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {Object|null} 矛盾信息
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
     * 條件等價性檢查
     * @returns {Array} 等價條件組
     */
    checkConditionEquivalence() {
        const equivalenceGroups = [];
        const processed = new Set();
        
        for (let i = 0; i < this.conditions.length; i++) {
            if (processed.has(i)) continue;
            
            const currentCondition = this.conditions[i];
            const equivalentConditions = [currentCondition];
            processed.add(i);
            
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
        
        this.simplificationStats.equivalentGroups = equivalenceGroups.length;
        this.logger.info('條件等價性檢查完成', { equivalenceGroupCount: equivalenceGroups.length });
        
        return equivalenceGroups;
    }

    /**
     * 檢查兩個條件是否等價
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否等價
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否等價
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否等價
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
     * @param {Object} condition1 條件1
     * @param {Object} condition2 條件2
     * @returns {boolean} 是否等價
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
     * 尋找複雜條件
     * @returns {Array} 複雜條件列表
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
        
        this.simplificationStats.complexConditions = complex.length;
        this.logger.info('複雜條件檢測完成', { complexConditionCount: complex.length });
        
        return complex;
    }

    /**
     * 計算條件複雜度
     * @param {Object} condition 條件對象
     * @returns {number} 複雜度分數
     */
    calculateConditionComplexity(condition) {
        let complexity = 0;
        
        // 基礎複雜度
        complexity += 1;
        
        // 學生數量影響
        if (condition.students) {
            complexity += condition.students.length * 2;
        }
        
        // 條件類型影響
        switch (condition.type) {
            case 'adjacent':
            case 'not_adjacent':
                complexity += 3;
                break;
            case 'assign_group':
                complexity += 5;
                break;
            case 'group_area':
                complexity += 4;
                break;
            default:
                complexity += 2;
        }
        
        // 額外屬性影響
        if (condition.group) complexity += 2;
        if (condition.seat) complexity += 2;
        if (condition.priority) complexity += 1;
        
        return complexity;
    }

    /**
     * 條件優化建議
     * @returns {Array} 優化建議列表
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
     * @returns {Array} 冗餘條件列表
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
     * 生成條件優化報告
     * @returns {Object} 優化報告
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
            recommendations: this.generateOptimizationRecommendations(summary),
            statistics: this.simplificationStats
        };
    }

    /**
     * 生成優化建議
     * @param {Object} summary 摘要信息
     * @returns {Array} 建議列表
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

    /**
     * 獲取簡化統計
     * @returns {Object} 統計信息
     */
    getSimplificationStats() {
        return { ...this.simplificationStats };
    }

    /**
     * 重置統計
     */
    resetStats() {
        this.simplificationStats = {
            totalConditions: 0,
            redundantRemoved: 0,
            contradictionsFound: 0,
            equivalentGroups: 0,
            complexConditions: 0,
            processingTime: 0
        };
    }

    /**
     * 清理資源
     */
    dispose() {
        this.conditions = [];
        this.resetStats();
        this.logger.info('條件簡化器資源已清理');
    }
}

module.exports = { ConditionSimplifier };
