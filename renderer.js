const data = window.APK_UI_PREVIEW;
const stage = document.querySelector("#stage");
const select = document.querySelector("#page-select");
const filter = document.querySelector("#page-filter");
const meta = document.querySelector("#page-meta");
const flowSelect = document.querySelector("#flow-select");
const flowPrev = document.querySelector("#flow-prev");
const flowNext = document.querySelector("#flow-next");
const flowMeta = document.querySelector("#flow-meta");
const flowEvidence = document.querySelector("#flow-evidence");
const quickPages = document.querySelector("#quick-pages");
const stageFlowControls = document.querySelector("#stage-flow-controls");
const stageFlowPrev = document.querySelector("#stage-flow-prev");
const stageFlowNext = document.querySelector("#stage-flow-next");
const stageFlowLabel = document.querySelector("#stage-flow-label");
const pageActions = document.querySelector("#page-actions");
const showActions = document.querySelector("#show-actions");
const twui = window.TwUiRenderer;
const flowData = window.APK_OFFLINE_FLOWS || { flows: {}, quickPages: [], npcVisuals: {} };
const actionData = window.APK_UI_ACTIONS || { actionsByOwner: {} };
const runtimeSeed = window.APK_RUNTIME_SEED || {};
const reviewedMasterData = window.APK_REVIEWED_MASTER_DATA || { summary: {}, templates: [] };
const reviewedResolver = window.ApkReviewedRuntimeResolver || null;
const runtime = window.ApkRuntime || null;
const intervals = [];
const params = new URLSearchParams(window.location.search);
const reviewedMode = params.get("reviewed") === "1";
const debugPlaceholders = params.get("debug") === "1";
const hideChrome = params.get("chrome") === "0";
const showGuideOverlay = params.get("guide") === "1" || debugPlaceholders;
const backendStatus = window.ApkBackendStatus || { enabled: false, ok: true, error: "" };
const PLAY_FLOW_NAME = "rookie";
const CONFIRMED_SHELL_HEAD_VISUALS = {
  "1000:1": {
    key: "b_image/npc/headicon_hunhun_male.gif",
    aniFile: "ani/headicon.ani",
    frames: [
      {
        path: "data/headicon/user/b_h1.png",
        url: "assets/data/headicon/user/b_h1.png",
        width: 118,
        height: 145,
        source: "HeadIconInfo.csv 10001 + headicon.ani",
      },
    ],
    raw: "b_image/npc/headicon_hunhun_male.gif",
    drawMode: "center",
    evidenceStatus: "confirmedLocal",
  },
};
const ACTION_KIND_LABELS = {
  dialogue: "NPC 对话",
  dialog_control: "界面控件",
  map_click: "地图点击",
  dungeon_battle_settlement: "过关战斗完成/推进",
  event_gate: "状态事件",
  open_dungeon_team: "过关战斗入口",
  map_dungeon_team_event: "地图战斗入口",
  field_monster_map_click: "野怪地图点击",
  field_monster_settlement: "野怪完成/推进",
  return_button: "返回按钮",
  advance: "普通推进",
  placeholder: "占位/测试",
};
const hasExplicitNavigation = params.has("page") || params.has("flow") || window.location.hash;
const playMode = params.get("play") === "rookie" || !hasExplicitNavigation;
let activeFlowName = params.get("flow") || "";
let activeFlowStepIndex = Number(params.get("step") || 0);
let activePageName = "";
let actionStatus = "";
const navigationStack = [];
document.body.classList.toggle("show-placeholders", debugPlaceholders);
document.body.classList.toggle("hide-chrome", hideChrome);
document.body.classList.toggle("play-mode", playMode);
document.body.classList.toggle("show-guide-overlay", showGuideOverlay);

function clearIntervals() {
  while (intervals.length) {
    window.clearInterval(intervals.pop());
  }
}

function defaultPageName() {
  if (playMode && pageByName("LoginSelServer")) return "LoginSelServer";
  if (playMode && pageByName("CreateRole")) return "CreateRole";
  const loginEntry = flowData.flows?.login_entry?.steps?.find((step) => pageByName(step.page));
  if (loginEntry?.page) return loginEntry.page;
  if (pageByName("Login")) return "Login";
  if (pageByName("RookieField")) return "RookieField";
  return data.pages[0]?.name || "";
}

function pageNameFromLocation() {
  const params = new URLSearchParams(window.location.search);
  return params.get("page") || window.location.hash.slice(1) || defaultPageName();
}

function cleanPreviewText(text) {
  return String(text || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?#[0-9a-fA-F]{3,8}>?/g, "")
    .replace(/<[^>]+>/g, "");
}

function currentPlayerName() {
  const player = runtime?.snapshot?.().player_state || {};
  const name = player.roleName || player.draftRoleName;
  return name || params.get("player") || runtimeSeed.createRole?.defaultName || "小明";
}

function currentCreateRoleName() {
  const player = runtime?.snapshot?.().player_state || {};
  return player.draftRoleName || player.roleName || params.get("player") || runtimeSeed.createRole?.defaultName || "小明";
}

function currentCreateRoleSex() {
  const player = runtime?.snapshot?.().player_state || {};
  return Number(player.draftSex ?? player.sex ?? runtimeSeed.createRole?.defaultSex ?? 1);
}

function runtimeText(text) {
  return cleanPreviewText(String(text || "").replaceAll("$player_name", currentPlayerName()));
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function pageByName(name) {
  return data.pages.find((item) => item.name === name) || null;
}

function currentFlow() {
  return flowData.flows?.[activeFlowName] || null;
}

function currentFlowStep() {
  const flow = currentFlow();
  if (!flow?.steps?.length) return null;
  return flow.steps[activeFlowStepIndex] || flow.steps[0];
}

function isRookiePlay() {
  return playMode && activeFlowName === PLAY_FLOW_NAME;
}

function flowActionKind(step) {
  if (!step) return "";
  if (step.actionKind) return step.actionKind;
  const evt = step.toggleEvt || "";
  const cond = step.toggleCond || "";
  if (evt === "ggee") return "placeholder";
  if (step.type === "npc_dlg") return "dialogue";
  if (evt.startsWith("city_dungeon_team") && cond.startsWith("dungeon_team")) return "open_dungeon_team";
  if (evt.startsWith("city_dungeon_team")) return "map_dungeon_team_event";
  if (evt.startsWith("city_dungeon_pk")) return "dungeon_battle_settlement";
  if (evt === "city_monster_pk") return "field_monster_settlement";
  if (evt === "go2fieldmonster") return "field_monster_map_click";
  return "";
}

function flowActionLabel(step) {
  const kind = flowActionKind(step);
  return ACTION_KIND_LABELS[kind] || kind || "未分类";
}

function flowStateConclusion(step) {
  const kind = flowActionKind(step);
  if (kind === "open_dungeon_team") {
    return "确定：打开 DungeonTeam，点击 btnFight 后进入 Battle，结果页关闭后推进到下一步。数值/掉落不在本地表里硬猜。";
  }
  if (kind === "map_dungeon_team_event") {
    return "确定：地图怪点击会进入过关队伍页。后续战斗链路同 DungeonTeam。";
  }
  if (kind === "dungeon_battle_settlement") {
    return "确定：city_dungeon_pk_* 是过关战斗完成/推进边界。真实结算公式未在本地静态表中确认。";
  }
  if (kind === "field_monster_map_click") {
    return "确定：野怪中心相关地图点击。槽位坐标来自 FieldMonsterPos.csv；怪物种类/掉落未静态确认。";
  }
  if (kind === "field_monster_settlement") {
    return "确定：city_monster_pk 是野怪战斗完成/推进边界。";
  }
  if (kind === "placeholder") {
    return "保留：第 46 步 ggee/jkljljlk/hlkhjkjhk 看起来像占位或测试数据，不作为玩法依据。";
  }
  if (kind === "dialogue") {
    return "确定：点击 RookieNpc.staOpContent 推进 NPC 对话。";
  }
  if (kind === "dialog_control") {
    return "确定：按 strRenderTag 指向的 APK UI 控件执行当前引导步骤。";
  }
  if (kind === "map_click") {
    return "确定：按 RookieGuideInfo.csv 坐标点击地图。";
  }
  if (kind === "event_gate") {
    return "确定：按 toggleEvt/toggleCond 推进状态；无额外页面数值推断。";
  }
  return "确定：按 RookieGuideInfo.csv 顺序推进。";
}

function isDungeonTeamPlayStep(step) {
  const kind = flowActionKind(step);
  return kind === "open_dungeon_team" || kind === "map_dungeon_team_event";
}

function isFieldMonsterPlayStep(step) {
  const kind = flowActionKind(step);
  return (
    kind === "field_monster_map_click" ||
    kind === "field_monster_settlement" ||
    String(step?.sceneKey || "").startsWith("fieldMonster:")
  );
}

function nearestFieldMonsterSlot(step) {
  const slots = runtimeSeed.fieldMonster?.slots || [];
  if (!slots.length || !step) return null;
  const point = primaryGuideTarget(step);
  let best = null;
  let bestDistance = Infinity;
  for (const slot of slots) {
    const dx = Number(slot.x) - Number(point.x);
    const dy = Number(slot.y) - Number(point.y);
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < bestDistance) {
      best = slot;
      bestDistance = distance;
    }
  }
  return best ? { ...best, distance: bestDistance } : null;
}

function guideEventMatchesStep(event, step) {
  if (!event || !step) return false;
  if (event.index !== undefined && step.index !== undefined && Number(event.index) === Number(step.index)) return true;
  const sameEvent = (event.event || "") === (step.toggleEvt || step.event || "");
  const sameCondition = (event.condition || "") === (step.toggleCond || step.condition || "");
  const sameCity = event.cityId === undefined || step.cityId === undefined || Number(event.cityId) === Number(step.cityId);
  return sameEvent && sameCondition && sameCity;
}

function dungeonChainForStep(step) {
  if (!step) return null;
  const chains = runtimeSeed.rookie?.dungeonChains || [];
  const kind = flowActionKind(step);
  if (kind === "open_dungeon_team" || kind === "map_dungeon_team_event") {
    return chains.find((chain) => guideEventMatchesStep(chain.openTeamEvent, step)) || null;
  }
  if (kind === "dungeon_battle_settlement") {
    return chains.find((chain) => guideEventMatchesStep(chain.settlementEvent, step)) || null;
  }
  return null;
}

function activeDungeonChain() {
  const state = runtimeState();
  return state?.dungeon_team_state?.currentChain || state?.battle_result?.chain || dungeonChainForStep(currentFlowStep());
}

function reviewedDungeonDetail(chain = activeDungeonChain()) {
  if (!reviewedResolver?.reviewedDungeonDetail) return null;
  return reviewedResolver.reviewedDungeonDetail({
    chain,
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedItemDetail(item) {
  if (!reviewedResolver?.reviewedItemDetail || !item) return null;
  return reviewedResolver.reviewedItemDetail({
    item,
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedSkillRows() {
  if (!reviewedResolver?.reviewedSkillRows) return [];
  return reviewedResolver.reviewedSkillRows({
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedSkillDetail(skill) {
  if (!reviewedResolver?.reviewedSkillDetail || !skill) return null;
  return reviewedResolver.reviewedSkillDetail({
    skill,
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedGatherRows() {
  if (!reviewedResolver?.reviewedGatherRows) return [];
  return reviewedResolver.reviewedGatherRows({
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedWoyaowanRows() {
  if (!reviewedResolver?.reviewedWoyaowanRows) return [];
  return reviewedResolver.reviewedWoyaowanRows({
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedHideplaceDetail(hidePlace) {
  if (!reviewedResolver?.reviewedHideplaceDetail || !hidePlace) return null;
  return reviewedResolver.reviewedHideplaceDetail({
    hidePlace,
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedMapDetailForStep(step = currentFlowStep()) {
  if (!reviewedResolver?.reviewedMapDetail || !step) return null;
  const visual = mapVisualForStep(step);
  return reviewedResolver.reviewedMapDetail({
    map: {
      city: step.cityId,
      cityId: step.cityId,
      bgUrl: visual?.raw || visual?.frames?.[0]?.path || "",
    },
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedPartnerDetail(partner) {
  if (!reviewedResolver?.reviewedPartnerDetail || !partner) return null;
  return reviewedResolver.reviewedPartnerDetail({
    partner,
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedFieldMonsterDetail(step = currentFlowStep()) {
  if (!reviewedResolver?.reviewedFieldMonsterDetail || !step) return null;
  return reviewedResolver.reviewedFieldMonsterDetail({
    step,
    slot: nearestFieldMonsterSlot(step),
    runtime,
    reviewedPayload: reviewedMasterData,
    reviewedMode,
  });
}

function reviewedBattleDetail(step = currentFlowStep()) {
  const kind = flowActionKind(step);
  if (kind === "field_monster_map_click" || kind === "field_monster_settlement") {
    return reviewedFieldMonsterDetail(step);
  }
  return reviewedDungeonDetail();
}

function reviewedBattleTitle(detail) {
  return detail?.monsterName || detail?.name || detail?.displayName || "reviewed battle";
}

function reviewedBattleMeta(detail) {
  if (!detail) return "";
  return [
    detail.templateId,
    detail.matchKey ? `${detail.matchKey}=${detail.matchValue}` : "",
    detail.monsterTeamId ? `monster_team_id=${detail.monsterTeamId}` : "",
    detail.teamId ? `team_id=${detail.teamId}` : "",
    detail.monsterGroup ? `monsterGroup=${detail.monsterGroup}` : "",
    detail.level ? `level=${detail.level}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function dungeonRewardLabel(detail) {
  if (!detail) return "";
  return [
    detail.rewardText ? `reward: ${detail.rewardText}` : "",
    detail.gold ? `gold: ${detail.gold}` : "",
    detail.merit ? `merit: ${detail.merit}` : "",
    detail.dropItems ? `drops: ${detail.dropItems}` : "",
    detail.dailyMax ? `daily: ${detail.dailyMax}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function partnerReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.quality ? `quality: ${detail.quality}` : "",
    detail.costNum ? `cost: ${detail.costNum}${detail.costType ? ` ${detail.costType}` : ""}` : "",
    detail.careerId ? `career: ${detail.careerId}` : "",
    detail.skills ? `skills: ${detail.skills}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function itemReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.quality ? `quality: ${detail.quality}` : "",
    detail.level ? `level: ${detail.level}` : "",
    detail.requireLevel && detail.requireLevel !== detail.level ? `req: ${detail.requireLevel}` : "",
    detail.category ? `category: ${detail.category}` : "",
    detail.slot ? `slot: ${detail.slot}` : "",
    detail.sellPrice ? `sell: ${detail.sellPrice}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function skillReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.skillId ? `skill: ${detail.skillId}` : "",
    detail.level ? `level: ${detail.level}` : "",
    detail.requireLevel ? `req: ${detail.requireLevel}` : "",
    detail.useCost ? `cost: ${detail.useCost}` : "",
    detail.acts ? `acts: ${detail.acts}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function gatherReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.gatherItem ? `gather_item: ${detail.gatherItem}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function woyaowanReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.yaoWan ? `yao_wan: ${detail.yaoWan}` : "",
    detail.quality ? `quality: ${detail.quality}` : "",
    detail.stack ? `stack: ${detail.stack}` : "",
    detail.sellPrice ? `sell: ${detail.sellPrice}` : "",
    detail.needRealmLevel ? `realm: ${detail.needRealmLevel}` : "",
    detail.needSuipianNum ? `suipian: ${detail.needSuipianNum}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function hideplaceReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.hideId ? `hide_id: ${detail.hideId}` : "",
    detail.cityId ? `city: ${detail.cityId}` : "",
    detail.requireLevel ? `level: ${detail.requireLevel}` : "",
    detail.costYuanbaoOnOpen ? `open: ${detail.costYuanbaoOnOpen}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function mapReviewedMeta(detail) {
  if (!detail) return "";
  return [
    detail.city ? `city: ${detail.city}` : "",
    detail.bgUrl ? `bg: ${detail.bgUrl}` : "",
    detail.evidenceStatus ? `reviewed: ${detail.evidenceStatus}` : "",
  ]
    .filter(Boolean)
    .join(" / ");
}

function flowIndexForGuideIndex(guideIndex) {
  const flow = currentFlow();
  if (!flow?.steps?.length || guideIndex === undefined || guideIndex === null) return -1;
  return flow.steps.findIndex((step) => Number(step.index) === Number(guideIndex));
}

function startRookieFlow() {
  const roleName = currentCreateRoleName();
  const sex = currentCreateRoleSex();
  runtime?.reset?.();
  runtime?.createRole?.({ name: roleName, sex });
  activeFlowName = PLAY_FLOW_NAME;
  actionStatus = "play rookie start";
  setFlowStep(PLAY_FLOW_NAME, 0);
}

function shouldAutoAdvancePlayStep(step) {
  if (!playMode || !step || step.type !== "op") return false;
  return !cleanFlowText(step.content) && !Number(step.x) && !Number(step.y);
}

function normalizePlayStepIndex(flow, stepIndex) {
  if (!playMode || activeFlowName !== PLAY_FLOW_NAME) return stepIndex;

  let index = Math.min(Math.max(stepIndex, 0), flow.steps.length - 1);
  for (let guard = 0; guard < 12; guard += 1) {
    const step = flow.steps[index];
    if (!shouldAutoAdvancePlayStep(step) || index >= flow.steps.length - 1) break;
    index += 1;
  }
  return index;
}

function cloneData(value) {
  return JSON.parse(JSON.stringify(value));
}

function walkNodes(node, callback) {
  callback(node);
  for (const child of node.children || []) {
    walkNodes(child, callback);
  }
}

function setTextByName(root, name, text) {
  walkNodes(root, (node) => {
    if (node.attrs?.Name === name) {
      node.text = text;
    }
  });
}

function setTextByOwnerAndName(root, ownerPage, name, text) {
  let hit = false;
  walkNodes(root, (node) => {
    if (node.ownerPage === ownerPage && node.attrs?.Name === name) {
      node.text = text;
      hit = true;
    }
  });
  if (!hit) setTextByName(root, name, text);
}

function clearCollectionSamplesByName(root, name) {
  walkNodes(root, (node) => {
    if (node.attrs?.Name === name) {
      node.sampleItems = [];
      node.sampleItemCount = 0;
    }
  });
}

function clearCollectionsByNames(root, names) {
  names.forEach((name) => clearCollectionSamplesByName(root, name));
}

function setTextsByNames(root, names, text = "") {
  names.forEach((name) => setTextByName(root, name, text));
}

function setVisibleByNames(root, names, visible) {
  names.forEach((name) => setAttrByName(root, name, "Visible", visible ? "1" : "0"));
}

function runtimeState() {
  return runtime?.snapshot?.() || null;
}

function renderBackendStatus() {
  if (!backendStatus.enabled || !backendStatus.error) return;
  const node = document.createElement("div");
  node.className = "backend-error";
  node.textContent = `Backend connection failed: ${backendStatus.error}. Remove backend=1 to use the local runtime.`;
  stage.appendChild(node);
}

function runtimeTargetProfession() {
  const state = runtimeState();
  const targetId = state?.profession_state?.pendingProfessionId;
  return (runtimeSeed.professions || []).find((item) => item.id === targetId) || null;
}

function currentLoginServer() {
  const state = runtimeState();
  const serverIndex = state?.login_state?.selectedServerIndex;
  const servers = runtimeSeed.login?.servers || [];
  return servers.find((item) => Number(item.uServerIdx) === Number(serverIndex)) || servers[0] || null;
}

function selectedRecruitCandidate() {
  const state = runtimeState();
  const pool = state?.recruit_state?.pool || [];
  return pool[state?.recruit_state?.selectedIndex || 0] || pool[0] || null;
}

function applyRuntimeToPage(page) {
  const state = runtimeState();
  if (!state) return page;

  const root = page.root;
  const player = state.player_state || {};
  const currencies = player.currencies || {};
  const equipment = player.equipment || {};
  const inventory = state.inventory_state || {};
  const recruit = state.recruit_state || {};
  const targetProfession = runtimeTargetProfession();
  const selectedCandidate = selectedRecruitCandidate();
  const rookieEquipment = confirmedRookieEquipmentItem(state);
  const loginServer = currentLoginServer();

  applyShellUserVisuals(root, player);

  setTextByOwnerAndName(root, "ShellUser", "staName", player.roleName || "");
  setTextByOwnerAndName(root, "ShellUser", "staLev", String(player.level || ""));
  setTextByOwnerAndName(root, "ShellUser", "staExp", `${player.experience || 0}/${player.experienceMax || 0}`);
  setTextByOwnerAndName(root, "ShellUser", "staGold", String(currencies.gold || 0));
  setTextByOwnerAndName(root, "ShellUser", "staYuan", String(currencies.yuanbao || 0));

  setTextByOwnerAndName(root, "RoleInfo", "StaRoleName", player.roleName || "");
  setTextByOwnerAndName(root, "RoleInfo", "StaProfession", player.professionName || "");
  setTextByOwnerAndName(root, "RoleInfo", "StaPrestige", String(currencies.fame || 0));
  setTextByOwnerAndName(root, "RoleInfo", "StaExperience", `${player.experience || 0}/${player.experienceMax || 0}`);
  for (const name of [
    "StaBloodVolume",
    "StaMagicCount",
    "StaPhyAtk",
    "StaMagAtk",
    "StaPhyDef",
    "StaMagDef",
    "StaSpeed",
    "StaHit",
    "StaDuck",
    "StaCrit",
  ]) {
    setTextByOwnerAndName(root, "RoleInfo", name, String(player.stats?.[name] ?? 0));
  }
  setTextByOwnerAndName(root, "RoleInfo", "StaRightHandLev", equipment.rightHand ? "1星" : "");

  if (page.name === "LoginSelServer") {
    setTextByName(root, "StaServerName", loginServer?.strName || runtimeSeed.login?.defaultServerName || "");
    setTextByName(root, "staTip", "");
    clearCollectionSamplesByName(root, "lstServer");
    clearCollectionSamplesByName(root, "LstZiXun");
  }

  if (page.name === "LoginSelectServer") {
    clearCollectionSamplesByName(root, "lstServer");
  }

  if (page.name === "CreateRole") {
    setTextByName(root, "edtRoleName", currentCreateRoleName());
    setTextByName(root, "rollStaRTInfo", (runtimeSeed.createRole?.rollMessages || []).join("\n"));
  }

  if (page.name === "Loading") {
    setTextByName(root, "staTitle", runtimeSeed.loading?.defaultTip || "");
    setTextByName(root, "staVersion", "");
  }

  if (page.name === "ItemPack") {
    clearCollectionSamplesByName(root, "listPack");
    setTextByName(root, "staStorege", `${(inventory.items || []).length}/${inventory.capacity || 0}`);
    setTextByName(root, "Static_Tip", inventory.items?.length ? "" : " ");
  }

  if (page.name === "EquipList") {
    clearCollectionSamplesByName(root, "LstEquip");
  }

  if (page.name === "EquipStrengthen") {
    clearCollectionSamplesByName(root, "lstEquip");
    clearCollectionSamplesByName(root, "lstTag");
    setAttrByName(root, "PanelNoEquip", "Visible", rookieEquipment ? "0" : "1");
    setTextByName(root, "staName", rookieEquipment?.name || "");
    setTextByName(root, "staProfession", "");
    setTextByName(root, "staQuality", "");
    setTextByName(root, "staLevelReq", "");
    setTextByName(root, "staGrow", "");
    setTextByName(root, "staCost", "");
    setTextByName(root, "staMoney", "");
    setTextByName(root, "staNormalStren", "");
    setTextByName(root, "staPayStren", "");
    setTextByName(root, "staUpLevTips", rookieEquipment ? "强化数值待确认" : "");
  }

  if (page.name === "Skill") {
    clearCollectionSamplesByName(root, "listFightSkill");
    clearCollectionSamplesByName(root, "listStrengSkill");
    const skill = reviewedSkillRows()[0] || null;
    setTextByName(root, "staSkillTitle", skill?.displayName || "");
    setTextByName(root, "staCurLev", skill?.level || "");
    setTextByName(root, "staLevState", skill?.maxLevel ? `max ${skill.maxLevel}` : "");
    setTextByName(root, "staReqLev", skill?.requireLevel || "");
    setTextByName(root, "staUseCost", skill?.useCost || "");
    setTextByName(root, "staSkillDesc", skill?.content || "");
    setTextByName(root, "staCatyCost", skill?.updateCostBase || "");
    setTextByName(root, "staDaZhaoNum", skill?.acts || "");
    setTextByName(root, "staMyMerit", "");
    setTextByName(root, "staUpLevTips", skill ? skillReviewedMeta(skill) : "");
  }

  if (page.name === "Task") {
    clearCollectionSamplesByName(root, "listTask");
    clearCollectionSamplesByName(root, "listRewardGold");
    clearCollectionSamplesByName(root, "listRewardItem");
    setTextByName(root, "staTaskContent", "");
    setTextByName(root, "staTargetDesc", "");
  }

  if (page.name === "LaberMaket") {
    clearCollectionSamplesByName(root, "GridLaber");
    setVisibleByNames(root, ["pnlTimeSelect", "PnlWorking", "imgItem"], false);
    setTextsByNames(root, [
      "staItemTitle",
      "staLevNum",
      "staGoldNum",
      "staSkillNum",
      "staItemTip",
      "staTellLead",
    ]);
  }

  if (page.name === "SaleGoods") {
    clearCollectionsByNames(root, ["LstGoods", "LstMyGoods"]);
    setVisibleByNames(root, ["PnlMyGoodsCard", "PnlRichRank", "ImgRankChange"], false);
    setVisibleByNames(root, ["PnlGoodsCard"], true);
    setTextsByNames(root, [
      "StaAssest",
      "StaCash",
      "StaGoods",
      "StaTime",
      "StaMyRank",
      "RollStaInfo",
    ]);
  }

  if (page.name === "PKCenter") {
    clearCollectionSamplesByName(root, "listPKTeams");
    setTextByName(root, "edtSearchName", "");
  }

  if (page.name === "Relation") {
    setVisibleByNames(root, [
      "PanelMaster",
      "PanelSlave",
      "PanelNoMS",
      "PanelPartner",
      "PanelNoPartner",
      "PanelEnemy",
      "PanelNoEnemy",
      "PanelFriend",
      "PanelNoFriend",
      "ButtonFindFriend",
      "ButtonPartner",
      "ButtonDivorce",
    ], false);
  }

  if (page.name === "ExamMgr") {
    setTextsByNames(root, [
      "Sta_point",
      "Sta_MoneyNum",
      "Sta_title",
      "Sta_AnwserA",
      "Sta_AnwserB",
      "Sta_AnwserC",
      "Sta_QuestionNum",
      "StaDoubleScore",
      "StaQuationNum",
      "Sta_FirstStar",
      "Sta_FirstName",
      "Sta_FirstScoreNum",
      "Sta_FirstStarMoney",
      "Sta_Second",
      "Sta_SecondPlayer",
      "Sta_SecondScore",
      "Sta_SecondStarMoney",
      "Sta_AwardInfo",
      "Sta_DoublePNum",
      "Sta",
    ]);
    setVisibleByNames(root, ["Check_A", "Check_B", "Check_C", "Check_Double", "Btn_Plus"], false);
  }

  if (page.name === "CraftShop") {
    clearCollectionsByNames(root, [
      "listTab",
      "listCraft",
      "listCraftEffect",
      "listMergeReq",
      "listQuality",
    ]);
    setTextsByNames(root, [
      "staCraftName",
      "staDesc1",
      "staDesc2",
      "staDesc3",
      "staCostGold",
      "staCostYuanBao",
      "staCostGoldAll",
    ]);
    setVisibleByNames(root, ["imgCraft", "btnWithGold", "btnWithYuanBao", "btnWithGoldAll"], false);
  }

  if (page.name === "FightRoad") {
    setTextsByNames(root, ["staWarLeftNum", "staProgress"]);
    setPreviewValueByName(root, "prgGroup", 0);
  }

  if (page.name === "DungeonTeam") {
    const reviewedDetail = reviewedDungeonDetail();
    clearCollectionSamplesByName(root, "listDropItem");
    setTextByName(root, "staGoldMerit", dungeonRewardLabel(reviewedDetail) || "奖励/掉落待继续确认");
    setAttrByName(root, "imgMonster", "Visible", "0");
    setAttrByName(root, "btnFightCD", "Visible", "0");
  }

  if (page.name === "BattleEnd") {
    clearCollectionSamplesByName(root, "listReward");
  }

  if (page.name === "ProRecruit") {
    clearCollectionSamplesByName(root, "GridGenerals");
    setTextByName(root, "staProcess", `刷新次数 ${recruit.refreshCount || 0}`);
  }

  if (page.name === "Recruit") {
    const detail = reviewedPartnerDetail(selectedCandidate);
    const displayName = detail?.displayName || selectedCandidate?.displayName || "";
    const proText = [selectedCandidate?.professionName || "", detail?.quality ? `quality: ${detail.quality}` : ""]
      .filter(Boolean)
      .join(" / ");
    const costText = detail?.costNum ? `${detail.costNum}${detail.costType ? ` ${detail.costType}` : ""}` : "";
    setTextByName(root, "staNameText", displayName);
    setTextByName(root, "staProText", proText);
    setTextByName(root, "staNumText", selectedCandidate?.tplId ? String(selectedCandidate.tplId) : "");
    setTextByName(root, "staRecruitCost", costText);
  }

  if (page.name === "RecruitRes") {
    const result = recruit.lastResult;
    const detail = reviewedPartnerDetail(result);
    const meta = partnerReviewedMeta(detail);
    setTextByName(
      root,
      "staRes",
      result
        ? `招募完成：${detail?.displayName || result.displayName}${result.professionName ? `（${result.professionName}）` : ""}${meta ? ` / ${meta}` : ""}`
        : "",
    );
  }

  if (page.name === "PartnersWarehouse") {
    clearCollectionSamplesByName(root, "LstRoleInfo");
    setTextByName(root, "StaPartnerNum", String(recruit.partners?.length || 0));
  }

  if (page.name === "TansferTip") {
    setTextByName(root, "StaJob", targetProfession?.name || "");
    setTextByName(root, "staJobDes", "");
    setTextByName(root, "staLvlNum", "");
    setTextByName(root, "staSexNum", "");
  }

  if (page.name === "TranSferConfirm") {
    setTextByName(root, "staTar", targetProfession ? `确认转职为${targetProfession.name}` : "");
    setTextByName(root, "staMoney", "");
  }

  return page;
}

function setVisualByName(root, name, visual) {
  walkNodes(root, (node) => {
    if (node.attrs?.Name === name) {
      node.animation = visual;
    }
  });
}

function setVisualByOwnerAndName(root, ownerPage, name, visual) {
  walkNodes(root, (node) => {
    if (node.ownerPage === ownerPage && node.attrs?.Name === name) {
      node.animation = visual;
    }
  });
}

function setAttrByName(root, name, attr, value) {
  walkNodes(root, (node) => {
    if (node.attrs?.Name === name) {
      node.attrs = { ...(node.attrs || {}), [attr]: value };
    }
  });
}

function setAttrByOwnerAndName(root, ownerPage, name, attr, value) {
  walkNodes(root, (node) => {
    if (node.ownerPage === ownerPage && node.attrs?.Name === name) {
      node.attrs = { ...(node.attrs || {}), [attr]: value };
    }
  });
}

function setPreviewValueByName(root, name, value) {
  walkNodes(root, (node) => {
    if (node.attrs?.Name === name) {
      node.previewValue = value;
    }
  });
}

function runtimeSeedItem(itemId) {
  return runtimeSeed.items?.[String(itemId)] || null;
}

function confirmedRookieEquipmentItem(state = runtimeState()) {
  const known = runtimeSeedItem(1002);
  if (!known) return null;
  const inventoryItem = state?.inventory_state?.items?.find((entry) => Number(entry.itemId) === known.id);
  if (inventoryItem) return { ...known, ...inventoryItem };
  return known.evidenceStatus === "confirmedLocal" ? known : null;
}

function applyShellUserVisuals(root, player) {
  if (!playMode) return;
  const headKey = `${player?.professionId || 1000}:${player?.sex || 1}`;
  const headVisual = CONFIRMED_SHELL_HEAD_VISUALS[headKey];
  if (headVisual) {
    setVisualByOwnerAndName(root, "ShellUser", "imgHead", headVisual);
    setAttrByOwnerAndName(root, "ShellUser", "imgHead", "Visible", "1");
  } else if (!debugPlaceholders) {
    setAttrByOwnerAndName(root, "ShellUser", "imgHead", "Visible", "0");
  }
  if (!debugPlaceholders) {
    setAttrByOwnerAndName(root, "ShellUser", "imgCareer", "Visible", "0");
  }
}

function setSceneVisual(root, visual) {
  if (!visual) return;
  walkNodes(root, (node) => {
    if (node.tag === "Scene") {
      node.scene = visual;
      node.attrs = { ...(node.attrs || {}), "data-scene-key": visual.raw || visual.key || "" };
    }
  });
}

function cityInSceneKey(step) {
  const cityId = Number(step?.cityId);
  if (!Number.isFinite(cityId)) return "";
  return `cityIn:${cityId}`;
}

function inheritedSceneKeyForStep(step) {
  const sceneKey = step?.sceneKey || "";
  if (sceneKey && flowData.mapVisuals?.[sceneKey]) return sceneKey;

  const flow = currentFlow();
  if (flow?.steps?.length) {
    const index = flow.steps.indexOf(step);
    const startIndex = index >= 0 ? index - 1 : activeFlowStepIndex - 1;
    for (let i = startIndex; i >= 0; i -= 1) {
      const candidate = flow.steps[i]?.sceneKey || "";
      if (candidate && flowData.mapVisuals?.[candidate]) return candidate;
    }
  }

  const citySceneKey = cityInSceneKey(step);
  if (citySceneKey && flowData.mapVisuals?.[citySceneKey]) return citySceneKey;
  return "cityIn:6";
}

function mapVisualForStep(step) {
  const sceneKey = inheritedSceneKeyForStep(step);
  return flowData.mapVisuals?.[sceneKey] || flowData.mapVisuals?.["cityIn:6"] || null;
}

function shouldShowShellReturn(step) {
  return (
    step?.actionKind === "return_button" ||
    step?.renderTag === "CDlgShell:Button:btnReturn" ||
    String(step?.sceneKey || "").startsWith("fieldMonster:")
  );
}

function applyRookieShellVisibility(root, step) {
  setAttrByName(root, "pnlMenu", "Visible", "0");
  setAttrByName(root, "btnChangeMonster", "Visible", "0");
  setAttrByName(root, "btnOneKeySD", "Visible", "0");
  setAttrByName(root, "pnlLeftTop", "Visible", "0");
  setAttrByName(root, "btnTaskHide", "Visible", "0");
  setAttrByName(root, "btnTaskShow", "Visible", "0");
  setAttrByName(root, "pnlTask", "Visible", "0");
  setAttrByName(root, "btnReturn", "Visible", shouldShowShellReturn(step) ? "1" : "0");
}

function actionForNode(node) {
  const name = node.attrs?.Name;
  const owner = node.ownerPage;
  if (!name || !owner) return null;
  return actionData.actionsByOwner?.[owner]?.[name] || null;
}

function actionLabel(action) {
  if (!action) return "";
  if (action.type === "open") return `${action.ownerPage}.${action.controlName} -> ${action.target}`;
  if (action.type === "close") return `${action.ownerPage}.${action.controlName} -> close`;
  return `${action.ownerPage}.${action.controlName}`;
}

function actionsForPage(pageName) {
  return Object.values(actionData.actionsByOwner?.[pageName] || {});
}

function executeAction(action) {
  if (!action) return;

  if (action.type === "open" && action.target) {
    if (pageByName(action.target)) {
      if (activePageName && activePageName !== action.target) {
        navigationStack.push({ page: activePageName });
      }
      actionStatus = actionLabel(action);
      setPage(action.target);
    }
    return;
  }

  if (action.type === "close") {
    const previous = navigationStack.pop();
    actionStatus = actionLabel(action);
    if (previous?.page && pageByName(previous.page)) {
      setPage(previous.page, { fromActionClose: true });
    } else {
      renderPage(pageByName(activePageName) || pageByName(pageNameFromLocation()));
      updateFlowControls();
    }
  }
}

function ownerFromRenderTag(renderTag) {
  const className = String(renderTag || "").split(":")[0];
  return {
    CDlgShell: "Shell",
    CGameMapMgr: "RookieField",
    CDlgRookieNpc: "RookieNpc",
    CDlgPlayerInfo: "PlayerInfo",
    CDlgEquipList: "EquipList",
    CDlgDungeonTeam: "DungeonTeam",
    CDlgBattle: "Battle",
    CDlgBattleEnd: "BattleEnd",
  }[className] || "";
}

function controlFromRenderTag(renderTag) {
  const parts = String(renderTag || "").split(":");
  return parts.length >= 3 ? parts[2] : "";
}

function cssEscape(value) {
  return String(value || "").replace(/["\\]/g, "\\$&");
}

function stagePointFromEvent(event) {
  const rect = stage.getBoundingClientRect();
  const scaleX = data.stage.width / rect.width;
  const scaleY = data.stage.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function rectForRenderedNode(ownerPage, name = "") {
  if (!ownerPage) return null;
  const ownerSelector = `[data-owner-page="${cssEscape(ownerPage)}"]`;
  const nameSelector = name ? `[data-name="${cssEscape(name)}"]` : "";
  const el = stage.querySelector(`.node${ownerSelector}${nameSelector}`);
  if (!el) return null;

  const stageRect = stage.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  const scaleX = data.stage.width / stageRect.width;
  const scaleY = data.stage.height / stageRect.height;
  return {
    left: (rect.left - stageRect.left) * scaleX,
    top: (rect.top - stageRect.top) * scaleY,
    width: rect.width * scaleX,
    height: rect.height * scaleY,
  };
}

function implicitGuideTarget(step) {
  if (activePageName === "DungeonTeam" && isDungeonTeamPlayStep(step)) {
    const rect = rectForRenderedNode("DungeonTeam", "btnFight");
    if (rect) {
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        source: "DungeonTeam.btnFight",
      };
    }
  }
  return null;
}

function explicitRookieControlTargetName(step) {
  if (!isRookiePlay() || !step || step.type !== "op") return "";
  const page = step.page || activePageName;
  const text = cleanFlowText(step.content);
  const event = step.toggleEvt || "";

  if (page === "FightRoad") return "btnNext";
  if (page === "Skill") {
    if (event === "index_skill_index") return "listStrengSkill";
    if (event === "index_skill_upgrade" || text.includes("关闭")) return "btnClose";
  }
  if (page === "LaberMaket") {
    if (event === "city_job_index") return "GridLaber";
    if (event === "city_job_start" || text.includes("关闭")) return "btnClose";
  }
  if (page === "SaleGoods" && text.includes("关闭")) return "BtnClose";
  if (page === "Task") {
    if (text.includes("领取")) return "btnAcceptReward";
    if (text.includes("关闭")) return "btnClose";
  }
  if (page === "Gather") {
    if (event === "go2gather") return "btnQuickGather";
    if (text.includes("回到") || text.includes("返回")) return "btnClose";
  }
  if (page === "PKCenter" && text.includes("返回")) return "btnReturn";
  if (page === "Tongjiling") {
    if (text.includes("发布")) return "BtnFabu";
    if (text.includes("返回")) return "BtnReturn";
  }
  if (page === "AnouceTongji" && text.includes("关闭")) return "Btnexit";
  if (page === "ExamMgr" && text.includes("返回")) return "Btn_Return";
  if (page === "CraftShop" && text.includes("关闭")) return "btnClose";
  return "";
}

function explicitRookieControlTarget(step) {
  const control = explicitRookieControlTargetName(step);
  const owner = step?.page || activePageName;
  const rect = control ? rectForRenderedNode(owner, control) : null;
  if (!rect) return null;
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
    source: `rookie-control:${control}`,
  };
}

function guideTargets(step) {
  if (!step) return [];

  const implicitTarget = implicitGuideTarget(step);
  const explicitTarget = explicitRookieControlTarget(step);
  if (!Number(step.x) && !Number(step.y)) {
    return [explicitTarget, implicitTarget].filter(Boolean);
  }

  const targets = [{ x: Number(step.x), y: Number(step.y), source: "stage" }];
  const owner = ownerFromRenderTag(step.renderTag) || step.page;
  const control = controlFromRenderTag(step.renderTag);
  const controlRect = control ? rectForRenderedNode(owner, control) : null;
  if (controlRect) {
    targets.unshift({
      x: controlRect.left + Number(step.x),
      y: controlRect.top + Number(step.y),
      source: "control",
    });
  }

  const pageRect = rectForRenderedNode(step.page);
  if (pageRect && (Math.abs(pageRect.left) > 1 || Math.abs(pageRect.top) > 1)) {
    targets.unshift({
      x: pageRect.left + Number(step.x),
      y: pageRect.top + Number(step.y),
      source: "page",
    });
  }

  if (implicitTarget) {
    targets.unshift(implicitTarget);
  }
  if (explicitTarget) {
    targets.unshift(explicitTarget);
  }

  return targets.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

function primaryGuideTarget(step) {
  return guideTargets(step)[0] || { x: step?.x || 480, y: step?.y || 320 };
}

function guideClickRadius(step) {
  if (controlFromRenderTag(step?.renderTag)) return 90;
  if (step?.page && step.page !== "RookieField") return 82;
  return 66;
}

function isGuideClick(event, step) {
  if (!step || (!Number(step.x) && !Number(step.y))) return false;
  const point = stagePointFromEvent(event);
  const radius = guideClickRadius(step);
  return guideTargets(step).some((target) => {
    const dx = point.x - target.x;
    const dy = point.y - target.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  });
}

function advancePlayStep() {
  if (!isRookiePlay()) return;
  runtime?.applyRookieStep?.(currentFlowStep());
  setFlowStep(PLAY_FLOW_NAME, activeFlowStepIndex + 1);
}

function runPlayStepAction(step) {
  if (!isRookiePlay() || !step) return;

  if (isDungeonTeamPlayStep(step) && activePageName === "DungeonTeam") {
    startPlayBattle();
    return;
  }

  if (flowActionKind(step) === "map_dungeon_team_event" && pageByName("DungeonTeam")) {
    actionStatus = `${step.toggleEvt || "city_dungeon_team"} -> DungeonTeam`;
    setPage("DungeonTeam", { fromFlow: true });
    return;
  }

  if (flowActionKind(step) === "field_monster_map_click" && pageByName("Battle")) {
    runtime?.startBattle?.({ kind: flowActionKind(step), step });
    actionStatus = `${step.toggleEvt || "field monster"} -> Battle`;
    setPage("Battle", { fromFlow: true, keepFlowStep: true, playRuntimePage: true });
    return;
  }

  advancePlayStep();
}

function startPlayBattle() {
  if (!isRookiePlay()) return;
  const step = currentFlowStep();
  const chain = dungeonChainForStep(step);
  runtime?.startBattle?.({ kind: flowActionKind(step), step, chain });
  actionStatus = `${chain?.chainKey || step?.toggleEvt || "RookieGuideInfo dungeon team"} -> Battle`;
  setPage("Battle", { fromFlow: true, keepFlowStep: true, playRuntimePage: true });
}

function showPlayBattleResult() {
  if (!playMode) return;
  runtime?.finishBattle?.();
  actionStatus = "Battle.btnResult -> BattleEnd";
  setPage("BattleEnd", { fromFlow: true, keepFlowStep: true, playRuntimePage: true });
}

function closePlayBattleResult() {
  if (!isRookiePlay()) return;
  const result = runtimeState()?.battle_result;
  const settlementIndex = result?.settlementEvent?.index;
  const flowSettlementIndex = flowIndexForGuideIndex(settlementIndex);
  const nextIndex = flowSettlementIndex >= 0 ? flowSettlementIndex + 1 : activeFlowStepIndex + 1;
  actionStatus = result?.chainKey
    ? `BattleEnd.btnClose -> ${result.chainKey} settlement next`
    : "BattleEnd.btnClose -> RookieGuideInfo next";
  setFlowStep(PLAY_FLOW_NAME, nextIndex);
}

function playActionForNode(node) {
  if (!playMode) return null;
  const owner = node.ownerPage;
  const name = node.attrs?.Name;
  const step = currentFlowStep();

  if (owner === "LoginSelServer" && name === "StaServerName") {
    return { label: "LoginSelServer.StaServerName -> LoginSelectServer", run: () => setRuntimePage("LoginSelectServer", "打开服务器列表") };
  }

  if (owner === "LoginSelServer" && name === "btnLogin") {
    return {
      label: "LoginSelServer.btnLogin -> offline login result -> CreateRole",
      run: () => {
        runtime?.offlineLogin?.();
        actionStatus = "离线登录结果 -> 创角";
        setPage("CreateRole");
      },
    };
  }

  if (owner === "LoginSelectServer" && name === "BtnClose") {
    return { label: "LoginSelectServer.BtnClose -> LoginSelServer", run: () => setRuntimePage("LoginSelServer", "关闭服务器列表") };
  }

  if (owner === "CreateRole" && name === "btnCreate") {
    return { label: "CreateRole.btnCreate -> RookieGuideInfo", run: startRookieFlow };
  }

  if (owner === "CreateRole" && name === "staGetNameRand") {
    return {
      label: "CreateRole.staGetNameRand -> confirmed random name",
      run: () => {
        runtime?.generateRoleName?.();
        setRuntimePage("CreateRole", "随机姓名");
      },
    };
  }

  const sexTarget = runtimeSeed.createRole?.sexControls?.[name];
  if (owner === "CreateRole" && sexTarget) {
    return {
      label: `CreateRole.${name} -> select sex ${sexTarget.sex}`,
      run: () => {
        runtime?.selectRoleSex?.(sexTarget.sex);
        setRuntimePage("CreateRole", sexTarget.sex === 1 ? "选择男性" : "选择女性");
      },
    };
  }

  if (owner === "ProTransfer" && name === "btnProRecruit") {
    return { label: "ProTransfer.btnProRecruit -> ProRecruit", run: () => setRuntimePage("ProRecruit", "打开武将刷新页") };
  }

  const transferTarget = runtimeSeed.transfer?.buttonTargets?.[name];
  if (owner === "ProTransfer" && transferTarget) {
    return {
      label: `ProTransfer.${name} -> TansferTip`,
      run: () => {
        runtime?.selectProfession?.(transferTarget.professionId, name);
        setRuntimePage("TansferTip", `选择职业 ${transferTarget.professionName}`);
      },
    };
  }

  if (owner === "TansferTip" && name === "btnTansfre") {
    return { label: "TansferTip.btnTansfre -> TransferFirstTip", run: () => setRuntimePage("TransferFirstTip", "首次转职提示") };
  }

  if (owner === "TansferTip" && name === "btnClose") {
    return { label: "TansferTip.btnClose -> ProTransfer", run: () => setRuntimePage("ProTransfer", "关闭转职提示") };
  }

  if (owner === "TransferFirstTip" && name === "btnConfirm") {
    return { label: "TransferFirstTip.btnConfirm -> TranSferConfirm", run: () => setRuntimePage("TranSferConfirm", "打开转职确认") };
  }

  if (owner === "TransferFirstTip" && name === "btnClose") {
    return { label: "TransferFirstTip.btnClose -> ProTransfer", run: () => setRuntimePage("ProTransfer", "关闭首次转职提示") };
  }

  if (owner === "TranSferConfirm" && name === "btnOK") {
    return {
      label: "TranSferConfirm.btnOK -> PlayerInfo",
      run: () => {
        runtime?.confirmProfession?.();
        setRuntimePage("PlayerInfo", "确认转职");
      },
    };
  }

  if (owner === "TranSferConfirm" && (name === "btnReset" || name === "btnClose")) {
    return { label: `TranSferConfirm.${name} -> ProTransfer`, run: () => setRuntimePage("ProTransfer", "取消转职确认") };
  }

  if (owner === "ProRecruit" && name === "btnChangePro") {
    return { label: "ProRecruit.btnChangePro -> ProTransfer", run: () => setRuntimePage("ProTransfer", "返回转职页") };
  }

  if (owner === "ProRecruit" && name === "btnReturn") {
    return { label: "ProRecruit.btnReturn -> ProTransfer", run: () => setRuntimePage("ProTransfer", "返回职业会所") };
  }

  if (owner === "ProRecruit" && name === "btnRefresh") {
    return {
      label: "ProRecruit.btnRefresh -> refresh slots",
      run: () => {
        runtime?.refreshRecruitPool?.();
        setRuntimePage("ProRecruit", "刷新武将槽位");
      },
    };
  }

  if (owner === "ProRecruit" && name === "GridGenerals") {
    return {
      label: "ProRecruit.GridGenerals -> Recruit",
      run: () => {
        runtime?.selectRecruitCandidate?.(0);
        setRuntimePage("Recruit", "选择武将槽位");
      },
    };
  }

  if (owner === "Recruit" && name === "btnRecruit") {
    return {
      label: "Recruit.btnRecruit -> RecruitRes",
      run: () => {
        runtime?.recruitGeneral?.();
        setRuntimePage("RecruitRes", "招募完成");
      },
    };
  }

  if (owner === "Recruit" && (name === "btnCanel" || name === "btnClose")) {
    return { label: `Recruit.${name} -> ProRecruit`, run: () => setRuntimePage("ProRecruit", "取消招募") };
  }

  if (owner === "RecruitRes" && (name === "btnOK" || name === "btnClose")) {
    return { label: `RecruitRes.${name} -> PartnersWarehouse`, run: () => setRuntimePage("PartnersWarehouse", "查看武将仓库") };
  }

  if (owner === "PartnersWarehouse" && name === "BtnClose") {
    return { label: "PartnersWarehouse.BtnClose -> ProRecruit", run: () => setRuntimePage("ProRecruit", "关闭武将仓库") };
  }

  if (isRookiePlay() && step?.type === "npc_dlg" && owner === "RookieNpc" && name === "staOpContent") {
    return { label: "RookieGuideInfo npc_dlg -> next", run: advancePlayStep };
  }

  if (
    isRookiePlay() &&
    activePageName === "DungeonTeam" &&
    owner === "DungeonTeam" &&
    name === "btnFight" &&
    isDungeonTeamPlayStep(step)
  ) {
    return { label: "DungeonTeam.btnFight -> Battle", run: startPlayBattle };
  }

  if (activePageName === "Battle" && owner === "Battle" && name === "btnResult") {
    return { label: "Battle.btnResult -> BattleEnd", run: showPlayBattleResult };
  }

  if (activePageName === "BattleEnd" && owner === "BattleEnd" && name === "btnClose") {
    return { label: "BattleEnd.btnClose -> RookieField", run: closePlayBattleResult };
  }

  return null;
}

function cleanFlowText(text) {
  return runtimeText(text)
    .replaceAll("$girl_boy", "少侠")
    .trim();
}

function setRuntimePage(pageName, status) {
  actionStatus = status || pageName;
  setPage(pageName, { fromFlow: true, playRuntimePage: true });
}

function preparePageForFlow(page, step) {
  const prepared = cloneData(page);
  if (playMode && (prepared.name === "RookieField" || prepared.name === "RookieStart")) {
    setSceneVisual(prepared.root, mapVisualForStep(step));
    applyRookieShellVisibility(prepared.root, step);
  }
  if (playMode && prepared.name === "EquipList") {
    setAttrByName(prepared.root, "StaNoEquipTips", "Visible", "0");
  }
  if (playMode && prepared.name === "DungeonTeam") {
    setAttrByName(prepared.root, "btnFightCD", "Visible", "0");
  }

  if (step && step.type === "npc_dlg" && prepared.name === "RookieStart") {
    setTextByName(prepared.root, "staNpcTalk", cleanFlowText(step.content));
    setTextByName(prepared.root, "staOpContent", cleanFlowText(step.opText));
    setTextByName(prepared.root, "staGetContent", cleanFlowText(step.getContent));

    const npcVisual = flowData.npcVisuals?.[step.npcImg];
    if (npcVisual) {
      setVisualByName(prepared.root, "imgNpc", npcVisual);
    }
  }

  return applyRuntimeToPage(prepared);
}

function mapBackdropPageForOverlay(pageName, step) {
  if (!playMode || pageName !== "FightRoad") return null;
  const fieldPage = pageByName("RookieField");
  if (!fieldPage) return null;
  const prepared = cloneData(fieldPage);
  setSceneVisual(prepared.root, mapVisualForStep(step));
  applyRookieShellVisibility(prepared.root, step);
  return applyRuntimeToPage(prepared);
}

function resolveAnchoredRect(rect, anchor) {
  if (!rect) return [0, 0, 0, 0];
  let [x, y, w, h] = rect;
  const code = String(anchor || "0");

  if (code === "8") return [480 + x, 320 + y, w, h];
  if (code === "1") return [480 + x, y, w, h];
  if (code === "2") return [960 + x, y, w, h];
  if (code === "3" || code === "4") return [960 + x, 640 + y, w, h];
  if (code === "5") return [480 + x, 640 + y, w, h];
  if (code === "6") return [x, 640 + y, w, h];

  return [x, y, w, h];
}

function applyRect(el, node, isRoot) {
  const attrs = node.attrs || {};
  let rect = node.rect;
  if (isRoot && (!rect || rect[2] === 0 || rect[3] === 0)) {
    rect = [0, 0, data.stage.width, data.stage.height];
  } else {
    rect = resolveAnchoredRect(rect, attrs.Anchor);
  }

  if (!rect) return;
  const [x, y, w, h] = rect;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
}

function fontSize(attrs) {
  return attrs.FontSize ? Number(attrs.FontSize) : 20;
}

function textColor(value) {
  return twui.textColor(value);
}

function alphaColor(value) {
  return twui.alphaColor(value);
}

function textOffset(attrs) {
  return twui.textOffset(attrs.TextOffset);
}

function backgroundMode(visual, tag) {
  return twui.backgroundDrawMode(visual, tag);
}

function addNineSlice(parent, frames) {
  if (frames.length < 9) return false;

  const leftWidth = frames[0].width;
  const rightWidth = frames[2].width;
  const topHeight = frames[0].height;
  const bottomHeight = frames[6].height;
  const repeatByIndex = [
    "no-repeat",
    "repeat-x",
    "no-repeat",
    "repeat-y",
    "repeat",
    "repeat-y",
    "no-repeat",
    "repeat-x",
    "no-repeat",
  ];

  const grid = document.createElement("div");
  grid.className = "nine-slice";
  grid.style.gridTemplateColumns = `${leftWidth}px minmax(0, 1fr) ${rightWidth}px`;
  grid.style.gridTemplateRows = `${topHeight}px minmax(0, 1fr) ${bottomHeight}px`;

  frames.slice(0, 9).forEach((frame, index) => {
    const cell = document.createElement("div");
    cell.style.backgroundImage = `url("${frame.url}")`;
    cell.style.backgroundRepeat = repeatByIndex[index];
    cell.style.backgroundSize = `${frame.width}px ${frame.height}px`;
    grid.appendChild(cell);
  });

  parent.appendChild(grid);
  return true;
}

function addAsset(parent, visual, mode, tag) {
  const frames = visual?.frames || [];
  if (!frames.length) return;

  if (mode === "nine-slice" && addNineSlice(parent, frames)) {
    return;
  }

  if (mode === "repeat-x" && frames.length === 1) {
    parent.style.backgroundImage = `url("${frames[0].url}")`;
    parent.style.backgroundRepeat = "repeat-x";
    parent.style.backgroundPosition = "left top";
    parent.style.backgroundSize = `${frames[0].width}px ${frames[0].height}px`;
    return;
  }

  const image = document.createElement("img");
  image.className = `asset ${mode === "fill" ? "asset-fill" : "asset-center"}`;
  image.src = frames[0].url;
  image.dataset.assetKey = visual.key || visual.raw || "";
  image.dataset.frameCount = String(frames.length);
  image.dataset.frameUrls = frames.map((frame) => frame.url).join("|");
  image.dataset.animated = twui.shouldAnimateFrames(visual, tag) ? "1" : "0";
  image.draggable = false;

  if (mode !== "fill") {
    image.style.width = `${frames[0].width}px`;
    image.style.height = `${frames[0].height}px`;
  }

  parent.appendChild(image);

  if (image.dataset.animated === "1") {
    let index = 0;
    const interval = window.setInterval(() => {
      index = (index + 1) % frames.length;
      image.src = frames[index].url;
      if (mode !== "fill") {
        image.style.width = `${frames[index].width}px`;
        image.style.height = `${frames[index].height}px`;
      }
    }, visual.serialTime || 200);
    intervals.push(interval);
  }
}

function addProgress(parent, visual) {
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.width = `${Number(parent.dataset.previewValue || 65)}%`;
  addAsset(fill, visual, backgroundMode(visual, "Image"), "Image");
  parent.appendChild(fill);
}

function itemSize(node) {
  const attrs = node.attrs || {};
  const rect = node.rect || [0, 0, 0, 0];
  const sample = node.sampleItems?.[0];
  const sampleRect = sample?.rect || [0, 0, 0, 0];
  const size = node.sampleItemSize || [];
  return [
    Number(attrs.ItemWidth) || size[0] || sampleRect[2] || rect[2] || 90,
    Number(attrs.ItemHeight) || size[1] || sampleRect[3] || 32,
  ];
}

function renderCollectionSamples(parent, node) {
  if (node.tag !== "List" && node.tag !== "Grid") return;
  const attrs = node.attrs || {};
  const samples = node.sampleItems || [];
  const count = samples.length || node.sampleItemCount || 0;
  if (!count) return;

  const [width, height] = [
    Number.parseFloat(parent.style.width) || node.rect?.[2] || 0,
    Number.parseFloat(parent.style.height) || node.rect?.[3] || 0,
  ];
  const [cellWidth, cellHeight] = itemSize(node);
  const lineItem =
    Number(attrs.LineItem) || (node.tag === "Grid" ? Math.max(1, Math.floor(width / cellWidth)) : 1);
  const spaceX = Number(attrs.ItemSpace) || 0;
  const spaceY = Number(attrs.ItemSpaceV) || (lineItem === 1 ? spaceX : 0);
  const columns = Math.max(1, lineItem);

  for (let index = 0; index < count; index += 1) {
    const x = (index % columns) * (cellWidth + spaceX);
    const y = Math.floor(index / columns) * (cellHeight + spaceY);
    if (x >= width || y >= height) break;

    const cell = document.createElement("div");
    cell.className = `list-sample-cell${index === 0 ? " is-selected" : ""}`;
    cell.style.left = `${x}px`;
    cell.style.top = `${y}px`;
    cell.style.width = `${cellWidth}px`;
    cell.style.height = `${cellHeight}px`;

    const cellVisual = index === 0 ? node.selectBackground || node.itemBackground : node.itemBackground;
    if (cellVisual) {
      addAsset(cell, cellVisual, backgroundMode(cellVisual, "Image"), "Image");
    }

    if (samples[index]) {
      renderNode(samples[index], cell, true);
    }

    parent.appendChild(cell);
  }
}

function addText(parent, node) {
  const text = runtimeText(node.text);
  if (!text) return;

  const attrs = node.attrs || {};
  const width = Number.parseFloat(parent.style.width) || node.rect?.[2] || 0;
  const height = Number.parseFloat(parent.style.height) || node.rect?.[3] || 0;
  const isButtonText = node.tag === "Button" || node.tag === "Check";
  const options = {
    defaultAlignH: isButtonText ? 2 : 0,
    defaultAlignV: isButtonText ? 2 : 0,
    multiline: node.tag === "RollStatic" || Boolean(attrs.Rich) || text.includes("\n"),
    position: false,
    canvasBleed: node.tag === "Edit" ? 0 : undefined,
  };

  if (attrs.ShowType === "2") {
    options.shadow = {
      color: textColor(attrs.SecondColor) || "#9c9c9c",
      x: 1,
      y: 1,
      blur: 0,
    };
  }

  const spec = twui.textSpecFromNode(node, [0, 0, width, height]);
  spec.fontSize = fontSize(attrs);
  spec.lineHeight = attrs.LineInterval ? Number(attrs.LineInterval) : undefined;
  spec.text = text;
  twui.applyTextControl(parent, spec, options);
}

function renderNode(node, parent, isRoot = false) {
  const el = document.createElement("div");
  el.className = `node tag-${node.tag}`;
  if (node.attrs?.Name) {
    el.dataset.name = node.attrs.Name;
  }
  if (node.ownerPage) {
    el.dataset.ownerPage = node.ownerPage;
  }
  applyRect(el, node, isRoot);

  if (node.attrs?.Visible === "0") {
    el.hidden = true;
  }
  if (node.previewValue !== undefined) {
    el.dataset.previewValue = String(node.previewValue);
  }

  if (node.attrs?.BackColor) {
    el.style.backgroundColor = alphaColor(node.attrs.BackColor);
  }

  const rect = node.rect || [0, 0, 0, 0];
  const hasVisual =
    node.animation ||
    node.background ||
    node.scene ||
    node.selectBackground ||
    node.itemBackground ||
    node.progressImage;
  if (!hasVisual && (node.attrs?.WireFrame === "1" || rect[2] > 0 || rect[3] > 0)) {
    el.classList.add("placeholder");
  }

  const playAction = playActionForNode(node);
  const action = playAction ? null : actionForNode(node);
  if (playAction) {
    el.classList.add("has-action", "play-action");
    el.title = playAction.label;
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      playAction.run();
    });
  } else if (action) {
    el.classList.add("has-action");
    el.title = actionLabel(action);
    el.addEventListener("click", (event) => {
      event.stopPropagation();
      executeAction(action);
    });
  }

  if (node.background) {
    addAsset(el, node.background, backgroundMode(node.background, node.tag), node.tag);
  }
  if (node.scene) {
    addAsset(el, node.scene, node.scene.drawMode || "center", node.tag);
  }
  if (node.animation) {
    addAsset(el, node.animation, node.animation.drawMode || "center", node.tag);
  }
  if (node.progressImage) {
    addProgress(el, node.progressImage);
  }
  renderCollectionSamples(el, node);
  addText(el, node);

  for (const child of node.children || []) {
    renderNode(child, el);
  }

  parent.appendChild(el);
}

function removeFlowOverlay() {
  stage.querySelectorAll(".flow-tip, .flow-marker").forEach((node) => node.remove());
}

function renderFlowOverlay(step) {
  removeFlowOverlay();
  if (!showGuideOverlay) return;
  if (!step || step.type !== "op" || !step.content) return;

  const text = cleanFlowText(step.content).trim();
  if (!text) return;

  const markerPoint = primaryGuideTarget(step);
  const markerX = markerPoint.x || 480;
  const markerY = markerPoint.y || 320;
  if (guideTargets(step).length) {
    const marker = document.createElement("div");
    marker.className = "flow-marker";
    marker.style.left = `${markerX}px`;
    marker.style.top = `${markerY}px`;
    stage.appendChild(marker);
  }

  const tip = document.createElement("div");
  tip.className = "flow-tip";
  tip.textContent = text;
  tip.style.left = `${Math.min(620, Math.max(12, markerX + 22))}px`;
  tip.style.top = `${Math.min(575, Math.max(12, markerY + 22))}px`;
  stage.appendChild(tip);
}

function addPlayHotspot(step) {
  if (!step || step.type !== "op" || !cleanFlowText(step.content)) return;
  const targets = guideTargets(step);
  if (!targets.length) return;

  const point = targets[0];
  const size = guideClickRadius(step) * 2;
  const source = point.source || "";
  const label = "点";
  const left = Math.min(Math.max(0, point.x - size / 2), Math.max(0, data.stage.width - size));
  const top = Math.min(Math.max(0, point.y - size / 2), Math.max(0, data.stage.height - size));
  const hotspot = document.createElement("button");
  hotspot.type = "button";
  hotspot.className = `play-hotspot ${source === "stage" ? "is-coordinate" : "is-control-target"}`;
  hotspot.dataset.targetSource = source;
  hotspot.style.left = `${left}px`;
  hotspot.style.top = `${top}px`;
  hotspot.style.width = `${size}px`;
  hotspot.style.height = `${size}px`;
  hotspot.title = cleanFlowText(step.content);
  hotspot.setAttribute("aria-label", cleanFlowText(step.content));
  hotspot.innerHTML = `<span>${label}</span>`;
  hotspot.addEventListener("click", (event) => {
    event.stopPropagation();
    runPlayStepAction(step);
  });
  stage.appendChild(hotspot);
}

function addDungeonTeamFixture() {
  const monsterRect = rectForRenderedNode("DungeonTeam", "imgMonster");
  if (!monsterRect) return;
  const detail = reviewedDungeonDetail();

  const monster = document.createElement("div");
  monster.className = `play-dungeon-monster ${detail ? "play-reviewed-dungeon" : "play-unconfirmed-monster"}`;
  if (detail) {
    const title = detail.monsterName || detail.name || "reviewed dungeon";
    const meta = [
      detail.templateId,
      detail.matchKey ? `${detail.matchKey}=${detail.matchValue}` : "",
      detail.monsterTeamId ? `monster_team_id=${detail.monsterTeamId}` : "",
    ].filter(Boolean);
    monster.innerHTML = `<strong>${escapeHtml(title)}</strong><small>${escapeHtml(meta.join(" / "))}</small>`;
  } else {
    monster.textContent = "怪物图待确认";
  }
  monster.style.left = `${monsterRect.left + 22}px`;
  monster.style.top = `${monsterRect.top + 46}px`;
  stage.appendChild(monster);

  if (detail) {
    addStageEvidencePanel(
      "reviewed dungeon data",
      [
        `${detail.templateId} row ${detail.rowNumber ?? ""}`.trim(),
        detail.evidenceStatus ? `status: ${detail.evidenceStatus}` : "",
        detail.name ? `name: ${detail.name}` : "",
        detail.monsterImage ? `monster_image_url: ${detail.monsterImage}` : "",
        dungeonRewardLabel(detail),
        "displayed only because reviewed=1 and identity key matched",
      ],
      { right: 24, top: 102, width: 320, className: "runtime-reviewed-dungeon-evidence" },
    );
  }
}

function addRookieMapTarget(step) {
  if (activePageName !== "RookieField") return;
  if (!step || step.page !== "RookieField" || step.renderTag !== "CGameMapMgr") return;
  const text = cleanFlowText(step.content);
  if (!text.includes("怪") && !text.includes("骂她")) return;

  const point = primaryGuideTarget(step);
  const target = document.createElement("button");
  target.type = "button";
  target.className = "play-map-target";
  target.style.left = `${point.x - 56}px`;
  target.style.top = `${point.y - 72}px`;
  target.title = text;
  target.innerHTML = "<span>?</span>";
  target.addEventListener("click", (event) => {
    event.stopPropagation();
    runPlayStepAction(step);
  });
  stage.appendChild(target);
}

function addFieldMonsterSlotLayer(step) {
  if (!showGuideOverlay || activePageName !== "RookieField" || !isFieldMonsterPlayStep(step)) return;
  const slots = runtimeSeed.fieldMonster?.slots || [];
  if (!slots.length) return;

  const nearest = nearestFieldMonsterSlot(step);
  const detail = reviewedFieldMonsterDetail(step);
  for (const slot of slots) {
    const marker = document.createElement("div");
    const isCurrent = nearest?.index === slot.index;
    marker.className = `field-monster-slot${isCurrent ? " is-current" : ""}${isCurrent && detail ? " is-reviewed" : ""}`;
    marker.style.left = `${slot.x}px`;
    marker.style.top = `${slot.y}px`;
    marker.innerHTML = `<span>${escapeHtml(isCurrent && detail ? reviewedBattleTitle(detail) : slot.label || `slot ${slot.desc}`)}</span>`;
    marker.title = isCurrent && detail
      ? `reviewed fieldmonster: ${reviewedBattleMeta(detail)}`
      : `${slot.source}: ${slot.label || slot.desc}; monster/drops unresolved`;
    stage.appendChild(marker);
  }

  addStageEvidencePanel(
    "FieldMonsterPos.csv",
    [
      `slots: ${slots.length}`,
      "slot coordinates confirmed locally",
      detail ? `reviewed: ${reviewedBattleTitle(detail)}` : "monster species/drops/rewards unresolved",
      detail ? reviewedBattleMeta(detail) : "",
    ],
    { left: 18, top: 82, width: 250, className: "runtime-field-monster-evidence" },
  );
}

function addStageEvidencePanel(title, lines, options = {}) {
  const rows = (lines || []).filter(Boolean);
  if (!rows.length) return null;

  const panel = document.createElement("section");
  panel.className = `runtime-evidence-panel ${options.className || ""}`.trim();
  if (options.left !== undefined) panel.style.left = `${options.left}px`;
  if (options.right !== undefined) panel.style.right = `${options.right}px`;
  if (options.top !== undefined) panel.style.top = `${options.top}px`;
  if (options.bottom !== undefined) panel.style.bottom = `${options.bottom}px`;
  if (options.width !== undefined) panel.style.width = `${options.width}px`;

  const titleNode = document.createElement("div");
  titleNode.className = "runtime-evidence-title";
  titleNode.textContent = title;
  panel.appendChild(titleNode);

  const list = document.createElement("ul");
  list.className = "runtime-evidence-list";
  rows.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    list.appendChild(item);
  });
  panel.appendChild(list);
  stage.appendChild(panel);
  return panel;
}

function addReviewedMasterDataEvidenceLayer() {
  if (!debugPlaceholders) return;

  const summary = runtime?.reviewedMasterDataSummary?.() || reviewedMasterData.summary || {};
  const templates = reviewedMasterData.templates || [];
  const enabled = runtime?.reviewedDataEnabled?.() || reviewedMode;
  const accepted = Number(summary.acceptedRows || 0);
  const rejected = Number(summary.rejectedRows || 0);
  const templateIds = summary.templateIds || templates.map((template) => template.id);
  const templateLines = templates.slice(0, 8).map((template) => {
    const rowSummary = template.summary || {};
    return `${template.id}: ${rowSummary.accepted || 0} accepted / ${rowSummary.rejected || 0} rejected`;
  });
  if (templateIds.length > templateLines.length) templateLines.push(`+${templateIds.length - templateLines.length} more templates`);

  addStageEvidencePanel(
    "reviewed master-data",
    [
      `reviewed mode: ${enabled ? "on" : "off"}`,
      `templates: ${summary.templateCount ?? templateIds.length}`,
      `accepted rows: ${accepted}`,
      `rejected rows: ${rejected}`,
      "read-only reviewed index",
      "not merged into APK runtime seed",
      ...templateLines,
    ],
    { left: 18, bottom: 18, width: 310, className: "runtime-reviewed-evidence" },
  );
}

function equipmentCard(item, options = {}) {
  const detail = reviewedItemDetail(item);
  const itemId = item.itemId || item.id;
  const displayName = detail?.displayName || item.name;
  const meta = itemReviewedMeta(detail) || item.evidenceStatus || item.source || "confirmedLocal";
  const button = document.createElement("button");
  button.type = "button";
  button.className = `runtime-equipment-card${item.equipped ? " is-equipped" : ""}${detail ? " is-reviewed" : ""}`;
  button.innerHTML = `
    <span class="runtime-equipment-id">${escapeHtml(itemId)}</span>
    <strong>${escapeHtml(displayName)}</strong>
    <small>${escapeHtml(meta)}</small>
  `;
  if (options.interactive === false) {
    button.disabled = true;
    button.classList.add("is-static");
    return button;
  }
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    runtime?.equipItem?.(itemId);
    if (options.advanceFlow) {
      advancePlayStep();
      return;
    }
    setRuntimePage(options.afterPage || "PlayerInfo", `穿戴 ${item.name}`);
  });
  return button;
}

function prisonHotspotLabel(hotspot) {
  if (!hotspot) return "";
  if (hotspot.hotspotKind === "prisonerSlot") return `囚犯位 ${hotspot.nId + 1}`;
  if (hotspot.hotspotKind === "oldManOverlay") return `老者 ${hotspot.nId - 5}`;
  return {
    gotoLabor: "去劳作",
    pageLeft: "上一页",
    pageRight: "下一页",
    prisonOut: "我要出去",
    search: "搜索",
  }[hotspot.hotspotKind] || hotspot.strName || "";
}

function prisonHotspotAction(hotspot) {
  if (!hotspot) return null;
  if (hotspot.hotspotKind === "search") {
    return {
      type: "open",
      ownerPage: "Prison",
      controlName: "BtnSearch",
      target: "PrisonSearch",
      evidence: ["MapPrison.csv BtnSearch", "PrisonSearch.xml", "CDlgPrison::OnBtnSearch()"],
    };
  }
  return null;
}

function addPrisonRuntimeLayer() {
  const prison = runtimeSeed.prison;
  const hotspots = prison?.hotspots || [];
  if (!hotspots.length) return;

  const minX = Math.min(...hotspots.map((item) => item.nX));
  const minY = Math.min(...hotspots.map((item) => item.nY));
  const maxX = Math.max(...hotspots.map((item) => item.nX + item.nWidth));
  const maxY = Math.max(...hotspots.map((item) => item.nY + item.nHeight));
  const padding = 14;
  const width = maxX - minX + padding * 2;
  const height = maxY - minY + padding * 2 + 36;
  const left = Math.round((data.stage.width - width) / 2);
  const top = Math.max(58, Math.round((data.stage.height - height) / 2));
  const board = runtimeLayerBox({ left, top, width, height }, "runtime-prison-board");
  if (!board) return;

  const caption = document.createElement("div");
  caption.className = "runtime-prison-caption";
  caption.textContent = "MapPrison 热点复原";
  board.appendChild(caption);

  hotspots.forEach((hotspot) => {
    const action = prisonHotspotAction(hotspot);
    const node = document.createElement(action ? "button" : "div");
    node.className = `runtime-prison-hotspot is-${hotspot.hotspotKind}${action ? " is-clickable" : ""}`;
    if (action) node.type = "button";
    node.style.left = `${padding + hotspot.nX - minX}px`;
    node.style.top = `${padding + 30 + hotspot.nY - minY}px`;
    node.style.width = `${hotspot.nWidth}px`;
    node.style.height = `${hotspot.nHeight}px`;
    node.innerHTML = `<span>${prisonHotspotLabel(hotspot)}</span>`;
    node.title = action ? actionLabel(action) : `${hotspot.strName} (${hotspot.hotspotKind})`;
    if (action) {
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        executeAction(action);
      });
    }
    board.appendChild(node);
  });

  addStageEvidencePanel(
    "监狱本地证据",
    [
      "MapPrison.csv 共 17 条：囚犯位 6、老者覆盖 6、按钮 5。",
      "当前只把 BtnSearch -> PrisonSearch 接成确定链路。",
      "OpenMemberInfo / PrisonOut / Gather native 已确认，但真实名册、费用、结果载荷仍待继续取证。",
    ],
    { right: 18, top: 84, width: 304, className: "runtime-prison-evidence" },
  );
}

function addPrisonSearchRuntimeLayer() {
  addStageEvidencePanel(
    "监狱搜索",
    [
      "EditSearch、btnSearch、btnClose 都在本地 XML 中确认。",
      "搜索结果列表属于运行时返回，当前 base APK 没带真实结果行。",
      "btnClose -> close 已由 page-actions.json 直接确认。",
    ],
    { right: 22, bottom: 24, width: 300, className: "runtime-prison-evidence" },
  );
}

function addPrisonPlayerRuntimeLayer() {
  addStageEvidencePanel(
    "囚犯资料面板",
    [
      "PrisonPlayer.xml 只确认头像、姓名、职业、等级这组展示位。",
      "成员真实列表和字段值属于监狱运行时数据，当前未在 base APK 静态表中找到。",
      "CDlgPrison::OpenMemberInfo 已在 native 符号中确认。",
    ],
    { right: 22, bottom: 24, width: 308, className: "runtime-prison-evidence" },
  );
}

function addIwantGoRuntimeLayer() {
  addStageEvidencePanel(
    "我要出去",
    [
      "BtnRunOut -> EscapePrison 已由 page-actions.json 直接确认。",
      "BtnUseItem / Btnusegold / StaGather 这些入口在 XML 与 native 中都存在。",
      "保释价格、道具消耗、采集收益仍属于运行时数据，当前先不伪造。",
    ],
    { right: 24, bottom: 22, width: 304, className: "runtime-prison-evidence" },
  );
}

function addEscapePrisonRuntimeLayer() {
  const rows = runtimeSeed.prison?.escapeInfo?.rows || [];
  const levels = rows.map((row) => Number(row.unLevel)).filter(Number.isFinite);
  const times = [...new Set(rows.map((row) => Number(row.unTime)).filter(Number.isFinite))].sort((a, b) => a - b);
  addStageEvidencePanel(
    "越狱条件表",
    [
      `EscapeInfo.csv 共 ${rows.length} 条，等级范围 ${Math.min(...levels)}-${Math.max(...levels)}。`,
      `当前能直接读到的时间档位：${times.join(" / ")}。`,
      "BtnOk -> EscapeGame 已确认；unQuality / unNumber 的真实语义仍未从静态数据单独坐实。",
    ],
    { right: 24, bottom: 22, width: 310, className: "runtime-prison-evidence" },
  );
}

function addEscapeGameRuntimeLayer() {
  addStageEvidencePanel(
    "越狱小游戏壳",
    [
      "EscapeGame.xml 只暴露标题、计时位和跑动图像位。",
      "CEscapePrison::Render 已在 native 中确认，说明这里确实有单独小游戏渲染逻辑。",
      "成功/失败结果包和战报载荷仍未在当前 base APK 静态文件中找到。",
    ],
    { right: 24, bottom: 22, width: 314, className: "runtime-prison-evidence" },
  );
}

function addPrisonRunAwayResultLayer() {
  addStageEvidencePanel(
    "越狱结果页",
    [
      "BtnClose -> close 已确认。",
      "CDlgPrisonRunAwayResult::OnBtnLookFightInfo 已在 native 中确认。",
      "Sta_text 的真实结果文案来自运行时载荷，当前先保持待确认。",
    ],
    { right: 22, bottom: 22, width: 304, className: "runtime-prison-evidence" },
  );
}

function addBossesAwayRuntimeLayer() {
  const bossesAway = runtimeSeed.bossesAway || {};
  const rows = bossesAway.rows || [];
  const previewRows = rows.slice(0, 3).map((item) => item.strCfgValue);
  const openerLine =
    bossesAway.shellEntryStatus === "confirmedLocal"
      ? "page-actions 已确认 btnShell.btn_BossesAway -> BossesAway。"
      : "当前 page-actions 还没有导出 btn_BossesAway 的确定性 opener。";
  addStageEvidencePanel(
    "BossesAway 本地证据",
    [
      `BossesAwayInfo.csv 共 ${rows.length} 条，BossesAway.xml 已确认存在。`,
      bossesAway.contentMatchesInfoRows
        ? "TextId 400744 与 BossesAwayInfo.csv 在去掉中英文标点差异后逐行同源。"
        : "TextId 400744 与 BossesAwayInfo.csv 正文尚未完成对齐。",
      "CPnlbtnShell::OnBtn_BossesAway() / btn_BossesAway / CDlgBossesAway::SetString() 已在 native 中确认。",
      openerLine,
      ...previewRows,
    ],
    { right: 22, top: 78, width: 330, className: "runtime-bosses-evidence" },
  );
}

function addSoundSettingsRuntimeLayer() {
  const sounds = runtimeSeed.battleRender?.sounds || [];
  const localCount = sounds.filter((item) => item.soundAssetStatus === "confirmedLocal").length;
  const aliases = sounds.slice(0, 5).map((item) => `${item.strTitle} -> ${item.strFile}`);
  addStageEvidencePanel(
    "音效设置本地证据",
    [
      `Sound.csv 共 ${sounds.length} 条，当前本地可见音频 ${localCount} 条。`,
      ...aliases,
      "chkSound / chkMusic / btnClose 都在 SoundSettings.xml 中确认。",
    ],
    { left: 28, bottom: 26, width: 360, className: "runtime-sound-evidence" },
  );
}

function addBattleRuntimeLayer() {
  const battleRender = runtimeSeed.battleRender || {};
  const detail = reviewedBattleDetail();
  const positions = battleRender.positions || [];
  const skillActions = battleRender.skillActions || [];
  const sounds = battleRender.sounds || [];
  const confirmedEffectCarriers = skillActions.filter((item) => item.effectCarrierStatus === "confirmedLocal").length;
  const fightRect = rectForRenderedNode("Battle", "imgFightBG") || { left: 28, top: 78, width: 906, height: 537 };
  const att1 = positions.find((item) => item.desc === "att1") || { x: 360, y: 370 };
  const def1 = positions.find((item) => item.desc === "def1") || positions.find((item) => item.side === "defender") || { x: 715, y: 275 };
  const toLayerPoint = (point) => ({
    left: Math.round((Number(point.x) || 0) - fightRect.left),
    top: Math.round((Number(point.y) || 0) - fightRect.top),
  });
  const playerPoint = toLayerPoint(att1);
  const monsterPoint = toLayerPoint(def1);
  const layer = document.createElement("div");
  layer.className = "play-battle-layer";
  layer.style.left = `${fightRect.left}px`;
  layer.style.top = `${fightRect.top}px`;
  layer.style.width = `${fightRect.width}px`;
  layer.style.height = `${fightRect.height}px`;
  layer.innerHTML = `
    <div class="battle-bg"></div>
    <div class="battle-sprite battle-player">
      <img src="assets/data/cartoon/partner/1002_dz_j_nan/sta1.png" draggable="false" alt="" />
    </div>
    <div class="battle-sprite battle-monster ${detail ? "battle-reviewed-dungeon" : "battle-unconfirmed-monster"}">
      ${detail ? `<strong>${escapeHtml(reviewedBattleTitle(detail))}</strong><small>${escapeHtml(reviewedBattleMeta(detail))}</small>` : "怪物待确认"}
    </div>
    <div class="battle-hit battle-hit-monster"></div>
    <div class="battle-hit battle-hit-player"></div>
  `;
  const player = layer.querySelector(".battle-player");
  const monster = layer.querySelector(".battle-monster");
  const monsterHit = layer.querySelector(".battle-hit-monster");
  const playerHit = layer.querySelector(".battle-hit-player");
  if (player) {
    player.style.left = `${playerPoint.left}px`;
    player.style.top = `${playerPoint.top}px`;
  }
  if (monster) {
    monster.style.left = `${monsterPoint.left}px`;
    monster.style.top = `${monsterPoint.top}px`;
  }
  if (monsterHit) {
    monsterHit.style.left = `${monsterPoint.left - 35}px`;
    monsterHit.style.top = `${monsterPoint.top - 65}px`;
  }
  if (playerHit) {
    playerHit.style.left = `${playerPoint.left - 38}px`;
    playerHit.style.top = `${playerPoint.top - 76}px`;
  }
  if (showGuideOverlay) {
    for (const position of positions) {
      const point = toLayerPoint(position);
      const slot = document.createElement("div");
      slot.className = `battle-slot is-${position.side}`;
      slot.style.left = `${point.left}px`;
      slot.style.top = `${point.top}px`;
      slot.textContent = position.desc;
      layer.appendChild(slot);
    }
    const summary = document.createElement("div");
    summary.className = "runtime-battle-summary";
    summary.innerHTML = `
      <span>SkillAction ${skillActions.length}</span>
      <span>ANI carriers ${confirmedEffectCarriers}</span>
      <span>Sound 别名 ${sounds.length}</span>
    `;
    const positionCount = document.createElement("span");
    positionCount.textContent = `BattlePos ${positions.length}`;
    summary.prepend(positionCount);
    layer.appendChild(summary);
  }
  stage.appendChild(layer);
}

function runtimeLayerBox(rect, className) {
  if (!rect) return null;
  const layer = document.createElement("div");
  layer.className = className;
  layer.style.left = `${rect.left}px`;
  layer.style.top = `${rect.top}px`;
  layer.style.width = `${rect.width}px`;
  layer.style.height = `${rect.height}px`;
  stage.appendChild(layer);
  return layer;
}

function addPlayerRuntimeLayer() {
  const state = runtimeState();
  const equipment = state?.player_state?.equipment || {};
  if (!equipment.rightHand) return;

  const rect = rectForRenderedNode("RoleInfo", "ImgRightHand") || rectForRenderedNode("PlayerInfo", "ImgRightHand");
  const layer = runtimeLayerBox(rect, "runtime-equip-slot");
  if (!layer) return;
  layer.textContent = equipment.rightHand.name;
}

function addEquipListRuntimeLayer() {
  const item = confirmedRookieEquipmentItem();
  if (!item) return;

  const layer = runtimeLayerBox(rectForRenderedNode("EquipList", "LstEquip"), "runtime-equip-list");
  if (!layer) return;
  layer.appendChild(equipmentCard(item, { advanceFlow: isRookiePlay() }));
}

function addEquipStrengthenRuntimeLayer() {
  const item = confirmedRookieEquipmentItem();
  if (!item) return;

  const listLayer = runtimeLayerBox(rectForRenderedNode("EquipStrengthen", "lstEquip"), "runtime-strengthen-equip-list");
  if (listLayer) {
    listLayer.appendChild(equipmentCard(item, { interactive: false }));
  }

  const iconLayer = runtimeLayerBox(rectForRenderedNode("EquipStrengthen", "imgEquip"), "runtime-strengthen-equip-icon");
  if (iconLayer) {
    const detail = reviewedItemDetail(item);
    iconLayer.textContent = `${item.itemId || item.id}\n${detail?.displayName || item.name}`;
  }
}

function addItemPackRuntimeLayer() {
  const state = runtimeState();
  const layer = runtimeLayerBox(rectForRenderedNode("ItemPack", "listPack"), "runtime-pack-grid");
  if (!layer) return;

  const items = state?.inventory_state?.items || [];
  if (!items.length) {
    layer.innerHTML = '<div class="runtime-empty">暂无已确认物品</div>';
    return;
  }

  items.forEach((item) => {
    const detail = reviewedItemDetail(item);
    const displayName = detail?.displayName || item.name;
    const meta = itemReviewedMeta(detail) || (item.equipped ? "已穿戴" : "点击穿戴");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `runtime-pack-item${item.equipped ? " is-equipped" : ""}${detail ? " is-reviewed" : ""}`;
    button.innerHTML = `<span>${escapeHtml(displayName)}</span><small>${escapeHtml(meta)}</small>`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      if (item.category === "equip") {
        runtime?.equipItem?.(item.itemId);
        setRuntimePage("PlayerInfo", `穿戴 ${displayName}`);
      }
    });
    layer.appendChild(button);
  });
}

function addSkillRuntimeLayer() {
  const skills = reviewedSkillRows();
  if (!skills.length) return;

  const layer =
    runtimeLayerBox(rectForRenderedNode("Skill", "listFightSkill"), "runtime-skill-list") ||
    runtimeLayerBox(rectForRenderedNode("Skill", "listStrengSkill"), "runtime-skill-list");
  if (!layer) return;

  skills.slice(0, 12).forEach((skill) => {
    const card = document.createElement("div");
    card.className = "runtime-skill-card is-reviewed";
    const displayName = skill.displayName || skill.skillId || "reviewed skill";
    card.innerHTML = `
      <span>${escapeHtml(displayName)}</span>
      <small>${escapeHtml(skillReviewedMeta(skill) || `row ${skill.rowNumber ?? ""}`.trim())}</small>
    `;
    layer.appendChild(card);
  });
}

function addGatherRuntimeLayer() {
  const rows = reviewedGatherRows();
  if (!rows.length) return;

  const layer =
    runtimeLayerBox(rectForRenderedNode("Gather", "rollStaRTInfo"), "runtime-reviewed-gather-list") ||
    runtimeLayerBox(rectForRenderedNode("Gather", "staHideTxt"), "runtime-reviewed-gather-list");
  if (!layer) return;

  rows.slice(0, 8).forEach((item) => {
    const row = document.createElement("div");
    row.className = "runtime-reviewed-gather-row";
    row.innerHTML = `
      <span>${escapeHtml(item.gatherItem || "reviewed gather item")}</span>
      <small>${escapeHtml(gatherReviewedMeta(item) || `row ${item.rowNumber ?? ""}`.trim())}</small>
    `;
    layer.appendChild(row);
  });
}

function addWoyaowanRuntimeLayer(pageName) {
  const rows = reviewedWoyaowanRows();
  if (!rows.length) return;

  const rect =
    pageName === "BallStore"
      ? rectForRenderedNode("BallStore", "ListBall")
      : pageName === "BallExchange"
        ? rectForRenderedNode("BallExchange", "ListBallExchange")
        : null;
  const layer = runtimeLayerBox(rect, "runtime-reviewed-ball-list");
  if (!layer) return;

  rows.slice(0, pageName === "BallExchange" ? 8 : 10).forEach((item) => {
    const row = document.createElement("div");
    row.className = "runtime-reviewed-ball-row";
    row.innerHTML = `
      <span>${escapeHtml(item.displayName || item.name || item.yaoWan || "reviewed ball")}</span>
      <small>${escapeHtml(woyaowanReviewedMeta(item) || `row ${item.rowNumber ?? ""}`.trim())}</small>
    `;
    layer.appendChild(row);
  });
}

function addReviewedMapRuntimeLayer(pageName) {
  if (!["RookieField", "RookieStart", "FightRoad"].includes(pageName)) return;
  const detail = reviewedMapDetailForStep();
  if (!detail) return;

  const layer = runtimeLayerBox({ left: 270, top: 12, width: 286, height: 52 }, "runtime-reviewed-map-info");
  if (!layer) return;

  layer.innerHTML = `
    <strong>${escapeHtml(detail.cityName || detail.city || "reviewed map")}</strong>
    <small>${escapeHtml(mapReviewedMeta(detail) || `row ${detail.rowNumber ?? ""}`.trim())}</small>
  `;
}

function addReviewedHideplaceRuntimeLayer(pageName) {
  if (!["RookieField", "RookieStart", "FightRoad"].includes(pageName)) return;
  const step = currentFlowStep();
  const cityId = Number(step?.cityId || 0);
  if (!cityId) return;

  const hidePlaces = (runtimeSeed.mapWorld?.hidePlaces || [])
    .filter((item) => Number(item.cityId) === cityId)
    .map((item) => ({ item, detail: reviewedHideplaceDetail(item) }))
    .filter((entry) => entry.detail);
  if (!hidePlaces.length) return;

  for (const { item, detail } of hidePlaces.slice(0, 12)) {
    const marker = document.createElement("div");
    marker.className = "runtime-reviewed-hideplace";
    marker.style.left = `${Number(item.nameX ?? item.x ?? 0)}px`;
    marker.style.top = `${Number(item.nameY ?? item.y ?? 0)}px`;
    marker.title = hideplaceReviewedMeta(detail) || `hideplace row ${detail.rowNumber ?? ""}`.trim();
    marker.innerHTML = `
      <span>${escapeHtml(detail.displayName || detail.hideName || item.name || `hide ${item.hideId}`)}</span>
      <small>${escapeHtml(detail.content || hideplaceReviewedMeta(detail) || "")}</small>
    `;
    stage.appendChild(marker);
  }
}

function addBattleEndRuntimeLayer() {
  const state = runtimeState();
  const layer = runtimeLayerBox(rectForRenderedNode("BattleEnd", "listReward"), "runtime-battle-result");
  if (!layer) return;

  const result = state?.battle_result;
  const detail = reviewedBattleDetail();
  const reviewedLines = detail
    ? [
        detail.name ? `关卡: ${detail.name}` : "",
        detail.monsterName ? `怪物: ${detail.monsterName}` : "",
        detail.teamId ? `team_id: ${detail.teamId}` : "",
        dungeonRewardLabel(detail),
        `reviewed: ${detail.templateId} row ${detail.rowNumber ?? ""}`.trim(),
      ].filter(Boolean)
    : [];
  const lines = result
    ? ["离线推进成功", ...reviewedLines, reviewedLines.length ? "" : result.note || "怪物/奖励/掉落待确认"]
    : ["离线推进成功", ...reviewedLines, reviewedLines.length ? "" : "奖励/掉落待确认"];
  layer.replaceChildren(
    ...lines.filter(Boolean).map((line) => {
      const item = document.createElement("div");
      item.textContent = line;
      return item;
    }),
  );
}

function addProRecruitRuntimeLayer() {
  const state = runtimeState();
  const layer = runtimeLayerBox(rectForRenderedNode("ProRecruit", "GridGenerals"), "runtime-general-grid");
  if (!layer) return;

  const pool = state?.recruit_state?.pool || [];
  if (!pool.length) {
    layer.innerHTML = '<div class="runtime-empty">点击刷新</div>';
    return;
  }

  pool.forEach((candidate, index) => {
    const detail = reviewedPartnerDetail(candidate);
    const displayName = detail?.displayName || candidate.displayName;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `runtime-general-slot${detail ? " is-reviewed" : ""}`;
    const meta =
      partnerReviewedMeta(detail) ||
      [candidate.professionName, candidate.tplId ? `Tpl ${candidate.tplId}` : ""].filter(Boolean).join(" / ");
    button.innerHTML = `<span>${escapeHtml(displayName)}</span><small>${escapeHtml(meta || "STU_GENERALS_MSG")}</small>`;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runtime?.selectRecruitCandidate?.(index);
      setRuntimePage("Recruit", `选择武将槽位 ${index + 1}`);
    });
    layer.appendChild(button);
  });
}

function addPartnersWarehouseRuntimeLayer() {
  const state = runtimeState();
  const layer = runtimeLayerBox(rectForRenderedNode("PartnersWarehouse", "LstRoleInfo"), "runtime-partner-list");
  if (!layer) return;

  const partners = state?.recruit_state?.partners || [];
  if (!partners.length) {
    layer.innerHTML = '<div class="runtime-empty">暂无已确认武将</div>';
    return;
  }

  partners.forEach((partner, index) => {
    const detail = reviewedPartnerDetail(partner);
    const displayName = detail?.displayName || partner.displayName;
    const row = document.createElement("div");
    row.className = `runtime-partner-row${detail ? " is-reviewed" : ""}`;
    const meta = partnerReviewedMeta(detail) || [
      partner.professionName,
      partner.tplId ? `Tpl ${partner.tplId}` : "",
      partner.attributeEvidenceStatus === "unresolvedLocal" ? "属性待确认" : "",
      partner.evidenceText || partner.evidence,
    ]
      .filter(Boolean)
      .join(" / ");
    row.innerHTML = `<span>${index + 1}. ${escapeHtml(displayName)}</span><small>${escapeHtml(meta)}</small>`;
    layer.appendChild(row);
  });
}

function addLoginRuntimeLayer(pageName) {
  const seedLogin = runtimeSeed.login || {};
  const servers = seedLogin.servers || [];
  if (!servers.length) return;

  const listRect =
    rectForRenderedNode(pageName, "lstServer") ||
    rectForRenderedNode(pageName, "LstServer") ||
    rectForRenderedNode(pageName, "ServerList");
  if (!listRect) return;

  const layer = runtimeLayerBox(listRect, "runtime-login-server-list");
  if (!layer) return;

  layer.replaceChildren();
  const state = runtimeState();
  const selectedIndex = Number(state?.login_state?.selectedServerIndex || seedLogin.defaultServerIndex || 0);

  servers.forEach((server) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `runtime-login-server-item${Number(server.uServerIdx) === selectedIndex ? " is-selected" : ""}`;
    button.innerHTML = `
      <strong>${server.strName || `Server ${server.uServerIdx}`}</strong>
      <small>${server.strDomainId || server.strGameSvrIP || ""}</small>
    `;
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      runtime?.selectLoginServer?.(server.uServerIdx);
      setRuntimePage("LoginSelServer", `选择服务器 ${server.strName || server.uServerIdx}`);
    });
    layer.appendChild(button);
  });
}

function addStateAndEvidenceLayers(pageName) {
  addReviewedMapRuntimeLayer(pageName);
  addReviewedHideplaceRuntimeLayer(pageName);
  if (pageName === "LoginSelServer") addLoginRuntimeLayer(pageName);
  if (pageName === "LoginSelectServer") addLoginRuntimeLayer(pageName);
  if (pageName === "PlayerInfo") addPlayerRuntimeLayer();
  if (pageName === "EquipList") addEquipListRuntimeLayer();
  if (pageName === "EquipStrengthen") addEquipStrengthenRuntimeLayer();
  if (pageName === "ItemPack") addItemPackRuntimeLayer();
  if (pageName === "Skill") addSkillRuntimeLayer();
  if (pageName === "Gather") addGatherRuntimeLayer();
  if (pageName === "BallStore") addWoyaowanRuntimeLayer(pageName);
  if (pageName === "BallExchange") addWoyaowanRuntimeLayer(pageName);
  if (pageName === "DungeonTeam") addDungeonTeamFixture();
  if (pageName === "Battle") addBattleRuntimeLayer();
  if (pageName === "BattleEnd") addBattleEndRuntimeLayer();
  if (pageName === "ProRecruit") addProRecruitRuntimeLayer();
  if (pageName === "PartnersWarehouse") addPartnersWarehouseRuntimeLayer();
  if (pageName === "Prison") addPrisonRuntimeLayer();
  if (pageName === "PrisonSearch") addPrisonSearchRuntimeLayer();
  if (pageName === "PrisonPlayer") addPrisonPlayerRuntimeLayer();
  if (pageName === "IwantGo") addIwantGoRuntimeLayer();
  if (pageName === "EscapePrison") addEscapePrisonRuntimeLayer();
  if (pageName === "EscapeGame") addEscapeGameRuntimeLayer();
  if (pageName === "PrisonRunAwayResult") addPrisonRunAwayResultLayer();
  if (pageName === "BossesAway") addBossesAwayRuntimeLayer();
  if (pageName === "SoundSettings") addSoundSettingsRuntimeLayer();
  addReviewedMasterDataEvidenceLayer();
}

function renderPlayLayer(pageName, step) {
  if (!playMode) return;

  if (isRookiePlay() && step?.type === "op") {
    addRookieMapTarget(step);
    addFieldMonsterSlotLayer(step);
    addPlayHotspot(step);
  }
}

function renderPage(page, context = {}) {
  clearIntervals();
  stage.replaceChildren();
  activePageName = page.name;
  const pageToRender = preparePageForFlow(page, context.flowStep);
  const backdropPage = mapBackdropPageForOverlay(page.name, context.flowStep);
  if (backdropPage) {
    renderNode(backdropPage.root, stage, true);
  }
  renderNode(pageToRender.root, stage, true);
  renderFlowOverlay(context.flowStep);
  renderPlayLayer(page.name, context.flowStep);
  addStateAndEvidenceLayers(page.name);
  renderBackendStatus();
  renderActionPanel(page.name);
  const flowLine = context.flowStep
    ? `flow ${activeFlowName} ${activeFlowStepIndex + 1}/${currentFlow()?.steps?.length || 0}`
    : "manual";
  const actionLine = actionStatus ? `action ${actionStatus}` : `${actionData.summary?.actionCount || 0} deterministic actions`;
  meta.textContent = `${page.source}\n${flowLine}\n${actionLine}\n${data.pages.length} pages\n${data.errors.length} parse errors`;
  document.title = `大明浮生记 H5 - ${page.name}`;
}

function renderActionPanel(pageName) {
  if (!pageActions) return;

  const actions = actionsForPage(pageName);
  if (!actions.length) {
    pageActions.replaceChildren(emptyActionNode("No confirmed APK click on this page."));
    return;
  }

  pageActions.replaceChildren(
    ...actions.map((action) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "action-row";
      button.textContent = actionLabel(action);
      button.title = (action.evidence || []).join("\n");
      button.addEventListener("click", () => executeAction(action));
      return button;
    }),
  );
}

function evidenceRow(label, value) {
  const row = document.createElement("div");
  row.className = "evidence-row";

  const labelNode = document.createElement("span");
  labelNode.className = "evidence-label";
  labelNode.textContent = label;

  const valueNode = document.createElement("span");
  valueNode.className = "evidence-value";
  valueNode.textContent = value || "-";

  row.append(labelNode, valueNode);
  return row;
}

function renderFlowEvidence() {
  if (!flowEvidence) return;

  const flow = currentFlow();
  const step = currentFlowStep();
  if (!flow || !step) {
    flowEvidence.replaceChildren(emptyActionNode("Manual page. No RookieGuideInfo state is active."));
    return;
  }

  const card = document.createElement("div");
  card.className = "evidence-card";

  const badge = document.createElement("div");
  badge.className = `evidence-badge evidence-${flowActionKind(step) || "unknown"}`;
  badge.textContent = flowActionLabel(step);

  const source = document.createElement("div");
  source.className = "evidence-source";
  source.textContent = `${flow.source || "RookieGuideInfo.csv"} · ${activeFlowStepIndex + 1}/${flow.steps.length}`;

  const conclusion = document.createElement("div");
  conclusion.className = "evidence-conclusion";
  conclusion.textContent = flowStateConclusion(step);
  const chain = activeDungeonChain();
  const chainRows = chain
    ? [
        evidenceRow("链路", chain.chainKey),
        evidenceRow("入口", chain.openTeamEvent?.event || "-"),
        evidenceRow("结算", chain.settlementEvent?.event || "-"),
        evidenceRow("绑定", chain.bindingEvidenceStatus || "unresolvedLocal"),
      ]
    : [];

  card.append(
    badge,
    source,
    evidenceRow("步骤", `${step.step}.${step.opStep}`),
    evidenceRow("页面", step.page),
    evidenceRow("事件", step.toggleEvt),
    evidenceRow("条件", step.toggleCond),
    evidenceRow("控件", step.targetControl || controlFromRenderTag(step.renderTag)),
    ...chainRows,
    conclusion,
  );

  flowEvidence.replaceChildren(card);
}

function emptyActionNode(text) {
  const node = document.createElement("div");
  node.className = "action-empty";
  node.textContent = text;
  return node;
}

function updateFlowControls() {
  const flow = currentFlow();
  const step = currentFlowStep();
  const flowActive = Boolean(flow && step);
  const total = flow?.steps?.length || 0;

  flowSelect.value = flowActive ? activeFlowName : "";
  flowPrev.disabled = !flowActive || activeFlowStepIndex <= 0;
  flowNext.disabled = !flowActive || activeFlowStepIndex >= total - 1;
  stageFlowPrev.disabled = flowPrev.disabled;
  stageFlowNext.disabled = flowNext.disabled;
  stageFlowControls.hidden = !flowActive;
  stageFlowLabel.textContent = flowActive
    ? `${activeFlowStepIndex + 1}/${total} · ${flowActionLabel(step)} · ${step.toggleEvt || step.page}`
    : "";

  if (!flowActive) {
    flowMeta.textContent = "manual";
    renderFlowEvidence();
    return;
  }

  const detail = step.content ? `\n${cleanFlowText(step.content)}` : "";
  flowMeta.textContent = `${flow.title}\nstep ${step.step}.${step.opStep} ${step.type}\n${step.page}${detail}`;
  renderFlowEvidence();
}

function setPage(name, options = {}) {
  const page = pageByName(name) || data.pages[0];
  if (!page) return;
  select.value = page.name;
  const step = options.fromFlow && !options.playRuntimePage ? currentFlowStep() : null;
  renderPage(page, { flowStep: step });
  const url = new URL(window.location.href);
  url.searchParams.set("page", page.name);
  if (playMode) url.searchParams.set("play", "rookie");
  if (!options.fromFlow) {
    activeFlowName = "";
    activeFlowStepIndex = 0;
    url.searchParams.delete("flow");
    url.searchParams.delete("step");
  }
  window.history.replaceState(null, "", url);
  updateFlowControls();
}

function setFlowStep(flowName, stepIndex) {
  const flow = flowData.flows?.[flowName];
  if (!flow?.steps?.length) return;

  activeFlowName = flowName;
  activeFlowStepIndex = normalizePlayStepIndex(flow, stepIndex);
  const step = currentFlowStep();
  setPage(step.page, { fromFlow: true });

  const url = new URL(window.location.href);
  if (playMode) url.searchParams.set("play", "rookie");
  url.searchParams.set("flow", activeFlowName);
  url.searchParams.set("step", String(activeFlowStepIndex));
  url.searchParams.set("page", step.page);
  window.history.replaceState(null, "", url);
  updateFlowControls();
}

function moveFlow(delta) {
  if (!activeFlowName) return;
  setFlowStep(activeFlowName, activeFlowStepIndex + delta);
}

function handlePlayStageClick(event) {
  if (!playMode) return false;

  if (activePageName === "CreateRole") return false;
  if (activePageName === "Battle" || activePageName === "BattleEnd") return false;

  const step = currentFlowStep();
  if (!isRookiePlay() || !step) return false;

  if (step.type === "npc_dlg" && activePageName === "RookieStart") {
    advancePlayStep();
    return true;
  }

  if (step.type === "op" && isGuideClick(event, step)) {
    runPlayStepAction(step);
    return true;
  }

  if (step.type === "op" && cleanFlowText(step.content)) {
    stage.classList.remove("play-miss");
    void stage.offsetWidth;
    stage.classList.add("play-miss");
    return true;
  }

  return false;
}

function populateList() {
  const query = filter.value.trim().toLowerCase();
  select.replaceChildren();

  for (const page of data.pages) {
    if (query && !page.name.toLowerCase().includes(query)) continue;
    const option = document.createElement("option");
    option.value = page.name;
    option.textContent = page.source;
    select.appendChild(option);
  }
}

filter.addEventListener("input", () => {
  populateList();
  if (select.options.length) setPage(select.options[0].value);
});

select.addEventListener("change", () => setPage(select.value));

showActions?.addEventListener("change", () => {
  updateActionHotspotVisibility();
});

function updateActionHotspotVisibility() {
  document.body.classList.toggle("show-action-hotspots", Boolean(showActions?.checked) && !hideChrome);
}

function populateFlowControls() {
  flowSelect.replaceChildren();
  const manualOption = document.createElement("option");
  manualOption.value = "";
  manualOption.textContent = "Manual";
  flowSelect.appendChild(manualOption);

  for (const [name, flow] of Object.entries(flowData.flows || {})) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = flow.title || name;
    flowSelect.appendChild(option);
  }

  quickPages.replaceChildren();
  for (const item of flowData.quickPages || []) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.label;
    button.addEventListener("click", () => setPage(item.page));
    quickPages.appendChild(button);
  }
}

flowSelect.addEventListener("change", () => {
  if (flowSelect.value) {
    setFlowStep(flowSelect.value, 0);
  } else {
    setPage(select.value || pageNameFromLocation());
  }
});
flowPrev.addEventListener("click", () => moveFlow(-1));
flowNext.addEventListener("click", () => moveFlow(1));
stageFlowPrev.addEventListener("click", (event) => {
  event.stopPropagation();
  moveFlow(-1);
});
stageFlowNext.addEventListener("click", (event) => {
  event.stopPropagation();
  moveFlow(1);
});
stage.addEventListener("click", (event) => {
  if (handlePlayStageClick(event)) return;
  if (activeFlowName && !playMode) moveFlow(1);
});

populateList();
populateFlowControls();
updateActionHotspotVisibility();
if (activeFlowName) {
  setFlowStep(activeFlowName, activeFlowStepIndex);
} else {
  setPage(pageNameFromLocation());
}
