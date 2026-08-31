import os
import shutil
import glob

base_out = "daming_resources"
os.makedirs(base_out, exist_ok=True)

# 1. 整理图片资源
img_dest = os.path.join(base_out, "images")
os.makedirs(img_dest, exist_ok=True)
png_files = glob.glob("extracted_resources/wdf_raw/png/*.png")
print(f"正在归档 {len(png_files)} 张游戏美术图片...")
for p in png_files:
    shutil.copy2(p, img_dest)

# 2. 整理音频资源
audio_dest = os.path.join(base_out, "audio")
audio_bgm_dest = os.path.join(audio_dest, "bgm")
audio_skill_dest = os.path.join(audio_dest, "skill_effects")
os.makedirs(audio_bgm_dest, exist_ok=True)
os.makedirs(audio_skill_dest, exist_ok=True)

# apk assets/music
for f in glob.glob("extracted_apk/assets/music/*.ogg"):
    shutil.copy2(f, audio_bgm_dest)
for f in glob.glob("extracted_apk/assets/music/skill/*.ogg"):
    shutil.copy2(f, audio_skill_dest)

# 3. 整理数据表 (JSON & CSV)
db_json_dest = os.path.join(base_out, "tables_json")
db_csv_dest = os.path.join(base_out, "tables_csv")
os.makedirs(db_json_dest, exist_ok=True)
os.makedirs(db_csv_dest, exist_ok=True)
for f in glob.glob("extracted_resources/tables_json/*.json"):
    shutil.copy2(f, db_json_dest)
for f in glob.glob("extracted_resources/tables_csv/*.csv"):
    shutil.copy2(f, db_csv_dest)

# 4. 整理 UI 界面配置 XML
ui_dest = os.path.join(base_out, "ui_layouts")
os.makedirs(ui_dest, exist_ok=True)
for f in glob.glob("extracted_apk/assets/ini/ui/960x640/*.xml"):
    shutil.copy2(f, ui_dest)
if os.path.exists("extracted_apk/assets/ini/ui/ui.xml"):
    shutil.copy2("extracted_apk/assets/ini/ui/ui.xml", ui_dest)

# 5. 整理动画描述文件
ani_dest = os.path.join(base_out, "animations")
os.makedirs(ani_dest, exist_ok=True)
for f in glob.glob("extracted_apk/assets/ani/*.ani"):
    shutil.copy2(f, ani_dest)

# 6. 整理字体文件
font_dest = os.path.join(base_out, "fonts")
os.makedirs(font_dest, exist_ok=True)
if os.path.exists("extracted_apk/lib/armeabi/libfont.so"):
    shutil.copy2("extracted_apk/lib/armeabi/libfont.so", os.path.join(font_dest, "font.ttf"))

# 7. 整理手机端私有数据与日志
appdata_dest = os.path.join(base_out, "phone_app_data")
os.makedirs(appdata_dest, exist_ok=True)
if os.path.exists("daming_app_data.tar.gz"):
    shutil.copy2("daming_app_data.tar.gz", appdata_dest)

print("资源归档与分类完成！")

