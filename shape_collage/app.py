from flask import Flask, render_template, request, send_file
from PIL import Image, ImageDraw, ImageOps
import os
import time
import cv2
import mediapipe as mp
import numpy as np
import random
import math

app = Flask(__name__)

UPLOAD_FOLDER = "static/uploads"
OUTPUT_FILE = "static/collage.png"
CANVAS_SIZE = 1000, 1000
MARGIN = 5  

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def load_images():
    """Load images from the upload folder, and separate target.jpg."""
    target_image = None
    other_images = []

    for file in os.listdir(UPLOAD_FOLDER):
        if file.lower().endswith(("png", "jpg", "jpeg")):
            img = Image.open(os.path.join(UPLOAD_FOLDER, file))
            img = resize(img)
            img = prepare_image_with_white_frame(img)

            if file == "target.png":
                target_image = img
            else:
                other_images.append(img)

    random.shuffle(other_images)
    return target_image, other_images

def resize(img):
    # 獲取原始圖片的寬度和高度
    original_width, original_height = img.size
    # 設定你希望的高度
    new_height = 150
    # 根據原始圖片的比例計算新的寬度
    aspect_ratio = original_width / original_height
    new_width = round(new_height * aspect_ratio)
    # 使用 resize 改變圖片大小
    resized_img = img.resize((new_width, new_height), Image.LANCZOS)
    return resized_img

# def calculate_dynamic_size(num_images):
#     """Determine canvas and image size dynamically."""
#     cols = int(np.ceil(np.sqrt(num_images)))
#     rows = int(np.ceil(num_images / cols))
#     img_size = min(MAX_CANVAS_SIZE // cols, MAX_CANVAS_SIZE // rows)
#     canvas_width = cols * (img_size + MARGIN)
#     canvas_height = rows * (img_size + MARGIN)
#     return (canvas_width, canvas_height), img_size

# 之後統一先處理成白底
def prepare_image_with_white_frame(img):
    """將圖片縮放後置中貼到白底框中"""
    img_w, img_h = img.size
    img_copy = img.copy()
    img_copy.thumbnail((img_w - MARGIN, img_h - MARGIN))  # 等比例縮小
    # 注意 thumbnail 也有可能吃圖片尺寸

    framed_img = Image.new("RGB", (img_w, img_h), "white")  # 建立白底背景
    paste_x = (img_w - img_copy.width) // 2
    paste_y = (img_h - img_copy.height) // 2
    framed_img.paste(img_copy, (paste_x, paste_y))
    return framed_img

# 填滿正方形
def fill_square_with_images(images, canvas_size):
    img_w, img_h = images[0].size
    canvas = Image.new("RGB", canvas_size, "white")
    img_idx = 0
    
    # 生成隨機的格子位置 (x, y)，並打亂它們
    grid_positions = [(x, y) for y in range(0, canvas_size[1], img_h) for x in range(0, canvas_size[0], img_w)]
    random.shuffle(grid_positions)
    
    for pos in grid_positions:
        x, y = pos
        img = images[img_idx % len(images)]  # 循環使用圖片
        canvas.paste(img, (x, y))  # 放圖片進去
        img_idx += 1
    return canvas

def create_rectangle_mask(collage):
    mask = Image.new("L", collage.size, 255)
    return mask

def create_circle_mask(collage):
    """Apply a circular mask to make the image circular."""
    mask = Image.new("L", collage.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse([(0, 0), collage.size], fill=255)
    return mask

def create_star_mask(collage):
    mask = Image.new('L', collage.size, 0)
    draw = ImageDraw.Draw(mask)

    cx, cy = collage.size[0] // 2, collage.size[1] // 2
    radius = min(collage.size) // 2

    points = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = radius if i % 2 == 0 else radius * 0.5
        x = cx + int(math.cos(angle) * r)
        y = cy + int(math.sin(angle) * r)
        points.append((x, y))
    draw.polygon(points, fill=255)
    return mask

def create_heart_mask(collage):
    width, height = collage.size
    mask = Image.new('L', collage.size, 0)
    draw = ImageDraw.Draw(mask)

    cx = width / 2
    cy = height / 2
    scale = min(width, height) / 34  # 控制大小比例

    points = []
    for t in range(0, 361, 1):  # 繞一圈
        rad = math.radians(t)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2 * rad) - 2 * math.cos(3 * rad) - math.cos(4 * rad)
        # 轉換座標
        screen_x = cx + x * scale
        screen_y = cy - y * scale
        points.append((screen_x, screen_y))
    draw.polygon(points, fill=255)
    return mask

def create_silhouette_mask(image_path="static/uploads/target.png"):   # 直接抓位置
    img = cv2.imread(image_path)
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    if img is None:
        raise FileNotFoundError(f"讀不到圖片喔：{image_path}")

    with mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1) as segment:
        result = segment.process(img_rgb)
        mask = result.segmentation_mask
    
    binary_mask = (mask > 0.5).astype(np.uint8) * 255

    # 自適應模糊大小
    h, w = img.shape[:2]
    kernel_size = max(7, int(min(w, h) * 0.07) // 2 * 2 + 1)  # 5% 模糊比例
    # 高斯模糊平滑邊緣
    blurred_mask = cv2.GaussianBlur(binary_mask, (kernel_size, kernel_size), 0)
    # blurred_mask = cv2.GaussianBlur(binary_mask, (13, 13), 0)

    # 再次閾值化，讓邊緣變得乾淨
    smooth_mask = (blurred_mask > 127).astype(np.uint8) * 255

    # 轉成 PIL Image
    mask = Image.fromarray(smooth_mask).resize(CANVAS_SIZE).convert("L")
    return mask

def apply_mask(collage, mask, main_image):
    result = collage.copy()
    result.paste(main_image, place_main_image_in_mask(mask, main_image))
    result.putalpha(mask)
    return result

# 將主圖放入遮罩範圍內的隨機位置
def place_main_image_in_mask(canvas, main_image):
    width, height = canvas.size
    img_w, img_h = main_image.size
    # 隨機找一個空格子放主圖
    for _ in range(100):  # 嘗試100次，避免無法放入
        x = random.randint(0, (width - img_w) // img_w) * img_w
        y = random.randint(0, (height - img_h) // img_h) * img_h
        # 判斷這個位置是否在遮罩內
        if is_within_mask(x, y, canvas, main_image.size):
            return x, y
    print("主圖不在範圍內!")

# 判斷是否在遮罩內
def is_within_mask(x, y, mask_image, tile_size):
    img_w, img_h = tile_size
    corners = [
        (x, y),
        (x + img_w - 1, y),
        (x, y + img_h - 1),
        (x + img_w - 1, y + img_h - 1),
        (x + img_w // 2, y + img_h // 2) # 中心
    ]
    for cx, cy in corners:
        if cx >= mask_image.width or cy >= mask_image.height:
            return False
        if mask_image.getpixel((cx, cy)) <= 128:  # 非遮罩區域
            return False
    return True

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload():
    shape = request.form.get("shape")

    # 清空舊拼貼圖
    if os.path.exists(OUTPUT_FILE):
        os.remove(OUTPUT_FILE)
    # 清空舊上傳圖
    for file in os.listdir(UPLOAD_FOLDER):
        os.remove(os.path.join(UPLOAD_FOLDER, file))

    # 儲存新上傳圖
    images = request.files.getlist("images")
    saved_files = []
    for image in images:
        filename = image.filename
        path = os.path.join(UPLOAD_FOLDER, filename)
        image.save(path)
        saved_files.append(filename)

    # 載入圖片
    main_image, loaded_images = load_images()

    # 嘗試取得手繪圖形
    drawn_shape = request.files.get("drawn_shape")

    # 產生拼貼圖
    collage = fill_square_with_images(loaded_images, canvas_size=CANVAS_SIZE)
    if shape == "rectangle":
        mask = create_rectangle_mask(collage)
    elif shape == "circle":
        mask = create_circle_mask(collage)
    elif shape == "star":
        mask = create_star_mask(collage)
    elif shape == "heart":
        mask = create_heart_mask(collage)
    elif shape == "silhouette":
        mask = create_silhouette_mask()
    elif shape == "draw":
        if drawn_shape:
            mask = ImageOps.invert(Image.open(drawn_shape).convert("L")).resize(CANVAS_SIZE)
        else:
            return "Missing drawn_shape", 400
    else:
        return "Invalid shape", 400
    collage = apply_mask(collage, mask, main_image)

    if collage:
        collage.save(OUTPUT_FILE)

        # 回傳每張小圖與拼貼大圖的路徑（給前端互動/下載用）
        image_positions = []  # 儲存每張小圖的位置（用來加上互動功能）
        for i, file in enumerate(saved_files):
            x, y = (i % 5) * 100, (i // 5) * 100  # 假設每張小圖大小為 100x100，這裡可以根據實際情況調整
            image_positions.append({
                "url": f"/{UPLOAD_FOLDER}/{file}",
                "x": x,
                "y": y,
                "name": file,  # 可以加上一些標籤，標示哪個是目標圖
                "is_target": "target" in file.lower()  # 假設檔名中包含 "target" 的圖片是目標圖
            })

        collage_url = f"/{OUTPUT_FILE}?t={int(time.time())}"  # 加上當前時間戳

        return {
            "images": image_positions,
            "collage_url": collage_url
        }

    return "No images found!", 400

if __name__ == "__main__":
    app.run(debug=True)

# 整理一下程式碼