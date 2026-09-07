// 服务端静态配置与底表加载中心
const fs = require('fs');
const path = require('path');

class DataLoader {
  constructor() {
    this.skills = new Map();
    this.equips = new Map();
    this.monsters = new Map();
    this.stages = [];
    this.familyNames = [];
    this.givenNames = [];
    this.isLoaded = false;
  }

  loadAll() {
    if (this.isLoaded) return;

    const baselineDir = path.resolve(__dirname, '../../data/baseline');

    // 1. 加载技能模板
    const skillsPath = path.join(baselineDir, 'skill_templates.json');
    if (fs.existsSync(skillsPath)) {
      const skillList = JSON.parse(fs.readFileSync(skillsPath, 'utf-8'));
      skillList.forEach(s => this.skills.set(Number(s.id), s));
    }

    // 2. 加载装备模板
    const equipsPath = path.join(baselineDir, 'equip_templates.json');
    if (fs.existsSync(equipsPath)) {
      const equipList = JSON.parse(fs.readFileSync(equipsPath, 'utf-8'));
      equipList.forEach(e => this.equips.set(Number(e.item_id), e));
    }

    // 3. 加载怪物模板
    const monstersPath = path.join(baselineDir, 'monster_templates.json');
    if (fs.existsSync(monstersPath)) {
      const monsterList = JSON.parse(fs.readFileSync(monstersPath, 'utf-8'));
      monsterList.forEach(m => this.monsters.set(Number(m.monster_id), m));
    }

    // 4. 加载关卡模板
    const stagesPath = path.join(baselineDir, 'dungeon_stages.json');
    if (fs.existsSync(stagesPath)) {
      this.stages = JSON.parse(fs.readFileSync(stagesPath, 'utf-8'));
    }

    // 5. 加载百家姓起名库
    const roleInfoPath = path.resolve(__dirname, '../../../extracted_full_resources/server_data/tables_csv/CreateRoleInfo.csv');
    if (fs.existsSync(roleInfoPath)) {
      const lines = fs.readFileSync(roleInfoPath, 'utf-8').split(/\r?\n/);
      for (const line of lines) {
        if (!line.trim()) continue;
        const commaIdx = line.indexOf(',');
        if (commaIdx === -1) continue;
        const type = line.slice(0, commaIdx).trim();
        const val = line.slice(commaIdx + 1).trim();
        if (type === '0') {
          this.familyNames = val.split('+').map(s => s.trim()).filter(Boolean);
        } else if (type === '1') {
          this.givenNames = val.split('+').map(s => s.trim()).filter(Boolean);
        }
      }
    }

    // 兜底起名库（若外部文件未就位）
    if (this.familyNames.length === 0) {
      this.familyNames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '诸葛', '令狐', '欧阳'];
    }
    if (this.givenNames.length === 0) {
      this.givenNames = ['无忌', '傲天', '晓风', '残月', '小宝', '翠儿', '流云', '铁柱', '青青'];
    }

    this.isLoaded = true;
    console.log(`[DataLoader] 静态配置加载完毕: 技能 ${this.skills.size} 个, 装备 ${this.equips.size} 个, 怪物 ${this.monsters.size} 个, 关卡 ${this.stages.length} 波次, 姓氏 ${this.familyNames.length} 个, 名字 ${this.givenNames.length} 个`);
  }

  getRandomName() {
    this.loadAll();
    const family = this.familyNames[Math.floor(Math.random() * this.familyNames.length)];
    // 50% 概率单字名，50% 概率双字名
    if (Math.random() > 0.5) {
      const g1 = this.givenNames[Math.floor(Math.random() * this.givenNames.length)];
      const g2 = this.givenNames[Math.floor(Math.random() * this.givenNames.length)];
      return `${family}${g1}${g2}`;
    } else {
      const g = this.givenNames[Math.floor(Math.random() * this.givenNames.length)];
      return `${family}${g}`;
    }
  }

  getSkill(id) {
    this.loadAll();
    return this.skills.get(Number(id));
  }

  getEquip(id) {
    this.loadAll();
    return this.equips.get(Number(id));
  }

  getMonster(id) {
    this.loadAll();
    return this.monsters.get(Number(id));
  }

  getStage(dungeonId, wave) {
    this.loadAll();
    return this.stages.find(s => s.dungeon_id === Number(dungeonId) && s.stage_wave === Number(wave));
  }
}

// 单例导出
module.exports = new DataLoader();
