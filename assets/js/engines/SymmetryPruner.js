/**
 * 對稱性剪枝器模組
 * 負責檢測和剪枝對稱狀態，包括水平對稱、垂直對稱等
 */
const { Logger } = require('./Logger.js');

class SymmetryPruner {
    constructor(options = {}) {
        this.logger = new Logger('SymmetryPruner');
        this.options = {
            ...options
        };
    }

    /**
     * 檢查對稱狀態
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 對稱檢查結果
     */
    checkSymmetricState(students, seats, currentState, currentAssignment) {
        // 檢查水平對稱
        if (this.checkHorizontalSymmetry(students, seats, currentState, currentAssignment)) {
            return { isSymmetric: true, symmetryType: 'horizontal' };
        }

        // 檢查垂直對稱
        if (this.checkVerticalSymmetry(students, seats, currentState, currentAssignment)) {
            return { isSymmetric: true, symmetryType: 'vertical' };
        }

        return { isSymmetric: false, symmetryType: null };
    }

    /**
     * 檢查水平對稱
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否水平對稱
     */
    checkHorizontalSymmetry(students, seats, currentState, currentAssignment) {
        // 找到最大列數
        const maxColumn = Math.max(...seats.map(s => s.column));

        // 創建對稱分配
        const symmetricAssignment = new Map();
        for (const [student, seat] of currentAssignment.entries()) {
            const symmetricColumn = maxColumn - seat.column + 1;
            const symmetricSeat = seats.find(s => s.row === seat.row && s.column === symmetricColumn);
            if (symmetricSeat) {
                symmetricAssignment.set(student, symmetricSeat);
            }
        }

        // 檢查對稱分配是否已存在於緩存或歷史記錄中
        const symmetricKey = this.generateNormalizedStateKey(students, seats, currentState, symmetricAssignment);
        return this.checkStateExists(symmetricKey);
    }

    /**
     * 檢查垂直對稱
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {boolean} 是否垂直對稱
     */
    checkVerticalSymmetry(students, seats, currentState, currentAssignment) {
        // 找到最大行數
        const maxRow = Math.max(...seats.map(s => s.row));

        // 創建對稱分配
        const symmetricAssignment = new Map();
        for (const [student, seat] of currentAssignment.entries()) {
            const symmetricRow = maxRow - seat.row + 1;
            const symmetricSeat = seats.find(s => s.row === symmetricRow && s.column === seat.column);
            if (symmetricSeat) {
                symmetricAssignment.set(student, symmetricSeat);
            }
        }

        // 檢查對稱分配是否已存在於緩存或歷史記錄中
        const symmetricKey = this.generateNormalizedStateKey(students, seats, currentState, symmetricAssignment);
        return this.checkStateExists(symmetricKey);
    }

    /**
     * 對稱性剪枝
     * @param {Array} candidates 候選列表
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 分配狀態
     * @returns {Array} 剪枝後的候選列表
     */
    pruneSymmetries(candidates, currentState, assignment) {
        if (!candidates || candidates.length === 0) {
            return candidates;
        }

        const prunedCandidates = [];
        const symmetryGroups = new Map();

        for (const candidate of candidates) {
            const symmetryKey = this.generateSymmetryKey(candidate, currentState, assignment);

            if (!symmetryGroups.has(symmetryKey)) {
                symmetryGroups.set(symmetryKey, candidate);
                prunedCandidates.push(candidate);
            }
        }

        this.logger.debug('對稱性剪枝完成', {
            originalCount: candidates.length,
            prunedCount: prunedCandidates.length,
            removedCount: candidates.length - prunedCandidates.length
        });

        return prunedCandidates;
    }

    /**
     * 生成對稱性鍵值
     * @param {Object} candidate 候選
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 分配狀態
     * @returns {string} 對稱性鍵值
     */
    generateSymmetryKey(candidate, currentState, assignment) {
        // 生成標準化的候選表示
        const normalizedCandidate = {
            studentId: candidate.student ? candidate.student.id : candidate.studentId,
            seatId: candidate.seat ? candidate.seat.id : candidate.seatId,
            row: candidate.seat ? candidate.seat.row : candidate.row,
            col: candidate.seat ? candidate.seat.col : candidate.col,
            groupId: candidate.seat ? candidate.seat.groupId : candidate.groupId
        };

        // 考慮對稱性，標準化位置信息
        const symmetryInfo = {
            relativePosition: this.calculateRelativePosition(normalizedCandidate, assignment),
            groupAssignment: normalizedCandidate.groupId,
            studentGroup: candidate.student ? candidate.student.group : null
        };

        return JSON.stringify(symmetryInfo);
    }

    /**
     * 計算相對位置
     * @param {Object} candidate 候選
     * @param {Map} assignment 分配狀態
     * @returns {Object} 相對位置
     */
    calculateRelativePosition(candidate, assignment) {
        if (!assignment || assignment.size === 0) {
            return { row: candidate.row, col: candidate.col };
        }

        // 計算已分配座位的邊界
        let minRow = Infinity, maxRow = -Infinity;
        let minCol = Infinity, maxCol = -Infinity;

        for (const seat of assignment.values()) {
            minRow = Math.min(minRow, seat.row);
            maxRow = Math.max(maxRow, seat.row);
            minCol = Math.min(minCol, seat.col);
            maxCol = Math.max(maxCol, seat.col);
        }

        // 計算相對位置
        const relativeRow = candidate.row - minRow;
        const relativeCol = candidate.col - minCol;

        return { row: relativeRow, col: relativeCol };
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
     * 檢查狀態是否存在
     * @param {string} stateKey 狀態鍵
     * @returns {boolean} 狀態是否存在
     */
    checkStateExists(stateKey) {
        // 這裡需要與其他剪枝器協作，暫時返回 false
        // 實際實現中應該檢查緩存或歷史記錄
        return false;
    }

    /**
     * 初始化對稱性剪枝器
     * @param {Object} options 初始化選項
     */
    initialize(options = {}) {
        this.options = { ...this.options, ...options };
        this.logger.info('對稱性剪枝器初始化完成');
    }

    /**
     * 銷毀對稱性剪枝器
     */
    dispose() {
        this.logger.info('對稱性剪枝器銷毀完成');
    }
}

module.exports = { SymmetryPruner };
