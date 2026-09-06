#!/system/bin/sh
# 动态内存注入方式（需替换为当前实际 PID 与 OnTouchEvent 地址）
PID=$(ps | grep com.tq.daming | /data/local/tmp/busybox awk '{print $2}')
ADDR=$((0x7697DC9C))

if [ -z "$PID" ]; then
    echo "Game process not found!"
    exit 1
fi

echo "=== 1. Backup original 32 bytes ==="
dd if=/proc/$PID/mem bs=1 count=32 skip=$ADDR of=/data/local/tmp/orig32.bin 2>/dev/null

echo "=== 2. Write 32-byte Shellcode to OnTouchEvent ==="
/data/local/tmp/busybox printf "\xf0\x41\x2d\xe9\x0c\x00\x9f\xe5\x1b\x10\xa0\xe3\x08\x30\x9f\xe5\x33\xff\x2f\xe1\xf0\x81\xbd\xe8\x40\x29\xd4\x75\x10\xfe\xda\x76" | dd of=/proc/$PID/mem bs=1 seek=$ADDR conv=notrunc 2>/dev/null

echo "=== 3. Trigger Touch Event ==="
input tap 200 200
/data/local/tmp/busybox usleep 500000

echo "=== 4. Restore Original 32 bytes ==="
dd if=/data/local/tmp/orig32.bin of=/proc/$PID/mem bs=1 seek=$ADDR conv=notrunc 2>/dev/null
echo "Restored perfectly!"