// ui.js - 介面渲染相關函數

import { appState } from './state.js';
import { handleSeatConfigClick, downloadConfig, uploadConfig, handleGroupingSetupClick, handleAddGroup, handleAssignSelectedSeatsToGroup, handleClearTempSelection, handleDeleteGroup, startAssignment, handleConditionTypeChange, handleAddCondition, handleDeleteCondition } from './handlers.js';

// 渲染畫面
export function renderScreen(screenName) {
	appState.currentScreen = screenName;
	const mainGridArea = document.getElementById('main-grid-area');
	const leftPanel = document.getElementById('left-panel');
	const rightPanel = document.getElementById('right-panel');

	// 清空所有面板內容
	mainGridArea.innerHTML = '';
	leftPanel.innerHTML = '';
	rightPanel.innerHTML = '';

	switch (appState.currentScreen) {
		case 'seatConfig':
			renderSeatConfigScreen(mainGridArea, leftPanel, rightPanel);
			break;
		case 'groupingSetup':
			renderGroupingSetupScreen(mainGridArea, leftPanel, rightPanel);
			break;
		case 'assignment':
			renderAssignmentScreen(mainGridArea, leftPanel, rightPanel);
			break;
	}
}

// 渲染座位佈局設定畫面
function renderSeatConfigScreen(mainGridArea, leftPanel, rightPanel) {
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
            <input type="file" id="upload-config-input" accept=".json" style="display: none;">
            <button class="button" id="upload-config-button">上傳設定</button>
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
	document.getElementById('upload-config-button').addEventListener('click', () => document.getElementById('upload-config-input').click());
	document.getElementById('upload-config-input').addEventListener('change', uploadConfig);
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
        <button class="button" id="back-to-seat-config-button">返回座位配置</button>
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
        <button class="button" id="next-to-assignment-button">下一步：設定條件</button>
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
        </div>
    `;

	// 添加事件監聽器
	document.getElementById('start-assignment-button').addEventListener('click', startAssignment);
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