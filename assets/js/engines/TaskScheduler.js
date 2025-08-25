/**
 * 任務調度器模組
 * 負責任務分割、調度、進度追蹤和監控
 */
const { Logger } = require('./Logger.js');

class TaskScheduler {
    constructor(options = {}) {
        this.logger = new Logger('TaskScheduler');
        this.options = {
            maxWorkers: options.maxWorkers || 4,
            taskTimeout: options.taskTimeout || 60000,
            enableProgressCallback: options.enableProgressCallback !== false,
            ...options
        };

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
    }

    /**
     * 初始化任務調度器
     */
    initialize() {
        this.logger.info('初始化任務調度器', {
            maxWorkers: this.options.maxWorkers,
            taskTimeout: this.options.taskTimeout
        });
    }

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
    distributeTasks(tasks, workerManager) {
        const distribution = {
            assignedTasks: new Map(),
            unassignedTasks: [],
            workerLoad: new Map()
        };

        for (const [workerId, worker] of workerManager.workerPool.entries()) {
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
    async scheduleTasks(tasks, workerManager, options = {}) {
        const {
            enableProgressCallback = this.options.enableProgressCallback,
            progressCallback = null,
            timeout = this.options.taskTimeout
        } = options;

        this.logger.info('開始任務調度', {
            taskCount: tasks.length,
            workerCount: workerManager.workerPool.size
        });

        this.initializeProgressTracking(tasks.length);

        const subTasks = [];
        for (const task of tasks) {
            const decomposed = this.decomposeTask(task, options);
            subTasks.push(...decomposed);
        }

        const distribution = this.distributeTasks(subTasks, workerManager);

        const executionPromises = [];
        for (const [taskId, assignment] of distribution.assignedTasks.entries()) {
            const promise = this.executeTask(assignment.task, assignment.worker, workerManager, {
                timeout,
                enableProgressCallback,
                progressCallback
            });
            executionPromises.push(promise);
        }

        const results = await Promise.allSettled(executionPromises);
        const finalResults = this.processExecutionResults(results, distribution);

        this.logger.info('任務調度完成', {
            totalTasks: tasks.length,
            completedTasks: finalResults.completed.length,
            failedTasks: finalResults.failed.length
        });

        return finalResults;
    }

    /**
     * 任務監控
     */
    monitorTasks(workerManager) {
        const stats = {
            queue: {
                pending: this.taskQueue.length,
                running: this.runningTasks.size,
                completed: this.completedTasks.size,
                failed: this.failedTasks.size
            },
            workers: workerManager.manageWorkers(),
            progress: this.getProgress(),
            performance: this.calculatePerformanceMetrics()
        };

        return stats;
    }

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
                this.logger.error('進度回調執行失敗', error);
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

    /**
     * 執行任務
     */
    async executeTask(task, worker, workerManager, options = {}) {
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

            workerManager.communicateWithWorker(worker, {
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
        const throughput = completedTasks.length / (this.progressTracker.elapsedTime / 1000);
        const errorRate = this.failedTasks.size / (this.completedTasks.size + this.failedTasks.size);

        return {
            totalExecutionTime,
            averageTaskTime,
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
     * 銷毀任務調度器
     */
    dispose() {
        this.logger.info('開始銷毀任務調度器');
        
        this.taskQueue = [];
        this.runningTasks.clear();
        this.completedTasks.clear();
        this.failedTasks.clear();
        
        this.logger.info('任務調度器銷毀完成');
    }
}

module.exports = { TaskScheduler };
