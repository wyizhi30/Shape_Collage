/* 照片展示相關 JavaScript */

// 響應式佈局 + Masonry layout
function updateLayout(grid) {
    const w = window.innerWidth, h = window.innerHeight;
    const cols = w < 576 ? 1 : w/h >= 1.8 ? 4 : w/h >= 1.25 ? 3 : 2;
    const gutter = w < 576 ? 8 : w < 992 ? 12 : 16;
    grid.style.setProperty('--col-width', `calc((100% - ${(cols-1)*gutter}px)/${cols})`);
    if(grid._msn) grid._msn.options.gutter = gutter, grid._msn.layout();
    return gutter;
}

// 統一 Masonry 初始化
function initMasonry(grid, gutter) {
    if (!grid._msn) {
        grid._msn = new Masonry(grid, {
            itemSelector: '.grid-item', 
            columnWidth: '.grid-sizer', 
            percentPosition: true, 
            gutter
        });
    } else {
        grid._msn.reloadItems();
        grid._msn.layout();
    }
    grid.classList.add('visible');
}

// 載入拼貼畫廊
async function fetchGallery() {
    const grid = document.getElementById('grid');
    if (!grid || grid.dataset.galleryLoaded === 'true') return;
    
    try {
        const res = await fetch('/gallery');
        const data = await res.json();
        
        grid.innerHTML = '<div class="grid-sizer"></div>';
        
        if (!data.items?.length) {
            grid.innerHTML += '目前沒有拼貼作品';
            return;
        }
        
        const frag = document.createDocumentFragment();
        
        data.items.forEach(item => {
            if (!item?.preview_src) return;
            
            const card = document.createElement('div');
            card.className = 'grid-item mb-4';
            card.style.setProperty('--rand', (Math.random() * 1.6 + 0.2).toFixed(2));
            
            card.innerHTML = `
                <div class="gallery-card" data-collage-id="${item.id}">
                    <img src="${item.preview_src}" alt="拼貼 ${item.timestamp}" loading="lazy">
                    <div class="gallery-label">拼貼 ${item.timestamp}</div>
                </div>`;
            
            // 點擊進入遊戲
            card.addEventListener('click', () => loadCollageGame(item.id));
            frag.appendChild(card);
        });
        
        grid.appendChild(frag);
        
        imagesLoaded(grid, () => {
            const gutter = updateLayout(grid);
            initMasonry(grid, gutter);
            grid.dataset.galleryLoaded = 'true';
        });

    } catch(err) {
        console.error('fetchGallery error:', err);
        grid.innerHTML = '<div class="grid-sizer"></div>載入失敗';
    }
}

// 載入拼貼遊戲
async function loadCollageGame(collageId) {
    try {
        const res = await fetch(`/collage/${collageId}`);
        const freshData = await res.json();
        console.log(freshData)
        if (!freshData?.image_info) {
            alert('拼貼數據無效');
            return;
        }
        
        // 使用遊戲模組渲染拼貼
        if (window.GameModule?.renderCollage) {
            window.GameModule.renderCollage(freshData, collageId);
        }
        
        // 切換到遊戲頁面
        if (typeof showSection === 'function') {
            showSection('game');
        }
        
        // 設置遊戲初始狀態
        const statusMsg = document.getElementById('statusMsg');
        if (statusMsg) statusMsg.textContent = "Press Start Game to begin!";
        
        // 重置遊戲狀態
        if (window.GameModule?.resetGameState) {
            window.GameModule.resetGameState();
        }
        
    } catch(err) {
        console.error('loadCollageGame error:', err);
        alert('無法載入拼貼：' + err.message);
    }
}

// 刪除拼貼函數
function deleteCollage(collageId, cardElement) {
    fetch(`/collage/${collageId}`, {
        method: 'DELETE'
    })
    .then(res => {
        if (res.ok) {
            // 從 DOM 中移除卡片
            cardElement.remove();
            
            // 重新佈局 Masonry
            const grid = document.getElementById('grid');
            if (grid && grid._msn) {
                grid._msn.reloadItems();
                grid._msn.layout();
            }
        } else {
            throw new Error('刪除失敗');
        }
    })
    .catch(err => {
        console.error('Delete error:', err);
        alert('刪除拼貼失敗：' + err.message);
    });
}

// resize debounce
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        const grid = document.getElementById('grid');
        if (grid) updateLayout(grid);
    }, 140);
});

// 匯出函數
window.GalleryModule = {
    fetchGallery,
    updateLayout,
    loadCollageGame
};