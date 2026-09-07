# 《大明浮生记》多端现代化复刻与全量资产档案工程 (Daming Fushengji Remaster)

> 本仓库是对经典国产国风网游《大明浮生记》（NetDragon 福建网龙 C3 引擎开发）进行**全量协议逆向解密、美术资产解构、以及多端现代化复刻**的完整工程档案库。  
> 汇集了原版 10,703 个全量美术/音频资产、31 张官方配置底表、50 大 CMsg 网络协议白皮书与 26 张服务端动态数据库 DDL。

---

## 一、 项目全景目录索引

```text
.
├── 📁 docs/                         # 【权威逆向与可玩开发方案】
│   ├── libEnvRelay_so_protocol_specification.md  # 50 个 CMsg 协议与 86 个业务类逆向白皮书 (41.6 KB)
│   └── phase1_playable_development_plan.md       # 第一阶段可玩骨干工程方案（含最高工程铁律与严苛验收用例）
│
├── 📁 extracted_full_resources/     # ⭐⭐⭐【原版全量资源矿藏库】(10,703 个文件, 51 MB)
│   ├── 📁 client_assets/            # 10,213 张原版高清切图 (PNG)、348 个 UI 布局 (XML)、53 首音频 (OGG)
│   ├── 📁 server_data/              # 31 张核心静态配置表 (CSV/JSON，涵盖职业/站位/剧本/充值)
│   └── 📁 docs/                     # ⭐【全量官方策划设计案】GDD-01~08（门派、战斗、强化、军衔科举、搞丸、大牢、跑商通缉、洗髓）
│
├── 📁 server/                       # 【通用后端工程】Node.js + Express + SQLite
│   ├── package.json                # 依赖声明 (express, better-sqlite3, cors)
│   └── README.md                   # 26 张动态业务表全量 SQL DDL、50 个 CMsg 路由映射与四阶段路线图
│
├── 📁 minigame/                     # 【微信小游戏工程】基于 Canvas 的轻量小程序
│   ├── game.json / project.config  # 微信横屏配置
│   ├── src/                        # 平台基础设施 (CanvasRenderer 960x640 视口缩放、AudioService 音频池)
│   └── README.md                   # 视口映射算法与 GDD-02 战斗时序落地规范
│
├── 📁 web/                          # 【H5 网页端】免安装、任意浏览器即开即玩的 Web 单页工程
│   └── README.md                   # 纯前端轻量 SPA 架构说明与快速体验指南
│
└── 📁 android-app/                  # 【Android 移动端方案】
    ├── offline-solution/           # 原版 APK 离线私服 (MockServer.java + 8 字节持久 SO Patch)
    └── README.md                   # 原版离线实机部署手册 + 现代 64 位纯单机 APK 壳规划说明
```

---

## 二、 核心资产与官方数值机制全景

### 2.1 视听与表现资产 (10,703 个资源全部齐备)
* **10,213 张原版高清切图 (PNG)**：包括洛阳、南京、襄阳等 15 座州府全景底图、全套武将/NPC 立绘、怪物切图、装备/道具图标、宣纸水墨 UI 边框；
* **348 个界面布局 (XML)**：涵盖游戏全部弹窗、界面的像素级排版坐标与锚点；
* **53 首背景音乐与战斗音效 (OGG)**：包括战斗 BGM、BOSS 战音乐、技能受击音效与胜利结算乐曲；
* **1 套原版楷体矢量字库 (TTF)**：原版水墨字库文件。

### 2.2 31 张官方核心配置数据表 (`extracted_full_resources/server_data/`)
涵盖当年的全部底层规则：
1. `CreateRoleInfo.csv`：**百家姓起名库（292姓氏+348名字）**；
2. `BattlePos.csv`：**战斗九宫格站位像素坐标（att1~9, def1~9）**；
3. `BattleSetting.csv`：入场 300ms、攻击 800ms、受击击退 400ms、暴击震屏 60ms、死亡淡出 1000ms；
4. `SkillAction.csv` (1.7MB) / `ArmyAction.csv` (1.7MB)：技能与招式动作映射大表；
5. `RookieGuideInfo.csv`：新手村 120 步主线剧情剧本与奖励表；
6. `MapInsideGate.csv` / `MapOutside.csv` / `HidePlace.csv`：世界地图、城门与野外寻宝据点；
7. `InAppPurchase.csv`：元宝充值档位；
8. `ProfessionName.csv`：四大门派定义（混混、攻将、防将、阉派）。

### 2.3 官方原版战斗数值公式 (`extracted_full_resources/docs/GDD/02`)
* **先手规则**：按全场角色 `Speed` 从高到低排序；
* **格挡规则**：触发格挡直接减免 **50% 伤害**；
* **暴击规则**：暴击伤害固定为基础伤害的 **150%**；
* **命中公式**：
  $$\text{命中率} = \max\left(10\%, \min\left(100\%, 95\% + \frac{\text{攻方Hit} - \text{守方Dodge}}{\text{等级系数}}\right)\right)$$
* **伤害公式**：
  $$\text{最终伤害} = (\text{攻方攻击} \times \text{技能倍率} - \text{守方防御} \times \text{抵扣系数}) \times (1 - \text{减伤率})$$

### 2.4 原版特色核心系统全景 (GDD-01 ~ GDD-10 全案齐备)
* **搞丸系统 (`GDD/05`)**：在搞丸房搓丸子，产出 5 阶品质丸子（白绿蓝紫红，取自 `0x0057EF5C` 富文本标签）；6 大搞丸境界地宫，吞噬升级并镶嵌至角色 8 大命盘孔位；
* **官职军衔与科举 (`GDD/04`)**：`_ZN10CXmlString18GetOfficerRankNameEj` 底层写死的 0~13 共 14 级仕途官阶；每日科举答题（乡试/会试/殿试），支持求助与作弊小抄，每日领取朝廷俸禄；
* **大牢抓捕与奴役打工 (`GDD/06`)**：对齐 `MapPrison.csv`（17 个牢房热点、6 间囚室）；击败玩家押入私牢充当家丁分配打工；对齐 `EscapeInfo.csv`（30~99 级 70 级越狱时延）；
* **倒卖场跑商与通缉令 (`GDD/07`)**：112 种各地名产低买高卖动态浮动价格指数；六扇门发布江湖通缉令，赏金猎人追捕羁押；
* **武将洗髓培养 (`GDD/08`)**：`CAttrCulture` 四大培养模式（普通/加强/白金/至尊），突破四维属性上限，带防手抖二次确认机制；
* **职业殿堂与人才招募 (`GDD/09`)**：官方原版“人才市场”（`strres.ini` ID: 361310）；混混/攻将/防将/阉派四大殿堂自由切换；3x2 网格挑将；支持元宝急聘连抽与 **200 抽保底必出紫色神将**机制；隐藏风景名将特产寻访与伙伴仓库调度；
* **劳务市场与打工雇佣 (`GDD/10`)**：大牢下辖零工大厅（“打零工,得金币,练人品,混饭吃”）；8h/12h/24h 三阶时长档位挂机；采矿/耕田/织锦生活技能经验与银两产出；元宝加速减 CD 与主仆抽成经济闭环。

---


## 三、 逆向技术突破与工程治理

1. **底层动态库深度解密**：
   * 详见 [docs/libEnvRelay_so_protocol_specification.md](docs/libEnvRelay_so_protocol_specification.md)；
   * 彻底打通了客户端 50 个 CMsg 通信协议与战报标准 JSON 数组模型。
2. **服务端全量数据表建模**：
   * 详见 [server/README.md](server/README.md)；
   * 完整定义了 26 张动态业务表（账号、角色、伙伴、装备强化、命格宝珠、农庄挂机、世界 BOSS、科举答题、通缉越狱等）的 SQL DDL 与四阶段演进路线。
3. **彻底清除历史假数据**：
   * 废弃了早期未逆向时手工拼凑的静态 mock 流程（`data/`、旧 `renderer.js` 等），统一以官方正统协议为唯一准则。

---

## 四、 多端协同开发指引

* **后端开发**：进入 `server/`，通过 `npm install && npm start` 启动服务；
* **微信小游戏**：使用微信开发者工具打开 `minigame/` 导入运行；
* **网页版体验**：在 `web/` 目录下启动静态 HTTP 服务打开浏览器；
* **Android 真机**：参考 `android-app/README.md` 运行离线私服与 8 字节补丁。
