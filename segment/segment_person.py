import cv2
import mediapipe as mp
import numpy as np

# 讀入主照片
img = cv2.imread("main.jpg")
h, w = img.shape[:2]

# Mediapipe 初始化
mp_selfie_segmentation = mp.solutions.selfie_segmentation
with mp_selfie_segmentation.SelfieSegmentation(model_selection=1) as segment:
    result = segment.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    mask = result.segmentation_mask  # 值在 0~1 之間

    # 把 mask 轉成二值黑白圖
    binary_mask = (mask > 0.5).astype(np.uint8) * 255

    # 黑底白人 → 產生剪影
    silhouette = cv2.bitwise_and(img, img, mask=binary_mask)

    # 也可以只要純黑白剪影
    black_background = np.zeros_like(img)
    silhouette_bw = np.where(binary_mask[:, :, np.newaxis] == 255, 255, 0).astype(np.uint8)

    # 使用 findContours 找出剪影輪廓
    contours, hierarchy = cv2.findContours(silhouette_bw, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    # 在原圖上繪製輪廓
    contour_img = img.copy()
    cv2.drawContours(contour_img, contours, -1, (0, 255, 0), 3)  # 這裡綠色（0,255,0）繪製輪廓

    # 轉換帶有輪廓的圖為純剪影
    contour_mask = np.zeros_like(silhouette_bw)  # 創建一個全黑的空白圖像
    cv2.drawContours(contour_mask, contours, -1, (255), thickness=cv2.FILLED)  # 填充輪廓為白色

    # 使用輪廓遮罩來生成純剪影
    final_silhouette = cv2.bitwise_and(silhouette_bw, contour_mask)
    
    # 儲存
    cv2.imwrite("mask.png", binary_mask)
    cv2.imwrite("silhouette.jpg", silhouette)
    cv2.imwrite("silhouette_bw.jpg", silhouette_bw)
    cv2.imwrite("contours_image.jpg", contour_img)  # 存儲帶有輪廓的圖片
    cv2.imwrite("final_silhouette.jpg", final_silhouette)  # 存儲轉換後的純剪影

    print("✅ 剪影生成完成！")
