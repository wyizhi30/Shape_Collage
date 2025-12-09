from flask_sqlalchemy import SQLAlchemy  # 匯入 Flask-SQLAlchemy 套件，讓 Flask 可以用 ORM 操作資料庫
from datetime import datetime           # 匯入 datetime 模組

db = SQLAlchemy()                       # 建立一個 SQLAlchemy 物件，之後會綁定到 Flask app

class Collage(db.Model):                # 定義拼貼資料表
    id = db.Column(db.String(128), primary_key=True)    # 拼貼 ID（時間戳）
    title = db.Column(db.String(255), nullable=True)     # 作品標題
    preview_src = db.Column(db.Text)                     # 預覽圖片路徑
    info_json = db.Column(db.Text, nullable=False)       # 拼貼詳細資料（JSON）
    is_public = db.Column(db.Boolean, default=False, nullable=False)  # ✅ 新增欄位
    created_at = db.Column(db.Float, nullable=False)     # 建立時間戳
    updated_at = db.Column(db.Float, nullable=False)     # 更新時間戳
    
    # 設置索引
    __table_args__ = (
        db.Index('idx_collages_updated_at', 'updated_at'),
        db.Index('idx_collages_is_public', 'is_public'),  # ✅ 新增索引
    )
    
    def to_dict(self):
        # 統一使用時間戳作為 ID，不再處理 .json 後綴
        return {
            'id': self.id,
            'timestamp': self.id,
            'title': self.title,
            'preview_src': self.preview_src,
            'is_public': self.is_public,  # ✅ 包含在字典中
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

class Leaderboard(db.Model):             # 定義排行榜資料表
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)  # 主鍵，自動遞增
    collage_id = db.Column(db.Text, nullable=False)      # 拼貼 ID
    name = db.Column(db.Text, nullable=False)            # 玩家姓名
    time = db.Column(db.Float, nullable=False)           # 遊戲時間（秒）
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 建立時間
    
    def to_dict(self):
        return {
            'id': self.id,
            'collage_id': self.collage_id,
            'name': self.name,
            'time': self.time,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), nullable=False)        # 回饋類型: suggestion, bug, feature, other
    subject = db.Column(db.String(200), nullable=False)    # 標題
    message = db.Column(db.Text, nullable=False)           # 詳細內容
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 建立時間
    
    def __repr__(self):
        return f'<Feedback {self.id}: {self.subject}>'
    
    def to_dict(self):
        """轉換為字典格式，方便 JSON 序列化"""
        return {
            'id': self.id,
            'type': self.type,
            'subject': self.subject,
            'message': self.message,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }