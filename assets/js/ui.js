// ui.js - 介面渲染相關函數

import { appState, initializeSeats } from './state.js';
import { handleSeatConfigClick, handleGroupingSetupClick, handleAddGroup, handleAssignSelectedSeatsToGroup, handleClearTempSelection, handleDeleteGroup, handleConditionTypeChange, handleAddCondition, handleDeleteCondition, handleAddStudentGroup, handleDeleteStudentGroup, handleAssignStudentGroupToSeatGroup } from './handlers.js';
import { downloadConfig, uploadConfig } from './utils.js';
import { startAssignment } from './algorithms.js';

/**
 * 顯示排位前檢查的警告訊息，並提供使用者選擇。
 * @param {Array<Object>} inconsistencies - 包含不合理綁定資訊的陣列。
 * @param {Function} onUserDecision - 使用者做出選擇後的回調函數 (true 為繼續, false 為返回修改)。
 */
export function showPreAssignmentWarning(inconsistencies, onUserDecision) {
	let message = '偵測到以下學生群組與座位分群的綁定可能不合理：\n\n';
	inconsistencies.forEach(item => {
		message += `學生群組「${item.studentGroupName}」有 ${item.studentCount} 人，但綁定的座位分群「${item.seatGroupId}」只有 ${item.availableSeatsCount} 個可用座位。\n`;
	});
	message += '\n繼續排位可能導致部分學生無法被安排。您確定要繼續嗎？';

	if (confirm(message)) {
		onUserDecision(true); // 使用者選擇繼續
	} else {
		onUserDecision(false); // 使用者選擇返回修改
	}
}

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
	const studentGroupingScreen = document.getElementById('student-grouping-screen'); // 確保這裡有定義
	const mainGridArea = document.getElementById('main-grid-area');
	const leftPanel = document.getElementById('left-panel');
	const rightPanel = document.getElementById('right-panel');

	// 隱藏所有面板
	if (initialSetupScreen) initialSetupScreen.style.display = 'none';
	if (studentGroupingScreen) studentGroupingScreen.style.display = 'none';
	if (mainGridArea) mainGridArea.style.display = 'none';
	if (leftPanel) leftPanel.style.display = 'none';
	if (rightPanel) rightPanel.style.display = 'none';

	// 清空所有面板內容 (除了 initialSetupScreen，因為它會被重新渲染)
	if (mainGridArea) mainGridArea.innerHTML = '';
	if (leftPanel) leftPanel.innerHTML = '';
	if (rightPanel) rightPanel.innerHTML = '';

	switch (screenName) { // 使用傳入的 screenName
		case 'initialSetup':
			if (initialSetupScreen) {
				initialSetupScreen.style.display = 'flex'; // 顯示初始設定畫面
				renderInitialSetupScreen(initialSetupScreen);
			} else {
				console.error('ui.js: 無法渲染 initialSetup 畫面，因為 #initial-setup-screen 不存在。');
			}
			break;
		case 'studentGrouping': // 新增學生分群設定畫面
			if (studentGroupingScreen) {
				studentGroupingScreen.style.display = 'flex';
				renderStudentGroupingScreen(studentGroupingScreen);
			} else {
				console.error('ui.js: 無法渲染 studentGrouping 畫面，因為 #student-grouping-screen 不存在。');
			}
			break;
		case 'seatConfig':
			if (mainGridArea && leftPanel && rightPanel) {
				mainGridArea.style.display = 'grid'; // 顯示網格
				leftPanel.style.display = 'block';
				rightPanel.style.display = 'block';
				renderSeatConfigScreen(mainGridArea, leftPanel, rightPanel);
			} else {
				console.error('ui.js: 無法渲染 seatConfig 畫面，缺少必要的 DOM 元素。');
			}
			break;
		case 'groupingSetup':
			if (mainGridArea && leftPanel && rightPanel) {
				mainGridArea.style.display = 'grid'; // 顯示網格
				leftPanel.style.display = 'block';
				rightPanel.style.display = 'block';
				renderGroupingSetupScreen(mainGridArea, leftPanel, rightPanel);
			} else {
				console.error('ui.js: 無法渲染 groupingSetup 畫面，缺少必要的 DOM 元素。');
			}
			break;
		case 'assignment':
			if (mainGridArea && leftPanel && rightPanel) {
				mainGridArea.style.display = 'grid'; // 顯示網格
				leftPanel.style.display = 'block';
				rightPanel.style.display = 'block';
				renderAssignmentScreen(mainGridArea, leftPanel, rightPanel);
			} else {
				console.error('ui.js: 無法渲染 assignment 畫面，缺少必要的 DOM 元素。');
			}
			break;
		default:
			console.warn(`ui.js: 未知的畫面名稱: ${screenName}`);
	}
}

// 渲染初始設定畫面
function renderInitialSetupScreen(initialSetupScreen) {
	if (!initialSetupScreen) {
		console.error('ui.js: renderInitialSetupScreen 函數需要一個有效的 initialSetupScreen 元素。');
		return;
	}

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
	           <div class="button-group">
	               <button class="button" id="start-grouping-button">開始學生分群</button>
	               <button class="button" id="skip-grouping-button">跳過分群，直接座位配置</button>
	           </div>
	           <div class="control-section" style="margin-top: 20px;">
	               <h3>設定檔操作</h3>
	               <input type="file" id="upload-config-input" accept=".json" style="display: none;">
	               <button class="button" id="upload-config-button">上傳設定</button>
	           </div>
	       </div>
	   `;

	const startGroupingButton = document.getElementById('start-grouping-button');
	const skipGroupingButton = document.getElementById('skip-grouping-button');
	const uploadConfigButton = document.getElementById('upload-config-button');
	const uploadConfigInput = document.getElementById('upload-config-input');

	if (startGroupingButton) {
		startGroupingButton.addEventListener('click', () => {
			const studentCountInput = document.getElementById('student-count-input');
			const studentIdsInput = document.getElementById('student-ids-input');

			if (!studentCountInput) {
				console.error('ui.js: 找不到 DOM 元素 #student-count-input');
				alert('初始化錯誤：找不到學生人數輸入框。');
				return;
			}
			if (!studentIdsInput) {
				console.error('ui.js: 找不到 DOM 元素 #student-ids-input');
				alert('初始化錯誤：找不到學生座號輸入框。');
				return;
			}

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

			renderScreen('studentGrouping'); // 進入學生分群設定畫面
		});
	}

	if (skipGroupingButton) {
		skipGroupingButton.addEventListener('click', () => {
			const studentCountInput = document.getElementById('student-count-input');
			const studentIdsInput = document.getElementById('student-ids-input');

			if (!studentCountInput) {
				console.error('ui.js: 找不到 DOM 元素 #student-count-input');
				alert('初始化錯誤：找不到學生人數輸入框。');
				return;
			}
			if (!studentIdsInput) {
				console.error('ui.js: 找不到 DOM 元素 #student-ids-input');
				alert('初始化錯誤：找不到學生座號輸入框。');
				return;
			}

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

			renderScreen('seatConfig'); // 直接進入座位配置畫面
		});
	}

	if (uploadConfigButton && uploadConfigInput) {
		uploadConfigButton.addEventListener('click', () => uploadConfigInput.click());
		uploadConfigInput.addEventListener('change', uploadConfig);
	}
}

// 渲染學生分群設定畫面
function renderStudentGroupingScreen(studentGroupingScreen) {
	studentGroupingScreen.innerHTML = `
        <div class="control-section">
            <h3>學生分群設定</h3>
            <div class="input-group">
                <label for="group-name-input-student">群組名稱:</label>
                <input type="text" id="group-name-input-student" placeholder="例如: 高個子學生">
            </div>
            <div class="input-group">
                <label for="student-ids-input-group">學生座號 (逗號分隔或範圍，例如: 1, 3-7, 9-12):</label>
                <input type="text" id="student-ids-input-group" placeholder="例如: 1, 3-5">
            </div>
            <div class="button-group">
                <button class="button" id="add-student-group-button">新增/更新群組</button>
                <button class="button" id="delete-student-group-button">刪除群組</button>
            </div>
            <h4>已定義學生群組:</h4>
            <ul id="student-group-list">
                <!-- 已定義的學生群組將在此處顯示 -->
            </ul>
            <div class="button-group" style="margin-top: 20px;">
                <button class="button" id="save-and-continue-button">儲存並繼續</button>
                <button class="button" id="skip-student-grouping-button">跳過</button>
            </div>
        </div>
    `;

	// 渲染已定義的學生群組列表
	updateStudentGroupList();

	// 添加事件監聽器
	document.getElementById('add-student-group-button').addEventListener('click', handleAddStudentGroup);
	document.getElementById('delete-student-group-button').addEventListener('click', handleDeleteStudentGroup);
	document.getElementById('save-and-continue-button').addEventListener('click', () => renderScreen('seatConfig'));
	document.getElementById('skip-student-grouping-button').addEventListener('click', () => renderScreen('seatConfig'));
}

// 輔助函式：更新學生群組列表
export function updateStudentGroupList() {
	const studentGroupList = document.getElementById('student-group-list');
	if (studentGroupList) {
		studentGroupList.innerHTML = Object.entries(appState.studentGroups)
			.map(([groupName, studentIds]) => `
                <li>
                    <strong>${groupName}:</strong> ${studentIds.join(', ')}
                    <div class="actions">
                        <button class="button edit" data-group-name="${groupName}">編輯</button>
                        <button class="button delete" data-group-name="${groupName}">刪除</button>
                    </div>
                </li>
            `).join('');

		document.querySelectorAll('#student-group-list .edit').forEach(button => {
			button.addEventListener('click', (event) => {
				const groupName = event.target.dataset.groupName;
				const studentIds = appState.studentGroups[groupName];
				document.getElementById('group-name-input-student').value = groupName;
				document.getElementById('student-ids-input-group').value = studentIds.join(', ');
			});
		});

		document.querySelectorAll('#student-group-list .delete').forEach(button => {
			button.addEventListener('click', handleDeleteStudentGroup);
		});
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
					// 如果有綁定學生群組，也顯示出來
					if (appState.groupSeatAssignments[seat.groupId]) {
						seatContent += `<br>(${appState.groupSeatAssignments[seat.groupId]})`;
					}
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
                ${appState.groups.map(g => `
                    <li>
                        ${g}
                        ${appState.groupSeatAssignments[g] ? `(綁定學生群組: ${appState.groupSeatAssignments[g]})` : ''}
                        <div class="actions">
                            <select class="student-group-assign-select" data-group-id="${g}">
                                <option value="">-- 綁定學生群組 --</option>
                                ${Object.keys(appState.studentGroups).map(sgName => `
                                    <option value="${sgName}" ${appState.groupSeatAssignments[g] === sgName ? 'selected' : ''}>
                                        ${sgName}
                                    </option>
                                `).join('')}
                            </select>
                            <button class="button delete" data-group="${g}">刪除</button>
                        </div>
                    </li>
                `).join('')}
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
	document.querySelectorAll('.student-group-assign-select').forEach(select => {
		select.addEventListener('change', handleAssignStudentGroupToSeatGroup);
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
                    <option value="assign_student_group_to_seat_group">學生群組指定區域</option> <!-- 新增選項 -->
                </select>
            </div>
            <div class="input-group">
                <label for="condition-students">學生編號 (逗號分隔，例如: (1, 5) 或 (1, 5), (7, 8)):</label>
                <input type="text" id="condition-students" placeholder="例如: (1, 5)">
            </div>
            <div class="input-group" id="condition-student-group-input" style="display: none;"> <!-- 新增學生群組選擇器容器 -->
                <label for="condition-student-group-select">指定學生群組:</label>
                <select id="condition-student-group-select">
                    <option value="">-- 選擇學生群組 --</option>
                    ${Object.keys(appState.studentGroups).map(sgName => `<option value="${sgName}">${sgName}</option>`).join('')}
                </select>
            </div>
            <div class="input-group" id="condition-group-input" style="display: none;">
                <label for="condition-group-select">指定座位群組:</label> <!-- 可修改描述以更清晰 -->
                <select id="condition-group-select">
                    <option value="">-- 選擇座位群組 --</option>
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

		await startAssignment(); // 等待安排完成
		startButton.disabled = false; // 重新啟用按鈕
		startButton.textContent = '開始安排'; // 恢復按鈕文字
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

	// 更新學生群組選擇器 (適用於條件設定畫面)
	const studentGroupSelect = document.getElementById('condition-student-group-select');
	if (studentGroupSelect) {
		const currentSelected = studentGroupSelect.value;
		studentGroupSelect.innerHTML = '<option value="">-- 選擇學生群組 --</option>' +
			Object.keys(appState.studentGroups).map(sgName => `<option value="${sgName}" ${sgName === currentSelected ? 'selected' : ''}>${sgName}</option>`).join('');
	}

	// 更新已定義群組列表 (適用於分群設定畫面)
	const groupList = document.getElementById('group-list');
	if (groupList) {
		groupList.innerHTML = appState.groups.map(g => `
	           <li>
	               ${g}
	               ${appState.groupSeatAssignments[g] ? `(綁定學生群組: ${appState.groupSeatAssignments[g]})` : ''}
	               <div class="actions">
	                   <select class="student-group-assign-select" data-group-id="${g}">
	                       <option value="">-- 綁定學生群組 --</option>
	                       ${Object.keys(appState.studentGroups).map(sgName => `
	                           <option value="${sgName}" ${appState.groupSeatAssignments[g] === sgName ? 'selected' : ''}>
	                               ${sgName}
	                           </option>
	                       `).join('')}
	                   </select>
	                   <button class="button delete" data-group="${g}">刪除</button>
	               </div>
	           </li>
	       `).join('');
		document.querySelectorAll('#group-list .delete').forEach(button => {
			button.addEventListener('click', handleDeleteGroup);
		});
		document.querySelectorAll('.student-group-assign-select').forEach(select => {
			select.addEventListener('change', handleAssignStudentGroupToSeatGroup);
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

	// 更新學生群組列表 (適用於學生分群設定畫面)
	updateStudentGroupList();
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
		case 'assign_student_group_to_seat_group': // 新增條件類型
			desc = `學生群組「${condition.studentGroupName}」必須坐在座位群組「${condition.group}」的座位`;
			break;
	}
	return desc;
}