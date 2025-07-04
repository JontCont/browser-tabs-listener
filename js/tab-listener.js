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
        
        // 延遲檢測，等待重複分頁檢測完成
        setTimeout(() => {
            this.performOpeningDetection(openerElement);
        }, 100);
    }

    performOpeningDetection(openerElement) {
        // 獲取重複分頁檢測結果
        const isDuplicate = duplicateDetector ? duplicateDetector.isDuplicate : false;
        
        if (window.opener) {
            // 通過 window.open() 開啟的新分頁/視窗
            openerElement.textContent = '新分頁/視窗開啟';
            openerElement.className = 'value new-tab';
            logEvent('檢測到頁面在新分頁/視窗中開啟', 'detection');
            console.log('此頁面是在新視窗/分頁中開啟的');
        } else if (isDuplicate) {
            // 重複分頁 - 可能是複製分頁
            openerElement.textContent = '複製分頁開啟';
            openerElement.className = 'value duplicate-tab';
            logEvent('檢測到可能是複製分頁開啟', 'detection');
            console.log('此頁面可能是通過複製分頁開啟的');
        } else if (document.referrer) {
            // 從其他頁面導航而來
            const referrerDomain = this.extractDomain(document.referrer);
            const currentDomain = this.extractDomain(window.location.href);
            
            if (referrerDomain === currentDomain) {
                openerElement.textContent = '站內導航開啟';
                openerElement.className = 'value internal-navigation';
                logEvent(`從同站頁面 ${document.referrer} 導航而來`, 'detection');
            } else {
                openerElement.textContent = '外部連結開啟';
                openerElement.className = 'value external-link';
                logEvent(`從外部網站 ${referrerDomain} 導航而來`, 'detection');
            }
        } else {
            // 檢查是否可能是書籤或手動輸入
            const hasHistory = this.checkBrowserHistory();
            if (hasHistory) {
                openerElement.textContent = '書籤/歷史開啟';
                openerElement.className = 'value bookmark-access';
                logEvent('可能是從書籤或瀏覽歷史開啟', 'detection');
            } else {
                openerElement.textContent = '直接訪問';
                openerElement.className = 'value direct-access';
                logEvent('直接訪問頁面（手動輸入網址）', 'detection');
            }
        }
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch (e) {
            return '';
        }
    }

    checkBrowserHistory() {
        try {
            // 檢查歷史記錄長度（不完全準確，但可以作為參考）
            return window.history.length > 1;
        } catch (e) {
            return false;
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
