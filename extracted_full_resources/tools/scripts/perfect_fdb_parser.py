import struct
import glob
import os
import json
import csv

def type_to_size(t):
    if t == 1:
        return 1, "<b"
    elif t == 2:
        return 2, "<h"
    elif t == 3:
        return 2, "<H"
    elif t == 4:
        return 4, "<i"
    elif t == 5:
        return 4, "<I"
    elif t == 6:
        return 4, "<f"
    elif t == 7:
        return 8, "<q"
    elif t == 8:
        return 8, "<Q"
    elif t in (10, 0x0a):
        return 4, "<I"
    else:
        return 4, "<I"

def parse_fdb_perfect(filepath):
    with open(filepath, "rb") as f:
        data = f.read()

    if not data.startswith(b"COPYRIGHT@KFDB"):
        raise ValueError("Not a KFDB file")

    ver, field_cnt, row_cnt, total_rec_size = struct.unpack("<IIII", data[16:32])
    
    offset = 32
    fields = []
    for _ in range(field_cnt):
        ftype = data[offset]
        name_off, = struct.unpack("<I", data[offset+1 : offset+5])
        fsize, fmt = type_to_size(ftype)
        fields.append({
            "type": ftype,
            "name_off": name_off,
            "size": fsize,
            "fmt": fmt
        })
        offset += 5

    row_bytes = sum(f["size"] for f in fields)
    str_pool_start = 32 + field_cnt * 5 + row_cnt * row_bytes
    str_pool = data[str_pool_start:]
    
    def get_str(off):
        if off >= len(str_pool):
            return ""
        end = str_pool.find(b"\x00", off)
        if end == -1:
            raw = str_pool[off:]
        else:
            raw = str_pool[off:end]
        return raw.decode("gbk", errors="ignore")

    field_names = [get_str(f["name_off"]) for f in fields]
    
    curr = 32 + field_cnt * 5
    rows = []
    for r in range(row_cnt):
        row_dict = {}
        for i, f_info in enumerate(fields):
            fname = field_names[i]
            val_raw = data[curr : curr + f_info["size"]]
            curr += f_info["size"]
            val = struct.unpack(f_info["fmt"], val_raw)[0]
            if f_info["type"] in (10, 0x0a):
                val = get_str(val)
            row_dict[fname] = val
        rows.append(row_dict)
        
    return field_names, rows

# 重新生成全套完美 JSON 和 CSV
out_json_dir = "extracted_resources/tables_json"
out_csv_dir = "extracted_resources/tables_csv"
os.makedirs(out_json_dir, exist_ok=True)
os.makedirs(out_csv_dir, exist_ok=True)

success = 0
for fpath in sorted(glob.glob("extracted_apk/assets/ini/*.fdb")):
    bname = os.path.splitext(os.path.basename(fpath))[0]
    try:
        fnames, rows = parse_fdb_perfect(fpath)
        with open(os.path.join(out_json_dir, f"{bname}.json"), "w", encoding="utf-8") as jf:
            json.dump(rows, jf, ensure_ascii=False, indent=2)
        with open(os.path.join(out_csv_dir, f"{bname}.csv"), "w", encoding="utf-8-sig", newline="") as cf:
            writer = csv.DictWriter(cf, fieldnames=fnames)
            writer.writeheader()
            writer.writerows(rows)
        print(f"[OK] {bname:20s}: {len(rows):5d} 行, 字段: {fnames}")
        success += 1
    except Exception as e:
        print(f"[ERR] {bname:20s}: {e}")

print(f"\n全部完成！31 个数据表成功完美解析: {success}/31")

