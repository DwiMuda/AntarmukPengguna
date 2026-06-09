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

    // Combo system
    this.combo = 0;
    this.comboMultiplier = 1;
    this.coinStreak = 0;
    this.comboTimer = 0;

    // Speed rush
    this.speedRushActive = false;
    this.speedRushTimer = 0;
    this.lastSpeedRushScore = 0;

    // Biome transition
    this.biomeTransitionTimer = 0;
    this.lastBiome = 'city';

    // Coin pattern
    this.coinPatternTimer = 0;
    this.coinPatternCooldown = 0;
    this.coinPatternType = 0;

    // Visual feedback
    this.landingImpact = 0;
    this.speedGlow = 0;
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
    this.lastBiome = 'city';
    this.animationTimer = 0;
    this.landDustTimer = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.coinStreak = 0;
    this.comboTimer = 0;
    this.speedRushActive = false;
    this.speedRushTimer = 0;
    this.lastSpeedRushScore = 0;
    this.biomeTransitionTimer = 0;
    this.coinPatternTimer = 0;
    this.coinPatternCooldown = 0;
    this.landingImpact = 0;
    this.speedGlow = 0;

    engine.audio.startBGM();
  }

  handleResize(width, height) {
    const oldGroundY = this.groundY;
    this.groundY = height * 0.72;
    if (this.player && this.player.onGround) {
      const offset = this.isSliding ? 6 * this.pixelScale : 0;
      this.player.y = this.groundY + offset;
    }
  }

  update(dt) {
    if (this.gameOver) return;

    const { width, height } = this.engine;
    const ps = this.pixelScale;

    this.difficultyTimer += dt;
    this.speed = 250 + this.difficultyTimer * 10;
    this.spawnInterval = Math.max(0.5, 1.8 - this.difficultyTimer * 0.02);

    // Biome
    const prevBiome = this.biome;
    if (this.score > 5000) this.biome = 'wasteland';
    if (this.score > 15000) this.biome = 'core';

    if (this.biome !== prevBiome) {
      this.biomeTransitionTimer = 0.4;
      this.engine.flash('#ffffff', 0.3);
      this.engine.particles.emitBurst(width / 2, height / 2,
        this.biome === 'wasteland' ? ['#ff4444', '#ff8800', '#ffcc00'] : ['#00f0ff', '#0891b2', '#ffffff'], 40);
    }
    if (this.biomeTransitionTimer > 0) this.biomeTransitionTimer -= dt;

    // Speed rush every 1000 points
    if (Math.floor(this.score / 1000) > this.lastSpeedRushScore) {
      this.lastSpeedRushScore = Math.floor(this.score / 1000);
      this.speedRushActive = true;
      this.speedRushTimer = 0.5;
      this.engine.shake(5, 0.3);
      this.engine.flash('#00f0ff', 0.15);
      this.engine.particles.emitBurst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2,
        ['#00f0ff', '#facc15', '#ffffff'], 25);
    }
    if (this.speedRushTimer > 0) {
      this.speedRushTimer -= dt;
      if (this.speedRushTimer <= 0) this.speedRushActive = false;
    }

    // Speed glow increases with speed
    this.speedGlow = Math.min(1, (this.speed - 250) / 400);

    // Slide Input
    const slidePressed = (this.input.isDown('ArrowDown') || this.input.isDown('KeyS')) && this.player.onGround;
    if (slidePressed) {
      if (!this.isSliding) {
        this.player.y += 6 * ps;
        this.isSliding = true;
      }
      this.player.h = 10 * ps;
    } else {
      if (this.isSliding) {
        this.player.y -= 6 * ps;
        this.isSliding = false;
      }
      this.player.h = 16 * ps;
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
        this.engine.particles.emitBurst(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2,
          ['#00f0ff', '#ffffff'], 12);
      }
    }

    this.player.vy += this.gravity * dt;
    this.player.y += this.player.vy * dt;

    if (this.player.y >= this.groundY) {
      if (!this.player.onGround && this.player.vy > 100) {
        this.landDustTimer = 0.25;
        this.landingImpact = 0.2;
        this.engine.particles.emit(this.player.x + this.player.w / 2, this.groundY + 16 * ps, {
          count: 8, color: this.biome === 'core' ? '#00f0ff' : '#a855f7', speed: 50, life: 0.3, size: 3, type: 'spark',
          spread: Math.PI, angle: Math.PI,
        });
        this.engine.shake(3, 0.15);
      }
      this.player.y = this.groundY;
      this.player.vy = 0;
      this.player.onGround = true;
    }

    if (this.landingImpact > 0) this.landingImpact -= dt;

    this.animationTimer += dt * (this.isSliding ? this.speed * 0.02 : this.speed * 0.012);
    this.player.frame = Math.floor(this.animationTimer) % 4;
    if (this.landDustTimer > 0) this.landDustTimer -= dt;

    // Combo timer
    if (this.combo > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.comboMultiplier = 1;
        this.coinStreak = 0;
      }
    }

    // Trail
    if (this.isSliding) {
       if (Math.random() > 0.4) this.engine.particles.emitTrail(this.player.x, this.groundY + 16 * ps, '#ff2d78', 4);
    } else if (this.speed > 300 && this.player.onGround && Math.random() > 0.6) {
      this.engine.particles.emitTrail(this.player.x - 15, this.groundY + 16 * ps, '#a855f7', 5);
    }

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

    // Coin patterns
    this.coinPatternCooldown -= dt;
    if (this.coinPatternCooldown <= 0 && Math.random() < 0.008) {
      this.coinPatternCooldown = 3 + Math.random() * 4;
      this.coinPatternType = Math.floor(Math.random() * 3);
      this.spawnCoinPattern(width);
    } else if (Math.random() < 0.015) {
      const cy = this.groundY - 60 - Math.random() * 100;
      this.coins.push({ x: width + 20, y: cy, size: 10, collected: false });
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x -= this.speed * dt;

      // Moving gate oscillation
      if (o.shape === 4 && o.baseY !== undefined) {
        o.y = o.baseY + Math.sin(o.phase + this.difficultyTimer * o.speed) * o.range;
      }

      if (o.x < -o.w) {
        this.obstacles.splice(i, 1);
        this.score += Math.floor(10 * (1 + this.difficultyTimer * 0.05));
        continue;
      }
      const px = this.player.x, py = this.player.y;
      const pw = this.player.w, ph = this.player.h;
      if (px + pw * 0.3 < o.x + o.w * 0.8 && px + pw * 0.7 > o.x + o.w * 0.2 &&
          py + ph * 0.2 < o.y + o.h * 0.8 && py + ph * 0.8 > o.y + o.h * 0.2) {
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
        this.coinStreak++;
        this.comboTimer = 1.5;
        this.combo = this.coinStreak;
        this.comboMultiplier = 1 + Math.floor(this.coinStreak / 5);
        if (this.comboMultiplier > 5) this.comboMultiplier = 5;
        this.score += 50 * this.comboMultiplier;
        this.audio.coin();
        this.engine.particles.emit(c.x, c.y, {
          count: 8, color: '#facc15', speed: 80, life: 0.4, size: 3, type: 'spark', spread: Math.PI * 2,
        });
      }
    }

    if (this.hudCallback) {
      this.hudCallback({ score: this.score, highScore: 0, combo: this.combo, multiplier: this.comboMultiplier, lives: 1, coins: 0 });
    }
  }

  spawnCoinPattern(width) {
    const ps = this.pixelScale;
    const baseX = width + 40;
    if (this.coinPatternType === 0) {
      // Arc
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const cx = baseX + i * 25;
        const cy = this.groundY - 30 - Math.sin(t * Math.PI) * 60;
        this.coins.push({ x: cx, y: cy, size: 10, collected: false });
      }
    } else if (this.coinPatternType === 1) {
      // Vertical line
      for (let i = 0; i < 4; i++) {
        this.coins.push({ x: baseX + i * 20, y: this.groundY - 40 - i * 25, size: 10, collected: false });
      }
    } else {
      // Zigzag
      for (let i = 0; i < 6; i++) {
        const cx = baseX + i * 22;
        const cy = this.groundY - 50 + (i % 2 === 0 ? -30 : 20);
        this.coins.push({ x: cx, y: cy, size: 10, collected: false });
      }
    }
  }

  spawnObstacle(width) {
    const ps = this.pixelScale;
    const type = Math.random();
    const baseY = this.groundY + 16 * ps;
    let w, h, y, color, shape;

    if (type < 0.25) {
      // Shape 0: Tall pillar — JUMP OVER
      w = 10 * ps;
      h = 14 * ps;
      y = baseY - h;
      color = '#00f0ff';
      shape = 0;
    } else if (type < 0.45) {
      // Shape 1: Floating orb — JUMP or SLIDE
      w = 8 * ps;
      h = 10 * ps;
      y = baseY - 22 * ps;
      color = '#a855f7';
      shape = 1;
    } else if (type < 0.65) {
      // Shape 2: Ceiling beam — SLIDE UNDER
      w = 14 * ps;
      h = 6 * ps;
      y = baseY - 14 * ps - 4;
      color = '#ff2d78';
      shape = 2;
    } else if (type < 0.82) {
      // Shape 3: Overhead laser — SLIDE UNDER
      w = 18 * ps;
      h = 5 * ps;
      y = baseY - 14 * ps - 2;
      color = '#facc15';
      shape = 3;
    } else {
      // Shape 4: Moving gate — TIMING
      w = 12 * ps;
      h = 14 * ps;
      y = baseY - 30 * ps;
      color = '#a855f7';
      shape = 4;
    }

    const obj = { x: width + 20, y, w, h, color, shape, rotation: 0 };
    if (shape === 4) {
      obj.baseY = y + 15 * ps;
      obj.range = 12 * ps;
      obj.phase = Math.random() * Math.PI * 2;
      obj.speed = 1 + Math.random() * 2;
    }
    this.obstacles.push(obj);
  }

  render(ctx) {
    const { width, height, bgRenderer, totalTime } = this.engine;
    const ps = this.pixelScale;

    bgRenderer.drawRunnerBackground(totalTime, this.speed, this.groundY, this.biome);

    // Speed lines
    if (this.speed > 300) {
      const intensity = Math.min(1, (this.speed - 300) / 400);
      ctx.strokeStyle = `rgba(0,240,255,${intensity * 0.08})`;
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        const ly = this.groundY - 80 + (i * 37) % (height - this.groundY + 100);
        const lx = ((totalTime * this.speed * (0.25 + i * 0.04)) % (width + 200));
        const len = 30 + i * 12 + intensity * 40;
        ctx.strokeStyle = `rgba(0,240,255,${intensity * (0.03 + i * 0.005)})`;
        ctx.beginPath();
        ctx.moveTo(width - lx, ly);
        ctx.lineTo(width - lx + len, ly);
        ctx.stroke();
      }
    }

    // Speed rush glow
    if (this.speedRushActive) {
      ctx.save();
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 30 + Math.sin(totalTime * 30) * 15;
      ctx.fillStyle = 'rgba(0,240,255,0.02)';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Edge vignette
      const vg = ctx.createRadialGradient(width/2, height/2, height*0.3, width/2, height/2, height*0.7);
      vg.addColorStop(0, 'rgba(0,240,255,0)');
      vg.addColorStop(1, 'rgba(0,240,255,0.08)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, width, height);
    }

    // Speed edge glow (increases with speed)
    if (this.speedGlow > 0.2) {
      const sg = ctx.createRadialGradient(width/2, height/2, height*0.2, width/2, height/2, height*0.6);
      sg.addColorStop(0, 'rgba(0,240,255,0)');
      sg.addColorStop(1, `rgba(0,240,255,${this.speedGlow * 0.06})`);
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, width, height);
    }

    // Biome ambient particles
    if (this.biome === 'wasteland' && Math.random() > 0.95) {
      ctx.fillStyle = 'rgba(255,150,80,0.06)';
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * this.groundY, 2 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.biome === 'core' && Math.random() > 0.92) {
      const dx = Math.random() * width;
      const dy = this.groundY * 0.2 + Math.random() * this.groundY * 0.6;
      ctx.fillStyle = 'rgba(0,240,255,0.05)';
      ctx.beginPath();
      ctx.arc(dx, dy, 1 + Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Coins
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 12;
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

    // Obstacles
    for (const o of this.obstacles) {
      ctx.save();

      if (o.shape === 0) {
        // Tall pillar — gradient vertical
        const tg = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
        tg.addColorStop(0, '#67e8f9');
        tg.addColorStop(0.3, '#00f0ff');
        tg.addColorStop(0.7, '#0891b2');
        tg.addColorStop(1, '#164e63');
        ctx.fillStyle = tg;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 12;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 4);

        ctx.fillStyle = '#0a0a1a';
        const ey = o.y + o.h * 0.3;
        ctx.fillRect(o.x + 4, ey, 6, 8);
        ctx.fillRect(o.x + o.w - 10, ey, 6, 8);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(o.x + 5, ey + 2, 4, 4);
        ctx.fillRect(o.x + o.w - 9, ey + 2, 4, 4);

        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(o.x + o.w / 2 - 1, o.y + 4, 2, o.h - 8);

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 4);
      } else if (o.shape === 1) {
        // Floating orb — radial gradient sphere
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const cg = ctx.createRadialGradient(cx - 4, cy - 4, 0, cx, cy, o.w / 2);
        cg.addColorStop(0, '#d8b4fe');
        cg.addColorStop(0.5, '#a855f7');
        cg.addColorStop(0.85, '#7c3aed');
        cg.addColorStop(1, '#4c1d95');
        ctx.fillStyle = cg;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(cx, cy, o.w / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.beginPath();
        ctx.arc(cx - 4, cy - 4, o.w * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + totalTime * 0.5;
          const rx = cx + Math.cos(a) * (o.w / 2 - 5);
          const ry = cy + Math.sin(a) * (o.w / 2 - 5);
          ctx.beginPath();
          ctx.arc(rx, ry, 2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, o.y + o.h + 4, o.w / 2 + 2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (o.shape === 2) {
        // Ceiling beam — SLIDE UNDER
        const bg = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
        bg.addColorStop(0, '#fda4af');
        bg.addColorStop(0.5, '#ff2d78');
        bg.addColorStop(1, '#be123c');
        ctx.fillStyle = bg;
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 12;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 2);

        ctx.fillStyle = '#facc15';
        ctx.globalAlpha = 0.3;
        const stripeW = o.w / 6;
        for (let si = 0; si < 6; si += 2) {
          ctx.fillRect(o.x + si * stripeW, o.y + 3, stripeW, o.h - 3);
        }
        ctx.globalAlpha = 1;

        // Bottom glow line
        ctx.fillStyle = '#ff2d78';
        ctx.shadowColor = '#ff2d78';
        ctx.shadowBlur = 8;
        ctx.fillRect(o.x, o.y + o.h - 2, o.w, 2);
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 3);

        // Arrow indicator
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', o.x + o.w / 2, o.y + o.h / 2 + 5);
      } else if (o.shape === 3) {
        // Overhead laser — SLIDE UNDER
        // Laser glow
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 25;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(o.x, o.y, o.w, o.h);

        // Laser core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(o.x + 2, o.y + 1, o.w - 4, o.h - 2);

        // Glow pulse
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 15 + Math.sin(totalTime * 8) * 8;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(o.x, o.y + o.h / 2 - 2, o.w, 4);

        // Support pillars on each side
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(o.x, o.y + o.h - 4, 3, 10);
        ctx.fillRect(o.x + o.w - 3, o.y + o.h - 4, 3, 10);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#facc15';
        ctx.fillRect(o.x, o.y + o.h - 2, 3, 2);
        ctx.fillRect(o.x + o.w - 3, o.y + o.h - 2, 3, 2);

        // Arrow indicator
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.font = 'bold 16px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('\u25BC', o.x + o.w / 2, o.y + o.h + 14);
      } else if (o.shape === 4) {
        // Moving gate — TIMING
        const cx = o.x + o.w / 2;
        const cy = o.y + o.h / 2;
        const gg = ctx.createLinearGradient(o.x, o.y, o.x + o.w, o.y);
        gg.addColorStop(0, '#d8b4fe');
        gg.addColorStop(0.5, '#a855f7');
        gg.addColorStop(1, '#7c3aed');
        ctx.fillStyle = gg;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 14;
        ctx.fillRect(o.x, o.y, o.w, o.h);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#d8b4fe';
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 3);
        ctx.fillRect(o.x + 2, o.y + o.h - 5, o.w - 4, 3);

        // Gate pattern — horizontal bars
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        for (let gi = 0; gi < 4; gi++) {
          ctx.fillRect(o.x + 3, o.y + 4 + gi * (o.h / 4), o.w - 6, 2);
        }

        // Center symbol
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = 'bold 20px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u26DF', cx, cy);

        // Movement indicator arrow
        ctx.fillStyle = 'rgba(168,85,247,0.3)';
        const dir = Math.sin(totalTime * o.speed + o.phase) > 0 ? '\u25B2' : '\u25BC';
        ctx.font = '12px Courier New';
        ctx.fillText(dir, cx + o.w / 2 + 10, cy);

        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(o.x - 2, o.y + o.h, o.w + 4, 3);
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Landing impact ring
    if (this.landingImpact > 0 && this.player.onGround) {
      ctx.save();
      const progress = 1 - this.landingImpact / 0.2;
      const ringR = 5 * ps + progress * 20 * ps;
      ctx.strokeStyle = `rgba(168,85,247,${0.3 * (1 - progress)})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(this.player.x + this.player.w / 2, this.groundY + 16 * ps, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Player
    if (!this.gameOver) this.drawPlayer(ctx);
  }

  drawPlayer(ctx) {
    const p = this.player;
    const ps = this.pixelScale;
    const bx = Math.round(p.x) + p.w / 2;
    const by = Math.round(p.y) + p.h;
    const t = this.animationTimer;
    const onGround = p.onGround;

    ctx.save();
    ctx.translate(bx, by);

    const phase = t * 6;
    const bob = onGround ? Math.abs(Math.sin(phase)) * 0.6 * ps : 0;
    const swing = onGround ? Math.sin(phase) : 0;
    const armSwing = onGround ? Math.sin(phase + Math.PI) : 0;

    // Body structure (relative to base at feet)
    const hipY = -6 * ps - bob;
    const hipW = 2.5 * ps;
    const torsoY = -12 * ps - bob;
    const hw = 5 * ps;
    const hh = 3.5 * ps;
    const headY = -16 * ps - bob;
    const headR = 3.5 * ps;

    // === FAT LINE HELPER ===
    const fatLine = (x1, y1, x2, y2, w, color, glow, blur) => {
      if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = blur || 6; }
      ctx.fillStyle = color;
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 0.5) { ctx.beginPath(); ctx.arc(x1, y1, w/2, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0; return; }
      const nx = -dy / len * w / 2, ny = dx / len * w / 2;
      ctx.beginPath();
      ctx.moveTo(x1 + nx, y1 + ny);
      ctx.lineTo(x2 + nx, y2 + ny);
      ctx.lineTo(x2 - nx, y2 - ny);
      ctx.lineTo(x1 - nx, y1 - ny);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath(); ctx.arc(x1, y1, w/2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, w/2, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    };

    // === SPEED TRAIL ===
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(0,240,255,${0.04 - i * 0.007})`;
      ctx.fillRect(-(4 + i * 3) * ps, -2 * ps - i * 2, 3 + i * 0.5, 1);
    }

    // === BACK LIMBS (drawn first) ===
    const legA = swing * 0.65;
    const aLen = 6.5 * ps;
    const aW = 3 * ps;
    const armA = -Math.PI / 2 + armSwing * 0.45;

    // Back arm
    const bkElbowX = -hw + Math.cos(armA) * aLen * 0.5;
    const bkElbowY = (torsoY - hh + 1) + Math.sin(armA) * aLen * 0.5;
    const bkHandX = bkElbowX + Math.cos(armA + 0.15) * aLen * 0.5;
    const bkHandY = bkElbowY + Math.sin(armA + 0.15) * aLen * 0.5;
    fatLine(-hw, torsoY - hh + 1, bkElbowX, bkElbowY, aW, '#0e7490', '#00f0ff', 4);
    fatLine(bkElbowX, bkElbowY, bkHandX, bkHandY, aW * 0.8, '#0e7490', null, 0);

    // Back leg
    const bkThighA = -legA * 0.5;
    const bkKneeX = -hipW + Math.sin(bkThighA) * 5 * ps;
    const bkKneeY = hipY + Math.cos(bkThighA) * 5 * ps;
    const bkShinA = bkThighA + 0.2;
    const bkFootX = bkKneeX + Math.sin(bkShinA) * 4.5 * ps;
    const bkFootY = bkKneeY + Math.cos(bkShinA) * 4.5 * ps;
    fatLine(-hipW, hipY, bkKneeX, bkKneeY, 3.5 * ps, '#0e7490', '#00f0ff', 5);
    fatLine(bkKneeX, bkKneeY, bkFootX, bkFootY, 3 * ps, '#0e7490', '#00f0ff', 4);

    // === TORSO ===
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    const tGrad = ctx.createLinearGradient(-hw, torsoY - hh, hw, torsoY + hh);
    tGrad.addColorStop(0, '#22d3ee');
    tGrad.addColorStop(0.4, '#06b6d4');
    tGrad.addColorStop(0.8, '#0891b2');
    tGrad.addColorStop(1, '#0e7490');
    ctx.fillStyle = tGrad;
    ctx.beginPath();
    ctx.moveTo(-hw, torsoY - hh);
    ctx.lineTo(hw, torsoY - hh);
    ctx.lineTo(hw * 0.5, torsoY + hh);
    ctx.lineTo(-hw * 0.5, torsoY + hh);
    ctx.closePath();
    ctx.fill();

    // Armor edge glow
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,240,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-hw, torsoY - hh + 2);
    ctx.lineTo(-hw * 0.5, torsoY + hh - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hw, torsoY - hh + 2);
    ctx.lineTo(hw * 0.5, torsoY + hh - 2);
    ctx.stroke();

    // === CHEST CORE ===
    const coreY = torsoY - 1 * ps;
    const coreR = 2.5 * ps + Math.sin(t * 4) * 0.3 * ps;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 18;
    const cGrad = ctx.createRadialGradient(0, coreY - 1, 0, 0, coreY, coreR);
    cGrad.addColorStop(0, '#ffffff');
    cGrad.addColorStop(0.3, '#67e8f9');
    cGrad.addColorStop(1, 'rgba(0,240,255,0.1)');
    ctx.fillStyle = cGrad;
    ctx.beginPath(); ctx.arc(0, coreY, coreR, 0, Math.PI * 2); ctx.fill();

    // === SHOULDER PADS ===
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath(); ctx.arc(-hw + 1, torsoY - hh + 1, 2.5 * ps, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(hw - 1, torsoY - hh + 1, 2.5 * ps, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // === BELT ===
    ctx.fillStyle = '#475569';
    ctx.fillRect(-hw * 0.4, torsoY + hh - 2, hw * 0.8, 3);
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2, torsoY + hh - 1, 4, 2);
    ctx.shadowBlur = 0;

    // === FRONT LIMBS (drawn on top) ===
    const frThighA = legA;
    const frKneeX = hipW + Math.sin(frThighA) * 5 * ps;
    const frKneeY = hipY + Math.cos(frThighA) * 5 * ps;
    const frKneeBend = Math.max(0, -swing) * 0.35;
    const frShinA = frThighA + frKneeBend;
    const frFootX = frKneeX + Math.sin(frShinA) * 4.5 * ps;
    const frFootY = frKneeY + Math.cos(frShinA) * 4.5 * ps;
    fatLine(hipW, hipY, frKneeX, frKneeY, 3.5 * ps, '#0284c7', '#00f0ff', 6);
    fatLine(frKneeX, frKneeY, frFootX, frFootY, 3 * ps, '#0284c7', '#00f0ff', 5);

    // Knee joint
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0284c7';
    ctx.beginPath(); ctx.arc(frKneeX, frKneeY, 2.5 * ps, 0, Math.PI * 2); ctx.fill();

    // Front arm
    const frArmA = -Math.PI / 2 - armSwing * 0.45;
    const frElbowX = hw + Math.cos(frArmA) * aLen * 0.5;
    const frElbowY = (torsoY - hh + 1) + Math.sin(frArmA) * aLen * 0.5;
    const frHandX = frElbowX + Math.cos(frArmA - 0.15) * aLen * 0.5;
    const frHandY = frElbowY + Math.sin(frArmA - 0.15) * aLen * 0.5;
    fatLine(hw, torsoY - hh + 1, frElbowX, frElbowY, aW, '#0284c7', '#00f0ff', 5);
    fatLine(frElbowX, frElbowY, frHandX, frHandY, aW * 0.8, '#0284c7', null, 0);

    // === BOOTS ===
    const drawBoot = (fx, fy) => {
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 12;
      const bg = ctx.createRadialGradient(fx, fy - 1, 0, fx, fy, 2.5 * ps);
      bg.addColorStop(0, '#c084fc');
      bg.addColorStop(0.5, '#a855f7');
      bg.addColorStop(1, '#7c3aed');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(fx, fy, 2.5 * ps, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#d8b4fe';
      ctx.beginPath(); ctx.arc(fx, fy, 1 * ps, 0, Math.PI * 2); ctx.fill();
    };
    drawBoot(frFootX, frFootY);
    drawBoot(bkFootX, bkFootY);

    // === HEAD ===
    const hy = headY + headR * 0.2;

    // Helmet dome
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 14;
    const hGrad = ctx.createRadialGradient(-headR * 0.3, hy - headR * 0.3, 0, 0, hy, headR);
    hGrad.addColorStop(0, '#334155');
    hGrad.addColorStop(0.5, '#1e293b');
    hGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = hGrad;
    ctx.beginPath(); ctx.arc(0, hy, headR, 0, Math.PI * 2); ctx.fill();

    // Helmet rim
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(0,240,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, hy, headR - 0.5, -Math.PI * 0.75, Math.PI * 0.75);
    ctx.stroke();

    // Visor
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;
    const vGrad = ctx.createLinearGradient(-headR * 0.7, hy - 0.3 * ps, headR * 0.7, hy + 1.5 * ps);
    vGrad.addColorStop(0, '#67e8f9');
    vGrad.addColorStop(0.5, '#00f0ff');
    vGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = vGrad;
    ctx.beginPath();
    ctx.roundRect(-headR * 0.7, hy - 0.3 * ps, headR * 1.4, 2 * ps, 2);
    ctx.fill();

    // Visor highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.roundRect(-headR * 0.35, hy, headR * 0.7, 0.8 * ps, 1);
    ctx.fill();

    // === ANTENNA ===
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, hy - headR - 2 * ps, 2, 2 * ps);
    ctx.fillRect(-2, hy - headR - 3.5 * ps, 4, 1.5 * ps);
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath(); ctx.arc(0, hy - headR - 4.5 * ps, 1.3 * ps, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // === ENERGY SCARF TRAIL ===
    if (onGround) {
      for (let i = 0; i < 3; i++) {
        const alpha = 0.15 - i * 0.04;
        ctx.globalAlpha = alpha;
        const tx = Math.sin(t * 3 + i * 0.7) * (2 + i);
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f0ff';
        ctx.fillRect(-(5 + i * 2) * ps + Math.round(tx), torsoY - (0.5 + i) * ps, 2 * ps, 2 * ps);
      }
      ctx.globalAlpha = 1;
    }

    // === DOUBLE JUMP EFFECT ===
    if (!onGround) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.06)';
      ctx.shadowBlur = 0;
      ctx.fillRect(-6 * ps, -19 * ps, 1.5 * ps, 14 * ps);
      ctx.fillRect(4.5 * ps, -19 * ps, 1.5 * ps, 14 * ps);
    }

    // === FOOTSTEP SPARKS ===
    if (onGround && Math.abs(swing) < 0.15) {
      ctx.fillStyle = 'rgba(168,85,247,0.25)';
      ctx.shadowBlur = 0;
      ctx.beginPath(); ctx.arc(frFootX, 0, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(bkFootX, 0, 2, 0, Math.PI * 2); ctx.fill();
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.beginPath();
    ctx.ellipse(0, 1, Math.max(Math.abs(frFootX), Math.abs(bkFootX)) + 2 * ps, 1.2 * ps, 0, 0, Math.PI * 2);
    ctx.fill();

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

  destroy() {
  }
}
