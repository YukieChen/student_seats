// PerformanceMonitor.js - 性能監控器
const { Logger } = require('./Logger.js');

class PerformanceMonitor {
	constructor(options = {}) {
		this.logger = new Logger(options.logLevel || 'INFO');
		this.options = {
			enableMemoryMonitoring: options.enableMemoryMonitoring !== false,
			enableCPUMonitoring: options.enableCPUMonitoring !== false,
			enableNetworkMonitoring: options.enableNetworkMonitoring !== false,
			monitoringInterval: options.monitoringInterval || 1000,
			...options
		};

		// 性能指標存儲
		this.metrics = {
			executionTime: 0,
			executionSteps: 0,
			memoryUsage: [],
			cpuUsage: [],
			networkRequests: [],
			assignmentCount: 0,
			cacheStats: {},
			startTime: 0,
			endTime: 0
		};

		// 確保所有指標都是陣列類型
		this.initializeMetrics();

		// 監控配置
		this.config = {
			thresholds: {
				memoryWarning: 100 * 1024 * 1024, // 100MB
				memoryCritical: 500 * 1024 * 1024, // 500MB
				executionTimeWarning: 10000, // 10秒
				executionTimeCritical: 30000, // 30秒
				cpuWarning: 80, // 80%
				cpuCritical: 95 // 95%
			},
			alerts: {
				enabled: true,
				logLevel: 'WARN'
			}
		};

		// 監控狀態
		this.isMonitoring = false;
		this.monitoringInterval = null;
	}

	/**
	 * 初始化性能監控器
	 * 
	 * @param {Object} options - 初始化選項
	 */
	initialize(options = {}) {
		this.options = { ...this.options, ...options };
		this.initializeMetrics();
		this.logger.log('INFO', 'PerformanceMonitor', '性能監控器初始化完成', this.options);
	}

	/**
	 * 初始化性能指標
	 */
	initializeMetrics() {
		// 確保所有指標都是陣列類型
		if (!Array.isArray(this.metrics.memoryUsage)) {
			this.metrics.memoryUsage = [];
		}
		if (!Array.isArray(this.metrics.cpuUsage)) {
			this.metrics.cpuUsage = [];
		}
		if (!Array.isArray(this.metrics.networkRequests)) {
			this.metrics.networkRequests = [];
		}
	}

	/**
	 * 設置性能指標
	 * @param {Object} metrics 性能指標
	 */
	setMetrics(metrics) {
		this.metrics = { ...this.metrics, ...metrics };
		this.initializeMetrics(); // 確保指標類型正確
	}

	/**
	 * 開始性能監控
	 */
	startMonitoring() {
		if (this.isMonitoring) {
			this.logger.log('WARN', 'PerformanceMonitor', '性能監控已啟動');
			return;
		}

		this.isMonitoring = true;
		this.metrics.startTime = Date.now();
		this.initializeMetrics(); // 確保指標初始化

		if (this.options.enableMemoryMonitoring || this.options.enableCPUMonitoring) {
			this.monitoringInterval = setInterval(() => {
				this.collectMetrics();
			}, this.options.monitoringInterval);
		}

		this.logger.log('INFO', 'PerformanceMonitor', '性能監控已啟動', {
			monitoringInterval: this.options.monitoringInterval,
			enabledFeatures: {
				memory: this.options.enableMemoryMonitoring,
				cpu: this.options.enableCPUMonitoring,
				network: this.options.enableNetworkMonitoring
			}
		});
	}

	/**
	 * 停止性能監控
	 */
	stopMonitoring() {
		if (!this.isMonitoring) {
			this.logger.log('WARN', 'PerformanceMonitor', '性能監控未啟動');
			return;
		}

		this.isMonitoring = false;
		this.metrics.endTime = Date.now();

		if (this.monitoringInterval) {
			clearInterval(this.monitoringInterval);
			this.monitoringInterval = null;
		}

		this.logger.log('INFO', 'PerformanceMonitor', '性能監控已停止', {
			totalExecutionTime: this.trackExecutionTime(),
			totalExecutionSteps: this.metrics.executionSteps
		});
	}

	/**
	 * 執行時間監控
	 * @returns {number} 執行時間（毫秒）
	 */
	trackExecutionTime() {
		if (this.metrics.endTime > 0) {
			return this.metrics.endTime - this.metrics.startTime;
		}
		return Date.now() - this.metrics.startTime;
	}

	/**
	 * 記憶體使用監控
	 * @returns {Object|null} 記憶體使用信息
	 */
	monitorMemoryUsage() {
		if (!this.options.enableMemoryMonitoring) {
			return null;
		}

		if (typeof performance !== 'undefined' && performance && performance.memory) {
			const memoryInfo = {
				used: performance.memory.usedJSHeapSize || 0,
				total: performance.memory.totalJSHeapSize || 0,
				limit: performance.memory.jsHeapSizeLimit || 0,
				timestamp: Date.now()
			};

			this.metrics.memoryUsage.push(memoryInfo);

			// 檢查記憶體使用閾值
			this.checkMemoryThresholds(memoryInfo);

			return memoryInfo;
		}

		// 備用記憶體監控方法
		if (typeof window !== 'undefined' && window && window.performance && window.performance.memory) {
			const memoryInfo = {
				used: window.performance.memory.usedJSHeapSize || 0,
				total: window.performance.memory.totalJSHeapSize || 0,
				limit: window.performance.memory.jsHeapSizeLimit || 0,
				timestamp: Date.now()
			};

			this.metrics.memoryUsage.push(memoryInfo);
			this.checkMemoryThresholds(memoryInfo);

			return memoryInfo;
		}

		return null;
	}

	/**
	 * CPU使用監控
	 * @returns {Object|null} CPU使用信息
	 */
	monitorCPUUsage() {
		if (!this.options.enableCPUMonitoring) {
			return null;
		}

		// 簡化的CPU使用估算
		const cpuInfo = {
			usage: this.estimateCPUUsage(),
			timestamp: Date.now()
		};

		this.metrics.cpuUsage.push(cpuInfo);

		// 檢查CPU使用閾值
		this.checkCPUThresholds(cpuInfo);

		return cpuInfo;
	}

	/**
	 * 網路請求監控
	 * @returns {Object|null} 網路請求信息
	 */
	monitorNetworkRequests() {
		if (!this.options.enableNetworkMonitoring) {
			return null;
		}

		if (typeof performance !== 'undefined' && performance && performance.getEntriesByType) {
			const networkEntries = performance.getEntriesByType('resource');
			const networkInfo = {
				totalRequests: networkEntries.length,
				totalSize: networkEntries.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
				averageResponseTime: networkEntries.reduce((sum, entry) => sum + entry.duration, 0) / Math.max(networkEntries.length, 1),
				timestamp: Date.now()
			};

			this.metrics.networkRequests.push(networkInfo);
			return networkInfo;
		}

		return null;
	}

	/**
	 * 指標收集
	 * @returns {Object} 收集的性能指標
	 */
	collectMetrics() {
		// 確保指標陣列已初始化
		this.initializeMetrics();

		const currentMetrics = {
			executionTime: this.trackExecutionTime(),
			executionSteps: this.metrics.executionSteps,
			memoryUsage: this.monitorMemoryUsage(),
			cpuUsage: this.monitorCPUUsage(),
			networkRequests: this.monitorNetworkRequests(),
			assignmentCount: this.metrics.assignmentCount,
			cacheStats: this.metrics.cacheStats
		};

		// 更新指標
		this.metrics = { ...this.metrics, ...currentMetrics };

		// 檢查性能瓶頸
		this.detectBottlenecks(currentMetrics);

		return currentMetrics;
	}

	/**
	 * 指標分析
	 * @returns {Object} 分析結果
	 */
	analyzeMetrics() {
		const analysis = {
			performance: this.analyzePerformance(),
			memory: this.analyzeMemoryUsage(),
			cpu: this.analyzeCPUUsage(),
			network: this.analyzeNetworkUsage(),
			recommendations: this.generateOptimizationSuggestions()
		};

		return analysis;
	}

	/**
	 * 指標存儲
	 * @param {Object} metrics 要存儲的指標
	 */
	storeMetrics(metrics) {
		// 在實際應用中，這裡可以將指標存儲到資料庫或檔案系統
		this.logger.log('DEBUG', 'PerformanceMonitor', '存儲性能指標', {
			timestamp: Date.now(),
			metricsCount: Object.keys(metrics).length
		});
	}

	/**
	 * 指標報告
	 * @returns {Object} 性能報告
	 */
	reportMetrics() {
		const report = {
			summary: this.generateSummary(),
			details: this.analyzeMetrics(),
			alerts: this.getActiveAlerts(),
			recommendations: this.generateOptimizationSuggestions(),
			timestamp: Date.now()
		};

		this.logger.log('INFO', 'PerformanceMonitor', '性能報告生成完成', {
			executionTime: report.summary.executionTime,
			memoryUsage: report.summary.memoryUsage,
			alertsCount: report.alerts.length
		});

		return report;
	}

	/**
	 * 性能瓶頸檢測
	 * @param {Object} metrics 當前指標
	 */
	detectBottlenecks(metrics) {
		const bottlenecks = [];

		// 檢查執行時間瓶頸
		if (metrics.executionTime > this.config.thresholds.executionTimeCritical) {
			bottlenecks.push({
				type: 'execution_time',
				severity: 'critical',
				value: metrics.executionTime,
				threshold: this.config.thresholds.executionTimeCritical,
				message: '執行時間超過臨界閾值'
			});
		} else if (metrics.executionTime > this.config.thresholds.executionTimeWarning) {
			bottlenecks.push({
				type: 'execution_time',
				severity: 'warning',
				value: metrics.executionTime,
				threshold: this.config.thresholds.executionTimeWarning,
				message: '執行時間超過警告閾值'
			});
		}

		// 檢查記憶體瓶頸
		if (metrics.memoryUsage) {
			if (metrics.memoryUsage.used > this.config.thresholds.memoryCritical) {
				bottlenecks.push({
					type: 'memory_usage',
					severity: 'critical',
					value: metrics.memoryUsage.used,
					threshold: this.config.thresholds.memoryCritical,
					message: '記憶體使用超過臨界閾值'
				});
			} else if (metrics.memoryUsage.used > this.config.thresholds.memoryWarning) {
				bottlenecks.push({
					type: 'memory_usage',
					severity: 'warning',
					value: metrics.memoryUsage.used,
					threshold: this.config.thresholds.memoryWarning,
					message: '記憶體使用超過警告閾值'
				});
			}
		}

		// 檢查CPU瓶頸
		if (metrics.cpuUsage) {
			if (metrics.cpuUsage.usage > this.config.thresholds.cpuCritical) {
				bottlenecks.push({
					type: 'cpu_usage',
					severity: 'critical',
					value: metrics.cpuUsage.usage,
					threshold: this.config.thresholds.cpuCritical,
					message: 'CPU使用超過臨界閾值'
				});
			} else if (metrics.cpuUsage.usage > this.config.thresholds.cpuWarning) {
				bottlenecks.push({
					type: 'cpu_usage',
					severity: 'warning',
					value: metrics.cpuUsage.usage,
					threshold: this.config.thresholds.cpuWarning,
					message: 'CPU使用超過警告閾值'
				});
			}
		}

		// 記錄瓶頸
		if (bottlenecks.length > 0) {
			this.logger.log(this.config.alerts.logLevel, 'PerformanceMonitor', '檢測到性能瓶頸', {
				bottlenecks: bottlenecks
			});
		}
	}

	/**
	 * 優化建議生成
	 * @returns {Array} 優化建議列表
	 */
	generateOptimizationSuggestions() {
		const suggestions = [];
		const analysis = this.analyzeMetrics();

		// 基於執行時間的建議
		if (analysis.performance.executionTime > this.config.thresholds.executionTimeWarning) {
			suggestions.push({
				category: 'performance',
				priority: 'high',
				suggestion: '考慮優化演算法或增加緩存機制',
				impact: '可顯著減少執行時間'
			});
		}

		// 基於記憶體使用的建議
		if (analysis.memory.averageUsage > this.config.thresholds.memoryWarning) {
			suggestions.push({
				category: 'memory',
				priority: 'medium',
				suggestion: '考慮清理不必要的緩存或優化數據結構',
				impact: '可減少記憶體使用'
			});
		}

		// 基於CPU使用的建議
		if (analysis.cpu.averageUsage > this.config.thresholds.cpuWarning) {
			suggestions.push({
				category: 'cpu',
				priority: 'medium',
				suggestion: '考慮使用Web Workers進行並行計算',
				impact: '可分散CPU負載'
			});
		}

		return suggestions;
	}

	/**
	 * 性能預警
	 * @param {string} type 預警類型
	 * @param {Object} details 預警詳情
	 */
	performanceAlert(type, details) {
		const alert = {
			type: type,
			timestamp: Date.now(),
			details: details,
			severity: this.determineAlertSeverity(type, details)
		};

		this.logger.log(alert.severity === 'critical' ? 'ERROR' : 'WARN', 'PerformanceMonitor', '性能預警', alert);

		return alert;
	}

	/**
	 * 性能報告
	 * @returns {Object} 詳細性能報告
	 */
	performanceReport() {
		const report = {
			summary: this.generateSummary(),
			performance: this.analyzePerformance(),
			memory: this.analyzeMemoryUsage(),
			cpu: this.analyzeCPUUsage(),
			network: this.analyzeNetworkUsage(),
			bottlenecks: this.getDetectedBottlenecks(),
			recommendations: this.generateOptimizationSuggestions(),
			timestamp: Date.now()
		};

		return report;
	}

	// 輔助方法

	/**
	 * 檢查記憶體閾值
	 * @param {Object} memoryInfo 記憶體信息
	 */
	checkMemoryThresholds(memoryInfo) {
		if (memoryInfo.used > this.config.thresholds.memoryCritical) {
			this.performanceAlert('memory_critical', {
				used: memoryInfo.used,
				limit: memoryInfo.limit,
				threshold: this.config.thresholds.memoryCritical
			});
		} else if (memoryInfo.used > this.config.thresholds.memoryWarning) {
			this.performanceAlert('memory_warning', {
				used: memoryInfo.used,
				limit: memoryInfo.limit,
				threshold: this.config.thresholds.memoryWarning
			});
		}
	}

	/**
	 * 檢查CPU閾值
	 * @param {Object} cpuInfo CPU信息
	 */
	checkCPUThresholds(cpuInfo) {
		if (cpuInfo.usage > this.config.thresholds.cpuCritical) {
			this.performanceAlert('cpu_critical', {
				usage: cpuInfo.usage,
				threshold: this.config.thresholds.cpuCritical
			});
		} else if (cpuInfo.usage > this.config.thresholds.cpuWarning) {
			this.performanceAlert('cpu_warning', {
				usage: cpuInfo.usage,
				threshold: this.config.thresholds.cpuWarning
			});
		}
	}

	/**
	 * 估算CPU使用率
	 * @returns {number} CPU使用率百分比
	 */
	estimateCPUUsage() {
		// 簡化的CPU使用估算，基於執行步驟和時間
		const executionIntensity = this.metrics.executionSteps / Math.max(this.trackExecutionTime(), 1);
		const estimatedUsage = Math.min(100, executionIntensity / 1000 * 100);
		return Math.round(estimatedUsage);
	}

	/**
	 * 分析性能
	 * @returns {Object} 性能分析結果
	 */
	analyzePerformance() {
		const executionTime = this.trackExecutionTime();
		const stepsPerSecond = this.metrics.executionSteps / Math.max(executionTime / 1000, 1);

		return {
			executionTime: executionTime,
			executionSteps: this.metrics.executionSteps,
			stepsPerSecond: stepsPerSecond,
			efficiency: this.calculateEfficiency(),
			performance: executionTime < this.config.thresholds.executionTimeWarning ? 'good' : 'poor'
		};
	}

	/**
	 * 分析記憶體使用
	 * @returns {Object} 記憶體分析結果
	 */
	analyzeMemoryUsage() {
		if (this.metrics.memoryUsage.length === 0) {
			return { averageUsage: 0, peakUsage: 0, trend: 'stable' };
		}

		const usages = this.metrics.memoryUsage.map(m => m.used);
		const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
		const peakUsage = Math.max(...usages);

		// 計算趨勢
		const recentUsages = usages.slice(-5);
		const trend = this.calculateTrend(recentUsages);

		return {
			averageUsage: averageUsage,
			peakUsage: peakUsage,
			trend: trend,
			samples: this.metrics.memoryUsage.length
		};
	}

	/**
	 * 分析CPU使用
	 * @returns {Object} CPU分析結果
	 */
	analyzeCPUUsage() {
		if (this.metrics.cpuUsage.length === 0) {
			return { averageUsage: 0, peakUsage: 0, trend: 'stable' };
		}

		const usages = this.metrics.cpuUsage.map(c => c.usage);
		const averageUsage = usages.reduce((sum, usage) => sum + usage, 0) / usages.length;
		const peakUsage = Math.max(...usages);

		const recentUsages = usages.slice(-5);
		const trend = this.calculateTrend(recentUsages);

		return {
			averageUsage: averageUsage,
			peakUsage: peakUsage,
			trend: trend,
			samples: this.metrics.cpuUsage.length
		};
	}

	/**
	 * 分析網路使用
	 * @returns {Object} 網路分析結果
	 */
	analyzeNetworkUsage() {
		if (this.metrics.networkRequests.length === 0) {
			return { totalRequests: 0, totalSize: 0, averageResponseTime: 0 };
		}

		const requests = this.metrics.networkRequests;
		const totalRequests = requests.reduce((sum, r) => sum + r.totalRequests, 0);
		const totalSize = requests.reduce((sum, r) => sum + r.totalSize, 0);
		const averageResponseTime = requests.reduce((sum, r) => sum + r.averageResponseTime, 0) / requests.length;

		return {
			totalRequests: totalRequests,
			totalSize: totalSize,
			averageResponseTime: averageResponseTime,
			samples: requests.length
		};
	}

	/**
	 * 生成摘要
	 * @returns {Object} 性能摘要
	 */
	generateSummary() {
		return {
			executionTime: this.trackExecutionTime(),
			executionSteps: this.metrics.executionSteps,
			memoryUsage: this.analyzeMemoryUsage().averageUsage,
			cpuUsage: this.analyzeCPUUsage().averageUsage,
			assignmentCount: this.metrics.assignmentCount,
			overallPerformance: this.calculateOverallPerformance()
		};
	}

	/**
	 * 獲取活躍警報
	 * @returns {Array} 活躍警報列表
	 */
	getActiveAlerts() {
		const alerts = [];
		const currentMetrics = this.collectMetrics();

		// 檢查當前指標是否觸發警報
		if (currentMetrics.executionTime > this.config.thresholds.executionTimeWarning) {
			alerts.push({
				type: 'execution_time',
				severity: currentMetrics.executionTime > this.config.thresholds.executionTimeCritical ? 'critical' : 'warning',
				message: '執行時間過長'
			});
		}

		if (currentMetrics.memoryUsage && currentMetrics.memoryUsage.used > this.config.thresholds.memoryWarning) {
			alerts.push({
				type: 'memory_usage',
				severity: currentMetrics.memoryUsage.used > this.config.thresholds.memoryCritical ? 'critical' : 'warning',
				message: '記憶體使用過高'
			});
		}

		return alerts;
	}

	/**
	 * 獲取檢測到的瓶頸
	 * @returns {Array} 瓶頸列表
	 */
	getDetectedBottlenecks() {
		// 這裡可以返回之前檢測到的瓶頸
		return [];
	}

	/**
	 * 計算效率
	 * @returns {number} 效率分數
	 */
	calculateEfficiency() {
		const executionTime = this.trackExecutionTime();
		const stepsPerSecond = this.metrics.executionSteps / Math.max(executionTime / 1000, 1);

		// 基於執行步驟和時間的效率計算
		const efficiency = Math.min(100, (stepsPerSecond / 1000) * 100);
		return Math.round(efficiency);
	}

	/**
	 * 計算趨勢
	 * @param {Array} values 數值列表
	 * @returns {string} 趨勢描述
	 */
	calculateTrend(values) {
		if (values.length < 2) return 'stable';

		const firstHalf = values.slice(0, Math.floor(values.length / 2));
		const secondHalf = values.slice(Math.floor(values.length / 2));

		const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
		const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

		const change = ((secondAvg - firstAvg) / firstAvg) * 100;

		if (change > 10) return 'increasing';
		if (change < -10) return 'decreasing';
		return 'stable';
	}

	/**
	 * 計算整體性能
	 * @returns {string} 整體性能評級
	 */
	calculateOverallPerformance() {
		const executionTime = this.trackExecutionTime();
		const memoryUsage = this.analyzeMemoryUsage().averageUsage;
		const cpuUsage = this.analyzeCPUUsage().averageUsage;

		let score = 100;

		// 執行時間評分
		if (executionTime > this.config.thresholds.executionTimeCritical) score -= 40;
		else if (executionTime > this.config.thresholds.executionTimeWarning) score -= 20;

		// 記憶體使用評分
		if (memoryUsage > this.config.thresholds.memoryCritical) score -= 30;
		else if (memoryUsage > this.config.thresholds.memoryWarning) score -= 15;

		// CPU使用評分
		if (cpuUsage > this.config.thresholds.cpuCritical) score -= 30;
		else if (cpuUsage > this.config.thresholds.cpuWarning) score -= 15;

		if (score >= 80) return 'excellent';
		if (score >= 60) return 'good';
		if (score >= 40) return 'fair';
		return 'poor';
	}

	/**
	 * 確定警報嚴重程度
	 * @param {string} type 警報類型
	 * @param {Object} details 警報詳情
	 * @returns {string} 嚴重程度
	 */
	determineAlertSeverity(type, details) {
		if (type.includes('critical')) return 'critical';
		if (type.includes('warning')) return 'warning';
		return 'info';
	}

	/**
	 * 重置指標
	 */
	resetMetrics() {
		this.metrics = {
			executionTime: 0,
			executionSteps: 0,
			memoryUsage: [],
			cpuUsage: [],
			networkRequests: [],
			assignmentCount: 0,
			cacheStats: {},
			startTime: 0,
			endTime: 0
		};

		this.logger.log('INFO', 'PerformanceMonitor', '性能指標已重置');
	}

	/**
	 * 獲取性能指標
	 * @returns {Object} 當前性能指標
	 */
	getPerformanceMetrics() {
		return this.collectMetrics();
	}
}

module.exports = { PerformanceMonitor };
