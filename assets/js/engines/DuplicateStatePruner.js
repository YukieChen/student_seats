/**
 * 重複狀態剪枝器模組
 * 負責檢測和剪枝重複狀態，包括等價狀態、對稱狀態、循環狀態等
 */
const { Logger } = require('./Logger.js');

class DuplicateStatePruner {
    constructor(options = {}) {
        this.logger = new Logger('DuplicateStatePruner');
        this.options = {
            ...options
        };

        // 重複狀態剪枝緩存
        this.duplicateStatesCache = new Set();
        this.stateHistory = [];
        this.duplicatePruningStats = {
            totalChecks: 0,
            prunedDuplicates: 0,
            cacheHits: 0,
            stateComparisons: 0
        };
    }

    /**
     * 重複狀態剪枝檢查
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 剪枝檢查結果
     */
    pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment) {
        this.duplicatePruningStats.totalChecks++;

        // 生成標準化狀態鍵
        const stateKey = this.generateNormalizedStateKey(students, seats, currentState, currentAssignment);

        // 1. 檢查等價狀態（不同學生順序，相同分配）
        if (this.checkEquivalentState(students, seats, currentState, currentAssignment)) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.debug('等價狀態，剪枝狀態', { stateKey });
            return {
                shouldPrune: true,
                reason: '等價狀態',
                duplicateType: 'equivalent_state',
                stateKey,
                stats: this.duplicatePruningStats
            };
        }

        // 2. 檢查緩存命中
        if (this.duplicateStatesCache.has(stateKey)) {
            this.duplicatePruningStats.cacheHits++;
            this.logger.debug('緩存命中，剪枝重複狀態', { stateKey });
            return {
                shouldPrune: true,
                reason: '重複狀態（快取命中）',
                duplicateType: 'cache_hit',
                stateKey,
                stats: this.duplicatePruningStats
            };
        }

        // 3. 檢查歷史重複
        if (this.checkStateHistoryDuplicate(stateKey)) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.debug('歷史重複，剪枝狀態', { stateKey });
            return {
                shouldPrune: true,
                reason: '重複狀態（歷史記錄）',
                duplicateType: 'history_duplicate',
                stateKey,
                stats: this.duplicatePruningStats
            };
        }

        // 4. 檢查循環狀態（重複狀態序列）
        if (this.checkCycleState()) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.debug('循環狀態，剪枝狀態', { stateKey });
            return {
                shouldPrune: true,
                reason: '循環狀態',
                duplicateType: 'cycle_state',
                stateKey,
                stats: this.duplicatePruningStats
            };
        }

        // 記錄當前狀態並添加到緩存
        this.recordCurrentState(stateKey);
        this.duplicateStatesCache.add(stateKey);

        return {
            shouldPrune: false,
            reason: '無重複',
            duplicateType: 'no_duplicate',
            stateKey,
            stats: this.duplicatePruningStats
        };
    }

    /**
     * 生成標準化狀態鍵
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {string} 標準化狀態鍵
     */
    generateNormalizedStateKey(students, seats, currentState, currentAssignment) {
        // 參數驗證
        if (!Array.isArray(students)) {
            students = [];
        }
        if (!Array.isArray(seats)) {
            seats = [];
        }

        // 標準化學生ID列表
        const studentIds = students.map(s => s.id).sort((a, b) => String(a).localeCompare(String(b))).join(',');

        // 標準化座位ID列表
        const seatIds = seats.map(s => s.id).sort((a, b) => String(a).localeCompare(String(b))).join(',');

        // 標準化分配信息
        const assignmentPairs = [];
        if (currentAssignment && currentAssignment instanceof Map) {
            for (const [student, seat] of currentAssignment.entries()) {
                assignmentPairs.push(`${student.id}:${seat.id}`);
            }
        }
        const assignmentInfo = assignmentPairs.sort().join(',');

        // 標準化狀態信息
        const stateInfo = {
            studentIds: studentIds,
            seatIds: seatIds,
            assignment: assignmentInfo,
            depth: currentState ? currentState.depth || 0 : 0,
            assignedCount: currentState ? currentState.assignedCount || 0 : 0
        };

        return JSON.stringify(stateInfo);
    }

    /**
     * 檢查狀態歷史重複
     * @param {string} stateKey 狀態鍵
     * @returns {boolean} 是否重複
     */
    checkStateHistoryDuplicate(stateKey) {
        return this.stateHistory.some(record => record.stateKey === stateKey);
    }

    /**
     * 檢查等價狀態
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否等價
     */
    checkEquivalentState(students, seats, currentState, currentAssignment) {
        // 生成學生排列
        const permutations = this.generateStudentPermutations(students);

        for (const permutation of permutations) {
            const permutedKey = this.generateStateKeyForPermutation(permutation, seats, currentState, currentAssignment);
            if (this.duplicateStatesCache.has(permutedKey)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 生成學生排列
     * @param {Array} students 學生列表
     * @returns {Array} 排列列表
     */
    generateStudentPermutations(students) {
        if (students.length <= 1) {
            return [students];
        }

        const permutations = [];
        for (let i = 0; i < students.length; i++) {
            const current = students[i];
            const remaining = students.slice(0, i).concat(students.slice(i + 1));
            const subPermutations = this.generateStudentPermutations(remaining);

            for (const subPerm of subPermutations) {
                permutations.push([current, ...subPerm]);
            }
        }

        return permutations;
    }

    /**
     * 為排列生成狀態鍵
     * @param {Array} permutedStudents 排列後的學生
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {string} 狀態鍵
     */
    generateStateKeyForPermutation(permutedStudents, seats, currentState, currentAssignment) {
        const stateInfo = this.normalizeStateInfo(permutedStudents, seats, currentState, currentAssignment);
        return JSON.stringify(stateInfo);
    }

    /**
     * 標準化狀態信息
     * @param {Array|Object} students 學生列表或狀態物件
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 標準化狀態信息
     */
    normalizeStateInfo(students, seats, currentState, currentAssignment) {
        // 如果第一個參數是物件，則認為是狀態物件
        if (students && typeof students === 'object' && !Array.isArray(students)) {
            const state = students;
            const normalized = {
                depth: state.depth || 0,
                assignedCount: state.assignedCount || 0,
                remainingStudents: state.remainingStudents ? state.remainingStudents.map(s => s.id).sort((a, b) => String(a).localeCompare(String(b))).join(',') : '',
                availableSeats: state.availableSeats ? state.availableSeats.map(s => s.id).sort((a, b) => String(a).localeCompare(String(b))).join(',') : '',
                cyclePattern: state.cyclePattern ? state.cyclePattern.join('->') : ''
            };
            return JSON.stringify(normalized);
        }

        // 參數驗證
        if (!Array.isArray(students)) {
            students = [];
        }
        if (!Array.isArray(seats)) {
            seats = [];
        }

        // 標準化分配信息
        const normalizedAssignment = {};
        if (currentAssignment && currentAssignment instanceof Map) {
            for (const [student, seat] of currentAssignment.entries()) {
                normalizedAssignment[student.id] = seat.id;
            }
        }

        // 標準化學生信息
        const normalizedStudents = students.map(s => ({
            id: s.id,
            name: s.name,
            group: s.group || null
        })).sort((a, b) => String(a.id).localeCompare(String(b.id)));

        // 標準化座位信息
        const normalizedSeats = seats.map(s => ({
            id: s.id,
            row: s.row,
            column: s.column,
            type: s.type || 'normal'
        })).sort((a, b) => String(a.id).localeCompare(String(b.id)));

        return {
            assignment: normalizedAssignment,
            students: normalizedStudents,
            seats: normalizedSeats,
            state: currentState
        };
    }

    /**
     * 檢查循環狀態
     * @returns {boolean} 是否循環
     */
    checkCycleState() {
        if (this.stateHistory.length < 10) {
            return false;
        }

        // 檢查最近10個狀態是否形成循環
        const recentStates = this.stateHistory.slice(-10);
        const stateKeys = recentStates.map(record => record.stateKey);

        // 檢查是否有重複的狀態鍵
        const uniqueKeys = new Set(stateKeys);
        if (uniqueKeys.size < stateKeys.length * 0.7) { // 如果重複率超過30%
            return true;
        }

        // 檢查循環模式
        for (let cycleLength = 2; cycleLength <= 5; cycleLength++) {
            if (this.checkCyclePattern(stateKeys, cycleLength)) {
                return true;
            }
        }

        return false;
    }

    /**
     * 檢查循環模式
     * @param {Array} stateKeys 狀態鍵列表
     * @param {number} cycleLength 循環長度
     * @returns {boolean} 是否循環
     */
    checkCyclePattern(stateKeys, cycleLength) {
        if (stateKeys.length < cycleLength * 2) {
            return false;
        }

        const pattern = stateKeys.slice(-cycleLength);
        const previousPattern = stateKeys.slice(-cycleLength * 2, -cycleLength);

        return JSON.stringify(pattern) === JSON.stringify(previousPattern);
    }

    /**
     * 記錄當前狀態
     * @param {string} stateKey 狀態鍵
     */
    recordCurrentState(stateKey) {
        const record = {
            stateKey,
            timestamp: Date.now(),
            depth: this.getCurrentDepth()
        };

        this.stateHistory.push(record);

        // 限制歷史記錄大小
        if (this.stateHistory.length > 1000) {
            this.stateHistory = this.stateHistory.slice(-500);
        }
    }

    /**
     * 獲取當前深度
     * @returns {number} 當前深度
     */
    getCurrentDepth() {
        return this.stateHistory.length;
    }

    /**
     * 獲取重複狀態剪枝統計
     * @returns {Object} 統計信息
     */
    getDuplicatePruningStats() {
        return {
            ...this.duplicatePruningStats,
            cacheSize: this.duplicateStatesCache.size,
            historySize: this.stateHistory.length
        };
    }

    /**
     * 清理緩存
     */
    clearCache() {
        this.duplicateStatesCache.clear();
        this.stateHistory = [];
        this.duplicatePruningStats = {
            totalChecks: 0,
            prunedDuplicates: 0,
            cacheHits: 0,
            stateComparisons: 0
        };
        this.logger.info('重複狀態緩存已清理');
    }

    /**
     * 初始化重複狀態剪枝器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.clearCache();
        this.logger.info('重複狀態剪枝器初始化完成');
    }

    /**
     * 銷毀重複狀態剪枝器
     */
    dispose() {
        this.clearCache();
        this.logger.info('重複狀態剪枝器銷毀完成');
    }
}

module.exports = { DuplicateStatePruner };
