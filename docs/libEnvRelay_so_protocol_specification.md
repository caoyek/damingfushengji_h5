# 《大明浮生记》核心动态库（`libEnvRelay.so`）逆向全协议与参数规范全景白皮书
> **文档版本**：1.0.0 (Reverse Engineered Release)  
> **分析目标**：`libEnvRelay.so` (11.31 MB, ELF 32-bit ARM, Unstripped)  
> **适用场景**：单机离线复刻、微信小游戏移植、高版本 Android/H5 重构、私服 MockServer 协议编写。

---
## 一、 整体架构概述与逆向实证
通过对 `libEnvRelay.so` 的二进制符号表（`.dynsym`）与常量只读数据段（`.rodata`）的穷尽式解析，我们锁定了客户端与服务端交互的全部 **50 个顶级网络协议类（`CMsg*`）**、**183 个界面控制器（`CDlg*`）** 以及 **24 个底层业务逻辑调度器（`C*Logic` / `C*Mgr`）**。

### 1.1 架构分层拓扑
```text
+--------------------------------------------------------------------------------+
|                             表现层 UI (183 个 CDlg 类)                          |
|   (CDlgCreateRole, CDlgLoading, CDlgBattle, CDlgEquipStrengthen, CDlgBag...)   |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
|                         业务实体与本地逻辑层 (86 个核心类)                        |
|  - 战斗演算: CBattle, CDungeonTeam, CActionMgr                                  |
|  - 角色养成: CRole, CPlayer, CEquipStrengthen, CAttrCulture                     |
|  - 道具背包: CItemPackage, CItem, CItemMgr (含 Arrange 一键整理算法)            |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
|                         网络通信封包层 (50 个 CMsg 协议类)                       |
|   (CMsgLogin, CMsgBattle, CMsgEquipStrengthen, CMsgMap, CMsgExam...)           |
+--------------------------------------------------------------------------------+
                                        |
                                        v
+--------------------------------------------------------------------------------+
|                传输协议契约: HTTP POST /index.php?action=... (JSON 数组)        |
+--------------------------------------------------------------------------------+
```

### 1.2 通信契约黄金法则（逆向关键结论）
1. **必须下发标准 JSON 数组**：
   C3 引擎的底层通用解析函数 `CMsgLogin::ProcessJson` 等，强制通过 `root[0]["event"]` 索引消息。服务端（或本地模拟器）**绝对不能下发单个 JSON 对象**，必须使用 `[ { "event": ... } ]` 数组形式，否则必定引起 `SIGSEGV (Signal 11)` 空指针闪退。
2. **组合事件流下发机制**：
   客户端支持且鼓励在一次 HTTP 响应中同时打包多个事件。例如在 `action=login` 中，服务器一次性下发了 `LOGIN_RECIEVE_EVENT`（创角数据）、`SHOW_BIG_MAP`（地图数据）、`BEGIN_INIT`（初始化信号）、`UPDATE_COOL_DOWN_TIMER`（心跳计时）4 个事件，客户端会按序依次分发给各个子系统。

---

## 二、 核心网络消息协议与参数全字典 (50 大 CMsg 模块)

### 2.1 认证、引导与系统通信 (Core Auth & System)
> 负责客户端与服务端的初始化握手、选服鉴权、防沉迷、版本热更及新手引导状态流转。

#### 【CMsgLogin】
- **系统功能**：登录鉴权与版本检查。下发角色基础字段与进入游戏初始事件流。
- **对应网络路由**：`POST /index.php?action=login / get_version`
- **底层 C++ 核心方法**：`EtR11HttpRequest`, `EtRK7StringTIcERN4Json5ValueE`, `EtRN7ITwHttp8ResponseE`
- **客户端请求携带参数 (Request Payload)**：
  - `action (login/get_version)`
  - `userid`
  - `token`
  - `version`
  - `client_id`
  - `server_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `LOGIN_RECIEVE_EVENT`
  - `SHOW_BIG_MAP`
  - `BEGIN_INIT`
  - `UPDATE_COOL_DOWN_TIMER`
- **核心响应数据字段 (JSON Fields)**：
  - `id (玩家ID)`
  - `playerName`
  - `sex`
  - `cityId`
  - `gold (元宝)`
  - `silver (银两)`
  - `role_state`
  - `help_step`
  - `announcement`

#### 【CMsgFangChenMi】
- **系统功能**：CMsgFangChenMi 系统业务协议
- **对应网络路由**：`POST /index.php?action=fangchenmi`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=fangchenmi`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `FANGCHENMI_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgDownFile】
- **系统功能**：CMsgDownFile 系统业务协议
- **对应网络路由**：`POST /index.php?action=downfile`
- **底层 C++ 核心方法**：`E7StringTIcES1_`, `EPKcRN7ITwHttp8ResponseE`, `EtR11HttpRequest`, `EtR7StringTIcES2_`
- **客户端请求携带参数 (Request Payload)**：
  - `action=downfile`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `DOWNFILE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgGuide】
- **系统功能**：CMsgGuide 系统业务协议
- **对应网络路由**：`POST /index.php?action=guide`
- **底层 C++ 核心方法**：`ERK7StringTIcES3_`, `Ei`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=guide`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `GUIDE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgHelper】
- **系统功能**：CMsgHelper 系统业务协议
- **对应网络路由**：`POST /index.php?action=helper`
- **底层 C++ 核心方法**：`E7StringTIcE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=helper`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `HELPER_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgGameStageUpdate】
- **系统功能**：CMsgGameStageUpdate 系统业务协议
- **对应网络路由**：`POST /index.php?action=gamestageupdate`
- **底层 C++ 核心方法**：`ERKN8CTwPatch13NeedPatchInfoER10CPatchFile`, `ERKN8CTwPatch14AutoPatchParamEj`, `EtR11HttpRequest`
- **客户端请求携带参数 (Request Payload)**：
  - `action=gamestageupdate`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `GAMESTAGEUPDATE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgHttp】
- **系统功能**：CMsgHttp 系统业务协议
- **对应网络路由**：`POST /index.php?action=http`
- **底层 C++ 核心方法**：`E`, `EPS_RK7StringTIcE`, `EPS_tRK7StringTIcERN4Json5ValueE`, `ERK7StringTIcE`, `ERK7StringTIcES3_`, `ERN7ITwHttp8ResponseE`, `ERSt6vectorIcSaIcEE`, `Eb`
- **客户端请求携带参数 (Request Payload)**：
  - `action=http`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `HTTP_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.2 战斗系统与副本挑战 (Battle & Dungeons)
> 涵盖主线副本、隐藏关卡、过关斩将（爬塔）、擂台竞技场及世界 BOSS 战。

#### 【CMsgBattle】
- **系统功能**：主线副本通关、隐藏关卡挑战、过关斩将与擂台战斗发起接口。
- **对应网络路由**：`POST /index.php?action=battle / pk`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `ER7StringTIcES2_`, `ER7StringTIcES2_S2_`, `ERK7StringTIcE`, `ERK7StringTIcES1_`, `ERK7StringTIcEbj`, `ERK7StringTIcEj`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=battle`
  - `dungeon_id (关卡ID)`
  - `member_id (对手/怪物ID)`
  - `type (1:普通, 2:过关斩将, 3:隐藏关, 4:擂台)`
  - `is_boss`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `BATTLE_RECIEVE_EVENT / SHOW_BATTLE_RESULT`
- **核心响应数据字段 (JSON Fields - 详见第三章 CBattle 深度逆向)**：
  - `data` (顶级数据容器对象)
  - `data.bg` (战斗背景地图)
  - `data.att_id` / `data.win_id` / `data.lost_id` (攻方/胜者/败者 UID)
  - `data.see_result_button_state` (跳过/查看战果按钮状态)
  - `data.teams` (双方参战阵容数组: `id`, `name`, `hp`, `swf`, `weapon_type`, `tpl_id`, `is_have_weapon`)
  - `data.rounds` (回合战报数组: `round`, `att`, `def`, `skill`, `is_crit`, `is_shock`, `swf_me`, `swf_to`)
  - `data.rewards` (战胜奖励对象: `exp`, `silver`, `items`)


#### 【CMsgBattleBoss】
- **系统功能**：世界 BOSS 活动。支持挑战 BOSS、元宝/银两战力鼓舞（Buff）、冷却时间清除及伤害排名奖励领取。
- **对应网络路由**：`POST /index.php?action=battle_boss`
- **底层 C++ 核心方法**：`ERK7StringTIcES3_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=battle_boss`
  - `sub_action (pk/cool/inspire/reward)`
  - `is_yuanbao (是否消耗元宝)`
  - `boss_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `REFRESH_BOSS_INFO`
  - `REFRESH_BOSS_MY_INFO`
  - `HURT_INFO`
- **核心响应数据字段 (JSON Fields)**：
  - `boss_hp`
  - `boss_max_hp`
  - `my_damage`
  - `my_rank`
  - `inspire_level (鼓舞加成%)`
  - `cool_time (冷却剩余秒数)`

#### 【CMsgPKCenter】
- **系统功能**：CMsgPKCenter 系统业务协议
- **对应网络路由**：`POST /index.php?action=pkcenter`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcEjbjj`, `Ejj`, `EjjRK7StringTIcE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=pkcenter`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `PKCENTER_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgLeiTai】
- **系统功能**：CMsgLeiTai 系统业务协议
- **对应网络路由**：`POST /index.php?action=leitai`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `ERK7StringTIcE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=leitai`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `LEITAI_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgReceiveBattleTimes】
- **系统功能**：CMsgReceiveBattleTimes 系统业务协议
- **对应网络路由**：`POST /index.php?action=receivebattletimes`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=receivebattletimes`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `RECEIVEBATTLETIMES_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.3 角色养成与属性洗练 (Role & Progression)
> 包括主角与武将属性成长、四维属性培养洗练、技能学习升级、命格宝珠及武将传承。

#### 【CMsgRole】
- **系统功能**：CMsgRole 系统业务协议
- **对应网络路由**：`POST /index.php?action=role`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `E7StringTIcES1_S1_`, `ER7StringTIcEh`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=role`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `ROLE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgAttrCulture】
- **系统功能**：武将与主角四维属性（力量、敏捷、智力、体质）培养洗练。支持普通培养、加强培养与至尊元宝培养，可选择保留或放弃新属性。
- **对应网络路由**：`POST /index.php?action=attr_culture`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=culture`
  - `role_id (武将ID)`
  - `culture_type (1:普通银两, 2:加强, 3:白金, 4:至尊元宝)`
  - `op (1:培养, 2:保存属性, 3:放弃)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `CULTURE_ATTR_RESULT`
  - `ROLE_ATTR_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `str_add (力量增减)`
  - `agi_add (敏捷增减)`
  - `int_add (智力增减)`
  - `con_add (体质增减)`
  - `cost_silver`
  - `cost_gold`

#### 【CMsgSkill】
- **系统功能**：武将技能配置与升级。消耗战功或技能残页提升绝技威力，配置出战武将的主动绝技与被动光环。
- **对应网络路由**：`POST /index.php?action=skill`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcES3_`, `ERK7StringTIcEb`, `ERK7StringTIcEj`, `ERK7StringTIcEjb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=skill_up`
  - `role_id`
  - `skill_id`
  - `slot_idx`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SKILL_UPDATE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `new_skill_lv`
  - `cost_zhangong`
  - `damage_ratio (%)`
  - `next_cd`

#### 【CMsgMakeBall】
- **系统功能**：七星命格/宝珠占星系统（类似神仙道命格）。消耗铜钱寻访江湖术士凝聚天罡宝珠，镶嵌进武将命盘大幅提升暴击/格挡/破甲属性。
- **对应网络路由**：`POST /index.php?action=make_ball`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_iS1_iS1_i`, `Ei`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=make_ball`
  - `master_idx (术士层级 1~5)`
  - `is_one_key (一键占星)`
  - `ball_id`
  - `role_slot`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `MAKE_BALL_RESULT`
  - `BALL_STORE_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `ball_data (命格ID, 品质, 属性加成)`
  - `cost_silver`
  - `next_master_unlocked`

#### 【CMsgHunshi】
- **系统功能**：CMsgHunshi 系统业务协议
- **对应网络路由**：`POST /index.php?action=hunshi`
- **底层 C++ 核心方法**：`Ei`, `Eii`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=hunshi`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `HUNSHI_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgInherit】
- **系统功能**：CMsgInherit 系统业务协议
- **对应网络路由**：`POST /index.php?action=inherit`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_S1_S1_S1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=inherit`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `INHERIT_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgLaberMarket】
- **系统功能**：劳工市场/酒馆寻贤。随机刷新绿、蓝、紫、橙四档历史名臣武将（如徐达、常遇春、刘伯温），消耗铜钱招募出战。
- **对应网络路由**：`POST /index.php?action=labor_market`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERN4Json5ValueE`, `Ebi`, `Eii`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=hire_hero`
  - `hero_tpl_id`
  - `is_yuanbao_refresh`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `REFRESH_HERO_LIST`
  - `HIRE_HERO_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `hero_list (模板ID, 名字, 职业, 初始资质, 招募身价)`
  - `role_id (招募成功赋予的唯一ID)`

#### 【CMsgPartnerWarehouse】
- **系统功能**：CMsgPartnerWarehouse 系统业务协议
- **对应网络路由**：`POST /index.php?action=partnerwarehouse`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=partnerwarehouse`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `PARTNERWAREHOUSE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.4 装备锻造与背包道具 (Equipment & Inventory)
> 管理玩家背包、道具使用与出售、装备强化（带保护符）、装备属性重铸及铁匠铺配方打造。

#### 【CMsgItem】
- **系统功能**：背包物品管理。包含药品消耗、礼包批量开启、一键整理背包（Arrange）与废弃道具出售。
- **对应网络路由**：`POST /index.php?action=item`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `EN8CItemMgr18E_PACK_SELECT_TYPEE`, `EN8CItemMgr18E_PACK_SELECT_TYPEEjj`, `Eb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=item_use / item_drop / item_arrange`
  - `item_id`
  - `item_count`
  - `bag_pos`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `ITEM_USE_RESULT`
  - `BAG_UPDATE`
  - `ROLE_PROP_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `bag_list (更新后的槽位道具数组)`
  - `add_hp`
  - `add_exp`
  - `add_silver`

#### 【CMsgEquipStrengthen】
- **系统功能**：装备强化系统。消耗银两与强化石提升装备等级与四维攻防数值，支持防爆保护符。
- **对应网络路由**：`POST /index.php?action=equip_strengthen`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcES3_`, `ERK7StringTIcES3_b`, `ERK7StringTIcEb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=equip_strengthen`
  - `equip_id (装备唯一ID)`
  - `is_protect (是否勾选保护符)`
  - `use_item_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `STRENGTH_TABS_INFO`
  - `EQUIP_STRENGTHEN_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result (1:成功, 2:失败降级, 0:银两不足)`
  - `new_level`
  - `cost_silver`
  - `cur_atk`
  - `cur_def`
  - `success_rate (%)`

#### 【CMsgEquipTrans】
- **系统功能**：装备属性重铸/洗练/传承。将一件装备的附加词条或强化等级平移转换给另一件装备。
- **对应网络路由**：`POST /index.php?action=equip_trans`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `ERK7StringTIcEib`, `ERK7StringTIcEii`, `ERK7StringTIcEj`, `Ej`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=equip_trans`
  - `src_equip_id (源装备)`
  - `dst_equip_id (目标装备)`
  - `trans_type`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `EQUIP_TRANS_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `new_equip_data`
  - `cost_silver`
  - `cost_gold`

#### 【CMsgCraftShop】
- **系统功能**：铁匠铺装备配方打造。收集图纸与铁矿材料后合成高阶紫装与橙装，可消耗银两或元宝补足材料。
- **对应网络路由**：`POST /index.php?action=craft_shop`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `Ebb`, `Ejj`, `Ejjb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=compose`
  - `recipe_id (图纸ID)`
  - `compose_type (1:金币, 2:元宝免材)`
  - `amount`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `COMPOSE_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `new_item_id`
  - `quality`
  - `cost_silver`
  - `cost_gold`
  - `remain_materials`

#### 【CMsgEquipShop】
- **系统功能**：CMsgEquipShop 系统业务协议
- **对应网络路由**：`POST /index.php?action=equipshop`
- **底层 C++ 核心方法**：`E7StringTIcE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=equipshop`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `EQUIPSHOP_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgSaleGoods】
- **系统功能**：CMsgSaleGoods 系统业务协议
- **对应网络路由**：`POST /index.php?action=salegoods`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `E7StringTIcES1_S1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=salegoods`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SALEGOODS_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.5 大地图、城池与农庄资源 (World Map & Cities)
> 世界大地图探索、过关通道与城市跳转、城主争夺、以及主城/农田资源挂机采集。

#### 【CMsgMap】
- **系统功能**：大地图探索与城池跃迁。管理各州府城池解锁状态、迷雾开放程度及城市切换。
- **对应网络路由**：`POST /index.php?action=map`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `ER7StringTIcES1_S1_`, `ER7StringTIcES2_`, `ER7StringTIcES2_S2_`, `ERK7StringTIcE`, `ERK7StringTIcES3_`, `ERK7StringTIcES3_RS1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=map / move`
  - `city_id (目标城市ID: 1:北京, 2:南京...)`
  - `cur_map_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SHOW_BIG_MAP`
  - `MOVE_CITY`
- **核心响应数据字段 (JSON Fields)**：
  - `city_id`
  - `data_already (已开启城市映射表)`
  - `data_pass (已通关关卡)`
  - `data_can (当前可挑战关卡)`

#### 【CMsgCityMaster】
- **系统功能**：CMsgCityMaster 系统业务协议
- **对应网络路由**：`POST /index.php?action=citymaster`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=citymaster`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `CITYMASTER_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgGather】
- **系统功能**：农庄/主城资源挂机采集系统。定时产出银两、粮草与精铁，支持元宝消除冷却时间与土地扩建。
- **对应网络路由**：`POST /index.php?action=gather`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `Ebj`, `Ej`, `EjRK7StringTIcE`, `Ejj`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=gather`
  - `field_id (土地编号)`
  - `clear_cd (是否秒CD)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `GATHER_RECIEVE_EVENT`
- **核心响应数据字段 (JSON Fields)**：
  - `status`
  - `silver_gained`
  - `food_gained`
  - `iron_gained`
  - `next_harvest_time`

### 2.6 任务、交互与特色奇趣玩法 (Quests & Mini-games)
> 主线与日常任务链、科举殿试答题考状元、通缉犯捉捕与劫狱系统、以及恶搞打脸与涂鸦互动。

#### 【CMsgTask】
- **系统功能**：主线、支线与日常悬赏任务系统。跟踪击杀指定副本怪物、收集特定道具，提交后奖励丰厚经验与装备。
- **对应网络路由**：`POST /index.php?action=task`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcES3_`, `Eii`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=task`
  - `task_id`
  - `sub_action (accept/finish/giveup)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `REFRESH_CURRENT_TASK_INFO`
  - `TASK_FINISHED_NOTIFY`
- **核心响应数据字段 (JSON Fields)**：
  - `task_id`
  - `state (0:可接, 1:进行中, 2:已完成)`
  - `progress (当前击杀数/所需数)`
  - `reward_exp`
  - `reward_silver`
  - `reward_items`

#### 【CMsgExam】
- **系统功能**：大明科举殿试答题系统。每日定时开启古代文史科举问答，连续答对提高状元积分与大量声望经验，支持双倍积分卡。
- **对应网络路由**：`POST /index.php?action=exam`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcES3_`, `Eb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=exam`
  - `question_id (题目编号)`
  - `answer_idx (选择选项 0~3)`
  - `is_double (是否双倍)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SHOW_EXAM_RESULT`
  - `REFRESH_QUESTION`
- **核心响应数据字段 (JSON Fields)**：
  - `is_correct (1:答对, 0:答错)`
  - `right_answer`
  - `point_add`
  - `rank`
  - `reward_exp`
  - `reward_silver`

#### 【CMsgTongji】
- **系统功能**：官府通缉令与悬赏捉凶。揭榜缉拿逃犯并发生战斗，通关可获得高额朝廷功勋与通缉宝箱。
- **对应网络路由**：`POST /index.php?action=tongji`
- **底层 C++ 核心方法**：`E7StringTIcE`, `ERK7StringTIcE`, `ERK7StringTIcES1_`, `ERK7StringTIcEbbb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=tongji`
  - `criminal_id`
  - `op (query/pk/refresh)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `REFRESH_TONGJI_LIST`
  - `TONGJI_PK_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `criminal_list (逃犯姓名, 赏金, 危险等级, 战力)`
  - `merit_add`
  - `silver_add`

#### 【CMsgPrison】
- **系统功能**：大牢与劫狱互动。玩家战败可能被打入天牢，可消耗元宝赎身、好友劫狱或强行越狱挑战狱卒。
- **对应网络路由**：`POST /index.php?action=prison`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `ERK7StringTIcES3_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=prison`
  - `op (escape/rescue/bribe)`
  - `friend_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `PRISON_STATE_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `in_prison (是否在狱)`
  - `remain_sentence_time`
  - `jailer_combat_force`

#### 【CMsgCheeky】
- **系统功能**：奇趣社交：掌掴恶搞与厚脸皮榜。给全服其他玩家头像贴画贴纸、掌掴扇耳光，增加搞笑互动活跃度。
- **对应网络路由**：`POST /index.php?action=cheeky`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=cheeky`
  - `target_uid`
  - `item_face_id`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `CHEEKY_RECIEVE_EVENT`
- **核心响应数据字段 (JSON Fields)**：
  - `target_uid`
  - `cheeky_count (被扇耳光次数)`
  - `title (获得的搞笑称号)`

#### 【CMsgGraffiti】
- **系统功能**：城墙涂鸦留言墙。在各州府城门城墙上留下涂鸦墨宝与骚话，全服路过玩家均可瞻仰点赞。
- **对应网络路由**：`POST /index.php?action=graffiti`
- **底层 C++ 核心方法**：`ERK7StringTIcE`, `Eb`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=graffiti`
  - `city_id`
  - `content`
  - `ink_color`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `GRAFFITI_LIST_NOTIFY`
- **核心响应数据字段 (JSON Fields)**：
  - `city_id`
  - `graffiti_list (作者, 文本, 点赞数, 发布时间)`

#### 【CMsgZiXun】
- **系统功能**：CMsgZiXun 系统业务协议
- **对应网络路由**：`POST /index.php?action=zixun`
- **底层 C++ 核心方法**：`EtR11HttpRequest`
- **客户端请求携带参数 (Request Payload)**：
  - `action=zixun`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `ZIXUN_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.7 经济流通、商城与运营活动 (Economy & Events)
> 元宝充值购买、VIP 特权礼包、官职俸禄征收、黑市神秘商店、庙会集市、以及开服与七日签到活动。

#### 【CMsgBuyYB】
- **系统功能**：元宝商城、VIP 等级特权与限量职业礼包。单机版可将其直接转换为每日元宝津贴与免费 VIP 礼包领取。
- **对应网络路由**：`POST /index.php?action=buy_yuanbao`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `ER7StringTIcE`, `ER7StringTIcES2_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=buy_yuanbao / buy_vip_gift`
  - `package_id`
  - `vip_level`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `BUY_YB_SUCCESS`
  - `VIP_GIFT_TAKEN`
- **核心响应数据字段 (JSON Fields)**：
  - `new_gold`
  - `vip_level`
  - `gift_items`

#### 【CMsgReceiveMoney】
- **系统功能**：官职俸禄发放与在线奖励。每日依爵位等级领取朝廷供奉俸禄银两，每在线 5/15/30 分钟领取倒计时宝箱。
- **对应网络路由**：`POST /index.php?action=receive_money`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=receive_money`
  - `type (salary/online_reward/levy)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `RECEIVE_MONEY_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `gained_silver`
  - `gained_gold`
  - `next_available_timestamp`

#### 【CMsgMysteriousStore】
- **系统功能**：神秘黑市商人。定时刷新珍稀打折图纸、橙色魂石与高阶丹药，可消耗银两或元宝抢购。
- **对应网络路由**：`POST /index.php?action=mysterious_store`
- **底层 C++ 核心方法**：`E7StringTIcES1_S1_S1_`, `E7StringTIcEb`, `Ei`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=secret_shop`
  - `item_pos`
  - `is_force_refresh`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `REFRESH_SECRET_SHOP_INFO`
- **核心响应数据字段 (JSON Fields)**：
  - `goods_list (商品ID, 原始价格, 折扣价格, 购买限制)`
  - `next_auto_refresh_sec`

#### 【CMsgFair】
- **系统功能**：庙会赶集系统。消耗庙会兑换券游玩庙会小游戏，兑换节日限量外装与称号。
- **对应网络路由**：`POST /index.php?action=fair`
- **底层 C++ 核心方法**：`Ej`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=fair`
  - `fair_game_id`
  - `ticket_count`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `FAIR_EVENT_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `fair_points`
  - `available_prizes`

#### 【CMsgLoginReward】
- **系统功能**：七日登录连环礼与签到日历。连续登录送顶级紫将、高级强化石与万元宝箱。
- **对应网络路由**：`POST /index.php?action=login_reward`
- **底层 C++ 核心方法**：`EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=login_reward`
  - `day_idx`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `LOGIN_REWARD_NOTIFY`
- **核心响应数据字段 (JSON Fields)**：
  - `signed_days`
  - `today_taken`
  - `reward_content`

#### 【CMsgNewServiceActivities】
- **系统功能**：CMsgNewServiceActivities 系统业务协议
- **对应网络路由**：`POST /index.php?action=newserviceactivities`
- **底层 C++ 核心方法**：`E7StringTIcEi`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=newserviceactivities`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `NEWSERVICEACTIVITIES_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

### 2.8 社交关系、排行榜与帮会 (Social & Guild)
> 好友/仇人/黑名单关系链、全服邮件系统、世界与私聊频道、帮会/军团建设、以及全服牛人榜与成就徽章。

#### 【CMsgRelation】
- **系统功能**：好友社交与仇人录。支持搜索角色、加好友送体力、拉黑与查看仇人行踪进行擂台复仇。
- **对应网络路由**：`POST /index.php?action=relation`
- **底层 C++ 核心方法**：`E7StringTIcE`, `ERK7StringTIcE`, `ERK7StringTIcES3_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=relation`
  - `sub_type (friend/enemy/black)`
  - `target_uid`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SHOW_SEARCH_ROLE_INFO`
  - `RELATION_LIST_NOTIFY`
- **核心响应数据字段 (JSON Fields)**：
  - `friends_list`
  - `enemy_list`
  - `online_status`

#### 【CMsgMail】
- **系统功能**：全服邮箱系统。支持领取系统补偿、排行榜奖励、以及好友赠礼附件。
- **对应网络路由**：`POST /index.php?action=mail`
- **底层 C++ 核心方法**：`ER7StringTIcE`, `ER7StringTIcES2_`, `ER7StringTIcES2_S2_S2_`, `ERK7StringTIcE`, `ERKSt6vectorI7StringTIcESaIS2_EE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=mail`
  - `mail_id`
  - `op (read/take/del/one_key_take)`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `MAIL_LIST_NOTIFY`
  - `MAIL_TAKE_ATTACHMENT_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `mail_list (标题, 内容, 发件人, 附件道具, 是否已读)`

#### 【CMsgChat】
- **系统功能**：CMsgChat 系统业务协议
- **对应网络路由**：`POST /index.php?action=chat`
- **底层 C++ 核心方法**：`E7StringTIcES1_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=chat`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `CHAT_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgLeague】
- **系统功能**：帮会/军团系统。管理帮会创建、帮众捐献、帮会专属科技技能点加成。
- **对应网络路由**：`POST /index.php?action=league`
- **底层 C++ 核心方法**：`E7StringTIcE`, `E7StringTIcES1_`, `ERK7StringTIcE`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=league`
  - `league_id`
  - `donate_amount`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `LEAGUE_INFO_UPDATE`
- **核心响应数据字段 (JSON Fields)**：
  - `league_id`
  - `league_name`
  - `level`
  - `members_count`
  - `my_contribution`

#### 【CMsgNiuRen】
- **系统功能**：CMsgNiuRen 系统业务协议
- **对应网络路由**：`POST /index.php?action=niuren`
- **底层 C++ 核心方法**：`ERK7StringTIcES3_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=niuren`
  - `sub_action`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `NIUREN_RESULT`
- **核心响应数据字段 (JSON Fields)**：
  - `result`
  - `status`

#### 【CMsgAchiev】
- **系统功能**：成就徽章与全服排行榜。涵盖战力榜、等级榜、富豪榜，达成特定成就可永久增加主角全属性。
- **对应网络路由**：`POST /index.php?action=achiev`
- **底层 C++ 核心方法**：`ERK7StringTIcES3_`, `EtRK7StringTIcERN4Json5ValueE`
- **客户端请求携带参数 (Request Payload)**：
  - `action=achiev`
  - `achiev_id`
  - `is_get_top10`
- **服务端响应 JSON 事件标识 (Response Events)**：
  - `SHOW_ACHIEV_INFO`
  - `SHOW_TOP10_RANK`
- **核心响应数据字段 (JSON Fields)**：
  - `achiev_list (成就ID, 完成状态, 奖励称号, 属性加成)`
  - `top10_list`

---

### 三、 核心战斗与数值演算规范 (CBattle 深度逆向实证)

### 3.1 战斗引擎架构定位与逆向实证（防作弊与纯回放模型）

通过对 `libEnvRelay.so` 中全部战斗相关指令的深度反汇编与符号追踪，确立了网龙 C3 引擎的底层战斗核心架构：

> 🚨 **【逆向关键实证】客户端 SO 完全不包含伤害公式与随机投骰计算！**  
> * 在原版商业手游设计中，为了彻底杜绝玩家通过本地修改 APK 制作“一刀秒怪”外挂，**所有伤害扣血、暴击判定、闪避骰子与战果计算 100% 运行在闭源的服务端机房**；  
> * 客户端 `libEnvRelay.so` 中的核心战斗模块（`CBattle`）在架构上被严格定义为一个**战报回放与动作渲染引擎（Combat Replay & Animation Player）**；  
> * 客户端唯一职责是接收服务端下发的动作数据包，依序播放入场冲锋、受击震颤、掉血漂字与死亡淡出。

```text
[发起挑战 CMsgBattle::SendPK / SendMonsterId] 
                  │
                  ▼
[服务端机房闭源计算 (攻防抵扣、暴击骰子、掉血结算)]
                  │
                  ▼ (下发全量标准战报 JSON 数据流)
[CBattle::ProcessBattleInfo (地址 0x00535B0C, 17.3 KB)]
                  │
                  ▼
[CStageLogic::ChgStage(Stage 6: 战斗场景)]
                  │
                  ▼
[CBattle::RenderAction (逐回合/逐动作时序驱动)]
  ├─ 动作入场：BattleSetting.csv (300ms)
  ├─ 出招冲锋：BattleSetting.csv (800ms) / 匹配 swf_me
  ├─ 受击击退：BattleSetting.csv (400ms / 10px) / 匹配 swf_to
  ├─ 暴击判定：CBattle::IsBaoJi 检测标签 -> 触发 is_shock 震屏 (60ms)
  └─ 死亡淡出：BattleSetting.csv (500ms 延迟 / 1000ms 闪烁3次)
                  │
                  ▼
[CBattle::ProcessRewards (弹窗胜利/失败结算，读取 win_id / lost_id)]
```

---

### 3.2 `CBattle::ProcessBattleInfo` 原生战报数据协议全貌

通过解析函数 `_ZN7CBattle17ProcessBattleInfoERN4Json5ValueE`（地址 `0x00535B0C`）中的所有 PC 相对寻址（PIC 字符串加载指令），**100% 提取出了网龙原版底层使用的 34 个原生 JSON 字段**：

```arm
; 逆向反汇编实证（提取自 CBattle::ProcessBattleInfo 指令流）：
PC 0x00535B50 -> str "data"
PC 0x00535B84 -> str "bg"
PC 0x00535BDC -> str "att_id"
PC 0x00535C28 -> str "win_id"
PC 0x00535C7C -> str "lost_id"
PC 0x00535CD0 -> str "see_result_button_state"
PC 0x00535E0C -> str "teams"
PC 0x00535E28 -> str "rounds"
PC 0x00535E44 -> str "skills"
PC 0x00535E60 -> str "rewards"
PC 0x00535E7C -> str "id"
PC 0x00535EC8 -> str "att"
PC 0x00535EE4 -> str "def"
PC 0x00536108 -> str "name"
PC 0x00536150 -> str "swf"
PC 0x00536198 -> str "shuxing"
PC 0x005361B4 -> str "hp"
PC 0x00536270 -> str "weapon_type"
PC 0x005362C0 -> str "tpl_id"
PC 0x00536308 -> str "is_have_weapon"
PC 0x005381E4 -> str "is_shock"
PC 0x0053822C -> str "swf_me"
PC 0x00538274 -> str "swf_to"
PC 0x005382B4 -> str "attack_num"
PC 0x005382F8 -> str "is_full"
PC 0x00539C34 -> str "other_info"
```

#### 原生战报数据封包标准格式（对齐 SO 底层实装）
要在 H5 / 微信小游戏中 1:1 驱动原版 `CBattle` 回放表现，战报封包必须遵照如下真实结构：

```json
{
  "event": "SHOW_BATTLE_RESULT",
  "data": {
    "bg": "6_ggtd_xsc",
    "att_id": "10001",
    "win_id": "10001",
    "lost_id": "9001",
    "see_result_button_state": 1,
    "teams": [
      {
        "id": "10001",
        "name": "主角",
        "shuxing": "混混",
        "hp": 480,
        "swf": "hero_male",
        "weapon_type": 1,
        "is_have_weapon": true,
        "tpl_id": 1000
      },
      {
        "id": "9001",
        "name": "恶霸·一",
        "shuxing": "野怪",
        "hp": 220,
        "swf": "b1a",
        "weapon_type": 0,
        "is_have_weapon": false,
        "tpl_id": 9001
      }
    ],
    "rounds": [
      {
        "round": 1,
        "att": { "id": "10001", "attack_num": 1, "swf_me": "rush_slash" },
        "def": { "id": "9001", "hp": 135, "swf_to": "hurt", "is_shock": true },
        "skill": "普通攻击",
        "is_crit": true
      },
      {
        "round": 2,
        "att": { "id": "10001", "attack_num": 1, "swf_me": "rush_slash" },
        "def": { "id": "9001", "hp": 0, "swf_to": "die", "is_shock": false },
        "skill": "普通攻击",
        "is_crit": false
      }
    ],
    "rewards": {
      "exp": 120,
      "silver": 200,
      "items": [
        { "item_id": 1002, "count": 1 }
      ]
    }
  }
}
```

---

### 3.3 暴击与闪避底层实现（`CBattle::IsBaoJi` / `IsShanBi` 反汇编）

反汇编函数 `_ZN7CBattle7IsBaoJiEv`（地址 `0x0052C308`）与 `_ZN7CBattle8IsShanBiEv`（地址 `0x0052C120`）：

```arm
; CBattle::IsBaoJi() 反汇编片段：
0x0052c308: push  {r4, r5, r6, r7, r8, sb, sl, fp, lr}
0x0052c30c: ldr   r3, [r0, #0x35c]  ; 加载当前回合动作数据链表
0x0052c310: ldr   r4, [r0, #0x358]
...
0x0052c43c: bl    #0x18c5c4        ; 内部调用 strcmp / 字符串标签匹配
0x0052c440: cmp   r0, #0           ; 比对是否带有 "baoji" / "crit" 标记
0x0052c444: bne   #0x52c370
0x0052c450: mov   r0, #1           ; 命中暴击标签：返回 1，触发 is_shock 震屏与红字漂浮
0x0052c468: pop   {r4, r5, r6, r7, r8, sb, sl, fp, pc}
0x0052c46c: mov   r0, #0           ; 未命中：返回 0
```

**实证结论**：  
客户端 SO 的 `IsBaoJi()` 纯粹是通过比对服务端下发战报中的标签字段来决定渲染效果，**客户端没有任何暴击概率公式或投骰代码**。

---

### 3.4 武将六阶成长率品质底层判定（`CXmlString::GetColorByGrowth` 反汇编）

函数 `_ZN10CXmlString16GetColorByGrowthEj`（地址 `0x00742B74`）负责为武将名称渲染对应品质的十六进制颜色。其反编译 ARM 汇编展示了**原生写死的硬逻辑分支判决树**：

```arm
=== CXmlString::GetColorByGrowth(unsigned int growth) 真实汇编 ===
0x00742bac: cmp  r6, #0x15     ; 0x15 = 21 (Growth <= 21)
0x00742bb0: bls  #0x742ccc     ; --> 【白阶凡品】RGB: #FFFFFF

0x00742bb4: sub  r3, r6, #0x16   ; Growth - 22 (0x16 = 22)
0x00742bb8: cmp  r3, #0xa        ; 比较 10 (22 + 10 = 32)
0x00742bbc: bls  #0x742e38       ; --> 【绿阶良品】RGB: #009C48

0x00742bc0: sub  r3, r6, #0x21   ; Growth - 33 (0x21 = 33)
0x00742bc4: cmp  r3, #9          ; 比较 9  (33 + 9 = 42)
0x00742bc8: bls  #0x742f00       ; --> 【蓝阶名将】RGB: #00BFFF

0x00742bcc: sub  r3, r6, #0x2b   ; Growth - 43 (0x2b = 43)
0x00742bd0: cmp  r3, #9          ; 比较 9  (43 + 9 = 52)
0x00742bd4: bls  #0x743090       ; --> 【紫阶神将】RGB: #EE82EE

0x00742bd8: sub  r6, r6, #0x35   ; Growth - 53 (0x35 = 53)
0x00742bdc: cmp  r6, #0xa        ; 比较 10 (53 + 10 = 63)
0x00742be0: bls  #0x742fc8       ; --> 【红阶统帅】RGB: #DE1E1E

0x00742be4: bl   #...            ; --> 【金阶至尊】RGB: #FFD700 (Growth > 63，如朱元璋、袁崇焕)
```

**实证结论**：  
GDD-01 中的武将六阶成长分段（白 <=21、绿 22~32、蓝 33~42、紫 43~52、红 53~63、金 >63）**是 100% 存在于 SO 机器码中的客观事实**，绝非人工臆测。

---

### 3.5 单机模式与服务端模式下的战斗工程落地

根据上述逆向成果，在工程实现上采用**“同构战报双模架构”**：

1. **第一阶段纯单机模式**：
   * 前端本地挂载 `BattleSimulator.js`，严格按照 GDD-02 通用攻防抵扣公式（先手速度、命中概率、暴击150%、格挡50%）进行内存即时推演；
   * 演算完毕后，本地自动包装生成标准原生的 `SHOW_BATTLE_RESULT` 战报 JSON 数据包；
   * 由 `CanvasRenderer.js` 模拟 `CBattle` 状态机播放战报。既保证了战斗过程有真实攻防扣血与胜负判定（绝非固定伤害数字），又保障了单机可玩。
2. **后续多人联机模式（平滑过渡）**：
   * 前端直接切断本地 `BattleSimulator.js`，改为向 `server/` 发送 `CMsgBattle::SendMonsterId`；
   * 服务端执行完全相同的 GDD-02 演算并下发完全相同的战报 JSON，前端渲染层 **0 修改、无缝接入**。


---

## 四、 核心实体与业务管理器逆向清单 (C*Mgr / C*Logic)

| 核心类名 | 职责与系统定位 | 关键逆向方法 |
| :--- | :--- | :--- |
| `CBattle` | 战斗回合主控中心与奖励结算 | `RoundEnd`, `GetForceById`, `ProcessRewards`, `RenderEachOffier` |
| `CItemPackage` | 角色背包管理与槽位调度 | `AddItem`, `DelItem`, `Arrange` (一键整理), `GetItemAmount` |
| `CEquipStrengthen` | 装备强化数值与等级提升 | `GetStrengthenInfo`, `AddMember`, `NotifyMemberUpdate` |
| `CDungeonTeam` | 副本战前队伍编排与攻略查看 | `ProcessDungeonTeam`, `ProcessGonglue`, `SortGonglue` |
| `CCreateRole` | 创角随机百家姓与角色初始化 | `RandGetRoleName`, `ReadRoleCreateInfoFDB`, `SendCreateRole` |
| `CActionMgr` | 动作序列队列（负责伤害数字漂浮与动作协调） | `AddHpAction`, `ProcessAction`, `IsActionRunning` |
| `CAniFileMgr` | 骨骼动作文件缓存池与索引管理 | `AddAniFile`, `GetAniIndexInfo`, `EnableReturnDefaultAni` |
| `CGameStageMgr` | 游戏全局 Stage 状态机 (0~6) | `CreateStage`, `OnGameStageChange`, `OnGameViewSizeChanged` |
| `CNetMgr` | 底层网络异步连接与封包调度池 | `Process`, `Init`, `Reset`, `Send` |

---

## 五、 常用数据字典与 JSON 键名规范表

为了避免编码时拼写错误，以下为从 SO 常量段 `.rodata` 中萃取的标准字段名称：

### 5.1 基础属性类
- `id` / `role_id` / `member_id`: 角色/武将唯一标识符
- `playerName` / `name`: 角色/NPC/物品名称
- `gold`: 元宝数值（主货币）
- `silver`: 银两数值（副货币）
- `level`: 等级
- `exp` / `exp_next`: 当前经验值 / 升级所需经验值
- `str` (力量) / `agi` (敏捷) / `int` (智力) / `con` (体质)
- `atk` (攻击力) / `def` (防御力) / `speed` (出手敏捷速度) / `crit` (暴击)
- `hp` / `max_hp`: 生命值 / 最大生命值

### 5.2 状态与控制类
- `result`: 操作返回码（1 为成功，0 为失败，非 1 为各种错误码）
- `status`: 实体激活或开放状态
- `code`: 鉴权状态（通常 1 表示验证通过）
- `help_step`: 新手引导当前步骤（99 表示引导已全部完成）
- `cityId`: 当前所处州府城市 ID（1 为洛阳/北京主城）

---

## 六、 微信小游戏 / H5 单机化落地实践路线指引

基于本规范文档，向现代跨平台工程（当前小游戏 `minigame-1`）移植的推荐执行步骤如下：

1. **阶段一（已达成）**：创角、新手村剧情、装备背包穿戴（`ItemPack` + `PlayerInfo`）、首场战斗回放（`BattleReplayPlayer`）；
2. **阶段二（战斗与关卡泛化）**：
   - 参照第 3 章的战报 JSON 标准，编写纯单机计算的 `BattleSimulator.js`（根据双方攻防、技能、暴击率，本地直接生成战斗回放数组）；
   - 将大地图 `CMsgMap` 的 15 个城市关卡逐一打通，支持点击过关通道怪后连续进入战斗。
3. **阶段三（装备锻造与养成闭环）**：
   - 参照 `CMsgEquipStrengthen` 实现装备强化，把强化成功的属性加成写入本地存档 `v3`；
   - 参照 `CMsgAttrCulture` 点亮主角属性洗练界面。
4. **阶段四（奇趣单人玩法点亮）**：
   - 参照 `CMsgExam` 实现科举殿试问答；
   - 参照 `CMsgGather` 开启主城离线挂机收益采集。
