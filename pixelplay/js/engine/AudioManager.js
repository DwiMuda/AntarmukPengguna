class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.masterVolume = 0.3;
    this.musicVolume = 0.15;
    this._bgmNodes = null;
    this._bgmPlaying = false;
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      this.enabled = false;
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startBGM() {
    if (!this.enabled || !this.ctx || this._bgmPlaying) return;
    this._bgmPlaying = true;
    this._playBGM();
  }

  stopBGM() {
    this._bgmPlaying = false;
    if (this._bgmInterval) {
      clearInterval(this._bgmInterval);
      this._bgmInterval = null;
    }
    if (this._bgmNodes) {
      try {
        this._bgmNodes.osc1.stop();
        this._bgmNodes.osc2.stop();
        this._bgmNodes.lfo.disconnect();
      } catch {}
      this._bgmNodes = null;
    }
  }

  _playBGM() {
    if (!this._bgmPlaying || !this.ctx) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    const gain2 = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc1.type = 'square';
    osc1.frequency.value = 55;
    gain1.gain.setValueAtTime(this.musicVolume * 0.3, now);

    osc2.type = 'triangle';
    osc2.frequency.value = 110;
    gain2.gain.setValueAtTime(this.musicVolume * 0.2, now);

    lfo.type = 'sine';
    lfo.frequency.value = 0.5;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    osc1.connect(gain1);
    osc2.connect(gain2);
    gain1.connect(this.ctx.destination);
    gain2.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this._bgmNodes = { osc1, osc2, lfo, gain1, gain2 };

    if (this._bgmInterval) clearInterval(this._bgmInterval);
    this._bgmInterval = setInterval(() => {
      if (this._bgmPlaying && this._bgmNodes) {
        const n = now + this.ctx.currentTime * 0.1;
        osc1.frequency.setValueAtTime(55 + Math.sin(n) * 10, this.ctx.currentTime + 0.1);
      }
    }, 200);
  }

  _play(type) {
    if (!this.enabled || !this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    switch (type) {
      case 'shoot': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
        gain.gain.setValueAtTime(this.masterVolume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'explosion': {
        const bufferSize = this.ctx.sampleRate * 0.4;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.5);
        }
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(this.masterVolume * 0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(now);
        break;
      }
      case 'jump': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(250, now);
        osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);
        gain.gain.setValueAtTime(this.masterVolume * 0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
        gain.gain.setValueAtTime(this.masterVolume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }
      case 'combo': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.setValueAtTime(1100, now + 0.05);
        osc.frequency.setValueAtTime(1300, now + 0.1);
        gain.gain.setValueAtTime(this.masterVolume * 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
        break;
      }
      case 'die': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.6);
        gain.gain.setValueAtTime(this.masterVolume * 0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }
      case 'menuSelect': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(500, now);
        osc.frequency.setValueAtTime(750, now + 0.04);
        gain.gain.setValueAtTime(this.masterVolume * 0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'powerup': {
        [500, 700, 950, 1200].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + i * 0.05);
          gain.gain.setValueAtTime(this.masterVolume * 0.12, now + i * 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.07);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.07);
        });
        break;
      }
      case 'coin': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.setValueAtTime(1500, now + 0.06);
        gain.gain.setValueAtTime(this.masterVolume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'bossWarning': {
        [200, 300, 400, 500].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(this.masterVolume * 0.2, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.12);
        });
        break;
      }
    }
  }

  shoot() { this._play('shoot'); }
  explosion() { this._play('explosion'); }
  jump() { this._play('jump'); }
  hit() { this._play('hit'); }
  combo() { this._play('combo'); }
  die() { this._play('die'); }
  menuSelect() { this._play('menuSelect'); }
  powerup() { this._play('powerup'); }
  coin() { this._play('coin'); }
  bossWarning() { this._play('bossWarning'); }
}
