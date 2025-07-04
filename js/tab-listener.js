/**
 * 瀏覽器分頁監聽器 - 核心功能
 * 檢測分頁切換狀態和可見性變化
 */

class TabListener {
    constructor() {
        this.isVisible = true;
        this.hasFocus = true;
        this.focusChangeCount = 0;
        this.visibilityChangeCount = 0;
        this.lastFocusTime = Date.now();
        this.lastVisibilityTime = Date.now();
        
        this.init();
    }

    init() {
        this.setupFocusListeners();
        this.setupVisibilityListeners();
        this.setupPageLifecycleListeners();
        this.updateInitialStatus();
    }

    setupFocusListeners() {
        // 監聽焦點變化
        window.addEventListener('focus', () => {
            this.hasFocus = true;
            this.focusChangeCount++;
            this.lastFocusTime = Date.now();
            
            this.updateTabStatus('活躍');
            this.updateStats();
            
            logEvent('分頁獲得焦點', 'focus');
            console.log('用戶回到此分頁');
        });

        window.addEventListener('blur', () => {
            this.hasFocus = false;
            this.focusChangeCount++;
            
            this.updateTabStatus('非活躍');
            this.updateStats();
            
            logEvent('分頁失去焦點', 'focus');
            console.log('用戶切換到其他分頁');
        });
    }

    setupVisibilityListeners() {
        // 監聽可見性變化
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
            this.visibilityChangeCount++;
            this.lastVisibilityTime = Date.now();
            
            if (this.isVisible) {
                this.updateVisibilityStatus('可見');
                logEvent('分頁變為可見', 'visibility');
                console.log('分頁變為可見');
            } else {
                this.updateVisibilityStatus('隱藏');
                logEvent('分頁變為隱藏', 'visibility');
                console.log('分頁變為隱藏');
            }
            
            this.updateStats();
        });
    }

    setupPageLifecycleListeners() {
        // 頁面載入完成
        window.addEventListener('load', () => {
            logEvent('頁面載入完成', 'lifecycle');
        });

        // 頁面即將關閉
        window.addEventListener('beforeunload', () => {
            logEvent('頁面即將關閉', 'lifecycle');
        });

        // 頁面隱藏（用戶離開頁面）
        window.addEventListener('pagehide', () => {
            logEvent('頁面已隱藏', 'lifecycle');
        });

        // 頁面顯示（用戶回到頁面）
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                logEvent('頁面從快取恢復', 'lifecycle');
            } else {
                logEvent('頁面重新載入', 'lifecycle');
            }
        });
    }

    updateInitialStatus() {
        // 檢測頁面開啟方式
        this.detectPageOpener();
        
        // 更新初始狀態
        this.updateTabStatus(this.hasFocus ? '活躍' : '非活躍');
        this.updateVisibilityStatus(this.isVisible ? '可見' : '隱藏');
    }

    detectPageOpener() {
        const openerElement = document.getElementById('opener-status');
        
        if (window.opener) {
            openerElement.textContent = '新分頁/視窗開啟';
            openerElement.className = 'value new-tab';
            logEvent('檢測到頁面在新分頁/視窗中開啟', 'detection');
            console.log('此頁面是在新視窗/分頁中開啟的');
        } else {
            // 檢查 referrer 來判斷開啟方式
            if (document.referrer) {
                openerElement.textContent = '連結導航開啟';
                openerElement.className = 'value link-navigation';
                logEvent(`從 ${document.referrer} 導航而來`, 'detection');
            } else {
                openerElement.textContent = '直接訪問';
                openerElement.className = 'value direct-access';
                logEvent('直接訪問頁面', 'detection');
            }
            console.log('此頁面不是在新視窗/分頁中開啟的');
        }
    }

    updateTabStatus(status) {
        const element = document.getElementById('tab-status');
        element.textContent = status;
        element.className = `value ${status === '活躍' ? 'active' : 'inactive'}`;
    }

    updateVisibilityStatus(status) {
        const element = document.getElementById('visibility-status');
        element.textContent = status;
        element.className = `value ${status === '可見' ? 'visible' : 'hidden'}`;
    }

    updateStats() {
        document.getElementById('focus-changes').textContent = this.focusChangeCount;
        document.getElementById('visibility-changes').textContent = this.visibilityChangeCount;
    }

    getStatus() {
        return {
            isVisible: this.isVisible,
            hasFocus: this.hasFocus,
            focusChangeCount: this.focusChangeCount,
            visibilityChangeCount: this.visibilityChangeCount,
            lastFocusTime: this.lastFocusTime,
            lastVisibilityTime: this.lastVisibilityTime
        };
    }
}

// 全域變數
let tabListener;

// 初始化函數
function initTabListener() {
    tabListener = new TabListener();
    
    // 每秒更新時間統計
    setInterval(() => {
        if (tabListener && typeof updateTimeStats === 'function') {
            updateTimeStats();
        }
    }, 1000);
}

// 匯出給其他模組使用
window.TabListener = TabListener;
