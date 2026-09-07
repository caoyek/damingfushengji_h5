// Canvas 2D 水墨古风渲染核心工具库
class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.shakeDuration = 0;
  }

  // 触发震屏 (ms)
  shake(duration = 200, intensity = 8) {
    this.shakeDuration = duration;
    this.shakeIntensity = intensity;
  }

  updateShake(dt) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * (this.shakeIntensity || 6);
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * (this.shakeIntensity || 6);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.fillStyle = '#d9cca8'; // 宣纸基础黄
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }

  // 绘制水墨宣纸质感面板
  drawInkPanel(x, y, w, h, title = '') {
    const ctx = this.ctx;
    ctx.save();

    // 阴影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;

    // 面板背景 (微黄宣纸渐变)
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#f2ebd9');
    grad.addColorStop(1, '#e2d4b7');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // 外层水墨双线边框
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#4a3d31';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);

    ctx.strokeStyle = '#8c7b64';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 4, y + 4, w - 8, h - 8);

    // 四角墨点装饰
    ctx.fillStyle = '#4a3d31';
    const dotSize = 4;
    ctx.fillRect(x + 6, y + 6, dotSize, dotSize);
    ctx.fillRect(x + w - 10, y + 6, dotSize, dotSize);
    ctx.fillRect(x + 6, y + h - 10, dotSize, dotSize);
    ctx.fillRect(x + w - 10, y + h - 10, dotSize, dotSize);

    // 标题栏
    if (title) {
      ctx.fillStyle = '#3a2e24';
      ctx.fillRect(x + 20, y - 12, w - 40, 26);
      ctx.strokeStyle = '#c2a679';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 20, y - 12, w - 40, 26);

      ctx.fillStyle = '#fbf5e8';
      ctx.font = 'bold 15px "Microsoft YaHei", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + w / 2, y + 1);
    }

    ctx.restore();
  }

  // 绘制水墨按钮
  drawButton(text, x, y, w, h, isHover = false, isPrimary = false) {
    const ctx = this.ctx;
    ctx.save();

    // 按钮投影
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // 渐变填充
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (isPrimary) {
      grad.addColorStop(0, isHover ? '#8f3323' : '#7a2214');
      grad.addColorStop(1, isHover ? '#5e1509' : '#4d0f05');
    } else {
      grad.addColorStop(0, isHover ? '#e0d5be' : '#cfc0a2');
      grad.addColorStop(1, isHover ? '#b8a684' : '#a38f6b');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // 边框
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = isPrimary ? '#d4a259' : '#574635';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 文本
    ctx.fillStyle = isPrimary ? '#fffbf0' : '#2b1f14';
    ctx.font = 'bold 15px "Microsoft YaHei", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);

    ctx.restore();
  }

  // 绘制血条 / 气力条
  drawBar(x, y, w, h, cur, max, colorStart, colorEnd, label) {
    const ctx = this.ctx;
    ctx.save();

    // 底槽
    ctx.fillStyle = '#2b231c';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#57483a';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    // 填充度
    const pct = Math.max(0, Math.min(1, cur / max));
    const fillW = Math.floor(w * pct);

    if (fillW > 0) {
      const grad = ctx.createLinearGradient(x, y, x + fillW, y);
      grad.addColorStop(0, colorStart);
      grad.addColorStop(1, colorEnd);
      ctx.fillStyle = grad;
      ctx.fillRect(x + 1, y + 1, fillW - 2, h - 2);
    }

    // 文字
    ctx.fillStyle = '#ffffff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${label}: ${cur}/${max}`, x + w / 2, y + h / 2);

    ctx.restore();
  }
}

window.CanvasRenderer = CanvasRenderer;
