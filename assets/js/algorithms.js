// algorithms.js - 核心演算法和約束檢查函數

import { appState } from './state.js';
import { renderScreen } from './ui.js';
import { areSeatsAdjacentHorizontal, areSeatsAdjacentAllDirections, getNeighboringValidSeats } from './utils.js';

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
	allStudents.sort((a, b) => studentConditionCounts.get(b) - studentConditionCounts.get(a));

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

	console.log(`[DEBUG] startAssignment 結束時的 unassignedStudents:`, unassignedStudents);
	// 更新未安排學生清單
	const unassignedListElement = document.getElementById('unassigned-students-list');
	if (unassignedListElement) {
		unassignedListElement.innerHTML = Array.from(unassignedStudents).sort((a, b) => a - b).map(s => `<li>${s}</li>`).join('');
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
	studentsToAssign.sort((sA, sB) => {
		let scoreA = 0;
		let scoreB = 0;

		// 優先級 1: 學生是否綁定到特定座位群組
		const studentGroupA = Object.values(appState.groupSeatAssignments).find(sgName => appState.studentGroups[sgName] && appState.studentGroups[sgName].includes(sA));
		const studentGroupB = Object.values(appState.groupSeatAssignments).find(sgName => appState.studentGroups[sgName] && appState.studentGroups[sgName].includes(sB));

		if (studentGroupA && !studentGroupB) {
			return -1; // A 有綁定，B 沒有，A 優先
		}
		if (!studentGroupA && studentGroupB) {
			return 1; // B 有綁定，A 沒有，B 優先
		}
		// 如果都有或都沒有綁定，則進入下一個優先級判斷

		// 優先級 2: 處理有相鄰條件且其相鄰學生已放置的學生

		const conditionsA = studentToConditionsMap.get(sA) || [];
		for (const condition of conditionsA) {
			if (condition.type === 'adjacent') {
				const [s1, s2] = condition.students[0];
				const otherStudent = (s1 === sA) ? s2 : s1;
				if (currentAssignment.has(otherStudent)) {
					scoreA += 10000; // 給予極高的優先級
				}
			}
		}

		const conditionsB = studentToConditionsMap.get(sB) || [];
		for (const condition of conditionsB) {
			if (condition.type === 'adjacent') {
				const [s1, s2] = condition.students[0];
				const otherStudent = (s1 === sB) ? s2 : s1;
				if (currentAssignment.has(otherStudent)) {
					scoreB += 10000; // 給予極高的優先級
				}
			}
		}
		return scoreB - scoreA;
	});

	const currentStudent = studentsToAssign[0]; // 選擇排序後的第一個學生
	console.log(`[DEBUG] 嘗試為學生 ${currentStudent} (剩餘學生數: ${studentsToAssign.length}) 尋找座位...`);

	// 座位排序啟發式：
	// 1. 優先考慮與學生綁定群組相符的座位
	// 2. 其次考慮能滿足最多條件的座位
	const scoredAvailableSeats = availableSeats
		.filter(seat => seat.studentId === undefined) // 只考慮未被佔用的座位
		.map(seat => {
			let score = 0;
			const tempAssignment = new Map(currentAssignment);
			tempAssignment.set(currentStudent, seat);

			// 優先級 1: 檢查座位是否屬於學生綁定的座位群組
			const studentGroupForCurrentStudent = Object.values(appState.groupSeatAssignments).find(sgName => appState.studentGroups[sgName] && appState.studentGroups[sgName].includes(currentStudent));
			if (studentGroupForCurrentStudent) {
				// 找到學生所屬的學生群組，現在檢查該學生群組是否綁定到當前座位所屬的座位群組
				const boundSeatGroup = Object.keys(appState.groupSeatAssignments).find(seatGroupId => appState.groupSeatAssignments[seatGroupId] === studentGroupForCurrentStudent);
				if (boundSeatGroup && seat.groupId === boundSeatGroup) {
					score += 100000; // 給予極高的分數，優先考慮綁定座位
					console.log(`[DEBUG] 學生 ${currentStudent} 綁定到學生群組 ${studentGroupForCurrentStudent}，該群組綁定到座位群組 ${boundSeatGroup}。座位 (${seat.row}, ${seat.col}) 屬於 ${seat.groupId}。匹配成功，給予高分。`);
				} else if (boundSeatGroup && seat.groupId !== boundSeatGroup) {
					score -= 10000; // 如果學生有綁定群組，但座位不屬於該群組，則給予負分，降低優先級
					console.log(`[DEBUG] 學生 ${currentStudent} 綁定到學生群組 ${studentGroupForCurrentStudent}，該群組綁定到座位群組 ${boundSeatGroup}。座位 (${seat.row}, ${seat.col}) 屬於 ${seat.groupId}。不匹配，給予負分。`);
				}
			}
			// 如果學生沒有綁定學生群組，或者學生群組沒有綁定座位群組，則不影響此分數

			// 優先級 2: 滿足條件的數量

			const relevantConditions = studentToConditionsMap.get(currentStudent) || [];
			for (const condition of relevantConditions) {
				if (condition.type === 'adjacent') {
					const [s1, s2] = condition.students[0]; // 假設 adjacent 條件只涉及一對學生
					const otherStudent = (s1 === currentStudent) ? s2 : s1;
					const otherStudentSeat = currentAssignment.get(otherStudent);

					if (otherStudentSeat && areSeatsAdjacentAllDirections(seat, otherStudentSeat)) {
						score += 1000; // 給予極高的分數，優先考慮相鄰座位
						console.log(`[DEBUG] 學生 ${currentStudent} 考慮座位 (${seat.row}, ${seat.col}) 與已放置學生 ${otherStudent} (${otherStudentSeat.row}, ${otherStudentSeat.col}) 相鄰，給予高分。`);
					}
				}

				if (checkCondition(condition, tempAssignment)) {
					score++;
				}
			}
			return { seat, score };
		})
		.sort((a, b) => b.score - a.score); // 分數高的座位優先

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

	// 如果所有座位都嘗試過且都失敗，則嘗試回溯並重新安排
	console.log(`[DEBUG] 無法為學生 ${currentStudent} 找到合適的座位。嘗試回溯並重新安排...`);

	// 收集所有已分配且沒有 assign_group 約束或學生群組綁定約束的學生，按分配順序倒序排列
	const candidatesToRearrange = Array.from(currentAssignment.keys())
		.reverse() // 從最近分配的學生開始考慮
		.filter(studentId => {
			const hasAssignGroupCondition = studentHasAssignGroupCondition.get(studentId);
			const hasStudentGroupBinding = Object.values(appState.groupSeatAssignments).some(sgName => appState.studentGroups[sgName] && appState.studentGroups[sgName].includes(studentId));
			return !hasAssignGroupCondition && !hasStudentGroupBinding;
		});

	for (const studentToRearrange of candidatesToRearrange) {
		// 超時檢查
		if (Date.now() - startTime > TIMEOUT_MS) {
			console.warn(`[DEBUG] 超時觸發！停止搜尋。將剩餘學生添加到未安排列表。`);
			// 將所有剩餘學生添加到未安排列表
			studentsToAssign.forEach(s => {
				unassignedStudentsResult.add(s); // 使用 add
			});
			return false;
		}

		const originalSeat = currentAssignment.get(studentToRearrange);
		if (!originalSeat) continue; // 應該不會發生，但以防萬一

		// 撤銷該學生的分配
		originalSeat.studentId = undefined;
		currentAssignment.delete(studentToRearrange);
		console.log(`[DEBUG] 回溯：為了解決學生 ${currentStudent} 的放置問題，暫時撤銷學生 ${studentToRearrange} (原座位: R${originalSeat.row}C${originalSeat.col}) 的分配。`);

		// 將被撤銷的學生重新加入待分配列表的開頭，以確保它在後續被重新處理
		const studentsAfterRearrange = [studentToRearrange, ...studentsToAssign];

		// 嘗試為當前學生 (currentStudent) 找到座位
		// 注意：這裡我們將 currentStudent 放在 studentsToAssign 的最前面，確保它優先被處理
		const nextStudentsToAssign = [currentStudent, studentToRearrange, ...studentsToAssign.filter(s => s !== currentStudent && s !== studentToRearrange)];

		// 遞迴調用 solveAssignment，嘗試解決當前學生和被撤銷學生的問題
		if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, startTime, TIMEOUT_MS)) {
			return true; // 找到一個完整解
		}

		// 如果遞迴調用失敗，回溯：恢復被撤銷學生的原始分配
		originalSeat.studentId = studentToRearrange;
		currentAssignment.set(studentToRearrange, originalSeat);
		console.log(`[DEBUG] 回溯失敗：恢復學生 ${studentToRearrange} 到原座位 (R${originalSeat.row}C${originalSeat.col})。`);
	}

	// 如果所有回溯和重新安排的嘗試都失敗，且當前學生沒有指定座約束，則將其標記為未安排
	// 如果所有回溯和重新安排的嘗試都失敗，則將當前學生標記為未安排
	console.log(`[DEBUG] 無法為學生 ${currentStudent} 找到合適的座位。將其標記為未安排。`);
	unassignedStudentsResult.add(currentStudent); // 使用 add，Set 會自動處理重複
	console.log(`[DEBUG] 學生 ${currentStudent} 被添加到 unassignedStudentsResult:`, unassignedStudentsResult);
	// 從待分配學生列表中移除當前學生
	const nextStudentsToAssign = studentsToAssign.filter(s => s !== currentStudent);
	// 遞迴調用，處理剩餘學生 (這裡的遞迴是為了確保即使當前學生被跳過，後續學生也能被處理)
	if (await solveAssignment(nextStudentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult, studentToConditionsMap, studentHasAssignGroupCondition, startTime, TIMEOUT_MS)) {
		// 只有當找到解時才移除，並且確保該學生確實存在於列表中
		if (unassignedStudentsResult.has(currentStudent)) { // 檢查是否存在
			unassignedStudentsResult.delete(currentStudent); // 使用 delete
			console.log(`[DEBUG] 學生 ${currentStudent} 被從 unassignedStudentsResult 移除 (找到解):`, unassignedStudentsResult);
		}
		return true;
	}
	// 如果跳過當前學生後仍然沒有找到解，則該學生保持在 unassignedStudentsResult 中

	// 如果所有座位都嘗試過且都失敗，且所有回溯和重新安排的嘗試都失敗，
	// 則將當前學生標記為未安排，並返回 true，表示此分支已處理完畢。
	// 這樣可以確保已安排的學生不會被撤銷。
	console.log(`[DEBUG] 無法為學生 ${currentStudent} 找到合適的座位，且所有嘗試都失敗。將其標記為未安排並結束此分支。`);
	unassignedStudentsResult.add(currentStudent); // 使用 add
	return true; // 返回 true，表示此分支已處理完畢，即使有學生未安排
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