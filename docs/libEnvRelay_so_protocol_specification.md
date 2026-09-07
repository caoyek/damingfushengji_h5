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
- **核心响应数据字段 (JSON Fields)**：
  - `result (1:胜, 0:负)`
  - `round_count`
  - `actions (回合行动数组: att, def, skill, damage, is_crit)`
  - `rewards (经验, 银两, 掉落道具数组)`
  - `star_count`

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

## 三、 核心战斗与数值演算规范 (CBattle 逆向模型)

### 3.1 战斗状态机流转
```text
[发起挑战 CMsgBattle::SendPK] ---> [服务端下发战报 JSON (actions 回合列表)]
                                            |
                                            v
                      [CStageLogic::ChgStage(Stage 6: 战斗场景)]
                                            |
                                            v
                         [BattleReplayPlayer 逐帧/逐回合播放]
   Round Tip (第X回合) -> Attacker Rush (冲锋/绝技) -> Defender Hurt (受击漂字) -> 死亡淡出
                                            |
                                            v
                [RoundEnd (回合终验)] ---> 达到最大回合或一方阵亡
                                            |
                                            v
                        [ProcessRewards (弹窗胜利/失败结算)]
```

### 3.2 战斗回合数据封包标准格式 (Combat Actions JSON)
要在 H5/微信小游戏中完整驱动原版战斗动画，战报数据结构需遵照如下契约：
```json
{
  "event": "SHOW_BATTLE_RESULT",
  "result": 1,
  "dungeon_id": 1,
  "attacker_win": 1,
  "att_team": [{"uid": 10001, "name": "大明天子", "max_hp": 1200, "cur_hp": 1200, "pos": 1}],
  "def_team": [{"uid": 9001, "name": "恶霸·一", "max_hp": 600, "cur_hp": 600, "pos": 1}],
  "rounds": [
    {
      "round_idx": 1,
      "actions": [
        {
          "att_uid": 10001,
          "def_uid": 9001,
          "skill_id": 0,
          "damage": 268,
          "is_crit": 1,
          "def_remain_hp": 332,
          "action_type": "attack"
        }
      ]
    }
  ],
  "rewards": {
    "exp": 350,
    "silver": 1200,
    "items": [{"item_id": 1002, "count": 1}]
  }
}
```

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
