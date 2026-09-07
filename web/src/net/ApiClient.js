// 前端网络通信客户端
class ApiClient {
  constructor() {
    // 自动适配同源访问或跨域本地开发端口 3000
    this.baseUrl = window.location.port === '3000' ? '/api' : 'http://127.0.0.1:3000/api';
  }

  async post(endpoint, data = {}) {
    try {
      const resp = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!resp.ok) {
        throw new Error(`HTTP 错误 ${resp.status}`);
      }
      return await resp.json();
    } catch (err) {
      console.error(`[API 请求失败] ${endpoint}:`, err);
      return { success: false, message: err.message };
    }
  }

  login(username) {
    return this.post('/login', { username });
  }

  getRandomName() {
    return this.post('/role/random-name');
  }

  createRole(userId, name, sex) {
    return this.post('/role/create', { user_id: userId, name, sex });
  }

  getRoleInfo(roleId) {
    return this.post('/role/info', { role_id: roleId });
  }

  talkStory(roleId, npcId) {
    return this.post('/story/talk', { role_id: roleId, npc_id: npcId });
  }

  wearEquip(roleId, equipId) {
    return this.post('/equip/wear', { role_id: roleId, equip_id: equipId });
  }

  fightDungeon(roleId, dungeonId, stageWave) {
    return this.post('/dungeon/fight', { role_id: roleId, dungeon_id: dungeonId, stage_wave: stageWave });
  }
}

window.apiClient = new ApiClient();
