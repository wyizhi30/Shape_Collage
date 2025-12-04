/* 回饋表單相關 JavaScript */

// 表單提交處理
document.addEventListener('DOMContentLoaded', function() {
    const feedbackForm = document.getElementById('feedbackForm');
    const feedbackSuccess = document.getElementById('feedbackSuccess');
    
    if (feedbackForm) {
        feedbackForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // 獲取表單資料
            const formData = new FormData(this);
            const data = {};
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            // 顯示載入狀態
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '📤 送出中...';
            submitBtn.disabled = true;
            
            // 送出回饋
            fetch('/submit_feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    alert(`送出失敗: ${result.error}`);
                } else {
                    // 顯示成功訊息
                    feedbackSuccess.style.display = 'block';
                    feedbackForm.style.display = 'none';
                    
                    // 滾動到成功訊息
                    feedbackSuccess.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'center' 
                    });
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('送出失敗，請稍後再試');
            })
            .finally(() => {
                // 恢復按鈕狀態
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            });
        });
        
        // 重設表單功能
        feedbackForm.addEventListener('reset', function() {
            feedbackSuccess.style.display = 'none';
            feedbackForm.style.display = 'block';
        });
    }
});

// 字數統計功能
document.addEventListener('DOMContentLoaded', function() {
    const messageTextarea = document.getElementById('feedbackMessage');
    
    if (messageTextarea) {
        // 創建字數提示元素
        const charCount = document.createElement('div');
        charCount.className = 'form-text text-end';
        charCount.id = 'charCount';
        messageTextarea.parentNode.appendChild(charCount);
        
        // 更新字數
        function updateCharCount() {
            const current = messageTextarea.value.length;
            const max = 1000;
            charCount.textContent = `${current}/${max} 字`;
            
            if (current > max * 0.9) {
                charCount.className = 'form-text text-end text-warning';
            } else if (current >= max) {
                charCount.className = 'form-text text-end text-danger';
            } else {
                charCount.className = 'form-text text-end text-muted';
            }
        }
        
        messageTextarea.addEventListener('input', updateCharCount);
        updateCharCount(); // 初始化
    }
});