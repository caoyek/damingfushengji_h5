// 创角起名与外观选择场景
class CreateRoleScene {
  constructor() {
    this.selectedSex = 1; // 1 男, 2 女
    this.roleName = '华安';
    this.btnMale = { x: 260, y: 350, w: 90, h: 40, isHover: false };
    this.btnFemale = { x: 370, y: 350, w: 90, h: 40, isHover: false };
    this.btnRandom = { x: 570, y: 410, w: 90, h: 42, isHover: false };
    this.btnCreate = { x: 360, y: 480, w: 240, h: 52, isHover: false };
    this.loading = false;
  }

  async enter() {
    // 首次进入自动摇一个百家姓名字
    const res = await window.apiClient.getRandomName();
    if (res.success) {
      this.roleName = res.name;
    }
  }

  update(dt) {}

  render(renderer) {
    const ctx = renderer.ctx;

    // 背景
    const bg = window.resourceManager.getImage('map_city6');
    if (bg && bg.width > 64) {
      ctx.drawImage(bg, 0, 0, 960, 640);
      ctx.fillStyle = 'rgba(25, 20, 15, 0.6)';
      ctx.fillRect(0, 0, 960, 640);
    } else {
      ctx.fillStyle = '#2b231c';
      ctx.fillRect(0, 0, 960, 640);
    }

    // 主创角卷轴框
    renderer.drawInkPanel(180, 70, 600, 500, '初 入 江 湖 · 创 建 角 色');

    // 立绘展示区域 (根据性别绘制水墨人物卡)
    ctx.save();
    ctx.fillStyle = '#ebdcc0';
    ctx.fillRect(240, 110, 240, 220);
    ctx.strokeStyle = '#574838';
    ctx.lineWidth = 2;
    ctx.strokeRect(240, 110, 240, 220);

    // 水墨剪影人物示意
    ctx.fillStyle = '#3a2d20';
    ctx.font = 'bold 24px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.selectedSex === 1 ? '【大明混混 · 男】' : '【市井奇女 · 女】', 360, 200);

    ctx.fillStyle = '#7a6752';
    ctx.font = '14px sans-serif';
    ctx.fillText('水墨简笔风恶搞门派: 混混 (1000)', 360, 235);
    ctx.fillText('初始领悟绝学: 【暗界波】', 360, 260);
    ctx.restore();

    // 门派特色描述面板
    ctx.fillStyle = '#423325';
    ctx.font = '14px "Microsoft YaHei", serif';
    ctx.textAlign = 'left';
    ctx.fillText('● 气血上限: 120    ● 气力上限: 50', 510, 140);
    ctx.fillText('● 物理攻击: 10     ● 物理防御: 5', 510, 175);
    ctx.fillText('● 出手速度: 10     ● 初始银两: 100', 510, 210);
    ctx.fillText('● 佩戴要求: 1星晾衣杆需1级', 510, 245);
    ctx.fillText('● 进阶门派: 20级转职攻将/防将/阉派', 510, 280);

    // 性别按钮
    renderer.drawButton('男角色', this.btnMale.x, this.btnMale.y, this.btnMale.w, this.btnMale.h, this.btnMale.isHover, this.selectedSex === 1);
    renderer.drawButton('女角色', this.btnFemale.x, this.btnFemale.y, this.btnFemale.w, this.btnFemale.h, this.btnFemale.isHover, this.selectedSex === 2);

    // 姓名输入框底槽
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(300, 410, 250, 42);
    ctx.strokeStyle = '#574838';
    ctx.lineWidth = 2;
    ctx.strokeRect(300, 410, 250, 42);

    ctx.fillStyle = '#1c150e';
    ctx.font = 'bold 18px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.roleName, 425, 431);

    // 随机起名按钮
    renderer.drawButton('🎲 随机', this.btnRandom.x, this.btnRandom.y, this.btnRandom.w, this.btnRandom.h, this.btnRandom.isHover, false);

    // 【踏入江湖】创建按钮
    renderer.drawButton(this.loading ? '正在创角...' : '踏 入 江 湖', this.btnCreate.x, this.btnCreate.y, this.btnCreate.w, this.btnCreate.h, this.btnCreate.isHover, true);
  }

  async onClick(x, y) {
    if (this.loading) return;

    // 切换男角色
    let b = this.btnMale;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      window.audioManager.playSfx('btn_click');
      this.selectedSex = 1;
      return;
    }

    // 切换女角色
    b = this.btnFemale;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      window.audioManager.playSfx('btn_click');
      this.selectedSex = 2;
      return;
    }

    // 随机起名
    b = this.btnRandom;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      window.audioManager.playSfx('btn_click');
      const res = await window.apiClient.getRandomName();
      if (res.success) {
        this.roleName = res.name;
      }
      return;
    }

    // 踏入江湖
    b = this.btnCreate;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      window.audioManager.playSfx('btn_click');
      this.loading = true;
      const res = await window.apiClient.createRole(window.currentUser.id, this.roleName, this.selectedSex);
      this.loading = false;
      if (res.success) {
        window.currentRoleData = res;
        window.sceneManager.switchScene('MainCityScene');
      } else {
        alert('创角失败: ' + res.message);
      }
    }
  }

  onMouseMove(x, y) {
    const check = (b) => (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    this.btnMale.isHover = check(this.btnMale);
    this.btnFemale.isHover = check(this.btnFemale);
    this.btnRandom.isHover = check(this.btnRandom);
    this.btnCreate.isHover = check(this.btnCreate);
  }
}

window.CreateRoleScene = CreateRoleScene;
