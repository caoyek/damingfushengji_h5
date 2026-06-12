(function () {
  const DEFAULT_IDENTITY_FIELDS = {
    item: ["name", "item_name"],
    partner: ["partnerName", "partner", "career_id"],
    hidden_dungeon: ["dungeon_id", "dungeon_key", "team_id", "name"],
    fightroad_xml: ["dungeon_id", "dungeon_key", "team_id", "missionName"],
    fieldmonster: ["monsterName", "team_id", "city_id", "monsterGroup"],
    battle: ["att_id", "win_id", "lost_id", "teams", "rounds", "rewards"],
    skill: ["skill", "skillNname", "level"],
    map_xml: ["city", "cityName", "Name", "bgUrl"],
    gather: ["gather_item"],
    face: ["icon", "iconUrl", "iconStr"],
    woyaowan: ["yao_wan", "name", "icon"],
    uplevel: ["level"],
    hiddenfengjing: ["tpl_id", "city_id", "hide_id"],
    hideplace: ["hide_id", "hide_name", "city_id"],
  };

  function lookupValue(value) {
    return String(value ?? "").trim();
  }

  function firstText(...values) {
    for (const value of values) {
      const text = lookupValue(value);
      if (text) return text;
    }
    return "";
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function uniqueCandidates(candidates) {
    const seen = new Set();
    return candidates.filter((candidate) => {
      const value = lookupValue(candidate.value);
      if (!value) return false;
      const key = `${candidate.templateId}:${candidate.key}:${value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function reviewedEnabled(runtime, reviewedMode) {
    return Boolean(runtime?.reviewedDataEnabled?.() || reviewedMode);
  }

  function identityFields(payload, templateId) {
    const fields = payload?.identityFields?.[templateId] || DEFAULT_IDENTITY_FIELDS[templateId] || [];
    return asArray(fields).filter(Boolean);
  }

  function fallbackFindRows(payload, templateId, key, value) {
    const fields = identityFields(payload, templateId);
    if (!fields.includes(key)) return [];
    const needle = lookupValue(value);
    if (!needle) return [];
    const template = asArray(payload?.templates).find((item) => item.id === templateId);
    return asArray(template?.acceptedRows).filter((row) => lookupValue(row?.data?.[key]) === needle);
  }

  function findRows(runtime, payload, templateId, key, value) {
    if (runtime?.reviewedMasterDataFind) {
      return asArray(runtime.reviewedMasterDataFind(templateId, key, value));
    }
    return fallbackFindRows(payload, templateId, key, value);
  }

  function acceptedRows(runtime, payload, templateId) {
    if (runtime?.reviewedMasterDataAcceptedRows) {
      return asArray(runtime.reviewedMasterDataAcceptedRows(templateId));
    }
    const template = asArray(payload?.templates).find((item) => item.id === templateId);
    return asArray(template?.acceptedRows);
  }

  function dungeonCandidates(chain) {
    if (!chain) return [];
    const openEvent = chain.openTeamEvent || {};
    const settlementEvent = chain.settlementEvent || {};
    const templates = ["hidden_dungeon", "fightroad_xml"];
    const raw = [];
    for (const templateId of templates) {
      raw.push({ templateId, key: "team_id", value: chain.dungeonTeamKey });
      raw.push({ templateId, key: "dungeon_key", value: chain.dungeonTeamKey });
      raw.push({ templateId, key: "dungeon_key", value: openEvent.event });
      raw.push({ templateId, key: "dungeon_key", value: settlementEvent.event });
    }
    return uniqueCandidates(raw);
  }

  function detailFromRow(row, match) {
    const data = row?.data || {};
    const rewardText = firstText(data.reward, data.items, data.drop_item, data.team_content, data.content);
    return {
      templateId: match.templateId,
      matchKey: match.key,
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      name: firstText(data.name, data.monsterName, data.missionName, data.team_content, data.content),
      monsterName: firstText(data.monsterName, data.name),
      monsterImage: firstText(data.monster_image_url, data.monster),
      dungeonId: firstText(data.dungeon_id, data.dungeon),
      dungeonKey: firstText(data.dungeon_key),
      teamId: firstText(data.team_id, data.team),
      gold: firstText(data.gold),
      merit: firstText(data.merit),
      level: firstText(data.level, data.require_level),
      requireLevel: firstText(data.require_level, data.dungeon_enter_limit),
      dailyMax: firstText(data.daily_max),
      rewardText,
      items: firstText(data.items),
      dropItems: firstText(data.drop_item, data.items),
      dropItem: firstText(data.drop_item),
      monsterTeamId: firstText(data.monster_team_id, data.monsters),
      monsters: firstText(data.monsters),
      content: firstText(data.content),
      teamContent: firstText(data.team_content),
      combatId: firstText(data.combat_id),
      hideId: firstText(data.hide_id),
      buyTimesCost: firstText(data.buy_times_cost),
      firstAchieve: firstText(data.first_achieve),
      lastAchieve: firstText(data.last_achieve),
      lastAttackTimes: firstText(data.last_attack_times),
      lastCanBuyTimes: firstText(data.last_can_buy_times),
      hide: firstText(data.Hide),
      raw: data,
    };
  }

  function itemCandidates(item) {
    if (!item) return [];
    const values = [item.itemId, item.id, item.name].filter((value) => lookupValue(value));
    const raw = [];
    for (const value of values) {
      raw.push({ templateId: "item", key: "name", value });
      raw.push({ templateId: "item", key: "item_name", value });
    }
    return uniqueCandidates(raw);
  }

  function itemDetailFromRow(row, match) {
    const data = row?.data || {};
    return {
      templateId: match.templateId,
      matchKey: match.key,
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      itemId: firstText(data.name),
      itemName: firstText(data.item_name, data.name),
      displayName: firstText(data.item_name, data.name),
      name: firstText(data.name),
      quality: firstText(data.quality),
      level: firstText(data.level, data.require_level),
      requireLevel: firstText(data.require_level),
      icon: firstText(data.icon),
      category: firstText(data.caty, data.caty1, data.caty2, data.type),
      caty: firstText(data.caty),
      caty1: firstText(data.caty1),
      caty2: firstText(data.caty2),
      type: firstText(data.type),
      slot: firstText(data.part),
      part: firstText(data.part),
      content: firstText(data.content),
      sellPrice: firstText(data.sell_price),
      acts: firstText(data.acts),
      attach: firstText(data.attach),
      howmuch: firstText(data.howmuch),
      jdLevel: firstText(data.jd_level),
      list: firstText(data.list),
      updateCostBase: firstText(data.upd_cost_base),
      updateCostTime: firstText(data.upd_cost_time),
      raw: data,
    };
  }

  function reviewedItemDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of itemCandidates(options.item)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return itemDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function skillCandidates(skill) {
    if (!skill) return [];
    const raw = [];
    for (const value of [skill.skillId, skill.skill, skill.id]) {
      raw.push({ templateId: "skill", key: "skill", value });
    }
    for (const value of [skill.skillName, skill.skillNname, skill.name]) {
      raw.push({ templateId: "skill", key: "skillNname", value });
    }
    return uniqueCandidates(raw);
  }

  function skillDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "skill",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      skillId: firstText(data.skill),
      skillName: firstText(data.skillNname, data.name),
      displayName: firstText(data.skillNname, data.name, data.skill),
      level: firstText(data.level),
      maxLevel: firstText(data.max_level),
      requireLevel: firstText(data.require_level),
      useCost: firstText(data.use_cost),
      useCaty: firstText(data.use_caty),
      updateCostBase: firstText(data.upd_cost_base),
      updateCostTime: firstText(data.upd_cost_time),
      category: firstText(data.caty, data.caty_2),
      content: firstText(data.content),
      icon: firstText(data.icon),
      acts: firstText(data.acts),
      swfName: firstText(data.swf_name),
      swfMe: firstText(data.swf_me),
      swfTo: firstText(data.swf_to),
      raw: data,
    };
  }

  function reviewedSkillRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "skill").map((row) => skillDetailFromRow(row));
  }

  function reviewedSkillDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of skillCandidates(options.skill)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return skillDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function mapCandidates(map) {
    if (!map) return [];
    const raw = [];
    for (const value of [map.cityId, map.city, map.City]) {
      raw.push({ templateId: "map_xml", key: "city", value });
      raw.push({ templateId: "map_xml", key: "City", value });
    }
    for (const value of [map.cityName, map.name, map.Name]) {
      raw.push({ templateId: "map_xml", key: "cityName", value });
      raw.push({ templateId: "map_xml", key: "Name", value });
    }
    for (const value of [map.bgUrl, map.background]) {
      raw.push({ templateId: "map_xml", key: "bgUrl", value });
    }
    return uniqueCandidates(raw);
  }

  function mapDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "map_xml",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      city: firstText(data.city, data.City),
      cityName: firstText(data.cityName, data.Name),
      bgUrl: firstText(data.bgUrl),
      level: firstText(data.Level),
      open: firstText(data.Open),
      close: firstText(data.Close),
      build: firstText(data.build),
      desc: firstText(data.desc),
      intoLevelLimit: firstText(data.intoLevelLimit),
      nextCityId: firstText(data.nextCityId),
      raw: data,
    };
  }

  function reviewedMapRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "map_xml").map((row) => mapDetailFromRow(row));
  }

  function reviewedMapDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of mapCandidates(options.map)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return mapDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function gatherCandidates(gather) {
    if (!gather) return [];
    return uniqueCandidates([{ templateId: "gather", key: "gather_item", value: gather.gatherItem || gather.gather_item || gather.name }]);
  }

  function gatherDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "gather",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      gatherItem: firstText(data.gather_item),
      raw: data,
    };
  }

  function reviewedGatherRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "gather").map((row) => gatherDetailFromRow(row));
  }

  function reviewedGatherDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of gatherCandidates(options.gather)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return gatherDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function faceCandidates(face) {
    if (!face) return [];
    const raw = [];
    for (const value of [face.icon, face.iconStr, face.iconUrl]) {
      raw.push({ templateId: "face", key: "icon", value });
      raw.push({ templateId: "face", key: "iconStr", value });
      raw.push({ templateId: "face", key: "iconUrl", value });
    }
    return uniqueCandidates(raw);
  }

  function faceDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "face",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      icon: firstText(data.icon),
      iconStr: firstText(data.iconStr),
      iconType: firstText(data.iconType),
      iconUrl: firstText(data.iconUrl),
      raw: data,
    };
  }

  function reviewedFaceRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "face").map((row) => faceDetailFromRow(row));
  }

  function reviewedFaceDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of faceCandidates(options.face)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return faceDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function woyaowanCandidates(item) {
    if (!item) return [];
    const raw = [];
    for (const value of [item.yaoWan, item.yao_wan, item.id]) {
      raw.push({ templateId: "woyaowan", key: "yao_wan", value });
    }
    for (const value of [item.name, item.displayName]) {
      raw.push({ templateId: "woyaowan", key: "name", value });
    }
    for (const value of [item.icon]) {
      raw.push({ templateId: "woyaowan", key: "icon", value });
    }
    return uniqueCandidates(raw);
  }

  function woyaowanDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "woyaowan",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      yaoWan: firstText(data.yao_wan),
      name: firstText(data.name),
      displayName: firstText(data.name, data.yao_wan),
      icon: firstText(data.icon),
      quality: firstText(data.quality),
      stack: firstText(data.stack),
      sellPrice: firstText(data.sell_price),
      content: firstText(data.discribe),
      needRealmLevel: firstText(data.need_realm_level),
      needSuipianNum: firstText(data.need_suipian_num),
      raw: data,
    };
  }

  function reviewedWoyaowanRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "woyaowan").map((row) => woyaowanDetailFromRow(row));
  }

  function reviewedWoyaowanDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of woyaowanCandidates(options.item)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return woyaowanDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function uplevelCandidates(target) {
    if (!target) return [];
    return uniqueCandidates([{ templateId: "uplevel", key: "level", value: target.level }]);
  }

  function uplevelDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "uplevel",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      level: firstText(data.level),
      raw: data,
    };
  }

  function reviewedUplevelRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "uplevel").map((row) => uplevelDetailFromRow(row));
  }

  function reviewedUplevelDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of uplevelCandidates(options.target)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return uplevelDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function sameReviewedValue(left, right) {
    const leftText = lookupValue(left);
    const rightText = lookupValue(right);
    return Boolean(leftText && rightText && leftText === rightText);
  }

  function hiddenFengjingDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "hiddenfengjing",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      cityId: firstText(data.city_id),
      hideId: firstText(data.hide_id),
      tplId: firstText(data.tpl_id),
      item: firstText(data.item),
      needMerit: firstText(data.need_merit),
      needPks: firstText(data.need_pks),
      raw: data,
    };
  }

  function reviewedHiddenFengjingRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "hiddenfengjing").map((row) => hiddenFengjingDetailFromRow(row));
  }

  function reviewedHiddenFengjingDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    const target = options.target || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    const rows = acceptedRows(runtime, payload, "hiddenfengjing");
    const cityId = lookupValue(target.cityId ?? target.city_id);
    const hideId = lookupValue(target.hideId ?? target.hide_id);
    const tplId = lookupValue(target.tplId ?? target.tpl_id);
    const row = rows.find((item) => {
      const data = item?.data || {};
      if (tplId && !sameReviewedValue(data.tpl_id, tplId)) return false;
      if (cityId && !sameReviewedValue(data.city_id, cityId)) return false;
      if (hideId && !sameReviewedValue(data.hide_id, hideId)) return false;
      return Boolean(tplId || (cityId && hideId));
    });
    return row ? hiddenFengjingDetailFromRow(row, { templateId: "hiddenfengjing" }) : null;
  }

  function hideplaceDetailFromRow(row, match = {}) {
    const data = row?.data || {};
    return {
      templateId: match.templateId || "hideplace",
      matchKey: match.key || "",
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      cityId: firstText(data.city_id),
      hideId: firstText(data.hide_id),
      hideName: firstText(data.hide_name),
      displayName: firstText(data.hide_name, data.hide_id),
      bgUrl: firstText(data.bgUrl),
      content: firstText(data.content),
      costYuanbaoOnOpen: firstText(data.cost_yuanbao_on_open),
      requireLevel: firstText(data.require_level),
      type: firstText(data.type),
      raw: data,
    };
  }

  function reviewedHideplaceRows(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return [];
    return acceptedRows(runtime, payload, "hideplace").map((row) => hideplaceDetailFromRow(row));
  }

  function reviewedHideplaceDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    const target = options.hidePlace || options.target || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    const rows = acceptedRows(runtime, payload, "hideplace");
    const cityId = lookupValue(target.cityId ?? target.city_id);
    const hideId = lookupValue(target.hideId ?? target.hide_id);
    const hideName = lookupValue(target.hideName ?? target.hide_name ?? target.name);
    const row = rows.find((item) => {
      const data = item?.data || {};
      if (hideId) {
        if (!sameReviewedValue(data.hide_id, hideId)) return false;
        return cityId ? sameReviewedValue(data.city_id, cityId) : true;
      }
      return Boolean(hideName && sameReviewedValue(data.hide_name, hideName));
    });
    return row ? hideplaceDetailFromRow(row, { templateId: "hideplace" }) : null;
  }

  function partnerCandidates(partner) {
    if (!partner) return [];
    const raw = [];
    for (const value of [partner.displayName, partner.name]) {
      raw.push({ templateId: "partner", key: "partnerName", value });
      raw.push({ templateId: "partner", key: "partner", value });
    }
    if (lookupValue(partner.tplId)) {
      raw.push({ templateId: "partner", key: "partner", value: partner.tplId });
    }
    return uniqueCandidates(raw);
  }

  function partnerDetailFromRow(row, match) {
    const data = row?.data || {};
    return {
      templateId: match.templateId,
      matchKey: match.key,
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      displayName: firstText(data.partnerName, data.partner),
      partnerName: firstText(data.partnerName, data.partner),
      partnerId: firstText(data.partner),
      careerId: firstText(data.career_id),
      quality: firstText(data.quality),
      costType: firstText(data.cost_type),
      costNum: firstText(data.cost_num),
      skills: firstText(data.skills),
      content: firstText(data.content),
      raw: data,
    };
  }

  function fieldMonsterCandidates(step = {}, slot = null) {
    const raw = [];
    const cityId = lookupValue(step.cityId);
    const condition = lookupValue(step.toggleCond || step.condition);
    const event = lookupValue(step.toggleEvt || step.event);
    const sceneKey = lookupValue(step.sceneKey);
    const slotIndex = slot?.index !== undefined ? Number(slot.index) + 1 : "";

    raw.push({ templateId: "fieldmonster", key: "team_id", value: condition });
    raw.push({ templateId: "fieldmonster", key: "monsterGroup", value: condition });
    raw.push({ templateId: "fieldmonster", key: "monsterName", value: condition });
    raw.push({ templateId: "fieldmonster", key: "team_id", value: event });
    if (sceneKey.startsWith("fieldMonster:") && slotIndex) {
      raw.push({ templateId: "fieldmonster", key: "team_id", value: `${sceneKey.slice("fieldMonster:".length)}:${slotIndex}` });
    }
    if (cityId && slotIndex) raw.push({ templateId: "fieldmonster", key: "team_id", value: `${cityId}:${slotIndex}` });
    return uniqueCandidates(raw);
  }

  function fieldMonsterDetailFromRow(row, match) {
    const data = row?.data || {};
    return {
      templateId: match.templateId,
      matchKey: match.key,
      matchValue: lookupValue(match.value),
      rowNumber: row?.rowNumber ?? null,
      evidenceStatus: row?.evidenceStatus || "",
      monsterName: firstText(data.monsterName, data.monster),
      monster: firstText(data.monster),
      monsterGroup: firstText(data.monsterGroup),
      teamId: firstText(data.team_id, data.team),
      cityId: firstText(data.city_id, data.city),
      city: firstText(data.city),
      dungeonId: firstText(data.dungeon_id, data.dungeon),
      dungeonKey: firstText(data.dungeon_key),
      level: firstText(data.level),
      bgUrl: firstText(data.bgUrl),
      action: firstText(data.action),
      autoSetUp: firstText(data.auto_set_up),
      autoStart: firstText(data.auto_start),
      controller: firstText(data.controller),
      getLog: firstText(data.get_log),
      jiacheng: firstText(data.jiacheng),
      module: firstText(data.module),
      team: firstText(data.team),
      time: firstText(data.time),
      raw: data,
    };
  }

  function reviewedFieldMonsterDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of fieldMonsterCandidates(options.step || {}, options.slot || null)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return fieldMonsterDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function reviewedPartnerDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of partnerCandidates(options.partner)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return partnerDetailFromRow(rows[0], candidate);
    }
    return null;
  }

  function reviewedDungeonDetail(options = {}) {
    const runtime = options.runtime || null;
    const payload = options.reviewedPayload || {};
    if (!reviewedEnabled(runtime, options.reviewedMode)) return null;
    for (const candidate of dungeonCandidates(options.chain)) {
      const rows = findRows(runtime, payload, candidate.templateId, candidate.key, candidate.value);
      if (rows.length) return detailFromRow(rows[0], candidate);
    }
    return null;
  }

  window.ApkReviewedRuntimeResolver = {
    reviewedItemDetail,
    reviewedSkillRows,
    reviewedSkillDetail,
    reviewedMapRows,
    reviewedMapDetail,
    reviewedGatherRows,
    reviewedGatherDetail,
    reviewedFaceRows,
    reviewedFaceDetail,
    reviewedWoyaowanRows,
    reviewedWoyaowanDetail,
    reviewedUplevelRows,
    reviewedUplevelDetail,
    reviewedHiddenFengjingRows,
    reviewedHiddenFengjingDetail,
    reviewedHideplaceRows,
    reviewedHideplaceDetail,
    reviewedPartnerDetail,
    reviewedFieldMonsterDetail,
    reviewedDungeonDetail,
    itemCandidates,
    skillCandidates,
    mapCandidates,
    gatherCandidates,
    faceCandidates,
    woyaowanCandidates,
    uplevelCandidates,
    partnerCandidates,
    fieldMonsterCandidates,
    dungeonCandidates,
    fallbackFindRows,
  };
})();
