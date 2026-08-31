import struct
import os
import time

so_path = "extracted_apk/lib/armeabi/libdata.so"
out_dir = "extracted_resources/wdf_raw"
os.makedirs(out_dir, exist_ok=True)

with open(so_path, "rb") as f:
    magic = f.read(4)
    file_count, index_offset = struct.unpack("<II", f.read(8))
    f.seek(index_offset)
    entries = []
    for i in range(file_count):
        uid, offset, size, space = struct.unpack("<IIII", f.read(16))
        entries.append((uid, offset, size, space))

print(f"正在提取 WDF 中的 {len(entries)} 个资源文件...")
t0 = time.time()
type_counts = {}

with open(so_path, "rb") as f:
    for idx, (uid, offset, size, space) in enumerate(entries):
        f.seek(offset)
        content = f.read(size)
        
        # 判断扩展名
        ext = "dat"
        if content.startswith(b"\x89PNG\r\n\x1a\n"):
            ext = "png"
        elif content.startswith(b"GIF87a") or content.startswith(b"GIF89a"):
            ext = "gif"
        elif content.startswith(b"\xff\xd8\xff"):
            ext = "jpg"
        elif content.startswith(b"OggS"):
            ext = "ogg"
        elif content.startswith(b"RIFF") and b"WAVE" in content[:12]:
            ext = "wav"
        elif content.startswith(b"DDS "):
            ext = "dds"
        elif content.startswith(b"BM"):
            ext = "bmp"
        elif content.startswith(b"COPYRIGHT@KFDB"):
            ext = "fdb"
        elif b"<" in content[:10] and (b"</" in content or b"/>" in content):
            ext = "xml"
            
        type_counts[ext] = type_counts.get(ext, 0) + 1
        
        # 按照类型存放到对应子目录
        sub_dir = os.path.join(out_dir, ext)
        os.makedirs(sub_dir, exist_ok=True)
        fname = f"res_{uid:08X}.{ext}"
        with open(os.path.join(sub_dir, fname), "wb") as out_f:
            out_f.write(content)

print(f"提取完成！耗时: {time.time() - t0:.2f}s")
print("文件类型统计:")
for ext, cnt in sorted(type_counts.items(), key=lambda x: x[1], reverse=True):
    print(f"  .{ext}: {cnt} 个文件")

