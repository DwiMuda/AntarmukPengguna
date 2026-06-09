class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();

    this.state = 'menu';
    this.currentGame = null;
    this.lastTime = 0;
    this.dt = 0;
    this.running = false;
    this.rafId = null;

    this.input = null;
    this.audio = null;
    this.effects = new EffectsManager();
    this.particles = new ParticleSystem();
    this.bgRenderer = null;

    this.totalTime = 0;
    this.menuRenderer = null;

    this.hudData = null;
    this.transitionAlpha = 0;
    this.transitionTargetState = null;
    this.transitionCallback = null;

    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.width = this.canvas.width;
    this.height = this.canvas.height;
    if (this.bgRenderer) this.bgRenderer.resize(this.width, this.height);
  }

  setState(newState) {
    this.state = newState;
  }

  startFadeOut(callback) {
    this.transitionAlpha = 0;
    this.transitionTargetState = 'fade';
    this.transitionCallback = callback;
  }

  start(gameInstance) {
    this.currentGame = gameInstance;
    this.state = 'playing';
    this.bgRenderer = new BackgroundRenderer(this.ctx, this.width, this.height);
    this.totalTime = 0;
    this.hudData = null;
    if (gameInstance && gameInstance.init) {
      gameInstance.init(this);
    }
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  stop() {
    this.state = 'menu';
    this.currentGame = null;
    if (this.audio) this.audio.stopBGM();
    this.totalTime = 0;
    this.hudData = null;
  }

  loop(timestamp) {
    if (!this.running) return;
    this.dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;
    this.totalTime += this.dt;

    if (this.transitionTargetState === 'fade') {
      this.transitionAlpha += 0.03;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 0;
        this.transitionTargetState = null;
        if (this.transitionCallback) this.transitionCallback();
        return;
      }
      this.clear();
      this.ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
      if (this.input) this.input.endFrame();
      this.rafId = requestAnimationFrame((t) => this.loop(t));
      return;
    }

    const game = this.currentGame;

    if (game && this.state === 'playing') {
      const shouldUpdate = this.effects.update(this.dt);
      
      if (shouldUpdate) {
        this.particles.update(this.dt);
        if (game.update) game.update(this.dt);
      }

      this.clear();
      this.ctx.save();
      this.effects.applyTransform(this.ctx);
      if (game.render) game.render(this.ctx);
      this.particles.render(this.ctx);
      this.ctx.restore();

      this.effects.renderPostProcess(this.ctx, this.width, this.height);
      this.effects.renderOverlays(this.ctx, this.width, this.height);

      if (this.hudData) this.drawHUD(this.ctx);
    } else if (this.state === 'menu' && this.menuRenderer) {
      this.clear();
      this.menuRenderer(this.ctx, this.width, this.height, this.totalTime);
    }

    if (this.input) this.input.endFrame();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  drawHUD(ctx) {
    const d = this.hudData;
    if (!d) return;
    const W = this.width;
    const H = this.height;
    const t = this.totalTime;

    ctx.save();
    ctx.textBaseline = 'top';

    // Top bar background
    const topGrad = ctx.createLinearGradient(0, 0, 0, 56);
    topGrad.addColorStop(0, 'rgba(5,5,16,0.85)');
    topGrad.addColorStop(1, 'rgba(5,5,16,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 56);

    // Score (left side)
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12 + Math.sin(t * 2) * 4;
    const scoreStr = Math.floor(d.score).toLocaleString();
    ctx.font = '700 28px Rajdhani, sans-serif';
    ctx.textAlign = 'left';
    const sg = ctx.createLinearGradient(0, 8, 0, 38);
    sg.addColorStop(0, '#67e8f9');
    sg.addColorStop(1, '#00f0ff');
    ctx.fillStyle = sg;
    ctx.fillText(scoreStr, 20, 12);

    // Score label
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '400 9px Outfit, sans-serif';
    ctx.fillText('SCORE', 20, 42);

    // High Score (right side)
    const hsStr = (d.highScore || 0).toLocaleString();
    ctx.textAlign = 'right';
    ctx.shadowColor = 'rgba(255,255,255,0.15)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '500 16px Rajdhani, sans-serif';
    ctx.fillText(hsStr, W - 20, 14);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '400 9px Outfit, sans-serif';
    ctx.fillText('HI-SCORE', W - 20, 34);

    // Bottom bar background
    const botGrad = ctx.createLinearGradient(0, H - 50, 0, H);
    botGrad.addColorStop(0, 'rgba(5,5,16,0)');
    botGrad.addColorStop(1, 'rgba(5,5,16,0.85)');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - 50, W, 50);

    // Coins (left bottom)
    ctx.textAlign = 'left';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    const coinPulse = 1 + Math.sin(t * 3) * 0.15;
    ctx.font = '700 18px Rajdhani, sans-serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('\u25C7 ' + (d.coins || 0), 20, H - 34);

    // Lives (right bottom) — drawn hearts
    if (d.lives !== undefined) {
      ctx.textAlign = 'right';
      for (let i = 0; i < d.lives; i++) {
        const hx = W - 20 - i * 26;
        const hy = H - 38;
        const heartBeat = 1 + Math.sin(t * 3 + i * 0.5) * 0.08;
        ctx.save();
        ctx.translate(hx, hy);
        ctx.scale(heartBeat, heartBeat);
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 10;
        const hg = ctx.createLinearGradient(0, -6, 0, 6);
        hg.addColorStop(0, '#fda4af');
        hg.addColorStop(0.5, '#ff2d78');
        hg.addColorStop(1, '#be123c');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.moveTo(0, 3);
        ctx.bezierCurveTo(-6, -3, -7, -6, -3, -7);
        ctx.bezierCurveTo(0, -5, 0, -5, 0, -5);
        ctx.bezierCurveTo(0, -5, 3, -7, 7, -6);
        ctx.bezierCurveTo(7, -3, 6, -3, 0, 3);
        ctx.fill();
        ctx.restore();
      }
    }

    // Combo/multiplier
    if (d.combo && d.combo > 1) {
      ctx.textAlign = 'center';
      const comboScale = 1 + Math.min(0.3, d.combo * 0.02);
      ctx.save();
      ctx.translate(W / 2, 30);
      ctx.scale(comboScale, comboScale);

      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#facc15';
      ctx.font = '700 16px Rajdhani, sans-serif';
      ctx.fillText('COMBO x' + d.combo, 0, 0);

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff2d78';
      ctx.font = '700 12px Rajdhani, sans-serif';
      ctx.fillText(d.multiplier.toFixed(1) + 'x', 0, 20);
      ctx.restore();
    }

    ctx.restore();
  }

  clear() {
    this.ctx.fillStyle = '#0a0a1a';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  shake(intensity, duration) {
    this.effects.shake(intensity, duration);
  }

  flash(color, duration) {
    this.effects.flash(color, duration);
  }
}
