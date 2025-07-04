/**
 * 工具函數
 * 包含日誌記錄、格式化和其他輔助功能
 */

// 事件日誌系統
class EventLogger {
    constructor() {
        this.maxLogs = 100;
        this.logs = [];
    }

    log(message, type = 'info', data = null) {
        const timestamp = new Date();
        const logEntry = {
            id: Date.now() + Math.random(),
            timestamp: timestamp,
            message: message,
            type: type,
            data: data,
            formattedTime: this.formatTimestamp(timestamp)
        };

        this.logs.unshift(logEntry);
        
        // 限制日誌數量
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }

        this.displayLog(logEntry);
        return logEntry;
    }

    formatTimestamp(date) {
        return date.toLocaleTimeString('zh-TW', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3
        });
    }

    displayLog(logEntry) {
        const logContainer = document.getElementById('event-log');
        if (!logContainer) return;

        const logElement = document.createElement('div');
        logElement.className = `log-entry log-${logEntry.type}`;
        logElement.innerHTML = `
            <span class="log-time">${logEntry.formattedTime}</span>
            <span class="log-type">[${logEntry.type.toUpperCase()}]</span>
            <span class="log-message">${logEntry.message}</span>
        `;

        logContainer.insertBefore(logElement, logContainer.firstChild);

        // 限制顯示的日誌數量
        const logElements = logContainer.children;
        if (logElements.length > this.maxLogs) {
            for (let i = this.maxLogs; i < logElements.length; i++) {
                logContainer.removeChild(logElements[i]);
            }
        }

        // 自動滾動到最新日誌
        logContainer.scrollTop = 0;
    }

    clear() {
        this.logs = [];
        const logContainer = document.getElementById('event-log');
        if (logContainer) {
            logContainer.innerHTML = '';
        }
    }

    export() {
        const exportData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            logs: this.logs
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `event-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getLogs(type = null, limit = null) {
        let filteredLogs = this.logs;
        
        if (type) {
            filteredLogs = filteredLogs.filter(log => log.type === type);
        }
        
        if (limit) {
            filteredLogs = filteredLogs.slice(0, limit);
        }
        
        return filteredLogs;
    }
}

// 全域事件記錄器
const eventLogger = new EventLogger();

// 全域日誌函數
function logEvent(message, type = 'info', data = null) {
    return eventLogger.log(message, type, data);
}

// 工具函數
const utils = {
    // 格式化時間
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}小時${minutes % 60}分鐘${seconds % 60}秒`;
        } else if (minutes > 0) {
            return `${minutes}分鐘${seconds % 60}秒`;
        } else {
            return `${seconds}秒`;
        }
    },

    // 格式化檔案大小
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    },

    // 檢測瀏覽器類型
    detectBrowser() {
        const userAgent = navigator.userAgent;
        
        if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
            return 'Chrome';
        } else if (userAgent.includes('Firefox')) {
            return 'Firefox';
        } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
            return 'Safari';
        } else if (userAgent.includes('Edg')) {
            return 'Edge';
        } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
            return 'Opera';
        } else {
            return 'Unknown';
        }
    },

    // 檢測設備類型
    detectDevice() {
        const userAgent = navigator.userAgent;
        
        if (/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            return 'Mobile';
        } else if (/Tablet|iPad/i.test(userAgent)) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    },

    // 生成唯一 ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    },

    // 節流函數
    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    },

    // 防抖函數
    debounce(func, delay) {
        let timeoutId;
        
        return function (...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
    },

    // 檢測支援的功能
    detectFeatureSupport() {
        const features = {
            localStorage: typeof(Storage) !== 'undefined',
            visibilityAPI: typeof document.visibilityState !== 'undefined',
            pageVisibility: 'visibilityState' in document,
            focus: 'hasFocus' in document,
            performance: 'performance' in window,
            webWorkers: typeof(Worker) !== 'undefined',
            notifications: 'Notification' in window,
            geolocation: 'geolocation' in navigator
        };

        return features;
    },

    // 獲取頁面資訊
    getPageInfo() {
        const performance = window.performance;
        const navigation = performance ? performance.navigation : null;
        const timing = performance ? performance.timing : null;

        return {
            url: window.location.href,
            title: document.title,
            referrer: document.referrer,
            browser: this.detectBrowser(),
            device: this.detectDevice(),
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            cookieEnabled: navigator.cookieEnabled,
            onlineStatus: navigator.onLine,
            screenResolution: `${screen.width}x${screen.height}`,
            viewportSize: `${window.innerWidth}x${window.innerHeight}`,
            colorDepth: screen.colorDepth,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            loadTime: timing ? timing.loadEventEnd - timing.navigationStart : null,
            domReady: timing ? timing.domContentLoadedEventEnd - timing.navigationStart : null,
            navigationType: navigation ? navigation.type : null
        };
    }
};

// DOM 準備就緒時設定事件監聽器
document.addEventListener('DOMContentLoaded', () => {
    // 清除日誌按鈕
    const clearLogBtn = document.getElementById('clear-log');
    if (clearLogBtn) {
        clearLogBtn.addEventListener('click', () => {
            eventLogger.clear();
            logEvent('事件日誌已清除', 'action');
        });
    }

    // 匯出日誌按鈕
    const exportLogBtn = document.getElementById('export-log');
    if (exportLogBtn) {
        exportLogBtn.addEventListener('click', () => {
            eventLogger.export();
            logEvent('事件日誌已匯出', 'action');
        });
    }

    // 記錄瀏覽器和設備資訊
    const pageInfo = utils.getPageInfo();
    logEvent(`瀏覽器: ${pageInfo.browser}, 設備: ${pageInfo.device}`, 'info');
    
    // 記錄功能支援情況
    const features = utils.detectFeatureSupport();
    const supportedFeatures = Object.entries(features)
        .filter(([, supported]) => supported)
        .map(([feature]) => feature);
    
    logEvent(`支援的功能: ${supportedFeatures.join(', ')}`, 'info');
});

// 匯出全域變數和函數
window.utils = utils;
window.logEvent = logEvent;
window.eventLogger = eventLogger;
