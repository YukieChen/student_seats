// state.js - 應用程式狀態管理

export let appState = {
	currentScreen: 'initialSetup', // 初始畫面為 'initialSetup'
	seats: [],                   // 7x7 的 Seat 對象陣列
	groups: [],                  // 字符串陣列，例如: ['第一組', '第二組']
	selectedGroupIdForGrouping: undefined, // 新增：在分群設定畫面中選定的群組 ID
	studentGroups: {},           // 新增：用於儲存學生群組，例如 { "矮個子學生": [1, 3, 5], "高個子學生": [2, 4, 6] }
	groupSeatAssignments: {},    // 新增：用於儲存學生群組與座位分群的綁定關係，例如 { "front_row_group_id": "矮個子學生", "back_row_group_id": "高個子學生" }
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
	constructor(id, type, students, group = undefined, studentGroupName = undefined) { // 新增 studentGroupName 參數
		this.id = id;
		this.type = type;
		this.students = students;
		this.group = group;
		this.studentGroupName = studentGroupName; // 新增：用於儲存學生群組名稱
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