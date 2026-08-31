import os
import glob

print("=== 1. SO 动态库 ===")
for root, dirs, files in os.walk("extracted_apk/lib"):
    for f in files:
        p = os.path.join(root, f)
        print(f"  {p} ({os.path.getsize(p)} bytes)")

print("\n=== 2. 核心配置文件内容 ===")
for xml_file in ["extracted_apk/assets/platformcfg.xml", "extracted_apk/assets/resconfig.txt", "extracted_apk/assets/NdChannelId.xml"]:
    if os.path.exists(xml_file):
        print(f"\n--- {xml_file} ---")
        try:
            with open(xml_file, "r", encoding="utf-8", errors="ignore") as f:
                print(f.read())
        except Exception as e:
            print("Error reading:", e)

print("\n=== 3. 各种资源文件头特征 (Magic Header) ===")
sample_files = glob.glob("extracted_apk/assets/ani/*.ani")[:3] + \
               glob.glob("extracted_apk/assets/ini/*.fdb")[:3] + \
               glob.glob("extracted_apk/assets/ini/*.sdb")[:3] + \
               glob.glob("extracted_apk/assets/ini/*.wdb")[:3] + \
               glob.glob("extracted_apk/assets/ini/*.ini")[:3]

for sf in sample_files:
    try:
        with open(sf, "rb") as f:
            header = f.read(64)
            print(f"{sf}:")
            print(f"  HEX: {header[:32].hex()}")
            print(f"  ASCII: {''.join(chr(b) if 32 <= b <= 126 else '.' for b in header[:32])}")
    except Exception as e:
        print(f"Error {sf}: {e}")

