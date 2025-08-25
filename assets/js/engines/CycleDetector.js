// CycleDetector.js - 循環檢測系統
export class CycleDetector {
    constructor(options = {}) {
        this.options = {
            maxHistorySize: options.maxHistorySize || 1000,
            cycleDetectionThreshold: options.cycleDetectionThreshold || 3,
            enableDetailedLogging: options.enableDetailedLogging !== false,
            enableAutoCleanup: options.enableAutoCleanup !== false,
            ...options
        };

        // 歷史記錄配置
        this.HISTORY_CONFIG = {
            MAX_ENTRIES: this.options.maxHistorySize,
            CLEANUP_INTERVAL: 100, // 每100次操作清理一次
            CYCLE_THRESHOLD: this.options.cycleDetectionThreshold,
            PATTERN_WINDOW: 10 // 檢測循環的模式窗口大小
        };

        // 初始化數據結構
        this.adjustmentHistory = [];
        this.cyclePatterns = new Map();
        this.cycleCount = 0;
        this.operationCount = 0;
        this.lastCleanupCount = 0;
    }

    /**
     * 記錄調整操作
     * @param {string} studentId 學生ID
     * @param {string} seatId 座位ID
     * @param {string} reason 調整原因
     * @param {Object} context 上下文信息
     */
    recordAdjustment(studentId, seatId, reason, context = {}) {
        const record = {
            timestamp: Date.now(),
            studentId,
            seatId,
            reason,
            context,
            operationId: ++this.operationCount
        };

        this.addToHistory(record);

        // 自動清理
        if (this.options.enableAutoCleanup && 
            this.operationCount - this.lastCleanupCount >= this.HISTORY_CONFIG.CLEANUP_INTERVAL) {
            this.cleanHistory();
        }

        return record;
    }

    /**
     * 檢測循環
     * @param {string} studentId 學生ID
     * @param {string} seatId 座位ID
     * @returns {Object} 循環檢測結果
     */
    detectCycle(studentId, seatId) {
        const key = `${studentId}-${seatId}`;
        const recentHistory = this.getRecentHistory(this.HISTORY_CONFIG.PATTERN_WINDOW);
        
        // 檢查是否在最近的歷史中出現過相同的組合
        const occurrences = recentHistory.filter(record => 
            record.studentId === studentId && record.seatId === seatId
        ).length;

        const isCycle = occurrences >= this.HISTORY_CONFIG.CYCLE_THRESHOLD;
        
        if (isCycle) {
            this.cycleCount++;
            this.cyclePatterns.set(key, {
                studentId,
                seatId,
                occurrences,
                firstSeen: this.findFirstOccurrence(studentId, seatId),
                lastSeen: Date.now(),
                cycleCount: this.cycleCount
            });
        }

        return {
            isCycle,
            occurrences,
            pattern: isCycle ? this.cyclePatterns.get(key) : null,
            confidence: this.calculateCycleConfidence(occurrences)
        };
    }

    /**
     * 避免循環
     * @param {string} studentId 學生ID
     * @param {string} seatId 座位ID
     * @returns {Object} 避免策略
     */
    avoidCycle(studentId, seatId) {
        const cycleResult = this.detectCycle(studentId, seatId);
        
        if (!cycleResult.isCycle) {
            return {
                shouldAvoid: false,
                reason: '無循環檢測'
            };
        }

        // 根據循環嚴重程度決定避免策略
        const strategy = this.selectAvoidanceStrategy(cycleResult);
        
        return {
            shouldAvoid: true,
            reason: `檢測到循環模式，發生次數: ${cycleResult.occurrences}`,
            strategy,
            cycleInfo: cycleResult.pattern
        };
    }

    /**
     * 添加歷史記錄
     * @param {Object} record 記錄對象
     */
    addToHistory(record) {
        // 檢查歷史大小限制
        if (this.adjustmentHistory.length >= this.HISTORY_CONFIG.MAX_ENTRIES) {
            this.adjustmentHistory.shift(); // 移除最舊的記錄
        }

        // 添加新記錄
        this.adjustmentHistory.push(record);

        // 更新統計信息
        this.updateStatistics(record);
    }

    /**
     * 清理歷史記錄
     * @param {Object} options 清理選項
     */
    cleanHistory(options = {}) {
        const {
            maxAge = 24 * 60 * 60 * 1000, // 24小時
            keepRecent = 100 // 保留最近的記錄數
        } = options;

        const now = Date.now();
        const cutoffTime = now - maxAge;

        // 移除過期的記錄
        this.adjustmentHistory = this.adjustmentHistory.filter(record => 
            record.timestamp > cutoffTime
        );

        // 確保保留最近的記錄
        if (this.adjustmentHistory.length > keepRecent) {
            this.adjustmentHistory = this.adjustmentHistory.slice(-keepRecent);
        }

        this.lastCleanupCount = this.operationCount;

        return {
            removedCount: this.HISTORY_CONFIG.MAX_ENTRIES - this.adjustmentHistory.length,
            remainingCount: this.adjustmentHistory.length,
            cleanupTime: now
        };
    }

    /**
     * 查詢歷史記錄
     * @param {Object} filters 查詢過濾條件
     * @returns {Array} 過濾後的歷史記錄
     */
    queryHistory(filters = {}) {
        let results = [...this.adjustmentHistory];

        // 按學生ID過濾
        if (filters.studentId) {
            results = results.filter(record => record.studentId === filters.studentId);
        }

        // 按座位ID過濾
        if (filters.seatId) {
            results = results.filter(record => record.seatId === filters.seatId);
        }

        // 按時間範圍過濾
        if (filters.startTime) {
            results = results.filter(record => record.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            results = results.filter(record => record.timestamp <= filters.endTime);
        }

        // 按原因過濾
        if (filters.reason) {
            results = results.filter(record => record.reason === filters.reason);
        }

        // 排序
        if (filters.sortBy) {
            const sortField = filters.sortBy;
            const sortOrder = filters.sortOrder || 'desc';
            
            results.sort((a, b) => {
                if (sortOrder === 'asc') {
                    return a[sortField] - b[sortField];
                } else {
                    return b[sortField] - a[sortField];
                }
            });
        }

        // 限制結果數量
        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }

        return results;
    }

    /**
     * 統計循環次數
     * @returns {Object} 循環統計信息
     */
    countCycles() {
        const cycleStats = {
            totalCycles: this.cycleCount,
            cyclePatterns: this.cyclePatterns.size,
            mostFrequentPattern: this.findMostFrequentPattern(),
            cycleRate: this.calculateCycleRate(),
            recentCycles: this.countRecentCycles()
        };

        return cycleStats;
    }

    /**
     * 分析循環模式
     * @returns {Object} 循環分析結果
     */
    analyzeCycles() {
        const analysis = {
            patterns: Array.from(this.cyclePatterns.values()),
            studentCycles: this.analyzeStudentCycles(),
            seatCycles: this.analyzeSeatCycles(),
            timeDistribution: this.analyzeTimeDistribution(),
            recommendations: this.generateCycleRecommendations()
        };

        return analysis;
    }

    /**
     * 生成循環報告
     * @returns {Object} 循環報告
     */
    generateCycleReport() {
        const stats = this.countCycles();
        const analysis = this.analyzeCycles();
        
        return {
            summary: {
                totalOperations: this.operationCount,
                totalCycles: stats.totalCycles,
                cycleRate: stats.cycleRate,
                uniquePatterns: stats.cyclePatterns
            },
            details: {
                patterns: analysis.patterns,
                studentAnalysis: analysis.studentCycles,
                seatAnalysis: analysis.seatCycles,
                timeAnalysis: analysis.timeDistribution
            },
            recommendations: analysis.recommendations,
            timestamp: new Date().toISOString()
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 獲取最近的歷史記錄
     * @param {number} count 記錄數量
     * @returns {Array} 最近的歷史記錄
     */
    getRecentHistory(count) {
        return this.adjustmentHistory.slice(-count);
    }

    /**
     * 查找第一次出現的時間
     * @param {string} studentId 學生ID
     * @param {string} seatId 座位ID
     * @returns {number} 時間戳
     */
    findFirstOccurrence(studentId, seatId) {
        const firstRecord = this.adjustmentHistory.find(record => 
            record.studentId === studentId && record.seatId === seatId
        );
        return firstRecord ? firstRecord.timestamp : Date.now();
    }

    /**
     * 計算循環置信度
     * @param {number} occurrences 出現次數
     * @returns {number} 置信度 (0-1)
     */
    calculateCycleConfidence(occurrences) {
        return Math.min(occurrences / this.HISTORY_CONFIG.CYCLE_THRESHOLD, 1);
    }

    /**
     * 選擇避免策略
     * @param {Object} cycleResult 循環檢測結果
     * @returns {string} 避免策略
     */
    selectAvoidanceStrategy(cycleResult) {
        if (cycleResult.occurrences >= 5) {
            return 'BLOCK'; // 完全阻止
        } else if (cycleResult.occurrences >= 3) {
            return 'DELAY'; // 延遲重試
        } else {
            return 'WARN'; // 警告
        }
    }

    /**
     * 更新統計信息
     * @param {Object} record 記錄對象
     */
    updateStatistics(record) {
        // 這裡可以添加更詳細的統計邏輯
        // 例如：按學生、座位、原因等分類統計
    }

    /**
     * 查找最頻繁的模式
     * @returns {Object|null} 最頻繁的模式
     */
    findMostFrequentPattern() {
        if (this.cyclePatterns.size === 0) return null;

        let maxOccurrences = 0;
        let mostFrequent = null;

        for (const [key, pattern] of this.cyclePatterns) {
            if (pattern.occurrences > maxOccurrences) {
                maxOccurrences = pattern.occurrences;
                mostFrequent = pattern;
            }
        }

        return mostFrequent;
    }

    /**
     * 計算循環率
     * @returns {number} 循環率
     */
    calculateCycleRate() {
        return this.operationCount > 0 ? this.cycleCount / this.operationCount : 0;
    }

    /**
     * 統計最近的循環
     * @returns {number} 最近的循環次數
     */
    countRecentCycles() {
        const recentWindow = 100; // 最近100次操作
        const recentHistory = this.getRecentHistory(recentWindow);
        
        // 這裡需要實現更複雜的循環檢測邏輯
        // 暫時返回一個簡單的估計
        return Math.floor(this.cycleCount * (recentWindow / this.operationCount));
    }

    /**
     * 分析學生循環
     * @returns {Object} 學生循環分析
     */
    analyzeStudentCycles() {
        const studentCycles = new Map();
        
        for (const pattern of this.cyclePatterns.values()) {
            const studentId = pattern.studentId;
            if (!studentCycles.has(studentId)) {
                studentCycles.set(studentId, []);
            }
            studentCycles.get(studentId).push(pattern);
        }

        return Object.fromEntries(studentCycles);
    }

    /**
     * 分析座位循環
     * @returns {Object} 座位循環分析
     */
    analyzeSeatCycles() {
        const seatCycles = new Map();
        
        for (const pattern of this.cyclePatterns.values()) {
            const seatId = pattern.seatId;
            if (!seatCycles.has(seatId)) {
                seatCycles.set(seatId, []);
            }
            seatCycles.get(seatId).push(pattern);
        }

        return Object.fromEntries(seatCycles);
    }

    /**
     * 分析時間分布
     * @returns {Object} 時間分布分析
     */
    analyzeTimeDistribution() {
        const timeSlots = {
            '0-1h': 0,
            '1-6h': 0,
            '6-24h': 0,
            '>24h': 0
        };

        const now = Date.now();
        
        for (const pattern of this.cyclePatterns.values()) {
            const duration = now - pattern.firstSeen;
            const hours = duration / (1000 * 60 * 60);
            
            if (hours <= 1) timeSlots['0-1h']++;
            else if (hours <= 6) timeSlots['1-6h']++;
            else if (hours <= 24) timeSlots['6-24h']++;
            else timeSlots['>24h']++;
        }

        return timeSlots;
    }

    /**
     * 生成循環建議
     * @returns {Array} 建議列表
     */
    generateCycleRecommendations() {
        const recommendations = [];
        
        if (this.cycleCount > 0) {
            recommendations.push({
                type: 'HIGH_CYCLE_RATE',
                priority: 'HIGH',
                description: '檢測到較高的循環率，建議檢查算法邏輯',
                suggestion: '考慮增加隨機性或調整優先級策略'
            });
        }

        if (this.cyclePatterns.size > 10) {
            recommendations.push({
                type: 'MANY_PATTERNS',
                priority: 'MEDIUM',
                description: '存在多種循環模式',
                suggestion: '分析循環模式，優化座位分配策略'
            });
        }

        if (this.calculateCycleRate() > 0.1) {
            recommendations.push({
                type: 'EXCESSIVE_CYCLES',
                priority: 'CRITICAL',
                description: '循環率過高，可能導致性能問題',
                suggestion: '立即檢查並修正算法邏輯'
            });
        }

        return recommendations;
    }

    /**
     * 清理資源
     */
    clear() {
        this.adjustmentHistory = [];
        this.cyclePatterns.clear();
        this.cycleCount = 0;
        this.operationCount = 0;
        this.lastCleanupCount = 0;
    }
}
