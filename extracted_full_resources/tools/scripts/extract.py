import os
import zipfile
import tarfile
import shutil

apk_path = "com.tq.daming.apk"
data_tar = "daming_app_data.tar.gz"

apk_extract_dir = "extracted_apk"
data_extract_dir = "extracted_data"

os.makedirs(apk_extract_dir, exist_ok=True)
os.makedirs(data_extract_dir, exist_ok=True)

print("--- 1. 解压 APK ---")
if os.path.exists(apk_path):
    with zipfile.ZipFile(apk_path, 'r') as z:
        z.extractall(apk_extract_dir)
    print(f"APK 解压完成至: {apk_extract_dir}")

print("--- 2. 解压 App Data ---")
if os.path.exists(data_tar):
    with tarfile.open(data_tar, 'r:gz') as t:
        t.extractall(data_extract_dir)
    print(f"App Data 解压完成至: {data_extract_dir}")

def scan_and_summarize(base_dir, label):
    print(f"\n================ {label} 统计 ================")
    ext_count = {}
    total_size = 0
    file_list = []
    
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            size = os.path.getsize(full_path)
            total_size += size
            ext = os.path.splitext(f)[1].lower()
            if not ext:
                ext = "(no_ext)"
            ext_count[ext] = ext_count.get(ext, 0) + 1
            file_list.append((size, rel_path))
            
    print(f"总文件数: {len(file_list)}, 总大小: {total_size / (1024*1024):.2f} MB")
    print("文件类型分布:")
    for ext, count in sorted(ext_count.items(), key=lambda x: x[1], reverse=True)[:15]:
        print(f"  {ext}: {count} 个")

scan_and_summarize(apk_extract_dir, "APK 内容")
scan_and_summarize(data_extract_dir, "App Data 内容")
