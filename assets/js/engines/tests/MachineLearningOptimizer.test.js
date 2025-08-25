/**
 * 機器學習優化器測試
 */

const { MachineLearningOptimizer } = require('../MachineLearningOptimizer.js');

// 測試配置
const testConfig = {
    students: [
        { id: 'S001', name: '學生1' },
        { id: 'S002', name: '學生2' },
        { id: 'S003', name: '學生3' }
    ],
    seats: [
        { id: 'SEAT001', row: 1, col: 1, groupId: 'A' },
        { id: 'SEAT002', row: 1, col: 2, groupId: 'A' },
        { id: 'SEAT003', row: 2, col: 1, groupId: 'B' }
    ],
    conditions: [
        {
            type: 'adjacent',
            students: [['S001', 'S002']]
        },
        {
            type: 'assign_group',
            students: [['S003']],
            group: 'B'
        }
    ]
};

// 測試函數
async function testMachineLearningOptimizer() {
    console.log('開始測試 MachineLearningOptimizer...');
    
    try {
        // 1. 測試建構函式
        console.log('1. 測試建構函式...');
        const optimizer = new MachineLearningOptimizer({
            enableLearning: true,
            dataRetentionDays: 30,
            minDataPoints: 50
        });
        
        if (optimizer && optimizer.logger && optimizer.modelConfig) {
            console.log('✅ 建構函式測試通過');
        } else {
            console.log('❌ 建構函式測試失敗');
            return false;
        }

        // 2. 測試數據收集
        console.log('2. 測試數據收集...');
        const performanceMetrics = {
            success: true,
            executionTime: 150,
            memoryUsage: 50000,
            cacheHitRate: 0.8
        };
        
        const strategyInfo = {
            searchType: 'heuristic',
            priorityMethod: 'complexity',
            adjustmentStrategy: 'swap',
            cacheUsage: true,
            timeout: 30000,
            maxIterations: 1000
        };
        
        const collectionResult = optimizer.collectHistoricalData(testConfig, performanceMetrics, strategyInfo);
        if (collectionResult && optimizer.historicalData.length === 1) {
            console.log('✅ 數據收集測試通過');
        } else {
            console.log('❌ 數據收集測試失敗');
            return false;
        }

        // 3. 測試數據預處理
        console.log('3. 測試數據預處理...');
        const processedData = optimizer.preprocessData(testConfig);
        if (processedData && processedData.studentCount === 3 && processedData.seatCount === 3) {
            console.log('✅ 數據預處理測試通過');
        } else {
            console.log('❌ 數據預處理測試失敗');
            return false;
        }

        // 4. 測試策略特徵提取
        console.log('4. 測試策略特徵提取...');
        const features = optimizer.extractStrategyFeatures(strategyInfo);
        if (features && features.searchType === 'heuristic') {
            console.log('✅ 策略特徵提取測試通過');
        } else {
            console.log('❌ 策略特徵提取測試失敗');
            return false;
        }

        // 5. 測試策略模式識別
        console.log('5. 測試策略模式識別...');
        const patterns = optimizer.identifyStrategyPatterns(optimizer.historicalData);
        if (patterns && patterns.has('efficient')) {
            console.log('✅ 策略模式識別測試通過');
        } else {
            console.log('❌ 策略模式識別測試失敗');
            return false;
        }

        // 6. 測試策略效果分析
        console.log('6. 測試策略效果分析...');
        const analysis = optimizer.analyzeStrategyEffectiveness(strategyInfo);
        if (analysis && typeof analysis.successRate === 'number') {
            console.log('✅ 策略效果分析測試通過');
        } else {
            console.log('❌ 策略效果分析測試失敗');
            return false;
        }

        // 7. 測試結果預測
        console.log('7. 測試結果預測...');
        const prediction = optimizer.predictResults(testConfig);
        if (prediction && typeof prediction.successProbability === 'number') {
            console.log('✅ 結果預測測試通過');
        } else {
            console.log('❌ 結果預測測試失敗');
            return false;
        }

        // 8. 測試性能預測
        console.log('8. 測試性能預測...');
        const performancePrediction = optimizer.predictPerformance(testConfig);
        if (performancePrediction && typeof performancePrediction.executionTime === 'number') {
            console.log('✅ 性能預測測試通過');
        } else {
            console.log('❌ 性能預測測試失敗');
            return false;
        }

        // 9. 測試參數自動調優
        console.log('9. 測試參數自動調優...');
        const currentConfig = {
            timeout: 30000,
            maxIterations: 1000,
            enableCache: false
        };
        
        const tunedConfig = optimizer.autoTuneParameters(currentConfig);
        if (tunedConfig && typeof tunedConfig.timeout === 'number') {
            console.log('✅ 參數自動調優測試通過');
        } else {
            console.log('❌ 參數自動調優測試失敗');
            return false;
        }

        // 10. 測試策略自動選擇
        console.log('10. 測試策略自動選擇...');
        const selectedStrategy = optimizer.autoSelectStrategy(testConfig);
        if (selectedStrategy && selectedStrategy.name) {
            console.log('✅ 策略自動選擇測試通過');
        } else {
            console.log('❌ 策略自動選擇測試失敗');
            return false;
        }

        // 11. 測試配置自動優化
        console.log('11. 測試配置自動優化...');
        const optimizedConfig = optimizer.autoOptimizeConfig(testConfig);
        if (optimizedConfig && optimizedConfig.strategy) {
            console.log('✅ 配置自動優化測試通過');
        } else {
            console.log('❌ 配置自動優化測試失敗');
            return false;
        }

        // 12. 測試統計信息
        console.log('12. 測試統計信息...');
        const statistics = optimizer.getStatistics();
        if (statistics && typeof statistics.totalDataPoints === 'number') {
            console.log('✅ 統計信息測試通過');
        } else {
            console.log('❌ 統計信息測試失敗');
            return false;
        }

        // 13. 測試重置功能
        console.log('13. 測試重置功能...');
        optimizer.reset();
        if (optimizer.historicalData.length === 0) {
            console.log('✅ 重置功能測試通過');
        } else {
            console.log('❌ 重置功能測試失敗');
            return false;
        }

        console.log('🎉 所有測試通過！MachineLearningOptimizer 功能正常');
        return true;

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error);
        return false;
    }
}

// 執行測試
if (require.main === module) {
    testMachineLearningOptimizer().then(success => {
        if (success) {
            console.log('✅ MachineLearningOptimizer 測試完成');
            process.exit(0);
        } else {
            console.log('❌ MachineLearningOptimizer 測試失敗');
            process.exit(1);
        }
    });
}

module.exports = { testMachineLearningOptimizer };
