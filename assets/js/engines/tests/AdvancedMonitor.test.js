/**
 * 高級監控系統測試
 */

const { AdvancedMonitor } = require('../AdvancedMonitor.js');

// 測試函數
async function testAdvancedMonitor() {
    console.log('開始測試 AdvancedMonitor...');
    
    try {
        // 1. 測試建構函式
        console.log('1. 測試建構函式...');
        const monitor = new AdvancedMonitor({
            enablePerformanceMonitoring: true,
            enableMemoryMonitoring: true,
            enableBottleneckDetection: true,
            monitoringInterval: 2000,
            cpuThreshold: 75,
            memoryThreshold: 80
        });
        
        if (monitor && monitor.logger && monitor.monitorConfig) {
            console.log('✅ 建構函式測試通過');
        } else {
            console.log('❌ 建構函式測試失敗');
            return false;
        }

        // 2. 測試性能瓶頸分析
        console.log('2. 測試性能瓶頸分析...');
        const performanceData = {
            cpuUsage: 85,
            memoryUsage: 90,
            executionTime: 6000,
            errorRate: 8
        };
        
        const bottleneckAnalysis = monitor.analyzePerformanceBottlenecks(performanceData);
        if (bottleneckAnalysis && bottleneckAnalysis.bottlenecks.length > 0) {
            console.log('✅ 性能瓶頸分析測試通過');
        } else {
            console.log('❌ 性能瓶頸分析測試失敗');
            return false;
        }

        // 3. 測試性能趨勢分析
        console.log('3. 測試性能趨勢分析...');
        const historicalData = [
            { cpuUsage: 50, memoryUsage: 60, executionTime: 2000, errorRate: 2 },
            { cpuUsage: 55, memoryUsage: 65, executionTime: 2200, errorRate: 2 },
            { cpuUsage: 60, memoryUsage: 70, executionTime: 2400, errorRate: 3 },
            { cpuUsage: 65, memoryUsage: 75, executionTime: 2600, errorRate: 3 },
            { cpuUsage: 70, memoryUsage: 80, executionTime: 2800, errorRate: 4 }
        ];
        
        const trendAnalysis = monitor.analyzePerformanceTrends(historicalData);
        if (trendAnalysis && trendAnalysis.overallTrend) {
            console.log('✅ 性能趨勢分析測試通過');
        } else {
            console.log('❌ 性能趨勢分析測試失敗');
            return false;
        }

        // 4. 測試性能異常檢測
        console.log('4. 測試性能異常檢測...');
        const currentData = {
            cpuUsage: 95,
            memoryUsage: 98,
            executionTime: 8000,
            errorRate: 15
        };
        
        const anomalyDetection = monitor.detectPerformanceAnomalies(currentData, historicalData);
        if (anomalyDetection && typeof anomalyDetection.detected === 'boolean') {
            console.log('✅ 性能異常檢測測試通過');
        } else {
            console.log('❌ 性能異常檢測測試失敗');
            return false;
        }

        // 5. 測試性能預測
        console.log('5. 測試性能預測...');
        const performancePrediction = monitor.predictPerformanceIssues(historicalData);
        if (performancePrediction && performancePrediction.riskLevel) {
            console.log('✅ 性能預測測試通過');
        } else {
            console.log('❌ 性能預測測試失敗');
            return false;
        }

        // 6. 測試內存使用追蹤
        console.log('6. 測試內存使用追蹤...');
        const memoryData = {
            heapUsed: 50000000,
            heapTotal: 100000000,
            external: 1000000
        };
        
        const memoryTracking = monitor.trackMemoryUsage(memoryData);
        if (memoryTracking && typeof memoryTracking.usagePercentage === 'number') {
            console.log('✅ 內存使用追蹤測試通過');
        } else {
            console.log('❌ 內存使用追蹤測試失敗');
            return false;
        }

        // 7. 測試內存洩漏檢測
        console.log('7. 測試內存洩漏檢測...');
        const memoryHistory = Array.from({ length: 15 }, (_, i) => ({
            usage: 1000000 + i * 100000,
            percentage: 50 + i * 2
        }));
        
        const leakDetection = monitor.detectMemoryLeaks(memoryHistory);
        if (leakDetection && typeof leakDetection.detected === 'boolean') {
            console.log('✅ 內存洩漏檢測測試通過');
        } else {
            console.log('❌ 內存洩漏檢測測試失敗');
            return false;
        }

        // 8. 測試內存優化建議
        console.log('8. 測試內存優化建議...');
        const memoryOptimization = monitor.suggestMemoryOptimization({
            usagePercentage: 85,
            trend: 'increasing',
            availableMemory: 500000
        });
        
        if (memoryOptimization && memoryOptimization.immediate) {
            console.log('✅ 內存優化建議測試通過');
        } else {
            console.log('❌ 內存優化建議測試失敗');
            return false;
        }

        // 9. 測試內存預警
        console.log('9. 測試內存預警...');
        const memoryAlert = monitor.memoryAlert({
            usagePercentage: 96
        });
        
        if (memoryAlert && typeof memoryAlert.triggered === 'boolean') {
            console.log('✅ 內存預警測試通過');
        } else {
            console.log('❌ 內存預警測試失敗');
            return false;
        }

        // 10. 測試CPU瓶頸檢測
        console.log('10. 測試CPU瓶頸檢測...');
        const cpuBottleneck = monitor.detectCPUBottlenecks({
            usage: 92
        });
        
        if (cpuBottleneck && typeof cpuBottleneck.detected === 'boolean') {
            console.log('✅ CPU瓶頸檢測測試通過');
        } else {
            console.log('❌ CPU瓶頸檢測測試失敗');
            return false;
        }

        // 11. 測試記憶體瓶頸檢測
        console.log('11. 測試記憶體瓶頸檢測...');
        const memoryBottleneck = monitor.detectMemoryBottlenecks({
            usagePercentage: 96
        });
        
        if (memoryBottleneck && typeof memoryBottleneck.detected === 'boolean') {
            console.log('✅ 記憶體瓶頸檢測測試通過');
        } else {
            console.log('❌ 記憶體瓶頸檢測測試失敗');
            return false;
        }

        // 12. 測試算法瓶頸檢測
        console.log('12. 測試算法瓶頸檢測...');
        const algorithmBottleneck = monitor.detectAlgorithmBottlenecks({
            executionTime: 12000,
            iterations: 15000
        });
        
        if (algorithmBottleneck && typeof algorithmBottleneck.detected === 'boolean') {
            console.log('✅ 算法瓶頸檢測測試通過');
        } else {
            console.log('❌ 算法瓶頸檢測測試失敗');
            return false;
        }

        // 13. 測試性能優化建議
        console.log('13. 測試性能優化建議...');
        const performanceSuggestions = monitor.generatePerformanceSuggestions({
            cpuUsage: 85,
            memoryUsage: 90,
            executionTime: 6000
        });
        
        if (performanceSuggestions && performanceSuggestions.immediate) {
            console.log('✅ 性能優化建議測試通過');
        } else {
            console.log('❌ 性能優化建議測試失敗');
            return false;
        }

        // 14. 測試配置優化建議
        console.log('14. 測試配置優化建議...');
        const configSuggestions = monitor.generateConfigurationSuggestions({
            enableCache: false,
            timeout: 3000,
            maxConcurrency: 15
        });
        
        if (configSuggestions && configSuggestions.shortTerm) {
            console.log('✅ 配置優化建議測試通過');
        } else {
            console.log('❌ 配置優化建議測試失敗');
            return false;
        }

        // 15. 測試代碼優化建議
        console.log('15. 測試代碼優化建議...');
        const codeSuggestions = monitor.generateCodeOptimizationSuggestions({
            cyclomaticComplexity: 15,
            duplicateLines: 60
        });
        
        if (codeSuggestions && codeSuggestions.shortTerm) {
            console.log('✅ 代碼優化建議測試通過');
        } else {
            console.log('❌ 代碼優化建議測試失敗');
            return false;
        }

        // 16. 測試系統優化建議
        console.log('16. 測試系統優化建議...');
        const systemSuggestions = monitor.generateSystemOptimizationSuggestions({
            cpuUsage: 85,
            memoryUsage: 90
        });
        
        if (systemSuggestions && systemSuggestions.immediate) {
            console.log('✅ 系統優化建議測試通過');
        } else {
            console.log('❌ 系統優化建議測試失敗');
            return false;
        }

        // 17. 測試監控統計
        console.log('17. 測試監控統計...');
        const monitoringStats = monitor.getMonitoringStats();
        if (monitoringStats && typeof monitoringStats.monitoringActive === 'boolean') {
            console.log('✅ 監控統計測試通過');
        } else {
            console.log('❌ 監控統計測試失敗');
            return false;
        }

        // 18. 測試重置功能
        console.log('18. 測試重置功能...');
        monitor.reset();
        if (monitor.performanceData.cpuUsage.length === 0) {
            console.log('✅ 重置功能測試通過');
        } else {
            console.log('❌ 重置功能測試失敗');
            return false;
        }

        console.log('🎉 所有測試通過！AdvancedMonitor 功能正常');
        return true;

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error);
        return false;
    }
}

// 執行測試
if (require.main === module) {
    testAdvancedMonitor().then(success => {
        if (success) {
            console.log('✅ AdvancedMonitor 測試完成');
            process.exit(0);
        } else {
            console.log('❌ AdvancedMonitor 測試失敗');
            process.exit(1);
        }
    });
}

module.exports = { testAdvancedMonitor };
