/**
 * PlatformStorage - 跨平台本地存储适配器
 * 抹平微信小游戏 Storage 与 Web Storage
 */
const PlatformStorage = {
  get(key) {
    try {
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        const val = wx.getStorageSync(key);
        return val !== '' && val !== undefined ? val : null;
      }
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : null;
      }
    } catch (err) {
      console.warn('[PlatformStorage] get error:', err);
    }
    return null;
  },

  set(key, value) {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(key, value);
        return true;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      }
    } catch (err) {
      console.warn('[PlatformStorage] set error:', err);
    }
    return false;
  },

  remove(key) {
    try {
      if (typeof wx !== 'undefined' && wx.removeStorageSync) {
        wx.removeStorageSync(key);
        return true;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return true;
      }
    } catch (err) {
      console.warn('[PlatformStorage] remove error:', err);
    }
    return false;
  },

  getItem(key) {
    return this.get(key);
  },

  setItem(key, value) {
    return this.set(key, value);
  },

  removeItem(key) {
    return this.remove(key);
  }
};

PlatformStorage.PlatformStorage = PlatformStorage;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlatformStorage;
}
