// main.js - 學生座位安排程式的主要 JavaScript 邏輯

import { initializeAppState, initializeSeats } from './state.js';
import { renderScreen } from './ui.js';

// 應用程式啟動
initializeAppState(); // 初始化應用程式狀態
initializeSeats();    // 初始化座位網格為 9x9
renderScreen('initialSetup'); // 渲染初始設定畫面