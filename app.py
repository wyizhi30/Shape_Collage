import base64
import time
from flask import Flask, render_template, request, jsonify, url_for
import os
from flask_sqlalchemy import SQLAlchemy
import json
from models import db, Collage, Leaderboard, Feedback

from collage_util_api import generate_collage_info_from_request
import random
import glob

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///photos.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.getcwd(), 'static', 'uploads')
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
db.init_app(app)

@app.route('/')
def index():
    # ✅ 從 carousel 資料夾隨機選取8張圖片
    carousel_folder = os.path.join('static', 'carousel')
    
    # 確保資料夾存在
    if not os.path.exists(carousel_folder):
        os.makedirs(carousel_folder, exist_ok=True)
    
    # 取得所有圖片檔案
    image_extensions = ['*.png', '*.jpg', '*.jpeg', '*.gif', '*.webp']
    all_images = []
    for ext in image_extensions:
        all_images.extend(glob.glob(os.path.join(carousel_folder, ext)))
    
    # 隨機選取8張 (如果不足8張就全部顯示)
    max_images = 8
    if len(all_images) >= max_images:
        selected_images = random.sample(all_images, max_images)
    else:
        selected_images = all_images
    
    # 轉換為相對路徑供前端使用
    image_urls = []
    for img_path in selected_images:
        # 將 static\carousel\image.png 轉為 /static/carousel/image.png
        relative_path = img_path.replace('\\', '/').replace('static/', '/static/')
        image_urls.append(relative_path)
    
    return render_template('integrated.html', image_urls=image_urls)


# 整合頁面路由
@app.route('/integrated')
def integrated():
    # 取得 static/carousel 資料夾所有圖片檔名
    carousel_folder = os.path.join(app.static_folder, 'carousel')
    image_files = [
        f for f in os.listdir(carousel_folder)
        if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif'))
    ]
    # 產生可用於 <img src=""> 的網址
    image_urls = [url_for('static', filename=f'carousel/{fname}') for fname in image_files]
    return render_template('integrated.html', image_urls=image_urls)

@app.route('/generate_collage', methods=['POST'])
def generate_collage():
    try:
        result = generate_collage_info_from_request(request, app.config['UPLOAD_FOLDER'], max_upload_files=100)
        
        # ---------- 儲存 DB ----------
        now_ts = time.time()
        collage_id = f"{int(now_ts)}"

        # 建立新的拼貼紀錄
        collage = Collage(
            id=collage_id,
            preview_src="",   # 你目前不用 preview
            info_json=json.dumps(result, ensure_ascii=False),
            created_at=now_ts,
            updated_at=now_ts
        )
        db.session.add(collage)
        db.session.commit()
        # -----------------------------
        
        return jsonify({
            "success": True,
            "collage_id": collage_id,
            "image_info": result["image_info"],
            "images": result["images"]
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/save_collage', methods=['POST'])
def save_collage():
    try:
        data = request.json
        image_info = data.get("image_info")

        if not image_info:
            return jsonify({'error': '缺少 image_info，無法儲存'}), 400

        from models import db, Collage

        now_ts = time.time()
        collage_id = f"{int(now_ts)}"

        # 建立新的拼貼紀錄
        collage = Collage(
            id=collage_id,
            preview_src="",  # 你不需要 preview，所以放空字串
            info_json=json.dumps(image_info, ensure_ascii=False),
            created_at=now_ts,
            updated_at=now_ts
        )

        db.session.add(collage)
        db.session.commit()

        return jsonify({'success': True, 'collage_id': collage_id})

    except Exception as e:
        print("Save failed:", e)
        return jsonify({'error': str(e)}), 500

# 獲取所有拼貼作品
@app.route('/gallery', methods=['GET'])
def get_gallery():
    """返回所有已生成的拼貼作品列表"""
    try:
        collages = Collage.query.order_by(Collage.updated_at.desc()).all()
        gallery_items = []
        for collage in collages:
            gallery_items.append({
                'id': collage.id,
                'preview_src': collage.preview_src,
                'updated_at': collage.updated_at,
                'name': collage.id,
                'timestamp': collage.id
            })
        
        return jsonify({'items': gallery_items})
        
    except Exception as e:
        print(f"Database gallery query failed: {e}")
        return jsonify({'error': 'Failed to load gallery', 'details': str(e)}), 500

# 獲取指定拼貼的詳細資料
@app.route('/collage/<info_id>', methods=['GET'])
def get_collage_detail(info_id):
    try:
        collage = Collage.query.filter_by(id=info_id).first()
        if not collage or not collage.info_json:
            return jsonify({"error": "Collage not found"}), 404

        # ---- 解析 info_json ----
        try:
            raw = json.loads(collage.info_json)
        except Exception:
            raw = {}

        # ---- 解包核心資料 ----
        image_info = raw.get("image_info", [])
        images = raw.get("images", [])

        # ---- 載入排行榜 ----
        try:
            scores = (Leaderboard.query
                        .filter_by(collage_id=info_id)
                        .order_by(Leaderboard.time.asc())
                        .limit(10)
                        .all())
            leaderboard = [{"name": s.name, "time": s.time} for s in scores]
        except Exception:
            leaderboard = []

        # ---- 直接回傳前端需要的乾淨格式 ----
        return jsonify({
            "image_info": image_info,   # 324 個位置
            "images": images,           # 13 張圖片（包含 target）
            "leaderboard": leaderboard
        })

    except Exception as e:
        print("ERROR in get_collage_detail:", e)
        return jsonify({"error": "Server error"}), 500


# 排行榜相關路由
@app.route('/collage/<collage_id>/leaderboard', methods=['GET'])
def get_leaderboard(collage_id):
    """獲取指定拼貼的排行榜"""
    try:
        # 按時間排序，最快的在前面
        scores = Leaderboard.query.filter_by(collage_id=collage_id).order_by(Leaderboard.time.asc()).limit(10).all()
        return jsonify({'leaderboard': [{'name': score.name, 'time': score.time} for score in scores]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/collage/<info_id>/leaderboard', methods=['POST'])
def save_leaderboard(info_id):
    """提交遊戲成績到排行榜並返回完整排行榜"""
    try:
        data = request.get_json()
        time_used = data.get('time')
        name = data.get('name', '匿名玩家')  # 預設為匿名玩家
        
        if time_used is None:
            return jsonify({'error': 'Missing time'}), 400
        
        # 創建新的排行榜記錄
        score = Leaderboard(
            collage_id=info_id,
            name=name,
            time=float(time_used)
        )
        
        db.session.add(score)
        db.session.commit()
        
        # 返回前10名排行榜
        scores = Leaderboard.query.filter_by(collage_id=info_id).order_by(Leaderboard.time.asc()).limit(10).all()
        leaderboard = [{'name': score.name, 'time': score.time} for score in scores]
        
        return jsonify({'leaderboard': leaderboard})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# 新增回饋表單路由
@app.route('/submit_feedback', methods=['POST'])
def submit_feedback():
    """處理回饋表單提交 - 儲存到資料庫"""
    try:
        data = request.get_json()
        
        # ✅ 創建回饋記錄
        feedback = Feedback(
            type=data['feedbackType'],
            subject=data['feedbackSubject'],
            message=data['feedbackMessage']
        )
        
        # ✅ 儲存到資料庫
        db.session.add(feedback)
        db.session.commit()
        
        # TODO: 可以在這裡發送郵件通知
        
        return jsonify({
            'message': '回饋送出成功！感謝您的寶貴意見。',
            'status': 'success',
            'feedback_id': feedback.id  # 回傳新建立的回饋 ID
        })
        
    except Exception as e:
        db.session.rollback()  # 回滾交易
        print(f"回饋表單錯誤: {e}")
        return jsonify({'error': '送出失敗，請稍後再試'}), 500

@app.route('/save_to_carousel', methods=['POST'])
def save_to_carousel():
    try:
        data = request.get_json()
        image_data = data['image_data']
        timestamp = data['timestamp']
        
        # 移除 data URL 前綴
        image_data = image_data.split(',')[1]
        
        # 解碼 base64
        image_bytes = base64.b64decode(image_data)
        
        # 生成檔名
        filename = f"collage_{timestamp}.png"
        filepath = os.path.join('static', 'carousel', filename)
        
        # 確保目錄存在
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # 保存檔案
        with open(filepath, 'wb') as f:
            f.write(image_bytes)
        
        return jsonify({'success': True, 'filename': filename})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
# del instance\photos.db 刪除資料庫