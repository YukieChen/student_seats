// algorithms.js - 核心演算法和約束檢查函數 (v2.0 - 修復版本)

import { appState } from './state.js';
import { renderScreen } from './ui.js';
import { areSeatsAdjacentHorizontal, areSeatsAdjacentAllDirections, getNeighboringValidSeats } from './utils.js';

/**
 * Fisher-Yates (Knuth) 洗牌演算法
 * @param {Array} array 要洗牌的陣列
 */
function shuffleArray(array) {
	const newArray = [...array]; // 創建一個新陣列，不修改原始陣列
	for (let i = newArray.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[newArray[i], newArray[j]] = [newArray[j], newArray[i]]; // 交換元素
	}
	return newArray; // 返回打亂順序的新陣列
}

/**
 * 判斷是否為特殊座位群組
 * @param {string} groupName 群組名稱
 * @returns {boolean} 是否為特殊座位群組
 */
function isSpecialSeatGroup(groupName) {
	// 檢查該群組的座位數量是否較少（假設特殊座位數量少於普通座位）
	const seatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === groupName);
	const totalValidSeats = appState.seats.flat().filter(seat => seat.isValid).length;
	
	// 如果該群組的座位數量少於總座位數的30%，則認為是特殊座位群組
	const isSpecial = seatsInGroup.length < totalValidSeats * 0.3;
	console.log(`[DEBUG] 群組 ${groupName}: ${seatsInGroup.length} 個座位，總座位數 ${totalValidSeats}，是否為特殊座位群組: ${isSpecial}`);
	return isSpecial;
}

/**
 * 判斷是否為特殊座位
 * @param {Object} seat 座位物件
 * @returns {boolean} 是否為特殊座位
 */
function isSpecialSeat(seat) {
	return isSpecialSeatGroup(seat.groupId);
}

/**
 * 根據學生需求動態排序座位
 * @param {string} studentId 學生ID
 * @param {Array} availableSeats 可用座位列表
 * @param {Map} studentToConditionsMap 學生到條件的映射
 * @returns {Array} 排序後的座位列表
 */
function getSortedSeatsForStudent(studentId, availableSeats, studentToConditionsMap) {
	const studentConditions = studentToConditionsMap.get(studentId) || [];
	
	// 檢查學生是否有特殊座位要求
	const needsSpecialSeat = studentConditions.some(condition => 
		condition.type === 'assign_group' && isSpecialSeatGroup(condition.group)
	);
	
	// 根據學生需求排序座位
	return availableSeats.sort((a, b) => {
		const aIsSpecial = isSpecialSeat(a);
		const bIsSpecial = isSpecialSeat(b);
		
		if (needsSpecialSeat) {
			// 需要特殊座位的學生，特殊座位優先
			if (aIsSpecial && !bIsSpecial) return -1;
			if (!aIsSpecial && bIsSpecial) return 1;
		} else {
			// 普通學生，普通座位優先
			if (!aIsSpecial && bIsSpecial) return -1;
			if (aIsSpecial && !bIsSpecial) return 1;
		}
		
		// 其他條件相同時，保持隨機性
		return 0;
	});
}

/**
 * 檢查學生是否可以坐在指定座位
 * @param {string} studentId 學生ID
 * @param {Object} seat 座位物件
 * @param {Map} currentAssignment 當前分配狀態
 * @param {Map} studentToConditionsMap 學生到條件的映射
 * @returns {boolean} 是否可以坐在該座位
 */
function canStudentSitHere(studentId, seat, currentAssignment, studentToConditionsMap) {
	// 創建臨時分配狀態進行測試
	const tempAssignment = new Map(currentAssignment);
	tempAssignment.set(studentId, seat);
	
	// 檢查學生的所有條件
	const studentConditions = studentToConditionsMap.get(studentId) || [];
	console.log(`[DEBUG] 檢查學生 ${studentId} 是否可以坐在座位 (${seat.row}, ${seat.col})，群組: ${seat.groupId}`);
	console.log(`[DEBUG] 學生 ${studentId} 的條件數量: ${studentConditions.length}`);
	
	for (const condition of studentConditions) {
		const conditionMet = checkCondition(condition, tempAssignment);
		console.log(`[DEBUG] 條件 ${condition.type} - ${JSON.stringify(condition.students)}: ${conditionMet ? '滿足' : '不滿足'}`);
		if (!conditionMet) {
			console.log(`[DEBUG] 學生 ${studentId} 不能坐在座位 (${seat.row}, ${seat.col})，因為條件 ${condition.type} 不滿足`);
			return false;
		}
	}
	
	console.log(`[DEBUG] 學生 ${studentId} 可以坐在座位 (${seat.row}, ${seat.col})`);
	return true;
}

/**
 * 動態重新分配座位 - 嘗試踢出已分配的學生為當前學生騰出座位
 * @param {string} currentStudent 當前需要安排的學生
 * @param {Map} currentAssignment 當前分配狀態
 * @param {Array} availableSeats 可用座位列表
 * @param {Map} studentToConditionsMap 學生到條件的映射
 * @param {Map} studentScores 學生分數映射
 * @param {Set} unassignedStudentsResult 未安排學生集合
 * @param {Map} studentHasAssignGroupCondition 學生是否有指定群組條件
 * @param {number} startTime 開始時間
 * @param {number} TIMEOUT_MS 超時時間
 * @returns {boolean} 是否成功重新分配
 */
async function tryReassignSeats(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
	// 超時檢查
	if (Date.now() - startTime > TIMEOUT_MS) {
		return false;
	}
	
	const currentStudentScore = studentScores.get(currentStudent) || 0;
	console.log(`[DEBUG] 嘗試為學生 ${currentStudent} (分數: ${currentStudentScore}) 進行智能動態重新分配...`);
	
	// 策略1：直接踢出低分學生
	const directRemovalResult = await tryDirectRemoval(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS);
	if (directRemovalResult) {
		return true;
	}
	
	// 策略2：智能互換策略
	const swapResult = await trySmartSwap(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS);
	if (swapResult) {
		return true;
	}
	
	console.log(`[DEBUG] 所有動態重新分配策略都失敗，無法為學生 ${currentStudent} 找到合適的座位。`);
	return false;
}

/**
 * 策略1：直接踢出低分學生
 */
async function tryDirectRemoval(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
	const currentStudentScore = studentScores.get(currentStudent) || 0;
	
	// 找到所有已分配的學生，按分數排序（低分優先被踢出）
	const assignedStudents = Array.from(currentAssignment.keys());
	const candidatesForRemoval = assignedStudents
		.filter(student => {
			const studentScore = studentScores.get(student) || 0;
			return studentScore < currentStudentScore; // 只有分數更低的學生才可能被踢出
		})
		.sort((a, b) => {
			const scoreA = studentScores.get(a) || 0;
			const scoreB = studentScores.get(b) || 0;
			return scoreA - scoreB; // 分數低的優先被踢出
		});
	
	console.log(`[DEBUG] 直接踢出策略 - 可被踢出的候選學生:`, candidatesForRemoval.map(s => `學生 ${s} (分數: ${studentScores.get(s) || 0})`).join(', '));
	
	// 嘗試踢出每個候選學生
	for (const studentToRemove of candidatesForRemoval) {
		console.log(`[DEBUG] 嘗試直接踢出學生 ${studentToRemove} 為學生 ${currentStudent} 騰出座位...`);
		
		const removedSeat = currentAssignment.get(studentToRemove);
		
		// 暫時移除該學生
		currentAssignment.delete(studentToRemove);
		removedSeat.studentId = undefined;
		
		// 檢查當前學生是否可以坐在這個座位
		if (canStudentSitHere(currentStudent, removedSeat, currentAssignment, studentToConditionsMap)) {
			console.log(`[DEBUG] 學生 ${currentStudent} 可以坐在學生 ${studentToRemove} 的座位，開始重新分配...`);
			
			// 成功！為當前學生安排座位
			currentAssignment.set(currentStudent, removedSeat);
			removedSeat.studentId = currentStudent;
			
			// 遞迴嘗試為被踢出的學生重新安排座位
			const remainingStudents = [studentToRemove];
			if (await solveAssignment(remainingStudents, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
				console.log(`[DEBUG] 直接踢出策略成功！學生 ${currentStudent} 坐在學生 ${studentToRemove} 的原座位，學生 ${studentToRemove} 重新安排成功。`);
				return true;
			} else {
				console.log(`[DEBUG] 學生 ${studentToRemove} 重新安排失敗，恢復原狀...`);
				// 確保狀態完全恢復
				currentAssignment.delete(currentStudent);
				removedSeat.studentId = undefined;
			}
		}
		
		// 失敗，恢復原狀
		currentAssignment.set(studentToRemove, removedSeat);
		removedSeat.studentId = studentToRemove;
	}
	
	return false;
}

/**
 * 策略2：智能互換策略
 */
async function trySmartSwap(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
	console.log(`[DEBUG] 開始智能互換策略...`);
	
	// 獲取當前學生的條件
	const currentStudentConditions = studentToConditionsMap.get(currentStudent) || [];
	console.log(`[DEBUG] 學生 ${currentStudent} 的條件:`, currentStudentConditions.map(c => `${c.type} - ${JSON.stringify(c.students)}`));
	
	// 找到所有已分配的學生
	const assignedStudents = Array.from(currentAssignment.keys());
	
	// 策略2a：尋找可以互換的學生（放寬條件，允許更大分數差異）
	for (const candidateStudent of assignedStudents) {
		const candidateScore = studentScores.get(candidateStudent) || 0;
		const currentStudentScore = studentScores.get(currentStudent) || 0;
		
		// 放寬互換條件：允許分數差異在5分以內，或者當前學生分數更高
		if (candidateScore >= currentStudentScore - 5 || currentStudentScore > candidateScore) {
			console.log(`[DEBUG] 嘗試與學生 ${candidateStudent} (分數: ${candidateScore}) 進行互換，當前學生分數: ${currentStudentScore}...`);
			
			const candidateSeat = currentAssignment.get(candidateStudent);
			const currentStudentSeat = currentAssignment.get(currentStudent);
			
			// 檢查互換是否可行
			if (await canSwapStudents(currentStudent, candidateStudent, currentAssignment, studentToConditionsMap)) {
				console.log(`[DEBUG] 學生 ${currentStudent} 與學生 ${candidateStudent} 可以互換！`);
				
				// 執行互換
				const tempSeat = { ...candidateSeat };
				candidateSeat.studentId = currentStudent;
				currentAssignment.set(currentStudent, candidateSeat);
				
				if (currentStudentSeat) {
					currentStudentSeat.studentId = candidateStudent;
					currentAssignment.set(candidateStudent, currentStudentSeat);
					console.log(`[DEBUG] 成功互換：學生 ${currentStudent} 坐到 (${candidateSeat.row}, ${candidateSeat.col})，學生 ${candidateStudent} 坐到 (${currentStudentSeat.row}, ${currentStudentSeat.col})`);
					return true;
				} else {
					// 如果當前學生還沒有座位，則候選學生變成未分配
					currentAssignment.delete(candidateStudent);
					candidateSeat.studentId = undefined;
					
					// 嘗試為候選學生重新安排座位
					const remainingStudents = [candidateStudent];
					if (await solveAssignment(remainingStudents, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
						console.log(`[DEBUG] 智能互換策略成功！學生 ${currentStudent} 與學生 ${candidateStudent} 互換成功。`);
						return true;
					} else {
						// 恢復原狀
						currentAssignment.delete(currentStudent);
						candidateSeat.studentId = candidateStudent;
						currentAssignment.set(candidateStudent, candidateSeat);
					}
				}
			} else {
				console.log(`[DEBUG] 學生 ${currentStudent} 與學生 ${candidateStudent} 無法互換，條件檢查失敗`);
			}
		}
	}
	
	// 策略2b：連鎖調整策略
	const chainAdjustmentResult = await tryChainAdjustment(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS);
	if (chainAdjustmentResult) {
		return true;
	}
	
	// 策略2c：尋找可以讓出特殊座位的普通學生
	const currentStudentNeedsSpecialSeat = currentStudentConditions.some(condition => 
		condition.type === 'assign_group' && isSpecialSeatGroup(condition.group)
	);
	
	if (currentStudentNeedsSpecialSeat) {
		console.log(`[DEBUG] 學生 ${currentStudent} 需要特殊座位，尋找可以讓出特殊座位的普通學生...`);
		
		for (const candidateStudent of assignedStudents) {
			const candidateScore = studentScores.get(candidateStudent) || 0;
			const candidateSeat = currentAssignment.get(candidateStudent);
			
			// 檢查候選學生是否坐在特殊座位上
			if (isSpecialSeat(candidateSeat) && candidateScore < currentStudentScore) {
				console.log(`[DEBUG] 發現候選學生 ${candidateStudent} 坐在特殊座位上，分數較低，嘗試讓出...`);
				
				// 檢查候選學生是否可以坐在普通座位上
				const availableRegularSeats = availableSeats.filter(seat => 
					seat.studentId === undefined && !isSpecialSeat(seat)
				);
				
				for (const regularSeat of availableRegularSeats) {
					// 創建臨時分配狀態進行測試
					const tempAssignment = new Map(currentAssignment);
					tempAssignment.delete(candidateStudent);
					tempAssignment.set(candidateStudent, regularSeat);
					
					// 檢查候選學生是否可以坐在普通座位
					const candidateConditions = studentToConditionsMap.get(candidateStudent) || [];
					let canSitInRegularSeat = true;
					
					for (const condition of candidateConditions) {
						if (!checkCondition(condition, tempAssignment)) {
							canSitInRegularSeat = false;
							break;
						}
					}
					
					if (canSitInRegularSeat) {
						console.log(`[DEBUG] 候選學生 ${candidateStudent} 可以坐在普通座位 (${regularSeat.row}, ${regularSeat.col})`);
						
						// 執行調整
						candidateSeat.studentId = undefined;
						regularSeat.studentId = candidateStudent;
						currentAssignment.set(candidateStudent, regularSeat);
						
						// 檢查當前學生是否可以坐在特殊座位
						if (canStudentSitHere(currentStudent, candidateSeat, currentAssignment, studentToConditionsMap)) {
							currentAssignment.set(currentStudent, candidateSeat);
							candidateSeat.studentId = currentStudent;
							
							console.log(`[DEBUG] 智能調整策略成功！學生 ${candidateStudent} 讓出特殊座位，學生 ${currentStudent} 獲得特殊座位。`);
							return true;
						} else {
							// 恢復原狀
							regularSeat.studentId = undefined;
							candidateSeat.studentId = candidateStudent;
							currentAssignment.set(candidateStudent, candidateSeat);
						}
					}
				}
			}
		}
	}
	
	return false;
}

/**
 * 策略2b：連鎖調整策略
 * 如果A和B互換，B可能需要和C互換，形成連鎖反應
 */
async function tryChainAdjustment(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
	console.log(`[DEBUG] 嘗試連鎖調整策略...`);
	
	const assignedStudents = Array.from(currentAssignment.keys());
	const currentStudentScore = studentScores.get(currentStudent) || 0;
	
	// 尋找可能的連鎖調整路徑
	for (const studentA of assignedStudents) {
		const scoreA = studentScores.get(studentA) || 0;
		
		// 檢查是否可以與學生A互換
		if (scoreA >= currentStudentScore - 3) {
			const seatA = currentAssignment.get(studentA);
			
			// 創建臨時狀態測試互換
			const tempAssignment = new Map(currentAssignment);
			tempAssignment.set(currentStudent, seatA);
			tempAssignment.delete(studentA);
			
			// 檢查學生A是否可以坐在其他位置
			for (const studentB of assignedStudents) {
				if (studentB === studentA) continue;
				
				const seatB = currentAssignment.get(studentB);
				const scoreB = studentScores.get(studentB) || 0;
				
				// 檢查學生A是否可以坐在學生B的位置
				tempAssignment.set(studentA, seatB);
				tempAssignment.delete(studentB);
				
				let canChain = true;
				
				// 檢查所有學生的條件
				const conditionsA = studentToConditionsMap.get(studentA) || [];
				for (const condition of conditionsA) {
					if (!checkCondition(condition, tempAssignment)) {
						canChain = false;
						break;
					}
				}
				
				if (canChain) {
					const conditionsB = studentToConditionsMap.get(studentB) || [];
					for (const condition of conditionsB) {
						if (!checkCondition(condition, tempAssignment)) {
							canChain = false;
							break;
						}
					}
				}
				
				if (canChain) {
					console.log(`[DEBUG] 發現連鎖調整路徑：${currentStudent} -> ${studentA} -> ${studentB}`);
					
					// 執行連鎖調整
					seatA.studentId = currentStudent;
					currentAssignment.set(currentStudent, seatA);
					
					seatB.studentId = studentA;
					currentAssignment.set(studentA, seatB);
					
					// 嘗試為學生B重新安排座位
					const remainingStudents = [studentB];
					if (await solveAssignment(remainingStudents, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
						console.log(`[DEBUG] 連鎖調整策略成功！`);
						return true;
					} else {
						// 恢復原狀
						seatA.studentId = studentA;
						currentAssignment.set(studentA, seatA);
						currentAssignment.delete(currentStudent);
						
						seatB.studentId = studentB;
						currentAssignment.set(studentB, seatB);
						currentAssignment.delete(studentA);
					}
				}
				
				// 恢復臨時狀態
				tempAssignment.set(studentB, seatB);
				tempAssignment.delete(studentA);
			}
			
			// 恢復臨時狀態
			tempAssignment.set(studentA, seatA);
			tempAssignment.delete(currentStudent);
		}
	}
	
	return false;
}

/**
 * 檢查兩個學生是否可以互換座位
 */
async function canSwapStudents(studentA, studentB, currentAssignment, studentToConditionsMap) {
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
		if (!checkCondition(condition, tempAssignment)) {
			console.log(`[DEBUG] 學生 ${studentA} 互換後不滿足條件: ${condition.type}`);
			return false;
		}
	}
	
	// 檢查學生B的條件
	const conditionsB = studentToConditionsMap.get(studentB) || [];
	for (const condition of conditionsB) {
		if (!checkCondition(condition, tempAssignment)) {
			console.log(`[DEBUG] 學生 ${studentB} 互換後不滿足條件: ${condition.type}`);
			return false;
		}
	}
	
	return true;
}

// 核心演算法：開始安排座位
export async function startAssignment() {
	console.log("[DEBUG] ===== startAssignment 開始 (v2.1 - 強制更新版本) =====");
	console.log("[DEBUG] 代碼版本檢查: 這是強制更新版本 v2.1");
	console.log("[DEBUG] 時間戳:", new Date().toISOString());
	console.log("[DEBUG] appState 狀態檢查:");
	console.log("[DEBUG] - studentIds:", appState.studentIds);
	console.log("[DEBUG] - studentIds.length:", appState.studentIds.length);
	console.log("[DEBUG] - seats 尺寸:", appState.seats.length, "x", appState.seats[0]?.length);
	console.log("[DEBUG] - 有效座位數:", appState.seats.flat().filter(seat => seat.isValid).length);
	console.log("[DEBUG] - conditions 數量:", appState.conditions.length);
	
	// 檢查座位群組狀態
	const seatGroups = {};
	appState.seats.flat().forEach(seat => {
		if (seat.isValid) {
			const groupId = seat.groupId || 'undefined';
			seatGroups[groupId] = (seatGroups[groupId] || 0) + 1;
		}
	});
	console.log("[DEBUG] - 座位群組分布:", seatGroups);
	
	// 1. 執行初始條件衝突檢查
	const conflicts = checkInitialConditionsForConflicts();
	if (conflicts.length > 0) {
		alert('檢測到以下條件衝突，請修正後再嘗試安排：\n' + conflicts.join('\n'));
		// 清空座位分配和未安排學生列表，並渲染回 UI
		appState.seats.forEach(row => row.forEach(seat => seat.studentId = undefined));
		const unassignedListElement = document.getElementById('unassigned-students-list');
		if (unassignedListElement) {
			unassignedListElement.innerHTML = ''; // 清空未安排學生列表
		}
		renderScreen('assignment'); // 重新渲染安排結果畫面
		return; // 停止安排流程
	}

	// 清空之前的學生分配
	appState.seats.forEach(row => row.forEach(seat => seat.studentId = undefined));

	// 準備數據
	let allStudents = [...appState.studentIds]; // 使用 appState 中設定的學生座號列表
	let availableValidSeats = appState.seats.flat().filter(seat => seat.isValid);

	// 改進的學生排序：考慮條件類型和複雜度
	const studentScores = new Map();
	allStudents.forEach(s => studentScores.set(s, 0));
	
	// 條件類型權重
	const CONDITION_WEIGHTS = {
		'assign_group': 10,
		'assign_student_group_to_seat_group': 10, // 新增：學生群組指定區域權重
		'group_area': 8,
		'adjacent_and_group': 6,
		'adjacent': 3,
		'not_adjacent': 2
	};
	
	// 調試：檢查條件數據
	console.log("[DEBUG] appState.conditions 內容:", appState.conditions);
	console.log("[DEBUG] 條件數量:", appState.conditions.length);
	console.log("[DEBUG] 條件詳細信息:");
	appState.conditions.forEach((condition, index) => {
		console.log(`[DEBUG] 條件 ${index}:`, {
			id: condition.id,
			type: condition.type,
			students: condition.students,
			group: condition.group,
			studentGroupName: condition.studentGroupName
		});
	});
	
	// 調試：檢查座位群組
	console.log("[DEBUG] 座位群組檢查:");
	appState.seats.forEach((row, rowIndex) => {
		row.forEach((seat, colIndex) => {
			if (seat.isValid) {
				console.log(`[DEBUG] 座位 (${rowIndex}, ${colIndex}): groupId = ${seat.groupId}`);
			}
		});
	});
	
	// 計算每個學生的分數
	console.log("[DEBUG] 開始計算學生分數...");
	console.log("[DEBUG] studentScores 初始狀態:", Array.from(studentScores.entries()));
	
	appState.conditions.forEach((condition, index) => {
		console.log(`[DEBUG] 處理條件 ${index}:`, condition);
		console.log(`[DEBUG] 條件類型: ${condition.type}, 權重: ${CONDITION_WEIGHTS[condition.type] || 1}`);
		console.log(`[DEBUG] 條件學生:`, condition.students);
		
		let studentsInCondition = [];
		
		// 處理 assign_student_group_to_seat_group 條件
		if (condition.type === 'assign_student_group_to_seat_group') {
			const studentGroupName = condition.studentGroupName;
			studentsInCondition = appState.studentGroups[studentGroupName] || [];
			console.log(`[DEBUG] assign_student_group_to_seat_group 條件: 從學生群組 "${studentGroupName}" 獲取學生:`, studentsInCondition);
		} else {
			// 處理其他條件類型
			studentsInCondition = condition.students.flat();
		}
		
		console.log(`[DEBUG] 扁平化後的學生列表:`, studentsInCondition);
		
		const weight = CONDITION_WEIGHTS[condition.type] || 1;
		console.log(`[DEBUG] 使用權重: ${weight}`);
		
		studentsInCondition.forEach(studentId => {
			console.log(`[DEBUG] 處理學生 ${studentId}, 類型: ${typeof studentId}`);
			console.log(`[DEBUG] studentScores.has(${studentId}): ${studentScores.has(studentId)}`);
			console.log(`[DEBUG] studentScores.has("${studentId}"): ${studentScores.has(String(studentId))}`);
			
			// 嘗試多種ID格式，確保類型一致性
			let actualStudentId = null;
			const possibleIds = [
				studentId,
				String(studentId),
				Number(studentId),
				parseInt(studentId),
				studentId.toString()
			];
			
			// 找到匹配的ID
			for (const id of possibleIds) {
				if (studentScores.has(id)) {
					actualStudentId = id;
					break;
				}
			}
			
			if (actualStudentId !== null) {
				let score = studentScores.get(actualStudentId);
				console.log(`[DEBUG] 學生 ${actualStudentId} 原始分數: ${score}`);
				
				score += weight;
				console.log(`[DEBUG] 加上權重 ${weight} 後分數: ${score}`);
				
				// 特殊座位需求額外分數
				if ((condition.type === 'assign_group' || condition.type === 'assign_student_group_to_seat_group') && condition.group && isSpecialSeatGroup(condition.group)) {
					score += 5; // 額外分數
					console.log(`[DEBUG] 特殊座位額外分數 +5, 新分數: ${score}`);
				}
				
				// 條件複雜度分數（參與學生數量）
				const studentCount = studentsInCondition.length;
				const complexityBonus = Math.min(studentCount * 0.5, 3);
				score += complexityBonus; // 最多加3分
				console.log(`[DEBUG] 條件複雜度分數 +${complexityBonus}, 新分數: ${score}`);
				
				studentScores.set(actualStudentId, score);
				console.log(`[DEBUG] 學生 ${actualStudentId} 最終分數: ${score}`);
			} else {
				console.log(`[DEBUG] 警告：學生 ${studentId} 不在 studentScores 中，嘗試的ID格式:`, possibleIds);
				console.log(`[DEBUG] studentScores 中的所有學生ID:`, Array.from(studentScores.keys()));
			}
		});
	});

	// 處理 groupSeatAssignments 綁定：為第一張圖片中的學生群組綁定計算分數
	console.log("[DEBUG] 處理 groupSeatAssignments 綁定分數計算...");
	for (const seatGroupId in appState.groupSeatAssignments) {
		const studentGroupName = appState.groupSeatAssignments[seatGroupId];
		const studentsInStudentGroup = appState.studentGroups[studentGroupName] || [];
		
		console.log(`[DEBUG] groupSeatAssignments 綁定: 學生群組 "${studentGroupName}" 綁定到座位群組 "${seatGroupId}"，學生:`, studentsInStudentGroup);
		
		// 使用與 assign_student_group_to_seat_group 相同的權重
		const weight = CONDITION_WEIGHTS['assign_student_group_to_seat_group'] || 10;
		
		studentsInStudentGroup.forEach(studentId => {
			console.log(`[DEBUG] 處理 groupSeatAssignments 學生 ${studentId}, 類型: ${typeof studentId}`);
			
			// 嘗試多種ID格式，確保類型一致性
			let actualStudentId = null;
			const possibleIds = [
				studentId,
				String(studentId),
				Number(studentId),
				parseInt(studentId),
				studentId.toString()
			];
			
			// 找到匹配的ID
			for (const id of possibleIds) {
				if (studentScores.has(id)) {
					actualStudentId = id;
					break;
				}
			}
			
			if (actualStudentId !== null) {
				let score = studentScores.get(actualStudentId);
				console.log(`[DEBUG] groupSeatAssignments 學生 ${actualStudentId} 原始分數: ${score}`);
				
				score += weight;
				console.log(`[DEBUG] groupSeatAssignments 加上權重 ${weight} 後分數: ${score}`);
				
				// 特殊座位需求額外分數
				if (isSpecialSeatGroup(seatGroupId)) {
					score += 5; // 額外分數
					console.log(`[DEBUG] groupSeatAssignments 特殊座位額外分數 +5, 新分數: ${score}`);
				}
				
				// 條件複雜度分數（參與學生數量）
				const studentCount = studentsInStudentGroup.length;
				const complexityBonus = Math.min(studentCount * 0.5, 3);
				score += complexityBonus; // 最多加3分
				console.log(`[DEBUG] groupSeatAssignments 條件複雜度分數 +${complexityBonus}, 新分數: ${score}`);
				
				studentScores.set(actualStudentId, score);
				console.log(`[DEBUG] groupSeatAssignments 學生 ${actualStudentId} 最終分數: ${score}`);
			} else {
				console.log(`[DEBUG] 警告：groupSeatAssignments 學生 ${studentId} 不在 studentScores 中，嘗試的ID格式:`, possibleIds);
			}
		});
	}
	
	console.log("[DEBUG] 學生分數計算完成，最終結果:", Array.from(studentScores.entries()));
	
	// 學生排序邏輯：先隨機打亂，然後根據改進的分數進行穩定排序
	allStudents = shuffleArray(allStudents); // 首先隨機打亂學生順序
	allStudents.sort((a, b) => {
		const scoreA = studentScores.get(a) || 0;
		const scoreB = studentScores.get(b) || 0;
		// 分數高的學生優先。如果分數相同，則保持他們在隨機打亂後的相對順序（穩定排序）。
		return scoreB - scoreA;
	});
	console.log("[DEBUG] 學生按改進分數排序後 (分數高的優先):", allStudents.map(s => `學生 ${s} (分數: ${studentScores.get(s) || 0})`).join(', '));
	
	// 檢查身高較高學生的分數
	const tallStudents = [1, 3, 4, 5, 6, 7, 9, 10, 11, 12];
	console.log("[DEBUG] 身高較高學生的分數:");
	tallStudents.forEach(studentId => {
		const score = studentScores.get(studentId.toString()) || 0;
		console.log(`[DEBUG] 學生 ${studentId}: ${score}`);
	});

	// 建立學生到相關條件的映射
	const studentToConditionsMap = new Map();
	allStudents.forEach(s => studentToConditionsMap.set(s, []));
	
	// 處理一般條件
	appState.conditions.forEach(condition => {
		condition.students.flat().forEach(s => {
			if (studentToConditionsMap.has(s)) {
				studentToConditionsMap.get(s).push(condition);
			}
		});
	});
	
	// 處理 groupSeatAssignments 綁定：為第一張圖片中的學生群組綁定創建虛擬條件
	for (const seatGroupId in appState.groupSeatAssignments) {
		const studentGroupName = appState.groupSeatAssignments[seatGroupId];
		const studentsInStudentGroup = appState.studentGroups[studentGroupName] || [];
		
		// 為每個學生創建一個虛擬的 assign_group 條件
		studentsInStudentGroup.forEach(studentId => {
			const virtualCondition = {
				type: 'assign_group',
				group: seatGroupId,
				students: [[studentId]], // 使用與 assign_group 相同的格式
				id: `virtual_${seatGroupId}_${studentId}`,
				studentGroupName: studentGroupName
			};
			
			// 嘗試多種ID格式
			const possibleIds = [studentId, String(studentId), Number(studentId)];
			for (const id of possibleIds) {
				if (studentToConditionsMap.has(id)) {
					studentToConditionsMap.get(id).push(virtualCondition);
					console.log(`[DEBUG] 為學生 ${id} 添加虛擬條件: assign_group 到群組 ${seatGroupId}`);
					break;
				}
			}
		});
	}
	
	// 檢查身高較高學生的條件
	console.log("[DEBUG] 身高較高學生的條件:");
	tallStudents.forEach(studentId => {
		const studentIdStr = studentId.toString();
		const conditions = studentToConditionsMap.get(studentIdStr) || [];
		console.log(`[DEBUG] 學生 ${studentId} 的條件:`, conditions.map(c => `${c.type} - ${JSON.stringify(c.students)}`).join(', '));
	});

	let assignedStudentsMap = new Map(); // { studentId: {row, col} }
	let unassignedStudents = new Set(); // 最終無法安排的學生 (使用 Set 避免重複)

	// 建立學生到是否有指定座條件的映射
	const studentHasAssignGroupCondition = new Map();
	allStudents.forEach(s => studentHasAssignGroupCondition.set(s, false));
	appState.conditions.forEach(condition => {
		if (condition.type === 'assign_group') {
			condition.students.flat().forEach(s => {
				if (studentHasAssignGroupCondition.has(s[0])) { // assign_group 條件的 students 是一個包含單個學生 ID 的陣列
					studentHasAssignGroupCondition.set(s[0], true);
				}
			});
		}
	});

	// 調用回溯演算法
	const startTime = Date.now();
	const TIMEOUT_MS = 30000; // 30 秒超時
	console.log(`[DEBUG] 開始座位安排演算法，超時設定為 ${TIMEOUT_MS / 1000} 秒。`);
	const success = await solveAssignment(
		allStudents,
		assignedStudentsMap,
		availableValidSeats,
		unassignedStudents,
		studentToConditionsMap,
		studentHasAssignGroupCondition,
		studentScores, // 新增：傳遞學生分數
		startTime,
		TIMEOUT_MS
	);

	// 更新 UI 顯示結果
	if (unassignedStudents.size === 0) {
		alert('座位安排完成！所有學生都已成功安排。');
	} else {
		if (Date.now() - startTime >= TIMEOUT_MS) {
			alert(`座位安排超時！有 ${unassignedStudents.size} 位學生無法安排，請查看未安排學生清單。`);
		} else {
			alert(`座位安排完成！有 ${unassignedStudents.size} 位學生無法安排，請查看未安排學生清單。`);
		}
	}

	// 將 assignedStudentsMap 的結果更新回 appState.seats 陣列
	appState.seats.forEach(row => row.forEach(seat => {
		seat.studentId = undefined; // 先清空
	}));
	assignedStudentsMap.forEach((seat, studentId) => {
		appState.seats[seat.row][seat.col].studentId = studentId;
	});

	// 如果成功安排所有學生，則儲存當前分配結果到 lastAssignedSeats
	if (unassignedStudents.size === 0) {
		appState.lastAssignedSeats = {}; // 清空之前的記錄
		assignedStudentsMap.forEach((seat, studentId) => {
			appState.lastAssignedSeats[studentId] = { row: seat.row, col: seat.col };
		});
		console.log("[DEBUG] 成功安排所有學生，已儲存當前分配結果到 appState.lastAssignedSeats:", appState.lastAssignedSeats);
	}

	console.log(`[DEBUG] startAssignment 結束時的 unassignedStudents:`, unassignedStudents);
	// 將未安排學生列表更新到 appState
	console.log("[DEBUG] startAssignment 結束時的 unassignedStudents:", Array.from(unassignedStudents));
	appState.unassignedStudents = Array.from(unassignedStudents);
	console.log("[DEBUG] Final unassigned students (after assignment to appState):", appState.unassignedStudents);
	console.log("[DEBUG] ===== startAssignment 結束 =====");

	// 通用狀態驗證：檢查是否有學生被錯誤地標記為未安排
	validateAndFixAssignmentState(assignedStudentsMap, availableValidSeats, unassignedStudents, studentToConditionsMap);

	// 更新未安排學生清單
	const unassignedListElement = document.getElementById('unassigned-students-list');
	if (unassignedListElement) {
		unassignedListElement.innerHTML = appState.unassignedStudents.sort((a, b) => a - b).map(s => `<li>${s}</li>`).join('');
	}

	renderScreen('assignment'); // 重新渲染安排結果畫面
}

// 回溯演算法核心
async function solveAssignment(studentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS) {
	// 超時檢查
	if (Date.now() - startTime > TIMEOUT_MS) {
		console.warn(`[DEBUG] 超時觸發！停止搜尋。將剩餘學生添加到未安排列表。`);
		// 將所有剩餘學生添加到未安排列表
		studentsToAssign.forEach(s => {
			unassignedStudentsResult.add(s); // 使用 add
		});
		return false; // 超時，停止搜尋
	}

	// 基本情況：所有學生都已嘗試分配
	if (studentsToAssign.length === 0) {
		return true; // 所有學生都已成功分配
	}

	// 學生排序啟發式：
	// 1. 優先處理有指定座位群組的學生
	// 2. 其次處理有相鄰條件且其相鄰學生已放置的學生
	// 3. 在同等分數下，保持隨機性

	// 學生排序已在 startAssignment 中處理，這裡不再需要額外排序或洗牌
	// 選擇排序後的第一個學生

	const currentStudent = studentsToAssign[0]; // 選擇排序後的第一個學生
	console.log(`[DEBUG] 嘗試為學生 ${currentStudent} (剩餘學生數: ${studentsToAssign.length}) 尋找座位...`);

	// 座位排序啟發式：
	// 1. 優先考慮與學生綁定群組相符的座位
	// 2. 其次考慮能滿足最多條件的座位
	// 3. 在同等分數下，保持隨機性
	// 4. 對於有 assign_group 條件的學生，將上次座位後移

	// 1. 獲取所有未被佔用的座位
	let allUnoccupiedSeats = availableSeats.filter(seat => seat.studentId === undefined);

	const studentGroupForCurrentStudent = Object.values(appState.groupSeatAssignments).find(sgName => appState.studentGroups[sgName] && appState.studentGroups[sgName].includes(currentStudent));
	const boundSeatGroup = studentGroupForCurrentStudent ? Object.keys(appState.groupSeatAssignments).find(seatGroupId => appState.groupSeatAssignments[seatGroupId] === studentGroupForCurrentStudent) : undefined;

	// 2. 過濾出滿足所有硬性條件的座位 (包括 assign_group 和 adjacent_and_group 的群組部分)
	let trulyValidCandidateSeats = [];
	for (const seat of allUnoccupiedSeats) {
		const tempAssignment = new Map(currentAssignment);
		tempAssignment.set(currentStudent, seat);

		let allConditionsMetForSeat = true;
		const relevantConditions = studentToConditionsMap.get(currentStudent) || [];
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
				// 相鄰部分會在 checkCondition 中處理，這裡不重複檢查
			}
			// 對於其他條件，或 adjacent_and_group 的相鄰部分，使用 checkCondition 檢查
			else if (!checkCondition(condition, tempAssignment)) {
				allConditionsMetForSeat = false;
				break;
			}
		}

		// 額外檢查學生群組與座位群組的綁定 (如果學生有綁定，且座位不屬於該綁定群組，則無效)
		if (boundSeatGroup && seat.groupId !== boundSeatGroup) {
			allConditionsMetForSeat = false;
		}

		if (allConditionsMetForSeat) {
			trulyValidCandidateSeats.push(seat);
		}
	}

	// 3. 改進座位排序：先隨機打亂，再根據學生需求動態排序（保持同類座位間的隨機性）
	let candidateSeats = shuffleArray(trulyValidCandidateSeats); // 先隨機打亂
	candidateSeats = getSortedSeatsForStudent(currentStudent, candidateSeats, studentToConditionsMap); // 再根據需求排序
	console.log(`[DEBUG] 學生 ${currentStudent} 的打亂後有效座位列表:`, candidateSeats.map(seat => `(R${seat.row}C${seat.col}, Group:${seat.groupId})`).join(', '));

	// 4. 移除 lastAssignedSeats 的優先級排序邏輯，直接按照打亂後的順序嘗試分配座位。
	// 這裡不再需要啟發式評分，因為目標是每次結果都非常不同，且學生層面已引入優先級。
	const scoredAvailableSeats = candidateSeats.map(seat => ({ seat, score: 0 })); // 賦予所有座位相同的分數，保持隨機性

	for (const { seat, score } of scoredAvailableSeats) {
		// 每次迭代都讓出控制權，避免阻塞 UI
		await new Promise(resolve => setTimeout(resolve, 0));

		console.log(`[DEBUG] 嘗試將學生 ${currentStudent} 放置在座位 (${seat.row}, ${seat.col})，啟發式分數: ${score}`);

		// 嘗試分配學生到當前座位
		seat.studentId = currentStudent;
		currentAssignment.set(currentStudent, seat);

		// 檢查所有相關條件是否滿足
		let allConditionsMet = true;
		const relevantConditions = studentToConditionsMap.get(currentStudent) || [];
		for (const condition of relevantConditions) {
			const conditionMet = checkCondition(condition, currentAssignment);
			console.log(`[DEBUG] 檢查學生 ${currentStudent} 的條件類型: ${condition.type}, 條件內容: ${JSON.stringify(condition.students)} - 結果: ${conditionMet ? '滿足' : '不滿足'}`);
			if (!conditionMet) {
				allConditionsMet = false;
				console.log(`[DEBUG] 學生 ${currentStudent} 在座位 (${seat.row}, ${seat.col}) 不滿足條件: 類型 ${condition.type}, 內容 ${JSON.stringify(condition.students)}。`);
				break;
			}
		}

		if (allConditionsMet) {
			console.log(`[DEBUG] 學生 ${currentStudent} 在座位 (${seat.row}, ${seat.col}) 滿足所有條件。遞迴處理下一個學生...`);
			// 從待分配學生列表中移除當前學生
			const nextStudentsToAssign = studentsToAssign.filter(s => s !== currentStudent);
			if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
				return true; // 找到一個完整解
			}
		}

		// 回溯：如果當前分配不成功，則撤銷分配
		console.log(`[DEBUG] 回溯：學生 ${currentStudent} 在座位 (${seat.row}, ${seat.col}) 失敗或後續遞迴失敗。撤銷分配。`);
		seat.studentId = undefined;
		currentAssignment.delete(currentStudent);
	}

	// 如果所有座位都嘗試過且都失敗，嘗試動態重新分配
	console.log(`[DEBUG] 無法為學生 ${currentStudent} 找到合適的座位，嘗試動態重新分配...`);
	
	// 嘗試動態重新分配：踢出已分配的學生為當前學生騰出座位
	console.log(`[DEBUG] 開始動態重新分配流程...`);
	console.log(`[DEBUG] 當前學生 ${currentStudent} 的分數: ${studentScores.get(currentStudent) || 0}`);
	console.log(`[DEBUG] 已分配學生列表:`, Array.from(currentAssignment.keys()));
	console.log(`[DEBUG] 已分配學生的分數:`, Array.from(currentAssignment.keys()).map(s => `學生 ${s}: ${studentScores.get(s) || 0}`).join(', '));
	
	if (await tryReassignSeats(currentStudent, currentAssignment, availableSeats, studentToConditionsMap, studentScores, unassignedStudentsResult, studentHasAssignGroupCondition, startTime, TIMEOUT_MS)) {
		console.log(`[DEBUG] 動態重新分配成功！學生 ${currentStudent} 已成功安排。`);
		// 從待分配學生列表中移除當前學生
		const nextStudentsToAssign = studentsToAssign.filter(s => s !== currentStudent);
		return await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS);
	}
	
	// 如果動態重新分配也失敗，則標記為未安排
	console.log(`[DEBUG] 動態重新分配失敗，將學生 ${currentStudent} 標記為未安排。`);
	unassignedStudentsResult.add(currentStudent); // 將當前學生標記為未安排

	// 在標記為未安排後，立即進行狀態驗證
	validateAndFixAssignmentState(currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap);

	// 嘗試遞迴調用 solveAssignment 來安排下一個學生
	const nextStudentsToAssign = studentsToAssign.filter(s => s !== currentStudent);
	if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, studentScores, startTime, TIMEOUT_MS)) {
		// 如果後續的遞迴成功，則表示找到了部分解決方案
		// 檢查 currentStudent 是否仍然在 unassignedStudentsResult 中，如果找到解，則將其移除
		if (unassignedStudentsResult.has(currentStudent)) {
			// 檢查學生是否已經被安排到座位上（同時檢查 currentAssignment 和 appState.seats）
			let isAssigned = false;
			
			// 檢查 currentAssignment
			if (currentAssignment.has(currentStudent)) {
				isAssigned = true;
				console.log(`[DEBUG] 學生 ${currentStudent} 在 currentAssignment 中找到`);
			}
			
			// 檢查 appState.seats
			if (!isAssigned) {
				appState.seats.forEach(row => {
					row.forEach(seat => {
						if (seat.studentId === currentStudent) {
							isAssigned = true;
							console.log(`[DEBUG] 學生 ${currentStudent} 在 appState.seats 中找到`);
						}
					});
				});
			}
			
			// 額外檢查：如果學生在動態調整過程中被成功安排，也應該移除
			if (!isAssigned) {
				// 檢查是否有空座位可以安排給當前學生
				const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
				for (const emptySeat of availableEmptySeats) {
					if (canStudentSitHere(currentStudent, emptySeat, currentAssignment, studentToConditionsMap)) {
						console.log(`[DEBUG] 發現學生 ${currentStudent} 可以坐在空座位 (${emptySeat.row}, ${emptySeat.col})`);
						isAssigned = true;
						// 立即安排學生到空座位
						emptySeat.studentId = currentStudent;
						currentAssignment.set(currentStudent, emptySeat);
						break;
					}
				}
			}
			
			if (isAssigned) {
				unassignedStudentsResult.delete(currentStudent);
				console.log(`[DEBUG] 學生 ${currentStudent} 被從 unassignedStudentsResult 移除 (後續找到解):`, unassignedStudentsResult);
			} else {
				console.error(`[ERROR] 學生 ${currentStudent} 被從 unassignedStudentsResult 移除，但沒有被安排到座位上！`);
				console.error(`[ERROR] currentAssignment 包含的學生:`, Array.from(currentAssignment.keys()));
				console.error(`[ERROR] appState.seats 中的學生:`, appState.seats.flat().filter(seat => seat.studentId).map(seat => seat.studentId));
				console.error(`[ERROR] 可用空座位數量:`, availableSeats.filter(seat => seat.studentId === undefined).length);
			}
		}
		return true; // 返回 true，表示此分支已處理完畢，即使有學生未安排
	} else {
		// 如果後續的遞迴也失敗，則回溯，並將 currentStudent 從臨時的 unassignedStudents 列表中移除
		// 這裡不需要移除，因為如果後續失敗，currentStudent 應該保持在 unassignedStudentsResult 中
		// 並且返回 false，表示此分支無法找到完整解
		console.log(`[DEBUG] 學生 ${currentStudent} 保持在 unassignedStudentsResult 中 (後續未找到解):`, unassignedStudentsResult);
		return false; // 返回 false，表示此分支無法找到完整解
	}
}

// 輔助函數：檢查單一條件是否滿足
function checkCondition(condition, assignedStudentsMap) {
	switch (condition.type) {
		case 'adjacent':
			return condition.students.every(pair =>
				checkAdjacent(pair[0], pair[1], assignedStudentsMap)
			);
		case 'group_area':
			return checkGroupArea(condition.students[0], assignedStudentsMap);
		case 'not_adjacent':
			return condition.students.every(pair =>
				checkNotAdjacent(pair[0], pair[1], assignedStudentsMap)
			);
		case 'assign_group':
			return condition.students.every(s =>
				checkAssignGroup(s[0], condition.group, assignedStudentsMap)
			);
		case 'adjacent_and_group':
			return condition.students.every(pair =>
				checkAdjacentAndGroup(pair[0], pair[1], condition.group, assignedStudentsMap)
			);
		default:
			return true; // 未知條件類型，暫時視為滿足
	}
}

// 約束函數：檢查學生 A 和 B 是否左右相鄰
function checkAdjacent(studentA, studentB, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		console.log(`[DEBUG] checkAdjacent: 學生 ${studentA} 或 ${studentB} 尚未分配。`);
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	const areAdjacent = areSeatsAdjacentAllDirections(seatA, seatB);
	if (!areAdjacent) {
		console.log(`[DEBUG] checkAdjacent: 學生 ${studentA} (座位: R${seatA.row}C${seatA.col}) 與學生 ${studentB} (座位: R${seatB.row}C${seatB.col}) 不相鄰。衝突類型: adjacent。`);
	} else {
		console.log(`[DEBUG] checkAdjacent: 學生 ${studentA} (座位: R${seatA.row}C${seatA.col}) 與學生 ${studentB} (座位: R${seatB.row}C${seatB.col}) 相鄰。`);
	}
	return areAdjacent;
}

// 約束函數：檢查學生組是否在同一區域內 (前後左右相鄰)
function checkGroupArea(studentsInGroup, assignedStudentsMap) {
	const assignedSeatsInGroup = studentsInGroup
		.map(studentId => assignedStudentsMap.get(studentId))
		.filter(seat => seat !== undefined);

	if (assignedSeatsInGroup.length === 0) {
		return true; // 如果組內沒有學生被分配，則此條件暫時不衝突
	}

	// 檢查所有已分配的座位是否彼此前後左右相鄰，形成一個連通區域
	// 使用 BFS 檢查連通性
	const visited = new Set();
	const queue = [assignedSeatsInGroup[0]];
	visited.add(`${assignedSeatsInGroup[0].row}-${assignedSeatsInGroup[0].col}`);

	let head = 0;
	while (head < queue.length) {
		const currentSeat = queue[head++];
		const neighbors = getNeighboringValidSeats(currentSeat, appState.seats);

		for (const neighbor of neighbors) {
			// 檢查鄰居是否是組內已分配的座位
			const isNeighborInGroup = assignedSeatsInGroup.some(s => s.row === neighbor.row && s.col === neighbor.col);
			const neighborKey = `${neighbor.row}-${neighbor.col}`;

			if (isNeighborInGroup && !visited.has(neighborKey)) {
				visited.add(neighborKey);
				queue.push(neighbor);
			}
		}
	}
	// 如果所有組內已分配的座位都被訪問到，則表示它們是連通的
	const isConnected = visited.size === assignedSeatsInGroup.length;
	if (!isConnected) {
		console.log(`[DEBUG] checkGroupArea: 組內學生未形成連通區域。已分配學生數量: ${assignedSeatsInGroup.length}, 連通學生數量: ${visited.size}。衝突類型: group_area。`);
	}
	return isConnected;
}

// 約束函數：檢查學生 A 和 B 是否至少隔一人
function checkNotAdjacent(studentA, studentB, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	// 如果兩個座位前後左右相鄰，則不滿足「至少隔一人」
	const notAdjacent = !areSeatsAdjacentAllDirections(seatA, seatB);
	if (!notAdjacent) {
		console.log(`[DEBUG] checkNotAdjacent: 學生 ${studentA} (座位: R${seatA.row}C${seatA.col}) 與學生 ${studentB} (座位: R${seatB.row}C${seatB.col}) 相鄰，不滿足「至少隔一人」條件。衝突類型: not_adjacent。`);
	}
	return notAdjacent;
}

// 輔助函數：檢查初始條件是否存在明顯衝突
function checkInitialConditionsForConflicts() {
	let conflicts = [];
	
	console.log("[DEBUG] 開始初始條件衝突檢查...");
	console.log("[DEBUG] 總學生數量:", appState.studentIds.length);
	console.log("[DEBUG] 總有效座位數:", appState.seats.flat().filter(seat => seat.isValid).length);
	console.log("[DEBUG] 條件詳細信息:");
	appState.conditions.forEach((condition, index) => {
		console.log(`[DEBUG] 條件 ${index}:`, {
			id: condition.id,
			type: condition.type,
			students: condition.students,
			group: condition.group,
			studentGroupName: condition.studentGroupName
		});
	});

	// 檢查總體學生數量是否超過總有效座位數
	const totalStudents = appState.studentIds.length;
	const totalValidSeats = appState.seats.flat().filter(seat => seat.isValid).length;
	if (totalStudents > totalValidSeats) {
		const conflict = `總學生數量 (${totalStudents}) 超過總有效座位數 (${totalValidSeats})。`;
		conflicts.push(conflict);
		console.log(`[DEBUG] 發現衝突: ${conflict}`);
	}

	// 檢查 assign_group 條件：指定群組的學生數量是否超過該群組的有效座位數
	const groupAssignmentCounts = new Map(); // { groupName: studentCount }
	appState.conditions.forEach(condition => {
		if (condition.type === 'assign_group') {
			const groupName = condition.group;
			// condition.students 是一個二維陣列，例如 [[1], [5]] 或 [[1, 2]]
			const studentsInCondition = condition.students.flat();
			groupAssignmentCounts.set(groupName, (groupAssignmentCounts.get(groupName) || 0) + studentsInCondition.length);
			console.log(`[DEBUG] assign_group 條件: 群組 "${groupName}" 需要 ${studentsInCondition.length} 個學生`);
		}
	});

	// 檢查 group_area 條件：群組區域的學生數量是否超過該群組的有效座位數
	appState.conditions.forEach(condition => {
		if (condition.type === 'group_area') {
			const groupName = condition.group;
			const studentsInCondition = condition.students[0]; // group_area 的 students 是單一陣列
			const requiredStudents = studentsInCondition.length;
			const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === groupName).length;
			console.log(`[DEBUG] group_area 條件: 群組 "${groupName}" 需要 ${requiredStudents} 個學生，可用座位 ${availableSeatsInGroup} 個`);
			if (requiredStudents > availableSeatsInGroup) {
				const conflict = `群組區域 "${groupName}" 需要 ${requiredStudents} 個座位，但只有 ${availableSeatsInGroup} 個有效座位。`;
				conflicts.push(conflict);
				console.log(`[DEBUG] 發現衝突: ${conflict}`);
			}
		}
	});

	// 檢查 adjacent_and_group 條件：相鄰且同群組的學生數量是否超過該群組的有效座位數
	appState.conditions.forEach(condition => {
		if (condition.type === 'adjacent_and_group') {
			const groupName = condition.group;
			const studentsInCondition = condition.students.flat();
			const requiredStudents = studentsInCondition.length;
			const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === groupName).length;
			console.log(`[DEBUG] adjacent_and_group 條件: 群組 "${groupName}" 需要 ${requiredStudents} 個學生，可用座位 ${availableSeatsInGroup} 個`);
			if (requiredStudents > availableSeatsInGroup) {
				const conflict = `相鄰且同群組 "${groupName}" 需要 ${requiredStudents} 個座位，但只有 ${availableSeatsInGroup} 個有效座位。`;
				conflicts.push(conflict);
				console.log(`[DEBUG] 發現衝突: ${conflict}`);
			}
		}
	});

	// 檢查 assign_student_group_to_seat_group 條件：學生群組指定區域的學生數量是否超過該群組的有效座位數
	appState.conditions.forEach(condition => {
		if (condition.type === 'assign_student_group_to_seat_group') {
			const seatGroupName = condition.group;
			const studentGroupName = condition.studentGroupName;
			
			// 獲取學生群組的學生數量
			const studentsInStudentGroup = appState.studentGroups[studentGroupName] || [];
			const requiredStudents = studentsInStudentGroup.length;
			
			// 獲取座位群組的可用座位數
			const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === seatGroupName).length;
			
			console.log(`[DEBUG] assign_student_group_to_seat_group 條件: 學生群組 "${studentGroupName}" 有 ${requiredStudents} 個學生，座位群組 "${seatGroupName}" 有 ${availableSeatsInGroup} 個座位`);
			
			if (requiredStudents > availableSeatsInGroup) {
				const conflict = `學生群組 "${studentGroupName}" 有 ${requiredStudents} 個學生，但座位群組 "${seatGroupName}" 只有 ${availableSeatsInGroup} 個座位。`;
				conflicts.push(conflict);
				console.log(`[DEBUG] 發現衝突: ${conflict}`);
			}
		}
	});

	// 檢查 groupSeatAssignments 綁定：第一張圖片中的學生群組與座位群組綁定
	console.log("[DEBUG] 檢查 groupSeatAssignments 綁定關係:", appState.groupSeatAssignments);
	for (const seatGroupId in appState.groupSeatAssignments) {
		const studentGroupName = appState.groupSeatAssignments[seatGroupId];
		
		// 獲取學生群組的學生數量
		const studentsInStudentGroup = appState.studentGroups[studentGroupName] || [];
		const requiredStudents = studentsInStudentGroup.length;
		
		// 獲取座位群組的可用座位數
		const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === seatGroupId).length;
		
		console.log(`[DEBUG] groupSeatAssignments 綁定: 學生群組 "${studentGroupName}" 有 ${requiredStudents} 個學生，座位群組 "${seatGroupId}" 有 ${availableSeatsInGroup} 個座位`);
		
		if (requiredStudents > availableSeatsInGroup) {
			const conflict = `學生群組 "${studentGroupName}" 有 ${requiredStudents} 個學生，但座位群組 "${seatGroupId}" 只有 ${availableSeatsInGroup} 個座位。`;
			conflicts.push(conflict);
			console.log(`[DEBUG] 發現衝突: ${conflict}`);
		}
	}

	// 檢查所有群組的學生數量
	groupAssignmentCounts.forEach((requiredStudents, groupName) => {
		const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === groupName).length;
		console.log(`[DEBUG] assign_group 總計: 群組 "${groupName}" 需要 ${requiredStudents} 個學生，可用座位 ${availableSeatsInGroup} 個`);
		if (requiredStudents > availableSeatsInGroup) {
			const conflict = `群組 "${groupName}" 需要 ${requiredStudents} 個座位，但只有 ${availableSeatsInGroup} 個有效座位。`;
			conflicts.push(conflict);
			console.log(`[DEBUG] 發現衝突: ${conflict}`);
		}
	});

	console.log(`[DEBUG] 初始條件衝突檢查完成，發現 ${conflicts.length} 個衝突:`, conflicts);
	return conflicts;
}

// 約束函數：檢查學生是否坐在指定群組的座位
function checkAssignGroup(student, groupName, assignedStudentsMap) {
	const seat = assignedStudentsMap.get(student);
	if (!seat) {
		return true; // 如果學生尚未分配，則此條件暫時不衝突
	}
	const isInGroup = seat.groupId === groupName;
	if (!isInGroup) {
		console.log(`[DEBUG] checkAssignGroup: 學生 ${student} (座位: R${seat.row}C${seat.col}) 不在指定群組 ${groupName} 中。實際群組: ${seat.groupId}。衝突類型: assign_group。`);
	}
	return isInGroup;
}

// 約束函數：檢查學生 A 和 B 是否左右相鄰且都在指定群組
export function checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	const isAdjacentAndInGroup = areSeatsAdjacentHorizontal(seatA, seatB) && seatA.groupId === groupName && seatB.groupId === groupName;
	if (!isAdjacentAndInGroup) {
		console.log(`[DEBUG] checkAdjacentAndGroup: 學生 ${studentA} (座位: R${seatA.row}C${seatA.col}) 與學生 ${studentB} (座位: R${seatB.row}C${seatB.col}) 不滿足「左右相鄰且都在指定群組 ${groupName}」條件。衝突類型: adjacent_and_group。`);
	}
	return isAdjacentAndInGroup;
}

/**
 * 通用狀態驗證和修復函數
 * 檢查是否有學生被錯誤地標記為未安排，並自動修復
 */
function validateAndFixAssignmentState(currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap) {
	console.log("[DEBUG] ===== 開始通用狀態驗證 =====");
	
	const unassignedStudentsArray = Array.from(unassignedStudentsResult);
	console.log("[DEBUG] 未安排學生列表:", unassignedStudentsArray);
	
	// 檢查每個未安排學生是否真的無法安排
	for (const studentId of unassignedStudentsArray) {
		console.log(`[DEBUG] 驗證學生 ${studentId} 的狀態...`);
		
		// 檢查學生是否已經被安排（狀態不一致）
		if (currentAssignment.has(studentId)) {
			console.log(`[DEBUG] 發現狀態不一致：學生 ${studentId} 在 currentAssignment 中但也在未安排列表中`);
			unassignedStudentsResult.delete(studentId);
			continue;
		}
		
		// 檢查學生是否可以坐在空座位
		const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
		let canBeAssigned = false;
		
		for (const emptySeat of availableEmptySeats) {
			if (canStudentSitHere(studentId, emptySeat, currentAssignment, studentToConditionsMap)) {
				console.log(`[DEBUG] 發現學生 ${studentId} 可以坐在空座位 (${emptySeat.row}, ${emptySeat.col})，自動安排`);
				emptySeat.studentId = studentId;
				currentAssignment.set(studentId, emptySeat);
				unassignedStudentsResult.delete(studentId);
				canBeAssigned = true;
				break;
			}
		}
		
		if (!canBeAssigned) {
			console.log(`[DEBUG] 學生 ${studentId} 確實無法安排，進行詳細診斷...`);
			diagnoseStudentAssignment(studentId, currentAssignment, availableSeats, studentToConditionsMap);
		}
	}
	
	console.log("[DEBUG] 狀態驗證完成，剩餘未安排學生:", Array.from(unassignedStudentsResult));
	console.log("[DEBUG] ===== 通用狀態驗證結束 =====");
}

/**
 * 通用學生分配診斷函數
 * 診斷任何學生的分配問題並提供解決建議
 */
function diagnoseStudentAssignment(studentId, currentAssignment, availableSeats, studentToConditionsMap) {
	console.log(`[DEBUG] ===== 診斷學生 ${studentId} 的分配問題 =====`);
	
	// 檢查學生的條件
	const studentConditions = studentToConditionsMap.get(studentId) || [];
	console.log(`[DEBUG] 學生 ${studentId} 的條件:`, studentConditions.map(c => `${c.type} - ${JSON.stringify(c.students)}`));
	
	// 檢查可用的空座位
	const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
	console.log(`[DEBUG] 可用空座位數量: ${availableEmptySeats.length}`);
	console.log(`[DEBUG] 可用空座位:`, availableEmptySeats.map(seat => `(${seat.row}, ${seat.col}, group: ${seat.groupId})`));
	
	// 檢查學生是否可以坐在任何空座位
	let canSitInAnySeat = false;
	for (const emptySeat of availableEmptySeats) {
		const canSit = canStudentSitHere(studentId, emptySeat, currentAssignment, studentToConditionsMap);
		console.log(`[DEBUG] 學生 ${studentId} 是否可以坐在座位 (${emptySeat.row}, ${emptySeat.col}): ${canSit}`);
		if (canSit) {
			canSitInAnySeat = true;
		}
	}
	
	if (canSitInAnySeat) {
		console.log(`[DEBUG] 診斷結果：學生 ${studentId} 可以坐在空座位，但沒有被安排。這是一個狀態不一致的問題。`);
	} else {
		console.log(`[DEBUG] 診斷結果：學生 ${studentId} 確實無法坐在任何空座位。`);
		
		// 分析具體原因
		analyzeAssignmentFailure(studentId, currentAssignment, availableSeats, studentToConditionsMap);
	}
	
	console.log(`[DEBUG] ===== 學生 ${studentId} 診斷結束 =====`);
}

/**
 * 分析分配失敗的具體原因
 */
function analyzeAssignmentFailure(studentId, currentAssignment, availableSeats, studentToConditionsMap) {
	console.log(`[DEBUG] 分析學生 ${studentId} 分配失敗的原因...`);
	
	const studentConditions = studentToConditionsMap.get(studentId) || [];
	const availableEmptySeats = availableSeats.filter(seat => seat.studentId === undefined);
	
	// 檢查每個條件
	for (const condition of studentConditions) {
		console.log(`[DEBUG] 檢查條件: ${condition.type} - ${JSON.stringify(condition.students)}`);
		
		// 檢查每個空座位
		for (const emptySeat of availableEmptySeats) {
			// 創建臨時分配狀態進行測試
			const tempAssignment = new Map(currentAssignment);
			tempAssignment.set(studentId, emptySeat);
			
			// 檢查這個條件
			const conditionMet = checkCondition(condition, tempAssignment);
			if (!conditionMet) {
				console.log(`[DEBUG] 條件 ${condition.type} 在座位 (${emptySeat.row}, ${emptySeat.col}) 不滿足`);
				
				// 根據條件類型提供具體分析
				switch (condition.type) {
					case 'adjacent':
						console.log(`[DEBUG] 相鄰條件失敗：需要與其他學生相鄰，但該座位周圍沒有合適的學生`);
						break;
					case 'assign_group':
						console.log(`[DEBUG] 群組條件失敗：需要坐在群組 ${condition.group}，但該座位屬於群組 ${emptySeat.groupId}`);
						break;
					case 'group_area':
						console.log(`[DEBUG] 群組區域條件失敗：需要與其他學生在同一區域`);
						break;
					default:
						console.log(`[DEBUG] 其他條件類型失敗`);
				}
			}
		}
	}
	
	// 檢查是否需要動態調整
	console.log(`[DEBUG] 建議：嘗試動態調整策略來為學生 ${studentId} 安排座位`);
}