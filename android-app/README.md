# 《大明浮生记》Android 移动端方案全景指南 (Android App Solutions)

> 本目录包含了《大明浮生记》在移动端落地运行的**双轨完整方案**：
> 1. **路线 A（已达成）**：针对 Android 4.4 真机/低版本模拟器的**原版客户端离线私服与底层 SO 二进制补丁方案**；
> 2. **路线 B（演进规划）**：针对现代 Android 14/15 纯 64 位旗舰机的**极简原生全屏 WebView 独立单机 APK 方案**。

---

## 一、 路线 A：原版 APK 离线私服与持久 SO 补丁方案 (`offline-solution/`)

适用于深度体验 2012 年网龙 C3 引擎原汁原味表现、截取网络通信封包与校验视觉细节。

### 1.1 核心组件
* `offline-solution/MockServer.java`：单文件 Java 原生轻量服务端（同时监听 HTTP 80 与 TCP 8008 端口）；
* `offline-solution/scripts/apply_permanent_patch.sh`：直接修改手机上 `/data/app-lib/com.tq.daming-1/libEnvRelay.so`；
* `offline-solution/scripts/run_adb.ps1`：ADB 连接与实机控制脚本。

### 1.2 为什么必须打 8 字节补丁？
* 停服后官方 CDN 无法响应 `config.xml`，客户端水墨竹简加载进度条会卡在 Step 4 无法前进；
* 逆向定位到 `libEnvRelay.so` 的高频定时器 `CDlgLoading::OnTimer`（偏移 `0x001B3D8C`），将查询进度的 8 字节替换为：
  `MOV r1, #27` + `BL CLoading::NextStep`；
* **效果**：进度条刚露面的第 1 帧，在 0.05 秒内原生触发步进 27，秒切游戏主城大厅（Stage 5），告别外部脚本干预。

### 1.3 实机快速运行四步法
```bash
# 1. 手机修改 /system/etc/hosts 劫持域名至电脑 IP
# 192.168.10.50 dmfs.177yx.com

# 2. 宿主机编译并启动 MockServer
javac -encoding UTF-8 offline-solution/MockServer.java
java -cp offline-solution MockServer

# 3. 推送并执行 SO 持久补丁 (仅需打一次)
adb push offline-solution/scripts/apply_permanent_patch.sh /data/local/tmp/
adb shell "su -c 'chmod 777 /data/local/tmp/apply_permanent_patch.sh && /data/local/tmp/apply_permanent_patch.sh'"

# 4. 冷启动游戏客户端
adb shell "su -c 'am force-stop com.tq.daming && am start -n com.tq.daming/com.tq.env.Splash'"
```

---

## 二、 路线 B：现代 Android 14/15 纯 64 位独立单机 APK

### 2.1 为什么需要路线 B？
* 2024 年以后的现代旗舰手机（骁龙 8 Gen 3、天玑 9300、Android 14/15）**硬件移除了 32 位指令集支持**，无法加载原版 32 位的 `libEnvRelay.so`；
* 高版本 Android 拥有极严格的安全沙盒和权限拦截，普通用户无法修改 `/system/etc/hosts`。

### 2.2 现代打包架构
* **原生外壳**：基于 Android Studio 创建标准 64 位原生工程（配置 `arm64-v8a` 支持）；
* **极速渲染**：内置全屏 `WebView`，启用硬件加速；
* **内置资产**：将 `web/` 的 Canvas 单页直接打入 APK 的 `assets/` 目录；
* **优势**：
  * 全机型秒装秒开，不需要电脑，不需要网络权限，不需要 Root；
  * 原生支持 120Hz 高刷新率，功耗极低。
