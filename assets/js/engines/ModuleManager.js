// ModuleManager.js - 模組管理器
const { Logger } = require('./Logger.js');

class ModuleManager {
    constructor(options = {}) {
        this.logger = new Logger(options.logLevel || 'INFO');
        this.modules = new Map();
        this.dependencies = new Map();
        this.moduleInstances = new Map();
        this.moduleStates = new Map();
        
        this.options = {
            enableLazyLoading: options.enableLazyLoading !== false,
            enableDependencyInjection: options.enableDependencyInjection !== false,
            enableLifecycleManagement: options.enableLifecycleManagement !== false,
            enableHotReload: options.enableHotReload !== false,
            ...options
        };

        this.initialize();
    }

    /**
     * 初始化模組管理器
     */
    initialize() {
        this.logger.log('INFO', 'ModuleManager', '初始化模組管理器', {
            enableLazyLoading: this.options.enableLazyLoading,
            enableDependencyInjection: this.options.enableDependencyInjection,
            enableLifecycleManagement: this.options.enableLifecycleManagement
        });

        this.registerCoreModules();
        this.buildDependencyGraph();
    }

    /**
     * 註冊核心模組
     */
    registerCoreModules() {
        // 基礎層模組
        this.registerModule('Logger', {
            path: './Logger.js',
            dependencies: [],
            priority: 0,
            category: 'core'
        });

        // 功能層模組
        this.registerModule('SearchStrategies', {
            path: './SearchStrategies.js',
            dependencies: ['Logger'],
            priority: 1,
            category: 'functional'
        });

        this.registerModule('PruningOptimizer', {
            path: './PruningOptimizer.js',
            dependencies: ['Logger'],
            priority: 1,
            category: 'functional'
        });

        this.registerModule('MultiStartSearcher', {
            path: './MultiStartSearcher.js',
            dependencies: ['Logger'],
            priority: 1,
            category: 'functional'
        });

        this.registerModule('PerformanceMonitor', {
            path: './PerformanceMonitor.js',
            dependencies: ['Logger'],
            priority: 1,
            category: 'functional'
        });

        // 核心層模組
        this.registerModule('AssignmentCache', {
            path: './AssignmentCache.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        this.registerModule('StateValidator', {
            path: './StateValidator.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        this.registerModule('ConflictChecker', {
            path: './ConflictChecker.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        this.registerModule('StudentScorer', {
            path: './StudentScorer.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        this.registerModule('SeatSelector', {
            path: './SeatSelector.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        this.registerModule('DynamicAdjuster', {
            path: './DynamicAdjuster.js',
            dependencies: [],
            priority: 2,
            category: 'core'
        });

        // 協調層模組
        this.registerModule('SeatAssignmentEngine', {
            path: './SeatAssignmentEngine.js',
            dependencies: ['Logger', 'AssignmentCache', 'StateValidator', 'ConflictChecker', 
                         'StudentScorer', 'SeatSelector', 'DynamicAdjuster', 'SearchStrategies', 
                         'PruningOptimizer', 'MultiStartSearcher', 'PerformanceMonitor'],
            priority: 3,
            category: 'coordinator'
        });

        // 獨立模組
        this.registerModule('ParallelProcessor', {
            path: './ParallelProcessor.js',
            dependencies: [],
            priority: 0,
            category: 'independent'
        });

        this.logger.log('INFO', 'ModuleManager', `註冊了 ${this.modules.size} 個模組`);
    }

    /**
     * 註冊模組
     * @param {string} name 模組名稱
     * @param {Object} config 模組配置
     */
    registerModule(name, config) {
        this.modules.set(name, {
            name: name,
            path: config.path,
            dependencies: config.dependencies || [],
            priority: config.priority || 0,
            category: config.category || 'unknown',
            instance: null,
            state: 'registered'
        });

        this.moduleStates.set(name, 'registered');
        this.logger.log('DEBUG', 'ModuleManager', `註冊模組: ${name}`, config);
    }

    /**
     * 建立依賴圖
     */
    buildDependencyGraph() {
        for (const [name, module] of this.modules) {
            this.dependencies.set(name, {
                name: name,
                dependencies: module.dependencies,
                dependents: this.findDependents(name)
            });
        }

        this.logger.log('INFO', 'ModuleManager', '依賴圖建立完成');
    }

    /**
     * 查找依賴此模組的其他模組
     * @param {string} moduleName 模組名稱
     * @returns {Array} 依賴此模組的模組列表
     */
    findDependents(moduleName) {
        const dependents = [];
        
        for (const [name, module] of this.modules) {
            if (module.dependencies.includes(moduleName)) {
                dependents.push(name);
            }
        }
        
        return dependents;
    }

    /**
     * 獲取模組實例
     * @param {string} name 模組名稱
     * @returns {Object} 模組實例
     */
    getModule(name) {
        if (this.moduleInstances.has(name)) {
            return this.moduleInstances.get(name);
        }

        if (!this.modules.has(name)) {
            throw new Error(`模組 ${name} 未註冊`);
        }

        const module = this.modules.get(name);
        
        // 檢查依賴
        if (!this.checkDependencies(name)) {
            throw new Error(`模組 ${name} 的依賴未滿足`);
        }

        // 創建模組實例
        const instance = this.createModuleInstance(name);
        this.moduleInstances.set(name, instance);
        this.moduleStates.set(name, 'loaded');

        this.logger.log('DEBUG', 'ModuleManager', `載入模組: ${name}`);
        return instance;
    }

    /**
     * 檢查模組依賴
     * @param {string} name 模組名稱
     * @returns {boolean} 依賴是否滿足
     */
    checkDependencies(name) {
        const module = this.modules.get(name);
        if (!module) return false;

        for (const dep of module.dependencies) {
            if (!this.modules.has(dep)) {
                this.logger.log('ERROR', 'ModuleManager', `模組 ${name} 的依賴 ${dep} 不存在`);
                return false;
            }
        }

        return true;
    }

    /**
     * 創建模組實例
     * @param {string} name 模組名稱
     * @returns {Object} 模組實例
     */
    createModuleInstance(name) {
        const module = this.modules.get(name);
        if (!module) {
            throw new Error(`模組 ${name} 未註冊`);
        }

        try {
            // 動態載入模組
            const moduleExports = require(module.path);
            const ModuleClass = moduleExports[name] || moduleExports.default || moduleExports;

            if (typeof ModuleClass !== 'function') {
                throw new Error(`模組 ${name} 不是一個類別`);
            }

            // 創建實例
            const instance = new ModuleClass();
            
            // 注入依賴
            if (this.options.enableDependencyInjection) {
                this.injectDependencies(instance, module.dependencies);
            }

            return instance;

        } catch (error) {
            this.logger.log('ERROR', 'ModuleManager', `創建模組實例失敗: ${name}`, { error: error.message });
            throw error;
        }
    }

    /**
     * 注入依賴
     * @param {Object} instance 模組實例
     * @param {Array} dependencies 依賴列表
     */
    injectDependencies(instance, dependencies) {
        for (const dep of dependencies) {
            const depInstance = this.getModule(dep);
            if (depInstance) {
                // 嘗試注入到對應的屬性
                const propertyName = this.getPropertyName(dep);
                if (instance[propertyName] === undefined) {
                    instance[propertyName] = depInstance;
                }
            }
        }
    }

    /**
     * 獲取屬性名稱
     * @param {string} moduleName 模組名稱
     * @returns {string} 屬性名稱
     */
    getPropertyName(moduleName) {
        // 將模組名稱轉換為 camelCase
        return moduleName.charAt(0).toLowerCase() + moduleName.slice(1);
    }

    /**
     * 預載入模組
     * @param {Array} moduleNames 模組名稱列表
     */
    preloadModules(moduleNames = []) {
        const modulesToLoad = moduleNames.length > 0 ? moduleNames : Array.from(this.modules.keys());
        
        this.logger.log('INFO', 'ModuleManager', '開始預載入模組', { modules: modulesToLoad });

        for (const name of modulesToLoad) {
            try {
                this.getModule(name);
            } catch (error) {
                this.logger.log('WARN', 'ModuleManager', `預載入模組失敗: ${name}`, { error: error.message });
            }
        }

        this.logger.log('INFO', 'ModuleManager', '模組預載入完成');
    }

    /**
     * 獲取模組狀態
     * @param {string} name 模組名稱
     * @returns {string} 模組狀態
     */
    getModuleState(name) {
        return this.moduleStates.get(name) || 'unknown';
    }

    /**
     * 獲取所有模組狀態
     * @returns {Object} 所有模組狀態
     */
    getAllModuleStates() {
        const states = {};
        for (const [name, state] of this.moduleStates) {
            states[name] = state;
        }
        return states;
    }

    /**
     * 獲取模組統計信息
     * @returns {Object} 統計信息
     */
    getModuleStatistics() {
        const stats = {
            totalModules: this.modules.size,
            loadedModules: 0,
            registeredModules: 0,
            categories: {},
            dependencies: {}
        };

        for (const [name, module] of this.modules) {
            const state = this.moduleStates.get(name);
            if (state === 'loaded') {
                stats.loadedModules++;
            } else if (state === 'registered') {
                stats.registeredModules++;
            }

            // 統計分類
            const category = module.category;
            stats.categories[category] = (stats.categories[category] || 0) + 1;

            // 統計依賴
            stats.dependencies[name] = {
                dependencies: module.dependencies,
                dependents: this.findDependents(name)
            };
        }

        return stats;
    }

    /**
     * 檢查循環依賴
     * @returns {Array} 循環依賴列表
     */
    checkCircularDependencies() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();

        for (const [name, module] of this.modules) {
            if (!visited.has(name)) {
                this.detectCycle(name, visited, recursionStack, cycles, []);
            }
        }

        return cycles;
    }

    /**
     * 檢測循環依賴
     * @param {string} name 模組名稱
     * @param {Set} visited 已訪問集合
     * @param {Set} recursionStack 遞歸棧
     * @param {Array} cycles 循環列表
     * @param {Array} path 當前路徑
     */
    detectCycle(name, visited, recursionStack, cycles, path) {
        visited.add(name);
        recursionStack.add(name);
        path.push(name);

        const module = this.modules.get(name);
        if (module) {
            for (const dep of module.dependencies) {
                if (!visited.has(dep)) {
                    this.detectCycle(dep, visited, recursionStack, cycles, path);
                } else if (recursionStack.has(dep)) {
                    // 發現循環依賴
                    const cycleStart = path.indexOf(dep);
                    const cycle = path.slice(cycleStart);
                    cycles.push(cycle);
                }
            }
        }

        recursionStack.delete(name);
        path.pop();
    }

    /**
     * 重新載入模組
     * @param {string} name 模組名稱
     */
    reloadModule(name) {
        if (!this.modules.has(name)) {
            throw new Error(`模組 ${name} 未註冊`);
        }

        this.logger.log('INFO', 'ModuleManager', `重新載入模組: ${name}`);

        // 清理舊實例
        this.moduleInstances.delete(name);
        this.moduleStates.set(name, 'registered');

        // 重新載入
        try {
            this.getModule(name);
            this.logger.log('INFO', 'ModuleManager', `模組重新載入成功: ${name}`);
        } catch (error) {
            this.logger.log('ERROR', 'ModuleManager', `模組重新載入失敗: ${name}`, { error: error.message });
            throw error;
        }
    }

    /**
     * 清理模組
     * @param {string} name 模組名稱
     */
    cleanupModule(name) {
        if (this.moduleInstances.has(name)) {
            const instance = this.moduleInstances.get(name);
            
            // 調用模組的清理方法
            if (instance && typeof instance.dispose === 'function') {
                try {
                    instance.dispose();
                } catch (error) {
                    this.logger.log('WARN', 'ModuleManager', `模組清理失敗: ${name}`, { error: error.message });
                }
            }

            this.moduleInstances.delete(name);
            this.moduleStates.set(name, 'registered');
            
            this.logger.log('DEBUG', 'ModuleManager', `清理模組: ${name}`);
        }
    }

    /**
     * 清理所有模組
     */
    cleanupAllModules() {
        this.logger.log('INFO', 'ModuleManager', '開始清理所有模組');

        for (const [name, instance] of this.moduleInstances) {
            this.cleanupModule(name);
        }

        this.logger.log('INFO', 'ModuleManager', '所有模組清理完成');
    }

    /**
     * 獲取模組依賴圖
     * @returns {Object} 依賴圖
     */
    getDependencyGraph() {
        const graph = {};
        
        for (const [name, module] of this.modules) {
            graph[name] = {
                dependencies: module.dependencies,
                dependents: this.findDependents(name),
                category: module.category,
                priority: module.priority,
                state: this.moduleStates.get(name)
            };
        }
        
        return graph;
    }

    /**
     * 銷毀模組管理器
     */
    dispose() {
        this.logger.log('INFO', 'ModuleManager', '開始銷毀模組管理器');
        
        this.cleanupAllModules();
        
        this.modules.clear();
        this.dependencies.clear();
        this.moduleInstances.clear();
        this.moduleStates.clear();
        
        this.logger.log('INFO', 'ModuleManager', '模組管理器銷毀完成');
    }
}

module.exports = { ModuleManager };
