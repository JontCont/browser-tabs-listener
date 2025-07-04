/**
 * 統計功能模組
 * 追蹤用戶在頁面上的活動時間和行為統計
 */

class Stats {
    constructor() {
        this.startTime = Date.now();
        this.activeTime = 0;
        this.lastActiveTime = Date.now();
        this.isCurrentlyActive = true;
        this.statsUpdateInterval = null;
        
        this.init();
    }

    init() {
        this.setupActivityTracking();
        this.startStatsUpdate();
    }

    setupActivityTracking() {
        // 監聽用戶活動
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.recordActivity();
            }, { passive: true });
        });

        // 監聽分頁焦點變化
        window.addEventListener('focus', () => {
            this.isCurrentlyActive = true;
            this.lastActiveTime = Date.now();
        });

        window.addEventListener('blur', () => {
            this.isCurrentlyActive = false;
            this.recordActivity(); // 記錄失去焦點前的活動時間
        });

        // 監聽可見性變化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.isCurrentlyActive = true;
                this.lastActiveTime = Date.now();
            } else {
                this.isCurrentlyActive = false;
                this.recordActivity();
            }
        });
    }

    recordActivity() {
        if (this.isCurrentlyActive) {
            const currentTime = Date.now();
            const timeDiff = currentTime - this.lastActiveTime;
            
            // 只計算合理的時間差 (小於 5 分鐘)
            if (timeDiff < 5 * 60 * 1000) {
                this.activeTime += timeDiff;
            }
            
            this.lastActiveTime = currentTime;
        }
    }

    startStatsUpdate() {
        this.statsUpdateInterval = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);
    }

    updateTimeDisplay() {
        // 更新活躍時間
        if (this.isCurrentlyActive) {
            this.recordActivity();
        }
        
        const activeSeconds = Math.floor(this.activeTime / 1000);
        const totalSeconds = Math.floor((Date.now() - this.startTime) / 1000);
        
        document.getElementById('active-time').textContent = this.formatTime(activeSeconds);
        document.getElementById('total-time').textContent = this.formatTime(totalSeconds);
    }

    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else if (minutes > 0) {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        } else {
            return secs.toString();
        }
    }

    getDetailedStats() {
        const currentTime = Date.now();
        const totalTime = currentTime - this.startTime;
        const activePercentage = totalTime > 0 ? (this.activeTime / totalTime * 100) : 0;
        
        return {
            startTime: this.startTime,
            currentTime: currentTime,
            totalTime: totalTime,
            activeTime: this.activeTime,
            inactiveTime: totalTime - this.activeTime,
            activePercentage: activePercentage.toFixed(2),
            isCurrentlyActive: this.isCurrentlyActive,
            formattedTotalTime: this.formatTime(Math.floor(totalTime / 1000)),
            formattedActiveTime: this.formatTime(Math.floor(this.activeTime / 1000)),
            formattedInactiveTime: this.formatTime(Math.floor((totalTime - this.activeTime) / 1000))
        };
    }

    reset() {
        this.startTime = Date.now();
        this.activeTime = 0;
        this.lastActiveTime = Date.now();
        this.isCurrentlyActive = true;
        
        // 重置顯示
        document.getElementById('active-time').textContent = '0';
        document.getElementById('total-time').textContent = '0';
        
        logEvent('統計資料已重置', 'action');
    }

    exportStats() {
        const stats = this.getDetailedStats();
        const tabInfo = duplicateDetector ? duplicateDetector.getTabInfo() : {};
        const tabStatus = tabListener ? tabListener.getStatus() : {};
        
        const exportData = {
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
            stats: stats,
            tabInfo: tabInfo,
            tabStatus: tabStatus
        };
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tab-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        logEvent('統計資料已匯出', 'action');
    }

    stop() {
        if (this.statsUpdateInterval) {
            clearInterval(this.statsUpdateInterval);
            this.statsUpdateInterval = null;
        }
        this.recordActivity(); // 最後記錄一次活動時間
    }
}

// 全域變數
let stats;

// 初始化函數
function initStats() {
    stats = new Stats();
    
    // 頁面卸載時停止統計
    window.addEventListener('beforeunload', () => {
        if (stats) {
            stats.stop();
        }
    });
}

// 供外部調用的函數
function updateTimeStats() {
    if (stats) {
        stats.updateTimeDisplay();
    }
}

function resetAllStats() {
    if (stats) {
        stats.reset();
    }
    
    if (tabListener) {
        tabListener.focusChangeCount = 0;
        tabListener.visibilityChangeCount = 0;
        tabListener.updateStats();
    }
    
    logEvent('所有統計資料已重置', 'action');
}

function exportAllStats() {
    if (stats) {
        stats.exportStats();
    }
}

// 匯出給其他模組使用
window.Stats = Stats;
