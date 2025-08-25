/**
 * @fileoverview 主驗證器
 * 
 * 整合所有驗證器，執行完整的重構驗證流程。
 * 
 * @module MainValidator
 * @version 1.0.0
 * @author Student Seats System
 */

const { DependencyValidator } = require('./DependencyValidator.js');
const { PerformanceValidator } = require('./PerformanceValidator.js');
const { FunctionalRegressionValidator } = require('./FunctionalRegressionValidator.js');

/**
 * 主驗證器類別
 * 
 * 負責執行完整的重構驗證流程，包括依賴關係驗證、
 * 性能驗證和功能回歸驗證。
 * 
 * @class MainValidator
 */
class MainValidator {
    constructor() {
        this.dependencyValidator = new DependencyValidator();
        this.performanceValidator = new PerformanceValidator();
        this.functionalValidator = new FunctionalRegressionValidator();
        this.validationResults = {};
    }

    /**
     * 執行完整的重構驗證
     * 
     * @returns {Object} 完整驗證結果
     */
    async runFullValidation() {
        console.log('🚀 開始執行完整的重構驗證...');
        console.log('=' * 60);
        
        const startTime = Date.now();
        
        try {
            // 1. 依賴關係驗證
            console.log('\n📋 第一階段：依賴關係驗證');
            console.log('-' * 40);
            this.validationResults.dependency = await this.dependencyValidator.validateAllDependencies();
            
            // 2. 性能驗證
            console.log('\n📋 第二階段：性能驗證');
            console.log('-' * 40);
            this.validationResults.performance = await this.performanceValidator.validatePerformance();
            
            // 3. 功能回歸驗證
            console.log('\n📋 第三階段：功能回歸驗證');
            console.log('-' * 40);
            this.validationResults.functional = await this.functionalValidator.validateFunctionalRegression();
            
            // 4. 生成總體驗證報告
            const totalReport = this.generateTotalReport();
            
            const endTime = Date.now();
            console.log(`\n⏱️  總驗證時間: ${endTime - startTime}ms`);
            
            return totalReport;
            
        } catch (error) {
            console.error('❌ 驗證過程中發生錯誤:', error.message);
            return {
                status: 'ERROR',
                error: error.message,
                partialResults: this.validationResults
            };
        }
    }

    /**
     * 生成總體驗證報告
     * 
     * @returns {Object} 總體驗證報告
     */
    generateTotalReport() {
        const dependencyStatus = this.validationResults.dependency?.summary?.status || 'UNKNOWN';
        const performanceStatus = this.validationResults.performance?.summary?.overallStatus || 'UNKNOWN';
        const functionalStatus = this.validationResults.functional?.summary?.overallStatus || 'UNKNOWN';
        
        const allPassed = dependencyStatus === 'PASS' && 
                         performanceStatus === 'PASS' && 
                         functionalStatus === 'PASS';
        
        const report = {
            summary: {
                overallStatus: allPassed ? 'PASS' : 'FAIL',
                dependencyValidation: dependencyStatus,
                performanceValidation: performanceStatus,
                functionalValidation: functionalStatus,
                timestamp: new Date().toISOString()
            },
            details: this.validationResults
        };

        console.log('\n📊 總體驗證報告');
        console.log('=' * 60);
        console.log(`  依賴關係驗證: ${dependencyStatus} ${dependencyStatus === 'PASS' ? '✅' : '❌'}`);
        console.log(`  性能驗證: ${performanceStatus} ${performanceStatus === 'PASS' ? '✅' : '❌'}`);
        console.log(`  功能回歸驗證: ${functionalStatus} ${functionalStatus === 'PASS' ? '✅' : '❌'}`);
        console.log(`  整體狀態: ${report.summary.overallStatus} ${report.summary.overallStatus === 'PASS' ? '✅' : '❌'}`);

        if (report.summary.overallStatus === 'PASS') {
            console.log('\n🎉 恭喜！所有驗證都通過了！');
            console.log('✅ 重構完成驗證成功');
            console.log('✅ 依賴關係正常');
            console.log('✅ 性能無下降');
            console.log('✅ 功能無回歸');
        } else {
            console.log('\n⚠️  發現問題，需要進一步處理：');
            
            if (dependencyStatus !== 'PASS') {
                console.log('❌ 依賴關係驗證失敗');
            }
            
            if (performanceStatus !== 'PASS') {
                console.log('❌ 性能驗證失敗');
            }
            
            if (functionalStatus !== 'PASS') {
                console.log('❌ 功能回歸驗證失敗');
            }
        }

        return report;
    }

    /**
     * 只執行依賴關係驗證
     * 
     * @returns {Object} 依賴關係驗證結果
     */
    async validateDependenciesOnly() {
        console.log('🔍 執行依賴關係驗證...');
        return await this.dependencyValidator.validateAllDependencies();
    }

    /**
     * 只執行性能驗證
     * 
     * @returns {Object} 性能驗證結果
     */
    async validatePerformanceOnly() {
        console.log('🚀 執行性能驗證...');
        return await this.performanceValidator.validatePerformance();
    }

    /**
     * 只執行功能回歸驗證
     * 
     * @returns {Object} 功能回歸驗證結果
     */
    async validateFunctionalOnly() {
        console.log('🔍 執行功能回歸驗證...');
        return await this.functionalValidator.validateFunctionalRegression();
    }
}

// 如果直接執行此腳本
if (require.main === module) {
    const validator = new MainValidator();
    validator.runFullValidation()
        .then(report => {
            console.log('\n📋 驗證完成');
            process.exit(report.summary.overallStatus === 'PASS' ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ 驗證失敗:', error);
            process.exit(1);
        });
}

module.exports = { MainValidator };
