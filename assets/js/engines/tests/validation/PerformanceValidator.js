/**
 * @fileoverview 性能驗證器
 * 
 * 用於驗證重構後的性能是否無下降，包括執行時間、
 * 記憶體使用、CPU 使用等指標的比較。
 * 
 * @module PerformanceValidator
 * @version 1.0.0
 * @author Student Seats System
 */

const { SeatAssignmentEngine } = require('../../SeatAssignmentEngine.js');
const { PerformanceMonitor } = require('../../PerformanceMonitor.js');

/**
 * 性能驗證器類別
 * 
 * 負責驗證重構後的性能指標，確保性能無下降。
 * 
 * @class PerformanceValidator
 */
class PerformanceValidator {
    constructor() {
        this.baselineMetrics = new Map();
        this.currentMetrics = new Map();
        this.performanceThresholds = {
            executionTime: 1.2, // 允許 20% 的性能下降
            memoryUsage: 1.3,   // 允許 30% 的記憶體增加
            cpuUsage: 1.2,      // 允許 20% 的 CPU 增加
            iterations: 1.5     // 允許 50% 的迭代次數增加
        };
    }

    /**
     * 執行完整的性能驗證
     * 
     * @returns {Object} 性能驗證結果
     */
    async validatePerformance() {
        console.log('🚀 開始性能驗證...');
        
        // 1. 建立基準測試數據
        const testData = this.generateTestData();
        
        // 2. 執行基準測試
        console.log('📊 執行基準測試...');
        await this.runBaselineTests(testData);
        
        // 3. 執行當前版本測試
        console.log('📊 執行當前版本測試...');
        await this.runCurrentTests(testData);
        
        // 4. 比較性能指標
        console.log('📊 比較性能指標...');
        const comparison = this.comparePerformance();
        
        // 5. 生成報告
        return this.generatePerformanceReport(comparison);
    }

    /**
     * 生成測試數據
     * 
     * @returns {Object} 測試數據
     */
    generateTestData() {
        const testData = {
            small: {
                students: this.generateStudents(10),
                seats: this.generateSeats(10),
                conditions: this.generateConditions(5)
            },
            medium: {
                students: this.generateStudents(50),
                seats: this.generateSeats(50),
                conditions: this.generateConditions(20)
            },
            large: {
                students: this.generateStudents(100),
                seats: this.generateSeats(100),
                conditions: this.generateConditions(40)
            }
        };

        console.log('📋 生成測試數據:');
        console.log(`  小規模: ${testData.small.students.length} 學生, ${testData.small.seats.length} 座位`);
        console.log(`  中規模: ${testData.medium.students.length} 學生, ${testData.medium.seats.length} 座位`);
        console.log(`  大規模: ${testData.large.students.length} 學生, ${testData.large.seats.length} 座位`);

        return testData;
    }

    /**
     * 生成學生數據
     * 
     * @param {number} count - 學生數量
     * @returns {Array} 學生列表
     */
    generateStudents(count) {
        const students = [];
        for (let i = 1; i <= count; i++) {
            students.push({
                id: i,
                name: `學生${i}`,
                preferences: [`A${i}`, `B${i}`, `C${i}`],
                group: Math.floor(Math.random() * 3) + 1
            });
        }
        return students;
    }

    /**
     * 生成座位數據
     * 
     * @param {number} count - 座位數量
     * @returns {Array} 座位列表
     */
    generateSeats(count) {
        const seats = [];
        const rows = ['A', 'B', 'C', 'D', 'E'];
        const cols = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        
        for (let i = 1; i <= count; i++) {
            const row = rows[Math.floor((i - 1) / cols.length)];
            const col = cols[(i - 1) % cols.length];
            seats.push({
                id: `${row}${col}`,
                row: row,
                col: col,
                available: true
            });
        }
        return seats;
    }

    /**
     * 生成條件數據
     * 
     * @param {number} count - 條件數量
     * @returns {Array} 條件列表
     */
    generateConditions(count) {
        const conditions = [];
        for (let i = 1; i <= count; i++) {
            conditions.push({
                type: Math.random() > 0.5 ? 'preference' : 'constraint',
                studentId: Math.floor(Math.random() * 10) + 1,
                seatId: `A${Math.floor(Math.random() * 10) + 1}`,
                priority: Math.floor(Math.random() * 5) + 1
            });
        }
        return conditions;
    }

    /**
     * 執行基準測試
     * 
     * @param {Object} testData - 測試數據
     */
    async runBaselineTests(testData) {
        const engine = new SeatAssignmentEngine({
            enablePerformanceMonitoring: true,
            enableCache: true,
            enableParallelProcessing: false
        });

        for (const [size, data] of Object.entries(testData)) {
            console.log(`  🔄 執行 ${size} 規模基準測試...`);
            
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            
            try {
                const result = await engine.solveAssignment({
                    students: data.students,
                    seats: data.seats,
                    conditions: data.conditions,
                    useHeuristicSearch: true,
                    enablePruning: true
                });
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage();
                
                this.baselineMetrics.set(size, {
                    executionTime: endTime - startTime,
                    memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
                    cpuUsage: result.performanceMetrics?.cpuUsage || 0,
                    iterations: result.performanceMetrics?.iterations || 0,
                    success: result.success
                });
                
                console.log(`    ✅ ${size} 基準測試完成`);
            } catch (error) {
                console.log(`    ❌ ${size} 基準測試失敗:`, error.message);
                this.baselineMetrics.set(size, {
                    executionTime: 0,
                    memoryUsage: 0,
                    cpuUsage: 0,
                    iterations: 0,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * 執行當前版本測試
     * 
     * @param {Object} testData - 測試數據
     */
    async runCurrentTests(testData) {
        const engine = new SeatAssignmentEngine({
            enablePerformanceMonitoring: true,
            enableCache: true,
            enableParallelProcessing: true
        });

        for (const [size, data] of Object.entries(testData)) {
            console.log(`  🔄 執行 ${size} 規模當前版本測試...`);
            
            const startTime = Date.now();
            const startMemory = process.memoryUsage();
            
            try {
                const result = await engine.solveAssignment({
                    students: data.students,
                    seats: data.seats,
                    conditions: data.conditions,
                    useHybridSearch: true,
                    enablePruning: true,
                    enableParallelProcessing: true
                });
                
                const endTime = Date.now();
                const endMemory = process.memoryUsage();
                
                this.currentMetrics.set(size, {
                    executionTime: endTime - startTime,
                    memoryUsage: endMemory.heapUsed - startMemory.heapUsed,
                    cpuUsage: result.performanceMetrics?.cpuUsage || 0,
                    iterations: result.performanceMetrics?.iterations || 0,
                    success: result.success
                });
                
                console.log(`    ✅ ${size} 當前版本測試完成`);
            } catch (error) {
                console.log(`    ❌ ${size} 當前版本測試失敗:`, error.message);
                this.currentMetrics.set(size, {
                    executionTime: 0,
                    memoryUsage: 0,
                    cpuUsage: 0,
                    iterations: 0,
                    success: false,
                    error: error.message
                });
            }
        }
    }

    /**
     * 比較性能指標
     * 
     * @returns {Object} 性能比較結果
     */
    comparePerformance() {
        const comparison = {};
        
        for (const [size, baseline] of this.baselineMetrics) {
            const current = this.currentMetrics.get(size);
            
            if (baseline.success && current.success) {
                comparison[size] = {
                    executionTime: {
                        baseline: baseline.executionTime,
                        current: current.executionTime,
                        ratio: current.executionTime / baseline.executionTime,
                        status: current.executionTime <= baseline.executionTime * this.performanceThresholds.executionTime ? 'PASS' : 'FAIL'
                    },
                    memoryUsage: {
                        baseline: baseline.memoryUsage,
                        current: current.memoryUsage,
                        ratio: current.memoryUsage / baseline.memoryUsage,
                        status: current.memoryUsage <= baseline.memoryUsage * this.performanceThresholds.memoryUsage ? 'PASS' : 'FAIL'
                    },
                    cpuUsage: {
                        baseline: baseline.cpuUsage,
                        current: current.cpuUsage,
                        ratio: current.cpuUsage / baseline.cpuUsage,
                        status: current.cpuUsage <= baseline.cpuUsage * this.performanceThresholds.cpuUsage ? 'PASS' : 'FAIL'
                    },
                    iterations: {
                        baseline: baseline.iterations,
                        current: current.iterations,
                        ratio: current.iterations / baseline.iterations,
                        status: current.iterations <= baseline.iterations * this.performanceThresholds.iterations ? 'PASS' : 'FAIL'
                    }
                };
            } else {
                comparison[size] = {
                    status: 'FAIL',
                    error: '測試執行失敗'
                };
            }
        }
        
        return comparison;
    }

    /**
     * 生成性能報告
     * 
     * @param {Object} comparison - 性能比較結果
     * @returns {Object} 性能報告
     */
    generatePerformanceReport(comparison) {
        const report = {
            summary: {
                totalTests: Object.keys(comparison).length,
                passedTests: 0,
                failedTests: 0,
                overallStatus: 'PASS'
            },
            details: comparison,
            thresholds: this.performanceThresholds
        };

        console.log('\n📊 性能驗證報告:');
        console.log('=' * 50);

        for (const [size, metrics] of Object.entries(comparison)) {
            console.log(`\n📈 ${size.toUpperCase()} 規模測試結果:`);
            
            if (metrics.status === 'FAIL') {
                console.log(`  ❌ 測試失敗: ${metrics.error}`);
                report.summary.failedTests++;
                continue;
            }

            const allPassed = Object.values(metrics).every(m => m.status === 'PASS');
            if (allPassed) {
                report.summary.passedTests++;
                console.log(`  ✅ 所有指標通過`);
            } else {
                report.summary.failedTests++;
                console.log(`  ⚠️  部分指標未通過`);
            }

            console.log(`  執行時間: ${metrics.executionTime.baseline}ms → ${metrics.executionTime.current}ms (${(metrics.executionTime.ratio * 100).toFixed(1)}%) ${metrics.executionTime.status === 'PASS' ? '✅' : '❌'}`);
            console.log(`  記憶體使用: ${(metrics.memoryUsage.baseline / 1024 / 1024).toFixed(2)}MB → ${(metrics.memoryUsage.current / 1024 / 1024).toFixed(2)}MB (${(metrics.memoryUsage.ratio * 100).toFixed(1)}%) ${metrics.memoryUsage.status === 'PASS' ? '✅' : '❌'}`);
            console.log(`  CPU 使用: ${metrics.cpuUsage.baseline.toFixed(2)}% → ${metrics.cpuUsage.current.toFixed(2)}% (${(metrics.cpuUsage.ratio * 100).toFixed(1)}%) ${metrics.cpuUsage.status === 'PASS' ? '✅' : '❌'}`);
            console.log(`  迭代次數: ${metrics.iterations.baseline} → ${metrics.iterations.current} (${(metrics.iterations.ratio * 100).toFixed(1)}%) ${metrics.iterations.status === 'PASS' ? '✅' : '❌'}`);
        }

        // 判斷整體狀態
        if (report.summary.failedTests > 0) {
            report.summary.overallStatus = 'FAIL';
        }

        console.log('\n📊 整體結果:');
        console.log(`  總測試數: ${report.summary.totalTests}`);
        console.log(`  通過測試: ${report.summary.passedTests}`);
        console.log(`  失敗測試: ${report.summary.failedTests}`);
        console.log(`  整體狀態: ${report.summary.overallStatus}`);

        if (report.summary.overallStatus === 'PASS') {
            console.log('\n✅ 性能驗證通過 - 重構後性能無下降');
        } else {
            console.log('\n❌ 性能驗證失敗 - 發現性能下降問題');
        }

        return report;
    }
}

module.exports = { PerformanceValidator };
