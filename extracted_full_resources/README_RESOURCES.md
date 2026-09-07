# 🎮 《大明浮生记》商业级工程标准重构与开发指南

本项目为经典武侠手游《大明浮生记》（基于天晴数码 C3 引擎）的完整逆向解包、工程资产重构与服务端复刻框架。

---

## 📁 1. 解包全量资产目录结构说明

```text
extracted_full_resources/
├── docs/                         # 【原版官方策划设计与数据字典】
│   ├── GDD/                      # 官方数值策划方案（职业、战斗公式、装备、搞丸特色玩法）
│   ├── TDD/                      # 技术架构简要概览（CMsg 对照，详见根目录 docs/）
│   └── DataDict/                 # 核心数据字典与 31 张数据表索引说明
├── client_assets/                # 【客户端全量视听与界面资产】(10,703 个真实资源)
│   ├── images/                   # 10,213 张游戏美术 PNG 切图（全格式已转为标准 PNG）
│   ├── audio/                    # 53 首 OGG 音频（bgm 背景音乐、sfx 基础音效、skill 技能音效）
│   ├── ui_layouts/               # 348 个标准 XML 界面布局文件（含全量 Rect 坐标与节点层级）
│   ├── animations/               # 13 个 ANI 动作序列文件
│   └── fonts/                    # 游戏内置矢量中文字体 font.ttf
├── client_configs/               # 客户端启动与平台配置（resconfig.txt、platformcfg.xml 等）
└── server_data/                  # 【官方全量 31 张配置数据表】
    ├── tables_csv/               # CSV 格式数据表（便于人眼查看与数值调校）
    └── tables_json/              # JSON 格式数据表（程序直接解析与高效加载）
```

---

## 🚀 2. 核心系统开发速查

1. **职业与门派**：混混（刺客）、攻将（物理战士）、防将（肉盾坦克）、阉派（法系辅助）。详见 `docs/GDD/01_职业与角色系统设计.md`。
2. **武将品质成长率**：白（<=21）、绿（22~32）、蓝（33~42）、紫（43~52）、红（53~63）、金（>63，如朱元璋、袁崇焕、魏忠贤）。
3. **战斗演算**：速度决定先后手，真实命中率判定、暴击（150%伤害）、格挡（减伤50%），严格按照 `docs/GDD/02_战斗机制与数值公式设计.md` 执行公式。
4. **特色系统**：搞丸系统（命盘8槽位与吞噬进化，见 `GDD/05`）、大牢奴役打工、跑商倒卖场、科举答题考状元、江湖通缉令。

---

## 🛠️ 3. 开发指引与跨目录调用规范

* **策划调数值**：查阅 `extracted_full_resources/docs/GDD/`，对照 `server_data/tables_csv/` 中的各表。
* **客户端开发（Web / 小游戏）**：从 `client_assets/ui_layouts/` 读取 XML 坐标，按需从 `client_assets/images/` 引用切图。
* **通信与协议**：严格对照根目录权威白皮书 [`docs/libEnvRelay_so_protocol_specification.md`](../docs/libEnvRelay_so_protocol_specification.md)，严禁任何硬编码与虚假字符串。
* **服务端开发**：对照根目录服务端白皮书 [`server/README.md`](../server/README.md)（含 26 张动态业务表 DDL 与 50 个 CMsg 路由映射）。
