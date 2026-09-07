# 《大明浮生记》微信小游戏第一阶段 - 资产与证据链审计报告

## 一、 审计概述

本报告记录第一阶段（创角与单机存档）所使用的全部美术资产、配置数据与布局文件的来源证据链。严格遵循《第一阶段实施规格书》的数据优先级，未引入任何未经确认的假数据或猜测数值。

---

## 二、 关键资产证据链清单

| 资源 ID | 资源类型 | 来源文件与定位 | 逻辑路径 | 物理文件路径 / 产物路径 | 证据状态 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bg_dialog_rimbg8` | 图片 (PNG) | `CreateRole.xml` 根节点 `Background="dialog_rimbg8:2"` | `data/dialog/rimbg8.png` | `minigame_assets/images/rimbg8.png` | `confirmedLocal` |
| `btn_combtn_normal` | 图片 (PNG) | `ui.ani` 中的 `[button_combtn1]` Frame0 | `data/button/combtn1.png` | `minigame_assets/images/combtn1.png` | `confirmedLocal` |
| `btn_combtn_pressed` | 图片 (PNG) | `ui.ani` 中的 `[button_combtn1]` Frame1 | `data/button/combtn2.png` | `minigame_assets/images/combtn2.png` | `confirmedLocal` |
| `btn_combtn_disabled` | 图片 (PNG) | `ui.ani` 中的 `[button_combtn1]` Frame2 | `data/button/combtn3.png` | `minigame_assets/images/combtn3.png` | `confirmedLocal` |
| `btn_page_left_normal` | 图片 (PNG) | `ui.ani` 中的 `[button_compageleft1]` Frame0 | `data/button/compageleft1.png` | `minigame_assets/images/compageleft1.png` | `confirmedLocal` |
| `btn_page_left_pressed` | 图片 (PNG) | `ui.ani` 中的 `[button_compageleft2]` Frame0 | `data/button/compageleft2.png` | `minigame_assets/images/compageleft2.png` | `confirmedLocal` |
| `btn_page_right_normal` | 图片 (PNG) | `ui.ani` 中的 `[button_compageright1]` Frame0 | `data/button/compageright1.png` | `minigame_assets/images/compageright1.png` | `confirmedLocal` |
| `btn_page_right_pressed` | 图片 (PNG) | `ui.ani` 中的 `[button_compageright2]` Frame0 | `data/button/compageright2.png` | `minigame_assets/images/compageright2.png` | `confirmedLocal` |
| `portrait_male_default` | 图片 (PNG) | `CreateRole.xml` `imgMale` `cartoon_interfaceboygrey:6` | `data/cartoon/interface/1/1.png` | `minigame_assets/images/portrait_male_1.png` | `confirmedLocal` |
| `portrait_female_default` | 图片 (PNG) | `CreateRole.xml` `imgFemale` `cartoon_interfacegirlgrey:6` | `data/cartoon/interface/2/1.png` | `minigame_assets/images/portrait_female_1.png` | `confirmedLocal` |
| `font_game_main` | 矢量字体 (TTF) | `extracted_full_resources/client_assets/fonts/font.ttf` | 游戏主字体 | `minigame_assets/fonts/font.ttf` | `confirmedLocal` |

---

## 三、 配置数据来源

1. **角色形象配置 (`CreateRoleConf.json`)**
   - 提取自真机 APK 的 KFDB 数据库 `CreateRoleConf` 表。
   - 包含 20 条标准记录（男性 10 款 `male01` ~ `male10`，女性 10 款 `famale01` ~ `famale10`）。
   - 证据状态：`confirmedLocal`。

2. **百家姓与常用名库 (`CreateRoleInfo.json`)**
   - 提取自真机 APK 的 KFDB 数据库 `CreateRoleInfo` 表。
   - `unType: 0` 包含 292 个姓氏（含复姓：欧阳、诸葛、令狐、慕容、公孙等）。
   - `unType: 1` 包含 348 个常用汉字名。
   - `unType: 2` 包含 9 条原版系统滚动广播文本。
   - 证据状态：`confirmedLocal`。

3. **UI 布局与像素级坐标 (`CreateRole.xml`)**
   - 提取自 `extracted_full_resources/client_assets/ui_layouts/CreateRole.xml`。
   - 包含 960x640 基准设计尺寸下的所有控件：
     - `imgMale` (155, 193, 300, 270)
     - `imgFemale` (506, 193, 300, 270)
     - `Static_0` "我是帅哥" (221, 472, 112, 30)
     - `Static_1` "我是美女" (631, 472, 109, 30)
     - `edtRoleName` (464, 586, 122, 26)
     - `btnCreate` "开始游戏" (753, 529, 246, 137)
     - `staGetNameRand` "随便起名" (601, 551, 135, 58)
     - `rollStaRTInfo` 跑马灯 (26, 544, 271, 76)
   - 证据状态：`confirmedLocal`。

---

## 四、 包体与资源依赖闭包统计

- 全量原始解包图片：10,213 张 (约 35 MB)
- **第一阶段抽取并打包资源：11 项 (仅 1.79 MB)**
- 资源依赖闭包未解析引用：0
- 重复资源 ID：0
- 缺失图片文件：0
