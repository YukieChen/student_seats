// main.js - 學生座位安排程式的主要 JavaScript 邏輯

import { initializeSeatsData } from './state.js';
import { renderScreen } from './ui.js';

// 應用程式啟動
initializeSeatsData(); // 初始化座位數據
renderScreen('seatConfig'); // 渲染初始畫面