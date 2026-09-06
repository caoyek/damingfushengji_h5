$device = "192.168.10.19:5555"
$adb = "d:\桌面\ADB\adb.exe"

# 检查连接状态
$devices = & $adb devices
if ($devices -notmatch "$device\s+device") {
    Write-Host "Connecting to $device..."
    & $adb connect $device
    Start-Sleep -Seconds 1
}

# 转发所有传入参数
if ($args.Count -gt 0) {
    & $adb -s $device @args
} else {
    & $adb -s $device shell
}
