/**
 * 重複分頁檢測器 (改進版)
 * 使用 Broadcast Channel API + localStorage 來檢測重複分頁
 */

class DuplicateDetector {
    constructor() {
        this.tabId = this.generateTabId();
        this.stateKey = 'browser_tab_state';
        this.tabCountKey = 'browser_tab_count';
        this.sessionKey = 'browser_session_id';
        this.activeTabsKey = 'active_tabs';
        this.isDuplicate = false;
        this.isOriginalTab = false;
        
        // Broadcast Channel for real-time communication
        this.channel = null;
        this.initBroadcastChannel();
        
        this.init();
    }

    initBroadcastChannel() {
        try {
            if ('BroadcastChannel' in window) {
                this.channel = new BroadcastChannel('tab_detector');
                this.channel.addEventListener('message', (event) => {
                    this.handleBroadcastMessage(event.data);
                });
                
                // 宣告新分頁
                this.broadcastMessage({
                    type: 'tab_opened',
                    tabId: this.tabId,
                    url: window.location.href,
                    timestamp: Date.now()
                });
                
                logEvent('Broadcast Channel 初始化成功', 'info');
            } else {
                logEvent('瀏覽器不支援 Broadcast Channel API，使用 localStorage 備援', 'warning');
            }
        } catch (error) {
            console.warn('Broadcast Channel 初始化失敗:', error);
            logEvent('Broadcast Channel 初始化失敗: ' + error.message, 'error');
        }
    }

    handleBroadcastMessage(data) {
        switch (data.type) {
            case 'tab_opened':
                if (data.tabId !== this.tabId && data.url === window.location.href) {
                    // 檢測到相同 URL 的其他分頁
                    const timeDiff = Date.now() - data.timestamp;
                    if (timeDiff < 3000) { // 3秒內
                        this.isDuplicate = true;
                        logEvent(`檢測到重複分頁 (${timeDiff}ms 前開啟)`, 'warning');
                        this.updateDuplicateStatus();
                    }
                }
                break;
                
            case 'tab_closed':
                // 清理已關閉的分頁記錄
                this.removeClosedTab(data.tabId);
                break;
                
            case 'ping':
                // 回應存活檢查
                this.broadcastMessage({
                    type: 'pong',
                    tabId: this.tabId,
                    url: window.location.href,
                    timestamp: Date.now()
                });
                break;
        }
    }

    broadcastMessage(data) {
        if (this.channel) {
            try {
                this.channel.postMessage(data);
            } catch (error) {
                console.warn('廣播訊息失敗:', error);
            }
        }
    }

    init() {
        this.detectDuplicateTab();
        this.setupTabTracking();
        this.setupUnloadHandler();
        this.updateDuplicateStatus();
        
        // 定期檢查活躍分頁
        this.startPeriodicCheck();
    }

    generateTabId() {
        return 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    }

    detectDuplicateTab() {
        try {
            // 使用增強的檢測邏輯
            this.checkWithSharedMemory();
            this.checkWithTimestamp();
            
        } catch (error) {
            console.warn('無法檢測重複分頁:', error);
            logEvent('重複分頁檢測失敗: ' + error.message, 'error');
        }
    }

    checkWithSharedMemory() {
        try {
            // 獲取當前活躍分頁列表
            const activeTabs = JSON.parse(localStorage.getItem(this.activeTabsKey) || '{}');
            const currentUrl = window.location.href;
            const currentTime = Date.now();
            
            // 清理過期的分頁記錄 (超過 30 秒)
            Object.keys(activeTabs).forEach(tabId => {
                if (currentTime - activeTabs[tabId].lastSeen > 30000) {
                    delete activeTabs[tabId];
                }
            });
            
            // 檢查是否有相同 URL 的活躍分頁
            const samUrlTabs = Object.values(activeTabs).filter(tab => 
                tab.url === currentUrl && tab.tabId !== this.tabId
            );
            
            if (samUrlTabs.length > 0) {
                this.isDuplicate = true;
                this.isOriginalTab = false;
                logEvent(`檢測到 ${samUrlTabs.length} 個相同 URL 的分頁`, 'warning');
            } else {
                this.isOriginalTab = true;
                logEvent('這是第一個開啟此 URL 的分頁', 'info');
            }
            
            // 註冊當前分頁
            activeTabs[this.tabId] = {
                tabId: this.tabId,
                url: currentUrl,
                openedAt: currentTime,
                lastSeen: currentTime,
                userAgent: navigator.userAgent.substring(0, 50) + '...'
            };
            
            localStorage.setItem(this.activeTabsKey, JSON.stringify(activeTabs));
            
        } catch (error) {
            console.warn('SharedMemory 檢測失敗:', error);
        }
    }

    checkWithTimestamp() {
        try {
            // 傳統時間戳檢測作為備援
            const existingState = localStorage.getItem(this.stateKey);
            const currentUrl = window.location.href;
            
            if (existingState) {
                const state = JSON.parse(existingState);
                
                // 如果 URL 相同且時間間隔很短，可能是重複分頁
                if (state.url === currentUrl && (Date.now() - state.timestamp) < 2000) {
                    this.isDuplicate = true;
                    logEvent('時間戳檢測: 檢測到重複分頁', 'warning');
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
            console.warn('時間戳檢測失敗:', error);
        }
    }

    startPeriodicCheck() {
        // 每 5 秒更新一次活躍狀態
        this.aliveInterval = setInterval(() => {
            this.updateAliveStatus();
            
            // 每 15 秒檢查一次是否有新的重複分頁
            if (Math.random() < 0.3) { // 30% 機率執行完整檢查
                this.recheckDuplicate();
            }
        }, 5000);
        
        // 每 30 秒向其他分頁發送 ping
        this.pingInterval = setInterval(() => {
            this.broadcastMessage({
                type: 'ping',
                tabId: this.tabId,
                timestamp: Date.now()
            });
        }, 30000);
    }

    updateAliveStatus() {
        try {
            const activeTabs = JSON.parse(localStorage.getItem(this.activeTabsKey) || '{}');
            if (activeTabs[this.tabId]) {
                activeTabs[this.tabId].lastSeen = Date.now();
                localStorage.setItem(this.activeTabsKey, JSON.stringify(activeTabs));
            }
        } catch (error) {
            console.warn('更新活躍狀態失敗:', error);
        }
    }

    removeClosedTab(tabId) {
        try {
            const activeTabs = JSON.parse(localStorage.getItem(this.activeTabsKey) || '{}');
            if (activeTabs[tabId]) {
                delete activeTabs[tabId];
                localStorage.setItem(this.activeTabsKey, JSON.stringify(activeTabs));
                logEvent(`已移除關閉的分頁: ${tabId}`, 'info');
            }
        } catch (error) {
            console.warn('移除關閉分頁失敗:', error);
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
                // 通知其他分頁此分頁即將關閉
                this.broadcastMessage({
                    type: 'tab_closed',
                    tabId: this.tabId,
                    timestamp: Date.now()
                });
                
                // 從活躍分頁列表中移除
                this.removeClosedTab(this.tabId);
                
                // 更新分頁計數
                let tabCount = parseInt(localStorage.getItem(this.tabCountKey) || '1');
                tabCount = Math.max(0, tabCount - 1);
                localStorage.setItem(this.tabCountKey, tabCount.toString());
                
                // 清理定時器
                if (this.aliveInterval) clearInterval(this.aliveInterval);
                if (this.pingInterval) clearInterval(this.pingInterval);
                
                logEvent('分頁即將關閉，已清理資源', 'info');
            } catch (error) {
                console.warn('清理資源失敗:', error);
            }
        });

        // 使用 Page Visibility API 檢測分頁狀態變化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.updateLastActiveTime();
            } else {
                // 分頁重新可見時，重新檢查重複狀態
                setTimeout(() => {
                    this.recheckDuplicate();
                }, 100);
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
        } else if (this.isOriginalTab) {
            element.textContent = '否 (原始分頁)';
            element.className = 'value normal';
        } else {
            element.textContent = '否';
            element.className = 'value normal';
        }

        // 通知分頁監聽器更新開啟方式檢測
        if (window.tabListener && typeof tabListener.performOpeningDetection === 'function') {
            const openerElement = document.getElementById('opener-status');
            if (openerElement) {
                tabListener.performOpeningDetection(openerElement);
            }
        }
    }

    getActiveTabsInfo() {
        try {
            const activeTabs = JSON.parse(localStorage.getItem(this.activeTabsKey) || '{}');
            const currentTime = Date.now();
            const currentUrl = window.location.href;
            
            // 過濾出相同 URL 的分頁
            const sameUrlTabs = Object.values(activeTabs).filter(tab => 
                tab.url === currentUrl && 
                (currentTime - tab.lastSeen) < 60000 // 1分鐘內活躍
            );
            
            return {
                totalTabs: Object.keys(activeTabs).length,
                sameUrlTabs: sameUrlTabs.length,
                currentTabId: this.tabId,
                tabs: sameUrlTabs
            };
        } catch (error) {
            console.warn('獲取活躍分頁資訊失敗:', error);
            return {
                totalTabs: 0,
                sameUrlTabs: 0,
                currentTabId: this.tabId,
                tabs: []
            };
        }
    }

    checkForDuplicateInstances() {
        try {
            const activeTabs = JSON.parse(localStorage.getItem(this.activeTabsKey) || '{}');
            const currentTime = Date.now();
            const instances = [];
            
            // 檢查所有活動分頁
            Object.values(activeTabs).forEach(tab => {
                // 如果活動時間在最近 1 分鐘內
                if (currentTime - tab.lastSeen < 60000) {
                    instances.push({
                        tabId: tab.tabId,
                        url: tab.url,
                        openedAt: tab.openedAt,
                        lastSeen: tab.lastSeen,
                        isCurrentTab: tab.tabId === this.tabId
                    });
                }
            });
            
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
            const activeTabsInfo = this.getActiveTabsInfo();
            
            return {
                tabId: this.tabId,
                isDuplicate: this.isDuplicate,
                isOriginalTab: this.isOriginalTab,
                tabCount: parseInt(tabCount),
                sessionId: sessionId,
                activeInstances: instances.length,
                sameUrlTabs: activeTabsInfo.sameUrlTabs,
                instances: instances,
                broadcastSupported: 'BroadcastChannel' in window
            };
        } catch (error) {
            console.warn('無法獲取分頁資訊:', error);
            return {
                tabId: this.tabId,
                isDuplicate: this.isDuplicate,
                isOriginalTab: this.isOriginalTab,
                tabCount: 0,
                sessionId: '無法獲取',
                activeInstances: 0,
                sameUrlTabs: 0,
                instances: [],
                broadcastSupported: false
            };
        }
    }

    // 手動觸發重複檢測
    recheckDuplicate() {
        const oldDuplicate = this.isDuplicate;
        this.detectDuplicateTab();
        
        if (oldDuplicate !== this.isDuplicate) {
            this.updateDuplicateStatus();
            logEvent('重複分頁狀態已更新', 'action');
        }
    }

    // 清理所有追蹤資料
    clearAllTracking() {
        try {
            localStorage.removeItem(this.stateKey);
            localStorage.removeItem(this.tabCountKey);
            localStorage.removeItem(this.sessionKey);
            localStorage.removeItem(this.activeTabsKey);
            
            // 清理所有活動記錄
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('last_activity_')) {
                    localStorage.removeItem(key);
                }
            }
            
            // 通知其他分頁清理完成
            this.broadcastMessage({
                type: 'cleanup_completed',
                tabId: this.tabId,
                timestamp: Date.now()
            });
            
            logEvent('已清理所有追蹤資料', 'action');
        } catch (error) {
            console.warn('無法清理追蹤資料:', error);
        }
    }

    // 銷毀檢測器
    destroy() {
        try {
            // 清理定時器
            if (this.aliveInterval) {
                clearInterval(this.aliveInterval);
                this.aliveInterval = null;
            }
            
            if (this.pingInterval) {
                clearInterval(this.pingInterval);
                this.pingInterval = null;
            }
            
            // 關閉 Broadcast Channel
            if (this.channel) {
                this.channel.close();
                this.channel = null;
            }
            
            // 移除當前分頁記錄
            this.removeClosedTab(this.tabId);
            
            logEvent('重複分頁檢測器已銷毀', 'info');
        } catch (error) {
            console.warn('銷毀檢測器失敗:', error);
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
