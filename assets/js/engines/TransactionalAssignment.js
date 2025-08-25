// TransactionalAssignment.js - 事務性分配管理
export class TransactionalAssignment {
    constructor(initialSeats = []) {
        // 狀態管理
        this.committedAssignments = new Map();
        this.pendingAssignments = new Map();
        this.snapshots = [];
        this.maxSnapshots = 10;

        // 操作歷史
        this.operationHistory = [];
        this.maxHistorySize = 1000;

        // 初始化座位信息
        this.seats = initialSeats;
        this.availableSeats = new Set(initialSeats.map(seat => seat.id || `${seat.row}-${seat.col}`));
    }

    /**
     * 分配學生到座位
     * @param {string} studentId 學生ID
     * @param {Object} seat 座位對象
     * @param {Object} context 上下文信息
     * @returns {Object} 分配結果
     */
    assign(studentId, seat, context = {}) {
        if (!seat) {
            return {
                success: false,
                error: '座位不能為空',
                studentId
            };
        }

        const seatKey = seat.id || `${seat.row}-${seat.col}`;
        
        // 檢查學生是否已經被分配
        if (this.pendingAssignments.has(studentId) || this.committedAssignments.has(studentId)) {
            return {
                success: false,
                error: '學生已經被分配',
                studentId
            };
        }

        // 創建操作記錄
        const operation = {
            id: this.generateOperationId(),
            type: 'ASSIGN',
            studentId,
            seat,
            seatKey,
            timestamp: Date.now(),
            context,
            status: 'PENDING'
        };

        // 執行分配
        this.pendingAssignments.set(studentId, seat);

        // 記錄操作歷史
        this.recordOperation(operation);

        return {
            success: true,
            operationId: operation.id,
            assignment: {
                studentId,
                seat,
                seatKey
            }
        };
    }

    /**
     * 提交當前事務
     * @returns {Object} 提交結果
     */
    commit() {
        if (this.pendingAssignments.size === 0) {
            return {
                success: false,
                error: '沒有待提交的操作'
            };
        }

        try {
            // 創建快照
            const snapshot = this.createSnapshot('COMMIT');

            // 將待處理分配複製到已提交分配
            for (const [studentId, seat] of this.pendingAssignments) {
                this.committedAssignments.set(studentId, seat);
            }

            // 清空待處理分配
            this.pendingAssignments.clear();

            return {
                success: true,
                snapshotId: snapshot.id,
                committedOperations: this.pendingAssignments.size,
                assignmentCount: this.committedAssignments.size
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                rollbackRequired: true
            };
        }
    }

    /**
     * 回滾當前事務
     * @returns {Object} 回滾結果
     */
    rollback() {
        if (this.pendingAssignments.size === 0) {
            return {
                success: false,
                error: '沒有待回滾的操作'
            };
        }

        try {
            // 創建快照
            const snapshot = this.createSnapshot('ROLLBACK');

            // 清空待處理分配
            this.pendingAssignments.clear();

            return {
                success: true,
                snapshotId: snapshot.id,
                rolledBackOperations: this.pendingAssignments.size,
                restoredSeats: this.availableSeats.size
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 創建狀態快照
     * @param {string} reason 快照原因
     * @returns {Object} 快照對象
     */
    createSnapshot(reason = 'MANUAL') {
        const snapshot = {
            id: this.generateSnapshotId(),
            timestamp: Date.now(),
            reason,
            state: {
                committedAssignments: new Map(this.committedAssignments),
                pendingAssignments: new Map(this.pendingAssignments),
                availableSeats: new Set(this.availableSeats)
            }
        };

        this.snapshots.push(snapshot);

        // 限制快照數量
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
        }

        return snapshot;
    }

    /**
     * 獲取當前狀態
     * @returns {Object} 當前狀態
     */
    getCurrentState() {
        return {
            committedAssignments: new Map(this.committedAssignments),
            pendingAssignments: new Map(this.pendingAssignments),
            snapshots: [...this.snapshots],
            totalSeats: this.seats.length,
            assignedSeats: this.pendingAssignments.size,
            committedSeats: this.committedAssignments.size,
            availableSeatsCount: this.availableSeats.size
        };
    }

    /**
     * 恢復狀態
     * @param {string} snapshotId 快照ID
     * @returns {Object} 恢復結果
     */
    restoreState(snapshotId) {
        const snapshot = this.snapshots.find(s => s.id === snapshotId);
        
        if (!snapshot) {
            return {
                success: false,
                error: '快照不存在',
                snapshotId
            };
        }

        try {
            // 恢復狀態
            this.committedAssignments = new Map(snapshot.state.committedAssignments);
            this.pendingAssignments = new Map(snapshot.state.pendingAssignments);
            this.availableSeats = new Set(snapshot.state.availableSeats);

            return {
                success: true,
                snapshotId,
                restoredTime: snapshot.timestamp,
                assignmentCount: this.committedAssignments.size
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                snapshotId
            };
        }
    }

    /**
     * 比較狀態
     * @param {Object} state1 狀態1
     * @param {Object} state2 狀態2
     * @returns {Object} 比較結果
     */
    compareStates(state1, state2) {
        const differences = {
            assignmentChanges: [],
            seatChanges: [],
            operationChanges: []
        };

        // 比較分配變化
        for (const [studentId, seat] of state1.committedAssignments) {
            const otherSeat = state2.committedAssignments.get(studentId);
            if (!otherSeat || JSON.stringify(seat) !== JSON.stringify(otherSeat)) {
                differences.assignmentChanges.push({
                    studentId,
                    from: otherSeat || null,
                    to: seat
                });
            }
        }

        // 檢查新增的分配
        for (const [studentId, seat] of state2.committedAssignments) {
            if (!state1.committedAssignments.has(studentId)) {
                differences.assignmentChanges.push({
                    studentId,
                    from: null,
                    to: seat
                });
            }
        }

        // 比較可用座位變化
        const seats1 = Array.from(state1.availableSeats || []);
        const seats2 = Array.from(state2.availableSeats || []);
        
        const addedSeats = seats2.filter(seat => !seats1.includes(seat));
        const removedSeats = seats1.filter(seat => !seats2.includes(seat));

        if (addedSeats.length > 0 || removedSeats.length > 0) {
            differences.seatChanges = {
                added: addedSeats,
                removed: removedSeats
            };
        }

        return {
            hasChanges: differences.assignmentChanges.length > 0 || 
                       differences.seatChanges.length > 0,
            differences,
            summary: {
                assignmentChanges: differences.assignmentChanges.length,
                seatChanges: (differences.seatChanges.added || []).length + 
                            (differences.seatChanges.removed || []).length
            }
        };
    }

    /**
     * 記錄操作
     * @param {Object} operation 操作對象
     */
    recordOperation(operation) {
        this.operationHistory.push(operation);

        // 限制歷史記錄大小
        if (this.operationHistory.length > this.maxHistorySize) {
            this.operationHistory.shift();
        }
    }

    /**
     * 查詢操作歷史
     * @param {Object} filters 查詢過濾條件
     * @returns {Array} 過濾後的操作歷史
     */
    queryHistory(filters = {}) {
        let results = [...this.operationHistory];

        // 按操作類型過濾
        if (filters.type) {
            results = results.filter(op => op.type === filters.type);
        }

        // 按學生ID過濾
        if (filters.studentId) {
            results = results.filter(op => op.studentId === filters.studentId);
        }

        // 按狀態過濾
        if (filters.status) {
            results = results.filter(op => op.status === filters.status);
        }

        // 按時間範圍過濾
        if (filters.startTime) {
            results = results.filter(op => op.timestamp >= filters.startTime);
        }
        if (filters.endTime) {
            results = results.filter(op => op.timestamp <= filters.endTime);
        }

        // 排序
        if (filters.sortBy) {
            const sortField = filters.sortBy;
            const sortOrder = filters.sortOrder || 'desc';
            
            results.sort((a, b) => {
                if (sortOrder === 'asc') {
                    return a[sortField] - b[sortField];
                } else {
                    return b[sortField] - a[sortField];
                }
            });
        }

        // 限制結果數量
        if (filters.limit) {
            results = results.slice(0, filters.limit);
        }

        return results;
    }

    /**
     * 清理操作歷史
     * @param {Object} options 清理選項
     * @returns {Object} 清理結果
     */
    clearHistory(options = {}) {
        const {
            maxAge = 24 * 60 * 60 * 1000, // 24小時
            keepRecent = 100 // 保留最近的記錄數
        } = options;

        const now = Date.now();
        const cutoffTime = now - maxAge;

        const originalCount = this.operationHistory.length;

        // 移除過期的記錄
        this.operationHistory = this.operationHistory.filter(op => 
            op.timestamp > cutoffTime
        );

        // 確保保留最近的記錄
        if (this.operationHistory.length > keepRecent) {
            this.operationHistory = this.operationHistory.slice(-keepRecent);
        }

        return {
            removedCount: originalCount - this.operationHistory.length,
            remainingCount: this.operationHistory.length,
            cleanupTime: now
        };
    }

    /**
     * 獲取統計信息
     * @returns {Object} 統計信息
     */
    getStatistics() {
        const stats = {
            totalOperations: this.operationHistory.length,
            committedAssignments: this.committedAssignments.size,
            pendingAssignments: this.pendingAssignments.size,
            snapshots: this.snapshots.length,
            availableSeatsCount: this.availableSeats.size,
            totalSeats: this.seats.length
        };

        return stats;
    }

    /**
     * 驗證狀態一致性
     * @returns {Object} 驗證結果
     */
    validateState() {
        const issues = [];

        // 檢查分配一致性
        for (const [studentId, seat] of this.committedAssignments) {
            const seatKey = seat.id || `${seat.row}-${seat.col}`;
            
            // 檢查座位是否在可用座位列表中
            if (this.availableSeats.has(seatKey)) {
                issues.push({
                    type: 'INCONSISTENT_ASSIGNMENT',
                    studentId,
                    seat,
                    description: '已分配的座位仍在可用座位列表中'
                });
            }
        }

        // 檢查座位總數一致性
        const totalAssigned = this.committedAssignments.size + this.pendingAssignments.size;
        const totalAvailable = this.availableSeats.size;
        const expectedTotal = this.seats.length;

        if (totalAssigned + totalAvailable !== expectedTotal) {
            issues.push({
                type: 'SEAT_COUNT_MISMATCH',
                assigned: totalAssigned,
                available: totalAvailable,
                expected: expectedTotal,
                actual: totalAssigned + totalAvailable,
                description: '座位總數不一致'
            });
        }

        return {
            isValid: issues.length === 0,
            issues,
            summary: {
                totalIssues: issues.length,
                issueTypes: [...new Set(issues.map(issue => issue.type))]
            }
        };
    }

    // ==================== 私有方法 ====================

    /**
     * 生成操作ID
     * @returns {string} 操作ID
     */
    generateOperationId() {
        return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 生成快照ID
     * @returns {string} 快照ID
     */
    generateSnapshotId() {
        return `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 清理資源
     */
    dispose() {
        this.committedAssignments.clear();
        this.pendingAssignments.clear();
        this.availableSeats.clear();
        this.snapshots = [];
        this.operationHistory = [];
    }
}
