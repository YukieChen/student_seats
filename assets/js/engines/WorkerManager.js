/**
 * Worker 管理器模組
 * 負責 Worker 池管理、創建、通信和錯誤處理
 */
const { Logger } = require('./Logger.js');

class WorkerManager {
    constructor(options = {}) {
        this.logger = new Logger('WorkerManager');
        this.options = {
            maxWorkers: options.maxWorkers || 4,
            workerTimeout: options.workerTimeout || 30000,
            enableErrorRecovery: options.enableErrorRecovery !== false,
            ...options
        };

        // Worker池管理
        this.workerPool = new Map();
        this.availableWorkers = [];
        this.busyWorkers = new Set();
    }

    /**
     * 初始化 Worker 管理器
     */
    initialize() {
        this.logger.info('初始化 Worker 管理器', {
            maxWorkers: this.options.maxWorkers
        });
        this.createWorkerPool();
    }

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
        this.logger.info(`創建了 ${this.workerPool.size} 個Worker`);
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
            this.logger.error('創建Worker失敗', error);
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
        this.logger.error(`Worker ${worker.id} 錯誤`, error);
        worker.errorCount++;
        
        if (worker.errorCount > 3) {
            this.recreateWorker(worker);
        }
    }

    /**
     * 處理Worker消息錯誤
     */
    handleWorkerMessageError(worker, error) {
        this.logger.error(`Worker ${worker.id} 消息錯誤`, error);
    }

    /**
     * 重新創建Worker
     */
    recreateWorker(worker) {
        this.logger.warn(`重新創建Worker ${worker.id}`);
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
                this.logger.info(`清理閒置Worker ${workerId}`);
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
            this.logger.error(`與Worker ${worker.id} 通信失敗`, error);
            this.handleWorkerError(worker, error);
        }
    }

    /**
     * 清理Workers
     */
    cleanupWorkers() {
        this.logger.info('開始清理Workers');

        for (const [workerId, worker] of this.workerPool.entries()) {
            this.terminateWorker(worker);
        }

        this.workerPool.clear();
        this.availableWorkers = [];
        this.busyWorkers.clear();

        this.logger.info('Workers清理完成');
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
            this.logger.error(`終止Worker ${worker.id} 失敗`, error);
        }
    }

    /**
     * 獲取可用Worker
     */
    getAvailableWorker() {
        return this.availableWorkers.length > 0 ? this.availableWorkers.shift() : null;
    }

    /**
     * 分配Worker
     */
    assignWorker(worker) {
        worker.status = 'busy';
        this.busyWorkers.add(worker);
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
     * 完成任務
     */
    completeTask(taskId, result, executionTime) {
        // 這個方法將被 TaskScheduler 調用
        if (this.onTaskComplete) {
            this.onTaskComplete(taskId, result, executionTime);
        }
    }

    /**
     * 失敗任務
     */
    failTask(taskId, error) {
        // 這個方法將被 TaskScheduler 調用
        if (this.onTaskFail) {
            this.onTaskFail(taskId, error);
        }
    }

    /**
     * 設置任務完成回調
     */
    setTaskCompleteCallback(callback) {
        this.onTaskComplete = callback;
    }

    /**
     * 設置任務失敗回調
     */
    setTaskFailCallback(callback) {
        this.onTaskFail = callback;
    }

    /**
     * 銷毀 Worker 管理器
     */
    dispose() {
        this.logger.info('開始銷毀 Worker 管理器');
        this.cleanupWorkers();
        this.logger.info('Worker 管理器銷毀完成');
    }
}

module.exports = { WorkerManager };
