// 服务端权威战斗推演状态机 (CombatSimulator)
// 严格遵循《服务端数据与战斗推演白皮书》5.4 节防御减免百分比模型与 5.5 节战报契约

const dataLoader = require('./DataLoader');

class CombatSimulator {
  /**
   * 推演完整战斗并生成战报
   * @param {Array} attackerTeam 攻方队员列表
   * @param {Array} defenderTeam 守方队员列表
   * @returns {Object} 包含 winner, rounds, attacker_summary, defender_summary
   */
  simulate(attackerTeam, defenderTeam) {
    // 深拷贝队伍状态以防污染外部数据
    const attackers = attackerTeam.map(u => ({
      ...u,
      is_player: 1,
      current_hp: u.hp !== undefined ? u.hp : u.max_hp,
      current_mp: u.mp !== undefined ? u.mp : u.max_mp
    }));

    const defenders = defenderTeam.map(u => ({
      ...u,
      is_player: 0,
      current_hp: u.hp !== undefined ? u.hp : u.max_hp,
      current_mp: u.mp !== undefined ? u.mp : u.max_mp
    }));

    const rounds = [];
    const MAX_ROUNDS = 30;
    let roundNum = 0;
    let winner = null;

    while (roundNum < MAX_ROUNDS) {
      roundNum++;

      // 1. 筛选存活单位并按速度倒序排列
      const activeUnits = [
        ...attackers.filter(a => a.current_hp > 0),
        ...defenders.filter(d => d.current_hp > 0)
      ].sort((a, b) => {
        if (b.speed !== a.speed) return b.speed - a.speed;
        return a.is_player ? -1 : 1; // 同速攻方先手
      });

      // 2. 依次行动
      for (const actor of activeUnits) {
        if (actor.current_hp <= 0) continue; // 行动前已死亡

        // 确定敌方阵容
        const enemyTeam = actor.is_player ? defenders : attackers;
        const livingEnemies = enemyTeam.filter(e => e.current_hp > 0);

        if (livingEnemies.length === 0) {
          winner = actor.is_player ? 'attacker' : 'defender';
          break;
        }

        // 3. 前排优先索敌原则
        // 假设 pos: 1~3 为前排，4~6 为后排
        let target = livingEnemies.find(e => e.pos <= 3 && e.pos === actor.pos); // 对位前排
        if (!target) {
          target = livingEnemies.find(e => e.pos <= 3); // 任意前排
        }
        if (!target) {
          target = livingEnemies[0]; // 前排全灭后打后排
        }

        // 4. 技能判定 (MP 充足则释放绝招，否则普攻)
        let skillToUse = null;
        let skillBonusDamage = 0;

        if (actor.used_skills && actor.used_skills.length > 0) {
          for (const sId of actor.used_skills) {
            const skillTpl = dataLoader.getSkill(sId);
            if (skillTpl && actor.current_mp >= skillTpl.use_cost) {
              skillToUse = skillTpl;
              actor.current_mp -= skillTpl.use_cost;
              skillBonusDamage = skillTpl.howmuch || 0;
              break;
            }
          }
        }

        // 5. 命中与闪避判定 (上限 98%, 下限 10%)
        const hitRate = Math.min(0.98, Math.max(0.10, ((actor.hit || 95) - (target.dodge || 5) + 90) / 100));
        const isHit = Math.random() <= hitRate;

        let isDodge = 0;
        let isCri = 0;
        let finalDamage = 0;

        if (!isHit) {
          isDodge = 1;
          finalDamage = 0;
        } else {
          // 6. 暴击判定 (上限 75%, 下限 5%)
          const criRate = Math.min(0.75, Math.max(0.05, (actor.cri || 5) / 100));
          isCri = Math.random() <= criRate ? 1 : 0;

          // 7. 防御减免伤害模型
          const effectiveAtk = (actor.melee || 10) + skillBonusDamage;
          const targetDef = target.defend || 0;
          const baseDamage = Math.max(1, effectiveAtk * (100 / (100 + targetDef)));
          const criMultiplier = isCri ? 1.5 : 1.0;
          finalDamage = Math.floor(baseDamage * criMultiplier);

          // 扣血并记录
          target.current_hp = Math.max(0, target.current_hp - finalDamage);
        }

        // 8. 录入单步行动战报
        rounds.push({
          round_num: roundNum,
          attacker: {
            is_player: actor.is_player,
            pos: actor.pos,
            name: actor.name
          },
          skill: {
            id: skillToUse ? skillToUse.id : 0,
            name: skillToUse ? skillToUse.skillNname : '普通攻击'
          },
          target: {
            is_player: target.is_player,
            pos: target.pos,
            name: target.name
          },
          damage: finalDamage,
          is_cri: isCri,
          is_dodge: isDodge,
          target_hp_left: target.current_hp
        });

        // 检查胜负
        if (enemyTeam.every(e => e.current_hp <= 0)) {
          winner = actor.is_player ? 'attacker' : 'defender';
          break;
        }
      }

      if (winner) break;
    }

    if (!winner) {
      // 超过回合上限判守方赢
      winner = 'defender';
    }

    return {
      winner,
      total_rounds: roundNum,
      rounds,
      attackers,
      defenders
    };
  }
}

module.exports = new CombatSimulator();
