// 选服与登录场景
class LoginScene {
  constructor() {
    this.serverName = '双线1服 · 大明一统天下';
    this.btnEnter = { x: 360, y: 440, w: 240, h: 54, isHover: false };
    this.loadingText = '';
  }

  enter() {
    if (window.audioManager) {
      window.audioManager.playBgm('bgm_city');
    }
  }

  update(dt) {}

  render(renderer) {
    const ctx = renderer.ctx;

    // 1. 尝试绘制背景图，若无则绘制水墨背景
    const bg = window.resourceManager.getImage('bg_server') || window.resourceManager.getImage('map_city6');
    if (bg && bg.width > 64) {
      ctx.drawImage(bg, 0, 0, 960, 640);
      // 加一层水墨暗色半透明蒙版
      ctx.fillStyle = 'rgba(20, 16, 13, 0.45)';
      ctx.fillRect(0, 0, 960, 640);
    } else {
      ctx.fillStyle = '#221c17';
      ctx.fillRect(0, 0, 960, 640);
    }

    // 2. 游戏主 Logo 水墨书法标题
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1c130d';
    ctx.font = 'bold 54px "Microsoft YaHei", "SimSun", serif';
    ctx.shadowColor = 'rgba(224, 196, 143, 0.8)';
    ctx.shadowBlur = 16;
    ctx.fillText('大 明 浮 生 记', 480, 160);

    ctx.fillStyle = '#c7ab77';
    ctx.font = '16px "Microsoft YaHei", sans-serif';
    ctx.shadowBlur = 0;
    ctx.fillText('—— 经典恶搞水墨武侠 · 第一阶段可玩实机版 ——', 480, 205);
    ctx.restore();

    // 3. 选服面板
    renderer.drawInkPanel(280, 260, 400, 140, '选 择 服 务 器');
    ctx.fillStyle = '#2a1e14';
    ctx.font = 'bold 20px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.serverName, 480, 320);

    ctx.fillStyle = '#1e7b34';
    ctx.font = '13px sans-serif';
    ctx.fillText('● 状态: 畅通 (本地权威节点)', 480, 355);

    // 4. 【踏入江湖 / 进入游戏】按钮
    renderer.drawButton('进入游戏', this.btnEnter.x, this.btnEnter.y, this.btnEnter.w, this.btnEnter.h, this.btnEnter.isHover, true);

    if (this.loadingText) {
      ctx.fillStyle = '#f5e4c4';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(this.loadingText, 480, 525);
    }
  }

  async onClick(x, y) {
    const b = this.btnEnter;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (window.audioManager) {
        window.audioManager.playSfx('btn_click');
      }
      this.loadingText = '正在连通本地 SQLite 权威存档...';
      const res = await window.apiClient.login('daming_hero');
      if (res.success) {
        window.currentUser = res.user;
        if (res.has_role) {
          window.currentRoleData = res;
          window.sceneManager.switchScene('MainCityScene');
        } else {
          window.sceneManager.switchScene('CreateRoleScene');
        }
      } else {
        this.loadingText = '登录失败: ' + res.message;
      }
    }
  }

  onMouseMove(x, y) {
    const b = this.btnEnter;
    b.isHover = (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }
}

window.LoginScene = LoginScene;
