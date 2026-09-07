// 九宫格战斗回放与胜利结算场景 (严格对齐5.5节战报契约)
class BattleScene {
  constructor() {
    this.stageName = '';
    this.stageWave = 1;
    this.battleData = null;
    this.rounds = [];
    this.rewards = null;
    this.isVictory = false;

    // 播放状态机
    this.currentRoundIdx = 0;
    this.roundTimer = 0;
    this.ROUND_INTERVAL = 1200; // 每回合播放 1.2 秒
    this.floatingTexts = []; // 飘字列表

    // 攻守双方阵位精灵当前渲染状态
    this.playerActor = { name: '主角', hp: 120, maxHp: 120, mp: 50, maxMp: 50, x: 260, y: 320, offsetX: 0 };
    this.enemyActor = { name: '敌人', hp: 100, maxHp: 100, mp: 30, maxMp: 30, x: 700, y: 320, offsetX: 0 };

    this.isEnded = false;
    this.btnConfirm = { x: 400, y: 460, w: 160, h: 46, isHover: false };
  }

  async enter(params) {
    this.stageName = params.stage_name || '过关通道';
    this.stageWave = params.stage_wave || 1;
    this.floatingTexts = [];
    this.currentRoundIdx = 0;
    this.roundTimer = 0;
    this.isEnded = false;
    this.rewards = null;

    if (window.audioManager) {
      window.audioManager.playBgm('bgm_battle');
    }

    // 调用推演接口
    const res = await window.apiClient.fightDungeon(params.role_id, params.dungeon_id || 0, this.stageWave);
    if (!res.success) {
      alert('无法发起战斗: ' + res.message);
      window.sceneManager.switchScene('MainCityScene', { mode: 'passage' });
      return;
    }

    this.battleData = res.battle;
    this.rounds = res.battle.rounds || [];
    this.rewards = res.rewards;
    this.isVictory = res.battle.winner === 'attacker';

    // 初始化双方生命条
    if (res.role) {
      this.playerActor.name = res.role.name;
      this.playerActor.hp = res.role.hp;
      this.playerActor.maxHp = res.role.max_hp;
      this.playerActor.mp = res.role.mp;
      this.playerActor.maxMp = res.role.max_mp;
    }

    const firstRound = this.rounds[0];
    if (firstRound) {
      this.enemyActor.name = firstRound.attacker.is_player ? firstRound.target.name : firstRound.attacker.name;
      this.enemyActor.maxHp = this.stageWave === 1 ? 100 : (this.stageWave === 2 ? 160 : 170);
      this.enemyActor.hp = this.enemyActor.maxHp;
    }

    this.playNextRound();
  }

  playNextRound() {
    if (this.currentRoundIdx >= this.rounds.length) {
      // 战报播完
      this.isEnded = true;
      if (this.isVictory && window.audioManager) {
        window.audioManager.playSfx('win');
      }
      return;
    }

    const r = this.rounds[this.currentRoundIdx];
    const isPlayerAtk = r.attacker.is_player === 1;

    // 播放攻击动作冲刺位移
    if (isPlayerAtk) {
      this.playerActor.offsetX = 50;
      setTimeout(() => { this.playerActor.offsetX = 0; }, 250);
    } else {
      this.enemyActor.offsetX = -50;
      setTimeout(() => { this.enemyActor.offsetX = 0; }, 250);
    }

    // 播放技能音效
    if (r.skill.name === '暗界波') {
      window.audioManager.playSfx('m_ajb');
    } else if (r.skill.name === '吐口水') {
      window.audioManager.playSfx('m_tks');
    } else if (r.skill.name === '砸板砖') {
      window.audioManager.playSfx('m_zbz');
    } else {
      window.audioManager.playSfx('hit');
    }

    // 飘血与受击
    setTimeout(() => {
      if (r.is_dodge) {
        this.addFloatingText('闪避 DODGE!', isPlayerAtk ? this.enemyActor.x : this.playerActor.x, 260, '#2ea843');
      } else {
        if (r.is_cri) {
          this.addFloatingText('暴击 CRITICAL!', isPlayerAtk ? this.enemyActor.x : this.playerActor.x, 230, '#e69500', 22);
        }
        this.addFloatingText(`-${r.damage}`, isPlayerAtk ? this.enemyActor.x : this.playerActor.x, 270, '#c72c1e', 24);

        if (window.sceneManager.renderer) {
          window.sceneManager.renderer.shake(180, r.is_cri ? 10 : 5);
        }

        // 扣血
        if (isPlayerAtk) {
          this.enemyActor.hp = r.target_hp_left;
        } else {
          this.playerActor.hp = r.target_hp_left;
        }
      }
    }, 200);

    this.currentRoundIdx++;
  }

  addFloatingText(text, x, y, color = '#ff0000', size = 20) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      size,
      alpha: 1.0,
      life: 800
    });
  }

  update(dt) {
    // 飘字动画
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= (dt / 1000) * 35;
      ft.alpha = Math.max(0, ft.life / 800);
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 回合时序驱动
    if (!this.isEnded) {
      this.roundTimer += dt;
      if (this.roundTimer >= this.ROUND_INTERVAL) {
        this.roundTimer = 0;
        this.playNextRound();
      }
    }
  }

  render(renderer) {
    const ctx = renderer.ctx;

    // 1. 绘制战斗背景
    const bg = window.resourceManager.getImage('map_dungeon0');
    if (bg && bg.width > 64) {
      ctx.drawImage(bg, 0, 0, 960, 640);
      ctx.fillStyle = 'rgba(25, 20, 15, 0.45)';
      ctx.fillRect(0, 0, 960, 640);
    } else {
      ctx.fillStyle = '#3a3127';
      ctx.fillRect(0, 0, 960, 640);
    }

    // 2. 顶部关卡标题
    renderer.drawInkPanel(320, 15, 320, 50, this.stageName);

    // 3. 绘制双方角色 (九宫格站位示意与水墨底盘)
    this.renderActor(ctx, renderer, this.playerActor, true);
    this.renderActor(ctx, renderer, this.enemyActor, false);

    // 4. 绘制飘字
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = ft.alpha;
      ctx.fillStyle = ft.color;
      ctx.font = `bold ${ft.size}px "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // 5. 战斗结算弹窗 (胜利或战败)
    if (this.isEnded) {
      this.renderSettlement(renderer);
    }
  }

  renderActor(ctx, renderer, actor, isPlayer) {
    const drawX = actor.x + actor.offsetX;
    const drawY = actor.y;

    ctx.save();
    // 阵位水墨阴影底盘
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(drawX, drawY + 80, 50, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 人物立绘/剪影
    ctx.fillStyle = isPlayer ? '#d4af37' : '#8c2d19';
    ctx.beginPath();
    ctx.arc(drawX, drawY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fffbf0';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.fillText(isPlayer ? '主 角' : '恶 霸', drawX, drawY + 5);

    // 名字与血条
    ctx.fillStyle = '#fffdf7';
    ctx.font = 'bold 16px "Microsoft YaHei", sans-serif';
    ctx.fillText(actor.name, drawX, drawY - 60);

    renderer.drawBar(drawX - 70, drawY - 45, 140, 12, actor.hp, actor.maxHp, '#b83b28', '#d6513e', 'HP');
    if (isPlayer) {
      renderer.drawBar(drawX - 70, drawY - 30, 140, 10, actor.mp, actor.maxMp, '#1f7a8c', '#3db0c7', 'MP');
    }
    ctx.restore();
  }

  renderSettlement(renderer) {
    const ctx = renderer.ctx;
    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, 960, 640);

    const title = this.isVictory ? '战 斗 胜 利' : '战 斗 失 利';
    renderer.drawInkPanel(230, 100, 500, 440, title);

    ctx.fillStyle = this.isVictory ? '#1c6628' : '#7a2214';
    ctx.font = 'bold 28px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.isVictory ? '旗 开 得 胜！' : '大 意 失 荆 州', 480, 160);

    if (this.isVictory && this.rewards) {
      ctx.fillStyle = '#2b1f14';
      ctx.font = '16px "Microsoft YaHei", sans-serif';
      ctx.fillText(`获得经验: +${this.rewards.exp}      获得银两: +${this.rewards.silver}`, 480, 205);
      ctx.fillText(`获得战功: +${this.rewards.merit}`, 480, 235);

      if (this.rewards.dropped_equip) {
        const eq = this.rewards.dropped_equip;
        ctx.fillStyle = '#8f3323';
        ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
        ctx.fillText(`★ 战利品掉落: 【${eq.item_name}】 (+${eq.howmuch} ${eq.target_attr})`, 480, 280);
      }

      // 若打败恶霸头目，展示小翠第一阶段交接台词
      if (this.stageWave === 3) {
        ctx.fillStyle = '#4a3d31';
        ctx.font = 'italic 14px "Microsoft YaHei", sans-serif';
        ctx.fillText('小翠：“刚才那次战斗有些艰苦！快去强化装备和升级技能，', 480, 340);
        ctx.fillText('一定能轻松打败更强的敌人！”', 480, 365);
        ctx.fillStyle = '#1c6628';
        ctx.font = 'bold 15px "Microsoft YaHei", sans-serif';
        ctx.fillText('【🎉 恭喜达成第一阶段全流程通关可玩闭环！】', 480, 410);
      }
    } else {
      ctx.fillStyle = '#574635';
      ctx.font = '15px sans-serif';
      ctx.fillText('胜败乃兵家常事，大侠生命已自动回满，请穿戴齐装备再战！', 480, 240);
    }

    renderer.drawButton('确 定', this.btnConfirm.x, this.btnConfirm.y, this.btnConfirm.w, this.btnConfirm.h, this.btnConfirm.isHover, true);
  }

  onClick(x, y) {
    if (!this.isEnded) {
      // 点击可跳过或加速战报
      this.playNextRound();
      return;
    }

    const b = this.btnConfirm;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      window.audioManager.playSfx('btn_click');
      // 返回过关通道
      window.sceneManager.switchScene('MainCityScene', { mode: 'passage' });
    }
  }

  onMouseMove(x, y) {
    const b = this.btnConfirm;
    b.isHover = (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  }
}

window.BattleScene = BattleScene;
