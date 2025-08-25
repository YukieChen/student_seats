/**
 * 緩存監控模組
 * 負責緩存的性能監控、報告生成、警報等功能
 */

const { Logger } = require('./Logger.js');

class CacheMonitor {
    constructor(options = {}) {
        this.logger = new Logger('CacheMonitor');
        this.options = {
            maxCacheSize: options.maxCacheSize || 1000,
            warningThresholds: {
                hitRate: 0.6,
                utilization: 0.9,
                compressionRatio: 0.1
            },
            criticalThresholds: {
                hitRate: 0.5,
                utilization: 0.95,
                compressionRatio: 0.05
            },
            ...options
        };
        this.monitoringHistory = [];
    }

    /**
     * 緩存命中率監控
     */
    monitorHitRate(conditionCache, seatScoreCache, specialSeatCache) {
        const stats = this.getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache);
        const hitRate = stats.conditionCache.hitRate;

        const monitoringResult = {
            currentHitRate: hitRate,
            hitRateTrend: this.calculateHitRateTrend(),
            targetHitRate: 0.8,
            performance: {
                excellent: hitRate >= 0.8,
                good: hitRate >= 0.6 && hitRate < 0.8,
                poor: hitRate < 0.6
            },
            recommendations: this.generateHitRateRecommendations(hitRate),
            alerts: this.generateHitRateAlerts(hitRate)
        };

        this.logger.info('命中率監控完成', {
            currentHitRate: hitRate,
            performance: monitoringResult.performance
        });

        return monitoringResult;
    }

    /**
     * 計算命中率趨勢
     */
    calculateHitRateTrend() {
        if (this.monitoringHistory.length < 2) {
            return 'stable';
        }

        const recent = this.monitoringHistory.slice(-3);
        const older = this.monitoringHistory.slice(-6, -3);
        
        if (recent.length === 0 || older.length === 0) {
            return 'stable';
        }

        const recentAvg = recent.reduce((sum, record) => sum + record.hitRate, 0) / recent.length;
        const olderAvg = older.reduce((sum, record) => sum + record.hitRate, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) {
            return 'increasing';
        } else if (recentAvg < olderAvg * 0.9) {
            return 'decreasing';
        }
        
        return 'stable';
    }

    /**
     * 生成命中率建議
     */
    generateHitRateRecommendations(hitRate) {
        const recommendations = [];

        if (hitRate < 0.5) {
            recommendations.push('命中率過低，建議增加緩存大小');
            recommendations.push('考慮優化緩存鍵生成策略');
            recommendations.push('檢查緩存清理策略是否過於激進');
        } else if (hitRate < 0.7) {
            recommendations.push('命中率中等，建議調整緩存清理策略');
            recommendations.push('考慮實施緩存預熱');
        } else if (hitRate >= 0.8) {
            recommendations.push('命中率良好，可以考慮減少緩存大小以節省記憶體');
        }

        return recommendations;
    }

    /**
     * 生成命中率警報
     */
    generateHitRateAlerts(hitRate) {
        const alerts = [];

        if (hitRate < this.options.criticalThresholds.hitRate) {
            alerts.push({
                level: 'critical',
                message: '緩存命中率嚴重不足，嚴重影響性能',
                action: '立即檢查緩存策略和系統配置',
                value: hitRate,
                threshold: this.options.criticalThresholds.hitRate
            });
        } else if (hitRate < this.options.warningThresholds.hitRate) {
            alerts.push({
                level: 'warning',
                message: '緩存命中率偏低，建議優化',
                action: '考慮調整緩存大小或清理策略',
                value: hitRate,
                threshold: this.options.warningThresholds.hitRate
            });
        }

        return alerts;
    }

    /**
     * 緩存大小監控
     */
    monitorCacheSize(conditionCache, seatScoreCache, specialSeatCache) {
        const stats = this.getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache);
        const utilization = stats.totalSize / stats.maxSize;

        const monitoringResult = {
            currentSize: stats.totalSize,
            maxSize: stats.maxSize,
            utilization: utilization,
            performance: {
                optimal: utilization >= 0.7 && utilization <= 0.9,
                underutilized: utilization < 0.7,
                overutilized: utilization > 0.9
            },
            recommendations: this.generateSizeRecommendations(utilization),
            alerts: this.generateSizeAlerts(utilization)
        };

        this.logger.info('緩存大小監控完成', {
            utilization: utilization,
            performance: monitoringResult.performance
        });

        return monitoringResult;
    }

    /**
     * 生成大小建議
     */
    generateSizeRecommendations(utilization) {
        const recommendations = [];

        if (utilization < 0.5) {
            recommendations.push('緩存利用率過低，可以考慮減少緩存大小');
            recommendations.push('檢查是否有不必要的緩存項');
        } else if (utilization > 0.95) {
            recommendations.push('緩存接近滿載，建議增加緩存大小或調整清理策略');
            recommendations.push('考慮實施更激進的清理策略');
        }

        return recommendations;
    }

    /**
     * 生成大小警報
     */
    generateSizeAlerts(utilization) {
        const alerts = [];

        if (utilization > this.options.criticalThresholds.utilization) {
            alerts.push({
                level: 'critical',
                message: '緩存接近滿載，可能導致性能下降',
                action: '立即增加緩存大小或清理策略',
                value: utilization,
                threshold: this.options.criticalThresholds.utilization
            });
        } else if (utilization > this.options.warningThresholds.utilization) {
            alerts.push({
                level: 'warning',
                message: '緩存利用率較高',
                action: '考慮調整緩存大小或清理策略',
                value: utilization,
                threshold: this.options.warningThresholds.utilization
            });
        }

        return alerts;
    }

    /**
     * 緩存性能監控
     */
    monitorCachePerformance(conditionCache, seatScoreCache, specialSeatCache) {
        const hitRate = this.monitorHitRate(conditionCache, seatScoreCache, specialSeatCache);
        const size = this.monitorCacheSize(conditionCache, seatScoreCache, specialSeatCache);
        const compression = this.monitorCompressionPerformance();

        const performanceResult = {
            hitRate,
            size,
            compression,
            overallPerformance: this.calculateOverallPerformance(hitRate, size, compression),
            alerts: this.generatePerformanceAlerts(hitRate, size, compression),
            timestamp: new Date().toISOString()
        };

        // 記錄監控歷史
        this.monitoringHistory.push({
            timestamp: new Date().toISOString(),
            hitRate: hitRate.currentHitRate,
            utilization: size.utilization,
            overallScore: performanceResult.overallPerformance.score
        });

        // 保持歷史記錄在合理範圍內
        if (this.monitoringHistory.length > 100) {
            this.monitoringHistory = this.monitoringHistory.slice(-50);
        }

        this.logger.info('緩存性能監控完成', {
            overallScore: performanceResult.overallPerformance.score,
            grade: performanceResult.overallPerformance.grade,
            alertCount: performanceResult.alerts.length
        });

        return performanceResult;
    }

    /**
     * 計算整體性能
     */
    calculateOverallPerformance(hitRate, size, compression) {
        let score = 0;

        // 命中率權重 50%
        if (hitRate.currentHitRate >= 0.8) score += 50;
        else if (hitRate.currentHitRate >= 0.6) score += 30;
        else score += 10;

        // 大小利用率權重 30%
        if (size.utilization >= 0.7 && size.utilization <= 0.9) score += 30;
        else if (size.utilization >= 0.5 && size.utilization <= 0.95) score += 20;
        else score += 10;

        // 壓縮效率權重 20%
        if (compression.averageCompressionRatio >= 0.3) score += 20;
        else if (compression.averageCompressionRatio >= 0.1) score += 10;
        else score += 5;

        return {
            score,
            grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
            breakdown: {
                hitRateScore: score >= 50 ? 50 : score >= 30 ? 30 : 10,
                sizeScore: score >= 30 ? 30 : score >= 20 ? 20 : 10,
                compressionScore: score >= 20 ? 20 : score >= 10 ? 10 : 5
            }
        };
    }

    /**
     * 生成性能警報
     */
    generatePerformanceAlerts(hitRate, size, compression) {
        const alerts = [];

        // 命中率警報
        alerts.push(...hitRate.alerts);

        // 大小警報
        alerts.push(...size.alerts);

        // 壓縮警報
        if (compression.averageCompressionRatio < this.options.criticalThresholds.compressionRatio) {
            alerts.push({
                level: 'warning',
                message: '壓縮效率過低',
                action: '考慮優化壓縮算法或禁用壓縮',
                value: compression.averageCompressionRatio,
                threshold: this.options.criticalThresholds.compressionRatio
            });
        }

        return alerts;
    }

    /**
     * 壓縮性能監控
     */
    monitorCompressionPerformance() {
        const stats = {
            totalCompressions: 0,
            averageCompressionTime: 0,
            averageCompressionRatio: 0.2, // 模擬數據
            totalCompressedSize: 0,
            totalOriginalSize: 0
        };

        return stats;
    }

    /**
     * 緩存報告
     */
    generateCacheReport(conditionCache, seatScoreCache, specialSeatCache) {
        const performance = this.monitorCachePerformance(conditionCache, seatScoreCache, specialSeatCache);
        const detailedStats = this.getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache);

        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalItems: detailedStats.totalSize,
                hitRate: detailedStats.conditionCache.hitRate,
                performanceGrade: performance.overallPerformance.grade,
                alerts: performance.alerts.length,
                utilization: detailedStats.totalSize / detailedStats.maxSize
            },
            performance,
            detailedStats,
            recommendations: this.generateOverallRecommendations(performance, detailedStats),
            trends: this.analyzeTrends(),
            metadata: {
                generatedBy: 'CacheMonitor',
                version: '1.0.0',
                monitoringHistorySize: this.monitoringHistory.length
            }
        };

        this.logger.info('緩存報告生成完成', {
            totalItems: report.summary.totalItems,
            performanceGrade: report.summary.performanceGrade,
            alertCount: report.summary.alerts
        });

        return report;
    }

    /**
     * 生成整體建議
     */
    generateOverallRecommendations(performance, detailedStats) {
        const recommendations = [];

        // 基於命中率的建議
        recommendations.push(...performance.hitRate.recommendations);

        // 基於大小的建議
        recommendations.push(...performance.size.recommendations);

        // 基於整體性能的建議
        if (performance.overallPerformance.score < 60) {
            recommendations.push('整體性能較差，建議全面優化緩存策略');
            recommendations.push('考慮重新設計緩存架構');
        } else if (performance.overallPerformance.score >= 80) {
            recommendations.push('整體性能優秀，可以考慮進一步優化以節省資源');
        }

        // 去重並排序
        return [...new Set(recommendations)];
    }

    /**
     * 分析趨勢
     */
    analyzeTrends() {
        if (this.monitoringHistory.length < 5) {
            return {
                hasEnoughData: false,
                message: '監控數據不足，無法分析趨勢'
            };
        }

        const recent = this.monitoringHistory.slice(-10);
        const older = this.monitoringHistory.slice(-20, -10);

        const hitRateTrend = this.calculateTrend(recent.map(r => r.hitRate), older.map(r => r.hitRate));
        const utilizationTrend = this.calculateTrend(recent.map(r => r.utilization), older.map(r => r.utilization));
        const scoreTrend = this.calculateTrend(recent.map(r => r.overallScore), older.map(r => r.overallScore));

        return {
            hasEnoughData: true,
            hitRateTrend,
            utilizationTrend,
            scoreTrend,
            recommendations: this.generateTrendRecommendations(hitRateTrend, utilizationTrend, scoreTrend)
        };
    }

    /**
     * 計算趨勢
     */
    calculateTrend(recent, older) {
        if (recent.length === 0 || older.length === 0) {
            return 'stable';
        }

        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

        if (recentAvg > olderAvg * 1.05) {
            return 'improving';
        } else if (recentAvg < olderAvg * 0.95) {
            return 'declining';
        }

        return 'stable';
    }

    /**
     * 生成趨勢建議
     */
    generateTrendRecommendations(hitRateTrend, utilizationTrend, scoreTrend) {
        const recommendations = [];

        if (hitRateTrend === 'declining') {
            recommendations.push('命中率呈下降趨勢，建議檢查緩存策略');
        } else if (hitRateTrend === 'improving') {
            recommendations.push('命中率呈上升趨勢，緩存優化效果良好');
        }

        if (utilizationTrend === 'declining') {
            recommendations.push('緩存利用率下降，可能表示緩存過大');
        } else if (utilizationTrend === 'improving') {
            recommendations.push('緩存利用率上升，表示緩存使用更有效');
        }

        if (scoreTrend === 'declining') {
            recommendations.push('整體性能下降，建議全面檢查緩存配置');
        } else if (scoreTrend === 'improving') {
            recommendations.push('整體性能提升，緩存優化策略有效');
        }

        return recommendations;
    }

    /**
     * 獲取詳細緩存統計信息
     */
    getDetailedCacheStats(conditionCache, seatScoreCache, specialSeatCache) {
        const totalHits = 0; // 這裡應該從實際的緩存統計中獲取
        const totalMisses = 0;
        
        return {
            conditionCache: {
                size: conditionCache.size,
                hits: totalHits,
                misses: totalMisses,
                hitRate: totalHits / (totalHits + totalMisses) || 0
            },
            seatScoreCache: {
                size: seatScoreCache.size
            },
            specialSeatCache: {
                size: specialSeatCache.size
            },
            totalSize: conditionCache.size + seatScoreCache.size + specialSeatCache.size,
            maxSize: this.options.maxCacheSize
        };
    }

    /**
     * 導出監控報告
     */
    exportReport(report, format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(report, null, 2);
            case 'csv':
                return this.convertToCSV(report);
            default:
                return JSON.stringify(report, null, 2);
        }
    }

    /**
     * 轉換為CSV格式
     */
    convertToCSV(report) {
        const headers = ['Timestamp', 'TotalItems', 'HitRate', 'PerformanceGrade', 'Alerts', 'Utilization'];
        const rows = [headers.join(',')];

        const row = [
            report.timestamp,
            report.summary.totalItems,
            report.summary.hitRate,
            report.summary.performanceGrade,
            report.summary.alerts,
            report.summary.utilization
        ].join(',');

        rows.push(row);
        return rows.join('\n');
    }

    /**
     * 重置監控歷史
     */
    resetMonitoringHistory() {
        this.monitoringHistory = [];
        this.logger.info('監控歷史已重置');
    }

    /**
     * 初始化監控器
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.resetMonitoringHistory();
        this.logger.info('緩存監控器初始化完成', this.options);
    }

    /**
     * 清理資源
     */
    dispose() {
        this.monitoringHistory = [];
        this.logger.info('緩存監控器資源已清理');
    }
}

module.exports = { CacheMonitor };
