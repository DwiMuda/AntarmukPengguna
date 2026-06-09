class PixelRunner {
  constructor() {
    this.engine = null;
    this.input = null;
    this.audio = null;

    this.player = null;
    this.obstacles = [];
    this.coins = [];

    this.score = 0;
    this.gameOver = false;
    this.groundY = 0;
    this.speed = 250;
    this.difficultyTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.gravity = 1800;
    this.jumpVelocity = -580;
    this.canDoubleJump = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.biome = 'city';
    this.animationTimer = 0;
    this.pixelScale = 3;
    this.landDustTimer = 0;
  }

  init(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.audio = engine.audio;

    this.groundY = engine.height * 0.72;

    this.player = {
      x: 120,
      y: this.groundY,
      w: 12 * this.pixelScale,
      h: 16 * this.pixelScale,
      vy: 0,
      onGround: true,
      frame: 0,
    };

    this.obstacles = [];
    this.coins = [];
    this.score = 0;
    this.speed = 250;
    this.gameOver = false;
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;
    this.difficultyTimer = 0;
    this.canDoubleJump = true;
    this.isSliding = false;
    this.slideTimer = 0;
    this.biome = 'city';
    this.animationTimer = 0;
    this.landDustTimer = 0;

    engine.particles.clear();
    engine.audio.startBGM();
  }

  update(dt) {
    if (this.gameOver) return;

    const { width, height } = this.engine;

    this.difficultyTimer += dt;
    this.speed = 250 + this.difficultyTimer * 10;
    this.spawnInterval = Math.max(0.5, 1.8 - this.difficultyTimer * 0.02);

    // Biome Logic
    if (this.score > 5000) this.biome = 'wasteland';
    if (this.score > 15000) this.biome = 'core';

    // Slide Input
    const slidePressed = this.input.isDown('ArrowDown') || this.input.isDown('KeyS');
    if (slidePressed && this.player.onGround) {
      this.isSliding = true;
      this.player.h = 10 * this.pixelScale;
    } else {
      this.isSliding = false;
      this.player.h = 16 * this.pixelScale;
    }

    // Jump input
    const jumpPressed = this.input.wasPressed('Space') || this.input.wasPressed('ArrowUp') ||
                        this.input.wasPressed('KeyW') || this.input.wasPressed('Touch');
    if (jumpPressed && !this.isSliding) {
      if (this.player.onGround) {
        this.player.vy = this.jumpVelocity;
        this.player.onGround = false;
        this.canDoubleJump = true;
        this.audio.jump();
      } else if (this.canDoubleJump) {
        this.player.vy = this.jumpVelocity * 0.85;
        this.canDoubleJump = false;
        this.audio.jump();
      }
    }

    this.player.vy += this.gravity * dt;
    this.player.y += this.player.vy * dt;

    if (this.player.y >= this.groundY) {
      if (!this.player.onGround && this.player.vy > 100) {
        this.landDustTimer = 0.2;
        this.engine.particles.emit(this.player.x, this.groundY + 16 * this.pixelScale, {
          count: 6, color: '#a855f7', speed: 40, life: 0.3, size: 3, type: 'spark',
          spread: Math.PI, angle: Math.PI,
        });
      }
      this.player.y = this.groundY;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    this.animationTimer += dt * (this.isSliding ? this.speed * 0.02 : this.speed * 0.012);
    this.player.frame = Math.floor(this.animationTimer) % 4;
    if (this.landDustTimer > 0) this.landDustTimer -= dt;

    // Trail
    if (this.isSliding) {
       if (Math.random() > 0.4) this.engine.particles.emitTrail(this.player.x, this.groundY + 16 * this.pixelScale, '#ff2d78', 4);
    } else if (this.speed > 300 && this.player.onGround && Math.random() > 0.6) {
      this.engine.particles.emitTrail(this.player.x - 20, this.groundY + 16 * this.pixelScale, '#a855f7', 6);
    }
    // ...


    // Jump arc trail
    if (!this.player.onGround && Math.random() > 0.3) {
      this.engine.particles.emitTrail(this.player.x + this.player.w * 0.4, this.player.y + this.player.h * 0.5, '#00f0ff', 3);
    }

    // Spawn obstacles
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnObstacle(width);
    }

    // Spawn coins
    if (Math.random() < 0.02) {
      const cy = this.groundY - 60 - Math.random() * 80;
      this.coins.push({ x: width + 20, y: cy, size: 10, collected: false });
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= this.speed * dt;
      if (o.x < -o.w) {
        this.obstacles.splice(i, 1);
        this.score += Math.floor(10 * (1 + this.difficultyTimer * 0.05));
        continue;
      }
      const px = this.player.x, py = this.player.y;
      const pw = this.player.w, ph = this.player.h;
      if (px + pw * 0.2 < o.x + o.w && px + pw * 0.8 > o.x &&
          py + ph * 0.1 < o.y + o.h && py + ph * 0.9 > o.y) {
        this.die();
        return;
      }
    }

    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.x -= this.speed * dt;
      if (c.x < -20) { this.coins.splice(i, 1); continue; }
      if (Math.abs(c.x - this.player.x - this.player.w / 2) < c.size + this.player.w * 0.3 &&
          Math.abs(c.y - this.player.y - this.player.h / 2) < c.size + this.player.h * 0.3) {
        this.coins.splice(i, 1);
        this.score += 50;
        this.audio.coin();
        this.engine.particles.emit(c.x, c.y, {
          count: 6, color: '#facc15', speed: 60, life: 0.3, size: 3, type: 'spark', spread: Math.PI * 2,
        });
      }
    }

    this.engine.particles.update(dt);

    if (this.hudCallback) {
      this.hudCallback({ score: this.score, highScore: 0, combo: 0, multiplier: 1, lives: 1, coins: 0 });
    }
  }

  spawnObstacle(width) {
    const type = Math.random();
    let w, h, color, shape;
    if (type < 0.4) {
      w = 10 * this.pixelScale;
      h = 14 * this.pixelScale;
      color = '#00f0ff';
      shape = 0;
    } else if (type < 0.7) {
      w = 8 * this.pixelScale;
      h = 10 * this.pixelScale;
      color = '#a855f7';
      shape = 1;
    } else {
      w = 14 * this.pixelScale;
      h = 8 * this.pixelScale;
      color = '#ff2d78';
      shape = 2;
    }
    this.obstacles.push({
      x: width + 20,
      y: this.groundY + 16 * this.pixelScale - h,
      w, h, color, shape,
      rotation: 0,
    });
  }

  render(ctx) {
    const { width, height, bgRenderer, totalTime } = this.engine;

    bgRenderer.drawRunnerBackground(totalTime, this.speed, this.groundY);

    // Coins
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#facc15';
      const pulse = Math.sin(totalTime * 6 + c.x * 0.1) * 2;
      ctx.beginPath();
      ctx.arc(0, 0, c.size + pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0a1a';
      ctx.shadowBlur = 0;
      ctx.font = 'bold 10px Courier New';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u25C7', 0, 0);
      ctx.restore();
    }

    // Obstacles — gradient with depth
    for (const o of this.obstacles) {
      ctx.save();

      if (o.shape === 0) {
        // Tall — vertical gradient pillar
        const tg = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
        tg.addColorStop(0, '#67e8f9');
        tg.addColorStop(0.3, '#00f0ff');
        tg.addColorStop(0.7, '#0891b2');
        tg.addColorStop(1, '#164e63');
        ctx.fillStyle = tg;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        // Top cap
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 4);

        // Face pattern — geometric eyes
        ctx.fillStyle = '#0a0a1a';
        const ey = o.y + o.h * 0.3;
        ctx.fillRect(o.x + 4, ey, 6, 8);
        ctx.fillRect(o.x + o.w - 10, ey, 6, 8);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(o.x + 5, ey + 2, 4, 4);
        ctx.fillRect(o.x + o.w - 9, ey + 2, 4, 4);

        // Vertical accent line
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(o.x + o.w / 2 - 1, o.y + 4, 2, o.h - 8);

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 4);
      } else if (o.shape === 1) {
        // Circle — radial gradient sphere
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const cg = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, o.w / 2);
        cg.addColorStop(0, '#d8b4fe');
        cg.addColorStop(0.5, '#a855f7');
        cg.addColorStop(0.85, '#7c3aed');
        cg.addColorStop(1, '#4c1d95');
        ctx.fillStyle = cg;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(cx, cy, o.w / 2, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, o.w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Rivet ring
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + totalTime * 0.5;
          const rx = cx + Math.cos(a) * (o.w / 2 - 5);
          const ry = cy + Math.sin(a) * (o.w / 2 - 5);
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, o.y + o.h + 4, o.w / 2 + 2, 4, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Wide — gradient slab with spikes
        const wg = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y);
        wg.addColorStop(0, '#fda4af');
        wg.addColorStop(0.5, '#ff2d78');
        wg.addColorStop(1, '#be123c');
        ctx.fillStyle = wg;
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 12;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        // Bevel top edge
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(o.x + 2, o.y, o.w - 4, 3);

        // Warning stripe pattern
        ctx.fillStyle = '#facc15';
        ctx.globalAlpha = 0.4;
        const stripeW = o.w / 6;
        for (let si = 0; si < 6; si += 2) {
          ctx.fillRect(o.x + si * stripeW, o.y + 4, stripeW, o.h - 4);
        }
        ctx.globalAlpha = 1;

        // Spikes on top
        ctx.fillStyle = '#be123c';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 6;
        const spikeCount = 4;
        const spikeW = o.w / spikeCount;
        for (let si = 0; si < spikeCount; si++) {
          ctx.beginPath();
          ctx.moveTo(o.x + si * spikeW, o.y);
          ctx.lineTo(o.x + si * spikeW + spikeW / 2, o.y - 10);
          ctx.lineTo(o.x + (si + 1) * spikeW, o.y);
          ctx.closePath();
          ctx.fill();
        }

        // Highlight line on spikes
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fda4af';
        for (let si = 0; si < spikeCount; si++) {
          ctx.fillRect(o.x + si * spikeW + spikeW / 2 - 2, o.y - 6, 4, 6);
        }

        // Ground shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 4);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Player
    if (!this.gameOver) this.drawPlayer(ctx);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const ps = this.pixelScale;
    const px = Math.round(p.x);
    const py = Math.round(p.y);

    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;

    const legAnim = p.onGround ? Math.sin(this.animationTimer * 6) * 2 : 0;
    const isJumping = !p.onGround;

    // Body — gradient fill
    const bg = ctx.createLinearGradient(px, py, px + 8 * ps, py + 10 * ps);
    bg.addColorStop(0, '#67e8f9');
    bg.addColorStop(0.6, '#00f0ff');
    bg.addColorStop(1, '#0891b2');
    ctx.fillStyle = bg;
    ctx.fillRect(px + 2 * ps, py, 8 * ps, 10 * ps);

    // Head detail (eyes)
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(px + 3 * ps, py + 2 * ps, 2 * ps, 2 * ps);
    ctx.fillRect(px + 7 * ps, py + 2 * ps, 2 * ps, 2 * ps);

    // Eye glow
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    ctx.fillRect(px + 3 * ps, py + 2 * ps, 1 * ps, 2 * ps);
    ctx.fillRect(px + 7 * ps, py + 2 * ps, 1 * ps, 2 * ps);
    ctx.globalAlpha = 1;

    // Mouth
    ctx.fillStyle = '#facc15';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 4;
    ctx.fillRect(px + 4 * ps, py + 5 * ps, 4 * ps, 1 * ps);
    ctx.shadowBlur = 0;

    // Legs — gradient
    const lg = ctx.createLinearGradient(px, py + 10 * ps, px, py + 14 * ps);
    lg.addColorStop(0, '#00f0ff');
    lg.addColorStop(1, '#0891b2');
    ctx.fillStyle = lg;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(px + 2 * ps + legAnim, py + 10 * ps, 3 * ps, 4 * ps);
    ctx.fillRect(px + 7 * ps - legAnim, py + 10 * ps, 3 * ps, 4 * ps);

    // Shoes
    ctx.fillStyle = '#a855f7';
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 6;
    ctx.fillRect(px + 1 * ps + legAnim, py + 13 * ps, 4 * ps, 2 * ps);
    ctx.fillRect(px + 7 * ps - legAnim, py + 13 * ps, 4 * ps, 2 * ps);

    // Double jump / air effect
    if (isJumping) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.shadowBlur = 0;
      ctx.fillRect(px - 2 * ps, py + 2 * ps, 2 * ps, 8 * ps);
      ctx.fillRect(px + 12 * ps, py + 2 * ps, 2 * ps, 8 * ps);
    }

    // Shadow
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(px, this.groundY + 16 * ps, 12 * ps, 3);

    ctx.restore();
  }

  die() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.audio.die();
    this.engine.shake(15, 0.5);
    this.engine.flash('#ff2d78', 0.3);

    this.engine.particles.emitBurst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2,
      ['#ff2d78', '#00f0ff', '#facc15'], 30);

    setTimeout(() => {
      if (this.gameOverCallback) this.gameOverCallback(this.score);
    }, 500);
  }

  setHUDCallback(cb) { this.hudCallback = cb; }
  setGameOverCallback(cb) { this.gameOverCallback = cb; }
}
