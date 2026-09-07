// 服务端 RESTful API 业务路由
const express = require('express');
const router = express.Router();
const { db } = require('./db/database');
const dataLoader = require('./services/DataLoader');
const combatSimulator = require('./services/CombatSimulator');

/**
 * 辅助函数：计算角色加上所有已穿戴装备后的实时属性
 */
function getRoleWithEquipStats(roleId) {
  const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(roleId);
  if (!role) return null;

  const equippedItems = db.prepare('SELECT * FROM equipments WHERE role_id = ? AND is_equipped = 1').all(roleId);

  const stats = { ...role };
  // 累加装备加成: 实时属性 = howmuch + strengthen_level * up_base (第一阶段初始为0)
  for (const eq of equippedItems) {
    const attr = eq.target_attr;
    const bonus = eq.howmuch + (eq.strengthen_level || 0) * 2;
    if (attr === 'melee') stats.melee += bonus;
    else if (attr === 'defend') stats.defend += bonus;
    else if (attr === 'speed') stats.speed += bonus;
    else if (attr === 'max_hp') {
      stats.max_hp += bonus;
      stats.hp += bonus;
    }
  }

  const inventory = db.prepare('SELECT * FROM inventory WHERE role_id = ?').all(roleId);
  const allEquipments = db.prepare('SELECT * FROM equipments WHERE role_id = ?').all(roleId);
  const skills = db.prepare('SELECT * FROM role_skills WHERE role_id = ?').all(roleId);
  const progress = db.prepare('SELECT * FROM dungeon_progress WHERE role_id = ?').all(roleId);

  return {
    role: stats,
    base_role: role,
    inventory,
    equipments: allEquipments,
    skills,
    dungeon_progress: progress
  };
}

// 1. 登录选服接口
router.post('/login', (req, res) => {
  try {
    const { username } = req.body;
    const finalUser = (username && username.trim()) ? username.trim() : 'daming_hero';

    let user = db.prepare('SELECT * FROM users WHERE username = ?').get(finalUser);
    if (!user) {
      const info = db.prepare('INSERT INTO users (username) VALUES (?)').run(finalUser);
      user = { id: info.lastInsertRowid, username: finalUser };
    }

    const role = db.prepare('SELECT id FROM roles WHERE user_id = ?').get(user.id);
    if (!role) {
      return res.json({ success: true, user, has_role: false });
    }

    const fullData = getRoleWithEquipStats(role.id);
    return res.json({ success: true, user, has_role: true, ...fullData });
  } catch (err) {
    console.error('[API /login 错误]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. 随机起名接口
router.post('/role/random-name', (req, res) => {
  try {
    const name = dataLoader.getRandomName();
    res.json({ success: true, name });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. 创角起名接口
router.post('/role/create', (req, res) => {
  try {
    const { user_id, name, sex } = req.body;
    if (!user_id || !name) {
      return res.status(400).json({ success: false, message: '参数缺失' });
    }

    const exist = db.prepare('SELECT id FROM roles WHERE user_id = ?').get(user_id);
    if (exist) {
      return res.status(400).json({ success: false, message: '该账号已创建角色' });
    }

    // 创角事务
    const createTx = db.transaction(() => {
      const roleInsert = db.prepare(`
        INSERT INTO roles (
          user_id, name, sex, profession, level, exp,
          max_hp, hp, max_mp, mp, melee, defend, magic, magic_def,
          speed, hit, dodge, cri, silver, gold, merit,
          current_city, guide_step
        ) VALUES (
          ?, ?, ?, 1000, 1, 0,
          120, 120, 50, 50, 10, 5, 0, 2,
          10, 95, 5, 5, 100, 0, 0,
          6, 1
        )
      `).run(user_id, name.trim(), Number(sex) || 1);

      const roleId = roleInsert.lastInsertRowid;

      // 默认装配技能 1001 暗界波
      db.prepare(`
        INSERT INTO role_skills (role_id, skill_id, skill_name, level, is_equipped, slot_idx)
        VALUES (?, 1001, '暗界波', 1, 1, 1)
      `).run(roleId);

      return roleId;
    });

    const newRoleId = createTx();
    const fullData = getRoleWithEquipStats(newRoleId);
    res.json({ success: true, ...fullData });
  } catch (err) {
    console.error('[API /role/create 错误]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. 获取角色信息接口 (F5 刷新恢复数据入口)
router.post('/role/info', (req, res) => {
  try {
    const { role_id } = req.body;
    if (!role_id) return res.status(400).json({ success: false, message: '缺少 role_id' });

    const fullData = getRoleWithEquipStats(role_id);
    if (!fullData) return res.status(404).json({ success: false, message: '角色不存在' });

    res.json({ success: true, ...fullData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5. NPC 剧情对话 (二婶子身世交代与获赠一星晾衣杆)
router.post('/story/talk', (req, res) => {
  try {
    const { role_id, npc_id } = req.body;
    if (!role_id) return res.status(400).json({ success: false, message: '缺少 role_id' });

    const role = db.prepare('SELECT * FROM roles WHERE id = ?').get(role_id);
    if (!role) return res.status(404).json({ success: false, message: '角色不存在' });

    if (npc_id === 'ershenzi') {
      let rewardItem = null;
      if (role.guide_step < 4) {
        // 首次对话：赠送一星晾衣杆
        const tx = db.transaction(() => {
          // 插入装备表 (slot_type: 1 武器, howmuch: 15)
          const eqInsert = db.prepare(`
            INSERT INTO equipments (role_id, item_id, item_name, slot_type, target_attr, howmuch, strengthen_level, is_equipped)
            VALUES (?, 1002, '一星晾衣杆', 1, 'melee', 15, 0, 0)
          `).run(role_id);

          // 更新主线引导至第 4 步 (穿戴装备引导)
          db.prepare('UPDATE roles SET guide_step = 4 WHERE id = ?').run(role_id);

          rewardItem = {
            id: eqInsert.lastInsertRowid,
            item_id: 1002,
            item_name: '一星晾衣杆',
            target_attr: 'melee',
            howmuch: 15
          };
        });
        tx();

        const fullData = getRoleWithEquipStats(role_id);
        return res.json({
          success: true,
          dialog: '儿啊！大事不好了！你义父被东厂锦衣卫秘密抓去广州天牢了！这是咱家祖传的【一星晾衣杆】，你快快带上防身出城救人！',
          reward_item: rewardItem,
          ...fullData
        });
      } else {
        return res.json({
          success: true,
          dialog: '儿啊，快穿上晾衣杆，出城找小翠领路去广州救义父吧！',
          ...getRoleWithEquipStats(role_id)
        });
      }
    }

    res.json({ success: true, dialog: '你好，大明浮生客！' });
  } catch (err) {
    console.error('[API /story/talk 错误]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6. 穿戴装备接口
router.post('/equip/wear', (req, res) => {
  try {
    const { role_id, equip_id } = req.body;
    if (!role_id || !equip_id) return res.status(400).json({ success: false, message: '参数缺失' });

    const equip = db.prepare('SELECT * FROM equipments WHERE id = ? AND role_id = ?').get(equip_id, role_id);
    if (!equip) return res.status(404).json({ success: false, message: '装备不存在' });

    const tx = db.transaction(() => {
      // 卸下同槽位已穿装备
      db.prepare('UPDATE equipments SET is_equipped = 0 WHERE role_id = ? AND slot_type = ?').run(role_id, equip.slot_type);
      // 穿上目标装备
      db.prepare('UPDATE equipments SET is_equipped = 1 WHERE id = ?').run(equip_id);
      // 若是晾衣杆且在引导第 4 步，推进至第 5 步 (出城通道)
      db.prepare('UPDATE roles SET guide_step = MAX(guide_step, 5) WHERE id = ?').run(role_id);
    });
    tx();

    const fullData = getRoleWithEquipStats(role_id);
    res.json({ success: true, message: `成功穿戴【${equip.item_name}】！`, ...fullData });
  } catch (err) {
    console.error('[API /equip/wear 错误]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 7. 发起关卡战斗与战报推演接口
router.post('/dungeon/fight', (req, res) => {
  try {
    const { role_id, dungeon_id = 0, stage_wave } = req.body;
    const wave = Number(stage_wave);
    if (!role_id || !wave) return res.status(400).json({ success: false, message: '参数缺失' });

    const roleData = getRoleWithEquipStats(role_id);
    if (!roleData) return res.status(404).json({ success: false, message: '角色不存在' });

    const stageConfig = dataLoader.getStage(dungeon_id, wave);
    if (!stageConfig) return res.status(404).json({ success: false, message: '关卡波次未定义' });

    // 前置关卡检查
    if (wave > 1) {
      const prevPass = db.prepare('SELECT pass_times FROM dungeon_progress WHERE role_id = ? AND dungeon_id = ? AND stage_wave = ?').get(role_id, dungeon_id, wave - 1);
      if (!prevPass || prevPass.pass_times <= 0) {
        return res.status(400).json({ success: false, message: `请先击溃前一关恶霸！` });
      }
    }

    // 构建攻方队员阵容 (主角站在 2 号位，默认配置技能 1001 暗界波)
    const attackerTeam = [
      {
        id: roleData.role.id,
        name: roleData.role.name,
        pos: 2,
        hp: roleData.role.hp,
        max_hp: roleData.role.max_hp,
        mp: roleData.role.mp,
        max_mp: roleData.role.max_mp,
        melee: roleData.role.melee,
        defend: roleData.role.defend,
        speed: roleData.role.speed,
        hit: roleData.role.hit,
        dodge: roleData.role.dodge,
        cri: roleData.role.cri,
        used_skills: [1001]
      }
    ];

    // 构建守方队伍 (从 monster_templates.json 抓取怪物十维属性)
    const defenderTeam = stageConfig.monsters.map(mConf => {
      const mTpl = dataLoader.getMonster(mConf.monster_id);
      const attr = mTpl.shuxing || {};
      return {
        id: mTpl.monster_id,
        name: mTpl.name,
        pos: mConf.formation_pos || mConf.pos || 2,
        hp: mTpl.max_hp,
        max_hp: mTpl.max_hp,
        mp: mTpl.mp || 30,
        max_mp: mTpl.mp || 30,
        melee: attr.melee || 10,
        defend: attr.defend || 5,
        speed: attr.speed || 8,
        hit: attr.hit || 95,
        dodge: attr.dodge || 5,
        cri: attr.cri || 5,
        used_skills: mTpl.used_skills || []
      };
    });

    // 执行推演
    const battleResult = combatSimulator.simulate(attackerTeam, defenderTeam);

    let rewards = null;

    if (battleResult.winner === 'attacker') {
      // 战胜，在同一 SQLite 事务中结算掉落与发奖
      const settleTx = db.transaction(() => {
        const prog = db.prepare('SELECT pass_times FROM dungeon_progress WHERE role_id = ? AND dungeon_id = ? AND stage_wave = ?').get(role_id, dungeon_id, wave);
        const isFirstPass = !prog || prog.pass_times === 0;

        // 基础掉落与经验数值 (严格统一对齐白皮书与 baseline)
        let addExp = 40;
        let addSilver = 60;
        let addMerit = 15;
        let droppedEquip = null;

        if (wave === 1) {
          addExp = 40; addSilver = 60; addMerit = 15;
          if (isFirstPass) {
            // 掉落粗麻衣
            const eTpl = dataLoader.getEquip(1001);
            const ins = db.prepare(`
              INSERT INTO equipments (role_id, item_id, item_name, slot_type, target_attr, howmuch, strengthen_level, is_equipped)
              VALUES (?, 1001, '粗麻衣', 2, 'defend', 8, 0, 0)
            `).run(role_id);
            droppedEquip = { id: ins.lastInsertRowid, ...eTpl };
          }
        } else if (wave === 2) {
          addExp = 80; addSilver = 100; addMerit = 20;
          if (isFirstPass) {
            // 掉落粗麻草鞋
            const eTpl = dataLoader.getEquip(1003);
            const ins = db.prepare(`
              INSERT INTO equipments (role_id, item_id, item_name, slot_type, target_attr, howmuch, strengthen_level, is_equipped)
              VALUES (?, 1003, '粗麻草鞋', 3, 'speed', 5, 0, 0)
            `).run(role_id);
            droppedEquip = { id: ins.lastInsertRowid, ...eTpl };
          }
        } else if (wave === 3) {
          addExp = 150; addSilver = 200; addMerit = 40;
          if (isFirstPass) {
            // 掉落粗布束带
            const eTpl = dataLoader.getEquip(1004);
            const ins = db.prepare(`
              INSERT INTO equipments (role_id, item_id, item_name, slot_type, target_attr, howmuch, strengthen_level, is_equipped)
              VALUES (?, 1004, '粗布束带', 4, 'max_hp', 50, 0, 0)
            `).run(role_id);
            droppedEquip = { id: ins.lastInsertRowid, ...eTpl };
          }
        }

        // 更新或创建关卡进度
        if (!prog) {
          db.prepare(`
            INSERT INTO dungeon_progress (role_id, dungeon_id, stage_wave, pass_times, best_stars, first_passed_at)
            VALUES (?, ?, ?, 1, 3, CURRENT_TIMESTAMP)
          `).run(role_id, dungeon_id, wave);
        } else {
          db.prepare(`
            UPDATE dungeon_progress SET pass_times = pass_times + 1, updated_at = CURRENT_TIMESTAMP
            WHERE role_id = ? AND dungeon_id = ? AND stage_wave = ?
          `).run(role_id, dungeon_id, wave);
        }

        // 脱战自动回满气血与气力，并累计经验银两
        db.prepare(`
          UPDATE roles SET
            exp = exp + ?,
            silver = silver + ?,
            merit = merit + ?,
            hp = max_hp,
            mp = max_mp,
            guide_step = MAX(guide_step, ?)
          WHERE id = ?
        `).run(addExp, addSilver, addMerit, wave >= 3 ? 7 : 5 + wave, role_id);

        rewards = {
          exp: addExp,
          silver: addSilver,
          merit: addMerit,
          dropped_equip: droppedEquip,
          is_first_pass: isFirstPass
        };
      });

      settleTx();
    } else {
      // 战败：生命恢复为满值无损重试
      db.prepare('UPDATE roles SET hp = max_hp, mp = max_mp WHERE id = ?').run(role_id);
    }

    const updatedData = getRoleWithEquipStats(role_id);

    res.json({
      success: true,
      battle: {
        winner: battleResult.winner,
        total_rounds: battleResult.total_rounds,
        rounds: battleResult.rounds
      },
      rewards,
      ...updatedData
    });
  } catch (err) {
    console.error('[API /dungeon/fight 错误]', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
