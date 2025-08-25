/**
 * 並行處理器協調器
 * 整合 Worker 管理、任務調度和結果處理功能
 */
const { WorkerManager } = require('./WorkerManager.js');
const { TaskScheduler } = require('./TaskScheduler.js');
const { ResultProcessor } = require('./ResultProcessor.js');
const { Logger } = require('./Logger.js');

class ParallelProcessor {
    constructor(options = {}) {
        this.logger = new Logger('ParallelProcessor');
        this.options = {
            maxWorkers: options.maxWorkers || 4,
            workerTimeout: options.workerTimeout || 30000,
            taskTimeout: options.taskTimeout || 60000,
            enableProgressCallback: options.enableProgressCallback !== false,
            enableErrorRecovery: options.enableErrorRecovery !== false,
            ...options
        };

        // 初始化子模組
        this.workerManager = new WorkerManager(options);
        this.taskScheduler = new TaskScheduler(options);
        this.resultProcessor = new ResultProcessor(options);
    }

    /**
     * 初始化並行處理器
     */
    initialize() {
        this.logger.info('初始化並行處理器', {
            maxWorkers: this.options.maxWorkers
        });
        
        // 初始化子模組
        this.workerManager.initialize();
        this.taskScheduler.initialize();
        this.resultProcessor.initialize();
        
        // 設置回調
        this.workerManager.setTaskCompleteCallback((taskId, result, executionTime) => {
            this.taskScheduler.completeTask(taskId, result, executionTime);
        });
        
        this.workerManager.setTaskFailCallback((taskId, error) => {
            this.taskScheduler.failTask(taskId, error);
        });
    }

    // ==================== Worker 管理代理方法 ====================

    /**
     * 創建Worker池
     */
    createWorkerPool() {
        return this.workerManager.createWorkerPool();
    }

    /**
     * 創建單個Worker
     */
    createWorker() {
        return this.workerManager.createWorker();
    }

    /**
     * 生成Worker腳本
     */
    generateWorkerScript() {
        return this.workerManager.generateWorkerScript();
    }

    /**
     * 設置Worker事件監聽器
     */
    setupWorkerEventListeners(worker) {
        return this.workerManager.setupWorkerEventListeners(worker);
    }

    /**
     * 處理Worker消息
     */
    handleWorkerMessage(worker, message) {
        return this.workerManager.handleWorkerMessage(worker, message);
    }

    /**
     * 處理Worker錯誤
     */
    handleWorkerError(worker, error) {
        return this.workerManager.handleWorkerError(worker, error);
    }

    /**
     * 處理Worker消息錯誤
     */
    handleWorkerMessageError(worker, error) {
        return this.workerManager.handleWorkerMessageError(worker, error);
    }

    /**
     * 重新創建Worker
     */
    recreateWorker(worker) {
        return this.workerManager.recreateWorker(worker);
    }

    /**
     * 管理Workers
     */
    manageWorkers() {
        return this.workerManager.manageWorkers();
    }

    /**
     * 與Worker通信
     */
    communicateWithWorker(worker, message) {
        return this.workerManager.communicateWithWorker(worker, message);
    }

    /**
     * 清理Workers
     */
    cleanupWorkers() {
        return this.workerManager.cleanupWorkers();
    }

    /**
     * 終止Worker
     */
    terminateWorker(worker) {
        return this.workerManager.terminateWorker(worker);
    }

    /**
     * 獲取可用Worker
     */
    getAvailableWorker() {
        return this.workerManager.getAvailableWorker();
    }

    /**
     * 分配Worker
     */
    assignWorker(worker) {
        return this.workerManager.assignWorker(worker);
    }

    /**
     * 釋放Worker
     */
    releaseWorker(worker) {
        return this.workerManager.releaseWorker(worker);
    }

    // ==================== 任務調度代理方法 ====================

    /**
     * 任務分解
     */
    decomposeTask(task, options = {}) {
        return this.taskScheduler.decomposeTask(task, options);
    }

    /**
     * 按塊分解任務
     */
    decomposeByChunk(task, maxChunkSize) {
        return this.taskScheduler.decomposeByChunk(task, maxChunkSize);
    }

    /**
     * 按優先級分解任務
     */
    decomposeByPriority(task) {
        return this.taskScheduler.decomposeByPriority(task);
    }

    /**
     * 按複雜度分解任務
     */
    decomposeByComplexity(task) {
        return this.taskScheduler.decomposeByComplexity(task);
    }

    /**
     * 計算學生複雜度
     */
    calculateStudentComplexity(student, conditions) {
        return this.taskScheduler.calculateStudentComplexity(student, conditions);
    }

    /**
     * 負載均衡
     */
    balanceTaskLoad(tasks) {
        return this.taskScheduler.balanceTaskLoad(tasks);
    }

    /**
     * 任務分配
     */
    distributeTasks(tasks) {
        return this.taskScheduler.distributeTasks(tasks, this.workerManager);
    }

    /**
     * 找到最佳Worker
     */
    findBestWorker(workerLoad, task) {
        return this.taskScheduler.findBestWorker(workerLoad, task);
    }

    /**
     * 計算Worker分數
     */
    calculateWorkerScore(workerLoad, task) {
        return this.taskScheduler.calculateWorkerScore(workerLoad, task);
    }

    /**
     * 任務調度
     */
    async scheduleTasks(tasks, options = {}) {
        return this.taskScheduler.scheduleTasks(tasks, this.workerManager, options);
    }

    /**
     * 任務監控
     */
    monitorTasks() {
        return this.taskScheduler.monitorTasks(this.workerManager);
    }

    // ==================== 進度追蹤代理方法 ====================

    /**
     * 進度追蹤
     */
    trackProgress(taskId, progress, details = {}) {
        return this.taskScheduler.trackProgress(taskId, progress, details);
    }

    /**
     * 進度回調
     */
    progressCallback(callback, progress) {
        return this.taskScheduler.progressCallback(callback, progress);
    }

    /**
     * 進度報告
     */
    reportProgress() {
        return this.taskScheduler.reportProgress();
    }

    /**
     * 進度優化
     */
    optimizeProgress(progress, stats) {
        return this.taskScheduler.optimizeProgress(progress, stats);
    }

    // ==================== 結果處理代理方法 ====================

    /**
     * 結果收集
     */
    collectResults(taskResults) {
        return this.resultProcessor.collectResults(taskResults);
    }

    /**
     * 結果驗證
     */
    validateResults(result, validationRules = {}) {
        return this.resultProcessor.validateResults(result, validationRules);
    }

    /**
     * 結果合併
     */
    mergeResults(results, mergeStrategy = {}) {
        return this.resultProcessor.mergeResults(results, mergeStrategy);
    }

    /**
     * 順序合併
     */
    mergeSequentially(results, conflictResolution) {
        return this.resultProcessor.mergeSequentially(results, conflictResolution);
    }

    /**
     * 並行合併
     */
    mergeInParallel(results, conflictResolution) {
        return this.resultProcessor.mergeInParallel(results, conflictResolution);
    }

    /**
     * 層次合併
     */
    mergeHierarchically(results, conflictResolution) {
        return this.resultProcessor.mergeHierarchically(results, conflictResolution);
    }

    /**
     * 解決衝突
     */
    resolveConflict(existingSeat, newSeat, strategy) {
        return this.resultProcessor.resolveConflict(existingSeat, newSeat, strategy);
    }

    /**
     * 計算座位分數
     */
    calculateSeatScore(seat) {
        return this.resultProcessor.calculateSeatScore(seat);
    }

    /**
     * 結果優化
     */
    optimizeResults(mergedResult, optimizationOptions = {}) {
        return this.resultProcessor.optimizeResults(mergedResult, optimizationOptions);
    }

    // ==================== 輔助方法代理 ====================

    /**
     * 執行任務
     */
    async executeTask(task, worker, options = {}) {
        return this.taskScheduler.executeTask(task, worker, this.workerManager, options);
    }

    /**
     * 完成任務
     */
    completeTask(taskId, result, executionTime) {
        return this.taskScheduler.completeTask(taskId, result, executionTime);
    }

    /**
     * 失敗任務
     */
    failTask(taskId, error) {
        return this.taskScheduler.failTask(taskId, error);
    }

    /**
     * 初始化進度追蹤
     */
    initializeProgressTracking(totalTasks) {
        return this.taskScheduler.initializeProgressTracking(totalTasks);
    }

    /**
     * 更新進度
     */
    updateProgress() {
        return this.taskScheduler.updateProgress();
    }

    /**
     * 更新總體進度
     */
    updateOverallProgress() {
        return this.taskScheduler.updateOverallProgress();
    }

    /**
     * 獲取進度
     */
    getProgress() {
        return this.taskScheduler.getProgress();
    }

    /**
     * 估算剩餘時間
     */
    estimateRemainingTime(completionRate, elapsedTime) {
        return this.taskScheduler.estimateRemainingTime(completionRate, elapsedTime);
    }

    /**
     * 估算任務時間
     */
    estimateTaskTime(studentCount, seatCount) {
        return this.taskScheduler.estimateTaskTime(studentCount, seatCount);
    }

    /**
     * 計算性能指標
     */
    calculatePerformanceMetrics() {
        return this.taskScheduler.calculatePerformanceMetrics();
    }

    /**
     * 生成進度建議
     */
    generateProgressRecommendations(progress, stats) {
        return this.taskScheduler.generateProgressRecommendations(progress, stats);
    }

    /**
     * 優化衝突
     */
    optimizeConflicts(conflicts) {
        return this.resultProcessor.optimizeConflicts(conflicts);
    }

    /**
     * 優化分配
     */
    optimizeAssignment(assignment) {
        return this.resultProcessor.optimizeAssignment(assignment);
    }

    /**
     * 計算改進分數
     */
    calculateImprovementScore(original, optimized) {
        return this.resultProcessor.calculateImprovementScore(original, optimized);
    }

    /**
     * 處理執行結果
     */
    processExecutionResults(results, distribution) {
        return this.resultProcessor.processExecutionResults(results, distribution);
    }

    /**
     * 銷毀並行處理器
     */
    dispose() {
        this.logger.info('開始銷毀並行處理器');
        
        // 銷毀子模組
        this.workerManager.dispose();
        this.taskScheduler.dispose();
        this.resultProcessor.dispose();
        
        this.logger.info('並行處理器銷毀完成');
    }
}

module.exports = { ParallelProcessor };