/**
 * AudioService - 音频播放服务 (支持微信小游戏与 Web 预览)
 */
class AudioService {
  constructor(app) {
    this.app = app;
    this.bgmContext = null;
    this.sfxContext = null;
  }

  playBgm(assetId) {
    try {
      if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
        if (!this.bgmContext) {
          this.bgmContext = wx.createInnerAudioContext();
          this.bgmContext.loop = true;
        }
        this.bgmContext.src = 'minigame_assets/audio/bgm_battle.ogg';
        this.bgmContext.play();
      }
    } catch (e) {
      console.warn('[AudioService] BGM 播放受限:', e);
    }
  }

  stopBgm() {
    try {
      if (this.bgmContext) {
        this.bgmContext.stop();
      }
    } catch (e) {}
  }

  playSfx(assetId) {
    try {
      if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
        if (!this.sfxContext) {
          this.sfxContext = wx.createInnerAudioContext();
        }
        this.sfxContext.src = 'minigame_assets/audio/win.ogg';
        this.sfxContext.play();
      }
    } catch (e) {}
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AudioService;
}
