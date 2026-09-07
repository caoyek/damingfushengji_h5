// 游戏音频管理器 (支持 Web Audio API 原生合成音与外部音频双模驱动)
class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmAudio = null;
    this.currentBgm = null;
    this.isMuted = false;
    this.isUnlocked = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  unlock() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      });
    } else {
      this.isUnlocked = true;
    }
  }

  playBgm(name) {
    if (this.isMuted || this.currentBgm === name) return;
    this.stopBgm();
    this.currentBgm = name;

    const soundPath = `/assets_origin/client_assets/audio/${name}.ogg`;
    this.bgmAudio = new Audio(soundPath);
    this.bgmAudio.loop = true;
    this.bgmAudio.volume = 0.5;

    this.bgmAudio.play().catch(() => {
      // 浏览器若因静音策略拦截，待用户点击时自然恢复
    });
  }

  stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio.currentTime = 0;
      this.bgmAudio = null;
    }
    this.currentBgm = null;
  }

  playSfx(name) {
    if (this.isMuted) return;
    this.unlock();

    // 尝试播放物理音频
    const soundPath = `/assets_origin/client_assets/audio/${name}.ogg`;
    const sfx = new Audio(soundPath);
    sfx.volume = 0.7;
    sfx.play().catch(() => {
      // 优雅降级：若物理音频受限，使用 Web Audio 合成音
      this.playSyntheticTone(name);
    });
  }

  // 合成音兜底算法 (古典水墨乐音合成)
  playSyntheticTone(type) {
    if (!this.ctx || !this.isUnlocked) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'btn_click') {
        // 清脆按键音
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'win') {
        // 胜利大铜锣/古筝和弦
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.15);
        osc.frequency.setValueAtTime(659.25, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
        osc.start(now);
        osc.stop(now + 1.2);
      } else if (type === 'hit' || type === 'm_zbz') {
        // 重击板砖沉闷音
        osc.type = 'square';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'm_ajb') {
        // 暗界波气流破空音
        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch (e) {}
  }
}

window.audioManager = new AudioManager();
