// SeatAssignmentEngine.js - 主引擎，協調各個組件
const { Logger } = require('./Logger.js');
const { AssignmentCache } = require('./AssignmentCache.js');
const { StateValidator } = require('./StateValidator.js');
const { ConflictChecker } = require('./ConflictChecker.js');
const { StudentScorer } = require('./StudentScorer.js');
const { SeatSelector } = require('./SeatSelector.js');
const { DynamicAdjuster } = require('./DynamicAdjuster.js');

class SeatAssignmentEngine {
    constructor(options = {}) {
        this.logger = new Logger(options.logLevel || 'INFO');
        this.cache = new AssignmentCache();
        this.validator = new StateValidator();
        this.conflictChecker = new ConflictChecker();
        this.studentScorer = new StudentScorer();
        this.seatSelector = new SeatSelector({ seatsConfig: [] });
        this.dynamicAdjuster = new DynamicAdjuster();

        this.options = {
            timeout: options.timeout || 30000,
            maxRetries: options.maxRetries || 3,
            enableCache: options.enableCache !== false,
            ...options
        };

        // 簡化的狀態管理
        this.currentAssignment = new Map();
        this.assignmentHistory = [];
        this.performanceMetrics = {
            startTime: 0,
            endTime: 0,
            memoryUsage: [],
            executionSteps: 0
        };

        // 無效路徑剪枝緩存
        this.invalidPathsCache = new Set();
        this.invalidPathPatterns = new Map();
        this.pruningStats = {
            totalChecks: 0,
            prunedPaths: 0,
            cacheHits: 0
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
     * 主要座位安排方法 - 遷移自 algorithms.js 的 startAssignment 邏輯
     * @param {Object} config - 配置對象
     * @returns {Promise<Object>} 安排結果
     */
    async solveAssignment(config) {
        this.performanceMetrics.startTime = Date.now();
        this.performanceMetrics.executionSteps = 0;

        this.logger.log('INFO', 'Engine', '開始座位安排演算法', { config });

        try {
            // 0. 初始化座位配置
            this.updateSeatsConfig(config.seats);

            // 1. 初始衝突檢查
            this.conflictChecker.initialize(config.students, config.seats, config.conditions);
            const conflictResult = this.conflictChecker.checkAllConflicts();
            if (conflictResult.hasConflicts) {
                return {
                    success: false,
                    conflicts: conflictResult.conflicts,
                    error: '初始條件衝突',
                    performanceMetrics: this.getPerformanceMetrics()
                };
            }

            // 2. 計算學生分數並排序 - 遷移自 algorithms.js 的學生排序邏輯
            const studentScores = this.studentScorer.calculateScores(config.students, config.conditions);
            const sortedStudents = this.studentScorer.sortStudentsByPriority(config.students, studentScores);

            // 3. 排序座位 - 遷移自 algorithms.js 的座位排序邏輯
            const sortedSeats = this.sortSeatsByPreference(config.seats);

            // 4. 檢查學生群組綁定 - 遷移自 algorithms.js 的群組綁定邏輯
            const groupBindings = this.checkStudentGroupBindings(config.students, config.conditions);

            // 5. 建立學生到條件的映射 - 遷移自 algorithms.js
            const studentToConditionsMap = this.buildStudentToConditionsMap(config.students, config.conditions);

            // 6. 選擇搜索策略並執行
            let result;
            if (config.useHybridSearch) {
                this.logger.log('INFO', 'Engine', '使用混合搜索策略');
                result = await this.hybridSearch(
                    sortedStudents,
                    sortedSeats,
                    config.conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            } else if (config.useBreadthFirstSearch) {
                this.logger.log('INFO', 'Engine', '使用廣度優先搜索策略');
                result = await this.breadthFirstSearch(
                    sortedStudents,
                    sortedSeats,
                    config.conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            } else if (config.useDepthFirstSearch) {
                this.logger.log('INFO', 'Engine', '使用深度優先搜索策略');
                result = await this.depthFirstSearch(
                    sortedStudents,
                    sortedSeats,
                    config.conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            } else if (config.useHeuristicSearch) {
                this.logger.log('INFO', 'Engine', '使用啟發式搜索策略');
                result = await this.heuristicSearch(
                    sortedStudents,
                    sortedSeats,
                    config.conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            } else {
                this.logger.log('INFO', 'Engine', '使用回溯搜索策略');
                result = await this.backtrackAssignment(
                    sortedStudents,
                    sortedSeats,
                    config.conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            }

            // 7. 驗證最終狀態
            const validationResult = this.validator.validate(
                config.students,
                config.seats,
                config.conditions,
                this.currentAssignment
            );
            if (!validationResult.isValid) {
                this.logger.log('WARN', 'Engine', '最終狀態驗證失敗', validationResult);
            }

            this.performanceMetrics.endTime = Date.now();
            this.logger.log('INFO', 'Engine', '座位安排完成', {
                duration: this.performanceMetrics.endTime - this.performanceMetrics.startTime,
                success: result.success,
                unassignedCount: result.unassignedStudents?.length || 0,
                performanceMetrics: this.getPerformanceMetrics()
            });

            return {
                ...result,
                performanceMetrics: this.getPerformanceMetrics(),
                validationResult
            };

        } catch (error) {
            this.logger.log('ERROR', 'Engine', '座位安排失敗', { error: error.message });
            return {
                success: false,
                error: error.message,
                performanceMetrics: this.getPerformanceMetrics()
            };
        }
    }



    /**
     * 座位排序邏輯 - 遷移自 algorithms.js
     * @param {Array} seats 座位列表
     * @returns {Array} 排序後的座位列表
     */
    sortSeatsByPreference(seats) {
        this.logger.log('DEBUG', 'Engine', '開始座位排序', { seatCount: seats.length });

        return seats.sort((a, b) => {
            // 特殊座位優先
            const aIsSpecial = this.isSpecialSeat(a);
            const bIsSpecial = this.isSpecialSeat(b);

            if (aIsSpecial && !bIsSpecial) return -1;
            if (!aIsSpecial && bIsSpecial) return 1;

            // 其他條件相同時，保持隨機性
            return Math.random() - 0.5;
        });
    }

    /**
     * 建立學生到條件的映射 - 遷移自 algorithms.js
     */
    buildStudentToConditionsMap(students, conditions) {
        const studentToConditionsMap = new Map();
        students.forEach(s => studentToConditionsMap.set(s, []));

        // 處理一般條件
        conditions.forEach(condition => {
            condition.students.flat().forEach(s => {
                if (studentToConditionsMap.has(s)) {
                    studentToConditionsMap.get(s).push(condition);
                }
            });
        });

        return studentToConditionsMap;
    }

    /**
     * 檢查學生群組綁定 - 遷移自 algorithms.js
     * @param {Array} students 學生列表
     * @param {Array} conditions 條件列表
     * @returns {Map} 群組綁定映射
     */
    checkStudentGroupBindings(students, conditions) {
        this.logger.log('DEBUG', 'Engine', '檢查學生群組綁定', {
            studentCount: students.length,
            conditionCount: conditions.length
        });

        const groupBindings = new Map();

        conditions.forEach(condition => {
            if (condition.type === 'assign_student_group_to_seat_group') {
                const studentGroupName = condition.studentGroupName;
                const seatGroup = condition.group;

                if (condition.students && condition.students.length > 0) {
                    condition.students.flat().forEach(studentId => {
                        groupBindings.set(studentId, {
                            type: 'assign_student_group_to_seat_group',
                            studentGroup: studentGroupName,
                            seatGroup: seatGroup
                        });
                    });
                }
            }
        });

        this.logger.log('DEBUG', 'Engine', '群組綁定檢查完成', {
            bindingCount: groupBindings.size
        });

        return groupBindings;
    }

    /**
     * 判斷是否為特殊座位 - 遷移自 algorithms.js
     * @param {Object} seat 座位物件
     * @returns {boolean} 是否為特殊座位
     */
    isSpecialSeat(seat) {
        // 檢查該群組的座位數量是否較少
        const groupId = seat.groupId || seat.group; // 支持兩種屬性名
        const seatsInGroup = this.getSeatsInGroup(groupId);
        const totalValidSeats = this.getTotalValidSeats();

        // 如果該群組的座位數量少於總座位數的30%，則認為是特殊座位群組
        return seatsInGroup && seatsInGroup.length > 0 && seatsInGroup.length < totalValidSeats * 0.3;
    }

    /**
     * 獲取群組中的座位數量
     * @param {string} groupId 群組ID
     * @returns {Array} 群組中的座位
     */
    getSeatsInGroup(groupId) {
        // 如果沒有座位配置，返回空陣列
        if (!this.seatsConfig) {
            return [];
        }

        // 支持兩種屬性名：groupId 和 group
        return this.seatsConfig.filter(seat =>
            (seat.groupId === groupId) || (seat.group === groupId)
        );
    }

    /**
     * 獲取總有效座位數
     * @returns {number} 總有效座位數
     */
    getTotalValidSeats() {
        // 如果沒有座位配置，返回 0
        if (!this.seatsConfig) {
            return 0;
        }

        // 返回所有有效座位數量（沒有 isValid 屬性的座位也認為是有效的）
        return this.seatsConfig.filter(seat => seat.isValid !== false).length;
    }

    /**
     * 設置座位配置信息
     * @param {Array} seats 座位配置
     */
    setSeatsConfig(seats) {
        this.seatsConfig = seats;
    }

    /**
     * 更新座位相關方法
     */
    updateSeatsConfig(seats) {
        this.setSeatsConfig(seats);

        // 更新 SeatSelector 的 seatsConfig
        this.seatSelector.seatsConfig = seats;

        // 更新 getSeatsInGroup 方法
        this.getSeatsInGroup = (groupId) => {
            return this.seatsConfig.filter(seat => seat.groupId === groupId);
        };

        // 更新 getTotalValidSeats 方法
        this.getTotalValidSeats = () => {
            return this.seatsConfig.filter(seat => seat.isValid).length;
        };
    }

    /**
     * 回溯演算法核心 - 遷移自 algorithms.js 的 solveAssignment 邏輯
     */
    async backtrackAssignment(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.performanceMetrics.executionSteps++;

        // 超時檢查
        if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
            this.logger.log('WARN', 'Engine', '回溯演算法超時', {
                elapsed: Date.now() - this.performanceMetrics.startTime,
                timeout: this.options.timeout
            });
            return {
                success: false,
                error: '超時',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 基本情況：所有學生都已嘗試分配
        if (students.length === 0) {
            return {
                success: true,
                assignment: new Map(this.currentAssignment),
                unassignedStudents: []
            };
        }

        // 選擇排序後的第一個學生
        const currentStudent = students[0];
        this.logger.log('DEBUG', 'Engine', `嘗試為學生 ${currentStudent} 尋找座位`, {
            remainingStudents: students.length
        });

        // 獲取所有未被佔用的座位
        const allUnoccupiedSeats = seats.filter(seat =>
            !Array.from(this.currentAssignment.values()).some(assignedSeat =>
                assignedSeat.row === seat.row && assignedSeat.col === seat.col
            )
        );

        // 過濾出滿足所有硬性條件的座位
        const trulyValidCandidateSeats = [];
        for (const seat of allUnoccupiedSeats) {
            const tempAssignment = new Map(this.currentAssignment);
            tempAssignment.set(currentStudent, seat);

            let allConditionsMetForSeat = true;
            const relevantConditions = this.getStudentConditions(currentStudent, conditions);

            for (const condition of relevantConditions) {
                // 處理 assign_group 條件
                if (condition.type === 'assign_group') {
                    const [s] = condition.students[0];
                    if (s === currentStudent && seat.groupId !== condition.group) {
                        allConditionsMetForSeat = false;
                        break;
                    }
                }
                // 處理 adjacent_and_group 條件的群組部分
                else if (condition.type === 'adjacent_and_group') {
                    if (seat.groupId !== condition.group) {
                        allConditionsMetForSeat = false;
                        break;
                    }
                }
                // 對於其他條件，使用 checkCondition 檢查
                else if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                    allConditionsMetForSeat = false;
                    break;
                }
            }

            // 額外檢查學生群組與座位群組的綁定
            if (groupBindings && groupBindings.has(currentStudent)) {
                const binding = groupBindings.get(currentStudent);
                if (binding.type === 'assign_student_group_to_seat_group' &&
                    seat.groupId !== binding.seatGroup) {
                    allConditionsMetForSeat = false;
                }
            }

            if (allConditionsMetForSeat) {
                trulyValidCandidateSeats.push(seat);
            }
        }

        // 改進座位排序：先隨機打亂，再根據學生需求動態排序
        let candidateSeats = this.shuffleArray(trulyValidCandidateSeats);
        candidateSeats = this.seatSelector.getSortedSeatsForStudent(currentStudent, candidateSeats, conditions);

        this.logger.log('DEBUG', 'Engine', `學生 ${currentStudent} 的有效座位數量`, {
            candidateCount: candidateSeats.length
        });

        // 嘗試每個候選座位
        for (const seat of candidateSeats) {
            // 每次迭代都讓出控制權，避免阻塞 UI
            await new Promise(resolve => setTimeout(resolve, 0));

            this.logger.log('DEBUG', 'Engine', `嘗試將學生 ${currentStudent} 放置在座位`, {
                row: seat.row,
                col: seat.col,
                groupId: seat.groupId
            });

            // 嘗試分配學生到當前座位
            this.currentAssignment.set(currentStudent, seat);

            // 檢查所有相關條件是否滿足
            let allConditionsMet = true;
            const relevantConditions = this.getStudentConditions(currentStudent, conditions);

            for (const condition of relevantConditions) {
                const conditionMet = this.conflictChecker.checkCondition(condition, this.currentAssignment);
                this.logger.log('DEBUG', 'Engine', `檢查條件`, {
                    type: condition.type,
                    students: condition.students,
                    satisfied: conditionMet
                });

                if (!conditionMet) {
                    allConditionsMet = false;
                    break;
                }
            }

            if (allConditionsMet) {
                this.logger.log('DEBUG', 'Engine', `學生 ${currentStudent} 在座位滿足所有條件，遞迴處理下一個學生`);

                // 從待分配學生列表中移除當前學生
                const nextStudents = students.filter(s => s !== currentStudent);
                const result = await this.backtrackAssignment(
                    nextStudents,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );

                if (result.success) {
                    return result;
                }
            }

            // 回溯：如果當前分配不成功，則撤銷分配
            this.logger.log('DEBUG', 'Engine', `回溯：學生 ${currentStudent} 在座位失敗或後續遞迴失敗，撤銷分配`);
            this.currentAssignment.delete(currentStudent);
        }

        // 如果所有座位都嘗試過且都失敗，嘗試動態重新分配
        this.logger.log('DEBUG', 'Engine', `無法為學生 ${currentStudent} 找到合適的座位，嘗試動態重新分配`);

        const reassignmentResult = await this.tryReassignSeats(
            currentStudent,
            this.currentAssignment,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );

        if (reassignmentResult.success) {
            this.logger.log('DEBUG', 'Engine', `動態重新分配成功！學生 ${currentStudent} 已成功安排`);

            // 從待分配學生列表中移除當前學生
            const nextStudents = students.filter(s => s !== currentStudent);
            return await this.backtrackAssignment(
                nextStudents,
                seats,
                conditions,
                studentScores,
                groupBindings,
                studentToConditionsMap
            );
        }

        // 如果動態重新分配也失敗，則標記為未安排
        this.logger.log('DEBUG', 'Engine', `動態重新分配失敗，將學生 ${currentStudent} 標記為未安排`);

        return {
            success: false,
            unassignedStudents: [currentStudent],
            assignment: new Map(this.currentAssignment)
        };
    }

    /**
 * 驗證分配是否有效
 */
    validateAssignment(studentId, assignment, conditions) {
        const studentConditions = conditions.filter(c =>
            c.students.flat().includes(studentId)
        );

        // 簡化的條件檢查，實際實現需要更複雜的邏輯
        return studentConditions.every(condition => {
            // 這裡需要實現具體的條件檢查邏輯
            // 暫時返回 true，實際實現時需要根據條件類型進行檢查
            return true;
        });
    }

    /**
     * Fisher-Yates (Knuth) 洗牌演算法 - 遷移自 algorithms.js
     */
    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }



    /**
     * 獲取學生條件 - 遷移自 algorithms.js
     */
    getStudentConditions(studentId, conditions) {
        return conditions.filter(condition => {
            if (Array.isArray(condition.students)) {
                return condition.students.flat().includes(studentId);
            }
            return condition.students === studentId;
        });
    }



    /**
     * 動態重新分配座位 - 遷移自 algorithms.js
     */
    async tryReassignSeats(currentStudent, currentAssignment, availableSeats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        const currentStudentScore = studentScores[currentStudent] || 0;
        this.logger.log('DEBUG', 'Engine', `嘗試為學生 ${currentStudent} (分數: ${currentStudentScore}) 進行智能動態重新分配`);

        // 策略1：直接踢出低分學生
        const directRemovalResult = await this.tryDirectRemoval(
            currentStudent, currentAssignment, availableSeats, conditions, studentScores, groupBindings, studentToConditionsMap
        );
        if (directRemovalResult) {
            return { success: true };
        }

        // 策略2：智能互換策略
        const swapResult = await this.trySmartSwap(
            currentStudent, currentAssignment, availableSeats, conditions, studentScores, groupBindings, studentToConditionsMap
        );
        if (swapResult) {
            return { success: true };
        }

        this.logger.log('DEBUG', 'Engine', `所有動態重新分配策略都失敗，無法為學生 ${currentStudent} 找到合適的座位`);
        return { success: false };
    }

    /**
     * 策略1：直接踢出低分學生 - 遷移自 algorithms.js
     */
    async tryDirectRemoval(currentStudent, currentAssignment, availableSeats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        const currentStudentScore = studentScores[currentStudent] || 0;

        // 找到所有已分配的學生，按分數排序（低分優先被踢出）
        const assignedStudents = Array.from(currentAssignment.keys());
        const candidatesForRemoval = assignedStudents
            .filter(student => {
                const studentScore = studentScores[student] || 0;
                return studentScore < currentStudentScore;
            })
            .sort((a, b) => {
                const scoreA = studentScores[a] || 0;
                const scoreB = studentScores[b] || 0;
                return scoreA - scoreB; // 分數低的優先被踢出
            });

        this.logger.log('DEBUG', 'Engine', `直接踢出策略 - 可被踢出的候選學生`, {
            candidates: candidatesForRemoval.map(s => `學生 ${s} (分數: ${studentScores[s] || 0})`)
        });

        // 嘗試踢出每個候選學生
        for (const studentToRemove of candidatesForRemoval) {
            this.logger.log('DEBUG', 'Engine', `嘗試直接踢出學生 ${studentToRemove} 為學生 ${currentStudent} 騰出座位`);

            const removedSeat = currentAssignment.get(studentToRemove);

            // 暫時移除該學生
            currentAssignment.delete(studentToRemove);

            // 檢查當前學生是否可以坐在這個座位
            if (this.canStudentSitHere(currentStudent, removedSeat, currentAssignment, studentToConditionsMap)) {
                this.logger.log('DEBUG', 'Engine', `學生 ${currentStudent} 可以坐在學生 ${studentToRemove} 的座位，開始重新分配`);

                // 成功！為當前學生安排座位
                currentAssignment.set(currentStudent, removedSeat);

                // 遞迴嘗試為被踢出的學生重新安排座位
                const remainingStudents = [studentToRemove];
                if (await this.backtrackAssignment(remainingStudents, availableSeats, [], studentScores, groupBindings, studentToConditionsMap)) {
                    this.logger.log('DEBUG', 'Engine', `直接踢出策略成功！學生 ${currentStudent} 坐在學生 ${studentToRemove} 的原座位，學生 ${studentToRemove} 重新安排成功`);
                    return true;
                } else {
                    this.logger.log('DEBUG', 'Engine', `學生 ${studentToRemove} 重新安排失敗，恢復原狀`);
                    // 確保狀態完全恢復
                    currentAssignment.delete(currentStudent);
                }
            }

            // 失敗，恢復原狀
            currentAssignment.set(studentToRemove, removedSeat);
        }

        return false;
    }

    /**
     * 策略2：智能互換策略 - 遷移自 algorithms.js
     */
    async trySmartSwap(currentStudent, currentAssignment, availableSeats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.logger.log('DEBUG', 'Engine', `開始智能互換策略`);

        // 獲取當前學生的條件
        const currentStudentConditions = studentToConditionsMap.get(currentStudent) || [];

        // 找到所有已分配的學生
        const assignedStudents = Array.from(currentAssignment.keys());

        // 策略2a：尋找可以互換的學生（放寬條件，允許更大分數差異）
        for (const candidateStudent of assignedStudents) {
            const candidateScore = studentScores[candidateStudent] || 0;
            const currentStudentScore = studentScores[currentStudent] || 0;

            // 放寬互換條件：允許分數差異在5分以內，或者當前學生分數更高
            if (candidateScore >= currentStudentScore - 5 || currentStudentScore > candidateScore) {
                this.logger.log('DEBUG', 'Engine', `嘗試與學生 ${candidateStudent} (分數: ${candidateScore}) 進行互換，當前學生分數: ${currentStudentScore}`);

                const candidateSeat = currentAssignment.get(candidateStudent);
                const currentStudentSeat = currentAssignment.get(currentStudent);

                // 檢查互換是否可行
                if (await this.canSwapStudents(currentStudent, candidateStudent, currentAssignment, studentToConditionsMap)) {
                    this.logger.log('DEBUG', 'Engine', `學生 ${currentStudent} 與學生 ${candidateStudent} 可以互換！`);

                    // 執行互換
                    candidateSeat.studentId = currentStudent;
                    currentAssignment.set(currentStudent, candidateSeat);

                    if (currentStudentSeat) {
                        currentStudentSeat.studentId = candidateStudent;
                        currentAssignment.set(candidateStudent, currentStudentSeat);
                        this.logger.log('DEBUG', 'Engine', `成功互換：學生 ${currentStudent} 坐到 (${candidateSeat.row}, ${candidateSeat.col})，學生 ${candidateStudent} 坐到 (${currentStudentSeat.row}, ${currentStudentSeat.col})`);
                        return true;
                    } else {
                        // 如果當前學生還沒有座位，則候選學生變成未分配
                        currentAssignment.delete(candidateStudent);

                        // 嘗試為候選學生重新安排座位
                        const remainingStudents = [candidateStudent];
                        if (await this.backtrackAssignment(remainingStudents, availableSeats, [], studentScores, groupBindings, studentToConditionsMap)) {
                            this.logger.log('DEBUG', 'Engine', `智能互換策略成功！學生 ${currentStudent} 與學生 ${candidateStudent} 互換成功`);
                            return true;
                        } else {
                            // 恢復原狀
                            currentAssignment.delete(currentStudent);
                            currentAssignment.set(candidateStudent, candidateSeat);
                        }
                    }
                } else {
                    this.logger.log('DEBUG', 'Engine', `學生 ${currentStudent} 與學生 ${candidateStudent} 無法互換，條件檢查失敗`);
                }
            }
        }

        return false;
    }

    /**
     * 檢查兩個學生是否可以互換座位 - 遷移自 algorithms.js
     */
    async canSwapStudents(studentA, studentB, currentAssignment, studentToConditionsMap) {
        const seatA = currentAssignment.get(studentA);
        const seatB = currentAssignment.get(studentB);

        if (!seatA || !seatB) {
            return false; // 至少一個學生沒有座位，無法互換
        }

        // 創建臨時分配狀態進行測試
        const tempAssignment = new Map(currentAssignment);
        tempAssignment.set(studentA, seatB);
        tempAssignment.set(studentB, seatA);

        // 檢查學生A的條件
        const conditionsA = studentToConditionsMap.get(studentA) || [];
        for (const condition of conditionsA) {
            if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                this.logger.log('DEBUG', 'Engine', `學生 ${studentA} 互換後不滿足條件: ${condition.type}`);
                return false;
            }
        }

        // 檢查學生B的條件
        const conditionsB = studentToConditionsMap.get(studentB) || [];
        for (const condition of conditionsB) {
            if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                this.logger.log('DEBUG', 'Engine', `學生 ${studentB} 互換後不滿足條件: ${condition.type}`);
                return false;
            }
        }

        return true;
    }

    /**
     * 檢查學生是否可以坐在指定座位 - 遷移自 algorithms.js
     */
    canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
        // 創建臨時分配狀態進行測試
        const tempAssignment = new Map(currentAssignment);
        tempAssignment.set(studentId, seat);

        // 檢查學生的所有條件
        const studentConditions = studentToConditionsMap.get(studentId) || [];

        for (const condition of studentConditions) {
            const conditionMet = this.conflictChecker.checkCondition(condition, tempAssignment);
            if (!conditionMet) {
                return false;
            }
        }

        return true;
    }

    /**
     * 錯誤處理增強
     */
    classifyError(error) {
        if (error.message.includes('超時')) {
            return { type: 'TIMEOUT', severity: 'HIGH', recoverable: false };
        }
        if (error.message.includes('衝突')) {
            return { type: 'CONFLICT', severity: 'MEDIUM', recoverable: true };
        }
        if (error.message.includes('記憶體')) {
            return { type: 'MEMORY', severity: 'HIGH', recoverable: false };
        }
        return { type: 'UNKNOWN', severity: 'LOW', recoverable: true };
    }

    /**
     * 錯誤恢復機制
     */
    recoverFromError(error, context) {
        const errorInfo = this.classifyError(error);

        if (errorInfo.recoverable) {
            this.logger.log('INFO', 'Engine', '嘗試錯誤恢復', { errorInfo, context });

            // 清理當前狀態
            this.currentAssignment.clear();

            // 重新初始化
            this.performanceMetrics.executionSteps = 0;

            return true;
        }

        return false;
    }

    /**
     * 錯誤報告生成
     */
    generateErrorReport(error, context) {
        const errorInfo = this.classifyError(error);

        return {
            timestamp: new Date().toISOString(),
            error: error.message,
            errorInfo,
            context,
            performanceMetrics: this.getPerformanceMetrics(),
            suggestions: this.generateErrorSuggestions(errorInfo)
        };
    }

    /**
     * 生成錯誤建議
     */
    generateErrorSuggestions(errorInfo) {
        switch (errorInfo.type) {
            case 'TIMEOUT':
                return ['增加超時時間', '減少學生數量', '簡化條件'];
            case 'CONFLICT':
                return ['檢查條件設定', '調整學生分組', '重新評估座位分配'];
            case 'MEMORY':
                return ['減少緩存大小', '分批處理', '優化算法'];
            default:
                return ['檢查輸入數據', '重新啟動程序'];
        }
    }

    /**
     * 性能監控
     */
    trackExecutionTime() {
        return this.performanceMetrics.endTime - this.performanceMetrics.startTime;
    }

    /**
     * 記憶體使用監控
     */
    monitorMemoryUsage() {
        if (performance.memory) {
            const memoryInfo = {
                used: performance.memory.usedJSHeapSize,
                total: performance.memory.totalJSHeapSize,
                limit: performance.memory.jsHeapSizeLimit,
                timestamp: Date.now()
            };
            this.performanceMetrics.memoryUsage.push(memoryInfo);
            return memoryInfo;
        }
        return null;
    }

    /**
     * 性能指標收集
     */
    collectPerformanceMetrics() {
        return {
            executionTime: this.trackExecutionTime(),
            executionSteps: this.performanceMetrics.executionSteps,
            memoryUsage: this.performanceMetrics.memoryUsage,
            assignmentCount: this.currentAssignment.size,
            cacheStats: this.cache.getCacheStats()
        };
    }

    /**
     * 獲取性能指標
     */
    getPerformanceMetrics() {
        return this.collectPerformanceMetrics();
    }

    /**
     * 啟發式搜索 - 優化搜索策略
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Promise<Object>} 搜索結果
     */
    async heuristicSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.performanceMetrics.executionSteps++;

        // 超時檢查
        if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
            this.logger.log('WARN', 'Engine', '啟發式搜索超時', {
                elapsed: Date.now() - this.performanceMetrics.startTime,
                timeout: this.options.timeout
            });
            return {
                success: false,
                error: '超時',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 基本情況：所有學生都已分配
        if (students.length === 0) {
            return {
                success: true,
                assignment: new Map(this.currentAssignment),
                unassignedStudents: []
            };
        }

        // 評估當前狀態
        const currentStateScore = this.evaluateState(students, seats, conditions, studentScores);

        // 選擇最佳移動
        const bestMove = this.selectBestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap);

        if (!bestMove) {
            this.logger.log('WARN', 'Engine', '無法找到有效的啟發式移動');
            return {
                success: false,
                error: '無有效移動',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        const { student, seat, heuristicScore } = bestMove;

        this.logger.log('DEBUG', 'Engine', `啟發式選擇`, {
            student,
            seat: { row: seat.row, col: seat.col, groupId: seat.groupId },
            heuristicScore,
            stateScore: currentStateScore
        });

        // 執行移動
        this.currentAssignment.set(student, seat);

        // 檢查條件是否滿足
        const relevantConditions = this.getStudentConditions(student, conditions);
        let allConditionsMet = true;

        for (const condition of relevantConditions) {
            if (!this.conflictChecker.checkCondition(condition, this.currentAssignment)) {
                allConditionsMet = false;
                break;
            }
        }

        if (allConditionsMet) {
            // 遞迴處理剩餘學生
            const nextStudents = students.filter(s => s !== student);
            const result = await this.heuristicSearch(
                nextStudents,
                seats,
                conditions,
                studentScores,
                groupBindings,
                studentToConditionsMap
            );

            if (result.success) {
                return result;
            }
        }

        // 如果當前移動失敗，回滾並嘗試其他選項
        this.currentAssignment.delete(student);

        // 如果啟發式搜索失敗，回退到回溯搜索
        this.logger.log('DEBUG', 'Engine', '啟發式搜索失敗，回退到回溯搜索');
        return await this.backtrackAssignment(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );
    }

    /**
     * 評估當前狀態的分數
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @returns {number} 狀態分數
     */
    evaluateState(students, seats, conditions, studentScores) {
        let score = 0;

        // 1. 已分配學生的分數
        for (const [student, seat] of this.currentAssignment) {
            score += studentScores[student] || 0;
        }

        // 2. 剩餘學生和座位的匹配度
        const availableSeats = seats.filter(seat =>
            !Array.from(this.currentAssignment.values()).some(assignedSeat =>
                assignedSeat.row === seat.row && assignedSeat.col === seat.col
            )
        );

        // 3. 特殊座位稀缺性評估
        const specialSeats = availableSeats.filter(seat => this.isSpecialSeat(seat));
        const specialSeatRatio = specialSeats.length / Math.max(availableSeats.length, 1);
        score += (1 - specialSeatRatio) * 100; // 特殊座位越少，分數越高

        // 4. 條件複雜度評估
        const complexConditions = conditions.filter(condition =>
            condition.type === 'adjacent_and_group' ||
            condition.type === 'assign_student_group_to_seat_group'
        );
        score -= complexConditions.length * 10; // 複雜條件越多，分數越低

        return score;
    }

    /**
     * 計算啟發式分數
     * @param {string} student 學生ID
     * @param {Object} seat 座位
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @returns {number} 啟發式分數
     */
    calculateHeuristic(student, seat, conditions, studentScores, groupBindings) {
        let heuristicScore = 0;

        // 1. 學生優先級分數
        heuristicScore += (studentScores[student] || 0) * 2;

        // 2. 座位稀缺性分數
        if (this.isSpecialSeat(seat)) {
            heuristicScore += 50;
        }

        // 3. 條件滿足度分數
        const studentConditions = conditions.filter(condition =>
            condition.students.some(studentList =>
                studentList.includes(student)
            )
        );

        for (const condition of studentConditions) {
            if (condition.type === 'assign_group' && seat.groupId === condition.group) {
                heuristicScore += 30;
            } else if (condition.type === 'adjacent_and_group' && seat.groupId === condition.group) {
                heuristicScore += 40;
            }
        }

        // 4. 群組綁定分數
        if (groupBindings && groupBindings.has(student)) {
            const binding = groupBindings.get(student);
            if (binding.type === 'assign_student_group_to_seat_group' &&
                seat.groupId === binding.seatGroup) {
                heuristicScore += 60;
            }
        }

        // 5. 位置偏好分數（前排優先）
        if (seat.row <= 3) {
            heuristicScore += 10;
        }

        return heuristicScore;
    }

    /**
     * 選擇最佳移動
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Object|null} 最佳移動或null
     */
    selectBestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        const moves = [];

        // 獲取所有可用座位
        const availableSeats = seats.filter(seat =>
            !Array.from(this.currentAssignment.values()).some(assignedSeat =>
                assignedSeat.row === seat.row && assignedSeat.col === seat.col
            )
        );

        // 為每個學生計算所有可能的移動
        for (const student of students) {
            for (const seat of availableSeats) {
                // 檢查基本條件
                const tempAssignment = new Map(this.currentAssignment);
                tempAssignment.set(student, seat);

                let isValidMove = true;
                const relevantConditions = this.getStudentConditions(student, conditions);

                for (const condition of relevantConditions) {
                    if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                        isValidMove = false;
                        break;
                    }
                }

                if (isValidMove) {
                    const heuristicScore = this.calculateHeuristic(
                        student,
                        seat,
                        conditions,
                        studentScores,
                        groupBindings
                    );

                    moves.push({
                        student,
                        seat,
                        heuristicScore
                    });
                }
            }
        }

        // 按啟發式分數排序，選擇最佳移動
        moves.sort((a, b) => b.heuristicScore - a.heuristicScore);

        return moves.length > 0 ? moves[0] : null;
    }

    /**
     * 深度優先搜索 - 優化搜索策略
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Promise<Object>} 搜索結果
     */
    async depthFirstSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.performanceMetrics.executionSteps++;

        // 初始化深度追蹤
        this.currentDepth = 0;
        this.maxDepth = students.length;
        this.depthHistory = [];

        // 超時檢查
        if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
            this.logger.log('WARN', 'Engine', '深度優先搜索超時', {
                elapsed: Date.now() - this.performanceMetrics.startTime,
                timeout: this.options.timeout
            });
            return {
                success: false,
                error: '超時',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 基本情況：所有學生都已分配
        if (students.length === 0) {
            return {
                success: true,
                assignment: new Map(this.currentAssignment),
                unassignedStudents: []
            };
        }

        // 檢查深度限制
        if (this.checkDepthLimit()) {
            this.logger.log('WARN', 'Engine', '達到深度限制', {
                currentDepth: this.currentDepth,
                maxDepth: this.maxDepth
            });
            return {
                success: false,
                error: '深度限制',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 選擇能讓搜索最深的移動
        const deepestMove = this.selectDeepestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap);

        if (!deepestMove) {
            this.logger.log('WARN', 'Engine', '無法找到有效的深度優先移動');
            return {
                success: false,
                error: '無有效移動',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        const { student, seat, depthScore } = deepestMove;

        this.logger.log('DEBUG', 'Engine', `深度優先選擇`, {
            student,
            seat: { row: seat.row, col: seat.col, groupId: seat.groupId },
            depthScore,
            currentDepth: this.currentDepth
        });

        // 記錄深度歷史
        this.depthHistory.push({
            depth: this.currentDepth,
            student,
            seat: { row: seat.row, col: seat.col, groupId: seat.groupId },
            timestamp: Date.now()
        });

        // 執行移動
        this.currentAssignment.set(student, seat);
        this.currentDepth++;

        // 檢查條件是否滿足
        const relevantConditions = this.getStudentConditions(student, conditions);
        let allConditionsMet = true;

        for (const condition of relevantConditions) {
            if (!this.conflictChecker.checkCondition(condition, this.currentAssignment)) {
                allConditionsMet = false;
                break;
            }
        }

        if (allConditionsMet) {
            // 遞迴處理剩餘學生
            const nextStudents = students.filter(s => s !== student);
            const result = await this.depthFirstSearch(
                nextStudents,
                seats,
                conditions,
                studentScores,
                groupBindings,
                studentToConditionsMap
            );

            if (result.success) {
                return result;
            }
        }

        // 如果當前移動失敗，回滾並嘗試其他選項
        this.currentAssignment.delete(student);
        this.currentDepth--;

        // 如果深度優先搜索失敗，回退到回溯搜索
        this.logger.log('DEBUG', 'Engine', '深度優先搜索失敗，回退到回溯搜索');
        return await this.backtrackAssignment(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );
    }

    /**
     * 追蹤搜索深度
     * @returns {Object} 深度信息
     */
    trackDepth() {
        return {
            currentDepth: this.currentDepth || 0,
            maxDepth: this.maxDepth || 0,
            depthHistory: this.depthHistory || [],
            depthProgress: this.currentDepth / Math.max(this.maxDepth, 1)
        };
    }

    /**
     * 檢查深度限制
     * @returns {boolean} 是否達到深度限制
     */
    checkDepthLimit() {
        const maxAllowedDepth = this.options.maxDepth || this.maxDepth || 100;
        return this.currentDepth >= maxAllowedDepth;
    }

    /**
     * 選擇能讓搜索最深的移動
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Object|null} 最佳移動或null
     */
    selectDeepestMove(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        const moves = [];

        // 獲取所有可用座位
        const availableSeats = seats.filter(seat =>
            !Array.from(this.currentAssignment.values()).some(assignedSeat =>
                assignedSeat.row === seat.row && assignedSeat.col === seat.col
            )
        );

        // 為每個學生計算所有可能的移動
        for (const student of students) {
            for (const seat of availableSeats) {
                // 檢查基本條件
                const tempAssignment = new Map(this.currentAssignment);
                tempAssignment.set(student, seat);

                let isValidMove = true;
                const relevantConditions = this.getStudentConditions(student, conditions);

                for (const condition of relevantConditions) {
                    if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                        isValidMove = false;
                        break;
                    }
                }

                if (isValidMove) {
                    const depthScore = this.calculateDepthScore(
                        student,
                        seat,
                        conditions,
                        studentScores,
                        groupBindings,
                        students,
                        availableSeats
                    );

                    moves.push({
                        student,
                        seat,
                        depthScore
                    });
                }
            }
        }

        // 按深度分數排序，選擇能讓搜索最深的移動
        moves.sort((a, b) => b.depthScore - a.depthScore);

        return moves.length > 0 ? moves[0] : null;
    }

    /**
     * 計算深度分數
     * @param {string} student 學生ID
     * @param {Object} seat 座位
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Array} remainingStudents 剩餘學生
     * @param {Array} availableSeats 可用座位
     * @returns {number} 深度分數
     */
    calculateDepthScore(student, seat, conditions, studentScores, groupBindings, remainingStudents, availableSeats) {
        let depthScore = 0;

        // 1. 學生優先級分數（高分學生優先）
        depthScore += (studentScores[student] || 0) * 3;

        // 2. 條件滿足度分數（滿足更多條件的移動優先）
        const studentConditions = conditions.filter(condition =>
            condition.students.some(studentList =>
                studentList.includes(student)
            )
        );

        for (const condition of studentConditions) {
            if (condition.type === 'assign_group' && seat.groupId === condition.group) {
                depthScore += 40;
            } else if (condition.type === 'adjacent_and_group' && seat.groupId === condition.group) {
                depthScore += 50;
            }
        }

        // 3. 群組綁定分數
        if (groupBindings && groupBindings.has(student)) {
            const binding = groupBindings.get(student);
            if (binding.type === 'assign_student_group_to_seat_group' &&
                seat.groupId === binding.seatGroup) {
                depthScore += 70;
            }
        }

        // 4. 深度潛力分數（能讓更多學生被分配的選項優先）
        const remainingSeatsAfterMove = availableSeats.filter(s =>
            s.row !== seat.row || s.col !== seat.col
        );
        const potentialAssignments = Math.min(remainingStudents.length - 1, remainingSeatsAfterMove.length);
        depthScore += potentialAssignments * 20;

        // 5. 座位稀缺性分數（特殊座位優先）
        if (this.isSpecialSeat(seat)) {
            depthScore += 60;
        }

        // 6. 位置偏好分數（前排優先）
        if (seat.row <= 3) {
            depthScore += 15;
        }

        return depthScore;
    }

    /**
     * 廣度優先搜索 - 優化搜索策略
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Promise<Object>} 搜索結果
     */
    async breadthFirstSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.performanceMetrics.executionSteps++;

        // 初始化廣度優先搜索
        this.searchQueue = [];
        this.visitedStates = new Set();
        this.maxQueueSize = this.options.maxQueueSize || 10000;
        this.currentBreadth = 0;

        // 超時檢查
        if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
            this.logger.log('WARN', 'Engine', '廣度優先搜索超時', {
                elapsed: Date.now() - this.performanceMetrics.startTime,
                timeout: this.options.timeout
            });
            return {
                success: false,
                error: '超時',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 基本情況：所有學生都已分配
        if (students.length === 0) {
            return {
                success: true,
                assignment: new Map(this.currentAssignment),
                unassignedStudents: []
            };
        }

        // 初始化搜索隊列
        this.initializeQueue(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap);

        // 處理隊列直到找到解或隊列為空
        while (this.searchQueue.length > 0) {
            // 檢查隊列大小限制
            if (this.searchQueue.length > this.maxQueueSize) {
                this.logger.log('WARN', 'Engine', '廣度優先搜索隊列過大，回退到回溯搜索', {
                    queueSize: this.searchQueue.length,
                    maxSize: this.maxQueueSize
                });
                return await this.backtrackAssignment(
                    students,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            }

            // 從隊列中取出一個狀態
            const currentState = this.searchQueue.shift();

            // 檢查是否已訪問過此狀態
            const stateKey = this.generateStateKey(currentState.assignment, currentState.remainingStudents);
            if (this.visitedStates.has(stateKey)) {
                continue;
            }
            this.visitedStates.add(stateKey);

            // 更新當前分配狀態
            this.currentAssignment = new Map(currentState.assignment);
            this.currentBreadth = currentState.depth;

            this.logger.log('DEBUG', 'Engine', `廣度優先處理狀態`, {
                depth: currentState.depth,
                remainingStudents: currentState.remainingStudents.length,
                queueSize: this.searchQueue.length
            });

            // 檢查是否找到解
            if (currentState.remainingStudents.length === 0) {
                this.logger.log('INFO', 'Engine', '廣度優先搜索找到解');
                return {
                    success: true,
                    assignment: new Map(this.currentAssignment),
                    unassignedStudents: []
                };
            }

            // 處理當前狀態，生成新的候選狀態
            const newStates = await this.processQueueState(
                currentState,
                seats,
                conditions,
                studentScores,
                groupBindings,
                studentToConditionsMap
            );

            // 將新狀態加入隊列
            this.enqueueStates(newStates);

            // 讓出控制權，避免阻塞 UI
            await new Promise(resolve => setTimeout(resolve, 0));
        }

        // 如果隊列為空且沒有找到解，回退到回溯搜索
        this.logger.log('DEBUG', 'Engine', '廣度優先搜索失敗，回退到回溯搜索');
        return await this.backtrackAssignment(
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );
    }

    /**
     * 初始化搜索隊列
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     */
    initializeQueue(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        // 創建初始狀態
        const initialState = {
            assignment: new Map(),
            remainingStudents: [...students],
            depth: 0,
            path: []
        };

        this.searchQueue = [initialState];
        this.visitedStates.clear();
        this.currentBreadth = 0;

        this.logger.log('DEBUG', 'Engine', '初始化廣度優先搜索隊列', {
            initialStudents: students.length,
            totalSeats: seats.length
        });
    }

    /**
     * 處理隊列中的狀態
     * @param {Object} state 當前狀態
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Array} 新生成的狀態列表
     */
    async processQueueState(state, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        const newStates = [];
        const currentStudent = state.remainingStudents[0];

        // 獲取所有可用座位
        const availableSeats = seats.filter(seat =>
            !Array.from(state.assignment.values()).some(assignedSeat =>
                assignedSeat.row === seat.row && assignedSeat.col === seat.col
            )
        );

        // 為當前學生嘗試所有可能的座位
        for (const seat of availableSeats) {
            // 檢查基本條件
            const tempAssignment = new Map(state.assignment);
            tempAssignment.set(currentStudent, seat);

            let isValidMove = true;
            const relevantConditions = this.getStudentConditions(currentStudent, conditions);

            for (const condition of relevantConditions) {
                if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                    isValidMove = false;
                    break;
                }
            }

            if (isValidMove) {
                // 計算廣度優先分數
                const breadthScore = this.evaluateBreadthScore(
                    currentStudent,
                    seat,
                    conditions,
                    studentScores,
                    groupBindings,
                    state.remainingStudents,
                    availableSeats
                );

                // 創建新狀態
                const newState = {
                    assignment: tempAssignment,
                    remainingStudents: state.remainingStudents.filter(s => s !== currentStudent),
                    depth: state.depth + 1,
                    path: [...state.path, { student: currentStudent, seat, breadthScore }]
                };

                newStates.push(newState);
            }
        }

        // 按廣度優先分數排序
        newStates.sort((a, b) => {
            const scoreA = a.path[a.path.length - 1]?.breadthScore || 0;
            const scoreB = b.path[b.path.length - 1]?.breadthScore || 0;
            return scoreB - scoreA;
        });

        return newStates;
    }

    /**
     * 將新狀態加入隊列
     * @param {Array} newStates 新狀態列表
     */
    enqueueStates(newStates) {
        for (const state of newStates) {
            // 檢查隊列大小限制
            if (this.searchQueue.length >= this.maxQueueSize) {
                this.logger.log('WARN', 'Engine', '廣度優先搜索隊列已滿，跳過剩餘狀態');
                break;
            }

            this.searchQueue.push(state);
        }

        this.logger.log('DEBUG', 'Engine', `廣度優先搜索隊列更新`, {
            newStatesCount: newStates.length,
            totalQueueSize: this.searchQueue.length
        });
    }

    /**
     * 評估廣度優先分數
     * @param {string} student 學生ID
     * @param {Object} seat 座位
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Array} remainingStudents 剩餘學生
     * @param {Array} availableSeats 可用座位
     * @returns {number} 廣度優先分數
     */
    evaluateBreadthScore(student, seat, conditions, studentScores, groupBindings, remainingStudents, availableSeats) {
        let breadthScore = 0;

        // 1. 學生優先級分數（高分學生優先）
        breadthScore += (studentScores[student] || 0) * 2;

        // 2. 廣度潛力分數（能讓更多學生在同一層級被分配的選項優先）
        const remainingSeatsAfterMove = availableSeats.filter(s =>
            s.row !== seat.row || s.col !== seat.col
        );
        const potentialAssignments = Math.min(remainingStudents.length - 1, remainingSeatsAfterMove.length);
        breadthScore += potentialAssignments * 25;

        // 3. 條件滿足度分數（滿足更多條件的移動優先）
        const studentConditions = conditions.filter(condition =>
            condition.students.some(studentList =>
                studentList.includes(student)
            )
        );

        for (const condition of studentConditions) {
            if (condition.type === 'assign_group' && seat.groupId === condition.group) {
                breadthScore += 35;
            } else if (condition.type === 'adjacent_and_group' && seat.groupId === condition.group) {
                breadthScore += 45;
            }
        }

        // 4. 群組綁定分數
        if (groupBindings && groupBindings.has(student)) {
            const binding = groupBindings.get(student);
            if (binding.type === 'assign_student_group_to_seat_group' &&
                seat.groupId === binding.seatGroup) {
                breadthScore += 65;
            }
        }

        // 5. 座位稀缺性分數（特殊座位優先）
        if (this.isSpecialSeat(seat)) {
            breadthScore += 55;
        }

        // 6. 位置偏好分數（前排優先）
        if (seat.row <= 3) {
            breadthScore += 12;
        }

        // 7. 廣度擴展分數（能讓搜索更廣的選項優先）
        const adjacentSeats = this.getAdjacentSeats(seat, availableSeats);
        breadthScore += adjacentSeats.length * 8;

        return breadthScore;
    }

    /**
     * 獲取相鄰座位
     * @param {Object} seat 當前座位
     * @param {Array} availableSeats 可用座位列表
     * @returns {Array} 相鄰座位列表
     */
    getAdjacentSeats(seat, availableSeats) {
        return availableSeats.filter(s =>
            (Math.abs(s.row - seat.row) === 1 && s.col === seat.col) ||
            (Math.abs(s.col - seat.col) === 1 && s.row === seat.row)
        );
    }

    /**
     * 生成狀態鍵值
     * @param {Map} assignment 分配狀態
     * @param {Array} remainingStudents 剩餘學生
     * @returns {string} 狀態鍵值
     */
    generateStateKey(assignment, remainingStudents) {
        const assignmentStr = Array.from(assignment.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([student, seat]) => `${student}:${seat.row},${seat.col}`)
            .join('|');

        const studentsStr = remainingStudents.sort().join(',');

        return `${assignmentStr}|${studentsStr}`;
    }

    /**
     * 混合搜索策略 - 動態選擇最適合的搜索方法
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Promise<Object>} 搜索結果
     */
    async hybridSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.performanceMetrics.executionSteps++;

        // 超時檢查
        if (Date.now() - this.performanceMetrics.startTime > this.options.timeout) {
            this.logger.log('WARN', 'Engine', '混合搜索超時', {
                elapsed: Date.now() - this.performanceMetrics.startTime,
                timeout: this.options.timeout
            });
            return {
                success: false,
                error: '超時',
                unassignedStudents: students,
                assignment: new Map(this.currentAssignment)
            };
        }

        // 基本情況：所有學生都已分配
        if (students.length === 0) {
            return {
                success: true,
                assignment: new Map(this.currentAssignment),
                unassignedStudents: []
            };
        }

        // 評估問題複雜度
        const complexity = this.evaluateProblemComplexity(students, seats, conditions, groupBindings);
        this.logger.log('DEBUG', 'Engine', '問題複雜度評估', complexity);

        // 選擇初始搜索策略
        const initialStrategy = this.selectInitialStrategy(complexity);
        this.logger.log('INFO', 'Engine', `混合搜索選擇初始策略: ${initialStrategy}`, { complexity });

        // 執行初始策略
        let result = await this.executeStrategy(
            initialStrategy,
            students,
            seats,
            conditions,
            studentScores,
            groupBindings,
            studentToConditionsMap
        );

        // 如果初始策略成功，返回結果
        if (result.success) {
            this.logger.log('INFO', 'Engine', `混合搜索成功使用策略: ${initialStrategy}`);
            return result;
        }

        // 如果初始策略失敗，嘗試其他策略
        const strategies = ['breadthFirst', 'depthFirst', 'heuristic', 'backtrack'];
        const triedStrategies = [initialStrategy];

        for (const strategy of strategies) {
            if (strategy === initialStrategy) continue;

            this.logger.log('INFO', 'Engine', `混合搜索切換到策略: ${strategy}`);

            result = await this.executeStrategy(
                strategy,
                students,
                seats,
                conditions,
                studentScores,
                groupBindings,
                studentToConditionsMap
            );

            triedStrategies.push(strategy);

            if (result.success) {
                this.logger.log('INFO', 'Engine', `混合搜索成功使用策略: ${strategy}`, { triedStrategies });
                return result;
            }

            // 檢查是否需要提前停止
            if (Date.now() - this.performanceMetrics.startTime > this.options.timeout * 0.8) {
                this.logger.log('WARN', 'Engine', '混合搜索接近超時，停止嘗試其他策略');
                break;
            }
        }

        // 所有策略都失敗
        this.logger.log('ERROR', 'Engine', '混合搜索所有策略都失敗', { triedStrategies });
        return {
            success: false,
            error: '所有搜索策略都失敗',
            unassignedStudents: students,
            assignment: new Map(this.currentAssignment),
            triedStrategies
        };
    }

    /**
     * 評估問題複雜度
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Map} groupBindings 群組綁定
     * @returns {Object} 複雜度評估結果
     */
    evaluateProblemComplexity(students, seats, conditions, groupBindings) {
        const complexity = {
            studentCount: students.length,
            seatCount: seats.length,
            conditionCount: conditions.length,
            groupBindingCount: groupBindings ? groupBindings.size : 0,
            specialSeatCount: seats.filter(seat => this.isSpecialSeat(seat)).length,
            conditionTypes: {},
            overallScore: 0
        };

        // 分析條件類型分布
        conditions.forEach(condition => {
            complexity.conditionTypes[condition.type] = (complexity.conditionTypes[condition.type] || 0) + 1;
        });

        // 計算複雜度分數
        let score = 0;

        // 學生數量權重 (40%)
        const studentRatio = students.length / seats.length;
        if (students.length < 20) {
            score += 20; // 小規模
        } else if (students.length < 50) {
            score += 40; // 中等規模
        } else {
            score += 60; // 大規模
        }

        // 條件複雜度權重 (30%)
        const complexConditionTypes = ['adjacent_and_group', 'assign_group', 'not_adjacent'];
        const complexConditionCount = conditions.filter(c => complexConditionTypes.includes(c.type)).length;
        const conditionComplexityRatio = complexConditionCount / Math.max(conditions.length, 1);
        score += conditionComplexityRatio * 30;

        // 群組綁定複雜度權重 (20%)
        const groupBindingRatio = complexity.groupBindingCount / Math.max(students.length, 1);
        score += groupBindingRatio * 20;

        // 特殊座位需求權重 (10%)
        const specialSeatRatio = complexity.specialSeatCount / Math.max(seats.length, 1);
        score += specialSeatRatio * 10;

        complexity.overallScore = Math.round(score);
        complexity.complexityLevel = score < 30 ? 'low' : score < 60 ? 'medium' : 'high';

        return complexity;
    }

    /**
     * 選擇初始搜索策略
     * @param {Object} complexity 複雜度評估結果
     * @returns {string} 策略名稱
     */
    selectInitialStrategy(complexity) {
        const { studentCount, conditionCount, groupBindingCount, overallScore, complexityLevel } = complexity;

        // 基於複雜度等級的策略選擇
        if (complexityLevel === 'low') {
            // 低複雜度：優先使用啟發式搜索
            if (studentCount < 20 && conditionCount < 5) {
                return 'heuristic';
            }
            // 小規模但條件較多：使用廣度優先
            return 'breadthFirst';
        } else if (complexityLevel === 'medium') {
            // 中等複雜度：優先使用廣度優先搜索
            if (conditionCount > 10 || groupBindingCount > 5) {
                return 'breadthFirst';
            }
            // 中等規模但條件簡單：使用深度優先
            return 'depthFirst';
        } else {
            // 高複雜度：優先使用深度優先搜索
            if (studentCount > 50) {
                return 'depthFirst';
            }
            // 高複雜度但規模不大：使用廣度優先
            return 'breadthFirst';
        }
    }

    /**
     * 執行指定的搜索策略
     * @param {string} strategy 策略名稱
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @returns {Promise<Object>} 搜索結果
     */
    async executeStrategy(strategy, students, seats, conditions, studentScores, groupBindings, studentToConditionsMap) {
        this.logger.log('DEBUG', 'Engine', `執行策略: ${strategy}`);

        switch (strategy) {
            case 'breadthFirst':
                return await this.breadthFirstSearch(
                    students,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            case 'depthFirst':
                return await this.depthFirstSearch(
                    students,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            case 'heuristic':
                return await this.heuristicSearch(
                    students,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            case 'backtrack':
                return await this.backtrackAssignment(
                    students,
                    seats,
                    conditions,
                    studentScores,
                    groupBindings,
                    studentToConditionsMap
                );
            default:
                this.logger.log('ERROR', 'Engine', `未知策略: ${strategy}`);
                return {
                    success: false,
                    error: `未知策略: ${strategy}`,
                    unassignedStudents: students,
                    assignment: new Map(this.currentAssignment)
                };
        }
    }

    /**
     * 早期終止檢查
     * @param {Array} students 剩餘學生
     * @param {Array} seats 剩餘座位
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 終止檢查結果
     */
    earlyTermination(students, seats, conditions, currentState = {}) {
        this.performanceMetrics.executionSteps++;

        const terminationResult = {
            shouldTerminate: false,
            reason: null,
            confidence: 0,
            details: {}
        };

        // 1. 檢查基本終止條件
        if (students.length === 0) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '所有學生已分配';
            terminationResult.confidence = 1.0;
            return terminationResult;
        }

        if (seats.length === 0) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '無可用座位';
            terminationResult.confidence = 1.0;
            return terminationResult;
        }

        // 2. 檢查時間限制
        const currentTime = Date.now();
        const elapsedTime = currentTime - this.performanceMetrics.startTime;
        if (this.performanceMetrics.startTime > 0 && elapsedTime > this.options.timeout) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '超時';
            terminationResult.confidence = 1.0;
            terminationResult.details.elapsedTime = elapsedTime;
            return terminationResult;
        }

        // 3. 檢查執行步驟限制
        if (this.performanceMetrics.executionSteps > 1000000) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '執行步驟過多';
            terminationResult.confidence = 0.9;
            terminationResult.details.executionSteps = this.performanceMetrics.executionSteps;
            return terminationResult;
        }

        // 4. 檢查無解情況
        const unsolvableCheck = this.checkUnsolvableCase(students, seats, conditions);
        if (unsolvableCheck.isUnsolvable) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '檢測到無解情況';
            terminationResult.confidence = unsolvableCheck.confidence;
            terminationResult.details.unsolvableReason = unsolvableCheck.reason;
            return terminationResult;
        }

        // 5. 檢查局部最優陷阱
        const localOptimaCheck = this.checkLocalOptima(currentState);
        if (localOptimaCheck.isTrapped) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '檢測到局部最優陷阱';
            terminationResult.confidence = localOptimaCheck.confidence;
            terminationResult.details.trapType = localOptimaCheck.trapType;
            return terminationResult;
        }

        // 6. 檢查進度停滯
        const stagnationCheck = this.checkProgressStagnation(currentState);
        if (stagnationCheck.isStagnant) {
            terminationResult.shouldTerminate = true;
            terminationResult.reason = '進度停滯';
            terminationResult.confidence = stagnationCheck.confidence;
            terminationResult.details.stagnationDuration = stagnationCheck.duration;
            return terminationResult;
        }

        return terminationResult;
    }

    /**
     * 檢查無解情況
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 無解檢查結果
     */
    checkUnsolvableCase(students, seats, conditions) {
        const result = {
            isUnsolvable: false,
            confidence: 0,
            reason: null
        };

        // 檢查座位數量是否足夠
        if (seats.length < students.length) {
            result.isUnsolvable = true;
            result.confidence = 1.0;
            result.reason = '座位數量不足';
            return result;
        }

        // 檢查特殊座位需求
        const specialSeatRequirements = this.analyzeSpecialSeatRequirements(students, conditions);
        const availableSpecialSeats = seats.filter(seat => seat.isSpecial || seat.groupId);

        if (specialSeatRequirements.count > availableSpecialSeats.length) {
            result.isUnsolvable = true;
            result.confidence = 0.95;
            result.reason = '特殊座位需求無法滿足';
            return result;
        }

        // 檢查群組條件衝突
        const groupConflictCheck = this.checkGroupConditionConflicts(students, seats, conditions);
        if (groupConflictCheck.hasConflict) {
            result.isUnsolvable = true;
            result.confidence = groupConflictCheck.confidence;
            result.reason = '群組條件衝突';
            return result;
        }

        return result;
    }

    /**
     * 分析特殊座位需求
     * @param {Array} students 學生列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 特殊座位需求分析
     */
    analyzeSpecialSeatRequirements(students, conditions) {
        const specialRequirements = {
            count: 0,
            types: new Set(),
            students: new Set()
        };

        conditions.forEach(condition => {
            if (condition.type === 'assign_seat' && condition.seatId) {
                specialRequirements.count++;
                specialRequirements.types.add('specific_seat');
                specialRequirements.students.add(condition.studentId);
            }
        });

        return specialRequirements;
    }

    /**
     * 檢查群組條件衝突
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 群組衝突檢查結果
     */
    checkGroupConditionConflicts(students, seats, conditions) {
        const result = {
            hasConflict: false,
            confidence: 0,
            reason: null
        };

        // 分析群組條件
        const groupConditions = conditions.filter(c => c.type === 'assign_group' || c.type === 'adjacent_and_group');
        const groupSeats = seats.filter(s => s.groupId);

        // 檢查群組座位是否足夠
        const requiredGroupSeats = new Set();
        groupConditions.forEach(condition => {
            if (condition.groupId) {
                requiredGroupSeats.add(condition.groupId);
            }
        });

        const availableGroupSeats = new Set(groupSeats.map(s => s.groupId));
        const missingGroups = [...requiredGroupSeats].filter(group => !availableGroupSeats.has(group));

        if (missingGroups.length > 0) {
            result.hasConflict = true;
            result.confidence = 0.9;
            result.reason = `缺少群組座位: ${missingGroups.join(', ')}`;
        }

        return result;
    }

    /**
     * 檢查局部最優陷阱
     * @param {Object} currentState 當前狀態
     * @returns {Object} 局部最優檢查結果
     */
    checkLocalOptima(currentState) {
        const result = {
            isTrapped: false,
            confidence: 0,
            trapType: null
        };

        // 檢查重複狀態
        if (currentState.repeatedStates && currentState.repeatedStates > 10) {
            result.isTrapped = true;
            result.confidence = 0.8;
            result.trapType = 'repeated_states';
            return result;
        }

        // 檢查無進展狀態
        if (currentState.noProgressSteps && currentState.noProgressSteps > 50) {
            result.isTrapped = true;
            result.confidence = 0.7;
            result.trapType = 'no_progress';
            return result;
        }

        // 檢查循環模式
        if (currentState.cyclePattern && currentState.cyclePattern.length > 5) {
            result.isTrapped = true;
            result.confidence = 0.6;
            result.trapType = 'cycle_pattern';
            return result;
        }

        return result;
    }

    /**
     * 檢查進度停滯
     * @param {Object} currentState 當前狀態
     * @returns {Object} 停滯檢查結果
     */
    checkProgressStagnation(currentState) {
        const result = {
            isStagnant: false,
            confidence: 0,
            duration: 0
        };

        const now = Date.now();

        // 檢查最後進度更新時間
        if (currentState.lastProgressTime) {
            const stagnationDuration = now - currentState.lastProgressTime;
            if (stagnationDuration > 5000) { // 5秒無進展
                result.isStagnant = true;
                result.confidence = 0.8;
                result.duration = stagnationDuration;
            }
        }

        // 檢查連續失敗次數
        if (currentState.consecutiveFailures && currentState.consecutiveFailures > 100) {
            result.isStagnant = true;
            result.confidence = 0.9;
            result.duration = currentState.consecutiveFailures * 10; // 估算時間
        }

        return result;
    }

    /**
     * 無效路徑剪枝檢查
     * @param {Array} students 剩餘學生
     * @param {Array} seats 剩餘座位
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 剪枝檢查結果
     */
    pruneInvalidPaths(students, seats, conditions, currentState = {}, proposedAssignment = null) {
        this.performanceMetrics.executionSteps++;
        this.pruningStats.totalChecks++;

        const pruningResult = {
            shouldPrune: false,
            reason: null,
            confidence: 0,
            details: {},
            cacheHit: false
        };

        // 1. 檢查已嘗試的狀態組合
        const stateKey = this.generateStateKey(students, seats, currentState);
        if (this.invalidPathsCache.has(stateKey)) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '已嘗試過的無效狀態';
            pruningResult.confidence = 0.9;
            pruningResult.cacheHit = true;
            this.pruningStats.cacheHits++;
            return pruningResult;
        }

        // 2. 檢查會導致衝突的狀態
        const conflictCheck = this.checkProposedConflict(students, seats, conditions, proposedAssignment);
        if (conflictCheck.hasConflict) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '會導致衝突的狀態';
            pruningResult.confidence = conflictCheck.confidence;
            pruningResult.details.conflictType = conflictCheck.conflictType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 3. 檢查資源不足的狀態
        const resourceCheck = this.checkResourceInsufficiency(students, seats, conditions);
        if (resourceCheck.isInsufficient) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '資源不足';
            pruningResult.confidence = resourceCheck.confidence;
            pruningResult.details.resourceType = resourceCheck.resourceType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 4. 檢查違反約束的狀態
        const constraintCheck = this.checkConstraintViolation(students, seats, conditions, currentState);
        if (constraintCheck.violatesConstraint) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '違反約束條件';
            pruningResult.confidence = constraintCheck.confidence;
            pruningResult.details.constraintType = constraintCheck.constraintType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        // 5. 檢查模式匹配的無效路徑
        const patternCheck = this.checkInvalidPattern(students, seats, conditions, currentState);
        if (patternCheck.matchesPattern) {
            pruningResult.shouldPrune = true;
            pruningResult.reason = '匹配已知無效模式';
            pruningResult.confidence = patternCheck.confidence;
            pruningResult.details.patternType = patternCheck.patternType;
            this.recordInvalidPath(stateKey, pruningResult);
            return pruningResult;
        }

        return pruningResult;
    }

    /**
     * 檢查提議分配是否會導致衝突
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkProposedConflict(students, seats, conditions, proposedAssignment) {
        const result = {
            hasConflict: false,
            confidence: 0,
            conflictType: null
        };

        if (!proposedAssignment) {
            return result;
        }

        // 檢查相鄰條件衝突
        for (const condition of conditions) {
            if (condition.type === 'adjacent' || condition.type === 'not_adjacent') {
                const conflict = this.checkAdjacentConditionConflict(condition, proposedAssignment);
                if (conflict.hasConflict) {
                    result.hasConflict = true;
                    result.confidence = 0.8;
                    result.conflictType = 'adjacent_condition';
                    return result;
                }
            }
        }

        // 檢查群組條件衝突
        for (const condition of conditions) {
            if (condition.type === 'assign_group' || condition.type === 'adjacent_and_group') {
                const conflict = this.checkGroupConditionConflict(condition, proposedAssignment);
                if (conflict.hasConflict) {
                    result.hasConflict = true;
                    result.confidence = 0.9;
                    result.conflictType = 'group_condition';
                    return result;
                }
            }
        }

        return result;
    }

    /**
     * 檢查相鄰條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkAdjacentConditionConflict(condition, proposedAssignment) {
        const result = {
            hasConflict: false,
            details: {}
        };

        const { student1, student2 } = condition;

        // 通過ID查找學生在提議分配中的座位
        let seat1 = null;
        let seat2 = null;

        for (const [student, seat] of proposedAssignment.entries()) {
            if (student.id === student1.id) {
                seat1 = seat;
            }
            if (student.id === student2.id) {
                seat2 = seat;
            }
        }

        if (!seat1 || !seat2) {
            return result;
        }

        const isAdjacent = this.areSeatsAdjacent(seat1, seat2);

        if (condition.type === 'adjacent' && !isAdjacent) {
            result.hasConflict = true;
            result.details.reason = '要求相鄰但座位不相鄰';
        } else if (condition.type === 'not_adjacent' && isAdjacent) {
            result.hasConflict = true;
            result.details.reason = '要求不相鄰但座位相鄰';
        }

        return result;
    }

    /**
     * 檢查群組條件衝突
     * @param {Object} condition 條件
     * @param {Object} proposedAssignment 提議的分配
     * @returns {Object} 衝突檢查結果
     */
    checkGroupConditionConflict(condition, proposedAssignment) {
        const result = {
            hasConflict: false,
            details: {}
        };

        const { group, seat } = condition;
        const groupStudents = Array.from(proposedAssignment.keys()).filter(student =>
            student.group === group
        );

        if (groupStudents.length === 0) {
            return result;
        }

        const assignedSeats = groupStudents.map(student => proposedAssignment.get(student));
        const targetSeat = seat;

        if (condition.type === 'assign_group') {
            // 檢查群組是否都在指定座位
            const allInTargetSeat = assignedSeats.every(assignedSeat =>
                assignedSeat.id === targetSeat.id
            );
            if (!allInTargetSeat) {
                result.hasConflict = true;
                result.details.reason = '群組學生未都在指定座位';
            }
        } else if (condition.type === 'adjacent_and_group') {
            // 檢查群組是否相鄰
            const areAdjacent = this.checkGroupAdjacency(assignedSeats);
            if (!areAdjacent) {
                result.hasConflict = true;
                result.details.reason = '群組學生座位不相鄰';
            }
        }

        return result;
    }

    /**
     * 檢查資源不足
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 資源檢查結果
     */
    checkResourceInsufficiency(students, seats, conditions) {
        const result = {
            isInsufficient: false,
            confidence: 0,
            resourceType: null
        };

        // 檢查基本座位數量
        if (seats.length < students.length) {
            result.isInsufficient = true;
            result.confidence = 1.0;
            result.resourceType = 'basic_seats';
            return result;
        }

        // 檢查特殊座位需求
        const specialSeatRequirements = this.analyzeSpecialSeatRequirements(students, conditions);
        const availableSpecialSeats = seats.filter(seat => this.isSpecialSeat(seat));

        for (const [requirement, count] of Object.entries(specialSeatRequirements)) {
            const availableCount = availableSpecialSeats.filter(seat =>
                seat.type === requirement
            ).length;

            if (availableCount < count) {
                result.isInsufficient = true;
                result.confidence = 0.9;
                result.resourceType = `special_seat_${requirement}`;
                return result;
            }
        }

        return result;
    }

    /**
     * 檢查約束違反
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 約束檢查結果
     */
    checkConstraintViolation(students, seats, conditions, currentState) {
        const result = {
            violatesConstraint: false,
            confidence: 0,
            constraintType: null
        };

        // 檢查群組約束
        const groupConstraintCheck = this.checkGroupConstraintViolation(students, seats, conditions);
        if (groupConstraintCheck.violatesConstraint) {
            result.violatesConstraint = true;
            result.confidence = groupConstraintCheck.confidence;
            result.constraintType = 'group_constraint';
            return result;
        }

        // 檢查座位約束
        const seatConstraintCheck = this.checkSeatConstraintViolation(students, seats, conditions);
        if (seatConstraintCheck.violatesConstraint) {
            result.violatesConstraint = true;
            result.confidence = seatConstraintCheck.confidence;
            result.constraintType = 'seat_constraint';
            return result;
        }

        return result;
    }

    /**
     * 檢查群組約束違反
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 群組約束檢查結果
     */
    checkGroupConstraintViolation(students, seats, conditions) {
        const result = {
            violatesConstraint: false,
            confidence: 0
        };

        // 檢查群組條件是否可滿足
        const groupConditions = conditions.filter(c =>
            c.type === 'assign_group' || c.type === 'adjacent_and_group'
        );

        for (const condition of groupConditions) {
            const groupStudents = students.filter(s => s.group === condition.group);
            const requiredSeats = this.getRequiredSeatsForGroup(condition, seats);

            if (requiredSeats.length < groupStudents.length) {
                result.violatesConstraint = true;
                result.confidence = 0.8;
                return result;
            }
        }

        return result;
    }

    /**
     * 檢查座位約束違反
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 座位約束檢查結果
     */
    checkSeatConstraintViolation(students, seats, conditions) {
        const result = {
            violatesConstraint: false,
            confidence: 0
        };

        // 檢查指定座位條件是否可滿足
        const assignSeatConditions = conditions.filter(c => c.type === 'assign_seat');

        for (const condition of assignSeatConditions) {
            const targetSeat = seats.find(s => s.id === condition.seat);
            if (!targetSeat) {
                result.violatesConstraint = true;
                result.confidence = 0.9;
                return result;
            }
        }

        return result;
    }

    /**
     * 檢查無效模式
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @returns {Object} 模式檢查結果
     */
    checkInvalidPattern(students, seats, conditions, currentState) {
        const result = {
            matchesPattern: false,
            confidence: 0,
            patternType: null
        };

        // 檢查循環模式
        if (currentState.cyclePattern && currentState.cyclePattern.length > 3) {
            const patternKey = this.generatePatternKey(currentState.cyclePattern);
            if (this.invalidPathPatterns.has(patternKey)) {
                result.matchesPattern = true;
                result.confidence = 0.7;
                result.patternType = 'cycle_pattern';
                return result;
            }
        }

        // 檢查重複狀態模式
        if (currentState.repeatedStates && currentState.repeatedStates > 5) {
            const patternKey = `repeated_${currentState.repeatedStates}`;
            if (this.invalidPathPatterns.has(patternKey)) {
                result.matchesPattern = true;
                result.confidence = 0.6;
                result.patternType = 'repeated_states';
                return result;
            }
        }

        return result;
    }

    /**
     * 記錄無效路徑
     * @param {string} stateKey 狀態鍵
     * @param {Object} pruningResult 剪枝結果
     */
    recordInvalidPath(stateKey, pruningResult) {
        this.invalidPathsCache.add(stateKey);
        this.pruningStats.prunedPaths++;

        // 記錄模式
        if (pruningResult.details.patternType) {
            const patternKey = this.generatePatternKey(pruningResult.details.patternType);
            this.invalidPathPatterns.set(patternKey, {
                count: (this.invalidPathPatterns.get(patternKey)?.count || 0) + 1,
                lastSeen: Date.now()
            });
        }
    }

    /**
     * 生成狀態鍵
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Object} currentState 當前狀態
     * @returns {string} 狀態鍵
     */
    generateStateKey(students, seats, currentState) {
        const studentIds = students.map(s => s.id).sort().join(',');
        const seatIds = seats.map(s => s.id).sort().join(',');
        const assignmentKey = Array.from(this.currentAssignment.entries())
            .map(([student, seat]) => `${student.id}:${seat.id}`)
            .sort()
            .join(',');

        return `${studentIds}|${seatIds}|${assignmentKey}`;
    }

    /**
     * 生成模式鍵
     * @param {Array|string} pattern 模式
     * @returns {string} 模式鍵
     */
    generatePatternKey(pattern) {
        if (Array.isArray(pattern)) {
            return pattern.join('->');
        }
        return pattern;
    }

    /**
     * 檢查座位是否相鄰
     * @param {Object} seat1 座位1
     * @param {Object} seat2 座位2
     * @returns {boolean} 是否相鄰
     */
    areSeatsAdjacent(seat1, seat2) {
        // 簡單的相鄰檢查邏輯
        const rowDiff = Math.abs(seat1.row - seat2.row);
        const colDiff = Math.abs(seat1.column - seat2.column);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    /**
     * 檢查群組座位是否相鄰
     * @param {Array} assignedSeats 已分配的座位
     * @returns {boolean} 是否相鄰
     */
    checkGroupAdjacency(assignedSeats) {
        if (assignedSeats.length <= 1) {
            return true;
        }

        for (let i = 0; i < assignedSeats.length; i++) {
            for (let j = i + 1; j < assignedSeats.length; j++) {
                if (!this.areSeatsAdjacent(assignedSeats[i], assignedSeats[j])) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 獲取群組所需座位
     * @param {Object} condition 條件
     * @param {Array} seats 座位列表
     * @returns {Array} 所需座位列表
     */
    getRequiredSeatsForGroup(condition, seats) {
        if (condition.type === 'assign_group') {
            return seats.filter(s => s.id === condition.seat);
        } else if (condition.type === 'adjacent_and_group') {
            // 返回相鄰的座位組合
            const adjacentSeats = [];
            for (const seat of seats) {
                const adjacent = this.getAdjacentSeats(seat, seats);
                adjacentSeats.push(...adjacent);
            }
            return [...new Set(adjacentSeats)]; // 去重
        }
        return seats;
    }

    /**
     * 重複狀態剪枝 - 檢測並剪枝重複的搜索狀態
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} currentState 當前狀態
     * @param {Map} currentAssignment 當前分配
     * @returns {Object} 剪枝結果
     */
    pruneDuplicateStates(students, seats, conditions, currentState, currentAssignment) {
        this.duplicatePruningStats.totalChecks++;

        // 生成標準化狀態鍵
        const stateKey = this.generateNormalizedStateKey(students, seats, currentState, currentAssignment);

        // 1. 檢查等價狀態（不同學生順序，相同分配）
        if (this.checkEquivalentState(students, seats, currentState, currentAssignment)) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.log('DEBUG', 'PruneDuplicateStates', '等價狀態，剪枝狀態', { stateKey });
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
            this.logger.log('DEBUG', 'PruneDuplicateStates', '緩存命中，剪枝重複狀態', { stateKey });
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
            this.logger.log('DEBUG', 'PruneDuplicateStates', '歷史重複，剪枝狀態', { stateKey });
            return {
                shouldPrune: true,
                reason: '重複狀態（歷史記錄）',
                duplicateType: 'history_duplicate',
                stateKey,
                stats: this.duplicatePruningStats
            };
        }

        // 4. 檢查對稱狀態（對稱座位排列，相同分配）
        const symmetricResult = this.checkSymmetricState(students, seats, currentState, currentAssignment);
        if (symmetricResult.isSymmetric) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.log('DEBUG', 'PruneDuplicateStates', '對稱狀態，剪枝狀態', { stateKey, symmetryType: symmetricResult.symmetryType });
            return {
                shouldPrune: true,
                reason: '對稱狀態',
                duplicateType: 'symmetric_state',
                stateKey,
                stats: this.duplicatePruningStats,
                details: {
                    symmetricInfo: {
                        symmetryType: symmetricResult.symmetryType
                    }
                }
            };
        }

        // 5. 檢查循環狀態（重複狀態序列）
        if (this.checkCycleState()) {
            this.duplicatePruningStats.prunedDuplicates++;
            this.logger.log('DEBUG', 'PruneDuplicateStates', '循環狀態，剪枝狀態', { stateKey });
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
        return this.duplicateStatesCache.has(symmetricKey) || this.checkStateHistoryDuplicate(symmetricKey);
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
        return this.duplicateStatesCache.has(symmetricKey) || this.checkStateHistoryDuplicate(symmetricKey);
    }

    /**
     * 檢查循環狀態
     * @returns {boolean} 是否循環
     */
    checkCycleState() {
        // 檢查最近10個狀態是否形成循環
        const recentStates = this.stateHistory.slice(-10).map(record => record.stateKey);
        if (recentStates.length < 4) {
            return false;
        }

        // 檢查是否存在重複模式
        for (let patternLength = 2; patternLength <= Math.floor(recentStates.length / 2); patternLength++) {
            const pattern = recentStates.slice(-patternLength);
            const previousPattern = recentStates.slice(-2 * patternLength, -patternLength);

            if (this.isPatternMatch(pattern, previousPattern)) {
                return true;
            }
        }

        // 檢查是否有連續的重複狀態鍵
        for (let i = 0; i < recentStates.length - 1; i++) {
            if (recentStates[i] === recentStates[i + 1]) {
                return true;
            }
        }

        // 檢查是否有循環模式（如 A->B->C->A）
        for (let i = 0; i < recentStates.length - 2; i++) {
            for (let j = i + 2; j < recentStates.length; j++) {
                if (recentStates[i] === recentStates[j]) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * 檢查模式匹配
     * @param {Array} pattern1 模式1
     * @param {Array} pattern2 模式2
     * @returns {boolean} 是否匹配
     */
    isPatternMatch(pattern1, pattern2) {
        if (pattern1.length !== pattern2.length) {
            return false;
        }

        for (let i = 0; i < pattern1.length; i++) {
            if (pattern1[i] !== pattern2[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * 記錄重複狀態
     * @param {string} stateKey 狀態鍵
     * @param {string} reason 重複原因
     */
    recordDuplicateState(stateKey, reason) {
        this.duplicateStatesCache.add(stateKey);
        this.logger.log('DEBUG', 'PruneDuplicateStates', '記錄重複狀態', { stateKey, reason });
    }

    /**
     * 記錄當前狀態
     * @param {string} stateKey 狀態鍵
     */
    recordCurrentState(stateKey) {
        this.stateHistory.push({
            stateKey: stateKey,
            timestamp: Date.now()
        });
        // 保持歷史記錄在合理範圍內
        if (this.stateHistory.length > 100) {
            this.stateHistory.shift();
        }
    }

    /**
     * 多起點初始化 - 生成多個不同的搜索起點
     * @param {Array} students 待分配學生列表
     * @param {Array} seats 可用座位列表
     * @param {Array} conditions 分配條件
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {Object} options 配置選項
     * @returns {Object} 多起點配置
     */
    initializeMultipleStarts(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options = {}) {
        // 輸入驗證
        if (!students || students.length === 0) {
            throw new Error('學生列表不能為空');
        }
        if (!seats || seats.length === 0) {
            throw new Error('座位列表不能為空');
        }
        if (!studentScores || Object.keys(studentScores).length === 0) {
            throw new Error('學生分數不能為空');
        }

        const startTime = Date.now();
        this.logger.log('INFO', 'Engine', '開始多起點初始化', {
            studentCount: students.length,
            seatCount: seats.length,
            options
        });

        const {
            startPointCount = 5,
            strategies = ['heuristic', 'depthFirst', 'breadthFirst'],
            enableRandomization = true,
            enableGroupOptimization = true
        } = options;

        const startPoints = [];
        const usedStrategies = new Set();

        try {
            // 策略 1: 基於不同學生排序的起點
            if (strategies.includes('heuristic')) {
                const heuristicStartPoints = this.generateHeuristicStartPoints(
                    students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
                );
                startPoints.push(...heuristicStartPoints);
                usedStrategies.add('heuristic');
            }

            // 策略 2: 基於不同座位排序的起點
            if (strategies.includes('depthFirst')) {
                const depthFirstStartPoints = this.generateDepthFirstStartPoints(
                    students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
                );
                startPoints.push(...depthFirstStartPoints);
                usedStrategies.add('depthFirst');
            }

            // 策略 3: 基於隨機化的起點
            if (enableRandomization && strategies.includes('breadthFirst')) {
                const randomStartPoints = this.generateRandomStartPoints(
                    students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
                );
                startPoints.push(...randomStartPoints);
                usedStrategies.add('breadthFirst');
            }

            // 策略 4: 基於群組優化的起點
            if (enableGroupOptimization) {
                const groupStartPoints = this.generateGroupOptimizedStartPoints(
                    students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, startPointCount
                );
                startPoints.push(...groupStartPoints);
                usedStrategies.add('groupOptimized');
            }

            // 限制起點數量並分配優先級
            const limitedStartPoints = this.limitAndPrioritizeStartPoints(startPoints, startPointCount);

            const generationTime = Date.now() - startTime;

            this.logger.log('INFO', 'Engine', '多起點初始化完成', {
                totalGenerated: startPoints.length,
                finalCount: limitedStartPoints.length,
                generationTime,
                strategies: Array.from(usedStrategies)
            });

            return {
                startPoints: limitedStartPoints,
                metadata: {
                    totalStartPoints: limitedStartPoints.length,
                    generationTime,
                    strategies: Array.from(usedStrategies),
                    originalStudentCount: students.length,
                    originalSeatCount: seats.length
                }
            };

        } catch (error) {
            this.logger.log('ERROR', 'Engine', '多起點初始化失敗', { error: error.message });
            throw new Error(`多起點初始化失敗: ${error.message}`);
        }
    }

    /**
     * 生成啟發式搜索起點
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {number} count 起點數量
     * @returns {Array} 啟發式起點列表
     */
    generateHeuristicStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
        const startPoints = [];

        for (let i = 0; i < count; i++) {
            // 基於分數的學生排序變體
            const sortedStudents = this.studentScorer.sortStudentsByPriority(students, studentScores);

            // 創建不同的學生排序變體
            let variantStudents;
            if (i === 0) {
                // 原始排序
                variantStudents = [...sortedStudents];
            } else if (i === 1) {
                // 反向排序
                variantStudents = [...sortedStudents].reverse();
            } else if (i === 2) {
                // 隨機打亂
                variantStudents = this.shuffleArray([...sortedStudents]);
            } else {
                // 基於不同權重的排序
                const weightedScores = this.calculateWeightedScores(students, studentScores, i);
                variantStudents = this.studentScorer.sortStudentsByPriority(students, weightedScores);
            }

            startPoints.push({
                id: `heuristic_start_${i + 1}`,
                students: variantStudents,
                seats: [...seats],
                conditions: [...conditions],
                studentScores: { ...studentScores },
                groupBindings: new Map(groupBindings),
                studentToConditionsMap: new Map(studentToConditionsMap),
                strategy: 'heuristic',
                priority: i + 1,
                description: `啟發式起點 ${i + 1} - ${this.getStudentOrderDescription(variantStudents, sortedStudents)}`
            });
        }

        return startPoints;
    }

    /**
     * 生成深度優先搜索起點
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {number} count 起點數量
     * @returns {Array} 深度優先起點列表
     */
    generateDepthFirstStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
        const startPoints = [];

        for (let i = 0; i < count; i++) {
            // 基於座位偏好的排序變體
            const sortedSeats = this.sortSeatsByPreference(seats);

            // 創建不同的座位排序變體
            let variantSeats;
            if (i === 0) {
                // 原始座位排序
                variantSeats = [...sortedSeats];
            } else if (i === 1) {
                // 反向座位排序
                variantSeats = [...sortedSeats].reverse();
            } else if (i === 2) {
                // 隨機座位排序
                variantSeats = this.shuffleArray([...sortedSeats]);
            } else {
                // 基於不同標準的座位排序
                variantSeats = this.sortSeatsByAlternativeCriteria(seats, i);
            }

            startPoints.push({
                id: `depthFirst_start_${i + 1}`,
                students: [...students],
                seats: variantSeats,
                conditions: [...conditions],
                studentScores: { ...studentScores },
                groupBindings: new Map(groupBindings),
                studentToConditionsMap: new Map(studentToConditionsMap),
                strategy: 'depthFirst',
                priority: i + 1,
                description: `深度優先起點 ${i + 1} - ${this.getSeatOrderDescription(variantSeats, sortedSeats)}`
            });
        }

        return startPoints;
    }

    /**
     * 生成隨機搜索起點
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {number} count 起點數量
     * @returns {Array} 隨機起點列表
     */
    generateRandomStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
        const startPoints = [];

        for (let i = 0; i < count; i++) {
            // 隨機化學生和座位
            const randomStudents = this.shuffleArray([...students]);
            const randomSeats = this.shuffleArray([...seats]);

            startPoints.push({
                id: `random_start_${i + 1}`,
                students: randomStudents,
                seats: randomSeats,
                conditions: [...conditions],
                studentScores: { ...studentScores },
                groupBindings: new Map(groupBindings),
                studentToConditionsMap: new Map(studentToConditionsMap),
                strategy: 'breadthFirst',
                priority: i + 1,
                description: `隨機起點 ${i + 1} - 完全隨機化`
            });
        }

        return startPoints;
    }

    /**
     * 生成群組優化起點
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {number} count 起點數量
     * @returns {Array} 群組優化起點列表
     */
    generateGroupOptimizedStartPoints(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, count) {
        const startPoints = [];

        // 按群組組織學生
        const studentsByGroup = this.groupStudentsByGroup(students, groupBindings);
        const seatsByGroup = this.groupSeatsByGroup(seats);

        for (let i = 0; i < count; i++) {
            // 創建群組優化的學生排序
            const groupOptimizedStudents = this.createGroupOptimizedOrder(studentsByGroup, i);

            // 創建群組優化的座位排序
            const groupOptimizedSeats = this.createGroupOptimizedSeatOrder(seatsByGroup, i);

            startPoints.push({
                id: `groupOptimized_start_${i + 1}`,
                students: groupOptimizedStudents,
                seats: groupOptimizedSeats,
                conditions: [...conditions],
                studentScores: { ...studentScores },
                groupBindings: new Map(groupBindings),
                studentToConditionsMap: new Map(studentToConditionsMap),
                strategy: 'groupOptimized',
                priority: i + 1,
                description: `群組優化起點 ${i + 1} - 群組優先策略`
            });
        }

        return startPoints;
    }

    /**
     * 限制並優先級排序起點
     * @param {Array} startPoints 所有起點
     * @param {number} maxCount 最大數量
     * @returns {Array} 限制後的起點列表
     */
    limitAndPrioritizeStartPoints(startPoints, maxCount) {
        // 按優先級排序
        startPoints.sort((a, b) => a.priority - b.priority);

        // 限制數量
        return startPoints.slice(0, maxCount);
    }

    // 輔助方法

    /**
     * 計算加權分數
     * @param {Array} students 學生列表
     * @param {Object} studentScores 原始分數
     * @param {number} weightIndex 權重索引
     * @returns {Object} 加權分數
     */
    calculateWeightedScores(students, studentScores, weightIndex) {
        const weights = [
            { academic: 0.4, behavior: 0.3, special: 0.3 },
            { academic: 0.6, behavior: 0.2, special: 0.2 },
            { academic: 0.2, behavior: 0.6, special: 0.2 },
            { academic: 0.3, behavior: 0.2, special: 0.5 }
        ];

        const weight = weights[weightIndex % weights.length];
        const weightedScores = {};

        for (const student of students) {
            const originalScore = studentScores[student.id] || 0;
            weightedScores[student.id] = originalScore * (0.8 + Math.random() * 0.4); // 添加隨機變異
        }

        return weightedScores;
    }

    /**
     * 基於替代標準排序座位
     * @param {Array} seats 座位列表
     * @param {number} criteriaIndex 標準索引
     * @returns {Array} 排序後的座位
     */
    sortSeatsByAlternativeCriteria(seats, criteriaIndex) {
        const criteria = [
            (a, b) => (a.row - b.row) || (a.col - b.col), // 按行列排序
            (a, b) => (b.row - a.row) || (b.col - a.col), // 反向行列排序
            (a, b) => (a.groupId || a.group || '').localeCompare(b.groupId || b.group || ''), // 按群組排序
            (a, b) => (b.groupId || b.group || '').localeCompare(a.groupId || a.group || '')  // 反向群組排序
        ];

        const criteriaFunc = criteria[criteriaIndex % criteria.length];
        return [...seats].sort(criteriaFunc);
    }

    /**
     * 按群組組織學生
     * @param {Array} students 學生列表
     * @param {Map} groupBindings 群組綁定
     * @returns {Map} 按群組組織的學生
     */
    groupStudentsByGroup(students, groupBindings) {
        const studentsByGroup = new Map();

        for (const student of students) {
            const groupId = groupBindings.get(student.id) || 'default';
            if (!studentsByGroup.has(groupId)) {
                studentsByGroup.set(groupId, []);
            }
            studentsByGroup.get(groupId).push(student);
        }

        return studentsByGroup;
    }

    /**
     * 按群組組織座位
     * @param {Array} seats 座位列表
     * @returns {Map} 按群組組織的座位
     */
    groupSeatsByGroup(seats) {
        const seatsByGroup = new Map();

        for (const seat of seats) {
            const groupId = seat.groupId || seat.group || 'default';
            if (!seatsByGroup.has(groupId)) {
                seatsByGroup.set(groupId, []);
            }
            seatsByGroup.get(groupId).push(seat);
        }

        return seatsByGroup;
    }

    /**
     * 創建群組優化順序
     * @param {Map} studentsByGroup 按群組組織的學生
     * @param {number} strategyIndex 策略索引
     * @returns {Array} 群組優化的學生順序
     */
    createGroupOptimizedOrder(studentsByGroup, strategyIndex) {
        const strategies = [
            // 策略1: 按群組大小排序
            () => {
                const sortedGroups = Array.from(studentsByGroup.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                return sortedGroups.flatMap(([groupId, students]) => students);
            },
            // 策略2: 按群組ID排序
            () => {
                const sortedGroups = Array.from(studentsByGroup.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]));
                return sortedGroups.flatMap(([groupId, students]) => students);
            },
            // 策略3: 交錯群組
            () => {
                const groups = Array.from(studentsByGroup.values());
                const result = [];
                let maxLength = Math.max(...groups.map(g => g.length));

                for (let i = 0; i < maxLength; i++) {
                    for (const group of groups) {
                        if (i < group.length) {
                            result.push(group[i]);
                        }
                    }
                }
                return result;
            }
        ];

        const strategy = strategies[strategyIndex % strategies.length];
        return strategy();
    }

    /**
     * 創建群組優化座位順序
     * @param {Map} seatsByGroup 按群組組織的座位
     * @param {number} strategyIndex 策略索引
     * @returns {Array} 群組優化的座位順序
     */
    createGroupOptimizedSeatOrder(seatsByGroup, strategyIndex) {
        const strategies = [
            // 策略1: 按群組大小排序
            () => {
                const sortedGroups = Array.from(seatsByGroup.entries())
                    .sort((a, b) => b[1].length - a[1].length);
                return sortedGroups.flatMap(([groupId, seats]) => seats);
            },
            // 策略2: 按群組ID排序
            () => {
                const sortedGroups = Array.from(seatsByGroup.entries())
                    .sort((a, b) => a[0].localeCompare(b[0]));
                return sortedGroups.flatMap(([groupId, seats]) => seats);
            },
            // 策略3: 交錯群組
            () => {
                const groups = Array.from(seatsByGroup.values());
                const result = [];
                let maxLength = Math.max(...groups.map(g => g.length));

                for (let i = 0; i < maxLength; i++) {
                    for (const group of groups) {
                        if (i < group.length) {
                            result.push(group[i]);
                        }
                    }
                }
                return result;
            }
        ];

        const strategy = strategies[strategyIndex % strategies.length];
        return strategy();
    }

    /**
     * 獲取學生順序描述
     * @param {Array} variantStudents 變體學生順序
     * @param {Array} originalStudents 原始學生順序
     * @returns {string} 描述
     */
    getStudentOrderDescription(variantStudents, originalStudents) {
        if (variantStudents.length === originalStudents.length) {
            const isReversed = variantStudents[0] === originalStudents[originalStudents.length - 1];
            const isShuffled = !isReversed && variantStudents[0] !== originalStudents[0];

            if (isReversed) return '反向排序';
            if (isShuffled) return '隨機排序';
            return '原始排序';
        }
        return '自定義排序';
    }

    /**
     * 獲取座位順序描述
     * @param {Array} variantSeats 變體座位順序
     * @param {Array} originalSeats 原始座位順序
     * @returns {string} 描述
     */
    getSeatOrderDescription(variantSeats, originalSeats) {
        if (variantSeats.length === originalSeats.length) {
            const isReversed = variantSeats[0] === originalSeats[originalSeats.length - 1];
            const isShuffled = !isReversed && variantSeats[0] !== originalSeats[0];

            if (isReversed) return '反向排序';
            if (isShuffled) return '隨機排序';
            return '原始排序';
        }
        return '自定義排序';
    }

    /**
     * 並行搜索 - 使用多個起點同時進行搜索
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} studentScores 學生分數
     * @param {Map} groupBindings 群組綁定
     * @param {Map} studentToConditionsMap 學生到條件映射
     * @param {Object} options 配置選項
     * @returns {Promise<Object>} 並行搜索結果
     */
    async parallelSearch(students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options = {}) {
        const startTime = Date.now();
        this.logger.log('INFO', 'Engine', '開始並行搜索', {
            studentCount: students.length,
            seatCount: seats.length,
            options
        });

        const {
            maxWorkers = navigator.hardwareConcurrency || 4,
            timeout = 30000,
            enableProgressCallback = true,
            progressCallback = null
        } = options;

        try {
            // 0. 設置座位配置
            this.updateSeatsConfig(seats);

            // 1. 初始化多個起點
            const startPointsResult = this.initializeMultipleStarts(
                students, seats, conditions, studentScores, groupBindings, studentToConditionsMap, options
            );

            if (!startPointsResult.startPoints || startPointsResult.startPoints.length === 0) {
                throw new Error('無法生成有效的搜索起點');
            }

            // 2. 創建並行搜索任務
            const searchTasks = this.createParallelSearchTasks(
                startPointsResult.startPoints,
                maxWorkers,
                options
            );

            // 3. 執行並行搜索
            const searchResults = await this.executeParallelSearch(
                searchTasks,
                timeout,
                enableProgressCallback,
                progressCallback
            );

            // 4. 合併搜索結果
            const mergedResults = this.mergeParallelSearchResults(searchResults);

            // 5. 選擇最佳解決方案
            const bestSolution = this.selectBestParallelSolution(mergedResults);

            const totalTime = Date.now() - startTime;

            this.logger.log('INFO', 'Engine', '並行搜索完成', {
                totalStartPoints: startPointsResult.startPoints.length,
                completedTasks: searchResults.length,
                totalTime,
                bestSolutionScore: bestSolution.score
            });

            return {
                success: true,
                solution: bestSolution.assignment,
                score: bestSolution.score,
                metadata: {
                    totalStartPoints: startPointsResult.startPoints.length,
                    completedTasks: searchResults.length,
                    totalTime,
                    parallelEfficiency: this.calculateParallelEfficiency(searchResults, totalTime),
                    searchCoverage: this.calculateSearchCoverage(searchResults, startPointsResult.startPoints.length)
                },
                allResults: mergedResults,
                performanceMetrics: this.getPerformanceMetrics()
            };

        } catch (error) {
            this.logger.log('ERROR', 'Engine', '並行搜索失敗', { error: error.message });
            return {
                success: false,
                error: error.message,
                performanceMetrics: this.getPerformanceMetrics()
            };
        }
    }

    /**
     * 創建並行搜索任務
     * @param {Array} startPoints 搜索起點
     * @param {number} maxWorkers 最大Worker數量
     * @param {Object} options 配置選項
     * @returns {Array} 搜索任務列表
     */
    createParallelSearchTasks(startPoints, maxWorkers, options) {
        const tasks = [];
        const tasksPerWorker = Math.ceil(startPoints.length / maxWorkers);

        for (let i = 0; i < startPoints.length; i += tasksPerWorker) {
            const workerStartPoints = startPoints.slice(i, i + tasksPerWorker);
            const taskId = `task_${i / tasksPerWorker + 1}`;

            tasks.push({
                id: taskId,
                startPoints: workerStartPoints,
                options: {
                    ...options,
                    workerId: taskId,
                    enableCache: true,
                    enablePruning: true
                }
            });
        }

        this.logger.log('INFO', 'Engine', '創建並行搜索任務', {
            totalTasks: tasks.length,
            tasksPerWorker,
            maxWorkers
        });

        return tasks;
    }

    /**
     * 執行並行搜索
     * @param {Array} tasks 搜索任務
     * @param {number} timeout 超時時間
     * @param {boolean} enableProgressCallback 是否啟用進度回調
     * @param {Function} progressCallback 進度回調函數
     * @returns {Promise<Array>} 搜索結果
     */
    async executeParallelSearch(tasks, timeout, enableProgressCallback, progressCallback) {
        const results = [];
        const startTime = Date.now();
        let completedTasks = 0;

        // 創建進度追蹤器
        const progressTracker = {
            total: tasks.length,
            completed: 0,
            failed: 0,
            inProgress: 0
        };

        // 執行任務的函數
        const executeTask = async (task) => {
            try {
                progressTracker.inProgress++;
                if (enableProgressCallback && progressCallback) {
                    progressCallback({
                        type: 'task_started',
                        taskId: task.id,
                        progress: (completedTasks / tasks.length) * 100
                    });
                }

                const taskResult = await this.executeSingleSearchTask(task, timeout);

                progressTracker.completed++;
                progressTracker.inProgress--;
                completedTasks++;

                if (enableProgressCallback && progressCallback) {
                    progressCallback({
                        type: 'task_completed',
                        taskId: task.id,
                        progress: (completedTasks / tasks.length) * 100,
                        result: taskResult
                    });
                }

                return taskResult;

            } catch (error) {
                progressTracker.failed++;
                progressTracker.inProgress--;
                completedTasks++;

                this.logger.log('ERROR', 'Engine', `任務 ${task.id} 執行失敗`, { error: error.message });

                if (enableProgressCallback && progressCallback) {
                    progressCallback({
                        type: 'task_failed',
                        taskId: task.id,
                        progress: (completedTasks / tasks.length) * 100,
                        error: error.message
                    });
                }

                return {
                    success: false,
                    taskId: task.id,
                    error: error.message
                };
            }
        };

        // 並行執行所有任務
        const taskPromises = tasks.map(task => executeTask(task));
        const taskResults = await Promise.allSettled(taskPromises);

        // 處理結果
        taskResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                results.push(result.value);
            } else {
                results.push({
                    success: false,
                    taskId: tasks[index].id,
                    error: result.reason.message
                });
            }
        });

        const totalTime = Date.now() - startTime;

        this.logger.log('INFO', 'Engine', '並行搜索執行完成', {
            totalTasks: tasks.length,
            completed: progressTracker.completed,
            failed: progressTracker.failed,
            totalTime
        });

        return results;
    }

    /**
     * 執行單個搜索任務
     * @param {Object} task 搜索任務
     * @param {number} timeout 超時時間
     * @returns {Promise<Object>} 任務結果
     */
    async executeSingleSearchTask(task, timeout) {
        const taskStartTime = Date.now();
        const results = [];

        for (const startPoint of task.startPoints) {
            try {
                // 檢查超時
                if (Date.now() - taskStartTime > timeout) {
                    this.logger.log('WARN', 'Engine', `任務 ${task.id} 超時`, {
                        startPointId: startPoint.id,
                        elapsedTime: Date.now() - taskStartTime
                    });
                    break;
                }

                // 執行單個起點的搜索
                const searchResult = await this.executeSearchFromStartPoint(startPoint, task.options);

                if (searchResult.success) {
                    results.push(searchResult);
                }

            } catch (error) {
                this.logger.log('ERROR', 'Engine', `起點 ${startPoint.id} 搜索失敗`, { error: error.message });
            }
        }

        return {
            success: true,
            taskId: task.id,
            results: results,
            startPointsCount: task.startPoints.length,
            successfulSearches: results.length,
            executionTime: Date.now() - taskStartTime
        };
    }

    /**
     * 從起點執行搜索
     * @param {Object} startPoint 搜索起點
     * @param {Object} options 配置選項
     * @returns {Promise<Object>} 搜索結果
     */
    async executeSearchFromStartPoint(startPoint, options) {
        const searchStartTime = Date.now();

        try {
            // 根據起點策略選擇搜索方法
            let searchResult;
            switch (startPoint.strategy) {
                case 'heuristic':
                    searchResult = await this.heuristicSearch(
                        startPoint.students,
                        startPoint.seats,
                        startPoint.conditions,
                        startPoint.studentScores,
                        startPoint.groupBindings,
                        startPoint.studentToConditionsMap,
                        options
                    );
                    break;
                case 'depthFirst':
                    searchResult = await this.depthFirstSearch(
                        startPoint.students,
                        startPoint.seats,
                        startPoint.conditions,
                        startPoint.studentScores,
                        startPoint.groupBindings,
                        startPoint.studentToConditionsMap,
                        options
                    );
                    break;
                case 'breadthFirst':
                    searchResult = await this.breadthFirstSearch(
                        startPoint.students,
                        startPoint.seats,
                        startPoint.conditions,
                        startPoint.studentScores,
                        startPoint.groupBindings,
                        startPoint.studentToConditionsMap,
                        options
                    );
                    break;
                default:
                    searchResult = await this.hybridSearch(
                        startPoint.students,
                        startPoint.seats,
                        startPoint.conditions,
                        startPoint.studentScores,
                        startPoint.groupBindings,
                        startPoint.studentToConditionsMap,
                        options
                    );
            }

            return {
                success: true,
                startPointId: startPoint.id,
                strategy: startPoint.strategy,
                assignment: searchResult.solution || {},
                score: searchResult.score || 0,
                executionTime: Date.now() - searchStartTime,
                metadata: searchResult.metadata || {}
            };

        } catch (error) {
            return {
                success: false,
                startPointId: startPoint.id,
                strategy: startPoint.strategy,
                error: error.message,
                executionTime: Date.now() - searchStartTime
            };
        }
    }

    /**
     * 合併並行搜索結果
     * @param {Array} searchResults 搜索結果
     * @returns {Array} 合併後的結果
     */
    mergeParallelSearchResults(searchResults) {
        const mergedResults = [];
        const successfulTasks = searchResults.filter(result => result.success);

        for (const taskResult of successfulTasks) {
            if (taskResult.results && Array.isArray(taskResult.results)) {
                mergedResults.push(...taskResult.results);
            }
        }

        // 按分數排序
        mergedResults.sort((a, b) => (b.score || 0) - (a.score || 0));

        this.logger.log('INFO', 'Engine', '合併並行搜索結果', {
            totalResults: mergedResults.length,
            successfulTasks: successfulTasks.length,
            topScore: mergedResults.length > 0 ? mergedResults[0].score : 0
        });

        return mergedResults;
    }

    /**
     * 選擇最佳並行解決方案
     * @param {Array} mergedResults 合併後的結果
     * @returns {Object} 最佳解決方案
     */
    selectBestParallelSolution(mergedResults) {
        if (mergedResults.length === 0) {
            return {
                assignment: {},
                score: 0,
                startPointId: null,
                strategy: null
            };
        }

        // 選擇最高分數的解決方案
        const bestResult = mergedResults[0];

        this.logger.log('INFO', 'Engine', '選擇最佳並行解決方案', {
            selectedScore: bestResult.score,
            totalCandidates: mergedResults.length,
            selectedStrategy: bestResult.strategy,
            selectedStartPoint: bestResult.startPointId
        });

        return {
            assignment: bestResult.assignment,
            score: bestResult.score,
            startPointId: bestResult.startPointId,
            strategy: bestResult.strategy,
            executionTime: bestResult.executionTime,
            metadata: bestResult.metadata
        };
    }

    /**
     * 計算並行效率
     * @param {Array} searchResults 搜索結果
     * @param {number} totalTime 總執行時間
     * @returns {number} 並行效率
     */
    calculateParallelEfficiency(searchResults, totalTime) {
        const successfulTasks = searchResults.filter(result => result.success);
        if (successfulTasks.length === 0) return 0;

        const totalTaskTime = successfulTasks.reduce((sum, task) => sum + (task.executionTime || 0), 0);
        const parallelEfficiency = totalTaskTime / (totalTime * successfulTasks.length);

        return Math.min(parallelEfficiency, 1.0); // 效率不超過100%
    }

    /**
     * 計算搜索覆蓋率
     * @param {Array} searchResults 搜索結果
     * @param {number} totalStartPoints 總起點數量
     * @returns {number} 搜索覆蓋率
     */
    calculateSearchCoverage(searchResults, totalStartPoints) {
        const successfulTasks = searchResults.filter(result => result.success);
        const totalSuccessfulSearches = successfulTasks.reduce((sum, task) => sum + (task.successfulSearches || 0), 0);

        return totalStartPoints > 0 ? totalSuccessfulSearches / totalStartPoints : 0;
    }

    /**
     * 對稱性剪枝 - 檢測和移除對稱的搜索路徑
     * @param {Array} candidates 候選座位
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 當前分配
     * @returns {Array} 剪枝後的候選座位
     */
    pruneSymmetries(candidates, currentState, assignment) {
        // 參數驗證
        if (!Array.isArray(candidates)) {
            this.logger.log('WARN', 'Engine', '對稱性剪枝收到無效候選列表', {
                candidates: candidates,
                type: typeof candidates
            });
            return [];
        }

        if (!currentState || !assignment) {
            this.logger.log('WARN', 'Engine', '對稱性剪枝收到無效狀態或分配', {
                hasCurrentState: !!currentState,
                hasAssignment: !!assignment
            });
            return candidates;
        }

        this.logger.log('DEBUG', 'Engine', '開始對稱性剪枝', {
            candidateCount: candidates.length,
            assignmentSize: assignment.size
        });

        const startTime = Date.now();
        const prunedCandidates = [];
        const symmetryPatterns = new Set();
        const symmetryStats = {
            totalChecks: 0,
            prunedCandidates: 0,
            symmetryPatterns: 0,
            processingTime: 0
        };

        try {
            for (const candidate of candidates) {
                symmetryStats.totalChecks++;

                // 生成對稱性模式
                const symmetryPattern = this.generateSymmetryPattern(candidate, currentState, assignment);

                if (!symmetryPatterns.has(symmetryPattern)) {
                    symmetryPatterns.add(symmetryPattern);
                    prunedCandidates.push(candidate);
                } else {
                    symmetryStats.prunedCandidates++;
                    this.logger.log('DEBUG', 'Engine', '檢測到對稱候選', {
                        candidate: candidate.id,
                        pattern: symmetryPattern
                    });
                }
            }

            symmetryStats.symmetryPatterns = symmetryPatterns.size;
            symmetryStats.processingTime = Date.now() - startTime;

            this.logger.log('INFO', 'Engine', '對稱性剪枝完成', {
                originalCount: candidates.length,
                prunedCount: prunedCandidates.length,
                prunedRate: ((candidates.length - prunedCandidates.length) / candidates.length * 100).toFixed(2) + '%',
                processingTime: symmetryStats.processingTime,
                symmetryPatterns: symmetryStats.symmetryPatterns
            });

            return prunedCandidates;

        } catch (error) {
            this.logger.log('ERROR', 'Engine', '對稱性剪枝失敗', { error: error.message });
            return candidates; // 如果剪枝失敗，返回原始候選
        }
    }

    /**
     * 生成對稱性模式
     * @param {Object} candidate 候選座位
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 當前分配
     * @returns {string} 對稱性模式
     */
    generateSymmetryPattern(candidate, currentState, assignment) {
        const patterns = [];

        // 1. 位置對稱性模式
        const positionPattern = this.generatePositionSymmetryPattern(candidate, assignment);
        patterns.push(`pos:${positionPattern}`);

        // 2. 群組對稱性模式
        const groupPattern = this.generateGroupSymmetryPattern(candidate, currentState, assignment);
        patterns.push(`group:${groupPattern}`);

        // 3. 鄰接對稱性模式
        const adjacencyPattern = this.generateAdjacencySymmetryPattern(candidate, assignment);
        patterns.push(`adj:${adjacencyPattern}`);

        // 4. 條件對稱性模式
        const conditionPattern = this.generateConditionSymmetryPattern(candidate, currentState, assignment);
        patterns.push(`cond:${conditionPattern}`);

        return patterns.join('|');
    }

    /**
     * 生成位置對稱性模式
     * @param {Object} candidate 候選座位
     * @param {Map} assignment 當前分配
     * @returns {string} 位置對稱性模式
     */
    generatePositionSymmetryPattern(candidate, assignment) {
        const occupiedPositions = Array.from(assignment.values()).map(seat => `${seat.row},${seat.col}`);
        const candidatePosition = `${candidate.row},${candidate.col}`;

        // 計算相對位置模式
        const relativePositions = occupiedPositions.map(pos => {
            const [row, col] = pos.split(',').map(Number);
            const relativeRow = row - candidate.row;
            const relativeCol = col - candidate.col;
            return `${relativeRow},${relativeCol}`;
        });

        // 排序以確保一致性
        return relativePositions.sort().join(';');
    }

    /**
     * 生成群組對稱性模式
     * @param {Object} candidate 候選座位
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 當前分配
     * @returns {string} 群組對稱性模式
     */
    generateGroupSymmetryPattern(candidate, currentState, assignment) {
        const candidateGroup = candidate.groupId || candidate.group || 'default';

        // 統計各群組的分配情況
        const groupCounts = new Map();
        for (const seat of assignment.values()) {
            const group = seat.groupId || seat.group || 'default';
            groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
        }

        // 添加候選群組
        groupCounts.set(candidateGroup, (groupCounts.get(candidateGroup) || 0) + 1);

        // 生成群組模式
        const groupPattern = Array.from(groupCounts.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([group, count]) => `${group}:${count}`)
            .join(',');

        return groupPattern;
    }

    /**
     * 生成鄰接對稱性模式
     * @param {Object} candidate 候選座位
     * @param {Map} assignment 當前分配
     * @returns {string} 鄰接對稱性模式
     */
    generateAdjacencySymmetryPattern(candidate, assignment) {
        const adjacentSeats = this.getAdjacentSeats(candidate);
        const occupiedAdjacent = adjacentSeats.filter(seat =>
            Array.from(assignment.values()).some(assigned =>
                assigned.row === seat.row && assigned.col === seat.col
            )
        );

        // 生成鄰接模式
        const adjacencyPattern = occupiedAdjacent.map(seat => {
            const relativeRow = seat.row - candidate.row;
            const relativeCol = seat.col - candidate.col;
            return `${relativeRow},${relativeCol}`;
        }).sort().join(';');

        return adjacencyPattern;
    }

    /**
     * 生成條件對稱性模式
     * @param {Object} candidate 候選座位
     * @param {Object} currentState 當前狀態
     * @param {Map} assignment 當前分配
     * @returns {string} 條件對稱性模式
     */
    generateConditionSymmetryPattern(candidate, currentState, assignment) {
        const conditionPatterns = [];

        // 檢查當前學生是否滿足特定條件
        if (currentState.currentStudent) {
            const studentConditions = this.getStudentConditions(currentState.currentStudent);

            for (const condition of studentConditions) {
                const conditionSatisfied = this.checkConditionSatisfaction(candidate, condition, assignment);
                conditionPatterns.push(`${condition.type}:${conditionSatisfied ? '1' : '0'}`);
            }
        }

        return conditionPatterns.sort().join(',');
    }

    /**
     * 獲取相鄰座位
     * @param {Object} seat 座位
     * @returns {Array} 相鄰座位列表
     */
    getAdjacentSeats(seat) {
        const adjacent = [];
        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1], // 上下左右
            [-1, -1], [-1, 1], [1, -1], [1, 1] // 對角線
        ];

        for (const [dRow, dCol] of directions) {
            const adjacentSeat = {
                row: seat.row + dRow,
                col: seat.col + dCol,
                id: `adj_${seat.row + dRow}_${seat.col + dCol}`
            };
            adjacent.push(adjacentSeat);
        }

        return adjacent;
    }

    /**
     * 獲取學生條件
     * @param {Object} student 學生
     * @returns {Array} 學生條件列表
     */
    getStudentConditions(student) {
        // 這裡應該從條件映射中獲取學生的條件
        // 暫時返回空陣列，實際實現時需要從 studentToConditionsMap 中獲取
        return [];
    }

    /**
     * 檢查條件滿足情況
     * @param {Object} candidate 候選座位
     * @param {Object} condition 條件
     * @param {Map} assignment 當前分配
     * @returns {boolean} 是否滿足條件
     */
    checkConditionSatisfaction(candidate, condition, assignment) {
        // 這裡應該檢查候選座位是否滿足特定條件
        // 暫時返回 false，實際實現時需要根據條件類型進行檢查
        return false;
    }

    // ==================== 啟發式剪枝功能 ====================

    /**
     * 時間追蹤
     * @returns {Object} 時間信息
     */
    trackTime() {
        const currentTime = Date.now();
        const elapsedTime = this.performanceMetrics.startTime > 0 ?
            currentTime - this.performanceMetrics.startTime : 0;

        return {
            currentTime,
            startTime: this.performanceMetrics.startTime,
            elapsedTime,
            timeout: this.options.timeout,
            remainingTime: Math.max(0, this.options.timeout - elapsedTime),
            timeProgress: elapsedTime / this.options.timeout
        };
    }

    /**
     * 檢查時間限制
     * @returns {boolean} 是否超時
     */
    checkTimeLimit() {
        const timeInfo = this.trackTime();
        return timeInfo.elapsedTime >= this.options.timeout;
    }

    /**
     * 時間預估
     * @param {number} completedSteps 已完成步驟數
     * @param {number} totalSteps 總步驟數
     * @returns {Object} 時間預估結果
     */
    estimateTime(completedSteps, totalSteps) {
        const timeInfo = this.trackTime();
        const estimatedTotalTime = completedSteps > 0 ?
            (timeInfo.elapsedTime / completedSteps) * totalSteps : 0;
        const estimatedRemainingTime = Math.max(0, estimatedTotalTime - timeInfo.elapsedTime);

        return {
            estimatedTotalTime,
            estimatedRemainingTime,
            completionPercentage: completedSteps / totalSteps,
            willTimeout: estimatedTotalTime > this.options.timeout
        };
    }

    /**
     * 時間報告
     * @returns {Object} 時間報告
     */
    reportTime() {
        const timeInfo = this.trackTime();
        const timeEstimate = this.estimateTime(
            this.performanceMetrics.executionSteps,
            this.performanceMetrics.executionSteps * 2 // 粗略估計
        );

        return {
            ...timeInfo,
            ...timeEstimate,
            executionSteps: this.performanceMetrics.executionSteps,
            stepsPerSecond: timeInfo.elapsedTime > 0 ?
                this.performanceMetrics.executionSteps / (timeInfo.elapsedTime / 1000) : 0
        };
    }

    /**
     * 候選數量計算
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @returns {Object} 候選數量信息
     */
    calculateCandidateCount(students, seats, conditions) {
        let totalCandidates = 0;
        const candidateBreakdown = {
            byStudent: new Map(),
            bySeat: new Map(),
            totalValid: 0,
            totalInvalid: 0
        };

        for (const student of students) {
            let studentCandidates = 0;
            for (const seat of seats) {
                // 檢查座位是否已被佔用
                const isOccupied = Array.from(this.currentAssignment.values()).some(
                    assignedSeat => assignedSeat.row === seat.row && assignedSeat.col === seat.col
                );

                if (!isOccupied) {
                    // 檢查條件
                    const tempAssignment = new Map(this.currentAssignment);
                    tempAssignment.set(student.id, seat);

                    let isValid = true;
                    for (const condition of conditions) {
                        if (!this.conflictChecker.checkCondition(condition, tempAssignment)) {
                            isValid = false;
                            break;
                        }
                    }

                    if (isValid) {
                        studentCandidates++;
                        totalCandidates++;
                        candidateBreakdown.totalValid++;
                    } else {
                        candidateBreakdown.totalInvalid++;
                    }
                }
            }
            candidateBreakdown.byStudent.set(student.id, studentCandidates);
        }

        return {
            totalCandidates,
            averageCandidatesPerStudent: students.length > 0 ? totalCandidates / students.length : 0,
            breakdown: candidateBreakdown
        };
    }

    /**
     * 候選數量限制
     * @param {Array} candidates 候選列表
     * @param {number} maxCandidates 最大候選數量
     * @returns {Array} 限制後的候選列表
     */
    limitCandidateCount(candidates, maxCandidates = 10) {
        if (candidates.length <= maxCandidates) {
            return candidates;
        }

        // 按優先級排序並限制數量
        const sortedCandidates = candidates.sort((a, b) => {
            // 優先級排序：條件滿足度 > 學生分數 > 座位偏好
            const aScore = (a.conditionScore || 0) * 0.5 + (a.studentScore || 0) * 0.3 + (a.seatScore || 0) * 0.2;
            const bScore = (b.conditionScore || 0) * 0.5 + (b.studentScore || 0) * 0.3 + (b.seatScore || 0) * 0.2;
            return bScore - aScore;
        });

        return sortedCandidates.slice(0, maxCandidates);
    }

    /**
     * 候選選擇策略
     * @param {Array} students 學生列表
     * @param {Array} seats 座位列表
     * @param {Array} conditions 條件列表
     * @param {Object} options 選擇選項
     * @returns {Array} 選擇的候選列表
     */
    selectCandidates(students, seats, conditions, options = {}) {
        const {
            maxCandidates = 10,
            strategy = 'balanced', // 'balanced', 'aggressive', 'conservative'
            useHeuristics = true
        } = options;

        const allCandidates = [];

        for (const student of students) {
            for (const seat of seats) {
                // 檢查基本可用性
                const isOccupied = Array.from(this.currentAssignment.values()).some(
                    assignedSeat => assignedSeat.row === seat.row && assignedSeat.col === seat.col
                );

                if (isOccupied) continue;

                // 檢查條件
                const tempAssignment = new Map(this.currentAssignment);
                tempAssignment.set(student.id, seat);

                let conditionScore = 0;
                let isValid = true;

                for (const condition of conditions) {
                    if (this.conflictChecker.checkCondition(condition, tempAssignment)) {
                        conditionScore += 1;
                    } else {
                        isValid = false;
                        break;
                    }
                }

                if (isValid) {
                    const candidate = {
                        student,
                        seat,
                        conditionScore: conditionScore / conditions.length,
                        studentScore: this.studentScorer.getStudentScore(student.id) || 0,
                        seatScore: this.seatSelector.getSeatScore(seat) || 0
                    };

                    if (useHeuristics) {
                        candidate.heuristicScore = this.calculateHeuristicScore(candidate, conditions);
                    }

                    allCandidates.push(candidate);
                }
            }
        }

        // 根據策略調整選擇
        let selectedCandidates = allCandidates;

        switch (strategy) {
            case 'aggressive':
                selectedCandidates = allCandidates.sort((a, b) =>
                    (b.heuristicScore || 0) - (a.heuristicScore || 0)
                ).slice(0, Math.min(maxCandidates, allCandidates.length));
                break;
            case 'conservative':
                selectedCandidates = allCandidates.filter(c =>
                    c.conditionScore > 0.8 && c.studentScore > 0.7
                ).slice(0, maxCandidates);
                break;
            default: // balanced
                selectedCandidates = this.limitCandidateCount(allCandidates, maxCandidates);
        }

        return selectedCandidates;
    }

    /**
     * 候選評估
     * @param {Array} candidates 候選列表
     * @param {Array} conditions 條件列表
     * @returns {Array} 評估後的候選列表
     */
    evaluateCandidates(candidates, conditions) {
        return candidates.map(candidate => {
            const evaluation = {
                ...candidate,
                overallScore: 0,
                riskLevel: 'low',
                confidence: 0,
                details: {}
            };

            // 計算整體分數
            const weights = {
                condition: 0.4,
                student: 0.3,
                seat: 0.2,
                heuristic: 0.1
            };

            evaluation.overallScore =
                candidate.conditionScore * weights.condition +
                candidate.studentScore * weights.student +
                candidate.seatScore * weights.seat +
                (candidate.heuristicScore || 0) * weights.heuristic;

            // 評估風險等級
            if (evaluation.overallScore < 0.3) {
                evaluation.riskLevel = 'high';
            } else if (evaluation.overallScore < 0.6) {
                evaluation.riskLevel = 'medium';
            }

            // 計算置信度
            evaluation.confidence = Math.min(1, evaluation.overallScore * 1.2);

            // 詳細評估
            evaluation.details = {
                conditionCompliance: candidate.conditionScore,
                studentPriority: candidate.studentScore,
                seatQuality: candidate.seatScore,
                heuristicValue: candidate.heuristicScore || 0
            };

            return evaluation;
        }).sort((a, b) => b.overallScore - a.overallScore);
    }

    /**
     * 計算啟發式分數
     * @param {Object} candidate 候選
     * @param {Array} conditions 條件列表
     * @returns {number} 啟發式分數
     */
    calculateHeuristicScore(candidate, conditions) {
        let score = 0;

        // 基於條件滿足度的啟發式
        score += candidate.conditionScore * 0.4;

        // 基於學生優先級的啟發式
        score += candidate.studentScore * 0.3;

        // 基於座位質量的啟發式
        score += candidate.seatScore * 0.2;

        // 基於當前狀態的啟發式
        const currentStateScore = this.evaluateCurrentState(candidate, conditions);
        score += currentStateScore * 0.1;

        return score;
    }

    /**
     * 評估當前狀態
     * @param {Object} candidate 候選
     * @param {Array} conditions 條件列表
     * @returns {number} 狀態分數
     */
    evaluateCurrentState(candidate, conditions) {
        const tempAssignment = new Map(this.currentAssignment);
        tempAssignment.set(candidate.student.id, candidate.seat);

        // 計算條件滿足率
        let satisfiedConditions = 0;
        for (const condition of conditions) {
            if (this.conflictChecker.checkCondition(condition, tempAssignment)) {
                satisfiedConditions++;
            }
        }

        return satisfiedConditions / conditions.length;
    }

    /**
     * 深度調整
     * @param {number} newDepth 新深度限制
     */
    adjustDepthLimit(newDepth) {
        this.maxDepth = Math.max(1, newDepth);
        this.logger.log('INFO', 'Engine', `調整深度限制為 ${this.maxDepth}`);
    }

    /**
     * 深度報告
     * @returns {Object} 深度報告
     */
    reportDepth() {
        const depthInfo = this.trackDepth();
        return {
            ...depthInfo,
            depthEfficiency: depthInfo.currentDepth / Math.max(this.performanceMetrics.executionSteps, 1),
            depthUtilization: depthInfo.currentDepth / Math.max(depthInfo.maxDepth, 1),
            recommendations: this.generateDepthRecommendations(depthInfo)
        };
    }

    /**
     * 生成深度建議
     * @param {Object} depthInfo 深度信息
     * @returns {Array} 建議列表
     */
    generateDepthRecommendations(depthInfo) {
        const recommendations = [];

        if (depthInfo.depthUtilization < 0.3) {
            recommendations.push('考慮減少深度限制以提高效率');
        } else if (depthInfo.depthUtilization > 0.9) {
            recommendations.push('考慮增加深度限制以獲得更好的解');
        }

        if (depthInfo.depthEfficiency < 0.1) {
            recommendations.push('深度搜索效率較低，考慮調整搜索策略');
        }

        return recommendations;
    }

    /**
     * 終止條件檢查
     * @returns {Object} 終止檢查結果
     */
    checkTerminationConditions() {
        const timeCheck = this.checkTimeLimit();
        const depthCheck = this.checkDepthLimit();
        const stepCheck = this.performanceMetrics.executionSteps > 1000000;

        return {
            shouldTerminate: timeCheck || depthCheck || stepCheck,
            reasons: {
                timeout: timeCheck,
                depthLimit: depthCheck,
                stepLimit: stepCheck
            },
            details: {
                timeInfo: this.trackTime(),
                depthInfo: this.trackDepth(),
                stepCount: this.performanceMetrics.executionSteps
            }
        };
    }

    /**
     * 早期終止觸發
     * @param {string} reason 終止原因
     * @param {Object} details 終止詳情
     */
    triggerEarlyTermination(reason, details = {}) {
        this.logger.log('WARN', 'Engine', `觸發早期終止: ${reason}`, details);

        this.recordTerminationReason(reason, details);

        // 更新性能指標
        this.performanceMetrics.endTime = Date.now();
        this.performanceMetrics.earlyTermination = {
            reason,
            details,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * 終止原因記錄
     * @param {string} reason 終止原因
     * @param {Object} details 終止詳情
     */
    recordTerminationReason(reason, details = {}) {
        if (!this.terminationHistory) {
            this.terminationHistory = [];
        }

        this.terminationHistory.push({
            timestamp: new Date().toISOString(),
            reason,
            details,
            executionSteps: this.performanceMetrics.executionSteps,
            currentDepth: this.currentDepth || 0
        });
    }

    /**
     * 終止統計
     * @returns {Object} 終止統計
     */
    terminationStatistics() {
        if (!this.terminationHistory) {
            return {
                totalTerminations: 0,
                terminationReasons: {},
                averageSteps: 0,
                averageDepth: 0
            };
        }

        const stats = {
            totalTerminations: this.terminationHistory.length,
            terminationReasons: {},
            averageSteps: 0,
            averageDepth: 0
        };

        let totalSteps = 0;
        let totalDepth = 0;

        for (const termination of this.terminationHistory) {
            stats.terminationReasons[termination.reason] =
                (stats.terminationReasons[termination.reason] || 0) + 1;
            totalSteps += termination.executionSteps;
            totalDepth += termination.currentDepth;
        }

        if (stats.totalTerminations > 0) {
            stats.averageSteps = totalSteps / stats.totalTerminations;
            stats.averageDepth = totalDepth / stats.totalTerminations;
        }

        return stats;
    }

    /**
     * 清理資源
     */
    dispose() {
        this.cache.clear();
        this.currentAssignment.clear();
        this.assignmentHistory = [];
        this.performanceMetrics = {
            startTime: 0,
            endTime: 0,
            memoryUsage: [],
            executionSteps: 0
        };

        // 清理剪枝緩存
        this.invalidPathsCache.clear();
        this.invalidPathPatterns.clear();
        this.pruningStats = {
            totalChecks: 0,
            prunedPaths: 0,
            cacheHits: 0
        };

        // 清理重複狀態剪枝緩存
        this.duplicateStatesCache.clear();
        this.stateHistory = [];
        this.duplicatePruningStats = {
            totalChecks: 0,
            prunedDuplicates: 0,
            cacheHits: 0,
            stateComparisons: 0
        };

        // 清理終止歷史
        this.terminationHistory = [];
    }
}

module.exports = { SeatAssignmentEngine };
