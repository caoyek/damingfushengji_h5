/**
 * CanvasRenderer - 960x640 UI 渲染引擎
 * 负责视口适配、控件绘制、图元排版与逐帧动画渲染
 */
class CanvasRenderer {
  constructor(platform, assetManager) {
    this.platform = platform;
    this.assetManager = assetManager;
    this.toastMessage = null;
    this.toastTimer = 0;
  }

  /**
   * 触发浮层 Toast 提示
   */
  showToast(message, duration = 2000) {
    this.toastMessage = message;
    this.toastTimer = Date.now() + duration;
  }

  /**
   * 清除画布并填充背景黑边
   */
  clear() {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    const w = (this.platform.canvas && this.platform.canvas.width) || 960;
    const h = (this.platform.canvas && this.platform.canvas.height) || 640;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * 开始 960x640 虚拟设计视口渲染
   */
  beginDesignFrame() {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    this.clear();

    ctx.save();
    // 应用 Contain 居中缩放矩阵
    const p = this.platform;
    const ratio = p.pixelRatio || 1;
    ctx.translate(p.offsetX * ratio, p.offsetY * ratio);
    ctx.scale(p.scale * ratio, p.scale * ratio);

    // 裁剪到 960x640 区域
    ctx.beginPath();
    ctx.rect(0, 0, p.designWidth, p.designHeight);
    ctx.clip();
  }

  /**
   * 结束当前帧绘制
   */
  endDesignFrame() {
    const ctx = this.platform.ctx;
    if (!ctx) return;

    // 绘制浮层 Toast 提示
    if (this.toastMessage && Date.now() < this.toastTimer) {
      this.drawToast(ctx, this.toastMessage);
    } else {
      this.toastMessage = null;
    }

    ctx.restore();
  }

  /**
   * 绘制背景图（1200x768 居中裁切至 960x640）
   */
  drawBackground(assetId) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    const img = this.assetManager && this.assetManager.getImage(assetId);
    if (img) {
      // 1200x768 居中裁切至 960x640
      const sx = (img.width - 960) / 2;
      const sy = (img.height - 640) / 2;
      ctx.drawImage(img, sx, sy, 960, 640, 0, 0, 960, 640);
    } else {
      const grad = ctx.createLinearGradient(0, 0, 0, 640);
      grad.addColorStop(0, '#1c2530');
      grad.addColorStop(1, '#0e131a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 960, 640);
    }
  }

  /**
   * 绘制普通/按下状态按钮
   */
  drawButton(btnSpec, isPressed = false) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    const { x, y, width, height } = btnSpec.rect;
    const assetId = isPressed ? btnSpec.bgPressed : btnSpec.bgNormal;
    const img = this.assetManager && this.assetManager.getImage(assetId);

    if (img) {
      ctx.drawImage(img, x, y, width, height);
    } else {
      ctx.fillStyle = isPressed ? '#885522' : '#aa7733';
      ctx.strokeStyle = '#ffdd88';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, width, height);
      ctx.strokeRect(x, y, width, height);
    }

    // 绘制按钮文字
    if (btnSpec.text) {
      const offsetY = isPressed ? 2 : 0;
      ctx.font = `bold ${btnSpec.fontSize || 22}px DamingFont, "Microsoft YaHei", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 文字阴影与本体
      ctx.fillStyle = '#331100';
      ctx.fillText(btnSpec.text, x + width / 2 + 1, y + height / 2 + 1 + offsetY);
      ctx.fillStyle = btnSpec.color || '#FFE899';
      ctx.fillText(btnSpec.text, x + width / 2, y + height / 2 + offsetY);
    }
  }

  /**
   * 绘制图片资产
   */
  drawImage(assetId, rect) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    const img = this.assetManager && this.assetManager.getImage(assetId);
    if (img) {
      ctx.drawImage(img, rect.x, rect.y, rect.width, rect.height);
    }
  }

  /**
   * 绘制文本标签
   */
  drawLabel(text, rect, style = {}) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.font = `${style.bold ? 'bold ' : ''}${style.fontSize || 16}px DamingFont, "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = style.color || '#FFFFFF';
    ctx.textAlign = style.align || 'center';
    ctx.textBaseline = 'middle';

    const tx = style.align === 'left' ? rect.x : (style.align === 'right' ? rect.x + rect.width : rect.x + rect.width / 2);
    const ty = rect.y + rect.height / 2;
    ctx.fillText(text, tx, ty);
    ctx.restore();
  }

  /**
   * 绘制带下划线的超链接按钮 (如“随便起名”)
   */
  drawButtonLink(text, rect, style = {}) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.font = `bold ${style.fontSize || 22}px DamingFont, "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = style.color || '#009c48';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    ctx.fillText(text, cx, cy);

    if (style.underline) {
      const textMetrics = ctx.measureText(text);
      const textW = textMetrics.width;
      ctx.strokeStyle = style.color || '#009c48';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - textW / 2, cy + 14);
      ctx.lineTo(cx + textW / 2, cy + 14);
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * 绘制底图槽位中的角色名 (精确贴合原版底图凹槽 x: 464, y: 586)
   */
  drawRoleNameInSlot(text, rect, isFocused) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    ctx.save();

    // 聚焦时光晕呼吸边框
    if (isFocused) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x - 2, rect.y - 2, rect.width + 4, rect.height + 4);
    }

    // 角色名文字 (墨黑色居中渲染)
    ctx.font = 'bold 18px DamingFont, "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#1a1008';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const displayText = text || (isFocused ? '' : '点击输入姓名');
    if (!text && !isFocused) {
      ctx.fillStyle = '#8a7a6b';
      ctx.font = '14px DamingFont, "Microsoft YaHei", sans-serif';
    }

    ctx.fillText(displayText, rect.x + rect.width / 2, rect.y + rect.height / 2);
    ctx.restore();
  }

  /**
   * 绘制选中角色的金色发光边框
   */
  drawSelectionGlow(rect) {
    const ctx = this.platform.ctx;
    if (!ctx) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 230, 100, 0.85)';
    ctx.lineWidth = 4;
    ctx.strokeRect(rect.x - 4, rect.y - 4, rect.width + 8, rect.height + 8);
    ctx.restore();
  }

  /**
   * 绘制跑马灯广播
   */
  drawMarquee(messages, rect, tick, style = {}) {
    const ctx = this.platform.ctx;
    if (!ctx || !messages || messages.length === 0) return;

    ctx.save();
    // 限制在矩形视口内
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    ctx.clip();

    ctx.font = `${style.fontSize || 14}px DamingFont, "Microsoft YaHei", sans-serif`;
    ctx.fillStyle = style.color || '#553311';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const msgIndex = Math.floor(tick / 3500) % messages.length;
    const msg = messages[msgIndex];
    ctx.fillText(msg, rect.x + 8, rect.y + 12);
    ctx.restore();
  }

  /**
   * 绘制居中 Toast 弹窗
   */
  drawToast(ctx, message) {
    if (!ctx) return;
    ctx.save();
    ctx.font = 'bold 20px DamingFont, "Microsoft YaHei", sans-serif';
    const textMetrics = ctx.measureText(message);
    const boxW = Math.max(260, textMetrics.width + 40);
    const boxH = 50;
    const boxX = (960 - boxW) / 2;
    const boxY = 280;

    // 半透明深色圆角底框
    ctx.fillStyle = 'rgba(20, 20, 20, 0.88)';
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 2;
    ctx.fillRect(boxX, boxY, boxW, boxH);
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // 文字
    ctx.fillStyle = '#FFE899';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(message, 480, boxY + boxH / 2);
    ctx.restore();
  }
}

CanvasRenderer.CanvasRenderer = CanvasRenderer;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasRenderer;
}
