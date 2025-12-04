/* 導航和頁面切換相關 JavaScript */

// Section 切換功能
function showSection(sectionName, event, fromHistory = false) {
    // 阻止默認的錨點跳轉行為
    if (event) {
        event.preventDefault();
    }
    
    // ✅ 新增：自動關閉 offcanvas（如果開啟的話）
    const offcanvas = document.getElementById('offcanvasSidebar');
    if (offcanvas && offcanvas.classList.contains('show')) {
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvas);
        if (bsOffcanvas) {
            bsOffcanvas.hide();
        }
    }
    
    // 隱藏所有 section
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 顯示選中的 section
    document.getElementById('section-' + sectionName).style.display = 'block';
    
    // 平滑滾動到頁面頂部
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
    
    // 更新瀏覽器歷史記錄（只有當不是來自歷史記錄時）
    if (!fromHistory) {
        const url = `#section-${sectionName}`;
        history.pushState({ section: sectionName }, '', url);
    }
    
    // 如果是照片展示區，載入拼貼展示
    if (sectionName === 'gallery') {
        // 使用展示模組的拼貼載入函數
        if (window.GalleryModule && typeof window.GalleryModule.fetchGallery === 'function') {
            window.GalleryModule.fetchGallery();
        } else if (typeof fetchGallery === 'function') {
            fetchGallery();
        }
    }
}

// 監聽瀏覽器前進/後退按鈕
window.addEventListener('popstate', function(event) {
    if (event.state && event.state.section) {
        showSection(event.state.section, null, true);
    } else {
        // 如果沒有狀態，根據當前 URL hash 判斷要顯示的 section
        const hash = window.location.hash;
        if (hash) {
            const sectionName = hash.replace('#section-', '');
            if (document.getElementById('section-' + sectionName)) {
                showSection(sectionName, null, true);
            }
        } else {
            showSection('home', null, true);
        }
    }
});

// 頁面載入時根據 URL hash 顯示對應 section
window.addEventListener('DOMContentLoaded', function() {
    const hash = window.location.hash;
    if (hash) {
        const sectionName = hash.replace('#section-', '');
        if (document.getElementById('section-' + sectionName)) {
            showSection(sectionName, null, true);
            return;
        }
    }
    // 預設顯示首頁並設置初始歷史狀態
    showSection('home', null, false);
});