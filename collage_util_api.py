import base64
from mimetypes import guess_type
from PIL import Image, ImageDraw, ImageFont, ImageOps
from dotenv import load_dotenv
import os
import uuid
import math
import random
import json
import io
import time
from werkzeug.utils import secure_filename
from flask import jsonify, url_for
from google import genai
from google.genai import types

load_dotenv()  # 讀取 .env 檔案
api_key = os.getenv("API_KEY")

# 設定 Gemini API 金鑰
client = genai.Client(api_key=api_key)

MAX_UPLOAD_FILES = 100  # 預設最多保留 100 個檔案

# 指定圖片儲存路徑
OUTPUT_DIR = os.path.join("static", "generated_images")
os.makedirs(OUTPUT_DIR, exist_ok=True)

def ai_generate(
    image, 
    max_images=10, 
    prompt="""Generate a high-resolution, ultra-realistic portrait inspired by the uploaded reference image.  
        The new person should resemble the original individual by about 30–50%, sharing the same gender and approximate age, but clearly be a different person.  
        Introduce noticeable changes in facial features, hairstyle, hair color, eye shape, nose shape, jawline, and expression to make the person look clearly different while maintaining overall familiarity.  
        Place the subject centered in the frame with a photographer’s portrait-style composition.  
        Use natural, soft lighting and realistic skin texture; avoid theatrical or artificial lighting.  
        Generate a new background that is different in content but visually consistent with the reference image make it interest.. —  
        Make it almost match the general **color tone, mood, and lighting style**, while allowing creative freedom in scenery and details.  
        The background should feel harmonious with the original but not copy it.  
        Optionally modify color of the clothing to make it random, accessories, or angle slightly to increase distinction from the original while keeping the person recognizable.  
        Do not make it a clone or identical twin — keep identity uniqueness.
        """,):
    
    if not prompt or not image:
        return jsonify({"error": "缺少 prompt 或圖片"}), 400
    
    images = []
    attempt = 0
    max_attempts = 20
    
    try:
        with open(image, 'rb') as f:
            image_bytes = f.read()
    except Exception as e:
        return jsonify({"error": f"圖片讀取失敗: {str(e)}"}), 400

    # 自動猜 MIME type
    mime_type, _ = guess_type(image)
    if mime_type is None:
        mime_type = "image/jpeg"  # fallback，當不確定時用 jpeg
    
    while len(images) < max_images and attempt < max_attempts:
        attempt += 1
        try:
            response = client.models.generate_content(
                model='gemini-2.5-flash-image',
                contents=[
                types.Part.from_bytes(
                    data=image_bytes,
                    mime_type=mime_type,
                ),
                prompt
                ]
            )

            candidates = response.candidates
            if not candidates or not candidates[0].content or not candidates[0].content.parts:
                print(f"⚠️ 第 {attempt} 次未收到圖片，跳過")
                continue
            for part in candidates[0].content.parts:
                if part.inline_data is not None:
                    image_data = part.inline_data.data
                    img = Image.open(io.BytesIO(image_data))
                    
                    # 儲存圖片到資料夾
                    filename = f"edited_{uuid.uuid4().hex}.jpg"
                    full_path = os.path.join(OUTPUT_DIR, filename)
                    img.save(full_path, format="JPEG")
                    
                    images.append({
                        "img": img,
                        "filename": filename
                    })

                    print(f"✅ 成功儲存第 {len(images)} 張：{filename}")
                    break
        except Exception as e:
            print(f"❌ 第 {attempt} 次產生圖像失敗: {str(e)}")
            continue
    if not images:
            raise RuntimeError("未成功生成任何圖片")
    return images

# def ai_generate(
#     image, 
#     max_images=12, 
#     prompt="""Generate a high-resolution, ultra-realistic portrait inspired by the uploaded reference image.  
#         The new person should resemble the original individual by about 30–50%, sharing the same gender and approximate age, but clearly be a different person.  
#         Introduce noticeable changes in facial features, hairstyle, hair color, eye shape, nose shape, jawline, and expression to make the person look clearly different while maintaining overall familiarity.  
#         Place the subject centered in the frame with a photographer’s portrait-style composition.  
#         Use natural, soft lighting and realistic skin texture; avoid theatrical or artificial lighting.  
#         Generate a new background that is different in content but visually consistent with the reference image —  
#         match the general **color tone, mood, and lighting style**, while allowing creative freedom in scenery and details.  
#         The background should feel harmonious with the original but not copy it.  
#         Optionally modify clothing, accessories, or angle slightly to increase distinction from the original while keeping the person recognizable.  
#         Do not make it a clone or identical twin — keep identity uniqueness.
#         """,):
    
#     if not prompt or not image:
#         return jsonify({"error": "缺少 prompt 或圖片"}), 400
    
#     images = []
#     attempt = 0
#     max_attempts = 20
#     aspect_ratio = "4:3" # "1:1","2:3","3:2","3:4","4:3","4:5","5:4","9:16","16:9","21:9"
#     resolution = "1K" # "1K", "2K", "4K"
    
#     try:
#         image = Image.open(image)
#     except Exception as e:
#         return jsonify({"error": f"圖片讀取失敗: {str(e)}"}), 400
#     print(1)
#     while len(images) < max_images and attempt < max_attempts:
#         attempt += 1
#         try:
#             response = client.models.generate_content(
#                 model='gemini-3-pro-image-preview',
#                 contents=[
#                     prompt,
#                     image
#                 ],
#                 config=types.GenerateContentConfig(
#                     response_modalities=['IMAGE'],
#                     image_config=types.ImageConfig(
#                         aspect_ratio=aspect_ratio
#                     )
#                 )
#             )
#             print(2)
#             for part in response.parts:
#                 if part.inline_data is not None:
#                     image_data = part.inline_data.data
#                     img = Image.open(io.BytesIO(image_data))
                    
#                     # 儲存圖片到資料夾
#                     filename = f"edited_{uuid.uuid4().hex}.jpg"
#                     full_path = os.path.join(OUTPUT_DIR, filename)
#                     img.save(full_path, format="JPEG")
                    
#                     images.append({
#                         "img": img,
#                         "filename": filename
#                     })

#                     print(f"✅ 成功儲存第 {len(images)} 張：{filename}")
#                     break
#         except Exception as e:
#             print(f"❌ 第 {attempt} 次產生圖像失敗: {str(e)}")
#             continue
#     if not images:
#             raise RuntimeError("未成功生成任何圖片")
#     return images

def cleanup_upload_folder(upload_folder, max_files=MAX_UPLOAD_FILES):
    files = [os.path.join(upload_folder, f) for f in os.listdir(upload_folder) if os.path.isfile(os.path.join(upload_folder, f))]
    if len(files) > max_files:
        files.sort(key=lambda x: os.path.getctime(x))
        for f in files[:len(files) - max_files]:
            try:
                os.remove(f)
            except Exception as err:
                print(f"刪除檔案失敗: {f} ({err})")

def create_rectangle_mask(canvas):
    return None

def create_circle_mask(canvas, shrink_ratio=0.04):
    mask = Image.new("L", canvas.size, 0)
    draw = ImageDraw.Draw(mask)
    width, height = canvas.size
    shrink_w = int(width * shrink_ratio)
    shrink_h = int(height * shrink_ratio)
    draw.ellipse([(shrink_w, shrink_h), (width - shrink_w, height - shrink_h)], fill=255)
    return mask

def create_star_mask(canvas):
    mask = Image.new('L', canvas.size, 0)
    draw = ImageDraw.Draw(mask)
    cx, cy = canvas.size[0] // 2, canvas.size[1] // 2
    radius = min(canvas.size) // 2
    points = []
    for i in range(10):
        angle = math.radians(i * 36 - 90)
        r = radius if i % 2 == 0 else radius * 0.5
        x = cx + int(math.cos(angle) * r)
        y = cy + int(math.sin(angle) * r)
        points.append((x, y))
    draw.polygon(points, fill=255)
    return mask

def create_heart_mask(canvas):
    width, height = canvas.size
    mask = Image.new('L', canvas.size, 0)
    draw = ImageDraw.Draw(mask)
    cx = width / 2
    cy = height / 2
    scale = min(width, height) / 35
    points = []
    for t in range(0, 361, 1):
        rad = math.radians(t)
        x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2 * rad) - 2 * math.cos(3 * rad) - math.cos(4 * rad)
        screen_x = cx + x * scale
        screen_y = cy - y * scale
        points.append((screen_x, screen_y))
    draw.polygon(points, fill=255)
    return mask

def create_text_mask(canvas, text, max_fill_ratio=0.8):
    mask = Image.new("L", canvas.size, 0)
    draw = ImageDraw.Draw(mask)
    width, height = canvas.size
    try:
        font_path = "msjh.ttc"
        fontsize = 10
        font = ImageFont.truetype(font_path, fontsize)
    except:
        font = ImageFont.load_default()
        fontsize = 10
    stroke_width = max(1, fontsize // 30)
    while True:
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        if text_w >= width * max_fill_ratio or text_h >= height * max_fill_ratio:
            fontsize -= 2
            stroke_width = max(1, fontsize // 30)
            font = ImageFont.truetype(font_path, fontsize) if font_path else ImageFont.load_default()
            break
        fontsize += 2
        stroke_width = max(1, fontsize // 30)
        font = ImageFont.truetype(font_path, fontsize) if font_path else ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    x = (width - (bbox[2] - bbox[0])) // 2 - bbox[0]
    y = (height - (bbox[3] - bbox[1])) // 2 - bbox[1]
    draw.text((x, y), text, font=font, fill=255, stroke_width=stroke_width, stroke_fill=255)
    return mask

def create_silhouette_mask(canvas, path):
    import cv2
    import mediapipe as mp
    import numpy as np
    img = cv2.imread(path)
    if img is None:
        raise FileNotFoundError(f"讀不到圖片喔：{path}")
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    with mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=1) as segment:
        result = segment.process(img_rgb)
        mask = result.segmentation_mask
    binary_mask = (mask > 0.5).astype(np.uint8) * 255
    h, w = img.shape[:2]
    kernel_size = max(7, int(min(w, h) * 0.07) // 2 * 2 + 1)
    blurred_mask = cv2.GaussianBlur(binary_mask, (kernel_size, kernel_size), 0)
    smooth_mask = (blurred_mask > 127).astype(np.uint8) * 255
    mask = Image.fromarray(smooth_mask).resize(canvas.size).convert("L")
    return mask

def get_mask(canvas, shape, custom_mask_path=None, text_input=None, drawn_shape_file=None):
    if shape == "rectangle":
        return create_rectangle_mask(canvas)
    elif shape == "circle":
        return create_circle_mask(canvas)
    elif shape == "star":
        return create_star_mask(canvas)
    elif shape == "heart":
        return create_heart_mask(canvas)
    elif shape == "text_mask":
        if not text_input:
            raise ValueError("文字遮罩需要提供 text_input")
        return create_text_mask(canvas, text_input)
    elif shape == "custom_silhouette":
        if not custom_mask_path:
            raise ValueError("custom_silhouette 形狀需要提供 custom_mask_path")
        return create_silhouette_mask(canvas, custom_mask_path)
    elif shape == "draw":
        if not drawn_shape_file:
            raise ValueError("手繪形狀需要提供 drawn_shape_file")
        mask = Image.open(drawn_shape_file).convert("L")
        mask = mask.resize(canvas.size)
        
        # 白黑反轉
        mask = ImageOps.invert(mask)
        return mask
    else:
        return None

def paste_jittered_grid_photos(generated_images, canvas_size=(600, 600), grid=(30, 30), jitter_ratio=0.2, shape="rectangle", target_img=None, custom_mask_path=None, text_input=None, drawn_shape_file=None):
    canvas = Image.new("RGBA", canvas_size, (255, 255, 255, 0))
    grid_w, grid_h = grid
    cell_w = canvas_size[0] // grid_w
    cell_h = canvas_size[1] // grid_h
    mask = get_mask(canvas, shape, custom_mask_path, text_input, drawn_shape_file)
    if not target_img:
        raise ValueError("主圖找不到，是不是忘記丟進來?")
    
    image_info = []
    images = []
    candidate_cells = []
    
    # 生成所有可能的位置
    for gx in range(grid_w):
        for gy in range(grid_h):
            base_x = gx * cell_w + cell_w // 2
            base_y = gy * cell_h + cell_h // 2
            dx = int(cell_w * jitter_ratio)
            dy = int(cell_h * jitter_ratio)
            cx = base_x + random.randint(-dx, dx)
            cy = base_y + random.randint(-dy, dy)
            if mask:
                if not (0 <= cx < canvas_size[0] and 0 <= cy < canvas_size[1]):
                    continue
                if mask.getpixel((cx, cy)) < 128:
                    continue
            candidate_cells.append((cx, cy))
    
    if not candidate_cells:
        raise ValueError("整張圖都沒地方貼啦，調整一下 shape 或 grid")
    
    target_size = int(min(cell_w, cell_h) * 1.5)
    orig_w, orig_h = target_img["img"].size
    scale = min(target_size / orig_w, target_size / orig_h)
    new_w = int(orig_w * scale)
    new_h = int(orig_h * scale)
    
    for i, pos in enumerate(candidate_cells):
        # 計算圖片尺寸（假設所有圖片都用相同的縮放邏輯）
        # 這裡用一個標準尺寸，前端會重新處理
        
        top_left = (pos[0] - new_w // 2, pos[1] - new_h // 2)
        rotate_angle = random.randint(0, 360)
        
        image_info.append({
            "x": top_left[0],
            "y": top_left[1],
            "w": new_w,
            "h": new_h,
            "rotate": rotate_angle
        })
    
    images.append({
        "img_path": f"/static/uploads/{target_img['filename']}", "is_target": True
    })
    for img in generated_images:
        images.append({
            "img_path": f"/static/generated_images/{img['filename']}", "is_target": False
        })
    
    return {
        "image_info": image_info,
        "images": images
    }

def generate_collage_info_from_request(request, upload_folder, max_upload_files=100):
    try:
        cleanup_upload_folder(upload_folder, max_upload_files)
    except Exception as cleanup_err:
        print(f"清理舊檔案時出錯：{cleanup_err}")
        
    shape = request.form.get("shape", "rectangle")
    uploaded_file = request.files.get("images")
    mask_file = request.files.get("mask_image")
    text_input = request.form.get("text_input") or None
    drawn_shape_file = request.files.get("drawn_shape") or None

    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(upload_folder, filename)

    # 儲存原圖
    img = Image.open(uploaded_file.stream).convert("RGB")
    img.save(filepath, format="JPEG", quality=90)

    # 準備主圖資訊
    target_image_dict = {"img": img, "filename": filename}
    
    # 生成 AI 圖片
    generated_images = ai_generate(filepath)
    
    # 處理自訂遮罩
    custom_mask_path = None
    if shape == "custom_silhouette" and mask_file and mask_file.filename != "":
        mask_filename = secure_filename(mask_file.filename)
        custom_mask_path = os.path.join(upload_folder, mask_filename)
        mask_file.save(custom_mask_path)

    # 生成位置資訊
    result = paste_jittered_grid_photos(
        generated_images, canvas_size=(600, 600), grid=(18, 18), shape=shape, target_img=target_image_dict,
        custom_mask_path=custom_mask_path, text_input=text_input, drawn_shape_file=drawn_shape_file
    )
    
    return {
        "image_info": result["image_info"],
        "images": result["images"]
    }