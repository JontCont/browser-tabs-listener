/**
 * 重複分頁檢測器
 * 使用 localStorage 和狀態檢查來檢測重複分頁
 */

class DuplicateDetector {
    constructor() {
        this.tabId = this.generateTabId();
        this.stateKey = 'browser_tab_state';
        this.tabCountKey = 'browser_tab_count';
        this.sessionKey = 'browser_session_id';
        this.isDuplicate = false;
        
        this.init();
    }

    init() {
        this.detectDuplicateTab();
        this.setupTabTracking();
        this.setupUnloadHandler();
        this.updateDuplicateStatus();
    }

    generateTabId() {
        return 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    detectDuplicateTab() {
        try {
            // 檢查是否有現有的狀態
            const existingState = localStorage.getItem(this.stateKey);
            const currentUrl = window.location.href;
            
            if (existingState) {
                const state = JSON.parse(existingState);
                
                // 如果 URL 相同且時間間隔很短，可能是重複分頁
                if (state.url === currentUrl && (Date.now() - state.timestamp) < 5000) {
                    this.isDuplicate = true;
                    logEvent('檢測到重複分頁', 'warning');
                    console.log('檢測到重複分頁或返回+前進操作');
                }
            }

            // 更新狀態
            const newState = {
                tabId: this.tabId,
                url: currentUrl,
                timestamp: Date.now(),
                userAgent: navigator.userAgent
            };
            
            localStorage.setItem(this.stateKey, JSON.stringify(newState));
            
        } catch (error) {
            console.warn('無法檢測重複分頁 (localStorage 不可用):', error);
            logEvent('重複分頁檢測失敗: ' + error.message, 'error');
        }
    }

    setupTabTracking() {
        try {
            // 追蹤目前開啟的分頁數量
            let tabCount = parseInt(localStorage.getItem(this.tabCountKey) || '0');
            tabCount++;
            localStorage.setItem(this.tabCountKey, tabCount.toString());
            
            // 設定或獲取會話 ID
            let sessionId = localStorage.getItem(this.sessionKey);
            if (!sessionId) {
                sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem(this.sessionKey, sessionId);
            }
            
            logEvent(`分頁追蹤: 會話 ${sessionId}, 分頁數量 ${tabCount}`, 'info');
            
        } catch (error) {
            console.warn('無法設定分頁追蹤:', error);
        }
    }

    setupUnloadHandler() {
        // 頁面卸載時清理
        window.addEventListener('beforeunload', () => {
            try {
                let tabCount = parseInt(localStorage.getItem(this.tabCountKey) || '1');
                tabCount = Math.max(0, tabCount - 1);
                localStorage.setItem(this.tabCountKey, tabCount.toString());
                
                logEvent('分頁即將關閉，更新分頁計數', 'info');
            } catch (error) {
                console.warn('無法更新分頁計數:', error);
            }
        });

        // 使用 Page Visibility API 檢測分頁關閉
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // 分頁被隱藏，可能是切換或關閉
                this.updateLastActiveTime();
            }
        });
    }

    updateLastActiveTime() {
        try {
            const activityData = {
                tabId: this.tabId,
                lastActive: Date.now(),
                url: window.location.href
            };
            
            localStorage.setItem('last_activity_' + this.tabId, JSON.stringify(activityData));
        } catch (error) {
            console.warn('無法更新活動時間:', error);
        }
    }

    updateDuplicateStatus() {
        const element = document.getElementById('duplicate-status');
        
        if (this.isDuplicate) {
            element.textContent = '是 (檢測到重複)';
            element.className = 'value duplicate';
        } else {
            element.textContent = '否';
            element.className = 'value normal';
        }
    }

    checkForDuplicateInstances() {
        try {
            const currentTime = Date.now();
            const instances = [];
            
            // 檢查所有活動分頁
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('last_activity_')) {
                    const data = JSON.parse(localStorage.getItem(key));
                    
                    // 如果活動時間在最近 1 分鐘內
                    if (currentTime - data.lastActive < 60000) {
                        instances.push(data);
                    }
                }
            }
            
            return instances;
        } catch (error) {
            console.warn('無法檢查重複實例:', error);
            return [];
        }
    }

    getTabInfo() {
        try {
            const tabCount = localStorage.getItem(this.tabCountKey) || '0';
            const sessionId = localStorage.getItem(this.sessionKey) || '無';
            const instances = this.checkForDuplicateInstances();
            
            return {
                tabId: this.tabId,
                isDuplicate: this.isDuplicate,
                tabCount: parseInt(tabCount),
                sessionId: sessionId,
                activeInstances: instances.length,
                instances: instances
            };
        } catch (error) {
            console.warn('無法獲取分頁資訊:', error);
            return {
                tabId: this.tabId,
                isDuplicate: this.isDuplicate,
                tabCount: 0,
                sessionId: '無法獲取',
                activeInstances: 0,
                instances: []
            };
        }
    }

    // 手動觸發重複檢測
    recheckDuplicate() {
        this.detectDuplicateTab();
        this.updateDuplicateStatus();
        logEvent('重新檢測重複分頁', 'action');
    }

    // 清理所有追蹤資料
    clearAllTracking() {
        try {
            localStorage.removeItem(this.stateKey);
            localStorage.removeItem(this.tabCountKey);
            localStorage.removeItem(this.sessionKey);
            
            // 清理所有活動記錄
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key.startsWith('last_activity_')) {
                    localStorage.removeItem(key);
                }
            }
            
            logEvent('已清理所有追蹤資料', 'action');
        } catch (error) {
            console.warn('無法清理追蹤資料:', error);
        }
    }
}

// 全域變數
let duplicateDetector;

// 初始化函數
function initDuplicateDetector() {
    duplicateDetector = new DuplicateDetector();
}

// 匯出給其他模組使用
window.DuplicateDetector = DuplicateDetector;
