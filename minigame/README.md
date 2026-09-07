# 《大明浮生记》微信小游戏工程规范与资产索引 (WeChat Minigame)

> **工程定位**：面向微信环境的高性能轻量单机/联机回合制 RPG 小游戏。  
> **视口分辨率**：基准 `960 × 640`（支持手机任意比例等比居中自适应）。  
> **包体目标**：主包体积严格控制在 **3 MB 以内**，秒级加载。

---

## 一、 目录架构与资产分类

```text
minigame/
├── game.json                  # 小游戏配置文件 (横屏 orientation: landscape)
├── project.config.json        # 微信开发者工具工程配置
├── README.md                  # 本设计规范文档
│
├── minigame_assets/           # 【运行时必须切图】按需从 extracted_full_resources 抽取的轻量包
│   ├── images/
│   │   ├── ui/                # 基础宣纸水墨外框 (dialog_rimbg2/4/8.png, combtn1/2/3.png)
│   │   ├── roles/             # 男女主角 42 帧呼吸立绘
│   │   ├── npc/               # 核心 NPC 立绘 (小翠 npc16, 二婶子 npc6, 锦衣卫 npc17)
│   │   └── maps/              # 新手村宣纸底图 (6_cn_xsc.png, 6_cw_xsc.png, 6_ggtd_xsc.png)
│   └── audio/                 # 核心背景音乐 (bgm_battle.ogg, win.ogg) 与音效
│
└── src/                       # 核心业务源码 (纯 JavaScript)
    ├── game.js                # 小游戏全局引导入口
    ├── platform/
    │   ├── WeChatPlatform.js  # 微信环境 Canvas、Touch 触控监听、屏幕尺寸获取封装
    │   └── AudioService.js    # InnerAudioContext 背景音乐循环与多通道音效池
    ├── ui/
    │   └── CanvasRenderer.js  # 960×640 虚拟视口 Contain 等比缩放矩阵计算器
    ├── storage/
    │   └── PlatformStorage.js # 微信沙盒本地持久化存储 (wx.getStorageSync)
    └── scenes/                # 游戏场景状态机
        ├── BootScene.js       # 启动与资产预加载
        ├── CreateRoleScene.js # 百家姓随机取名与创角立绘交互
        ├── RookieScene.js     # 新手村主城大厅与 NPC 交互
        └── BattleScene.js     # 回合制战斗演算与胜负结算
```

---

## 二、 核心机制与开发标准

### 2.1 屏幕适配与触控映射 (Contain 模式)
为了在 iPhone 16 等现代长条全面屏上 100% 保持原版画面不拉伸变形：
1. **缩放矩阵**：
   ```javascript
   const scale = Math.min(screenWidth / 960, screenHeight / 640);
   const offsetX = (screenWidth - 960 * scale) / 2;
   const offsetY = (screenHeight - 640 * scale) / 2;
   ```
2. **边缘补全**：多出来的两侧黑边使用宣纸水墨材质平铺铺满，浑然一体。
3. **触控点逆映射**：点击屏幕 `(touchX, touchY)`，自动通过公式换算回 `(touchX - offsetX) / scale`，精准命中 960×640 虚拟界面的按钮热区。

### 2.2 战斗系统落地准则 (遵循 GDD-02 规范)
战斗场景 `BattleScene` 必须严格按照 `extracted_full_resources/docs/GDD/02_战斗机制与数值公式设计.md` 驱动：
* **双方阵位**：读取 `BattlePos.csv`，支持最多 6v6 阵型（前排上中下、后排上中下）；
* **战斗时序**：
  * 入场移动：`300ms`
  * 冲锋出击耗时：`800ms`
  * 受击击退位移：`400ms / 10px`
  * 暴击震屏效果：`60ms / 15帧`
  * 死亡淡出：`1000ms` (透明度闪烁 3 次)
* **核心判定**：
  * 先手按 `Speed` 排序；
  * 格挡触发时减免 50% 伤害；
  * 暴击触发时造成 150% 伤害。

---

## 三、 本地开发与真机调试流程

1. 启动【微信开发者工具】；
2. 选择【导入项目】，目录指向当前项目的 `minigame/` 文件夹；
3. AppID 可选择“测试号”；
4. 即可在模拟器中即时热重载运行并生成真机预览二维码。
