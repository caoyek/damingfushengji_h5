(function () {
  const seed = window.APK_RUNTIME_SEED || {};
  const reviewedMasterData = window.APK_REVIEWED_MASTER_DATA || { summary: {}, templates: [] };
  const reviewedMode = /(?:\?|&)reviewed=1(?:&|$)/.test(String(window.location?.search || ""));
  const STORAGE_KEY = "daming_phase1_runtime_state_v1";
  const DEFAULT_REVIEWED_IDENTITY_FIELDS = {
    item: ["name", "item_name"],
    partner: ["partnerName", "partner", "career_id"],
    fieldmonster: ["monsterName", "team_id", "city_id", "monsterGroup"],
    hidden_dungeon: ["dungeon_id", "dungeon_key", "team_id", "name"],
    fightroad_xml: ["dungeon_id", "dungeon_key", "team_id", "missionName"],
    battle: ["att_id", "win_id", "lost_id", "teams", "rounds", "rewards"],
    map_xml: ["city", "cityName", "Name", "bgUrl"],
    gather: ["gather_item"],
    skill: ["skill", "skillNname", "level"],
    face: ["icon", "iconUrl", "iconStr"],
    woyaowan: ["yao_wan", "name", "icon"],
    uplevel: ["level"],
    hiddenfengjing: ["tpl_id", "city_id", "hide_id"],
    hideplace: ["hide_id", "hide_name", "city_id"],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function professionName(id) {
    return (seed.professions || []).find((item) => item.id === id)?.name || "";
  }

  function knownItem(itemId) {
    return seed.items?.[String(itemId)] || null;
  }

  function confirmedPartners() {
    return seed.recruit?.confirmedPartners || seed.partners?.confirmedPartners || [];
  }

  function reviewedTemplates() {
    return Array.isArray(reviewedMasterData.templates) ? reviewedMasterData.templates : [];
  }

  function reviewedTemplate(templateId) {
    return reviewedTemplates().find((template) => template.id === templateId) || null;
  }

  function reviewedMasterDataSummary() {
    const summary = reviewedMasterData.summary || {};
    return {
      enabled: reviewedMode,
      templateCount: Number(summary.templateCount || reviewedTemplates().length || 0),
      acceptedRows: Number(summary.acceptedRows || 0),
      skippedRows: Number(summary.skippedRows || 0),
      rejectedRows: Number(summary.rejectedRows || 0),
      templateIds: reviewedTemplates().map((template) => template.id),
    };
  }

  function reviewedMasterDataTemplate(templateId) {
    const template = reviewedTemplate(templateId);
    if (!template) return null;
    return clone(template);
  }

  function reviewedMasterDataRows(templateId) {
    const template = reviewedTemplate(templateId);
    if (!template) return [];
    return clone({
      acceptedRows: template.acceptedRows || [],
      skippedRows: template.skippedRows || [],
      rejectedRows: template.rejectedRows || [],
    });
  }

  function reviewedIdentityFields(templateId) {
    const identityFields = reviewedMasterData.identityFields || {};
    const fields = identityFields[templateId] || DEFAULT_REVIEWED_IDENTITY_FIELDS[templateId] || [];
    return Array.isArray(fields) ? fields.filter(Boolean) : [];
  }

  function reviewedAcceptedRows(templateId) {
    const template = reviewedTemplate(templateId);
    return Array.isArray(template?.acceptedRows) ? template.acceptedRows : [];
  }

  function reviewedLookupValue(value) {
    return String(value ?? "").trim();
  }

  function reviewedMasterDataAcceptedRows(templateId) {
    return clone(reviewedAcceptedRows(templateId));
  }

  function reviewedMasterDataFind(templateId, key, value) {
    const fields = reviewedIdentityFields(templateId);
    if (!fields.includes(key)) return [];
    const needle = reviewedLookupValue(value);
    if (!needle) return [];
    return clone(
      reviewedAcceptedRows(templateId).filter((row) => reviewedLookupValue(row?.data?.[key]) === needle),
    );
  }

  function firstReviewedText(...values) {
    for (const value of values) {
      const text = reviewedLookupValue(value);
      if (text) return text;
    }
    return "";
  }

  function reviewedDungeonRewardRow(chain) {
    if (!reviewedMode || !chain) return null;
    const openEvent = chain.openTeamEvent || {};
    const settlementEvent = chain.settlementEvent || {};
    const candidates = [];
    for (const templateId of ["hidden_dungeon", "fightroad_xml"]) {
      candidates.push({ templateId, key: "team_id", value: chain.dungeonTeamKey });
      candidates.push({ templateId, key: "dungeon_key", value: chain.dungeonTeamKey });
      candidates.push({ templateId, key: "dungeon_key", value: openEvent.event });
      candidates.push({ templateId, key: "dungeon_key", value: settlementEvent.event });
    }
    const seen = new Set();
    for (const candidate of candidates) {
      const value = reviewedLookupValue(candidate.value);
      if (!value) continue;
      const seenKey = `${candidate.templateId}:${candidate.key}:${value}`;
      if (seen.has(seenKey)) continue;
      seen.add(seenKey);
      const [row] = reviewedMasterDataFind(candidate.templateId, candidate.key, value);
      if (row) return { row, match: candidate };
    }
    return null;
  }

  function reviewedRewardItemIds(text) {
    return Array.from(new Set(String(text || "").match(/\d+/g) || []))
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  function applyReviewedDungeonRewards(chain, source) {
    const match = reviewedDungeonRewardRow(chain);
    if (!match) return null;
    const data = match.row?.data || {};
    const rewards = [];
    const gold = Number(firstReviewedText(data.gold));
    if (Number.isFinite(gold) && gold > 0) {
      state.player_state.currencies.gold += gold;
      rewards.push({ type: "gold", amount: gold, applied: true });
    }

    const itemSource = firstReviewedText(data.items, data.drop_item);
    for (const itemId of reviewedRewardItemIds(itemSource)) {
      addItem(itemId, 1, `${source}: reviewed ${match.match.templateId} row ${match.row.rowNumber ?? ""}`.trim());
      rewards.push({ type: "item", itemId, quantity: 1, applied: Boolean(knownItem(itemId)) });
    }

    const merit = firstReviewedText(data.merit);
    if (merit) {
      rewards.push({ type: "merit", amount: merit, applied: false, reason: "currencyMappingUnresolved" });
    }

    return {
      templateId: match.match.templateId,
      rowNumber: match.row.rowNumber ?? null,
      evidenceStatus: match.row.evidenceStatus || "",
      matchKey: match.match.key,
      matchValue: reviewedLookupValue(match.match.value),
      name: firstReviewedText(data.name, data.monsterName, data.missionName, data.team_content, data.content),
      rewards,
    };
  }

  function reviewedMasterDataIndexSummary() {
    const summary = reviewedMasterDataSummary();
    const keysByTemplate = {};
    let indexedRows = 0;
    for (const template of reviewedTemplates()) {
      const fields = reviewedIdentityFields(template.id);
      keysByTemplate[template.id] = fields;
      indexedRows += reviewedAcceptedRows(template.id).filter((row) =>
        fields.some((field) => reviewedLookupValue(row?.data?.[field])),
      ).length;
    }
    return {
      ...summary,
      indexedRows,
      keysByTemplate,
    };
  }

  function randomItem(items = []) {
    if (!items.length) return "";
    return items[Math.floor(Math.random() * items.length)] || "";
  }

  function makeRoleName() {
    const surnames = seed.createRole?.surnames || [];
    const givenNames = seed.createRole?.givenNames || [];
    const surname = randomItem(surnames);
    const given = randomItem(givenNames);
    return `${surname}${given}` || seed.createRole?.defaultName || "小明";
  }

  function firstRoleProfileForSex(sex) {
    const profiles = seed.createRole?.profiles || [];
    return profiles.find((profile) => Number(profile.sex) === Number(sex)) || profiles[0] || null;
  }

  function stepEvent(step = {}) {
    return step.toggleEvt || step.event || "";
  }

  function stepCondition(step = {}) {
    return step.toggleCond || step.condition || "";
  }

  function compactGuideEvent(event) {
    if (!event) return null;
    return {
      index: event.index ?? null,
      step: event.step ?? null,
      opStep: event.opStep ?? null,
      cityId: event.cityId ?? null,
      event: event.event || "",
      condition: event.condition || "",
      actionKind: event.actionKind || "",
      pageClass: event.pageClass || "",
      source: event.source || "RookieGuideInfo.csv",
      evidenceStatus: event.evidenceStatus || "confirmedLocal",
    };
  }

  function compactDungeonChain(chain) {
    if (!chain) return null;
    return {
      chainKey: chain.chainKey || "",
      chainKind: chain.chainKind || "",
      cityId: chain.cityId ?? null,
      posDungeon: chain.posDungeon || "",
      posDungeonIndex: chain.posDungeonIndex ?? null,
      dungeonTeamKey: chain.dungeonTeamKey || "",
      targetUi: chain.targetUi || "",
      clickControl: chain.clickControl || "",
      openTeamEvent: compactGuideEvent(chain.openTeamEvent),
      settlementEvent: compactGuideEvent(chain.settlementEvent),
      bindingEvidenceStatus: chain.bindingEvidenceStatus || "unresolvedLocal",
      unresolved: clone(chain.unresolved || {}),
      source: chain.source || "RookieGuideInfo.csv",
      evidenceStatus: chain.evidenceStatus || "confirmedLocal",
    };
  }

  function guideEventMatchesStep(event, step = {}) {
    if (!event || !step) return false;
    if (event.index !== undefined && step.index !== undefined && Number(event.index) === Number(step.index)) return true;
    const sameEvent = (event.event || "") === stepEvent(step);
    const sameCondition = (event.condition || "") === stepCondition(step);
    const sameCity = event.cityId === undefined || step.cityId === undefined || Number(event.cityId) === Number(step.cityId);
    return sameEvent && sameCondition && sameCity;
  }

  function findDungeonChain(payload = {}) {
    if (payload.chain) return compactDungeonChain(payload.chain);
    const step = payload.step || {};
    const chains = seed.rookie?.dungeonChains || [];
    const chain = chains.find((candidate) => guideEventMatchesStep(candidate.openTeamEvent, step));
    return compactDungeonChain(chain);
  }

  function defaultState() {
    const defaultServerIndex = Number(seed.login?.defaultServerIndex || 0);
    const defaultServer = (seed.login?.servers || []).find((item) => Number(item.uServerIdx) === defaultServerIndex) || seed.login?.servers?.[0] || null;
    return {
      login_state: {
        selectedServerIndex: defaultServer ? Number(defaultServer.uServerIdx) : 0,
        selectedServerName: defaultServer?.strName || "",
        selectedServerTip: defaultServer ? `S${Number(defaultServer.uServerIdx) + 1}` : "",
        loggedIn: false,
      },
      player_state: {
        created: false,
        roleName: "",
        draftRoleName: seed.createRole?.defaultName || "小明",
        draftSex: Number(seed.createRole?.defaultSex ?? 1),
        draftProfileIndex: Number(seed.createRole?.defaultProfileIndex || 0),
        draftProfileImage: seed.createRole?.defaultProfileImage || "",
        sex: Number(seed.createRole?.defaultSex ?? 1),
        profileIndex: Number(seed.createRole?.defaultProfileIndex || 0),
        profileImage: seed.createRole?.defaultProfileImage || "",
        level: 1,
        experience: 0,
        experienceMax: 100,
        professionId: seed.transfer?.fromProfessionId || 1000,
        professionName: professionName(seed.transfer?.fromProfessionId || 1000),
        currencies: {
          gold: 0,
          yuanbao: 0,
          battle: 0,
          fame: 0,
        },
        stats: {},
        equipment: {},
      },
      inventory_state: {
        capacity: 20,
        items: [],
        unresolvedRewards: [],
      },
      task_state: {
        rookieStep: 0,
        appliedRookieKeys: [],
      },
      dungeon_team_state: {
        currentEvent: null,
        currentChain: null,
        completedEvents: [],
      },
      battle_result: null,
      profession_state: {
        currentProfessionId: seed.transfer?.fromProfessionId || 1000,
        pendingProfessionId: null,
        pendingButton: "",
        history: [],
      },
      recruit_state: {
        refreshCount: 0,
        pool: [],
        selectedIndex: 0,
        partners: [],
        lastResult: null,
      },
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const base = defaultState();
        return {
          ...base,
          ...parsed,
          login_state: {
            ...base.login_state,
            ...(parsed.login_state || {}),
          },
        };
      }
    } catch (error) {
      // Local storage is optional for file:// and restricted browser contexts.
    }
    return defaultState();
  }

  let state = loadState();

  function saveState() {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Keep the in-memory state if persistence is unavailable.
    }
  }

  function ensureRole() {
    if (state.player_state.created) return;
    createRole({
      name: state.player_state.draftRoleName || seed.createRole?.defaultName || "小明",
      sex: state.player_state.draftSex ?? seed.createRole?.defaultSex ?? 1,
    });
  }

  function reset() {
    state = defaultState();
    saveState();
    return snapshot();
  }

  function createRole(options = {}) {
    state.player_state.created = true;
    state.player_state.roleName = String(options.name || state.player_state.draftRoleName || seed.createRole?.defaultName || "小明").trim() || "小明";
    state.player_state.draftRoleName = state.player_state.roleName;
    const sex = Number.isFinite(Number(options.sex)) ? Number(options.sex) : Number(seed.createRole?.defaultSex ?? 1);
    const profile = firstRoleProfileForSex(sex);
    state.player_state.sex = sex;
    state.player_state.draftSex = sex;
    state.player_state.profileIndex = profile?.index || 0;
    state.player_state.profileImage = profile?.image || "";
    state.player_state.draftProfileIndex = state.player_state.profileIndex;
    state.player_state.draftProfileImage = state.player_state.profileImage;
    state.player_state.professionId = seed.transfer?.fromProfessionId || 1000;
    state.player_state.professionName = professionName(state.player_state.professionId);
    state.profession_state.currentProfessionId = state.player_state.professionId;
    saveState();
    return snapshot();
  }

  function generateRoleName() {
    state.player_state.draftRoleName = makeRoleName();
    saveState();
    return snapshot();
  }

  function selectRoleSex(sex) {
    const normalized = Number(sex) === 0 ? 0 : 1;
    const profile = firstRoleProfileForSex(normalized);
    state.player_state.draftSex = normalized;
    state.player_state.draftProfileIndex = profile?.index || 0;
    state.player_state.draftProfileImage = profile?.image || "";
    saveState();
    return snapshot();
  }

  function selectLoginServer(serverIndex = null) {
    const servers = seed.login?.servers || [];
    const fallback = servers[0] || null;
    const target = servers.find((item) => Number(item.uServerIdx) === Number(serverIndex)) || fallback;
    state.login_state.selectedServerIndex = target ? Number(target.uServerIdx) : 0;
    state.login_state.selectedServerName = target?.strName || "";
    state.login_state.selectedServerTip = target ? `S${Number(target.uServerIdx) + 1}` : "";
    saveState();
    return snapshot();
  }

  function offlineLogin(serverIndex = null) {
    selectLoginServer(serverIndex ?? state.login_state.selectedServerIndex);
    state.login_state.loggedIn = true;
    saveState();
    return snapshot();
  }

  function addItem(itemId, quantity = 1, source = "") {
    const item = knownItem(itemId);
    if (!item) {
      const unresolvedKey = `${itemId}:${source}`;
      if (!state.inventory_state.unresolvedRewards.some((entry) => entry.key === unresolvedKey)) {
        state.inventory_state.unresolvedRewards.push({ key: unresolvedKey, itemId, quantity, source });
      }
      saveState();
      return null;
    }

    const existing = state.inventory_state.items.find((entry) => entry.itemId === item.id && !entry.equipped);
    if (existing) {
      existing.quantity += quantity;
    } else {
      state.inventory_state.items.push({
        itemId: item.id,
        name: item.name,
        category: item.category,
        slot: item.slot,
        quantity,
        equipped: false,
        source: source || item.source,
      });
    }
    saveState();
    return snapshot();
  }

  function applyRookieStep(step) {
    if (!step) return snapshot();
    ensureRole();
    const key = `${step.index ?? ""}:${step.step}.${step.opStep}`;
    if (state.task_state.appliedRookieKeys.includes(key)) return snapshot();

    const itemIds = String(step.getItems || "")
      .split(",")
      .map((part) => Number(part.trim()))
      .filter((value) => Number.isFinite(value) && value > 0);
    for (const itemId of itemIds) {
      addItem(itemId, 1, `RookieGuideInfo.csv step ${step.step}.${step.opStep}`);
    }

    state.task_state.rookieStep = Math.max(state.task_state.rookieStep, Number(step.index || 0));
    state.task_state.appliedRookieKeys.push(key);
    saveState();
    return snapshot();
  }

  function equipItem(itemId) {
    ensureRole();
    const item = knownItem(itemId);
    if (!item || item.category !== "equip" || !item.slot) return snapshot();

    let entry = state.inventory_state.items.find((candidate) => candidate.itemId === item.id);
    if (!entry) {
      addItem(item.id, 1, item.source);
      entry = state.inventory_state.items.find((candidate) => candidate.itemId === item.id);
    }
    if (!entry) return snapshot();

    for (const candidate of state.inventory_state.items) {
      if (candidate.slot === item.slot) candidate.equipped = false;
    }
    entry.equipped = true;
    state.player_state.equipment[item.slot] = {
      itemId: item.id,
      name: item.name,
      source: entry.source,
    };
    saveState();
    return snapshot();
  }

  function startBattle(payload = {}) {
    ensureRole();
    const step = payload.step || {};
    const chain = findDungeonChain(payload);
    const openEvent = chain?.openTeamEvent || {};
    state.dungeon_team_state.currentEvent = {
      kind: payload.kind || step.actionKind || "",
      event: stepEvent(step) || openEvent.event || "",
      condition: stepCondition(step) || openEvent.condition || "",
      step: step.step ? `${step.step}.${step.opStep}` : "",
      chainKey: chain?.chainKey || "",
      posDungeon: chain?.posDungeon || "",
      dungeonTeamKey: chain?.dungeonTeamKey || "",
      settlementEvent: chain?.settlementEvent || null,
      source: "RookieGuideInfo.csv",
    };
    state.dungeon_team_state.currentChain = chain;
    state.battle_result = null;
    saveState();
    return snapshot();
  }

  function finishBattle(options = {}) {
    ensureRole();
    const current = state.dungeon_team_state.currentEvent || {};
    const chain = state.dungeon_team_state.currentChain || null;
    const reviewedReward = options.applyReviewedRewards
      ? applyReviewedDungeonRewards(chain, current.source || "RookieGuideInfo.csv")
      : null;
    const result = {
      result: "win",
      event: current.event || "",
      condition: current.condition || "",
      step: current.step || "",
      chain,
      chainKey: chain?.chainKey || current.chainKey || "",
      posDungeon: chain?.posDungeon || current.posDungeon || "",
      dungeonTeamKey: chain?.dungeonTeamKey || current.dungeonTeamKey || "",
      openTeamEvent: chain?.openTeamEvent || null,
      settlementEvent: chain?.settlementEvent || current.settlementEvent || null,
      unresolved: chain?.unresolved || {},
      source: current.source || "RookieGuideInfo.csv",
      rewards: reviewedReward?.rewards || [],
      reviewedReward,
      note: "离线推进成功；怪物/奖励/掉落待继续确认",
      evidenceStatus: reviewedReward ? "externalReviewed" : "unresolvedLocal",
    };
    state.battle_result = result;
    if (current.event) {
      state.dungeon_team_state.completedEvents.push({ ...current, chainKey: result.chainKey });
    }
    state.dungeon_team_state.currentEvent = null;
    state.dungeon_team_state.currentChain = null;
    saveState();
    return snapshot();
  }

  function selectProfession(professionId, buttonName = "") {
    ensureRole();
    if (!professionName(professionId)) return snapshot();
    state.profession_state.pendingProfessionId = professionId;
    state.profession_state.pendingButton = buttonName;
    saveState();
    return snapshot();
  }

  function confirmProfession() {
    ensureRole();
    const targetId = state.profession_state.pendingProfessionId;
    const targetName = professionName(targetId);
    if (!targetId || !targetName) return snapshot();

    state.profession_state.currentProfessionId = targetId;
    state.player_state.professionId = targetId;
    state.player_state.professionName = targetName;
    state.profession_state.history.push({
      professionId: targetId,
      professionName: targetName,
      source: "ProTransfer.xml + ProfessionName.csv",
    });
    state.profession_state.pendingProfessionId = null;
    state.profession_state.pendingButton = "";
    saveState();
    return snapshot();
  }

  function refreshRecruitPool() {
    ensureRole();
    const count = Number(seed.recruit?.slotCount || 6);
    const partners = confirmedPartners();
    state.recruit_state.refreshCount += 1;
    state.recruit_state.pool = Array.from({ length: count }, (_, index) => {
      const partner = partners.length ? partners[(state.recruit_state.refreshCount - 1 + index) % partners.length] : null;
      if (!partner) {
        return {
          slot: index,
          displayName: "待确认武将",
          evidenceStatus: "unresolvedLocal",
          evidence: seed.recruit?.slotEvidence || "CProfessionRoom::STU_GENERALS_MSG",
          evidenceText: seed.recruit?.slotEvidence || "CProfessionRoom::STU_GENERALS_MSG",
        };
      }
      return {
        slot: index,
        tplId: partner.tplId,
        displayName: partner.displayName,
        professionId: partner.professionId,
        professionName: partner.professionName,
        portraits: partner.portraits || {},
        actionPrefixes: partner.actionPrefixes || [],
        attributes: partner.attributes || {},
        attributeStatus: partner.attributeStatus,
        evidenceStatus: partner.evidenceStatus || "confirmedLocal",
        attributeEvidenceStatus: partner.attributeEvidenceStatus || "unresolvedLocal",
        evidence: partner.evidence || [],
        evidenceText: (partner.evidence || []).join(" + "),
      };
    });
    state.recruit_state.selectedIndex = 0;
    saveState();
    return snapshot();
  }

  function selectRecruitCandidate(index = 0) {
    ensureRole();
    if (!state.recruit_state.pool.length) refreshRecruitPool();
    const safeIndex = Math.max(0, Math.min(Number(index) || 0, state.recruit_state.pool.length - 1));
    state.recruit_state.selectedIndex = safeIndex;
    saveState();
    return snapshot();
  }

  function recruitGeneral() {
    ensureRole();
    if (!state.recruit_state.pool.length) refreshRecruitPool();
    const candidate = state.recruit_state.pool[state.recruit_state.selectedIndex] || state.recruit_state.pool[0];
    const partner = {
      id: `partner_${state.recruit_state.partners.length + 1}`,
      tplId: candidate.tplId,
      displayName: candidate.displayName,
      professionId: candidate.professionId,
      professionName: candidate.professionName,
      portraits: candidate.portraits || {},
      actionPrefixes: candidate.actionPrefixes || [],
      attributes: candidate.attributes || {},
      attributeStatus: candidate.attributeStatus,
      evidenceStatus: candidate.evidenceStatus || "confirmedLocal",
      attributeEvidenceStatus: candidate.attributeEvidenceStatus || "unresolvedLocal",
      evidence: candidate.evidence,
      evidenceText: candidate.evidenceText || candidate.evidence,
      sourceSlot: candidate.slot,
    };
    state.recruit_state.partners.push(partner);
    state.recruit_state.lastResult = partner;
    saveState();
    return snapshot();
  }

  function snapshot() {
    const copy = clone(state);
    copy.reviewed_master_data = reviewedMasterDataSummary();
    return copy;
  }

  window.ApkRuntime = {
    createRole,
    generateRoleName,
    selectRoleSex,
    selectLoginServer,
    offlineLogin,
    applyRookieStep,
    addItem,
    equipItem,
    startBattle,
    finishBattle,
    selectProfession,
    confirmProfession,
    refreshRecruitPool,
    selectRecruitCandidate,
    recruitGeneral,
    reviewedDataEnabled: () => reviewedMode,
    reviewedMasterDataSummary,
    reviewedMasterDataIndexSummary,
    reviewedMasterDataTemplate,
    reviewedMasterDataRows,
    reviewedMasterDataAcceptedRows,
    reviewedMasterDataFind,
    snapshot,
    reset,
  };
})();
