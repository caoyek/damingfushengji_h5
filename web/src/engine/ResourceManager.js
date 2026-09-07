// 游戏资源预加载与缓存管理器
class ResourceManager {
  constructor() {
    this.images = new Map();
    this.loadPromises = [];
  }

  // 加载图片
  loadImage(key, src) {
    if (this.images.has(key)) {
      return Promise.resolve(this.images.get(key));
    }

    const p = new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.images.set(key, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`[ResourceManager] 无法加载图片: ${src}，已启用优雅水墨占位`);
        // 创建一个透明占位
        const fallback = document.createElement('canvas');
        fallback.width = 64;
        fallback.height = 64;
        this.images.set(key, fallback);
        resolve(fallback);
      };
      img.src = src;
    });

    this.loadPromises.push(p);
    return p;
  }

  getImage(key) {
    return this.images.get(key) || null;
  }

  // 预载第一阶段核心资产
  preloadCoreAssets() {
    // 宣纸底图
    this.loadImage('map_city6', '/assets/map/6_cn_xsc.png');
    this.loadImage('map_dungeon0', '/assets/map/6_ggtd_xsc.png');
    this.loadImage('map_city6_cw', '/assets/map/6_cw_xsc.png');

    // 常用界面装饰与按钮
    this.loadImage('bg_loading', '/assets/loading/loadingbg.png');
    this.loadImage('bg_server', '/assets/loading/serverbg.png');

    return Promise.all(this.loadPromises);
  }
}

window.resourceManager = new ResourceManager();
