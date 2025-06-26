// ui.js - 介面渲染相關函數

import { appState, initializeSeats } from './state.js';
import { handleSeatConfigClick, handleGroupingSetupClick, handleAddGroup, handleAssignSelectedSeatsToGroup, handleClearTempSelection, handleDeleteGroup, handleConditionTypeChange, handleAddCondition, handleDeleteCondition } from './handlers.js';
import { downloadConfig, uploadConfig } from './utils.js';
import { startAssignment } from './algorithms.js';

// 新增輔助函數來解析學生編號字串
function parseStudentIdsString(studentIdsString) {
	let parsedIds = [];
	if (studentIdsString) {
		const parts = studentIdsString.split(',').map(s => s.trim());
		for (const part of parts) {
			if (part.includes('-')) {
				const [start, end] = part.split('-').map(Number);
				if (!isNaN(start) && !isNaN(end) && start <= end) {
					for (let i = start; i <= end; i++) {
						parsedIds.push(i);
					}
				}
			} else {
				const id = parseInt(part);
				if (!isNaN(id)) {
					parsedIds.push(id);
				}
			}
		}
		// 使用 Set 去重並排序
		parsedIds = [...new Set(parsedIds)].sort((a, b) => a - b);
	}
	return parsedIds;
}

// 渲染畫面
export function renderScreen(screenName) {
	appState.currentScreen = screenName;
	const initialSetupScreen = document.getElementById('initial-setup-screen');
	const mainGridArea = document.getElementById('main-grid-area');
	const leftPanel = document.getElementById('left-panel');
	const rightPanel = document.getElementById('right-panel');

	// 隱藏所有面板
	initialSetupScreen.style.display = 'none';
	mainGridArea.style.display = 'none';
	leftPanel.style.display = 'none';
	rightPanel.style.display = 'none';

	// 清空所有面板內容 (除了 initialSetupScreen，因為它會被重新渲染)
	mainGridArea.innerHTML = '';
	leftPanel.innerHTML = '';
	rightPanel.innerHTML = '';

	switch (screenName) { // 使用傳入的 screenName
		case 'initialSetup':
			initialSetupScreen.style.display = 'flex'; // 顯示初始設定畫面
			renderInitialSetupScreen(initialSetupScreen);
			break;
		case 'seatConfig':
			mainGridArea.style.display = 'grid'; // 顯示網格
			leftPanel.style.display = 'block';
			rightPanel.style.display = 'block';
			renderSeatConfigScreen(mainGridArea, leftPanel, rightPanel);
			break;
		case 'groupingSetup':
			mainGridArea.style.display = 'grid'; // 顯示網格
			leftPanel.style.display = 'block';
			rightPanel.style.display = 'block';
			renderGroupingSetupScreen(mainGridArea, leftPanel, rightPanel);
			break;
		case 'assignment':
			mainGridArea.style.display = 'grid'; // 顯示網格
			leftPanel.style.display = 'block';
			rightPanel.style.display = 'block';
			renderAssignmentScreen(mainGridArea, leftPanel, rightPanel);
			break;
	}
}

// 渲染初始設定畫面
function renderInitialSetupScreen(initialSetupScreen) {
	initialSetupScreen.innerHTML = `
	       <div class="control-section">
	           <h3>班級學生設定</h3>
	           <div class="input-group">
	               <label for="student-count-input">班級總人數:</label>
	               <input type="number" id="student-count-input" value="${appState.studentCount}" min="1" max="100">
	           </div>
	           <div class="input-group">
	               <label for="student-ids-input">學生座號 (逗號分隔或範圍，例如: 1, 3-7, 9-12, 14-36):</label>
	               <input type="text" id="student-ids-input" placeholder="例如: 1-35" value="${appState.studentIds.join(', ')}">
	           </div>
	           <button class="button" id="start-seat-config-button">開始座位配置</button>
	           <div class="control-section" style="margin-top: 20px;">
	               <h3>設定檔操作</h3>
	               <input type="file" id="upload-config-input" accept=".json" style="display: none;">
	               <button class="button" id="upload-config-button">上傳設定</button>
	           </div>
	       </div>
	   `;

	document.getElementById('start-seat-config-button').addEventListener('click', () => {
		const studentCountInput = document.getElementById('student-count-input');
		const studentIdsInput = document.getElementById('student-ids-input');

		const newStudentCount = parseInt(studentCountInput.value);
		const studentIdsString = studentIdsInput.value.trim();

		if (isNaN(newStudentCount) || newStudentCount <= 0) {
			alert('請輸入有效的班級總人數！');
			return;
		}

		const parsedStudentIds = parseStudentIdsString(studentIdsString); // 使用輔助函數

		if (parsedStudentIds.length === 0) {
			alert('請輸入有效的學生座號！');
			return;
		}

		appState.studentIds = parsedStudentIds; // 更新 appState 中的學生座號列表
		appState.studentCount = parsedStudentIds.length; // 確保 studentCount 反映 studentIds 的實際數量

		// 驗證 studentCount 和 studentIds 的一致性
		if (newStudentCount !== appState.studentCount) {
			alert(`班級總人數 (${newStudentCount}) 與解析出的學生座號數量 (${appState.studentCount}) 不符。請重新輸入。`);
			return; // 阻止進入下一個畫面
		}

		// 初始化座位網格 (如果尚未初始化或需要重置)
		if (appState.seats.length === 0 || appState.seats[0].length === 0) {
			initializeSeats(9, 9); // 預設 9x9
		} else {
			// 如果已經有座位，重置有效座位數
			appState.selectedValidSeatsCount = appState.seats.flat().filter(seat => seat.isValid).length;
		}

		renderScreen('seatConfig'); // 進入座位配置畫面
	});

	document.getElementById('upload-config-button').addEventListener('click', () => document.getElementById('upload-config-input').click());
	document.getElementById('upload-config-input').addEventListener('change', uploadConfig);
}

// 渲染座位佈局設定畫面
function renderSeatConfigScreen(mainGridArea, leftPanel, rightPanel) {
	console.log('--- renderSeatConfigScreen 渲染時狀態 ---');
	console.log('appState.studentCount:', appState.studentCount);
	console.log('appState.selectedValidSeatsCount:', appState.selectedValidSeatsCount);

	// 中央座位網格
	let seatGridHtml = `
        <div class="seat-grid">
    `;
	appState.seats.forEach(row => {
		row.forEach(seat => {
			const isValidClass = seat.isValid ? 'is-valid' : '';
			seatGridHtml += `
                <div class="seat ${isValidClass}" data-row="${seat.row}" data-col="${seat.col}">
                    ${seat.isValid ? '✔' : ''}
                </div>
            `;
		});
	});
	seatGridHtml += `
        </div>
        <p>已選座位：<span id="selected-seats-count">${appState.selectedValidSeatsCount}</span>/${appState.studentCount}</p>
        <button class="button" id="next-to-grouping-button">下一步：設定分群</button>
    `;
	mainGridArea.innerHTML = seatGridHtml;

	// 左側控制面板 (簡化，只顯示下載/上傳)
	leftPanel.innerHTML = `
        <div class="control-section">
            <h3>設定檔操作</h3>
            <button class="button" id="download-config-button">下載設定</button>
        </div>
    `;

	// 右側面板 (此畫面暫時留空或顯示提示)
	rightPanel.innerHTML = `
        <div class="result-section">
            <h3>提示</h3>
            <p>請先設定有效座位。</p>
        </div>
    `;

	// 添加事件監聽器
	document.querySelectorAll('.seat').forEach(seatElement => {
		seatElement.addEventListener('click', handleSeatConfigClick);
	});
	document.getElementById('next-to-grouping-button').addEventListener('click', () => {
		if (appState.selectedValidSeatsCount === 0) {
			alert('請至少選擇一個有效座位才能進入分群設定。');
			return;
		}
		renderScreen('groupingSetup');
	});
	document.getElementById('download-config-button').addEventListener('click', downloadConfig);
}

// 渲染分群設定畫面
function renderGroupingSetupScreen(mainGridArea, leftPanel, rightPanel) {
	// 中央座位網格
	let seatGridHtml = `
        <div class="seat-grid">
    `;
	appState.seats.forEach(row => {
		row.forEach(seat => {
			let seatClass = '';
			let seatContent = '';
			if (!seat.isValid) {
				seatClass = 'is-invalid'; // 非有效座位顯示為淺灰色
			} else {
				if (seat.isTempSelectedForGrouping) {
					seatClass = 'is-temp-selected-for-grouping'; // 臨時選取座位顯示淺綠色
				} else if (seat.groupId) {
					// 根據群組ID添加群組顏色類別
					seatClass = `group-${seat.groupId.replace(/\s/g, '-')}`; // 將空格替換為連字號，以符合CSS類名
					seatContent = seat.groupId; // 顯示群組名稱
				} else {
					seatClass = 'is-valid-dark'; // 有效座位但未分群顯示深灰色
				}
			}

			seatGridHtml += `
                <div class="seat ${seatClass}" data-row="${seat.row}" data-col="${seat.col}">
                    ${seatContent}
                </div>
            `;
		});
	});
	seatGridHtml += `
        </div>
        <button class="button" id="next-to-assignment-button">下一步：設定條件</button>
    `;
	mainGridArea.innerHTML = seatGridHtml;

	// 左側控制面板 (分群管理)
	leftPanel.innerHTML = `
        <div class="control-section">
            <h3>群組管理</h3>
            <div class="input-group">
                <label for="group-name-input">新增群組名稱:</label>
                <input type="text" id="group-name-input" placeholder="例如: 第一組">
                <button class="button" id="add-group-button">新增群組</button>
            </div>
            <div class="input-group">
                <label for="group-select">選擇群組:</label>
                <select id="group-select">
                    <option value="">-- 選擇群組 --</option>
                    ${appState.groups.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
                <button class="button" id="assign-selected-to-group-button">分配選取座位至群組</button>
                <button class="button" id="clear-temp-selection-button">取消選取</button>
            </div>
            <h4>已定義群組:</h4>
            <ul id="group-list">
                ${appState.groups.map(g => `<li>${g} <button class="button delete" data-group="${g}">刪除</button></li>`).join('')}
            </ul>
        </div>
        <button class="button" id="back-to-seat-config-button">返回座位配置</button>
    `;

	// 右側面板 (此畫面暫時留空或顯示提示)
	rightPanel.innerHTML = `
        <div class="result-section">
            <h3>提示</h3>
            <p>請選取座位並分配群組。</p>
        </div>
    `;

	// 添加事件監聽器
	document.querySelectorAll('.seat').forEach(seatElement => {
		seatElement.addEventListener('click', handleGroupingSetupClick);
	});
	document.getElementById('back-to-seat-config-button').addEventListener('click', () => {
		// 清除所有臨時選取狀態
		appState.seats.forEach(row => row.forEach(seat => seat.isTempSelectedForGrouping = false));
		renderScreen('seatConfig');
	});
	document.getElementById('add-group-button').addEventListener('click', handleAddGroup);
	document.getElementById('assign-selected-to-group-button').addEventListener('click', handleAssignSelectedSeatsToGroup);
	document.getElementById('clear-temp-selection-button').addEventListener('click', handleClearTempSelection);
	document.querySelectorAll('#group-list .delete').forEach(button => {
		button.addEventListener('click', handleDeleteGroup);
	});
	document.getElementById('next-to-assignment-button').addEventListener('click', () => renderScreen('assignment'));
}

// 渲染座位安排條件設定畫面
function renderAssignmentScreen(mainGridArea, leftPanel, rightPanel) {
	console.log('--- renderAssignmentScreen 渲染時狀態 ---');
	console.log('appState.studentCount:', appState.studentCount);
	console.log('appState.studentIds.length:', appState.studentIds.length);
	console.log('appState.selectedValidSeatsCount:', appState.selectedValidSeatsCount);
	console.log('appState.seats (部分):', appState.seats.slice(0, 2)); // 顯示前兩行座位數據

	// 中央座位網格 (顯示已分配的學生)
	let seatGridHtml = `
        <div class="seat-grid">
    `;
	appState.seats.forEach(row => {
		row.forEach(seat => {
			let seatClass = '';
			let seatContent = '';
			if (seat.isValid) {
				if (seat.studentId) {
					seatClass = 'is-assigned'; // 已分配學生顯示藍色
					seatContent = seat.studentId;
				} else if (seat.groupId) {
					seatClass = `group-${seat.groupId.replace(/\s/g, '-')}`; // 顯示群組顏色
					seatContent = seat.groupId; // 顯示群組名稱
				} else {
					seatClass = 'is-valid'; // 有效座位但未分群顯示淺綠色 (與初始設定畫面一致)
				}
			} else {
				seatClass = 'is-invalid'; // 無效座位顯示淺灰色
			}
			seatGridHtml += `
                <div class="seat ${seatClass}" data-row="${seat.row}" data-col="${seat.col}">
                    ${seatContent}
                </div>
            `;
		});
	});
	seatGridHtml += `
        </div>
        <button class="button" id="start-assignment-button">開始安排</button>
        <button class="button" id="download-config-button-assignment">下載設定</button>
    `;
	mainGridArea.innerHTML = seatGridHtml;

	// 左側控制面板 (條件設定)
	leftPanel.innerHTML = `
        <div class="control-section">
            <h3>條件設定</h3>
            <div class="input-group">
                <label for="condition-type">條件類型:</label>
                <select id="condition-type">
                    <option value="adjacent">坐在一起 (左右)</option>
                    <option value="group_area">坐在一區 (前後左右相鄰)</option>
                    <option value="not_adjacent">不能坐在一起 (至少隔一人)</option>
                    <option value="assign_group">指定區域</option>
                    <option value="adjacent_and_group">指定區域且坐在一起</option>
                </select>
            </div>
            <div class="input-group">
                <label for="condition-students">學生編號 (逗號分隔，例如: (1, 5) 或 (1, 5), (7, 8)):</label>
                <input type="text" id="condition-students" placeholder="例如: (1, 5)">
            </div>
            <div class="input-group" id="condition-group-input" style="display: none;">
                <label for="condition-group-select">指定群組:</label>
                <select id="condition-group-select">
                    <option value="">-- 選擇群組 --</option>
                    ${appState.groups.map(g => `<option value="${g}">${g}</option>`).join('')}
                </select>
            </div>
            <button class="button" id="add-condition-button">新增條件</button>
            <h4>已設定條件:</h4>
            <ul id="condition-list">
                ${appState.conditions.map(c => `
                    <li>
                        ${getConditionDescription(c)}
                        <div class="actions">
                            <button class="button delete" data-condition-id="${c.id}">刪除</button>
                        </div>
                    </li>
                `).join('')}
            </ul>
        </div>
        <button class="button" id="back-to-grouping-button">返回分群設定</button>
    `;

	// 右側結果/衝突顯示區
	rightPanel.innerHTML = `
        <div class="result-section">
            <h3>安排結果</h3>
            <p>未安排學生:</p>
            <ul id="unassigned-students-list" class="unassigned-students">
                <!-- 未安排學生將在此處顯示 -->
            </ul>
            <div id="assignment-status" style="margin-top: 10px; font-weight: bold;"></div>
        </div>
    `;

	// 添加事件監聽器
	document.getElementById('start-assignment-button').addEventListener('click', async () => {
		const startButton = document.getElementById('start-assignment-button');
		const unassignedListElement = document.getElementById('unassigned-students-list');

		startButton.disabled = true; // 禁用按鈕
		startButton.textContent = '安排中...'; // 顯示載入訊息
		unassignedListElement.innerHTML = '<li>安排中，請稍候...</li>'; // 清空並顯示載入訊息

		try {
			await startAssignment(); // 等待安排完成
		} catch (error) {
			console.error('座位安排過程中發生錯誤:', error);
			alert('座位安排過程中發生錯誤，請檢查控制台。');
		} finally {
			startButton.disabled = false; // 重新啟用按鈕
			startButton.textContent = '開始安排'; // 恢復按鈕文字
		}
	});
	document.getElementById('download-config-button-assignment').addEventListener('click', downloadConfig); // 新增下載按鈕事件
	document.getElementById('back-to-grouping-button').addEventListener('click', () => renderScreen('groupingSetup'));
	document.getElementById('condition-type').addEventListener('change', handleConditionTypeChange);
	document.getElementById('add-condition-button').addEventListener('click', handleAddCondition);
	document.querySelectorAll('#condition-list .delete').forEach(button => {
		button.addEventListener('click', handleDeleteCondition);
	});
	updateControlPanel(); // 更新條件相關的動態內容
}

// 輔助函式：更新控制面板的動態內容 (主要用於條件和群組選擇器)
export function updateControlPanel() {
	// 更新群組選擇器 (適用於條件設定畫面)
	const groupSelects = document.querySelectorAll('#group-select, #condition-group-select');
	groupSelects.forEach(select => {
		const currentSelected = select.value;
		select.innerHTML = '<option value="">-- 選擇群組 --</option>' +
			appState.groups.map(g => `<option value="${g}" ${g === currentSelected ? 'selected' : ''}>${g}</option>`).join('');
	});

	// 更新已定義群組列表 (適用於分群設定畫面)
	const groupList = document.getElementById('group-list');
	if (groupList) {
		groupList.innerHTML = appState.groups.map(g => `<li>${g} <button class="button delete" data-group="${g}">刪除</button></li>`).join('');
		document.querySelectorAll('#group-list .delete').forEach(button => {
			button.addEventListener('click', handleDeleteGroup);
		});
	}

	// 更新已設定條件列表 (適用於條件設定畫面)
	const conditionList = document.getElementById('condition-list');
	if (conditionList) {
		conditionList.innerHTML = appState.conditions.map(c => `
            <li>
                ${getConditionDescription(c)}
                <div class="actions">
                    <button class="button delete" data-condition-id="${c.id}">刪除</button>
                </div>
            </li>
        `).join('');
		document.querySelectorAll('#condition-list .delete').forEach(button => {
			button.addEventListener('click', handleDeleteCondition);
		});
	}

	// 更新已選座位數量顯示 (適用於座位佈局設定畫面)
	const selectedSeatsCountSpan = document.getElementById('selected-seats-count');
	if (selectedSeatsCountSpan) {
		selectedSeatsCountSpan.textContent = appState.selectedValidSeatsCount;
	}
}

// 輔助函式：獲取條件描述
function getConditionDescription(condition) {
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