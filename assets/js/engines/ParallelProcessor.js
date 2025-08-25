// ParallelProcessor.js - 並行計算處理器
class ParallelProcessor {
    constructor(options = {}) {
        this.options = {
            maxWorkers: options.maxWorkers || navigator.hardwareConcurrency || 4,
            workerTimeout: options.workerTimeout || 30000,
            taskTimeout: options.taskTimeout || 60000,
            enableProgressCallback: options.enableProgressCallback !== false,
            enableErrorRecovery: options.enableErrorRecovery !== false,
            ...options
        };

        // Worker池管理
        this.workerPool = new Map();
        this.availableWorkers = [];
        this.busyWorkers = new Set();

        // 任務隊列管理
        this.taskQueue = [];
        this.runningTasks = new Map();
        this.completedTasks = new Map();
        this.failedTasks = new Map();

        // 進度追蹤
        this.progressTracker = {
            totalTasks: 0,
            completedTasks: 0,
            failedTasks: 0,
            inProgressTasks: 0,
            startTime: 0,
            lastUpdateTime: 0
        };

        this.initialize();
    }

    /**
     * 初始化並行處理器
     */
    initialize() {
        this.logger = console;
        this.logger.log('INFO', 'ParallelProcessor', '初始化並行處理器', {
            maxWorkers: this.options.maxWorkers
        });
        this.createWorkerPool();
    }

    // ==================== Web Workers 管理 ====================

    /**
     * 創建Worker池
     */
    createWorkerPool() {
        for (let i = 0; i < this.options.maxWorkers; i++) {
            const worker = this.createWorker();
            if (worker) {
                this.workerPool.set(worker.id, worker);
                this.availableWorkers.push(worker);
            }
        }
        this.logger.log('INFO', 'ParallelProcessor', `創建了 ${this.workerPool.size} 個Worker`);
    }

    /**
     * 創建單個Worker
     */
    createWorker() {
        try {
            const workerScript = this.generateWorkerScript();
            const blob = new Blob([workerScript], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            const worker = new Worker(workerUrl);
            worker.id = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            worker.status = 'idle';
            worker.createdAt = Date.now();
            worker.lastUsed = Date.now();
            worker.taskCount = 0;
            worker.errorCount = 0;

            this.setupWorkerEventListeners(worker);
            return worker;
        } catch (error) {
            this.logger.error('ERROR', 'ParallelProcessor', '創建Worker失敗', error);
            return null;
        }
    }

    /**
     * 生成Worker腳本
     */
    generateWorkerScript() {
        return `
            self.onmessage = function(event) {
                const { taskId, taskType, data, options } = event.data;
                
                try {
                    let result;
                    const startTime = Date.now();
                    
                    switch (taskType) {
                        case 'seatAssignment':
                            result = processSeatAssignment(data, options);
                            break;
                        case 'conditionCheck':
                            result = processConditionCheck(data, options);
                            break;
                        case 'optimization':
                            result = processOptimization(data, options);
                            break;
                        default:
                            throw new Error('未知的任務類型: ' + taskType);
                    }
                    
                    const executionTime = Date.now() - startTime;
                    
                    self.postMessage({
                        taskId,
                        success: true,
                        result,
                        executionTime,
                        timestamp: Date.now()
                    });
                    
                } catch (error) {
                    self.postMessage({
                        taskId,
                        success: false,
                        error: error.message,
                        timestamp: Date.now()
                    });
                }
            };
            
            function processSeatAssignment(data, options) {
                const { students, seats, conditions, startPoint } = data;
                return {
                    assignment: new Map(),
                    success: true,
                    conflicts: [],
                    score: Math.random()
                };
            }
            
            function processConditionCheck(data, options) {
                const { condition, assignment } = data;
                return {
                    satisfied: Math.random() > 0.3,
                    details: {}
                };
            }
            
            function processOptimization(data, options) {
                const { currentAssignment, students, seats, conditions } = data;
                return {
                    optimizedAssignment: new Map(),
                    improvement: Math.random() * 0.5,
                    iterations: Math.floor(Math.random() * 100)
                };
            }
        `;
    }

    /**
     * 設置Worker事件監聽器
     */
    setupWorkerEventListeners(worker) {
        worker.onmessage = (event) => {
            this.handleWorkerMessage(worker, event.data);
        };

        worker.onerror = (error) => {
            this.handleWorkerError(worker, error);
        };

        worker.onmessageerror = (error) => {
            this.handleWorkerMessageError(worker, error);
        };
    }

    /**
     * 處理Worker消息
     */
    handleWorkerMessage(worker, message) {
        const { taskId, success, result, error, executionTime } = message;

        if (success) {
            this.completeTask(taskId, result, executionTime);
        } else {
            this.failTask(taskId, error);
        }

        this.releaseWorker(worker);
    }

    /**
     * 處理Worker錯誤
     */
    handleWorkerError(worker, error) {
        this.logger.error('ERROR', 'ParallelProcessor', `Worker ${worker.id} 錯誤`, error);
        worker.errorCount++;
        
        if (worker.errorCount > 3) {
            this.recreateWorker(worker);
        }
    }

    /**
     * 處理Worker消息錯誤
     */
    handleWorkerMessageError(worker, error) {
        this.logger.error('ERROR', 'ParallelProcessor', `Worker ${worker.id} 消息錯誤`, error);
    }

    /**
     * 重新創建Worker
     */
    recreateWorker(worker) {
        this.logger.log('WARN', 'ParallelProcessor', `重新創建Worker ${worker.id}`);
        this.terminateWorker(worker);
        
        const newWorker = this.createWorker();
        if (newWorker) {
            this.workerPool.set(newWorker.id, newWorker);
            this.availableWorkers.push(newWorker);
        }
    }

    /**
     * 管理Workers
     */
    manageWorkers() {
        const stats = {
            totalWorkers: this.workerPool.size,
            availableWorkers: this.availableWorkers.length,
            busyWorkers: this.busyWorkers.size,
            utilization: this.busyWorkers.size / this.workerPool.size
        };

        const now = Date.now();
        const maxIdleTime = 5 * 60 * 1000;

        for (const [workerId, worker] of this.workerPool.entries()) {
            if (worker.status === 'idle' && (now - worker.lastUsed) > maxIdleTime) {
                this.logger.log('INFO', 'ParallelProcessor', `清理閒置Worker ${workerId}`);
                this.terminateWorker(worker);
            }
        }

        return stats;
    }

    /**
     * 與Worker通信
     */
    communicateWithWorker(worker, message) {
        try {
            worker.postMessage(message);
            worker.lastUsed = Date.now();
        } catch (error) {
            this.logger.error('ERROR', 'ParallelProcessor', `與Worker ${worker.id} 通信失敗`, error);
            this.handleWorkerError(worker, error);
        }
    }

    /**
     * 清理Workers
     */
    cleanupWorkers() {
        this.logger.log('INFO', 'ParallelProcessor', '開始清理Workers');

        for (const [workerId, worker] of this.workerPool.entries()) {
            this.terminateWorker(worker);
        }

        this.workerPool.clear();
        this.availableWorkers = [];
        this.busyWorkers.clear();

        this.logger.log('INFO', 'ParallelProcessor', 'Workers清理完成');
    }

    /**
     * 終止Worker
     */
    terminateWorker(worker) {
        try {
            worker.terminate();
            this.workerPool.delete(worker.id);
            this.availableWorkers = this.availableWorkers.filter(w => w.id !== worker.id);
            this.busyWorkers.delete(worker);
        } catch (error) {
            this.logger.error('ERROR', 'ParallelProcessor', `終止Worker ${worker.id} 失敗`, error);
        }
    }

    // ==================== 任務分割 ====================

    /**
     * 任務分解
     */
    decomposeTask(task, options = {}) {
        const {
            strategy = 'chunk',
            maxChunkSize = 10,
            enableLoadBalancing = true
        } = options;

        const subTasks = [];

        switch (strategy) {
            case 'chunk':
                subTasks.push(...this.decomposeByChunk(task, maxChunkSize));
                break;
            case 'priority':
                subTasks.push(...this.decomposeByPriority(task));
                break;
            case 'complexity':
                subTasks.push(...this.decomposeByComplexity(task));
                break;
            default:
                subTasks.push(task);
        }

        if (enableLoadBalancing) {
            this.balanceTaskLoad(subTasks);
        }

        return subTasks;
    }

    /**
     * 按塊分解任務
     */
    decomposeByChunk(task, maxChunkSize) {
        const subTasks = [];
        const { students, seats, conditions } = task.data;

        for (let i = 0; i < students.length; i += maxChunkSize) {
            const chunkStudents = students.slice(i, i + maxChunkSize);
            subTasks.push({
                id: `${task.id}_chunk_${i / maxChunkSize}`,
                type: task.type,
                data: {
                    students: chunkStudents,
                    seats,
                    conditions
                },
                priority: task.priority || 'normal',
                estimatedTime: this.estimateTaskTime(chunkStudents.length, seats.length)
            });
        }

        return subTasks;
    }

    /**
     * 按優先級分解任務
     */
    decomposeByPriority(task) {
        const subTasks = [];
        const { students, seats, conditions } = task.data;

        const highPriorityStudents = students.filter(s => s.priority === 'high');
        const normalPriorityStudents = students.filter(s => s.priority === 'normal');
        const lowPriorityStudents = students.filter(s => s.priority === 'low');

        if (highPriorityStudents.length > 0) {
            subTasks.push({
                id: `${task.id}_high`,
                type: task.type,
                data: { students: highPriorityStudents, seats, conditions },
                priority: 'high',
                estimatedTime: this.estimateTaskTime(highPriorityStudents.length, seats.length)
            });
        }

        if (normalPriorityStudents.length > 0) {
            subTasks.push({
                id: `${task.id}_normal`,
                type: task.type,
                data: { students: normalPriorityStudents, seats, conditions },
                priority: 'normal',
                estimatedTime: this.estimateTaskTime(normalPriorityStudents.length, seats.length)
            });
        }

        if (lowPriorityStudents.length > 0) {
            subTasks.push({
                id: `${task.id}_low`,
                type: task.type,
                data: { students: lowPriorityStudents, seats, conditions },
                priority: 'low',
                estimatedTime: this.estimateTaskTime(lowPriorityStudents.length, seats.length)
            });
        }

        return subTasks;
    }

    /**
     * 按複雜度分解任務
     */
    decomposeByComplexity(task) {
        const subTasks = [];
        const { students, seats, conditions } = task.data;

        const studentComplexity = students.map(student => ({
            student,
            complexity: this.calculateStudentComplexity(student, conditions)
        }));

        studentComplexity.sort((a, b) => b.complexity - a.complexity);

        const complexStudents = studentComplexity.slice(0, Math.ceil(students.length / 2))
            .map(item => item.student);
        const simpleStudents = studentComplexity.slice(Math.ceil(students.length / 2))
            .map(item => item.student);

        if (complexStudents.length > 0) {
            subTasks.push({
                id: `${task.id}_complex`,
                type: task.type,
                data: { students: complexStudents, seats, conditions },
                priority: 'high',
                estimatedTime: this.estimateTaskTime(complexStudents.length, seats.length) * 2
            });
        }

        if (simpleStudents.length > 0) {
            subTasks.push({
                id: `${task.id}_simple`,
                type: task.type,
                data: { students: simpleStudents, seats, conditions },
                priority: 'normal',
                estimatedTime: this.estimateTaskTime(simpleStudents.length, seats.length)
            });
        }

        return subTasks;
    }

    /**
     * 計算學生複雜度
     */
    calculateStudentComplexity(student, conditions) {
        let complexity = 0;

        const studentConditions = conditions.filter(c => 
            c.students.includes(student.id)
        );
        complexity += studentConditions.length * 0.3;

        for (const condition of studentConditions) {
            switch (condition.type) {
                case 'adjacent':
                    complexity += 0.1;
                    break;
                case 'group_area':
                    complexity += 0.2;
                    break;
                case 'adjacent_and_group':
                    complexity += 0.3;
                    break;
                default:
                    complexity += 0.1;
            }
        }

        return complexity;
    }

    /**
     * 負載均衡
     */
    balanceTaskLoad(tasks) {
        tasks.sort((a, b) => b.estimatedTime - a.estimatedTime);

        const batches = [];
        const batchSize = Math.ceil(tasks.length / this.options.maxWorkers);

        for (let i = 0; i < tasks.length; i += batchSize) {
            batches.push(tasks.slice(i, i + batchSize));
        }

        const balancedTasks = [];
        for (const batch of batches) {
            balancedTasks.push(...batch);
        }

        return balancedTasks;
    }

    /**
     * 任務分配
     */
    distributeTasks(tasks) {
        const distribution = {
            assignedTasks: new Map(),
            unassignedTasks: [],
            workerLoad: new Map()
        };

        for (const [workerId, worker] of this.workerPool.entries()) {
            distribution.workerLoad.set(workerId, {
                worker,
                currentLoad: 0,
                estimatedLoad: 0,
                tasks: []
            });
        }

        const priorityOrder = ['high', 'normal', 'low'];
        const sortedTasks = tasks.sort((a, b) => {
            const aPriority = priorityOrder.indexOf(a.priority || 'normal');
            const bPriority = priorityOrder.indexOf(b.priority || 'normal');
            return aPriority - bPriority;
        });

        for (const task of sortedTasks) {
            const assignedWorker = this.findBestWorker(distribution.workerLoad, task);
            
            if (assignedWorker) {
                distribution.assignedTasks.set(task.id, {
                    task,
                    worker: assignedWorker,
                    assignedAt: Date.now()
                });
                
                const workerLoad = distribution.workerLoad.get(assignedWorker.id);
                workerLoad.tasks.push(task);
                workerLoad.estimatedLoad += task.estimatedTime || 1000;
            } else {
                distribution.unassignedTasks.push(task);
            }
        }

        return distribution;
    }

    /**
     * 找到最佳Worker
     */
    findBestWorker(workerLoad, task) {
        let bestWorker = null;
        let bestScore = -Infinity;

        for (const [workerId, load] of workerLoad.entries()) {
            if (load.worker.status !== 'idle') continue;

            const score = this.calculateWorkerScore(load, task);
            
            if (score > bestScore) {
                bestScore = score;
                bestWorker = load.worker;
            }
        }

        return bestWorker;
    }

    /**
     * 計算Worker分數
     */
    calculateWorkerScore(workerLoad, task) {
        const { worker, estimatedLoad } = workerLoad;
        
        let score = 1000 - estimatedLoad;
        
        if (worker.errorCount > 0) {
            score -= worker.errorCount * 100;
        }
        
        if (task.type === 'seatAssignment' && worker.taskCount > 0) {
            score += 50;
        }
        
        return score;
    }

    /**
     * 任務調度
     */
    async scheduleTasks(tasks, options = {}) {
        const {
            enableProgressCallback = this.options.enableProgressCallback,
            progressCallback = null,
            timeout = this.options.taskTimeout
        } = options;

        this.logger.log('INFO', 'ParallelProcessor', '開始任務調度', {
            taskCount: tasks.length,
            workerCount: this.workerPool.size
        });

        this.initializeProgressTracking(tasks.length);

        const subTasks = [];
        for (const task of tasks) {
            const decomposed = this.decomposeTask(task, options);
            subTasks.push(...decomposed);
        }

        const distribution = this.distributeTasks(subTasks);

        const executionPromises = [];
        for (const [taskId, assignment] of distribution.assignedTasks.entries()) {
            const promise = this.executeTask(assignment.task, assignment.worker, {
                timeout,
                enableProgressCallback,
                progressCallback
            });
            executionPromises.push(promise);
        }

        const results = await Promise.allSettled(executionPromises);
        const finalResults = this.processExecutionResults(results, distribution);

        this.logger.log('INFO', 'ParallelProcessor', '任務調度完成', {
            totalTasks: tasks.length,
            completedTasks: finalResults.completed.length,
            failedTasks: finalResults.failed.length
        });

        return finalResults;
    }

    /**
     * 任務監控
     */
    monitorTasks() {
        const stats = {
            queue: {
                pending: this.taskQueue.length,
                running: this.runningTasks.size,
                completed: this.completedTasks.size,
                failed: this.failedTasks.size
            },
            workers: this.manageWorkers(),
            progress: this.getProgress(),
            performance: this.calculatePerformanceMetrics()
        };

        return stats;
    }

    // ==================== 進度回調 ====================

    /**
     * 進度追蹤
     */
    trackProgress(taskId, progress, details = {}) {
        const task = this.runningTasks.get(taskId);
        if (task) {
            task.progress = progress;
            task.lastUpdate = Date.now();
            task.details = { ...task.details, ...details };
        }

        this.updateOverallProgress();
    }

    /**
     * 進度回調
     */
    progressCallback(callback, progress) {
        if (typeof callback === 'function') {
            try {
                callback(progress);
            } catch (error) {
                this.logger.error('ERROR', 'ParallelProcessor', '進度回調執行失敗', error);
            }
        }
    }

    /**
     * 進度報告
     */
    reportProgress() {
        const progress = this.getProgress();
        const stats = this.monitorTasks();

        return {
            progress,
            stats,
            timestamp: Date.now(),
            recommendations: this.generateProgressRecommendations(progress, stats)
        };
    }

    /**
     * 進度優化
     */
    optimizeProgress(progress, stats) {
        const optimization = {
            suggestions: [],
            actions: []
        };

        if (progress.completionRate < 0.5 && progress.elapsedTime > 30000) {
            optimization.suggestions.push('進度較慢，考慮增加Worker數量');
            optimization.actions.push('increaseWorkers');
        }

        if (stats.workers.utilization < 0.3) {
            optimization.suggestions.push('Worker利用率較低，考慮減少Worker數量');
            optimization.actions.push('decreaseWorkers');
        }

        if (stats.queue.failed > stats.queue.completed * 0.1) {
            optimization.suggestions.push('失敗率較高，檢查任務配置');
            optimization.actions.push('checkTaskConfiguration');
        }

        return optimization;
    }

    // ==================== 結果合併 ====================

    /**
     * 結果收集
     */
    collectResults(taskResults) {
        const collection = {
            successful: [],
            failed: [],
            partial: [],
            summary: {
                total: taskResults.length,
                successful: 0,
                failed: 0,
                partial: 0
            }
        };

        for (const result of taskResults) {
            if (result.success) {
                collection.successful.push(result);
                collection.summary.successful++;
            } else if (result.partial) {
                collection.partial.push(result);
                collection.summary.partial++;
            } else {
                collection.failed.push(result);
                collection.summary.failed++;
            }
        }

        return collection;
    }

    /**
     * 結果驗證
     */
    validateResults(result, validationRules = {}) {
        const validation = {
            isValid: true,
            errors: [],
            warnings: [],
            score: 100
        };

        if (!result || typeof result !== 'object') {
            validation.isValid = false;
            validation.errors.push('結果格式無效');
            validation.score -= 50;
        }

        if (result.data && validationRules.requiredFields) {
            for (const field of validationRules.requiredFields) {
                if (!result.data.hasOwnProperty(field)) {
                    validation.isValid = false;
                    validation.errors.push(`缺少必需字段: ${field}`);
                    validation.score -= 10;
                }
            }
        }

        if (result.executionTime && validationRules.maxExecutionTime) {
            if (result.executionTime > validationRules.maxExecutionTime) {
                validation.warnings.push('執行時間超過預期');
                validation.score -= 5;
            }
        }

        return validation;
    }

    /**
     * 結果合併
     */
    mergeResults(results, mergeStrategy = {}) {
        const {
            strategy = 'sequential',
            conflictResolution = 'priority'
        } = mergeStrategy;

        let mergedResult;

        switch (strategy) {
            case 'sequential':
                mergedResult = this.mergeSequentially(results, conflictResolution);
                break;
            case 'parallel':
                mergedResult = this.mergeInParallel(results, conflictResolution);
                break;
            case 'hierarchical':
                mergedResult = this.mergeHierarchically(results, conflictResolution);
                break;
            default:
                mergedResult = this.mergeSequentially(results, conflictResolution);
        }

        return mergedResult;
    }

    /**
     * 順序合併
     */
    mergeSequentially(results, conflictResolution) {
        const merged = {
            assignment: new Map(),
            conflicts: [],
            score: 0,
            metadata: {
                mergedFrom: results.length,
                mergeStrategy: 'sequential',
                conflictResolution
            }
        };

        for (const result of results) {
            if (result.success && result.data) {
                if (result.data.assignment) {
                    for (const [studentId, seat] of result.data.assignment.entries()) {
                        if (merged.assignment.has(studentId)) {
                            const resolvedSeat = this.resolveConflict(
                                merged.assignment.get(studentId),
                                seat,
                                conflictResolution
                            );
                            merged.assignment.set(studentId, resolvedSeat);
                        } else {
                            merged.assignment.set(studentId, seat);
                        }
                    }
                }

                if (result.data.conflicts) {
                    merged.conflicts.push(...result.data.conflicts);
                }

                merged.score += result.data.score || 0;
            }
        }

        merged.score = merged.score / results.length;

        return merged;
    }

    /**
     * 並行合併
     */
    mergeInParallel(results, conflictResolution) {
        return this.mergeSequentially(results, conflictResolution);
    }

    /**
     * 層次合併
     */
    mergeHierarchically(results, conflictResolution) {
        return this.mergeSequentially(results, conflictResolution);
    }

    /**
     * 解決衝突
     */
    resolveConflict(existingSeat, newSeat, strategy) {
        switch (strategy) {
            case 'priority':
                return newSeat.priority > existingSeat.priority ? newSeat : existingSeat;
            case 'latest':
                return newSeat.timestamp > existingSeat.timestamp ? newSeat : existingSeat;
            case 'consensus':
                const existingScore = this.calculateSeatScore(existingSeat);
                const newScore = this.calculateSeatScore(newSeat);
                return newScore > existingScore ? newSeat : existingSeat;
            default:
                return existingSeat;
        }
    }

    /**
     * 計算座位分數
     */
    calculateSeatScore(seat) {
        let score = 0;
        
        if (seat.row === 0 || seat.col === 0) score += 10;
        
        if (seat.type === 'premium') score += 20;
        else if (seat.type === 'standard') score += 10;
        
        if (seat.timestamp) {
            score += Math.min(10, (Date.now() - seat.timestamp) / 1000);
        }
        
        return score;
    }

    /**
     * 結果優化
     */
    optimizeResults(mergedResult, optimizationOptions = {}) {
        const optimization = {
            originalResult: mergedResult,
            optimizedResult: { ...mergedResult },
            improvements: [],
            performance: {
                optimizationTime: 0,
                improvementScore: 0
            }
        };

        const startTime = Date.now();

        if (mergedResult.conflicts && mergedResult.conflicts.length > 0) {
            const conflictOptimization = this.optimizeConflicts(mergedResult.conflicts);
            optimization.optimizedResult.conflicts = conflictOptimization.optimizedConflicts;
            optimization.improvements.push('衝突數量減少: ' + conflictOptimization.improvement);
        }

        if (mergedResult.assignment) {
            const assignmentOptimization = this.optimizeAssignment(mergedResult.assignment);
            optimization.optimizedResult.assignment = assignmentOptimization.optimizedAssignment;
            optimization.improvements.push('分配質量提升: ' + assignmentOptimization.improvement);
        }

        optimization.performance.optimizationTime = Date.now() - startTime;
        optimization.performance.improvementScore = this.calculateImprovementScore(
            mergedResult,
            optimization.optimizedResult
        );

        return optimization;
    }

    // ==================== 輔助方法 ====================

    /**
     * 執行任務
     */
    async executeTask(task, worker, options = {}) {
        const { timeout, enableProgressCallback, progressCallback } = options;

        return new Promise((resolve, reject) => {
            const taskId = task.id;
            const startTime = Date.now();

            this.runningTasks.set(taskId, {
                task,
                worker,
                startTime,
                progress: 0,
                lastUpdate: startTime
            });

            const timeoutId = setTimeout(() => {
                this.failTask(taskId, '任務超時');
                reject(new Error('任務超時'));
            }, timeout);

            this.communicateWithWorker(worker, {
                taskId,
                taskType: task.type,
                data: task.data,
                options: task.options || {}
            });

            const messageHandler = (event) => {
                const { taskId: responseTaskId, success, result, error, executionTime } = event.data;
                
                if (responseTaskId === taskId) {
                    clearTimeout(timeoutId);
                    worker.removeEventListener('message', messageHandler);

                    if (success) {
                        this.completeTask(taskId, result, executionTime);
                        resolve(result);
                    } else {
                        this.failTask(taskId, error);
                        reject(new Error(error));
                    }
                }
            };

            worker.addEventListener('message', messageHandler);
        });
    }

    /**
     * 完成任務
     */
    completeTask(taskId, result, executionTime) {
        const task = this.runningTasks.get(taskId);
        if (task) {
            this.completedTasks.set(taskId, {
                ...task,
                result,
                executionTime,
                completedAt: Date.now(),
                success: true
            });
            this.runningTasks.delete(taskId);
        }

        this.updateProgress();
    }

    /**
     * 失敗任務
     */
    failTask(taskId, error) {
        const task = this.runningTasks.get(taskId);
        if (task) {
            this.failedTasks.set(taskId, {
                ...task,
                error,
                failedAt: Date.now(),
                success: false
            });
            this.runningTasks.delete(taskId);
        }

        this.updateProgress();
    }

    /**
     * 釋放Worker
     */
    releaseWorker(worker) {
        worker.status = 'idle';
        this.busyWorkers.delete(worker);
        this.availableWorkers.push(worker);
    }

    /**
     * 初始化進度追蹤
     */
    initializeProgressTracking(totalTasks) {
        this.progressTracker = {
            totalTasks,
            completedTasks: 0,
            failedTasks: 0,
            inProgressTasks: 0,
            startTime: Date.now(),
            lastUpdateTime: Date.now()
        };
    }

    /**
     * 更新進度
     */
    updateProgress() {
        this.progressTracker.completedTasks = this.completedTasks.size;
        this.progressTracker.failedTasks = this.failedTasks.size;
        this.progressTracker.inProgressTasks = this.runningTasks.size;
        this.progressTracker.lastUpdateTime = Date.now();
    }

    /**
     * 更新總體進度
     */
    updateOverallProgress() {
        this.updateProgress();
    }

    /**
     * 獲取進度
     */
    getProgress() {
        const { totalTasks, completedTasks, failedTasks, inProgressTasks, startTime, lastUpdateTime } = this.progressTracker;
        
        const elapsedTime = lastUpdateTime - startTime;
        const completionRate = totalTasks > 0 ? (completedTasks + failedTasks) / totalTasks : 0;
        const successRate = (completedTasks + failedTasks) > 0 ? completedTasks / (completedTasks + failedTasks) : 0;

        return {
            totalTasks,
            completedTasks,
            failedTasks,
            inProgressTasks,
            completionRate,
            successRate,
            elapsedTime,
            estimatedRemainingTime: this.estimateRemainingTime(completionRate, elapsedTime)
        };
    }

    /**
     * 估算剩餘時間
     */
    estimateRemainingTime(completionRate, elapsedTime) {
        if (completionRate <= 0) return Infinity;
        return (elapsedTime / completionRate) - elapsedTime;
    }

    /**
     * 估算任務時間
     */
    estimateTaskTime(studentCount, seatCount) {
        return studentCount * seatCount * 10;
    }

    /**
     * 計算性能指標
     */
    calculatePerformanceMetrics() {
        const completedTasks = Array.from(this.completedTasks.values());
        const totalExecutionTime = completedTasks.reduce((sum, task) => sum + (task.executionTime || 0), 0);
        const averageTaskTime = completedTasks.length > 0 ? totalExecutionTime / completedTasks.length : 0;
        const workerUtilization = this.busyWorkers.size / this.workerPool.size;
        const throughput = completedTasks.length / (this.progressTracker.elapsedTime / 1000);
        const errorRate = this.failedTasks.size / (this.completedTasks.size + this.failedTasks.size);

        return {
            totalExecutionTime,
            averageTaskTime,
            workerUtilization,
            throughput,
            errorRate
        };
    }

    /**
     * 生成進度建議
     */
    generateProgressRecommendations(progress, stats) {
        const recommendations = [];

        if (progress.completionRate < 0.3 && progress.elapsedTime > 60000) {
            recommendations.push('進度較慢，建議檢查任務複雜度或增加Worker數量');
        }

        if (stats.workers.utilization < 0.5) {
            recommendations.push('Worker利用率較低，可以考慮減少Worker數量以節省資源');
        }

        if (progress.successRate < 0.8) {
            recommendations.push('成功率較低，建議檢查任務配置和錯誤處理');
        }

        return recommendations;
    }

    /**
     * 優化衝突
     */
    optimizeConflicts(conflicts) {
        const uniqueConflicts = conflicts.filter((conflict, index, self) =>
            index === self.findIndex(c => 
                c.studentId === conflict.studentId && 
                c.seatId === conflict.seatId
            )
        );

        return {
            optimizedConflicts: uniqueConflicts,
            improvement: conflicts.length - uniqueConflicts.length
        };
    }

    /**
     * 優化分配
     */
    optimizeAssignment(assignment) {
        const optimizedAssignment = new Map();
        const duplicates = [];

        for (const [studentId, seat] of assignment.entries()) {
            if (optimizedAssignment.has(studentId)) {
                duplicates.push({ studentId, seat });
            } else {
                optimizedAssignment.set(studentId, seat);
            }
        }

        return {
            optimizedAssignment,
            improvement: duplicates.length
        };
    }

    /**
     * 計算改進分數
     */
    calculateImprovementScore(original, optimized) {
        let score = 0;

        if (original.conflicts && optimized.conflicts) {
            const conflictReduction = original.conflicts.length - optimized.conflicts.length;
            score += conflictReduction * 10;
        }

        if (optimized.score > original.score) {
            score += (optimized.score - original.score) * 100;
        }

        return score;
    }

    /**
     * 處理執行結果
     */
    processExecutionResults(results, distribution) {
        const processed = {
            completed: [],
            failed: [],
            partial: []
        };

        for (const result of results) {
            if (result.status === 'fulfilled') {
                processed.completed.push(result.value);
            } else {
                processed.failed.push(result.reason);
            }
        }

        return processed;
    }

    /**
     * 銷毀並行處理器
     */
    dispose() {
        this.logger.log('INFO', 'ParallelProcessor', '開始銷毀並行處理器');
        
        this.cleanupWorkers();
        
        this.taskQueue = [];
        this.runningTasks.clear();
        this.completedTasks.clear();
        this.failedTasks.clear();
        
        this.logger.log('INFO', 'ParallelProcessor', '並行處理器銷毀完成');
    }
}

module.exports = { ParallelProcessor };