// utils.js - 通用輔助函數

import { appState, Seat, Condition } from './state.js';
import { renderScreen } from './ui.js';

// 輔助函式：判斷兩個座位是否左右相鄰
export function areSeatsAdjacentHorizontal(seat1, seat2) {
	return seat1.row === seat2.row && (seat1.col === seat2.col - 1 || seat1.col === seat2.col + 1);
}

// 輔助函式：判斷兩個座位是否前後左右相鄰 (包括斜對角)
export function areSeatsAdjacentAllDirections(seat1, seat2) {
	const rowDiff = Math.abs(seat1.row - seat2.row);
	const colDiff = Math.abs(seat1.col - seat2.col);
	return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
}

// 輔助函式：獲取指定座位周圍的有效座位
export function getNeighboringValidSeats(seat, allSeats) {
	const neighbors = [];
	for (let dRow = -1; dRow <= 1; dRow++) {
		for (let dCol = -1; dCol <= 1; dCol++) {
			if (dRow === 0 && dCol === 0) continue; // 排除自身

			const nRow = seat.row + dRow;
			const nCol = seat.col + dCol;

			if (nRow >= 0 && nRow < allSeats.length && nCol >= 0 && nCol < allSeats[0].length) {
				const neighborSeat = allSeats[nRow][nCol];
				if (neighborSeat.isValid) {
					neighbors.push(neighborSeat);
				}
			}
		}
	}
	return neighbors;
}

// 輔助函式：獲取條件描述
export function getConditionDescription(condition) {
	let desc = '';
	const studentsStr = condition.students.map(group => {
		if (group.length === 1) {
			return group[0];
		} else {
			return `(${group.join(', ')})`;
		}
	}).join(', ');

	switch (condition.type) {
		case 'adjacent':
			desc = `學生 ${studentsStr} 必須左右相鄰`;
			break;
		case 'group_area':
			desc = `學生 ${studentsStr} 必須在同一區域內`;
			break;
		case 'not_adjacent':
			desc = `學生 ${studentsStr} 之間必須至少隔一人`;
			break;
		case 'assign_group':
			desc = `學生 ${studentsStr} 必須坐在群組 ${condition.group} 的座位`;
			break;
		case 'adjacent_and_group':
			desc = `學生 ${studentsStr} 必須左右相鄰，且兩人都必須在群組 ${condition.group} 的座位`;
			break;
	}
	return desc;
}

// 下載設定
export function downloadConfig() {
	const config = {
		studentCount: appState.studentCount, // 新增學生總人數
		studentIds: appState.studentIds,     // 新增學生座號列表
		seats: appState.seats.map(row => row.map(seat => ({
			row: seat.row,
			col: seat.col,
			isValid: seat.isValid,
			groupId: seat.groupId
			// studentId 和 isTempSelectedForGrouping 不儲存，因為是安排結果或臨時狀態
		}))),
		groups: appState.groups,
		studentGroups: appState.studentGroups, // 新增學生分群資料
		groupSeatAssignments: appState.groupSeatAssignments, // 新增學生群組與座位分群綁定資料
		conditions: appState.conditions
	};
	const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute("href", dataStr);
	downloadAnchorNode.setAttribute("download", "seat_config.json");
	document.body.appendChild(downloadAnchorNode);
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

// 上傳設定
export function uploadConfig(event) {
	const file = event.target.files[0];
	if (file) {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const loadedConfig = JSON.parse(e.target.result);
				// 載入學生人數和座號
				if (typeof loadedConfig.studentCount === 'number' && loadedConfig.studentCount >= 0) {
					appState.studentCount = loadedConfig.studentCount;
				} else {
					appState.studentCount = 0;
				}
				if (loadedConfig.studentIds && Array.isArray(loadedConfig.studentIds)) {
					appState.studentIds = loadedConfig.studentIds;
				} else {
					appState.studentIds = [];
				}

				// 載入座位佈局
				if (loadedConfig.seats && Array.isArray(loadedConfig.seats) && loadedConfig.seats.length > 0) { // 允許非 7x7
					// 重新初始化座位網格以匹配載入的尺寸
					const rows = loadedConfig.seats.length;
					const cols = loadedConfig.seats[0].length;
					appState.seats = Array(rows).fill(null).map((_, r) =>
						Array(cols).fill(null).map((_, c) => {
							const loadedSeat = loadedConfig.seats[r][c];
							const seat = new Seat(loadedSeat.row, loadedSeat.col);
							seat.isValid = loadedSeat.isValid;
							seat.groupId = loadedSeat.groupId;
							return seat;
						})
					);
					appState.selectedValidSeatsCount = appState.seats.flat().filter(seat => seat.isValid).length;
				} else {
					// 如果沒有座位數據，則初始化一個空的 7x7 網格
					appState.seats = Array(7).fill(null).map((_, row) =>
						Array(7).fill(null).map((_, col) => new Seat(row, col))
					);
					appState.selectedValidSeatsCount = 0;
				}

				// 載入群組
				if (loadedConfig.groups && Array.isArray(loadedConfig.groups)) {
					appState.groups = loadedConfig.groups;
				} else {
					appState.groups = [];
				}

				// 載入學生分群資料
				if (loadedConfig.studentGroups && typeof loadedConfig.studentGroups === 'object' && !Array.isArray(loadedConfig.studentGroups)) {
					appState.studentGroups = loadedConfig.studentGroups;
				} else {
					appState.studentGroups = {};
				}

				// 載入學生群組與座位分群綁定資料
				if (loadedConfig.groupSeatAssignments && typeof loadedConfig.groupSeatAssignments === 'object' && !Array.isArray(loadedConfig.groupSeatAssignments)) {
					appState.groupSeatAssignments = loadedConfig.groupSeatAssignments;
				} else {
					appState.groupSeatAssignments = {};
				}

				// 載入條件
				if (loadedConfig.conditions && Array.isArray(loadedConfig.conditions)) {
					// 確保載入的 conditions.students 格式正確 (number[][])
					appState.conditions = loadedConfig.conditions.map(c => new Condition(
						c.id,
						c.type,
						c.students.map(sGroup => Array.isArray(sGroup) ? sGroup : [sGroup]), // 確保是二維陣列
						c.group
					));
				} else {
					appState.conditions = [];
				}

				alert('設定檔載入成功！');
				console.log('--- uploadConfig 載入後狀態 ---');
				console.log('loadedConfig:', loadedConfig);
				console.log('appState.studentCount:', appState.studentCount);
				console.log('appState.studentIds.length:', appState.studentIds.length);
				console.log('appState.selectedValidSeatsCount:', appState.selectedValidSeatsCount);

				// 載入成功後，根據載入的數據決定跳轉到哪個畫面
				if (appState.studentCount > 0 && appState.studentIds.length > 0 && appState.selectedValidSeatsCount > 0) {
					console.log('跳轉到: assignment');
					renderScreen('assignment'); // 如果有學生和座位，直接跳到安排畫面
				} else if (appState.studentCount > 0 && appState.studentIds.length > 0) {
					console.log('跳轉到: studentGrouping'); // 如果有學生但沒座位，跳到學生分群設定
					renderScreen('studentGrouping');
				} else {
					console.log('跳轉到: initialSetup');
					renderScreen('initialSetup'); // 如果沒有學生數據，回到初始設定
				}
			} catch (error) {
				alert('載入設定檔失敗：' + error.message);
				console.error('載入設定檔錯誤:', error);
			}
		};
		reader.readAsText(file);
	}
}
// 輔助函式：解析學生 ID 字串 (已確認導出)
export function parseStudentIdsString(studentIdsString) {
	return studentIdsString.split(',')
		.map(s => parseInt(s.trim()))
		.filter(id => !isNaN(id) && appState.studentIds.includes(id));
}