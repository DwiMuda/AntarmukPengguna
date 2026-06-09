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
    if (this.currentGame && this.currentGame.destroy) {
      this.currentGame.destroy();
    }
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
        if (this.transitionCallback) {
          const cb = this.transitionCallback;
          this.transitionCallback = null;
          cb();
        }
        // Continue loop instead of returning, unless CB stopped it
        if (!this.running) return;
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
    } else if (this.state === 'menu' && this.menuRenderer) {
      this.clear();
      this.menuRenderer(this.ctx, this.width, this.height, this.totalTime);
    }

    if (this.input) this.input.endFrame();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
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
