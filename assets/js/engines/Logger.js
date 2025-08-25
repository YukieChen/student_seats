/**
 * Logger.js - 結構化日誌系統
 * 
 * @fileoverview 結構化日誌系統的完整實現，提供多級別的日誌記錄功能
 * @version 3.0.0
 * @author Student Seats System Team
 * @since 2023-11-01
 */

/**
 * 結構化日誌系統類別
 * 提供多級別的日誌記錄功能，支持控制台輸出和歷史記錄
 * 
 * @class Logger
 * @description 日誌系統的主要類別，負責記錄和管理系統日誌
 * 
 * @example
 * const logger = new Logger('INFO');
 * 
 * // 記錄不同級別的日誌
 * logger.info('UserAction', 'User logged in', { userId: 123 });
 * logger.error('SystemError', 'Database connection failed', { error: 'timeout' });
 * 
 * // 獲取日誌歷史
 * const history = logger.getLogHistory();
 * 
 * @since 1.0.0
 * @version 3.0.0
 */
class Logger {
    /**
     * 創建日誌記錄器實例
     * 
     * @param {string} [level='INFO'] - 日誌級別，可選值：ERROR, WARN, INFO, DEBUG, TRACE
     * 
     * @example
     * const logger = new Logger('DEBUG');
     * const errorLogger = new Logger('ERROR');
     * 
     * @throws {Error} 當日誌級別無效時拋出錯誤
     * @since 1.0.0
     */
    constructor(level = 'INFO') {
        this.level = level;
        this.levels = {
            ERROR: 0,
            WARN: 1,
            INFO: 2,
            DEBUG: 3,
            TRACE: 4
        };
        this.logHistory = [];
        this.maxHistorySize = 1000;
        this.enableConsole = true;
        this.enableHistory = true;
    }

    /**
     * 記錄日誌
     * @param {string} level - 日誌級別
     * @param {string} category - 分類
     * @param {string} message - 消息
     * @param {Object} data - 額外數據
     */
    log(level, category, message, data = null) {
        if (this.levels[level] <= this.levels[this.level]) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                category,
                message,
                data,
                id: this.generateLogId()
            };

            // 添加到歷史記錄
            if (this.enableHistory) {
                this.logHistory.push(logEntry);
                if (this.logHistory.length > this.maxHistorySize) {
                    this.logHistory.shift();
                }
            }

            // 輸出到控制台
            if (this.enableConsole) {
                this.outputToConsole(logEntry);
            }
        }
    }

    /**
     * 生成日誌ID
     */
    generateLogId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * 輸出到控制台
     */
    outputToConsole(logEntry) {
        const { level, category, message, data } = logEntry;
        const prefix = `[${logEntry.timestamp}] ${level} [${category}]`;

        switch (level) {
            case 'ERROR':
                console.error(`${prefix}: ${message}`, data);
                break;
            case 'WARN':
                console.warn(`${prefix}: ${message}`, data);
                break;
            case 'INFO':
                console.info(`${prefix}: ${message}`, data);
                break;
            case 'DEBUG':
            case 'TRACE':
                console.log(`${prefix}: ${message}`, data);
                break;
        }
    }

    /**
     * 錯誤日誌
     */
    error(category, message, data = null) {
        this.log('ERROR', category, message, data);
    }

    /**
     * 警告日誌
     */
    warn(category, message, data = null) {
        this.log('WARN', category, message, data);
    }

    /**
     * 信息日誌
     */
    info(category, message, data = null) {
        this.log('INFO', category, message, data);
    }

    /**
     * 調試日誌
     */
    debug(category, message, data = null) {
        this.log('DEBUG', category, message, data);
    }

    /**
     * 追蹤日誌
     */
    trace(category, message, data = null) {
        this.log('TRACE', category, message, data);
    }

    /**
     * 性能日誌
     */
    performance(category, operation, duration, data = null) {
        this.log('INFO', category, `${operation} 完成，耗時 ${duration}ms`, data);
    }

    /**
     * 獲取日誌歷史
     */
    getHistory(level = null, category = null, limit = null) {
        let filtered = this.logHistory;

        if (level) {
            filtered = filtered.filter(entry => entry.level === level);
        }

        if (category) {
            filtered = filtered.filter(entry => entry.category === category);
        }

        if (limit) {
            filtered = filtered.slice(-limit);
        }

        return filtered;
    }

    /**
     * 獲取錯誤日誌
     */
    getErrors(limit = null) {
        return this.getHistory('ERROR', null, limit);
    }

    /**
     * 獲取性能統計
     */
    getPerformanceStats() {
        const performanceLogs = this.logHistory.filter(entry =>
            entry.message.includes('耗時')
        );

        if (performanceLogs.length === 0) {
            return { count: 0, average: 0, min: 0, max: 0 };
        }

        const durations = performanceLogs.map(entry => {
            const match = entry.message.match(/耗時 (\d+)ms/);
            return match ? parseInt(match[1]) : 0;
        });

        const sum = durations.reduce((a, b) => a + b, 0);
        const average = sum / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        return {
            count: performanceLogs.length,
            average: Math.round(average),
            min,
            max
        };
    }

    /**
     * 清理日誌歷史
     */
    clearHistory() {
        this.logHistory = [];
    }

    /**
     * 設置日誌級別
     */
    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
        } else {
            this.error('Logger', `無效的日誌級別: ${level}`);
        }
    }

    /**
     * 啟用/禁用控制台輸出
     */
    setConsoleOutput(enabled) {
        this.enableConsole = enabled;
    }

    /**
     * 啟用/禁用歷史記錄
     */
    setHistoryEnabled(enabled) {
        this.enableHistory = enabled;
    }

    /**
     * 設置最大歷史記錄大小
     */
    setMaxHistorySize(size) {
        this.maxHistorySize = size;
        if (this.logHistory.length > size) {
            this.logHistory = this.logHistory.slice(-size);
        }
    }

    /**
     * 導出日誌
     */
    exportLogs(format = 'json') {
        switch (format) {
            case 'json':
                return JSON.stringify(this.logHistory, null, 2);
            case 'csv':
                return this.exportToCSV();
            case 'text':
                return this.exportToText();
            default:
                throw new Error(`不支持的導出格式: ${format}`);
        }
    }

    /**
     * 導出為CSV格式
     */
    exportToCSV() {
        const headers = ['timestamp', 'level', 'category', 'message', 'data'];
        const csv = [headers.join(',')];

        this.logHistory.forEach(entry => {
            const row = [
                entry.timestamp,
                entry.level,
                entry.category,
                `"${entry.message.replace(/"/g, '""')}"`,
                entry.data ? `"${JSON.stringify(entry.data).replace(/"/g, '""')}"` : ''
            ];
            csv.push(row.join(','));
        });

        return csv.join('\n');
    }

    /**
     * 導出為文本格式
     */
    exportToText() {
        return this.logHistory.map(entry =>
            `[${entry.timestamp}] ${entry.level} [${entry.category}]: ${entry.message}`
        ).join('\n');
    }

    // ==================== 性能監控增強 ====================

    /**
     * 監控記憶體使用情況
     */
    monitorMemory() {
        if (typeof performance !== 'undefined' && performance.memory) {
            const memory = performance.memory;
            const memoryInfo = {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit * 100).toFixed(2)
            };

            this.info('Memory', '記憶體使用監控', memoryInfo);
            return memoryInfo;
        } else {
            this.warn('Memory', '無法獲取記憶體信息 - performance.memory 不可用');
            return null;
        }
    }

    /**
     * 監控CPU使用情況（基於時間測量）
     */
    monitorCPU() {
        const startTime = performance.now();

        // 執行一個小的計算任務來測量CPU性能
        let result = 0;
        for (let i = 0; i < 1000000; i++) {
            result += Math.sqrt(i);
        }

        const endTime = performance.now();
        const executionTime = endTime - startTime;

        const cpuInfo = {
            executionTime: executionTime.toFixed(2),
            performance: executionTime < 10 ? 'excellent' : executionTime < 50 ? 'good' : 'poor'
        };

        this.info('CPU', 'CPU性能監控', cpuInfo);
        return cpuInfo;
    }

    /**
     * 監控網路請求情況
     */
    monitorNetwork() {
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            const navigationEntries = performance.getEntriesByType('navigation');
            const resourceEntries = performance.getEntriesByType('resource');

            const networkInfo = {
                navigationCount: navigationEntries.length,
                resourceCount: resourceEntries.length,
                totalRequests: navigationEntries.length + resourceEntries.length,
                averageLoadTime: this.calculateAverageLoadTime(resourceEntries)
            };

            this.info('Network', '網路請求監控', networkInfo);
            return networkInfo;
        } else {
            this.warn('Network', '無法獲取網路信息 - performance API 不可用');
            return null;
        }
    }

    /**
     * 計算平均載入時間
     */
    calculateAverageLoadTime(entries) {
        if (entries.length === 0) return 0;

        const totalTime = entries.reduce((sum, entry) => {
            return sum + (entry.duration || 0);
        }, 0);

        return (totalTime / entries.length).toFixed(2);
    }

    // ==================== 日誌過濾功能 ====================

    /**
     * 按級別過濾日誌
     */
    filterByLevel(level) {
        return this.logHistory.filter(entry => entry.level === level);
    }

    /**
     * 按分類過濾日誌
     */
    filterByCategory(category) {
        return this.logHistory.filter(entry => entry.category === category);
    }

    /**
     * 按時間範圍過濾日誌
     */
    filterByTime(startTime, endTime) {
        const start = new Date(startTime);
        const end = new Date(endTime);

        return this.logHistory.filter(entry => {
            const entryTime = new Date(entry.timestamp);
            return entryTime >= start && entryTime <= end;
        });
    }

    /**
     * 按關鍵字過濾日誌
     */
    filterByKeyword(keyword) {
        const lowerKeyword = keyword.toLowerCase();
        return this.logHistory.filter(entry =>
            entry.message.toLowerCase().includes(lowerKeyword) ||
            entry.category.toLowerCase().includes(lowerKeyword) ||
            (entry.data && JSON.stringify(entry.data).toLowerCase().includes(lowerKeyword))
        );
    }

    /**
     * 組合過濾日誌
     */
    filterLogs(options = {}) {
        let filtered = this.logHistory;

        if (options.level) {
            filtered = filtered.filter(entry => entry.level === options.level);
        }

        if (options.category) {
            filtered = filtered.filter(entry => entry.category === options.category);
        }

        if (options.startTime && options.endTime) {
            const start = new Date(options.startTime);
            const end = new Date(options.endTime);
            filtered = filtered.filter(entry => {
                const entryTime = new Date(entry.timestamp);
                return entryTime >= start && entryTime <= end;
            });
        }

        if (options.keyword) {
            const lowerKeyword = options.keyword.toLowerCase();
            filtered = filtered.filter(entry =>
                entry.message.toLowerCase().includes(lowerKeyword) ||
                entry.category.toLowerCase().includes(lowerKeyword) ||
                (entry.data && JSON.stringify(entry.data).toLowerCase().includes(lowerKeyword))
            );
        }

        return filtered;
    }

    /**
     * 獲取日誌歷史
     * @returns {Array} 日誌歷史記錄
     */
    getLogs() {
        return [...this.logHistory];
    }

    /**
     * 獲取日誌統計
     * @returns {Object} 日誌統計信息
     */
    getLogStats() {
        const stats = {
            total: this.logHistory.length,
            byLevel: {},
            byCategory: {},
            recent: this.logHistory.slice(-10)
        };

        // 按級別統計
        this.logHistory.forEach(entry => {
            stats.byLevel[entry.level] = (stats.byLevel[entry.level] || 0) + 1;
        });

        // 按分類統計
        this.logHistory.forEach(entry => {
            stats.byCategory[entry.category] = (stats.byCategory[entry.category] || 0) + 1;
        });

        return stats;
    }
}

module.exports = { Logger };
