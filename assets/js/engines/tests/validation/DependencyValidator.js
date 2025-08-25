/**
 * @fileoverview 依賴關係驗證器
 * 
 * 用於驗證所有模組的導入導出關係，檢查循環依賴，
 * 並確保模組間通信正常。
 * 
 * @module DependencyValidator
 * @version 1.0.0
 * @author Student Seats System
 */

const fs = require('fs');
const path = require('path');

/**
 * 依賴關係驗證器類別
 * 
 * 負責驗證模組間的依賴關係，檢查循環依賴，
 * 並確保所有模組的導入導出正常。
 * 
 * @class DependencyValidator
 */
class DependencyValidator {
    constructor() {
        this.modules = new Map();
        this.dependencies = new Map();
        this.circularDependencies = [];
        this.importErrors = [];
        this.exportErrors = [];
    }

    /**
     * 驗證所有模組的依賴關係
     * 
     * @param {string} enginesPath - engines 目錄路徑
     * @returns {Promise<Object>} 驗證結果
     */
    async validateAllDependencies(enginesPath = './') {
        console.log('🔍 開始依賴關係驗證...');
        
        // 1. 掃描所有模組
        this.scanModules(enginesPath);
        
        // 2. 分析依賴關係
        this.analyzeDependencies();
        
        // 3. 檢查循環依賴
        this.detectCircularDependencies();
        
        // 4. 測試模組導入
        this.testModuleImports();
        
        // 5. 生成報告
        return this.generateReport();
    }

    /**
     * 掃描所有模組檔案
     * 
     * @param {string} enginesPath - engines 目錄路徑
     */
    scanModules(enginesPath) {
        try {
            const files = fs.readdirSync(enginesPath);
            const jsFiles = files.filter(file => 
                file.endsWith('.js') && 
                !file.endsWith('.test.js') &&
                !file.includes('.backup')
            );

            console.log(`📁 發現 ${jsFiles.length} 個模組檔案`);

            for (const file of jsFiles) {
                const moduleName = path.basename(file, '.js');
                const filePath = path.join(enginesPath, file);
                const content = fs.readFileSync(filePath, 'utf8');
                
                this.modules.set(moduleName, {
                    file: file,
                    path: filePath,
                    content: content,
                    imports: this.extractImports(content),
                    exports: this.extractExports(content)
                });
            }
        } catch (error) {
            console.error('❌ 掃描模組時發生錯誤:', error.message);
        }
    }

    /**
     * 提取模組的導入語句
     * 
     * @param {string} content - 檔案內容
     * @returns {Array} 導入列表
     */
    extractImports(content) {
        const imports = [];
        const importRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
        let match;

        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            if (importPath.startsWith('./') || importPath.startsWith('../')) {
                const moduleName = path.basename(importPath, '.js');
                imports.push(moduleName);
            }
        }

        return imports;
    }

    /**
     * 提取模組的導出語別
     * 
     * @param {string} content - 檔案內容
     * @returns {Array} 導出列表
     */
    extractExports(content) {
        const exports = [];
        const exportRegex = /module\.exports\s*=\s*\{([^}]+)\}/g;
        const classExportRegex = /class\s+(\w+)/g;
        
        // 檢查 module.exports
        let match;
        while ((match = exportRegex.exec(content)) !== null) {
            const exportContent = match[1];
            const exportNames = exportContent.split(',').map(name => 
                name.trim().split(':')[0].trim()
            );
            exports.push(...exportNames);
        }

        // 檢查類別定義
        while ((match = classExportRegex.exec(content)) !== null) {
            exports.push(match[1]);
        }

        return exports;
    }

    /**
     * 分析依賴關係
     */
    analyzeDependencies() {
        console.log('🔗 分析依賴關係...');

        for (const [moduleName, moduleInfo] of this.modules) {
            this.dependencies.set(moduleName, {
                imports: moduleInfo.imports,
                exports: moduleInfo.exports,
                dependents: []
            });
        }

        // 建立依賴圖
        for (const [moduleName, deps] of this.dependencies) {
            for (const importName of deps.imports) {
                if (this.dependencies.has(importName)) {
                    this.dependencies.get(importName).dependents.push(moduleName);
                }
            }
        }
    }

    /**
     * 檢測循環依賴
     */
    detectCircularDependencies() {
        console.log('🔄 檢測循環依賴...');

        for (const moduleName of this.modules.keys()) {
            const visited = new Set();
            const recursionStack = new Set();
            
            if (this.hasCircularDependency(moduleName, visited, recursionStack)) {
                this.circularDependencies.push(moduleName);
            }
        }
    }

    /**
     * 檢查是否有循環依賴
     * 
     * @param {string} moduleName - 模組名稱
     * @param {Set} visited - 已訪問的模組
     * @param {Set} recursionStack - 遞歸堆疊
     * @returns {boolean} 是否有循環依賴
     */
    hasCircularDependency(moduleName, visited, recursionStack) {
        if (recursionStack.has(moduleName)) {
            return true;
        }

        if (visited.has(moduleName)) {
            return false;
        }

        visited.add(moduleName);
        recursionStack.add(moduleName);

        const deps = this.dependencies.get(moduleName);
        if (deps) {
            for (const importName of deps.imports) {
                if (this.dependencies.has(importName)) {
                    if (this.hasCircularDependency(importName, visited, recursionStack)) {
                        return true;
                    }
                }
            }
        }

        recursionStack.delete(moduleName);
        return false;
    }

    /**
     * 測試模組導入
     */
    testModuleImports() {
        console.log('🧪 測試模組導入...');

        for (const [moduleName, moduleInfo] of this.modules) {
            try {
                // 嘗試動態導入模組
                const modulePath = path.resolve(moduleInfo.path);
                delete require.cache[modulePath];
                const module = require(modulePath);
                
                // 檢查導出的類別和方法
                if (moduleInfo.exports.length > 0) {
                    for (const exportName of moduleInfo.exports) {
                        if (!module[exportName]) {
                            this.exportErrors.push({
                                module: moduleName,
                                export: exportName,
                                error: '導出的類別或方法不存在'
                            });
                        }
                    }
                }
            } catch (error) {
                this.importErrors.push({
                    module: moduleName,
                    error: error.message
                });
            }
        }
    }

    /**
     * 生成驗證報告
     * 
     * @returns {Object} 驗證報告
     */
    generateReport() {
        const report = {
            summary: {
                totalModules: this.modules.size,
                circularDependencies: this.circularDependencies.length,
                importErrors: this.importErrors.length,
                exportErrors: this.exportErrors.length,
                status: 'PASS'
            },
            details: {
                circularDependencies: this.circularDependencies,
                importErrors: this.importErrors,
                exportErrors: this.exportErrors,
                dependencyGraph: Object.fromEntries(this.dependencies)
            }
        };

        // 判斷整體狀態
        if (this.circularDependencies.length > 0 || 
            this.importErrors.length > 0 || 
            this.exportErrors.length > 0) {
            report.summary.status = 'FAIL';
        }

        console.log('📊 依賴關係驗證報告:');
        console.log(`  總模組數: ${report.summary.totalModules}`);
        console.log(`  循環依賴: ${report.summary.circularDependencies}`);
        console.log(`  導入錯誤: ${report.summary.importErrors}`);
        console.log(`  導出錯誤: ${report.summary.exportErrors}`);
        console.log(`  狀態: ${report.summary.status}`);

        if (report.summary.status === 'FAIL') {
            console.log('\n❌ 發現問題:');
            if (this.circularDependencies.length > 0) {
                console.log('  循環依賴:', this.circularDependencies);
            }
            if (this.importErrors.length > 0) {
                console.log('  導入錯誤:', this.importErrors);
            }
            if (this.exportErrors.length > 0) {
                console.log('  導出錯誤:', this.exportErrors);
            }
        } else {
            console.log('\n✅ 所有依賴關係驗證通過');
        }

        return report;
    }
}

module.exports = { DependencyValidator };
