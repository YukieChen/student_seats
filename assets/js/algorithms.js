// algorithms.js - 核心演算法和約束檢查函數

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

// 核心演算法：開始安排座位
export async function startAssignment() {
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

	// 學生排序 (啟發式：參與條件最多的學生優先)
	const studentConditionCounts = new Map();
	allStudents.forEach(s => studentConditionCounts.set(s, 0));
	appState.conditions.forEach(c => {
		c.students.flat().forEach(s => {
			if (studentConditionCounts.has(s)) {
				studentConditionCounts.set(s, studentConditionCounts.get(s) + 1);
			}
		});
	});
	// 學生排序邏輯：先隨機打亂，然後根據限制分數排序
	allStudents = shuffleArray(allStudents); // 首先隨機打亂學生順序
	allStudents.sort((a, b) => {
		const scoreA = studentConditionCounts.get(a) || 0;
		const scoreB = studentConditionCounts.get(b) || 0;
		// 分數高的學生優先。如果分數相同，則保持他們在隨機打亂後的相對順序。
		return scoreB - scoreA;
	});
	console.log("[DEBUG] 學生按限制分數排序後 (分數高的優先):", allStudents.map(s => `學生 ${s} (分數: ${studentConditionCounts.get(s) || 0})`).join(', '));

	// 建立學生到相關條件的映射
	const studentToConditionsMap = new Map();
	allStudents.forEach(s => studentToConditionsMap.set(s, []));
	appState.conditions.forEach(condition => {
		condition.students.flat().forEach(s => {
			if (studentToConditionsMap.has(s)) {
				studentToConditionsMap.get(s).push(condition);
			}
		});
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

	// 更新未安排學生清單
	const unassignedListElement = document.getElementById('unassigned-students-list');
	if (unassignedListElement) {
		unassignedListElement.innerHTML = appState.unassignedStudents.sort((a, b) => a - b).map(s => `<li>${s}</li>`).join('');
	}

	renderScreen('assignment'); // 重新渲染安排結果畫面
}

// 回溯演算法核心
async function solveAssignment(studentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, startTime, TIMEOUT_MS) {
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

	// 3. 強化座位隨機性：隨機打亂有效座位列表的順序
	let candidateSeats = shuffleArray(trulyValidCandidateSeats);
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
			if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, startTime, TIMEOUT_MS)) {
				return true; // 找到一個完整解
			}
		}

		// 回溯：如果當前分配不成功，則撤銷分配
		console.log(`[DEBUG] 回溯：學生 ${currentStudent} 在座位 (${seat.row}, ${seat.col}) 失敗或後續遞迴失敗。撤銷分配。`);
		seat.studentId = undefined;
		currentAssignment.delete(currentStudent);
	}

	// 如果所有座位都嘗試過且都失敗
	console.log(`[DEBUG] 無法為學生 ${currentStudent} 找到合適的座位。將其標記為未安排並嘗試處理下一個學生。`);
	unassignedStudentsResult.add(currentStudent); // 將當前學生標記為未安排

	// 嘗試遞迴調用 solveAssignment 來安排下一個學生
	const nextStudentsToAssign = studentsToAssign.filter(s => s !== currentStudent);
	if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, startTime, TIMEOUT_MS)) {
		// 如果後續的遞迴成功，則表示找到了部分解決方案
		// 檢查 currentStudent 是否仍然在 unassignedStudentsResult 中，如果找到解，則將其移除
		if (unassignedStudentsResult.has(currentStudent)) {
			// 檢查學生是否已經被安排到座位上
			let isAssigned = false;
			appState.seats.forEach(row => {
				row.forEach(seat => {
					if (seat.studentId === currentStudent) {
						isAssigned = true;
					}
				});
			});
			if (isAssigned) {
				unassignedStudentsResult.delete(currentStudent);
				console.log(`[DEBUG] 學生 ${currentStudent} 被從 unassignedStudentsResult 移除 (後續找到解):`, unassignedStudentsResult);
			} else {
				console.error(`[ERROR] 學生 ${currentStudent} 被從 unassignedStudentsResult 移除，但沒有被安排到座位上！`);
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

	// 檢查 assign_group 條件：指定群組的學生數量是否超過該群組的有效座位數
	const groupAssignmentCounts = new Map(); // { groupName: studentCount }
	appState.conditions.forEach(condition => {
		if (condition.type === 'assign_group') {
			const groupName = condition.group;
			// condition.students 是一個二維陣列，例如 [[1], [5]] 或 [[1, 2]]
			const studentsInCondition = condition.students.flat();
			groupAssignmentCounts.set(groupName, (groupAssignmentCounts.get(groupName) || 0) + studentsInCondition.length);
		}
	});

	groupAssignmentCounts.forEach((requiredStudents, groupName) => {
		const availableSeatsInGroup = appState.seats.flat().filter(seat => seat.isValid && seat.groupId === groupName).length;
		if (requiredStudents > availableSeatsInGroup) {
			conflicts.push(`群組 "${groupName}" 需要 ${requiredStudents} 個座位，但只有 ${availableSeatsInGroup} 個有效座位。`);
		}
	});

	// TODO: 可以添加其他類型的預檢查，例如：
	// - adjacent 條件的學生是否都存在於 studentIds 中
	// - group_area 條件的學生數量是否超過該群組的有效座位數

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