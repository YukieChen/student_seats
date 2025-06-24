// handlers.js - 事件處理函數

import { appState, Seat, Condition } from './state.js';
import { renderScreen, updateControlPanel } from './ui.js';
import { downloadConfig, uploadConfig, getConditionDescription } from './utils.js';
import { startAssignment } from './algorithms.js';

// 處理座位佈局設定畫面的座位點擊事件
export function handleSeatConfigClick(event) {
	const row = parseInt(event.target.dataset.row);
	const col = parseInt(event.target.dataset.col);
	const seat = appState.seats[row][col];

	if (seat.isValid) {
		seat.isValid = false;
		seat.groupId = undefined; // 取消有效座位時，移除群組設定
		appState.selectedValidSeatsCount--;
	} else {
		if (appState.selectedValidSeatsCount < appState.studentIds.length) {
			seat.isValid = true;
			appState.selectedValidSeatsCount++;
		} else {
			alert(`最多只能選擇 ${appState.studentIds.length} 個有效座位。`);
		}
	}
	renderScreen('seatConfig'); // 重新渲染當前畫面
}

// 處理分群設定畫面的座位點擊事件
export function handleGroupingSetupClick(event) {
	const row = parseInt(event.target.dataset.row);
	const col = parseInt(event.target.dataset.col);
	const seat = appState.seats[row][col];

	if (seat.isValid) { // 只能點選有效座位
		seat.isTempSelectedForGrouping = !seat.isTempSelectedForGrouping;
		renderScreen('groupingSetup'); // 重新渲染當前畫面
	}
}

// 處理分配選取座位至群組
export function handleAssignSelectedSeatsToGroup() {
	const groupSelect = document.getElementById('group-select');
	const selectedGroup = groupSelect.value;

	if (!selectedGroup) {
		alert('請選擇一個群組！');
		return;
	}

	let assignedCount = 0;
	appState.seats.forEach(row => {
		row.forEach(seat => {
			if (seat.isTempSelectedForGrouping) {
				seat.groupId = selectedGroup;
				seat.isTempSelectedForGrouping = false; // 分配後清除臨時選取狀態
				assignedCount++;
			}
		});
	});
	if (assignedCount > 0) {
		alert(`已將 ${assignedCount} 個選取座位分配到群組 "${selectedGroup}"。`);
	} else {
		alert('沒有選取任何座位可供分配。');
	}
	renderScreen('groupingSetup'); // 重新渲染當前畫面
}

// 處理取消選取 (清除淺綠色狀態)
export function handleClearTempSelection() {
	appState.seats.forEach(row => row.forEach(seat => seat.isTempSelectedForGrouping = false));
	renderScreen('groupingSetup'); // 重新渲染當前畫面
}

// 處理新增群組
export function handleAddGroup() {
	const groupNameInput = document.getElementById('group-name-input');
	const groupName = groupNameInput.value.trim();
	if (groupName && !appState.groups.includes(groupName)) {
		appState.groups.push(groupName);
		groupNameInput.value = '';
		updateControlPanel();
		renderScreen('groupingSetup'); // 重新渲染分群畫面以更新群組列表
	} else if (groupName) {
		alert('群組名稱已存在！');
	}
}

// 處理刪除群組
export function handleDeleteGroup(event) {
	const groupToDelete = event.target.dataset.group;
	appState.groups = appState.groups.filter(g => g !== groupToDelete);
	// 同步更新座位數據，移除已刪除群組的關聯
	appState.seats.forEach(row => {
		row.forEach(seat => {
			if (seat.groupId === groupToDelete) {
				seat.groupId = undefined;
			}
		});
	});
	// 同步更新條件數據，移除已刪除群組的關聯
	appState.conditions = appState.conditions.filter(c => c.group !== groupToDelete);
	renderScreen('groupingSetup'); // 重新渲染分群畫面以反映群組顏色變化和列表
	updateControlPanel();
}

// 處理條件類型變化
export function handleConditionTypeChange(event) {
	const conditionType = event.target.value;
	const conditionGroupInput = document.getElementById('condition-group-input');
	const conditionStudentsLabel = document.querySelector('label[for="condition-students"]');

	if (conditionType === 'assign_group' || conditionType === 'adjacent_and_group') {
		conditionGroupInput.style.display = 'block';
		if (conditionType === 'assign_group') {
			conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: 1 或 (1, 5)):';
		} else { // adjacent_and_group
			conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: (1, 5)):';
		}
	} else if (conditionType === 'adjacent' || conditionType === 'not_adjacent') {
		conditionGroupInput.style.display = 'none';
		conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: (1, 5), (7, 8)):';
	} else if (conditionType === 'group_area') {
		conditionGroupInput.style.display = 'none';
		conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: 1, 2, 3, 4):';
	} else {
		conditionGroupInput.style.display = 'none';
		conditionStudentsLabel.textContent = '學生編號 (逗號分隔):';
	}
}

// 處理新增條件
export function handleAddCondition() {
	const conditionType = document.getElementById('condition-type').value;
	const studentsInput = document.getElementById('condition-students').value.trim();
	let parsedStudents = [];

	if (conditionType === 'adjacent' || conditionType === 'not_adjacent') {
		// 解析 (A, B), (C, D) 格式
		const regex = /\((\d+),\s*(\d+)\)/g;
		let match;
		while ((match = regex.exec(studentsInput)) !== null) {
			const student1 = parseInt(match[1]);
			const student2 = parseInt(match[2]);
			if (!isNaN(student1) && student1 >= 1 && student1 <= appState.studentCount &&
				!isNaN(student2) && student2 >= 1 && student2 <= appState.studentCount) {
				parsedStudents.push([student1, student2]);
			}
		}
		if (parsedStudents.length === 0 && studentsInput.length > 0) {
			alert('「坐在一起」或「不能坐在一起」條件的學生編號格式不正確，請使用 (A, B), (C, D) 格式。');
			return;
		}
	} else if (conditionType === 'group_area' || conditionType === 'assign_group' || conditionType === 'adjacent_and_group') {
		// 解析 1, 2, 3, 4 或 1 格式
		const students = studentsInput.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s >= 1 && s <= appState.studentCount);
		if (students.length === 0) {
			alert('請輸入有效的學生編號！');
			return;
		}
		parsedStudents.push(students); // 即使只有一個學生，也包裝成 [[studentId]]
	}

	if (parsedStudents.length === 0) {
		alert('請輸入有效的學生編號！');
		return;
	}

	let newCondition = new Condition(
		Date.now().toString(), // 簡單的唯一 ID
		conditionType,
		parsedStudents // 現在是 number[][]
	);

	if (conditionType === 'assign_group' || conditionType === 'adjacent_and_group') {
		const conditionGroupSelect = document.getElementById('condition-group-select');
		const selectedGroup = conditionGroupSelect.value;
		if (!selectedGroup) {
			alert('請為指定區域或指定區域且坐在一起條件選擇一個群組！');
			return;
		}
		newCondition.group = selectedGroup;
	}

	appState.conditions.push(newCondition);
	document.getElementById('condition-students').value = '';
	updateControlPanel();
}

// 處理刪除條件
export function handleDeleteCondition(event) {
	const conditionIdToDelete = event.target.dataset.conditionId;
	appState.conditions = appState.conditions.filter(c => c.id !== conditionIdToDelete);
	updateControlPanel();
}