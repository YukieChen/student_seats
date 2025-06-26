// handlers.js - 事件處理函數

import { appState, Seat, Condition } from './state.js';
import { renderScreen, updateControlPanel, updateStudentGroupList, updateGroupingSetupGrid } from './ui.js';
import { downloadConfig, uploadConfig, getConditionDescription, parseStudentIdsString } from './utils.js'; // 引入 parseStudentIdsString
import { startAssignment } from './algorithms.js';
import { showPreAssignmentWarning } from './ui.js'; // 引入新的 UI 警告函數

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
		updateGroupingSetupGrid(document.getElementById('main-grid-area')); // 只更新網格
	}
}

// 處理群組選擇下拉選單的變更事件
export function handleGroupSelectChange(event) {
	appState.selectedGroupIdForGrouping = event.target.value;
	// 不需要重新渲染整個畫面，因為選擇狀態已經在 appState 中更新，並且在 renderGroupingSetupScreen 時會被正確設定
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
	updateGroupingSetupGrid(document.getElementById('main-grid-area')); // 只更新網格
}

// 處理取消選取 (清除淺綠色狀態)
export function handleClearTempSelection() {
	appState.seats.forEach(row => row.forEach(seat => seat.isTempSelectedForGrouping = false));
	updateGroupingSetupGrid(document.getElementById('main-grid-area')); // 只更新網格
}

// 處理新增群組
export function handleAddGroup() {
	const groupNameInput = document.getElementById('group-name-input');
	const groupName = groupNameInput.value.trim();
	if (groupName && !appState.groups.includes(groupName)) {
		appState.groups.push(groupName);
		groupNameInput.value = '';
		updateControlPanel(); // 更新左側面板的群組列表
		// 不需要重新渲染整個畫面，因為 updateControlPanel 會處理群組列表的更新
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
	// 移除與該座位群組相關的學生群組綁定
	if (appState.groupSeatAssignments[groupToDelete]) {
		delete appState.groupSeatAssignments[groupToDelete];
	}
	updateGroupingSetupGrid(document.getElementById('main-grid-area')); // 更新網格以反映群組顏色變化
	updateControlPanel(); // 更新左側面板的群組列表
}

// 處理學生群組與座位分群的綁定
export function handleAssignStudentGroupToSeatGroup(event) {
	const seatGroupId = event.target.dataset.groupId;
	const studentGroupName = event.target.value;

	if (studentGroupName) {
		appState.groupSeatAssignments[seatGroupId] = studentGroupName;
	} else {
		delete appState.groupSeatAssignments[seatGroupId]; // 如果選擇空值，則移除綁定
	}
	updateGroupingSetupGrid(document.getElementById('main-grid-area')); // 更新網格以更新 UI 顯示
	updateControlPanel(); // 更新左側面板的群組列表
}

// 處理條件類型變化
export function handleConditionTypeChange(event) {
	const conditionType = event.target.value;
	const conditionGroupInput = document.getElementById('condition-group-input');
	const conditionStudentGroupInput = document.getElementById('condition-student-group-input'); // 新增
	const conditionStudentsInput = document.getElementById('condition-students');
	const conditionStudentsLabel = document.querySelector('label[for="condition-students"]');

	// 預設隱藏所有相關輸入
	conditionGroupInput.style.display = 'none';
	if (conditionStudentGroupInput) conditionStudentGroupInput.style.display = 'none'; // 新增
	conditionStudentsInput.style.display = 'block';
	conditionStudentsLabel.style.display = 'block';

	switch (conditionType) {
		case 'adjacent':
		case 'not_adjacent':
			conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: (1, 5), (7, 8)):';
			break;
		case 'group_area':
			conditionStudentsLabel.textContent = '學生編號 (逗號分隔，例如: 1, 2, 3, 4):';
			break;
		case 'assign_group':
		case 'adjacent_and_group':
			conditionGroupInput.style.display = 'block';
			conditionStudentsLabel.textContent = (conditionType === 'assign_group') ?
				'學生編號 (逗號分隔，例如: 1 或 (1, 5)):' :
				'學生編號 (逗號分隔，例如: (1, 5)):';
			break;
		case 'assign_student_group_to_seat_group': // 新增條件類型
			if (conditionStudentGroupInput) conditionStudentGroupInput.style.display = 'block'; // 顯示學生群組選擇器
			conditionGroupInput.style.display = 'block';       // 顯示座位群組選擇器
			conditionStudentsInput.style.display = 'none';     // 隱藏學生編號輸入框
			conditionStudentsLabel.style.display = 'none';     // 隱藏學生編號標籤
			break;
		default:
			conditionStudentsLabel.textContent = '學生編號 (逗號分隔):';
	}
	updateControlPanel(); // 確保更新群組選擇器內容
}

// 處理新增條件
export function handleAddCondition() {
	const conditionType = document.getElementById('condition-type').value;
	const studentsInput = document.getElementById('condition-students').value.trim();
	const conditionGroupSelect = document.getElementById('condition-group-select');
	const conditionStudentGroupSelect = document.getElementById('condition-student-group-select'); // 新增

	let parsedStudents = [];
	let selectedGroup = undefined;
	let selectedStudentGroup = undefined; // 新增

	if (conditionType === 'assign_student_group_to_seat_group') { // 新增條件類型處理
		selectedStudentGroup = conditionStudentGroupSelect ? conditionStudentGroupSelect.value : '';
		selectedGroup = conditionGroupSelect ? conditionGroupSelect.value : '';

		if (!selectedStudentGroup) {
			alert('請選擇一個學生群組！');
			return;
		}
		if (!selectedGroup) {
			alert('請選擇一個座位群組！');
			return;
		}
		parsedStudents = []; // 對於此類型，學生編號陣列可以為空
	} else {
		if (conditionType === 'adjacent' || conditionType === 'not_adjacent') {
			// 解析 (A, B), (C, D) 格式
			const regex = /\((\d+),\s*(\d+)\)/g;
			let match;
			while ((match = regex.exec(studentsInput)) !== null) {
				const student1 = parseInt(match[1]);
				const student2 = parseInt(match[2]);
				if (!isNaN(student1) && appState.studentIds.includes(student1) &&
					!isNaN(student2) && appState.studentIds.includes(student2)) {
					parsedStudents.push([student1, student2]);
				}
			}
			if (parsedStudents.length === 0 && studentsInput.length > 0) {
				alert('「坐在一起」或「不能坐在一起」條件的學生編號格式不正確，請使用 (A, B), (C, D) 格式。');
				return;
			}
		} else if (conditionType === 'group_area' || conditionType === 'assign_group' || conditionType === 'adjacent_and_group') {
			// 解析 1, 2, 3, 4 或 1 格式
			const students = studentsInput.split(',').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && appState.studentIds.includes(s));
			if (students.length === 0 && studentsInput.length > 0) {
				alert('請輸入有效的學生編號！');
				return;
			}
			parsedStudents.push(students); // 即使只有一個學生，也包裝成 [[studentId]]

			if (conditionType === 'assign_group' || conditionType === 'adjacent_and_group') {
				selectedGroup = conditionGroupSelect ? conditionGroupSelect.value : '';
				if (!selectedGroup) {
					alert('請為指定區域或指定區域且坐在一起條件選擇一個群組！');
					return;
				}
			}
		}
	}

	if (parsedStudents.length === 0 && studentsInput.length > 0 && conditionType !== 'assign_student_group_to_seat_group') {
		alert('請輸入有效的學生編號！');
		return;
	}

	let newCondition = new Condition(
		Date.now().toString(),
		conditionType,
		parsedStudents,
		selectedGroup,
		selectedStudentGroup // 傳入學生群組名稱
	);

	appState.conditions.push(newCondition);
	document.getElementById('condition-students').value = '';
	// 重置選擇器
	if (conditionGroupSelect) conditionGroupSelect.value = '';
	if (conditionStudentGroupSelect) conditionStudentGroupSelect.value = ''; // 新增
	updateControlPanel();
}

// 處理刪除條件
export function handleDeleteCondition(event) {
	const conditionIdToDelete = event.target.dataset.conditionId;
	appState.conditions = appState.conditions.filter(c => c.id !== conditionIdToDelete);
	updateControlPanel();
}

// 新增/更新學生群組
export function handleAddStudentGroup() {
	const groupNameInput = document.getElementById('group-name-input-student');
	const studentIdsInput = document.getElementById('student-ids-input-group');

	const groupName = groupNameInput.value.trim();
	const studentIdsString = studentIdsInput.value.trim();

	if (!groupName) {
		alert('請輸入群組名稱！');
		return;
	}

	const parsedStudentIds = parseStudentIdsString(studentIdsString);

	if (parsedStudentIds.length === 0) {
		alert('請輸入有效的學生座號！');
		return;
	}

	appState.studentGroups[groupName] = parsedStudentIds;
	groupNameInput.value = '';
	studentIdsInput.value = '';
	updateStudentGroupList(); // 更新 UI
}

// 刪除學生群組
export function handleDeleteStudentGroup(event) {
	const groupToDelete = event.target.dataset.groupName;
	if (groupToDelete && appState.studentGroups[groupToDelete]) {
		if (confirm(`確定要刪除群組 "${groupToDelete}" 嗎？這將會移除所有與此群組相關的學生分群設定。`)) {
			delete appState.studentGroups[groupToDelete];
			// 同步移除所有與此學生群組相關的座位群組綁定
			for (const seatGroupId in appState.groupSeatAssignments) {
				if (appState.groupSeatAssignments[seatGroupId] === groupToDelete) {
					delete appState.groupSeatAssignments[seatGroupId];
				}
			}
			updateStudentGroupList(); // 更新 UI
			updateControlPanel(); // 更新座位分群綁定顯示
		}
	} else if (!groupToDelete) {
		// 如果是從輸入框觸發的刪除按鈕，則從輸入框獲取群組名稱
		const groupNameInput = document.getElementById('group-name-input-student');
		const groupName = groupNameInput.value.trim();
		if (groupName && appState.studentGroups[groupName]) {
			if (confirm(`確定要刪除群組 "${groupName}" 嗎？這將會移除所有與此群組相關的學生分群設定。`)) {
				delete appState.studentGroups[groupName];
				// 同步移除所有與此學生群組相關的座位群組綁定
				for (const seatGroupId in appState.groupSeatAssignments) {
					if (appState.groupSeatAssignments[seatGroupId] === groupName) {
						delete appState.groupSeatAssignments[seatGroupId];
					}
				}
				groupNameInput.value = '';
				document.getElementById('student-ids-input-group').value = '';
				updateStudentGroupList(); // 更新 UI
				updateControlPanel(); // 更新座位分群綁定顯示
			}
		} else {
			alert('請輸入要刪除的群組名稱，或點擊列表中群組旁的刪除按鈕。');
		}
	}
}

/**
 * 執行排位前檢查，檢查學生群組與座位分群的綁定是否合理。
 * @returns {Array<Object>} 包含不合理綁定資訊的陣列。
 *   每個物件包含: { studentGroupName, seatGroupId, studentCount, availableSeatsCount }
 */
function checkPreAssignmentConditions() {
	const inconsistencies = [];

	for (const seatGroupId in appState.groupSeatAssignments) {
		const studentGroupName = appState.groupSeatAssignments[seatGroupId];

		// 獲取學生群組的學生人數
		const studentIdsInGroup = appState.studentGroups[studentGroupName];
		const studentCount = studentIdsInGroup ? studentIdsInGroup.length : 0;

		// 計算對應座位分群的可用座位數
		let availableSeatsCount = 0;
		appState.seats.forEach(row => {
			row.forEach(seat => {
				if (seat.isValid && seat.groupId === seatGroupId) {
					availableSeatsCount++;
				}
			});
		});

		if (studentCount > availableSeatsCount) {
			inconsistencies.push({
				studentGroupName: studentGroupName,
				seatGroupId: seatGroupId,
				studentCount: studentCount,
				availableSeatsCount: availableSeatsCount
			});
		}
	}
	return inconsistencies;
}