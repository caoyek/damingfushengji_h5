/**
 * WeChatPlatform - 微信小游戏平台适配器
 * 管理屏幕适配矩阵、触控输入、软键盘交互与字体加载
 */
class WeChatPlatform {
  constructor() {
    this.designWidth = 960;
    this.designHeight = 640;

    this.screenWidth = 960;
    this.screenHeight = 640;
    this.pixelRatio = 1;

    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.canvas = null;
    this.ctx = null;

    this.touchStartCallbacks = [];
    this.touchEndCallbacks = [];
    this.keyboardCallback = null;
    this.fontLoaded = false;

    this.initSystemInfo();
  }

  init(canvas) {
    this.initSystemInfo();
    this.setupCanvas(canvas);
    this.setupTouchListeners();
  }

  initSystemInfo() {
    try {
      if (typeof wx !== 'undefined') {
        const info = (typeof wx.getWindowInfo === 'function') 
          ? wx.getWindowInfo() 
          : (typeof wx.getSystemInfoSync === 'function' ? wx.getSystemInfoSync() : null);
        if (info) {
          this.screenWidth = info.windowWidth || this.screenWidth;
          this.screenHeight = info.windowHeight || this.screenHeight;
          this.pixelRatio = info.pixelRatio || 1;
        }
      } else if (typeof window !== 'undefined') {
        this.screenWidth = window.innerWidth || 960;
        this.screenHeight = window.innerHeight || 640;
        this.pixelRatio = window.devicePixelRatio || 1;
      }
    } catch (e) {
      // 捕获早期 jsbridge 未就绪异常并安全回退默认 960x640
    }
    this.updateViewportMatrix();
  }

  /**
   * 根据物理屏幕更新 Contain 视口变换参数
   */
  updateViewportMatrix() {
    const scaleX = this.screenWidth / this.designWidth;
    const scaleY = this.screenHeight / this.designHeight;

    // 等比缩放 (Contain)，保持 960:640 比例不失真
    this.scale = Math.min(scaleX, scaleY);

    // 居中偏移量
    this.offsetX = (this.screenWidth - this.designWidth * this.scale) / 2;
    this.offsetY = (this.screenHeight - this.designHeight * this.scale) / 2;
  }

  /**
   * 将屏幕物理触控坐标映射为 960x640 虚拟设计坐标
   */
  screenToDesignPoint(screenX, screenY) {
    return {
      x: (screenX - this.offsetX) / this.scale,
      y: (screenY - this.offsetY) / this.scale
    };
  }

  /**
   * 初始化 Canvas
   */
  setupCanvas(canvas) {
    this.canvas = canvas || (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : null);
    if (!this.canvas && typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      document.body.appendChild(this.canvas);
    }

    if (this.canvas) {
      this.canvas.width = this.screenWidth * this.pixelRatio;
      this.canvas.height = this.screenHeight * this.pixelRatio;
      this.ctx = this.canvas.getContext('2d');
    }

    this.loadCustomFont();
    this.setupKeyboardListeners();
  }

  /**
   * 监听全局触摸事件并分发
   */
  setupTouchListeners() {
    if (typeof wx !== 'undefined') {
      if (wx.onTouchStart) {
        wx.onTouchStart((e) => {
          const touch = e.touches && e.touches[0];
          if (touch) {
            const pt = this.screenToDesignPoint(touch.clientX, touch.clientY);
            this.touchStartCallbacks.forEach(cb => cb(pt));
          }
        });
      }
      if (wx.onTouchEnd) {
        wx.onTouchEnd((e) => {
          const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
          if (touch) {
            const pt = this.screenToDesignPoint(touch.clientX, touch.clientY);
            this.touchEndCallbacks.forEach(cb => cb(pt));
          }
        });
      }
    } else if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', (e) => {
        const pt = this.screenToDesignPoint(e.clientX, e.clientY);
        this.touchStartCallbacks.forEach(cb => cb(pt));
      });
      window.addEventListener('mouseup', (e) => {
        const pt = this.screenToDesignPoint(e.clientX, e.clientY);
        this.touchEndCallbacks.forEach(cb => cb(pt));
      });
    }
  }

  onTouchStart(cb) {
    if (typeof cb === 'function') this.touchStartCallbacks.push(cb);
  }

  onTouchEnd(cb) {
    if (typeof cb === 'function') this.touchEndCallbacks.push(cb);
  }

  requestAnimationFrame(cb) {
    if (typeof wx !== 'undefined' && wx.requestAnimationFrame) {
      return wx.requestAnimationFrame(cb);
    }
    if (typeof window !== 'undefined' && window.requestAnimationFrame) {
      return window.requestAnimationFrame(cb);
    }
    return setTimeout(cb, 16);
  }

  /**
   * 加载游戏自定义字体
   */
  loadCustomFont() {
    if (typeof wx !== 'undefined' && wx.loadFontFace) {
      wx.loadFontFace({
        family: 'DamingFont',
        source: 'url("minigame_assets/fonts/font.ttf")',
        success: () => {
          console.log('[WeChatPlatform] 字体 DamingFont 加载成功');
          this.fontLoaded = true;
        },
        fail: (err) => {
          console.warn('[WeChatPlatform] 字体加载失败，使用系统字体回退:', err);
        }
      });
    }
  }

  /**
   * 监听软键盘确认与输入
   */
  setupKeyboardListeners() {
    if (typeof wx !== 'undefined') {
      if (wx.onKeyboardInput) {
        wx.onKeyboardInput((res) => {
          if (this.keyboardCallback) this.keyboardCallback(res.value, false);
        });
      }
      if (wx.onKeyboardConfirm) {
        wx.onKeyboardConfirm((res) => {
          if (this.keyboardCallback) this.keyboardCallback(res.value, true);
        });
      }
      if (wx.onKeyboardComplete) {
        wx.onKeyboardComplete((res) => {
          if (this.keyboardCallback) this.keyboardCallback(res.value, true);
        });
      }
    }
  }

  /**
   * 唤起系统键盘
   */
  showKeyboard(currentValue, maxLength, callback) {
    this.keyboardCallback = callback;
    if (typeof wx !== 'undefined' && wx.showKeyboard) {
      wx.showKeyboard({
        defaultValue: currentValue || '',
        maxLength: maxLength || 10,
        multiple: false,
        confirmHold: false,
        confirmType: 'done'
      });
    } else if (typeof window !== 'undefined') {
      const input = prompt('请输入角色名:', currentValue || '');
      if (input !== null && callback) {
        callback(input, true);
      }
    }
  }
}

WeChatPlatform.WeChatPlatform = WeChatPlatform;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WeChatPlatform;
}
