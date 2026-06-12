(function () {
  const params = new URLSearchParams(window.location.search);
  const enabled = params.get("backend") === "1" || Boolean(window.APK_BACKEND_URL);
  if (!enabled) return;

  const baseUrl = String(window.APK_BACKEND_URL || "").replace(/\/$/, "");
  const reviewedMode = params.get("reviewed") === "1";
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
  const status = {
    enabled: true,
    ok: false,
    error: "",
    baseUrl: baseUrl || "same-origin",
  };
  window.ApkBackendStatus = status;

  let state = null;
  let reviewedPayload = { summary: {}, templates: [], identityFields: {} };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function request(method, route, body) {
    const xhr = new XMLHttpRequest();
    xhr.open(method, `${baseUrl}${route}`, false);
    xhr.setRequestHeader("accept", "application/json");
    if (body !== undefined) xhr.setRequestHeader("content-type", "application/json");
    xhr.send(body === undefined ? null : JSON.stringify(body));

    let payload = null;
    try {
      payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
    } catch (error) {
      throw new Error(`Invalid backend JSON from ${route}`);
    }

    if (xhr.status < 200 || xhr.status >= 300 || payload?.ok === false) {
      throw new Error(payload?.error || `${route} returned ${xhr.status}`);
    }
    return payload;
  }

  function setError(error) {
    status.ok = false;
    status.error = error?.message || String(error || "backend unavailable");
  }

  function setOk() {
    status.ok = true;
    status.error = "";
  }

  function refresh() {
    try {
      const payload = request("GET", "/api/state");
      state = payload.state || null;
      setOk();
    } catch (error) {
      state = null;
      setError(error);
    }
    return snapshot();
  }

  function refreshReviewedMasterData() {
    try {
      const payload = request("GET", "/api/reviewed-master-data");
      reviewedPayload = {
        summary: payload.summary || {},
        templates: payload.templates || [],
        allowedEvidenceStatuses: payload.allowedEvidenceStatuses || [],
        identityFields: payload.identityFields || {},
      };
      setOk();
    } catch (error) {
      reviewedPayload = { summary: {}, templates: [], identityFields: {} };
      setError(error);
    }
    return clone(reviewedPayload);
  }

  function call(route, body) {
    try {
      const payload = request("POST", route, body || {});
      state = payload.state || null;
      setOk();
    } catch (error) {
      setError(error);
    }
    return snapshot();
  }

  function snapshot() {
    return clone(state);
  }

  try {
    request("GET", "/api/health");
    refreshReviewedMasterData();
    refresh();
  } catch (error) {
    setError(error);
  }

  function reviewedTemplates() {
    return Array.isArray(reviewedPayload.templates) ? reviewedPayload.templates : [];
  }

  function reviewedMasterDataSummary() {
    const summary = reviewedPayload.summary || {};
    const templates = reviewedTemplates();
    return {
      enabled: reviewedMode,
      templateCount: Number(summary.templateCount || templates.length || 0),
      acceptedRows: Number(summary.acceptedRows || 0),
      skippedRows: Number(summary.skippedRows || 0),
      rejectedRows: Number(summary.rejectedRows || 0),
      templateIds: summary.templateIds || templates.map((template) => template.id),
    };
  }

  function reviewedMasterDataTemplate(templateId) {
    const template = reviewedTemplates().find((candidate) => candidate.id === templateId);
    return template ? clone(template) : null;
  }

  function reviewedMasterDataRows(templateId) {
    const template = reviewedMasterDataTemplate(templateId);
    if (!template) return [];
    return clone({
      acceptedRows: template.acceptedRows || [],
      skippedRows: template.skippedRows || [],
      rejectedRows: template.rejectedRows || [],
    });
  }

  function reviewedIdentityFields(templateId) {
    const identityFields = reviewedPayload.identityFields || {};
    const fields = identityFields[templateId] || DEFAULT_REVIEWED_IDENTITY_FIELDS[templateId] || [];
    return Array.isArray(fields) ? fields.filter(Boolean) : [];
  }

  function reviewedAcceptedRows(templateId) {
    const template = reviewedMasterDataTemplate(templateId);
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

  window.ApkRuntime = {
    createRole: (options) => call("/api/role/create", options),
    generateRoleName: () => call("/api/role/random-name", {}),
    selectRoleSex: (sex) => call("/api/role/select-sex", { sex }),
    applyRookieStep: (step) => call("/api/rookie/apply-step", { step }),
    equipItem: (itemId) => call("/api/inventory/equip", { itemId }),
    startBattle: (payload) => call("/api/battle/start", payload),
    finishBattle: (options = {}) => call("/api/battle/finish", options),
    selectProfession: (professionId, buttonName = "") =>
      call("/api/profession/select", { professionId, buttonName }),
    confirmProfession: () => call("/api/profession/confirm", {}),
    refreshRecruitPool: () => call("/api/recruit/refresh", {}),
    selectRecruitCandidate: (index = 0) => call("/api/recruit/select", { index }),
    recruitGeneral: () => call("/api/recruit/confirm", {}),
    reviewedDataEnabled: () => reviewedMode,
    reviewedMasterDataSummary,
    reviewedMasterDataIndexSummary,
    reviewedMasterDataTemplate,
    reviewedMasterDataRows,
    reviewedMasterDataAcceptedRows,
    reviewedMasterDataFind,
    refreshReviewedMasterData,
    reset: () => call("/api/session/reset", {}),
    snapshot,
  };
})();
