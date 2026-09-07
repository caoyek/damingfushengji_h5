// SQLite 权威数据库管理模块
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../daming.db');
const db = new Database(dbPath);

// 启用 WAL 模式以获得最佳并发和读写性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * 初始化核心表结构
 */
function initDatabase() {
  db.exec(`
    -- 账号表
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 角色核心属性表 (十维属性 + 货币 + 剧情进度)
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      sex INTEGER DEFAULT 1,
      profession INTEGER DEFAULT 1000,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      max_hp INTEGER DEFAULT 120,
      hp INTEGER DEFAULT 120,
      max_mp INTEGER DEFAULT 50,
      mp INTEGER DEFAULT 50,
      melee INTEGER DEFAULT 10,
      defend INTEGER DEFAULT 5,
      magic INTEGER DEFAULT 0,
      magic_def INTEGER DEFAULT 2,
      speed INTEGER DEFAULT 10,
      hit INTEGER DEFAULT 95,
      dodge INTEGER DEFAULT 5,
      cri INTEGER DEFAULT 5,
      silver INTEGER DEFAULT 100,
      gold INTEGER DEFAULT 0,
      merit INTEGER DEFAULT 0,
      current_city INTEGER DEFAULT 6,
      guide_step INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- 背包道具表
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- 装备实例表 (强化等级与基础属性独立，显式 target_attr)
    CREATE TABLE IF NOT EXISTS equipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      slot_type INTEGER NOT NULL,
      target_attr TEXT NOT NULL,
      howmuch INTEGER NOT NULL,
      strengthen_level INTEGER DEFAULT 0,
      is_equipped INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- 角色技能表 (支持3技能限选出战槽位 1~3)
    CREATE TABLE IF NOT EXISTS role_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      is_equipped INTEGER DEFAULT 0,
      slot_idx INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );

    -- 关卡推进进度表 (记录通关状态与首通记录)
    CREATE TABLE IF NOT EXISTS dungeon_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER NOT NULL,
      dungeon_id INTEGER NOT NULL,
      stage_wave INTEGER NOT NULL,
      pass_times INTEGER DEFAULT 0,
      best_stars INTEGER DEFAULT 3,
      first_passed_at DATETIME,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role_id, dungeon_id, stage_wave),
      FOREIGN KEY (role_id) REFERENCES roles(id)
    );
  `);
}

// 自动初始化
initDatabase();

module.exports = {
  db,
  initDatabase
};
