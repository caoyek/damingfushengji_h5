// 游戏场景管理器与事件分发调度中心
class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.currentSceneName = '';
    this.renderer = null;
  }

  init(renderer) {
    this.renderer = renderer;
  }

  register(name, sceneInstance) {
    this.scenes.set(name, sceneInstance);
  }

  switchScene(name, params = {}) {
    if (this.currentScene && this.currentScene.exit) {
      this.currentScene.exit();
    }

    const nextScene = this.scenes.get(name);
    if (!nextScene) {
      console.error(`[SceneManager] 未找到场景: ${name}`);
      return;
    }

    this.currentSceneName = name;
    this.currentScene = nextScene;
    console.log(`[SceneManager] 路由至场景: ${name}`);

    if (this.currentScene.enter) {
      this.currentScene.enter(params);
    }
  }

  update(dt) {
    if (this.renderer) {
      this.renderer.updateShake(dt);
    }
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(dt);
    }
  }

  render() {
    if (!this.renderer) return;
    this.renderer.clear();

    const ctx = this.renderer.ctx;
    ctx.save();
    // 应用震屏
    if (this.renderer.shakeOffsetX || this.renderer.shakeOffsetY) {
      ctx.translate(this.renderer.shakeOffsetX, this.renderer.shakeOffsetY);
    }

    if (this.currentScene && this.currentScene.render) {
      this.currentScene.render(this.renderer);
    }

    ctx.restore();
  }

  onClick(x, y) {
    if (window.audioManager) {
      window.audioManager.unlock();
    }
    if (this.currentScene && this.currentScene.onClick) {
      this.currentScene.onClick(x, y);
    }
  }

  onMouseMove(x, y) {
    if (this.currentScene && this.currentScene.onMouseMove) {
      this.currentScene.onMouseMove(x, y);
    }
  }
}

window.sceneManager = new SceneManager();
