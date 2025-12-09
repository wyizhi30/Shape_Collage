/* 拼貼製作相關 JavaScript */

// DOM 元素獲取
const radios = document.querySelectorAll('input[name="shape"]');
const customMaskDiv = document.getElementById('customMaskUpload');
const textInput = document.getElementById('textInput');
const drawHint = document.getElementById('drawHint');
const drawModal = document.getElementById('drawModal');
const canvas = document.getElementById('drawCanvas');
const ctx = canvas ? canvas.getContext("2d") : null;
const previewCanvas = document.getElementById('drawPreview');
const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
const canvasBox = document.getElementById('canvas-box');
const collageResult = document.getElementById('collageResult');
const loadingDiv = document.getElementById('loading');

// 手繪相關按鈕
const openDrawModalBtn = document.getElementById('openDrawModalBtn');
const clearCanvasBtn = document.getElementById('clearCanvasBtn');
const finishDrawBtn = document.getElementById('finishDrawBtn');

// 初始化手繪畫布為白底
if (ctx) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ✅ 切換表單輸入區塊顯示
function toggleInputs() {
    const sel = document.querySelector('input[name="shape"]:checked').value;
    
    // 隱藏所有條件輸入
    customMaskDiv.style.display = 'none';
    textInput.style.display = 'none';
    drawHint.style.display = 'none';
    
    // 根據選擇顯示對應輸入
    if (sel === 'custom_silhouette') {
        customMaskDiv.style.display = 'block';
    } else if (sel === 'text_mask') {
        textInput.style.display = 'inline-block';
    } else if (sel === 'draw') {
        drawHint.style.display = 'block';
    }
}

// 事件監聽器設置
radios.forEach(r => r.addEventListener('change', toggleInputs));

// ✅ Modal 控制函數
function openDrawModal() {
    drawModal.classList.add('show');
    document.body.style.overflow = 'hidden'; // 防止背景滾動
}

function closeDrawModal() {
    drawModal.classList.remove('show');
    document.body.style.overflow = ''; // 恢復背景滾动
}

// ✅ Modal 按鈕事件監聽
openDrawModalBtn?.addEventListener('click', openDrawModal);

finishDrawBtn?.addEventListener('click', () => {
    closeDrawModal();

    // 更新預覽
    if (canvas && previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }
});

// 點擊背景關閉 Modal
drawModal?.addEventListener('click', (e) => {
    if (e.target === drawModal || e.target.classList.contains('draw-modal-backdrop')) {
        closeDrawModal();
    }

    // 更新預覽
    if (canvas && previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }
});

// ESC 鍵關閉 Modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawModal?.classList.contains('show')) {
        closeDrawModal();
    }

    // 更新預覽
    if (canvas && previewCtx) {
        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
    }
});

// ✅ 手繪功能
let drawing = false, lastX = 0, lastY = 0, brushSize = 44;

if (canvas) {
    // 滑鼠事件
    canvas.addEventListener("mousedown", startDrawing);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);
    
    // 觸控事件（手機支援）
    canvas.addEventListener("touchstart", handleTouch);
    canvas.addEventListener("touchmove", handleTouch);
    canvas.addEventListener("touchend", stopDrawing);
}

function startDrawing(e) {
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if (e.type === 'mousedown') {
        lastX = (e.clientX - rect.left) * scaleX;
        lastY = (e.clientY - rect.top) * scaleY;
    }
}

function draw(e) {
    if (!drawing || !ctx) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let currentX, currentY;
    if (e.type === 'mousemove') {
        currentX = (e.clientX - rect.left) * scaleX;
        currentY = (e.clientY - rect.top) * scaleY;
    }
    
    ctx.strokeStyle = "black";
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();
    
    [lastX, lastY] = [currentX, currentY];
}

function stopDrawing() {
    drawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const mouseEvent = new MouseEvent(
        e.type === 'touchstart' ? 'mousedown' : 
        e.type === 'touchmove' ? 'mousemove' : 'mouseup',
        {
            clientX: touch.clientX,
            clientY: touch.clientY
        }
    );
    
    if (e.type === 'touchstart') {
        startDrawing(mouseEvent);
    } else if (e.type === 'touchmove') {
        draw(mouseEvent);
    }
}

// ✅ 清除畫布
clearCanvasBtn?.addEventListener("click", () => {
    if (ctx && previewCtx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
        previewCtx.fillStyle = "white";
        previewCtx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    }
});

// base64 轉 Blob（保持原有邏輯）
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const match = parts[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/png';
    const byteString = atob(parts[1]);
    const u8arr = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
        u8arr[i] = byteString.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}

// ✅ 表單送出（保持原有邏輯）
document.getElementById("uploadForm")?.addEventListener("submit", function(event){
    event.preventDefault();
    const fd = new FormData(this);
    
    // 若選手繪，加入手繪遮罩
    if(document.querySelector('input[name="shape"]:checked').value === 'draw' && canvas){
        const dataURL = canvas.toDataURL("image/png");
        const blob = dataURLToBlob(dataURL);
        fd.append("drawn_shape", blob, "drawn_shape.png");
    }
    
    collageResult.textContent = '產生中...';
    loadingDiv.style.display = 'flex';
    
    fetch("/generate_collage", { method: "POST", body: fd })
        .then(res => {
            if (!res.ok) {
                return res.text().then(text => {
                    throw new Error(`HTTP ${res.status}: ${text.substring(0, 200)}`);
                });
            }
            return res.json();
        })
        .then(data => {
            console.log('✅ 拼貼生成成功');
            
            // 清空舊拼貼
            canvasBox.innerHTML = "";
            loadingDiv.style.display = 'none';
            
            displayResult(data);
            
            // 自動保存到 carousel 資料夾
            // setTimeout(() => {
            //     saveToCarousel();
            // }, 1000);
        })
        .catch(err => {
            loadingDiv.style.display = 'none';
            collageResult.textContent = "網路異常或伺服器無回應，請稍後再試";
            console.error('Collage generation error:', err);
        });
});

// 綁定儲存確認按鈕事件
function bindSaveConfirmButtons() {
    const savePublicBtn = document.getElementById('savePublicBtn');
    const savePrivateBtn = document.getElementById('savePrivateBtn');
    
    if (!savePublicBtn || !savePrivateBtn) {
        console.warn('儲存按鈕元素不存在，跳過綁定');
        return;
    }
    
    function handlePublicSetting(isPublic) {
        if (!window.generatedCollage?.collage_id) {
            alert('找不到拼貼 ID');
            return;
        }
        
        // ✅ 立即顯示 Toast，不等待伺服器回應
        showSaveStatusToast(isPublic);
        
        // ✅ 背景處理，不阻塞使用者操作
        fetch(`/collage/${window.generatedCollage.collage_id}/set_public`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_public: isPublic })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log(`✅ ${isPublic ? '公開' : '私密'}設定成功`);
                if (isPublic) setTimeout(() => saveToCarousel(), 500);
            } else {
                console.error('設定失敗:', result.error);
            }
        })
        .catch(error => {
            console.error('設定請求失敗:', error);
        });
    }
    
    savePublicBtn.onclick = () => handlePublicSetting(true);
    savePrivateBtn.onclick = () => handlePublicSetting(false);
}

// ✅ 新增：顯示儲存狀態 Toast
function showSaveStatusToast(isPublic) {
    const existing = document.querySelector('.save-status-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = isPublic ? 'alert alert-success mt-2 save-status-toast' : 'alert alert-secondary mt-2 save-status-toast';
    toast.innerHTML = isPublic 
        ? '✅ 作品已公開，現在會顯示在照片展示區'
        : '🔒 作品已設為私密，不會顯示在公開展示區';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        opacity: 0;
        transition: opacity 0.3s ease;
        max-width: 400px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; }, 50);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function displayResult(data) {
    const downloadSection = document.getElementById('downloadSection');
    const playGameBtn = document.getElementById('playGameBtn');
    const saveConfirmBox = document.getElementById('saveConfirmBox');

    if (!data.image_info || !data.images || data.image_info.length === 0 || data.images.length === 0) {
        collageResult.textContent = data.error || '產生失敗';
        downloadSection.style.display = 'none';
        playGameBtn.style.display = 'none';
        return;
    }

    collageResult.textContent = '拼貼產生成功！';

    const baseSize = 600;
    canvasBox.innerHTML = "";
    const positions = data.image_info;

    // ✅ 洗牌全部圖片
    let imageList = shuffle(data.images);

    // 按位置依序放圖片
    positions.forEach((pos, index) => {
        const imgData = imageList[index % imageList.length];

        const el = document.createElement("img");
        el.src = imgData.img_path;
        el.className = imgData.is_target ? "photo target-photo" : "photo";
        
        el.style.cssText = `
            left: ${(pos.x / baseSize * 100)}%;
            top: ${(pos.y / baseSize * 100)}%;
            width: ${(pos.w / baseSize * 100)}%;
            height: ${(pos.h / baseSize * 100)}%;
            --angle: ${pos.rotate}deg;
        `;

        el.onerror = function () {
            console.warn(`圖片載入失敗: ${this.src}`);
            this.style.display = 'none';
        };

        canvasBox.appendChild(el);

        if (imgData.is_target) {
            el.dataset.isTarget = 'true';
            imageList = imageList.filter(img => !img.is_target);
        }
    });

    // 顯示按鈕
    downloadSection.style.display = 'block';
    playGameBtn.style.display = 'inline-block';
    saveConfirmBox.style.display = 'block';

    bindSaveConfirmButtons();
    window.generatedCollage = {
        ...data,
        collage_id: data.collage_id
    };
    showSaveToastOnce();
}

function shuffle(arr) {
    const array = arr.slice();
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function showSaveToastOnce() {
    // 檢查是否已經顯示過 Toast
    if (sessionStorage.getItem('saveToastShown')) {
        return;
    }
    
    setTimeout(() => {
        const toast = document.createElement('div');
        toast.className = 'save-toast';
        toast.innerHTML = `
            <div class="save-toast-content">
                <span>💡 您可以將拼貼作品存到資料庫與其他人分享！</span>
                <button onclick="this.parentElement.parentElement.remove()" class="save-toast-close">×</button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // 3秒後自動消失
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 3000);
        
        // 標記已顯示過
        sessionStorage.setItem('saveToastShown', 'true');
    }, 1000);
}

async function startGameWithCurrentCollage() {
    // 檢查是否有生成的拼貼
    if (!window.generatedCollage?.collage_id) {
        alert('請先製作拼貼！');
        return;
    }

    // 使用遊戲模組渲染拼貼
    if (window.GameModule?.renderCollage) {
        window.GameModule.renderCollage(
            window.generatedCollage, 
            window.generatedCollage.collage_id
        );
    }
    
    // 切換到遊戲頁面
    showSection('game');
    
    // 重置遊戲狀態
    if (window.GameModule?.resetGameState) {
        window.GameModule.resetGameState();
    }
}

// 點擊拼貼照片放大/縮小（保持原有邏輯）
canvasBox?.addEventListener("click", e => {
    if(e.target.classList.contains("photo")){
        const img = e.target;
        const isEnlarged = img.classList.contains("enlarged");
        
        // 先縮回所有放大圖
        canvasBox.querySelectorAll('.photo.enlarged').forEach(other => other.classList.remove('enlarged'));
        
        // 放大目前點擊的圖
        if(!isEnlarged){
            img.classList.add("enlarged");
            canvasBox.appendChild(img);  // 移到最上層
        }
    }
});

// 初始化顯示狀態
toggleInputs();

const ScreenshotModule = {
    async captureAndDownload() {
        const wrapper = document.getElementById('screenshotWrapper'); // 改成 wrapper
        const photos = wrapper.querySelectorAll('.photo');
        const canvasBox = document.getElementById('canvas-box');

        if (photos.length === 0 && !canvasBox) {
            alert('❌ 沒有可截圖的內容！');
            return;
        }

        const btn = document.getElementById('screenshotBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '下載中...';
        btn.disabled = true;

        // 1️⃣ 計算最小外框
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        photos.forEach(img => {
            const rect = img.getBoundingClientRect();
            const wrapperRect = wrapper.getBoundingClientRect();

            const x = rect.left - wrapperRect.left;
            const y = rect.top - wrapperRect.top;

            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + rect.width);
            maxY = Math.max(maxY, y + rect.height);
        });

        minX = Math.max(0, minX);
        minY = Math.max(0, minY);

        const cropWidth = maxX - minX;
        const cropHeight = maxY - minY;

        // 3️⃣ 用 html2canvas 截整個 canvas-box
        const fullCanvas = await html2canvas(wrapper, {
            backgroundColor: '#eac99aff',
            scale: 2,
            logging: false,
            useCORS: true
        });

        // 3️⃣ 裁切
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropWidth * 2;
        cropCanvas.height = cropHeight * 2;
        const cropCtx = cropCanvas.getContext('2d');

        cropCtx.drawImage(
            fullCanvas,
            minX * 2, minY * 2, cropWidth * 2, cropHeight * 2,
            0, 0, cropWidth * 2, cropHeight * 2
        );

        // 4️⃣ 下載
        const link = document.createElement('a');
        link.download = `collage-${Date.now()}.png`;
        link.href = cropCanvas.toDataURL('image/png');
        link.click();

        btn.innerHTML = originalText;
        btn.disabled = false;

        this.showSuccessMessage();
    },

    showSuccessMessage() {
        const existing = document.querySelector('#downloadSection .alert-success');
        if (existing) existing.remove();

        const message = document.createElement('div');
        message.className = 'alert alert-success mt-2';
        message.innerHTML = '✅ 成功！已下載拼貼內容！';
        message.style.opacity = '0';
        message.style.transition = 'opacity 0.3s ease';

        const downloadSection = document.getElementById('downloadSection');
        downloadSection.appendChild(message);

        setTimeout(() => { message.style.opacity = '1'; }, 50);
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => message.remove(), 300);
        }, 2500);
    }
};

window.ScreenshotModule = ScreenshotModule;

// ✅ 修改：保存到 carousel 的函數 - 與下載效果一致
function saveToCarousel() {
    const wrapper = document.getElementById('screenshotWrapper');
    const photos = wrapper?.querySelectorAll('.photo');
    
    if (!photos || photos.length === 0) return;
    
    // 🎯 使用與下載相同的邊界計算邏輯
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    photos.forEach(img => {
        const rect = img.getBoundingClientRect();
        const wrapperRect = wrapper.getBoundingClientRect();

        const x = rect.left - wrapperRect.left;
        const y = rect.top - wrapperRect.top;

        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + rect.width);
        maxY = Math.max(maxY, y + rect.height);
    });

    minX = Math.max(0, minX);
    minY = Math.max(0, minY);

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;
    
    // 🎯 使用與下載相同的 html2canvas 設定
    html2canvas(wrapper, {
        backgroundColor: '#eac99aff', // 與下載相同的背景色
        scale: 2, // 與下載相同的解析度
        logging: false,
        useCORS: true
    }).then(fullCanvas => {
        // 🎯 使用與下載相同的裁切邏輯
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropWidth * 2;
        cropCanvas.height = cropHeight * 2;
        const cropCtx = cropCanvas.getContext('2d');

        cropCtx.drawImage(
            fullCanvas,
            minX * 2, minY * 2, cropWidth * 2, cropHeight * 2,
            0, 0, cropWidth * 2, cropHeight * 2
        );
        
        // 發送裁切後的圖片資料到後端
        const imageData = cropCanvas.toDataURL('image/png');
        
        fetch('/save_to_carousel', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_data: imageData,
                timestamp: Date.now()
            })
        }).catch(error => {
            console.error('保存到 carousel 失敗:', error);
        });
    });
}