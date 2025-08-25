/**
 * 配置優化系統測試
 */

const { ConfigurationOptimizer } = require('../ConfigurationOptimizer.js');

// 測試函數
async function testConfigurationOptimizer() {
    console.log('開始測試 ConfigurationOptimizer...');
    
    try {
        // 1. 測試建構函式
        console.log('1. 測試建構函式...');
        const optimizer = new ConfigurationOptimizer();
        
        if (optimizer && optimizer.logger && optimizer.configTemplates) {
            console.log('✅ 建構函式測試通過');
        } else {
            console.log('❌ 建構函式測試失敗');
            return false;
        }

        // 2. 測試智能配置生成
        console.log('2. 測試智能配置生成...');
        const requirements = {
            studentCount: 50,
            conditionCount: 15,
            complexity: 80
        };
        
        const smartConfig = optimizer.generateSmartConfiguration(requirements);
        if (smartConfig && smartConfig.strategy) {
            console.log('✅ 智能配置生成測試通過');
        } else {
            console.log('❌ 智能配置生成測試失敗');
            return false;
        }

        // 3. 測試配置驗證
        console.log('3. 測試配置驗證...');
        const testConfig = {
            timeout: 30000,
            maxIterations: 5000,
            strategy: 'heuristic',
            enableCache: true,
            cacheSize: 100
        };
        
        const validation = optimizer.validateConfiguration(testConfig);
        if (validation && typeof validation.isValid === 'boolean') {
            console.log('✅ 配置驗證測試通過');
        } else {
            console.log('❌ 配置驗證測試失敗');
            return false;
        }

        // 4. 測試配置測試
        console.log('4. 測試配置測試...');
        const testData = {
            studentCount: 30,
            conditionCount: 8
        };
        
        const testResult = optimizer.testConfiguration(testConfig, testData);
        if (testResult && typeof testResult.success === 'boolean') {
            console.log('✅ 配置測試測試通過');
        } else {
            console.log('❌ 配置測試測試失敗');
            return false;
        }

        // 5. 測試配置部署
        console.log('5. 測試配置部署...');
        const deployment = optimizer.deployConfiguration(testConfig);
        if (deployment && deployment.success) {
            console.log('✅ 配置部署測試通過');
        } else {
            console.log('❌ 配置部署測試失敗');
            return false;
        }

        // 6. 測試參數範圍定義
        console.log('6. 測試參數範圍定義...');
        const ranges = optimizer.defineParameterRanges();
        if (ranges && ranges.timeout) {
            console.log('✅ 參數範圍定義測試通過');
        } else {
            console.log('❌ 參數範圍定義測試失敗');
            return false;
        }

        // 7. 測試參數搜索算法
        console.log('7. 測試參數搜索算法...');
        const baseConfig = {
            timeout: 30000,
            maxIterations: 5000,
            strategy: 'heuristic'
        };
        
        const constraints = {
            testData: { studentCount: 30 }
        };
        
        const searchResults = optimizer.parameterSearchAlgorithm(baseConfig, constraints);
        if (searchResults && Array.isArray(searchResults)) {
            console.log('✅ 參數搜索算法測試通過');
        } else {
            console.log('❌ 參數搜索算法測試失敗');
            return false;
        }

        // 8. 測試參數優化
        console.log('8. 測試參數優化...');
        const optimizationTarget = {
            performance: { executionTime: true, memoryUsage: true },
            reliability: true
        };
        
        const optimization = optimizer.optimizeParameters(baseConfig, optimizationTarget);
        if (optimization && optimization.optimizedConfig) {
            console.log('✅ 參數優化測試通過');
        } else {
            console.log('❌ 參數優化測試失敗');
            return false;
        }

        // 9. 測試參數驗證
        console.log('9. 測試參數驗證...');
        const parameters = {
            timeout: 45000,
            maxIterations: 8000,
            cacheSize: 200
        };
        
        const paramValidation = optimizer.validateParameters(parameters);
        if (paramValidation && typeof paramValidation.isValid === 'boolean') {
            console.log('✅ 參數驗證測試通過');
        } else {
            console.log('❌ 參數驗證測試失敗');
            return false;
        }

        // 10. 測試配置完整性檢查
        console.log('10. 測試配置完整性檢查...');
        const completeness = optimizer.checkConfigurationCompleteness(testConfig);
        if (completeness && typeof completeness.isComplete === 'boolean') {
            console.log('✅ 配置完整性檢查測試通過');
        } else {
            console.log('❌ 配置完整性檢查測試失敗');
            return false;
        }

        // 11. 測試配置一致性檢查
        console.log('11. 測試配置一致性檢查...');
        const consistency = optimizer.checkConfigurationConsistency(testConfig);
        if (consistency && typeof consistency.isConsistent === 'boolean') {
            console.log('✅ 配置一致性檢查測試通過');
        } else {
            console.log('❌ 配置一致性檢查測試失敗');
            return false;
        }

        // 12. 測試配置有效性檢查
        console.log('12. 測試配置有效性檢查...');
        const validity = optimizer.checkConfigurationValidity(testConfig);
        if (validity && typeof validity.isValid === 'boolean') {
            console.log('✅ 配置有效性檢查測試通過');
        } else {
            console.log('❌ 配置有效性檢查測試失敗');
            return false;
        }

        // 13. 測試配置安全性檢查
        console.log('13. 測試配置安全性檢查...');
        const security = optimizer.checkConfigurationSecurity(testConfig);
        if (security && typeof security.isSecure === 'boolean') {
            console.log('✅ 配置安全性檢查測試通過');
        } else {
            console.log('❌ 配置安全性檢查測試失敗');
            return false;
        }

        // 14. 測試配置序列化
        console.log('14. 測試配置序列化...');
        const serialized = optimizer.serializeConfiguration(testConfig);
        if (serialized && serialized.length > 0) {
            console.log('✅ 配置序列化測試通過');
        } else {
            console.log('❌ 配置序列化測試失敗');
            return false;
        }

        // 15. 測試配置反序列化
        console.log('15. 測試配置反序列化...');
        const deserialized = optimizer.deserializeConfiguration(serialized);
        if (deserialized && deserialized.strategy) {
            console.log('✅ 配置反序列化測試通過');
        } else {
            console.log('❌ 配置反序列化測試失敗');
            return false;
        }

        // 16. 測試配置版本管理
        console.log('16. 測試配置版本管理...');
        const versionInfo = optimizer.versionConfiguration(testConfig, '1.1.0');
        if (versionInfo && versionInfo.version === '1.1.0') {
            console.log('✅ 配置版本管理測試通過');
        } else {
            console.log('❌ 配置版本管理測試失敗');
            return false;
        }

        // 17. 測試配置備份恢復
        console.log('17. 測試配置備份恢復...');
        const restore = optimizer.backupRestoreConfiguration(deployment.deploymentId);
        if (restore && restore.success) {
            console.log('✅ 配置備份恢復測試通過');
        } else {
            console.log('❌ 配置備份恢復測試失敗');
            return false;
        }

        // 18. 測試配置統計
        console.log('18. 測試配置統計...');
        const stats = optimizer.getConfigurationStats();
        if (stats && typeof stats.versionCount === 'number') {
            console.log('✅ 配置統計測試通過');
        } else {
            console.log('❌ 配置統計測試失敗');
            return false;
        }

        // 19. 測試重置功能
        console.log('19. 測試重置功能...');
        optimizer.reset();
        if (optimizer.versionHistory.length === 0) {
            console.log('✅ 重置功能測試通過');
        } else {
            console.log('❌ 重置功能測試失敗');
            return false;
        }

        console.log('🎉 所有測試通過！ConfigurationOptimizer 功能正常');
        return true;

    } catch (error) {
        console.error('❌ 測試過程中發生錯誤:', error);
        return false;
    }
}

// 執行測試
if (require.main === module) {
    testConfigurationOptimizer().then(success => {
        if (success) {
            console.log('✅ ConfigurationOptimizer 測試完成');
            process.exit(0);
        } else {
            console.log('❌ ConfigurationOptimizer 測試失敗');
            process.exit(1);
        }
    });
}

module.exports = { testConfigurationOptimizer };
