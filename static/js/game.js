// ==========================================
// 拼貼遊戲模組 - 模組化優化版
// ==========================================

// 🎯 全域變數
const DOM = {};
const state = {
    active: false,
    timerInterval: null,
    startTime: 0,
    elapsed: 0,
    penaltyTime: 0,
    hintsLeft: 3,
    hintCooldown: false,
    collageLoaded: false,
    currentCollageId: null,
    targetEl: null,
    hintOverlay: null
};

const GameConfig = {
    HINT_COOLDOWN: 5000,
    HINT_PENALTY: 3,
    MAX_HINTS: 3,
    COUNTDOWN_SECONDS: 3,
    TIMER_UPDATE_INTERVAL: 50,
    HINT_ARROW_DURATION: 1400,
    BASE_SIZE: 600  // 🔥 統一管理
};

// ==========================================
// 🧩 模組化組件
// ==========================================

// 提示模組
const HintModule = {
    handle() {
        if (!state.active || state.hintsLeft <= 0 || state.hintCooldown) return;

        state.hintsLeft--;
        state.penaltyTime += GameConfig.HINT_PENALTY;
        
        updateDisplay({ hints: state.hintsLeft });
        this.startCooldown();
        
        if (state.targetEl && state.collageLoaded) this.showArrow();
    },

    startCooldown() {
        state.hintCooldown = true;
        DOM.hintBtn.disabled = true;
        state.hintOverlay.svg.style.opacity = '1';
        
        const { prog, circ } = state.hintOverlay;
        const start = performance.now();

        function animate(now) {
            const progress = Math.min(1, (now - start) / GameConfig.HINT_COOLDOWN);
            prog.style.strokeDashoffset = circ * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                HintModule.endCooldown();
            }
        }
        
        requestAnimationFrame(animate);
    },

    endCooldown() {
        state.hintCooldown = false;
        state.hintOverlay.svg.style.opacity = '0';
        if (state.hintsLeft > 0) DOM.hintBtn.disabled = false;
    },

    showArrow() {
        const boxRect = DOM.canvasBox.getBoundingClientRect();
        const targetRect = state.targetEl.getBoundingClientRect();
        
        const center = { x: boxRect.width / 2, y: boxRect.height / 2 };
        const target = {
            x: (targetRect.left - boxRect.left) + targetRect.width / 2,
            y: (targetRect.top - boxRect.top) + targetRect.height / 2
        };
        
        const dx = target.x - center.x;
        const dy = target.y - center.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const maxLength = Math.max(DOM.canvasBox.clientWidth, DOM.canvasBox.clientHeight) * 0.8;
        const arrowLength = Math.min(Math.max(distance - 50, 40), maxLength);
        
        this.createArrow(center.x, center.y, arrowLength, angle);
        this.highlightTarget();
    },

    createArrow(x, y, length, angle) {
        const arrow = document.createElement('div');
        arrow.style.cssText = `
            position: absolute; left: ${x}px; top: ${y-3}px; width: ${length}px;
            height: 6px; background: linear-gradient(90deg, #f6ad55, #ed8936);
            border-radius: 3px; transform-origin: 0 50%; transform: rotate(${angle}deg);
            z-index: 10; pointer-events: none;
        `;
        
        const head = document.createElement('div');
        head.style.cssText = `
            position: absolute; right: -6px; top: -3px; width: 0; height: 0;
            border-left: 12px solid #ed8936; border-top: 6px solid transparent;
            border-bottom: 6px solid transparent;
        `;
        
        arrow.appendChild(head);
        DOM.canvasBox.appendChild(arrow);
        
        setTimeout(() => arrow.remove(), GameConfig.HINT_ARROW_DURATION);
    },

    highlightTarget() {
        state.targetEl.style.filter = 'drop-shadow(0 0 8px #f6ad55)';
        setTimeout(() => state.targetEl.style.filter = '', GameConfig.HINT_ARROW_DURATION);
    }
};

// 計時器模組
const TimerModule = {
    start() {
        state.timerInterval = setInterval(() => {
            state.elapsed = (Date.now() - state.startTime) / 1000 + state.penaltyTime;
            updateDisplay({ timer: state.elapsed });
        }, GameConfig.TIMER_UPDATE_INTERVAL);
    },

    stop() {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
        state.active = false;
        state.elapsed = (Date.now() - state.startTime) / 1000 + state.penaltyTime;
        
        updateDisplay({ timer: state.elapsed });
        DOM.startBtn.disabled = false;
        return state.elapsed;
    }
};

// 點擊處理模組 ?
const ClickHandler = {
    handle(e) {
        if (!state.active || !e.target.classList.contains('photo')) return;

        if (e.target.dataset.isTarget === 'true') {
            this.handleTarget();
        } else {
            this.handleMiss(e);
        }
    },

    handleTarget() {
        const timeUsed = TimerModule.stop();
        state.active = false;

        let playerName = null;
        while (!playerName) {
            playerName = prompt('找到啦! 請輸入你的名字(必填):', '匿名玩家');
            if (playerName === null) break; // 按取消就跳出
        }

        if (playerName !== null && state.currentCollageId) {
            // 只有按確認才提交
            LeaderboardModule.submitScore(state.currentCollageId, timeUsed, playerName);
        } else {
            updateDisplay({ status: '成績未提交' });
        }
    },


    handleMiss(e) {
        if (!state.targetEl) {
            updateDisplay({ status: '❌ 再試試看！' });
            return;
        }
        
        const boxRect = DOM.canvasBox.getBoundingClientRect();
        const click = { x: e.clientX - boxRect.left, y: e.clientY - boxRect.top };
        const target = {
            x: state.targetEl.offsetLeft + state.targetEl.offsetWidth / 2,
            y: state.targetEl.offsetTop + state.targetEl.offsetHeight / 2
        };
        
        const distance = Math.sqrt((click.x - target.x) ** 2 + (click.y - target.y) ** 2);
        
        const feedback = [
            [40, '🔥 只差一點點！'],
            [80, '🌞 接近了！'],
            [150, '🌥️ 還行'],
            [250, '🌬️ 有點遠']
        ].find(([threshold]) => distance < threshold)?.[1] || '❄️ 太遠啦~';
        
        updateDisplay({ status: feedback });
    }
};

// 倒數計時模組
const CountdownModule = {
    show(callback) {
        const overlay = this.getOrCreateOverlay();
        const number = overlay.querySelector('.countdown-number');

        DOM.startBtn.disabled = true;
        DOM.canvasBox.style.visibility = 'hidden';
        overlay.style.display = 'flex';

        let count = GameConfig.COUNTDOWN_SECONDS;
        const tick = () => {
            if (count > 0) {
                number.textContent = count--;
                setTimeout(tick, 800);
            } else {
                number.textContent = 'GO!';
                setTimeout(() => {
                    overlay.style.display = 'none';
                    DOM.canvasBox.style.visibility = 'visible';
                    callback();
                }, 600);
            }
        };
        tick();
    },

    getOrCreateOverlay() {
        let overlay = document.getElementById('countdownOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'countdownOverlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.8);
                display: flex; align-items: center; justify-content: center;
                z-index: 1000;
            `;
            
            const number = document.createElement('div');
            number.className = 'countdown-number';
            number.style.cssText = `
                font-size: 6rem; color: white; font-weight: bold; text-align: center;
            `;
            
            overlay.appendChild(number);
            document.body.appendChild(overlay);
        }
        return overlay;
    }
};

// 拼貼渲染模組 - 使用 DocumentFragment 優化
const CollageModule = {
    render(data, collageId) {
        // 清除任何之前的 transform
        DOM.canvasBox.innerHTML = '';
        DOM.canvasBox.style.transform = '';
        DOM.canvasBox.style.transformOrigin = '';
        
        state.targetEl = null;
        state.collageLoaded = false;

        const images = data.image_info || [];
        if (!images.length) {
            state.collageLoaded = true;
            return;
        }

        // 顯示目標照片
        const targetPhoto = document.getElementById('targetPhoto');
        const targetImage = images.find(img => img.is_target);
        if (targetPhoto && targetImage) {
            targetPhoto.src = targetImage.src;
            targetPhoto.style.display = 'block';
        }

        const fragment = document.createDocumentFragment();
        let loadedCount = 0;

        images.forEach(imgData => {
            const img = this.createImageElement(imgData);
            if (imgData.is_target) state.targetEl = img;
            
            const handleLoad = () => {
                if (++loadedCount === images.length) this.onLoaded();
            };
            
            img.addEventListener('load', handleLoad);
            img.addEventListener('error', handleLoad);
            fragment.appendChild(img);
        });

        DOM.canvasBox.appendChild(fragment);

        state.currentCollageId = collageId;
        LeaderboardModule.update(data.leaderboard || []);
    },

    createImageElement(imgData) {
        const img = document.createElement('img');
        img.src = imgData.src;
        img.className = 'photo';
        img.dataset.isTarget = imgData.is_target;
        
        img.style.cssText = `
            left: ${(imgData.x / GameConfig.BASE_SIZE * 100)}%; 
            top: ${(imgData.y / GameConfig.BASE_SIZE * 100)}%;
            width: ${(imgData.w / GameConfig.BASE_SIZE * 100)}%; 
            height: ${(imgData.h / GameConfig.BASE_SIZE * 100)}%;
            --angle: ${imgData.rotate}deg;
        `;
        return img;
    },

    onLoaded() {
        state.collageLoaded = true;
        
        if (state.active && state.hintsLeft > 0 && !state.hintCooldown) {
            DOM.hintBtn.disabled = false;
        }
    }
};

// 排行榜模組 - 也使用 DocumentFragment 優化
const LeaderboardModule = {
    update(data) {
        if (!DOM.leaderboard) return;
        
        const fragment = document.createDocumentFragment();
        
        data.forEach((entry, i) => {
            const li = document.createElement('li');
            li.className = 'd-flex justify-content-between align-items-center py-2 px-3 mb-2 bg-light rounded';
            li.innerHTML = `
                <span class="fw-bold text-primary">${i + 1}.</span>
                <span class="flex-grow-1 ms-2">${entry.name}</span>
                <span class="badge bg-primary">${entry.time.toFixed(2)}s</span>
            `;
            fragment.appendChild(li);
        });
        
        DOM.leaderboard.innerHTML = '';
        DOM.leaderboard.appendChild(fragment);
    },

    submitScore(collageId, timeUsed, playerName) {
        fetch(`/collage/${collageId}/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ time: timeUsed, name: playerName })
        })
        .then(res => res.json())
        .then(data => {
            this.update(data.leaderboard);
            ModalModule.showGameComplete(timeUsed, data.leaderboard, playerName);
        })
        .catch(err => {
            console.error('提交成績失敗:', err);
            updateDisplay({ status: '成績提交失敗' });
        });
    }
};

// 彈窗模組
const ModalModule = {
    showGameComplete(timeUsed, leaderboard, playerName) {
        const rank = leaderboard.findIndex(entry => 
            entry.name === playerName && Math.abs(entry.time - timeUsed) < 0.01
        ) + 1;
        
        DOM.modalTime.textContent = `完成時間: ${timeUsed.toFixed(2)} 秒`;
        DOM.modalRank.textContent = `排行榜排名: #${rank || 'N/A'}`;
        DOM.gameOverModal.style.display = 'flex';
    },

    hide() {
        DOM.gameOverModal.style.display = 'none';
    }
};

// ==========================================
// 🚀 初始化與工具函數
// ==========================================
const DOMModule = {
    init() {
        const mapping = {
            gameArea: 'gameArea', startBtn: 'startBtn', hintBtn: 'hintBtn',
            timer: 'timer', statusMsg: 'statusMsg', hintCount: 'hintCount', canvasBox: 'game-canvas-box',
            leaderboard: 'leaderboard', gameOverModal: 'gameOverModal', modalTime: 'modalTime',
            modalRank: 'modalRank', playAgainBtn: 'playAgainBtn', backBtn: 'backBtn'
        };

        Object.entries(mapping).forEach(([key, id]) => {
            DOM[key] = document.getElementById(id);
        });

        const required = ['gameArea', 'startBtn'];
        const missing = required.filter(key => !DOM[key]);
        
        if (missing.length > 0) {
            console.warn(`Game: 缺少必要元素 ${missing.join(', ')}`);
            return false;
        }
        
        return true;
    }
};

// ✅ 簡化版
function initDOM() {
    DOM.gameArea = document.getElementById('gameArea');
    DOM.startBtn = document.getElementById('startBtn');
    DOM.hintBtn = document.getElementById('hintBtn');
    DOM.timer = document.getElementById('timer');
    DOM.statusMsg = document.getElementById('statusMsg');
    DOM.hintCount = document.getElementById('hintCount');
    DOM.canvasBox = document.getElementById('game-canvas-box');
    DOM.leaderboard = document.getElementById('leaderboard');
    DOM.gameOverModal = document.getElementById('gameOverModal');
    DOM.modalTime = document.getElementById('modalTime');
    DOM.modalRank = document.getElementById('modalRank');
    DOM.playAgainBtn = document.getElementById('playAgainBtn');
    DOM.backBtn = document.getElementById('backBtn');
    
    return DOM.gameArea && DOM.startBtn; // 簡單檢查
}

function updateDisplay(updates) {
    if ('timer' in updates && DOM.timer) {
        DOM.timer.textContent = (updates.timer || 0).toFixed(2);
    }
    if ('hints' in updates && DOM.hintCount) {
        DOM.hintCount.textContent = updates.hints;
    }
    if ('status' in updates && DOM.statusMsg) {
        DOM.statusMsg.textContent = updates.status;

        DOM.statusMsg.style.display = 'block';
        DOM.statusMsg.classList.add('show');
        clearTimeout(DOM.statusMsg.hideTimeout);
        DOM.statusMsg.hideTimeout = setTimeout(() => {
            DOM.statusMsg.classList.remove('show');
        }, 2000); // 顯示 2 秒自動消失
    }
}

function initGame() {
    if (!DOMModule.init()) {
        console.warn('Game: 遊戲區塊元素未找到，跳過初始化');
        return;
    }

    setupGame();
    console.log("Game Initialized");
}

function setupGame() {
    updateDisplay({ timer: 0, hints: state.hintsLeft});

    bindEvents();
    createHintOverlay();
}

function startGame() {
    Object.assign(state, {
        active: true,
        startTime: Date.now(),
        penaltyTime: 0,
        hintsLeft: 3
    });
    
    DOM.gameArea.style.display = '';
    
    updateDisplay({ hints: state.hintsLeft, status: '找找看拼貼中的目標！' });
    TimerModule.start();
    
    if (state.collageLoaded && !state.hintCooldown) {
        DOM.hintBtn.disabled = false;
    }
}

function bindEvents() {
    DOM.startBtn.addEventListener('click', () => {
        // 沒有拼貼不能開始
        if (!state.currentCollageId || !state.collageLoaded) {
            alert('請先去製作拼貼！');
            return;
        }

        CountdownModule.show(startGame);
    });

    DOM.hintBtn.addEventListener('click', () => HintModule.handle());
    DOM.canvasBox.addEventListener('click', (e) => ClickHandler.handle(e));

    DOM.playAgainBtn.addEventListener('click', () => {
        ModalModule.hide();
        DOM.startBtn.click();
    });

    DOM.backBtn.addEventListener('click', () => {
        ModalModule.hide();
    });
}

function createHintOverlay() {
    const wrapper = document.createElement('span');
    wrapper.style.cssText = 'position: relative; display: inline-block;';
    
    DOM.hintBtn.parentNode.insertBefore(wrapper, DOM.hintBtn);
    wrapper.appendChild(DOM.hintBtn);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '36');
    svg.setAttribute('height', '36');
    svg.setAttribute('viewBox', '0 0 36 36');
    svg.style.cssText = `
        position: absolute; top: 50%; left: 50%; 
        transform: translate(-50%, -50%); pointer-events: none;
    `;

    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({cx: '18', cy: '18', r: '16', fill: 'none', stroke: '#e2e8f0', 'stroke-width': '3'})
        .forEach(([k, v]) => bg.setAttribute(k, v));

    const prog = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    Object.entries({cx: '18', cy: '18', r: '16', fill: 'none', stroke: '#f6ad55', 'stroke-width': '3', 'stroke-linecap': 'round', transform: 'rotate(-90 18 18)'})
        .forEach(([k, v]) => prog.setAttribute(k, v));
    
    const circumference = 2 * Math.PI * 16;
    prog.style.strokeDasharray = `${circumference} ${circumference}`;
    prog.style.strokeDashoffset = `${circumference}`;

    svg.appendChild(bg);
    svg.appendChild(prog);
    wrapper.appendChild(svg);

    state.hintOverlay = { svg, prog, circ: circumference };
    svg.style.opacity = '0';
    DOM.hintBtn.disabled = !state.collageLoaded;
}

/**
 * 📥 載入最新生成的拼貼資料
 * 
 * 從後端 API 取得最新的拼貼資訊並渲染到遊戲畫布
 * 流程：取得拼貼清單 → 找到最新項目 → 取得詳細資料 → 渲染遊戲
 */
async function loadLatestCollage() {
    try {
        // 📊 取得拼貼庫清單
        const galleryData = await fetch('/gallery').then(res => res.json());
        if (galleryData.items?.length > 0) {
            // 🎯 取得最新拼貼的 ID（假設第一個是最新的）
            const latestId = galleryData.items[0].id;
            // 📄 取得該拼貼的詳細資料（包含圖片位置資訊）
            const collageData = await fetch(`/collage/${latestId}`).then(res => res.json());
            // 🎮 將拼貼資料渲染到遊戲畫布
            CollageModule.render(collageData, latestId);
        }
    } catch (err) {
        console.error('載入最新拼貼失敗:', err);
    }
}

/**
 * 🎮 設置拼貼載入後的遊戲環境
 * 
 * 當拼貼成功載入後，準備遊戲界面讓用戶可以開始遊戲
 * 功能：顯示遊戲按鈕 → 設置導航 → 更新狀態訊息 → 刷新拼貼庫
 */
function setupGameAfterCollage() {
    // 🔘 顯示遊戲導航按鈕
    const navGame = document.getElementById('navGame');
    if (navGame) navGame.style.display = '';
    
    // 🎯 設置當前頁面為遊戲頁面（如果有導航函數）
    if (typeof setActiveNav === 'function') setActiveNav('game');
    
    // 💬 更新狀態訊息，提示用戶可以開始遊戲
    updateDisplay({ status: '按下開始遊戲按鈕開始！' });
    state.active = false;
    DOM.gameArea.style.display = '';
    
    if (typeof fetchGallery === 'function') fetchGallery();
}

// ==========================================
// 🎯 模組匯出與初始化
// ==========================================
document.addEventListener('DOMContentLoaded', initGame);

window.GameModule = {
    renderCollage: (data, id) => CollageModule.render(data, id),
    resetGameState: () => {
        Object.assign(state, { active: false, hintsLeft: 3 });
        updateDisplay({ timer: 0, hints: state.hintsLeft});
    }
};