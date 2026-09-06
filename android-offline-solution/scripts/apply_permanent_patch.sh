#!/system/bin/sh
SO=/data/app-lib/com.tq.daming-1/libEnvRelay.so

echo "=== 1. Backup original SO if not exists ==="
if [ ! -f /data/app-lib/com.tq.daming-1/libEnvRelay.so.orig_bak ]; then
    cp -a $SO /data/app-lib/com.tq.daming-1/libEnvRelay.so.orig_bak
    echo "Backup created at /data/app-lib/com.tq.daming-1/libEnvRelay.so.orig_bak"
fi

echo "=== 2. Patch CDlgLoading::OnTimer at 0x001B3D8C ==="
# 0x001B3D8C: 1b 10 a0 e3 1e 44 10 eb (MOV r1, #27; BL CLoading::NextStep)
/data/local/tmp/busybox printf '\x1b\x10\xa0\xe3\x1e\x44\x10\xeb' | dd of=$SO bs=1 seek=$((0x001B3D8C)) conv=notrunc 2>/dev/null

echo "=== 3. Verify bytes at 0x001B3D88 ==="
/data/local/tmp/busybox od -Ax -tx1 -j 0x001B3D88 -N 12 $SO

chmod 755 $SO
chown system:system $SO
echo "=== Permanent Patch Applied Successfully! ==="
