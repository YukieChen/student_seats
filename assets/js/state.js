// state.js - 應用程式狀態管理

export let appState = {
	currentScreen: 'initialSetup', // 初始畫面為 'initialSetup'
	seats: [],                   // 7x7 的 Seat 對象陣列
	groups: [],                  // 字符串陣列，例如: ['第一組', '第二組']
	conditions: [],              // Condition 對象陣列
	studentCount: 0,             // 學生人數，由使用者設定
	studentIds: [],              // 學生座號列表，例如: [1, 3, 4, ..., 36]
	selectedValidSeatsCount: 0   // 已選取的有效座位數量
};

// Seat 對象結構 (每個網格單元)
export class Seat {
	constructor(row, col) {
		this.row = row;
		this.col = col;
		this.isValid = false;                 // 是否為有效座位 (可供學生坐)
		this.isTempSelectedForGrouping = false; // 在分群設定畫面中是否被臨時選中 (淺綠色)
		this.groupId = undefined;             // 所屬群組的 ID (字符串，例如 '第一組')
		this.studentId = undefined;           // 已分配的學生 ID (數字 1-35)
	}
}

// Condition 對象結構
export class Condition {
	constructor(id, type, students, group = undefined) {
		this.id = id;                       // 唯一 ID，用於刪除
		this.type = type;                   // 條件類型: 'adjacent', 'group_area', 'not_adjacent', 'assign_group', 'adjacent_and_group'
		this.students = students;           // 學生編號陣列，格式根據 type 變化
		// 'adjacent', 'not_adjacent': [[s1, s2], [s3, s4]]
		// 'group_area': [[s1, s2, s3, s4]]
		// 'assign_group', 'adjacent_and_group': [[s1], [s2]] 或 [[s1, s2]]
		this.group = group;                 // 僅當 type 為 'assign_group' 或 'adjacent_and_group' 時有效
	}
}

// 初始化應用程式狀態 (在應用程式啟動時呼叫一次)
export function initializeAppState() {
	appState.currentScreen = 'initialSetup';
	appState.seats = [];
	appState.groups = [];
	appState.conditions = [];
	appState.studentCount = 0;
	appState.studentIds = [];
	appState.selectedValidSeatsCount = 0;
}

// 初始化座位網格數據 (在設定學生人數後呼叫)
export function initializeSeats(rows = 9, cols = 9) { // 預設為 9x9
	appState.seats = Array(rows).fill(null).map((_, row) =>
		Array(cols).fill(null).map((_, col) => new Seat(row, col))
	);
	appState.selectedValidSeatsCount = 0; // 重置已選座位數
}

// 更新 appState 的函數 (用於從其他模組修改狀態)
export function updateAppState(newState) {
	Object.assign(appState, newState);
}