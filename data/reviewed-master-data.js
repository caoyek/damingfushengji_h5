window.APK_REVIEWED_MASTER_DATA = {
  "generatedAt": "2026-06-12 12:28:14",
  "sourceManifest": "prototype/apk-ui-preview/data/runtime-master-data-templates/_manifest.json",
  "allowedEvidenceStatuses": [
    "confirmedLocal",
    "externalReviewed"
  ],
  "identityFields": {
    "battle": [
      "att_id",
      "win_id",
      "lost_id",
      "teams",
      "rounds",
      "rewards"
    ],
    "face": [
      "icon",
      "iconUrl",
      "iconStr"
    ],
    "fieldmonster": [
      "monsterName",
      "team_id",
      "city_id",
      "monsterGroup"
    ],
    "fightroad_xml": [
      "dungeon_id",
      "dungeon_key",
      "team_id",
      "missionName"
    ],
    "gather": [
      "gather_item"
    ],
    "hidden_dungeon": [
      "dungeon_id",
      "dungeon_key",
      "team_id",
      "name"
    ],
    "hiddenfengjing": [
      "tpl_id",
      "city_id",
      "hide_id"
    ],
    "hideplace": [
      "hide_id",
      "hide_name",
      "city_id"
    ],
    "item": [
      "name",
      "item_name"
    ],
    "map_xml": [
      "city",
      "cityName",
      "Name",
      "bgUrl"
    ],
    "partner": [
      "partnerName",
      "partner",
      "career_id"
    ],
    "skill": [
      "skill",
      "skillNname",
      "level"
    ],
    "uplevel": [
      "level"
    ],
    "woyaowan": [
      "yao_wan",
      "name",
      "icon"
    ]
  },
  "summary": {
    "templateCount": 14,
    "acceptedRows": 0,
    "skippedRows": 0,
    "rejectedRows": 0,
    "statusCounts": {}
  },
  "templates": [
    {
      "id": "item",
      "title": "Item master / inventory item JSON",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/item.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "acts",
        "attach",
        "caty",
        "caty1",
        "caty2",
        "content",
        "howmuch",
        "icon",
        "item_name",
        "jd_level",
        "level",
        "list",
        "name",
        "part",
        "quality",
        "require_level",
        "sell_price",
        "type",
        "upd_cost_base",
        "upd_cost_time"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "partner",
      "title": "Partner/general master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/partner.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "career_id",
        "content",
        "cost_num",
        "cost_type",
        "partner",
        "partnerName",
        "quality",
        "skills"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "fieldmonster",
      "title": "Field monster master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/fieldmonster.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "action",
        "auto_set_up",
        "auto_start",
        "bgUrl",
        "city",
        "city_id",
        "controller",
        "dungeon",
        "dungeon_id",
        "dungeon_key",
        "get_log",
        "jiacheng",
        "level",
        "module",
        "monster",
        "monsterGroup",
        "monsterName",
        "team",
        "team_id",
        "time"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "hidden_dungeon",
      "title": "Hidden dungeon / dungeon team master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/hidden_dungeon.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "Hide",
        "buy_times_cost",
        "combat_id",
        "content",
        "daily_max",
        "drop_item",
        "dungeon_enter_limit",
        "dungeon_id",
        "dungeon_key",
        "first_achieve",
        "gold",
        "hide_id",
        "items",
        "last_achieve",
        "last_attack_times",
        "last_can_buy_times",
        "level",
        "merit",
        "monsterName",
        "monster_image_url",
        "monster_team_id",
        "monsters",
        "name",
        "require_level",
        "reward",
        "team",
        "team_content",
        "team_id"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "fightroad_xml",
      "title": "FightRoad/FightRoadLayout XML master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/fightroad_xml.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "a",
        "bgUrl",
        "city",
        "dungeon_id",
        "dungeon_key",
        "group",
        "layout",
        "level",
        "missionName",
        "monster",
        "team_id",
        "text",
        "tips_content"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "battle",
      "title": "Battle result/reward payload",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/battle.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "att_id",
        "caty",
        "data",
        "is_have_weapon",
        "level",
        "lost_id",
        "max_hp",
        "name",
        "pinfoForce",
        "quality",
        "rewards",
        "rounds",
        "see_result_button_state",
        "shuxing",
        "skills",
        "teams",
        "tpl_id",
        "weapon_type",
        "win_id"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "map_xml",
      "title": "Map/MapInside XML master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/map_xml.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "City",
        "Close",
        "Level",
        "Name",
        "Open",
        "bgUrl",
        "build",
        "city",
        "cityName",
        "desc",
        "intoLevelLimit",
        "nextCityId"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "gather",
      "title": "Gather item master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/gather.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "gather_item"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "skill",
      "title": "Skill master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/skill.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "act_target",
        "act_type",
        "acts",
        "attack_num",
        "buff_icon",
        "caty",
        "caty_2",
        "content",
        "howmuch",
        "icon",
        "is_baifenbi",
        "is_full",
        "is_remote",
        "is_shock",
        "level",
        "max_level",
        "member_shuxing",
        "require_level",
        "select_type",
        "shuxing_att",
        "shuxing_def",
        "skill",
        "skillNname",
        "swf_me",
        "swf_name",
        "swf_to",
        "target",
        "turn",
        "turn_up",
        "unique_buff_id",
        "up_base",
        "up_i",
        "upd_cost_base",
        "upd_cost_time",
        "use_caty",
        "use_cost",
        "wuzhong_limit"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "face",
      "title": "Face/avatar icon master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/face.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "icon",
        "iconStr",
        "iconType",
        "iconUrl"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "woyaowan",
      "title": "WoYaoWan/Ball item master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/woyaowan.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "discribe",
        "exp_add_after_lv_ten",
        "exp_di_shu",
        "gai_lv_caty",
        "icon",
        "name",
        "need_realm_level",
        "need_suipian_num",
        "quality",
        "rate",
        "sell_price",
        "shuxing_caty",
        "shuxing_num",
        "stack",
        "up_i",
        "yao_wan"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "uplevel",
      "title": "Level-up master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/uplevel.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "level"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "hiddenfengjing",
      "title": "Hidden scenery/dungeon condition master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/hiddenfengjing.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "city_id",
        "hide_id",
        "item",
        "need_merit",
        "need_pks",
        "tpl_id"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    },
    {
      "id": "hideplace",
      "title": "Hide place master data",
      "file": "prototype/apk-ui-preview/data/runtime-master-data-templates/hideplace.csv",
      "headers": [
        "source_url",
        "source_title",
        "capture_path",
        "evidence_status",
        "confidence",
        "notes",
        "bgUrl",
        "city_id",
        "content",
        "cost_yuanbao_on_open",
        "hide_id",
        "hide_name",
        "require_level",
        "type"
      ],
      "acceptedRows": [],
      "skippedRows": [],
      "rejectedRows": [],
      "statusCounts": {},
      "summary": {
        "accepted": 0,
        "skipped": 0,
        "rejected": 0
      }
    }
  ]
};
