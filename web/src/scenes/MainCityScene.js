// 新手村主城 (City 6) 与城外过关通道大地图双模场景
class MainCityScene {
  constructor() {
    this.mode = 'city'; // 'city' (主城全景) | 'passage' (城外过关通道)
    this.roleData = null;

    // 弹窗状态
    this.showRolePanel = false;
    this.showDialog = false;
    this.dialogText = '';

    // 主城 NPC 二婶子热区
    this.npcErShenZi = { x: 260, y: 310, w: 120, h: 140 };

    // 底部导航栏按钮
    this.btnRole = { x: 60, y: 575, w: 100, h: 44, isHover: false };
    this.btnBag = { x: 180, y: 575, w: 100, h: 44, isHover: false };
    this.btnSkill = { x: 300, y: 575, w: 100, h: 44, isHover: false };
    this.btnGate = { x: 780, y: 575, w: 140, h: 44, isHover: false }; // 出城按钮

    // 通道关卡节点
    this.stages = [
      { wave: 1, name: '0-1 市井流氓', x: 200, y: 320, w: 140, h: 70, isHover: false },
      { wave: 2, name: '0-2 地痞打手', x: 440, y: 260, w: 140, h: 70, isHover: false },
      { wave: 3, name: '0-3 恶霸据点', x: 680, y: 220, w: 150, h: 75, isHover: false }
    ];
    this.btnBackCity = { x: 40, y: 40, w: 120, h: 40, isHover: false };
  }

  async enter(params = {}) {
    if (params.mode) {
      this.mode = params.mode;
    }
    // 刷新角色最新存档数据
    if (window.currentRoleData && window.currentRoleData.role) {
      const res = await window.apiClient.getRoleInfo(window.currentRoleData.role.id);
      if (res.success) {
        window.currentRoleData = res;
      }
    }
    this.roleData = window.currentRoleData;

    if (window.audioManager) {
      window.audioManager.playBgm('bgm_city');
    }
  }

  update(dt) {}

  render(renderer) {
    const ctx = renderer.ctx;
    const r = this.roleData ? this.roleData.role : null;
    if (!r) return;

    if (this.mode === 'city') {
      this.renderCity(renderer, r);
    } else {
      this.renderPassage(renderer, r);
    }

    // 绘制角色属性面板 (浮层)
    if (this.showRolePanel) {
      this.renderRolePanel(renderer, r);
    }

    // 绘制 NPC 水墨剧情对话框 (浮层)
    if (this.showDialog) {
      this.renderDialog(renderer);
    }
  }

  // 渲染新手村主城全景
  renderCity(renderer, r) {
    const ctx = renderer.ctx;
    const mapImg = window.resourceManager.getImage('map_city6');
    if (mapImg && mapImg.width > 64) {
      ctx.drawImage(mapImg, 0, 0, 960, 640);
    } else {
      ctx.fillStyle = '#b59e7a';
      ctx.fillRect(0, 0, 960, 640);
    }

    // 顶部角色状态简栏
    renderer.drawInkPanel(20, 15, 420, 64);
    ctx.fillStyle = '#1c130d';
    ctx.font = 'bold 15px "Microsoft YaHei", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${r.name} (Lv.${r.level} 混混) - 6号新手村`, 35, 38);
    ctx.font = '12px sans-serif';
    ctx.fillText(`银两: ${r.silver}   战功: ${r.merit}   物攻: ${r.melee}   物防: ${r.defend}`, 35, 62);

    // NPC 二婶子位置标示与剧情呼吸气泡
    ctx.save();
    ctx.fillStyle = 'rgba(74, 53, 33, 0.7)';
    ctx.beginPath();
    ctx.ellipse(320, 435, 40, 15, 0, 0, Math.PI * 2);
    ctx.fill();

    // 绘制 NPC 形象示意
    ctx.fillStyle = '#4a2f1b';
    ctx.font = 'bold 18px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.fillText('【二婶子】', 320, 390);

    // 剧情气泡提示
    const breath = Math.sin(Date.now() / 250) * 4;
    ctx.fillStyle = r.guide_step < 4 ? '#b83b28' : '#2b5f3a';
    ctx.fillRect(270, 320 + breath, 100, 26);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(r.guide_step < 4 ? '！身世之谜' : '💬 对话', 320, 337 + breath);
    ctx.restore();

    // 出城传送阵光圈
    ctx.save();
    ctx.strokeStyle = '#c49a45';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(850, 480, 70, 35, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#fffdf7';
    ctx.font = 'bold 16px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.fillText('出城通道 ➔', 850, 485);
    ctx.restore();

    // 底部固定 6 大功能按钮栏
    renderer.drawButton('角 色', this.btnRole.x, this.btnRole.y, this.btnRole.w, this.btnRole.h, this.btnRole.isHover, false);
    renderer.drawButton('背 包', this.btnBag.x, this.btnBag.y, this.btnBag.w, this.btnBag.h, this.btnBag.isHover, false);
    renderer.drawButton('技 能', this.btnSkill.x, this.btnSkill.y, this.btnSkill.w, this.btnSkill.h, this.btnSkill.isHover, false);
    renderer.drawButton('出城征战 ➔', this.btnGate.x, this.btnGate.y, this.btnGate.w, this.btnGate.h, this.btnGate.isHover, true);
  }

  // 渲染城外过关通道大地图
  renderPassage(renderer, r) {
    const ctx = renderer.ctx;
    const mapImg = window.resourceManager.getImage('map_dungeon0');
    if (mapImg && mapImg.width > 64) {
      ctx.drawImage(mapImg, 0, 0, 960, 640);
    } else {
      ctx.fillStyle = '#7a6f58';
      ctx.fillRect(0, 0, 960, 640);
    }

    // 顶部标题
    renderer.drawInkPanel(260, 15, 440, 50, '新手城外过关通道 (第一阶段)');

    // 返回新手村按钮
    renderer.drawButton('⬅ 返回主城', this.btnBackCity.x, this.btnBackCity.y, this.btnBackCity.w, this.btnBackCity.h, this.btnBackCity.isHover, false);

    // 渲染 3 个关卡节点旗帜
    for (const st of this.stages) {
      const isPassed = this.roleData.dungeon_progress && this.roleData.dungeon_progress.some(p => p.stage_wave === st.wave && p.pass_times > 0);
      renderer.drawInkPanel(st.x, st.y, st.w, st.h);

      ctx.fillStyle = isPassed ? '#1c6628' : '#7a2214';
      ctx.font = 'bold 16px "Microsoft YaHei", serif';
      ctx.textAlign = 'center';
      ctx.fillText(st.name, st.x + st.w / 2, st.y + 28);

      ctx.fillStyle = '#4a3d31';
      ctx.font = '12px sans-serif';
      ctx.fillText(isPassed ? '★ 已通关 (点击挑战)' : '⚔ 待剿灭 (点击出战)', st.x + st.w / 2, st.y + 52);
    }
  }

  // 渲染角色面板浮层
  renderRolePanel(renderer, r) {
    const ctx = renderer.ctx;
    // 半透明遮罩
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, 960, 640);

    renderer.drawInkPanel(180, 70, 600, 500, '角 色 属 性 与 装 备');

    // 十维属性展示
    ctx.fillStyle = '#2b1f14';
    ctx.font = '15px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`姓名: ${r.name}`, 220, 120);
    ctx.fillText(`门派: 混混 (1000)   等级: Lv.${r.level}`, 220, 150);
    ctx.fillText(`物理攻击: ${r.melee}  (基础10 + 装备加成)`, 220, 180);
    ctx.fillText(`物理防御: ${r.defend}  (基础5 + 装备加成)`, 220, 210);
    ctx.fillText(`出手速度: ${r.speed}  (基础10 + 装备加成)`, 220, 240);
    ctx.fillText(`气血: ${r.hp} / ${r.max_hp}`, 220, 270);
    ctx.fillText(`气力: ${r.mp} / ${r.max_mp}`, 220, 300);

    // 装备列表与穿戴槽位
    ctx.fillStyle = '#423120';
    ctx.font = 'bold 16px "Microsoft YaHei", serif';
    ctx.fillText('【当前持有装备】 (点击即可一键穿戴)：', 220, 345);

    const equips = this.roleData.equipments || [];
    if (equips.length === 0) {
      ctx.fillStyle = '#8a7761';
      ctx.font = '14px sans-serif';
      ctx.fillText('暂无装备，快去和【二婶子】对话或征战过关通道获取！', 220, 385);
    } else {
      equips.forEach((eq, idx) => {
        const itemY = 370 + idx * 42;
        ctx.fillStyle = eq.is_equipped ? '#1c6628' : '#2b1f14';
        ctx.font = 'bold 14px "Microsoft YaHei", sans-serif';
        const status = eq.is_equipped ? '[已穿戴]' : '[点击穿戴]';
        ctx.fillText(`${idx + 1}. ${eq.item_name} (+${eq.howmuch} ${eq.target_attr}) ${status}`, 220, itemY);
      });
    }

    // 关闭面板按钮
    renderer.drawButton('关 闭', 430, 505, 100, 38, false, false);
  }

  // 渲染剧情对话框浮层
  renderDialog(renderer) {
    const ctx = renderer.ctx;
    renderer.drawInkPanel(160, 400, 640, 160, '二 婶 子');
    ctx.fillStyle = '#2b1f14';
    ctx.font = '15px "Microsoft YaHei", serif';
    ctx.textAlign = 'left';

    // 换行渲染对话
    const lines = this.dialogText.match(/.{1,28}/g) || [this.dialogText];
    lines.forEach((line, i) => {
      ctx.fillText(line, 190, 445 + i * 26);
    });

    renderer.drawButton('知道了', 680, 500, 90, 36, false, true);
  }

  async onClick(x, y) {
    // 对话框关闭
    if (this.showDialog) {
      if (x >= 680 && x <= 770 && y >= 500 && y <= 536) {
        window.audioManager.playSfx('btn_click');
        this.showDialog = false;
      }
      return;
    }

    // 角色面板交互
    if (this.showRolePanel) {
      // 点击关闭
      if (x >= 430 && x <= 530 && y >= 505 && y <= 543) {
        window.audioManager.playSfx('btn_click');
        this.showRolePanel = false;
        return;
      }
      // 点击装备穿戴
      const equips = this.roleData.equipments || [];
      for (let i = 0; i < equips.length; i++) {
        const itemY = 370 + i * 42;
        if (x >= 220 && x <= 550 && y >= itemY - 18 && y <= itemY + 18) {
          const eq = equips[i];
          if (!eq.is_equipped) {
            window.audioManager.playSfx('btn_click');
            const res = await window.apiClient.wearEquip(this.roleData.role.id, eq.id);
            if (res.success) {
              this.roleData = res;
              window.currentRoleData = res;
            }
          }
          return;
        }
      }
      return;
    }

    if (this.mode === 'city') {
      // 点击二婶子 NPC
      const n = this.npcErShenZi;
      if (x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) {
        window.audioManager.playSfx('btn_click');
        const res = await window.apiClient.talkStory(this.roleData.role.id, 'ershenzi');
        if (res.success) {
          this.dialogText = res.dialog;
          this.showDialog = true;
          this.roleData = res;
          window.currentRoleData = res;
        }
        return;
      }

      // 点击【角色】按钮
      if (x >= this.btnRole.x && x <= this.btnRole.x + this.btnRole.w && y >= this.btnRole.y && y <= this.btnRole.y + this.btnRole.h) {
        window.audioManager.playSfx('btn_click');
        this.showRolePanel = true;
        return;
      }

      // 点击【出城】按钮或传送圈
      if ((x >= this.btnGate.x && x <= this.btnGate.x + this.btnGate.w && y >= this.btnGate.y && y <= this.btnGate.y + this.btnGate.h) ||
          (x >= 780 && x <= 920 && y >= 445 && y <= 515)) {
        window.audioManager.playSfx('btn_click');
        this.mode = 'passage';
        return;
      }
    } else {
      // 通道模式: 返回新手村
      const b = this.btnBackCity;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        window.audioManager.playSfx('btn_click');
        this.mode = 'city';
        return;
      }

      // 点击 3 个关卡节点进入战斗
      for (const st of this.stages) {
        if (x >= st.x && x <= st.x + st.w && y >= st.y && y <= st.y + st.h) {
          window.audioManager.playSfx('btn_click');
          // 切换到战斗场景
          window.sceneManager.switchScene('BattleScene', {
            role_id: this.roleData.role.id,
            dungeon_id: 0,
            stage_wave: st.wave,
            stage_name: st.name
          });
          return;
        }
      }
    }
  }

  onMouseMove(x, y) {
    const check = (b) => (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
    this.btnRole.isHover = check(this.btnRole);
    this.btnBag.isHover = check(this.btnBag);
    this.btnSkill.isHover = check(this.btnSkill);
    this.btnGate.isHover = check(this.btnGate);
    this.btnBackCity.isHover = check(this.btnBackCity);
    this.stages.forEach(st => st.isHover = check(st));
  }
}

window.MainCityScene = MainCityScene;
