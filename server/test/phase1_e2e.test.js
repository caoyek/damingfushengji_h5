// 《大明浮生记》第一阶段端到端全链路自动化测试 (TC-01 ~ TC-10)
const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:3000/api';

async function post(endpoint, data = {}) {
  const resp = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return await resp.json();
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 开始执行第一阶段 (Phase 1) 自动化全链路验收测试...');
  console.log('====================================================');

  const testUser = `test_hero_${Date.now()}`;
  let userId = null;
  let roleId = null;

  // TC-01: 登录选服 (新账号未创角)
  console.log('\n[TC-01] 测试登录选服与新玩家检测...');
  const loginRes = await post('/login', { username: testUser });
  assert.strictEqual(loginRes.success, true, '登录请求应成功');
  assert.strictEqual(loginRes.has_role, false, '新用户应无角色存档');
  assert.ok(loginRes.user.id, '应分配 user_id');
  userId = loginRes.user.id;
  console.log('✅ TC-01 通过: 登录成功，用户 ID =', userId);

  // TC-02: 随机百家姓起名
  console.log('\n[TC-02] 测试从 CreateRoleInfo.csv 抽取百家姓起名...');
  const nameRes = await post('/role/random-name');
  assert.strictEqual(nameRes.success, true);
  assert.ok(nameRes.name && nameRes.name.length >= 2, '随机名字格式正确');
  const roleName = nameRes.name;
  console.log('✅ TC-02 通过: 随机古风姓名生成成功 =', roleName);

  // TC-03: 创角入库与初始十维属性检查
  console.log('\n[TC-03] 测试创角入库与初始十维属性契约...');
  const createRes = await post('/role/create', { user_id: userId, name: roleName, sex: 1 });
  assert.strictEqual(createRes.success, true);
  const r = createRes.role;
  assert.strictEqual(r.name, roleName);
  assert.strictEqual(r.level, 1, '初始等级应为 1');
  assert.strictEqual(r.max_hp, 120, '气血上限应为 120');
  assert.strictEqual(r.hp, 120, '当前生命应满');
  assert.strictEqual(r.max_mp, 50, '气力上限应为 50');
  assert.strictEqual(r.mp, 50, '当前气力应满');
  assert.strictEqual(r.melee, 10, '基础物理攻击应为 10');
  assert.strictEqual(r.defend, 5, '基础物理防御应为 5');
  assert.strictEqual(r.speed, 10, '基础速度应为 10');
  assert.strictEqual(r.current_city, 6, '初始场景应为 6 号新手村');
  assert.strictEqual(createRes.skills.length, 1, '初始应学会技能');
  assert.strictEqual(createRes.skills[0].skill_id, 1001, '初始技能应为暗界波');
  assert.strictEqual(createRes.skills[0].is_equipped, 1, '暗界波默认装配在出战槽 1');
  roleId = r.id;
  console.log('✅ TC-03 通过: 创角属性与暗界波装配 100% 吻合白皮书！');

  // TC-04: 查询角色信息 (模拟 F5 刷新)
  console.log('\n[TC-04] 测试读取 SQLite 断点恢复 (F5 刷新)...');
  const infoRes = await post('/role/info', { role_id: roleId });
  assert.strictEqual(infoRes.success, true);
  assert.strictEqual(infoRes.role.id, roleId);
  console.log('✅ TC-04 通过: SQLite 断点读取精准一致！');

  // TC-05: 二婶子 NPC 剧情对话
  console.log('\n[TC-05] 测试二婶子 NPC 剧情对话并获赠一星晾衣杆...');
  const talkRes = await post('/story/talk', { role_id: roleId, npc_id: 'ershenzi' });
  assert.strictEqual(talkRes.success, true);
  assert.ok(talkRes.reward_item, '应获赠祖传武器');
  assert.strictEqual(talkRes.reward_item.item_id, 1002, '获赠武器应为一星晾衣杆');
  assert.strictEqual(talkRes.reward_item.howmuch, 15, '晾衣杆攻击加成应为 15');
  assert.strictEqual(talkRes.role.guide_step, 4, '引导步数推进至第 4 步');
  const weaponEquipId = talkRes.reward_item.id;
  console.log('✅ TC-05 通过: 成功获得一星晾衣杆 (装备ID: ' + weaponEquipId + ')');

  // TC-06: 穿戴装备
  console.log('\n[TC-06] 测试打开角色面板穿戴一星晾衣杆...');
  const wearRes = await post('/equip/wear', { role_id: roleId, equip_id: weaponEquipId });
  assert.strictEqual(wearRes.success, true);
  assert.strictEqual(wearRes.role.melee, 25, '穿戴晾衣杆后物理攻击力应由 10 跃升为 25 (10+15)');
  console.log('✅ TC-06 通过: 装备属性穿戴生效，物攻 10 -> 25！');

  // TC-07: 发起关卡 0-1 战斗 (市井流氓)
  console.log('\n[TC-07] 测试关卡 0-1 (市井流氓) 九宫格实机推演...');
  const fight1 = await post('/dungeon/fight', { role_id: roleId, dungeon_id: 0, stage_wave: 1 });
  assert.strictEqual(fight1.success, true);
  assert.strictEqual(fight1.battle.winner, 'attacker', '主角必须战胜市井流氓');
  assert.ok(fight1.battle.rounds.length >= 1, '应有有效战报回合');
  // 验证战报字段
  const firstRound = fight1.battle.rounds[0];
  assert.ok('attacker' in firstRound && 'target' in firstRound && 'damage' in firstRound && 'is_cri' in firstRound);
  assert.strictEqual(firstRound.skill.name, '暗界波', '首回合主角应释放暗界波');
  // 验证奖励
  assert.strictEqual(fight1.rewards.exp, 40, '首战应奖励 40 经验');
  assert.strictEqual(fight1.rewards.silver, 60, '首战应奖励 60 银两');
  assert.strictEqual(fight1.rewards.merit, 15, '首战应奖励 15 战功');
  assert.ok(fight1.rewards.dropped_equip, '首通必掉粗麻衣');
  assert.strictEqual(fight1.rewards.dropped_equip.item_id, 1001);
  console.log('✅ TC-07 通过: 首战 2 回合暗界波克敌，奖励经验40/银两60/战功15，首通掉落粗麻衣！');

  // TC-08: 验证脱战生命与气力自动回满
  console.log('\n[TC-08] 测试关卡间脱战回满机制...');
  assert.strictEqual(fight1.role.hp, fight1.role.max_hp, '战斗脱战后生命必须回满');
  assert.strictEqual(fight1.role.mp, fight1.role.max_mp, '战斗脱战后气力必须回满');
  console.log('✅ TC-08 通过: 脱战回满生命 120/120，气力 50/50！');

  // TC-09: 连续挑战关卡 0-2 (地痞打手) 与 0-3 (恶霸头目)
  console.log('\n[TC-09] 测试挑战关卡 0-2 与 0-3 恶霸据点全通...');
  // 玩家穿戴 0-1 掉落的粗麻衣 (+8防)
  const wearCoat = await post('/equip/wear', { role_id: roleId, equip_id: fight1.rewards.dropped_equip.id });
  assert.strictEqual(wearCoat.role.defend, 13, '穿戴粗麻衣后物防应由 5 提升至 13 (5+8)');

  const fight2 = await post('/dungeon/fight', { role_id: roleId, dungeon_id: 0, stage_wave: 2 });
  assert.strictEqual(fight2.battle.winner, 'attacker');
  assert.strictEqual(fight2.rewards.dropped_equip.item_id, 1003, '0-2 首通必掉粗麻草鞋');

  // 玩家穿戴 0-2 掉落的粗麻草鞋 (+5速)
  const wearShoes = await post('/equip/wear', { role_id: roleId, equip_id: fight2.rewards.dropped_equip.id });
  assert.strictEqual(wearShoes.role.speed, 15, '穿戴草鞋后速度应由 10 提升至 15 (10+5)');

  // 挑战恶霸头目
  const fight3 = await post('/dungeon/fight', { role_id: roleId, dungeon_id: 0, stage_wave: 3 });
  assert.strictEqual(fight3.battle.winner, 'attacker', '装备齐全的主角成功击败恶霸头目！');
  assert.strictEqual(fight3.rewards.dropped_equip.item_id, 1004, '0-3 首通必掉粗布束带');
  assert.strictEqual(fight3.role.guide_step, 7, '击溃恶霸头目后，引导步数达到第 7 步 (小翠强化引导)');
  console.log('✅ TC-09 通过: 穿戴麻衣与草鞋后连续击溃打手与恶霸头目，集齐四件套并触发小翠强化引导！');

  // TC-10: 重复挑战防刷验证
  console.log('\n[TC-10] 测试关卡重复挑战防刷 (首通装备不重复掉落)...');
  const replayFight = await post('/dungeon/fight', { role_id: roleId, dungeon_id: 0, stage_wave: 1 });
  assert.strictEqual(replayFight.rewards.is_first_pass, false, '重复挑战不可判定为首通');
  assert.strictEqual(replayFight.rewards.dropped_equip, null, '重复挑战不发首通装备');
  console.log('✅ TC-10 通过: 防刷幂等校验生效，首通奖励不可重复领取！');

  console.log('\n====================================================');
  console.log('🎉 恭喜！第一阶段后端 10 项核心验收测试全部通过 (10/10 PASS)！');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ 测试未通过:', err);
  process.exit(1);
});
