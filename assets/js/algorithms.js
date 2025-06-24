// algorithms.js - 核心演算法和約束檢查函數

import { appState } from './state.js';
import { renderScreen } from './ui.js';
import { areSeatsAdjacentHorizontal, areSeatsAdjacentAllDirections, getNeighboringValidSeats } from './utils.js';

// 核心演算法：開始安排座位
export async function startAssignment() {
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

	let assignedStudentsMap = new Map(); // { studentId: {row, col} }
	let unassignedStudents = []; // 最終無法安排的學生

	// 調用回溯演算法
	const success = await solveAssignment(
		0, // studentIndex
		allStudents,
		assignedStudentsMap,
		availableValidSeats,
		unassignedStudents
	);

	// 更新 UI 顯示結果
	if (success) {
		alert('座位安排完成！所有學生都已成功安排。');
	} else {
		alert('座位安排完成！部分學生無法安排，請查看未安排學生清單。');
	}

	// 將 assignedStudentsMap 的結果更新回 appState.seats 陣列
	appState.seats.forEach(row => row.forEach(seat => {
		seat.studentId = undefined; // 先清空
	}));
	assignedStudentsMap.forEach((seat, studentId) => {
		appState.seats[seat.row][seat.col].studentId = studentId;
	});

	// 更新未安排學生清單
	const unassignedListElement = document.getElementById('unassigned-students-list');
	if (unassignedListElement) {
		unassignedListElement.innerHTML = unassignedStudents.map(s => `<li>${s}</li>`).join('');
	}

	renderScreen('assignment'); // 重新渲染安排結果畫面
}

// 回溯演算法核心
async function solveAssignment(studentIndex, studentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult) {
	// 基本情況：所有學生都已嘗試分配
	if (studentIndex === studentsToAssign.length) {
		return true; // 所有學生都已成功分配
	}

	const currentStudent = studentsToAssign[studentIndex];
	let foundSpotForCurrentStudent = false;

	// 座位排序啟發式：優先考慮能滿足最多條件的座位 (這裡簡化為隨機，實際應更複雜)
	// 為了簡化，這裡先隨機打亂可用座位，實際應根據約束進行評分
	const shuffledAvailableSeats = [...availableSeats].sort(() => Math.random() - 0.5);

	for (const seat of shuffledAvailableSeats) {
		// 每次迭代都讓出控制權，避免阻塞 UI
		await new Promise(resolve => setTimeout(resolve, 0));
		// 檢查座位是否已被佔用
		if (seat.studentId !== undefined) {
			continue;
		}

		// 嘗試分配學生到當前座位
		seat.studentId = currentStudent;
		currentAssignment.set(currentStudent, seat);

		// 檢查所有相關條件是否滿足
		let allConditionsMet = true;
		for (const condition of appState.conditions) {
			// 判斷條件是否與當前學生相關
			const studentsInCondition = condition.students.flat();
			if (!studentsInCondition.includes(currentStudent)) {
				continue; // 如果條件不包含當前學生，則跳過
			}

			let conditionSatisfied = false;
			switch (condition.type) {
				case 'adjacent':
					conditionSatisfied = condition.students.every(pair =>
						checkAdjacent(pair[0], pair[1], currentAssignment)
					);
					break;
				case 'group_area':
					conditionSatisfied = checkGroupArea(condition.students[0], currentAssignment);
					break;
				case 'not_adjacent':
					conditionSatisfied = condition.students.every(pair =>
						checkNotAdjacent(pair[0], pair[1], currentAssignment)
					);
					break;
				case 'assign_group':
					conditionSatisfied = condition.students.every(s =>
						checkAssignGroup(s[0], condition.group, currentAssignment)
					);
					break;
				case 'adjacent_and_group':
					conditionSatisfied = condition.students.every(pair =>
						checkAdjacentAndGroup(pair[0], pair[1], condition.group, currentAssignment)
					);
					break;
				default:
					conditionSatisfied = true; // 未知條件類型，暫時視為滿足
			}
			if (!conditionSatisfied) {
				allConditionsMet = false;
				break;
			}
		}

		if (allConditionsMet) {
			// 如果當前分配滿足所有條件，則遞迴處理下一個學生
			if (await solveAssignment(studentIndex + 1, studentsToAssign, currentAssignment, availableSeats, unassignedStudentsResult)) {
				return true; // 找到一個完整解
			}
		}

		// 回溯：如果當前分配不成功，則撤銷分配
		seat.studentId = undefined;
		currentAssignment.delete(currentStudent);
	}

	// 如果所有座位都嘗試過且都失敗，則將當前學生標記為無法安排
	unassignedStudentsResult.push(currentStudent);
	return false; // 無法為當前學生找到合適的座位
}

// 約束函數：檢查學生 A 和 B 是否左右相鄰
function checkAdjacent(studentA, studentB, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	return areSeatsAdjacentHorizontal(seatA, seatB);
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
	return visited.size === assignedSeatsInGroup.length;
}

// 約束函數：檢查學生 A 和 B 是否至少隔一人
function checkNotAdjacent(studentA, studentB, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	// 如果兩個座位前後左右相鄰，則不滿足「至少隔一人」
	return !areSeatsAdjacentAllDirections(seatA, seatB);
}

// 約束函數：檢查學生是否坐在指定群組的座位
function checkAssignGroup(student, groupName, assignedStudentsMap) {
	const seat = assignedStudentsMap.get(student);
	if (!seat) {
		return true; // 如果學生尚未分配，則此條件暫時不衝突
	}
	return seat.groupId === groupName;
}

// 約束函數：檢查學生 A 和 B 是否左右相鄰且都在指定群組
export function checkAdjacentAndGroup(studentA, studentB, groupName, assignedStudentsMap) {
	const seatA = assignedStudentsMap.get(studentA);
	const seatB = assignedStudentsMap.get(studentB);

	if (!seatA || !seatB) {
		return true; // 如果有學生尚未分配，則此條件暫時不衝突
	}
	return areSeatsAdjacentHorizontal(seatA, seatB) && seatA.groupId === groupName && seatB.groupId === groupName;
}