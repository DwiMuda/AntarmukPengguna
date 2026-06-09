class AsteroidBlaster {
  constructor() {
    this.engine = null;
    this.input = null;
    this.audio = null;

    this.ship = null;
    this.bullets = [];
    this.asteroids = [];
    this.powerups = [];
    this.floatingTexts = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.boss = null;
    this.powerupTimers = { spread: 0, rapid: 0 };

    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.lives = 3;
    this.gameOver = false;

    this.powerMeter = 0;
    this.cyberBurst = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.difficultyTimer = 0;
    this.speedMultiplier = 1;
    this.killCount = 0;
    this.thrustTimer = 0;
  }

  init(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.audio = engine.audio;

    const upgSpeed = this.upgrades ? this.upgrades.speed : 0;
    const upgHealth = this.upgrades ? this.upgrades.health : 0;
    const upgFireRate = this.upgrades ? this.upgrades.fireRate : 0;

    this.ship = {
      x: engine.width / 2,
      y: engine.height - 80,
      w: 30,
      h: 30,
      speed: 300 + (upgSpeed * 30),
      shield: false,
    };

    this.bullets = [];
    this.asteroids = [];
    this.particles = [];
    this.powerups = [];
    this.floatingTexts = [];
    this.enemies = [];
    this.enemyBullets = [];
    this.boss = null;
    this.powerupTimers = { spread: 0, rapid: 0 };
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.lives = 3 + upgHealth;
    this.gameOver = false;
    this.powerMeter = 0;
    this.cyberBurst = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.5;
    this.difficultyTimer = 0;
    this.speedMultiplier = 1;
    this.killCount = 0;
    this.shootCooldown = 0;
    this.baseCooldown = 0.2 - (upgFireRate * 0.02);
    this.thrustTimer = 0;
    this._bossSpawned = false;

    this.spawnAsteroid();
    this.spawnAsteroid();

    engine.particles.clear();
    engine.audio.startBGM();

    this._onResize = () => {
      if (!this.gameOver) this.ship.y = engine.height - 80;
    };
    window.addEventListener('resize', this._onResize);
  }

  spawnAsteroid() {
    const size = Math.random();
    let radius, hp, scoreVal;
    if (size < 0.3) {
      radius = 15 + Math.random() * 10; hp = 1; scoreVal = 100;
    } else if (size < 0.65) {
      radius = 25 + Math.random() * 10; hp = 2; scoreVal = 50;
    } else {
      radius = 40 + Math.random() * 15; hp = 3; scoreVal = 25;
    }

    const sides = 8 + Math.floor(radius / 8);
    const jagged = [];
    for (let i = 0; i < sides; i++) jagged.push(0.8 + Math.random() * 0.2);

    this.asteroids.push({
      x: radius + Math.random() * (this.engine.width - radius * 2),
      y: -radius,
      vx: (Math.random() - 0.5) * 60 * this.speedMultiplier,
      vy: (80 + Math.random() * 120) * this.speedMultiplier,
      radius, hp, maxHp: hp, scoreVal,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 3,
      jagged, sides,
    });
  }

  splitAsteroid(ast) {
    if (ast.maxHp <= 1) return;
    const newRadius = ast.radius * 0.55;
    const newMaxHp = Math.max(1, ast.maxHp - 1);
    const newSides = 6 + Math.floor(newRadius / 6);
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const jagged = [];
      for (let j = 0; j < newSides; j++) jagged.push(0.8 + Math.random() * 0.2);
      this.asteroids.push({
        x: ast.x + Math.cos(angle) * ast.radius * 0.5,
        y: ast.y + Math.sin(angle) * ast.radius * 0.5,
        vx: Math.cos(angle) * (60 + Math.random() * 60) * this.speedMultiplier,
        vy: Math.sin(angle) * (60 + Math.random() * 60) * this.speedMultiplier,
        radius: newRadius, hp: newMaxHp, maxHp: newMaxHp,
        scoreVal: ast.scoreVal * 2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 3,
        jagged, sides: newSides,
      });
    }
  }

  spawnFloatingText(x, y, text, color) {
    this.floatingTexts.push({ x, y, text, color, life: 1, maxLife: 1 });
  }

  spawnEnemy() {
    const type = Math.random();
    if (type < 0.6) {
      // Interceptor: Dodges bullets
      this.enemies.push({
        type: 'interceptor',
        x: 40 + Math.random() * (this.engine.width - 80),
        y: -40, w: 35, h: 25,
        vx: (Math.random() > 0.5 ? 1 : -1) * 120,
        vy: 60, hp: 8, maxHp: 8,
        shootTimer: 2,
        dodgeCooldown: 0
      });
    } else {
      // Shielder: High health tank
      this.enemies.push({
        type: 'shielder',
        x: 40 + Math.random() * (this.engine.width - 80),
        y: -40, w: 50, h: 40,
        vx: 40, vy: 40, hp: 30, maxHp: 30,
        shootTimer: 3
      });
    }
  }

  spawnBoss() {
    this.boss = {
      x: this.engine.width / 2, y: -100,
      w: 120, h: 80,
      vx: 60, vy: 30,
      hp: 300, maxHp: 300,
      phase: 1, shootTimer: 2,
    };
    this.audio.bossWarning();
    this.spawnFloatingText(this.engine.width / 2, 100, "!! MOTHERSHIP APPROACHING !!", '#ff2d78');
    this.engine.shake(10, 0.5);
  }

  spawnExplosion(x, y, color, count) {
    this.engine.particles.emit(x, y, {
      count, color, speed: 150, life: 0.5, size: 3, type: 'spark', spread: Math.PI * 2,
    });
    this.engine.particles.emit(x, y, {
      count: Math.floor(count / 2), color: '#facc15', speed: 80, life: 0.3, size: 2, type: 'glow', spread: Math.PI * 2,
    });
  }

  spawnPowerup(x, y) {
    if (Math.random() > 0.15) return;
    const types = ['spread', 'shield', 'rapid'];
    const type = types[Math.floor(Math.random() * types.length)];
    this.powerups.push({
      x, y, vx: (Math.random() - 0.5) * 40, vy: 50 + Math.random() * 50,
      radius: 12, type, life: 10,
    });
  }

  applyPowerup(type) {
    if (type === 'spread') this.powerupTimers.spread = 8;
    else if (type === 'shield') this.ship.shield = true;
    else if (type === 'rapid') this.powerupTimers.rapid = 8;
    this.addScore(200, 0);
  }

  addScore(base, combo) {
    this.score += Math.floor(base * (1 + combo * 0.5));
  }

  activateCyberBurst() {
    this.powerMeter = 0;
    this.cyberBurst = 5;
    this.engine.flash('#ff2d78', 0.2);
    this.engine.shake(10, 0.5);
    this.spawnFloatingText(this.ship.x, this.ship.y - 40, "CYBER-BURST ACTIVE!", '#ff2d78');
  }

  update(dt) {
    if (this.gameOver) return;

    const { width, height } = this.engine;
    this.thrustTimer += dt;
    if (this.cyberBurst > 0) this.cyberBurst -= dt;

    this.shootCooldown -= dt;
    if (this.powerupTimers.spread > 0) this.powerupTimers.spread -= dt;
    if (this.powerupTimers.rapid > 0) this.powerupTimers.rapid -= dt;

    this.keys = {
      left: this.input.isDown('ArrowLeft') || this.input.isDown('KeyA'),
      right: this.input.isDown('ArrowRight') || this.input.isDown('KeyD'),
      up: this.input.isDown('ArrowUp') || this.input.isDown('KeyW'),
      down: this.input.isDown('ArrowDown') || this.input.isDown('KeyS'),
    };

    const isFiring = this.input.isDown('Space') || this.input.wasPressed('Space') || this.input.isTouchActive() || this.cyberBurst > 0;

    if (isFiring && this.shootCooldown <= 0) {
      const cd = this.cyberBurst > 0 ? 0.05 : (this.powerupTimers.rapid > 0 ? this.baseCooldown * 0.4 : this.baseCooldown);
      this.shootCooldown = cd;

      const bulletColor = this.cyberBurst > 0 ? '#ff2d78' : '#facc15';
      this.bullets.push({ x: this.ship.x, y: this.ship.y - this.ship.h / 2, vx: 0, vy: -600, radius: 3, color: bulletColor });
      if (this.powerupTimers.spread > 0 || this.cyberBurst > 0) {
        this.bullets.push({ x: this.ship.x, y: this.ship.y - this.ship.h / 2, vx: -150, vy: -580, radius: 3, color: bulletColor });
        this.bullets.push({ x: this.ship.x, y: this.ship.y - this.ship.h / 2, vx: 150, vy: -580, radius: 3, color: bulletColor });
      }
      this.audio.shoot();
      this.engine.shake(this.cyberBurst > 0 ? 3 : 1, 0.03);
    }

    // Power Meter activation - also activate on double tap or high meter for mobile
    if (this.input.wasPressed('KeyQ') || this.input.wasPressed('KeyE')) {
      if (this.powerMeter >= 100) {
        this.activateCyberBurst();
      }
    } else if (this.powerMeter >= 100 && this.input.isTouchActive() && Math.random() < 0.01) {
      // Auto-activate for mobile if they can't press Q/E
      this.activateCyberBurst();
    }

    if (this.input.isTouchActive()) {
      const tx = this.input.getTouchX();
      this.keys.left = tx < width / 2 - 40;
      this.keys.right = tx > width / 2 + 40;
    }

    let dx = 0, dy = 0;
    if (this.keys.left) dx -= 1;
    if (this.keys.right) dx += 1;
    if (this.keys.up) dy -= 1;
    if (this.keys.down) dy += 1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) { dx /= len; dy /= len; }
    this.ship.x += dx * this.ship.speed * dt;
    this.ship.y += dy * this.ship.speed * dt;
    this.ship.x = Math.max(this.ship.w / 2, Math.min(width - this.ship.w / 2, this.ship.x));
    this.ship.y = Math.max(this.ship.h / 2, Math.min(height - this.ship.h / 2, this.ship.y));

    // Engine trail
    if (dx !== 0 || dy !== 0) {
      this.engine.particles.emitTrail(this.ship.x - dx * 10, this.ship.y - dy * 10 + 10, '#00f0ff', 4);
    }

    // Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      this.engine.particles.emitTrail(b.x, b.y, b.color || '#facc15', 2);
      if (b.y < -10) { this.bullets.splice(i, 1); continue; }

      let hit = false;

      if (this.boss && !hit) {
        if (Math.abs(b.x - this.boss.x) < this.boss.w / 2 && Math.abs(b.y - this.boss.y) < this.boss.h / 2) {
          this.boss.hp--; hit = true;
          this.engine.particles.emit(b.x, b.y, { count: 3, color: '#facc15', speed: 80, life: 0.2, size: 2, spread: Math.PI * 2 });
          if (this.boss.hp <= 0) {
            this.engine.particles.emitBurst(this.boss.x, this.boss.y, ['#ff2d78', '#facc15', '#00f0ff'], 60);
            this.engine.particles.emitRing(this.boss.x, this.boss.y, '#ff2d78', 60);
            this.addScore(5000, 0);
            if (this.onAddCoins) this.onAddCoins(50);
            this.spawnFloatingText(this.boss.x, this.boss.y, "+5000 (50\"" + "\u25C7" + ")", "#facc15");
            this.boss = null;
            this._bossSpawned = false;
            this.audio.explosion();
            this.engine.shake(20, 1.0);
            this.engine.effects.hitStop(0.15);
          } else {
            this.audio.hit();
          }
        }
      }

      if (!hit) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
            if (e.type === 'interceptor' && (e.dodgeCooldown || 0) <= 0) {
              e.vx *= -2;
              e.dodgeCooldown = 0.5;
              this.engine.particles.emit(e.x, e.y, { count: 8, color: '#00f0ff', speed: 120, life: 0.2, size: 2, spread: Math.PI * 2 });
              hit = true;
            } else {
              e.hp--; hit = true;
              if (e.hp <= 0) {
                this.enemies.splice(j, 1);
                this.engine.particles.emitBurst(e.x, e.y, ['#ff2d78', '#a855f7'], 20);
                this.addScore(300, 0);
                this.powerMeter = Math.min(100, this.powerMeter + 10);
                this.engine.effects.hitStop(0.05);
                if (Math.random() > 0.5 && this.onAddCoins) this.onAddCoins(2);
                this.spawnFloatingText(e.x, e.y, "+300", "#00f0ff");
                this.audio.explosion();
                this.engine.shake(3, 0.1);
              } else {
                this.audio.hit();
                this.engine.particles.emit(b.x, b.y, { count: 3, color: '#facc15', speed: 60, life: 0.2, size: 2, spread: Math.PI * 2 });
              }
            }
            break;
          }
        }
      }

      if (!hit) {
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          // Forgiving hitboxes: 0.75 scale
          if (Math.hypot(b.x - a.x, b.y - a.y) < (a.radius * 0.75) + b.radius) {
            a.hp--; hit = true;
            if (a.hp <= 0) {
              this.splitAsteroid(a);
              this.asteroids.splice(j, 1);
              this.spawnPowerup(a.x, a.y);
              this.killCount++;
              this.powerMeter = Math.min(100, this.powerMeter + 2);
              this.engine.effects.hitStop(0.03);

              this.combo++;
              this.comboTimer = 1.5;
              const comboLvl = Math.min(Math.floor(this.combo / 3), 5);
              this.multiplier = 1 + comboLvl * 0.5;
              const finalScore = 100 * this.multiplier;

              this.engine.particles.emitBurst(a.x, a.y, ['#00f0ff', '#a855f7', '#facc15'], 25);
              this.engine.particles.emitRing(a.x, a.y, '#00f0ff', a.radius);
              this.spawnFloatingText(a.x, a.y, `+${finalScore}`, '#00f0ff');

              if (this.killCount % 10 === 0) {
                this.spawnFloatingText(this.ship.x, this.ship.y - 60, `${this.killCount} KILL STREAK!`, '#facc15');
              }

              if (Math.random() > 0.6 && this.onAddCoins) {
                this.onAddCoins(1);
                this.spawnFloatingText(a.x, a.y - 20, '+1' + '\u25C7', '#facc15');
              }

              this.audio.explosion();
              this.engine.shake(5, 0.1);
              if (comboLvl >= 1) this.audio.combo();
              this.addScore(100, comboLvl);
            } else {
              this.engine.particles.emit(a.x, a.y, { count: 5, color: '#ff2d78', speed: 60, life: 0.2, size: 2, spread: Math.PI * 2 });
              this.audio.hit();
            }
            break;
          }
        }
      }

      if (hit) {
        this.bullets.splice(i, 1);
      }
    }

    // Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.x += a.vx * dt;
      a.y += a.vy * dt;
      a.rotation += a.rotSpeed * dt;
      if (a.y > height + a.radius + 50) { this.asteroids.splice(i, 1); continue; }
      // Forgiving hitbox: 0.7 scale for player vs asteroid
      if (Math.hypot(this.ship.x - a.x, this.ship.y - a.y) < (a.radius * 0.7) + (this.ship.w * 0.4)) {
        this.asteroids.splice(i, 1);
        this.hitPlayer();
      }
    }

    // Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * dt;
      if (e.y < 100) e.y += e.vy * dt;
      if (e.x < e.w / 2 || e.x > width - e.w / 2) e.vx *= -1;
      
      if (e.dodgeCooldown > 0) e.dodgeCooldown -= dt;
      
      e.shootTimer -= dt;
      if (e.shootTimer <= 0) {
        e.shootTimer = e.type === 'shielder' ? 3 : 1.5 + Math.random();
        this.enemyBullets.push({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: 300, radius: 4 });
        if (e.type === 'shielder') {
          this.enemyBullets.push({ x: e.x - 20, y: e.y + 10, vx: -40, vy: 280, radius: 3 });
          this.enemyBullets.push({ x: e.x + 20, y: e.y + 10, vx: 40, vy: 280, radius: 3 });
        }
      }
      if (Math.abs(this.ship.x - e.x) < (e.w / 2 + this.ship.w / 2) && Math.abs(this.ship.y - e.y) < (e.h / 2 + this.ship.y / 2)) {
        this.enemies.splice(i, 1);
        this.hitPlayer();
      }
    }

    // Boss
    if (this.boss) {
      const b = this.boss;
      b.x += b.vx * dt;
      if (b.y < 100) b.y += b.vy * dt;
      if (b.x < b.w / 2 + 20 || b.x > width - b.w / 2 - 20) b.vx *= -1;
      b.shootTimer -= dt;
      if (b.shootTimer <= 0) {
        b.shootTimer = 1.2;
        this.enemyBullets.push({ x: b.x - 40, y: b.y + 20, vx: -50, vy: 350, radius: 5 });
        this.enemyBullets.push({ x: b.x + 40, y: b.y + 20, vx: 50, vy: 350, radius: 5 });
        this.enemyBullets.push({ x: b.x, y: b.y + 40, vx: 0, vy: 400, radius: 6 });
        this.engine.shake(2, 0.1);
      }
      if (Math.abs(this.ship.x - b.x) < (b.w / 2 + this.ship.w / 2) && Math.abs(this.ship.y - b.y) < (b.h / 2 + this.ship.h / 2)) {
        this.hitPlayer();
      }
    }

    // Enemy bullets
    for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
      const eb = this.enemyBullets[i];
      eb.x += eb.vx * dt;
      eb.y += eb.vy * dt;
      if (eb.y > height + 20) { this.enemyBullets.splice(i, 1); continue; }
      if (Math.hypot(this.ship.x - eb.x, this.ship.y - eb.y) < eb.radius + this.ship.w / 2) {
        this.enemyBullets.splice(i, 1);
        this.hitPlayer();
      }
    }

    // Spawning
    this.spawnTimer += dt;
    this.spawnInterval = Math.max(0.4, 1.5 - this.difficultyTimer * 0.02);
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      if (!this.boss) {
        if (this.difficultyTimer > 15 && Math.random() < 0.25) this.spawnEnemy();
        else this.spawnAsteroid();
      }
    }

    this.difficultyTimer += dt;
    this.speedMultiplier = 1 + this.difficultyTimer * 0.03;

    if (this.difficultyTimer > 60 && !this.boss && !this._bossSpawned) {
      this._bossSpawned = true;
      this.spawnBoss();
      this.difficultyTimer = 65;
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.multiplier = 1; }
    }

    // Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (Math.hypot(this.ship.x - p.x, this.ship.y - p.y) < p.radius + this.ship.w / 2) {
        this.applyPowerup(p.type);
        this.powerups.splice(i, 1);
        this.audio.powerup();
        this.spawnFloatingText(p.x, p.y, p.type.toUpperCase() + '!', '#facc15');
        continue;
      }
      if (p.y > height + 50 || p.life <= 0) this.powerups.splice(i, 1);
    }

    // Floating text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 30 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // Persist engine particles
    this.engine.particles.update(dt);

    if (this.hudCallback) {
      this.hudCallback({
        score: this.score, highScore: 0,
        combo: this.combo, multiplier: this.multiplier,
        lives: this.lives, coins: 0
      });
    }
  }

  render(ctx) {
    const { width, height, bgRenderer, totalTime } = this.engine;

    bgRenderer.drawAsteroidBackground(totalTime, this.speedMultiplier);

    // Powerups
    for (const p of this.powerups) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const pColor = p.type === 'spread' ? '#facc15' : p.type === 'shield' ? '#00f0ff' : '#ff2d78';
      const pulse = Math.sin(totalTime * 10) * 2;
      const pr = p.radius + pulse;

      // Outer glow
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 25;

      // Gradient core
      const pg = ctx.createRadialGradient(0, 0, 0, 0, 0, pr);
      pg.addColorStop(0, '#ffffff');
      pg.addColorStop(0.3, pColor);
      pg.addColorStop(0.8, pColor + '88');
      pg.addColorStop(1, 'transparent');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(0, 0, pr, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      if (p.type === 'spread') {
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 + totalTime * 2;
          ctx.fillStyle = '#facc15';
          ctx.beginPath();
          ctx.arc(Math.cos(a) * (pr * 0.65), Math.sin(a) * (pr * 0.65), 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 4]);
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + totalTime * 3;
          const r = pr * 0.7;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (p.type === 'shield') {
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pr * 0.75, -Math.PI * 0.85 + Math.sin(totalTime * 2) * 0.3, Math.PI * 0.85 + Math.sin(totalTime * 2) * 0.3);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0,240,255,0.12)';
        ctx.fillRect(-pr * 0.35, -pr * 0.55, pr * 0.7, pr * 1.1);
        ctx.fillStyle = 'rgba(0,240,255,0.25)';
        ctx.beginPath();
        ctx.arc(0, 0, pr * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#ff2d78';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (i / 3) * Math.PI * 2 - Math.PI / 2 + totalTime * 4;
          const r = pr * 0.7;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(0, 0, 4 + Math.sin(totalTime * 6) * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Asteroids
    for (const a of this.asteroids) {
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rotation);
      const color = a.hp <= 1 ? '#ff2d78' : a.hp <= 2 ? '#a855f7' : '#00f0ff';

      // Smooth irregular shape
      ctx.beginPath();
      for (let i = 0; i < a.sides; i++) {
        const angle = (i / a.sides) * Math.PI * 2;
        const r = a.radius * a.jagged[i];
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      // Rich multi-layer gradient
      const grad = ctx.createRadialGradient(-a.radius * 0.25, -a.radius * 0.25, 0, 0, 0, a.radius);
      if (a.maxHp <= 1) {
        grad.addColorStop(0, '#8a7f6e');
        grad.addColorStop(0.4, '#5a5045');
        grad.addColorStop(0.75, '#3a3025');
        grad.addColorStop(1, '#1a1510');
      } else if (a.maxHp <= 2) {
        grad.addColorStop(0, '#a855f7');
        grad.addColorStop(0.4, '#7c3aed');
        grad.addColorStop(0.75, '#5b21b6');
        grad.addColorStop(1, '#2e1065');
      } else {
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(0.4, '#0891b2');
        grad.addColorStop(0.75, '#164e63');
        grad.addColorStop(1, '#0a1628');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Inner glow edge
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.strokeStyle = color + '88';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Surface texture — random craters
      ctx.shadowBlur = 0;
      for (let ci = 0; ci < 4; ci++) {
        const seed = ci * 2.1 + a.x * 0.01;
        const cx2 = Math.cos(seed) * a.radius * 0.4;
        const cy2 = Math.sin(seed * 1.3) * a.radius * 0.4;
        const cr = a.radius * (0.12 + ci * 0.08);
        // crater shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.arc(cx2 + 1, cy2 + 1, cr, 0, Math.PI * 2);
        ctx.fill();
        // crater highlight
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.beginPath();
        ctx.arc(cx2, cy2, cr * 0.8, 0, Math.PI * 2);
        ctx.fill();
        // crater dark center
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath();
        ctx.arc(cx2, cy2, cr * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Surface noise dots
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let ni = 0; ni < 8; ni++) {
        const nx = Math.cos(ni * 3.7) * a.radius * 0.6;
        const ny = Math.sin(ni * 2.9) * a.radius * 0.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // HP glow
      if (a.hp < a.maxHp) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // Ship
    if (!this.gameOver) {
      ctx.save();
      ctx.translate(this.ship.x, this.ship.y);

      if (this.ship.shield) {
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(0, 0, this.ship.w * 0.9, 0, Math.PI * 2);
        ctx.stroke();

        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, this.ship.w * 0.9);
        sg.addColorStop(0, 'rgba(0,240,255,0.02)');
        sg.addColorStop(0.7, 'rgba(0,240,255,0.05)');
        sg.addColorStop(1, 'rgba(0,240,255,0.15)');
        ctx.fillStyle = sg;
        ctx.fill();
      }

      // Ship body — filled gradient
      const sg2 = ctx.createLinearGradient(-this.ship.w / 2, -this.ship.h / 2, this.ship.w / 2, this.ship.h / 2);
      sg2.addColorStop(0, '#00f0ff');
      sg2.addColorStop(0.5, '#06b6d4');
      sg2.addColorStop(1, '#0891b2');
      ctx.fillStyle = sg2;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 15;

      ctx.beginPath();
      ctx.moveTo(0, -this.ship.h / 2);
      ctx.lineTo(-this.ship.w / 2, this.ship.h / 2);
      ctx.lineTo(-this.ship.w / 4, this.ship.h / 3);
      ctx.lineTo(0, this.ship.h / 2 - 4);
      ctx.lineTo(this.ship.w / 4, this.ship.h / 3);
      ctx.lineTo(this.ship.w / 2, this.ship.h / 2);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -this.ship.h / 2 + 4);
      ctx.lineTo(-this.ship.w / 2 + 4, this.ship.h / 2 - 2);
      ctx.stroke();

      // Engine thrust
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      const thrustSize = 4 + Math.sin(this.thrustTimer * 20) * 2;
      const tGrad = ctx.createLinearGradient(0, this.ship.h / 2 + 6, 0, this.ship.h / 2 + 6 + thrustSize + 6);
      tGrad.addColorStop(0, '#00f0ff');
      tGrad.addColorStop(0.5, '#facc15');
      tGrad.addColorStop(1, 'rgba(250,204,21,0)');
      ctx.fillStyle = tGrad;
      ctx.fillRect(-3, this.ship.h / 2 + 6, 6, thrustSize + 6);
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Bullets
    for (const b of this.bullets) {
      ctx.save();
      const bg2 = ctx.createLinearGradient(b.x - 2, b.y - 5, b.x + 2, b.y + 5);
      bg2.addColorStop(0, '#facc15');
      bg2.addColorStop(0.5, '#fff');
      bg2.addColorStop(1, '#facc15');
      ctx.fillStyle = bg2;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;
      ctx.fillRect(b.x - 2, b.y - 5, 4, 10);
      ctx.restore();
    }

    // Enemy bullets
    for (const b of this.enemyBullets) {
      ctx.save();
      const eg = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      eg.addColorStop(0, '#fff');
      eg.addColorStop(0.3, '#ff2d78');
      eg.addColorStop(1, 'rgba(255,45,120,0.3)');
      ctx.fillStyle = eg;
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Enemies — filled metallic ships
    for (const e of this.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      const wingPulse = 1 + Math.sin(totalTime * 3 + e.x) * 0.05;

      // Engine flame
      const eg = ctx.createRadialGradient(0, e.h / 2 - 2, 0, 0, e.h / 2 - 2, 8);
      eg.addColorStop(0, '#fff');
      eg.addColorStop(0.3, '#ff2d78');
      eg.addColorStop(1, 'rgba(255,45,120,0)');
      ctx.fillStyle = eg;
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(0, e.h / 2 - 2, 6 + Math.sin(totalTime * 6 + e.x) * 2, 0, Math.PI * 2);
      ctx.fill();

      // Body — filled gradient hull
      const hg = ctx.createLinearGradient(0, -e.h / 2, 0, e.h / 2);
      hg.addColorStop(0, '#c084fc');
      hg.addColorStop(0.5, '#a855f7');
      hg.addColorStop(1, '#7c3aed');
      ctx.fillStyle = hg;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(0, e.h / 2);
      ctx.lineTo(-e.w / 2 * wingPulse, -e.h / 2);
      ctx.lineTo(0, -e.h / 4);
      ctx.lineTo(e.w / 2 * wingPulse, -e.h / 2);
      ctx.closePath();
      ctx.fill();

      // Hull highlight
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, e.h / 2 - 4);
      ctx.lineTo(-e.w / 3 * wingPulse, -e.h / 3);
      ctx.stroke();

      // Cockpit glow
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 8;
      const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, 5);
      cg.addColorStop(0, '#fff');
      cg.addColorStop(0.4, '#00f0ff');
      cg.addColorStop(1, 'rgba(0,240,255,0)');
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;

      // HP bar
      ctx.fillStyle = '#ff2d78';
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 6;
      ctx.fillRect(-e.w / 2, -e.h / 2 - 10, e.w * (e.hp / e.maxHp), 3);

      ctx.restore();
    }

    // Boss
    if (this.boss) {
      const b = this.boss;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 30;

      // Main hull — angular with gradient fill
      const bg2 = ctx.createLinearGradient(-b.w / 2, -b.h / 2, b.w / 2, b.h / 2);
      bg2.addColorStop(0, '#f43f5e');
      bg2.addColorStop(0.4, '#e11d48');
      bg2.addColorStop(0.7, '#be123c');
      bg2.addColorStop(1, '#881337');
      ctx.fillStyle = bg2;
      ctx.beginPath();
      ctx.moveTo(-b.w / 2, -b.h / 2);
      ctx.lineTo(b.w / 2, -b.h / 2);
      ctx.lineTo(b.w / 3, b.h / 2);
      ctx.lineTo(-b.w / 3, b.h / 2);
      ctx.closePath();
      ctx.fill();

      // Hull edge highlight
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-b.w / 2 + 4, -b.h / 2 + 4);
      ctx.lineTo(b.w / 2 - 4, -b.h / 2 + 4);
      ctx.stroke();

      // Panel lines
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-b.w / 3, -b.h / 3);
      ctx.lineTo(b.w / 3, -b.h / 3);
      ctx.moveTo(-b.w / 4, 0);
      ctx.lineTo(b.w / 4, 0);
      ctx.moveTo(-b.w / 5, b.h / 4);
      ctx.lineTo(b.w / 5, b.h / 4);
      ctx.stroke();

      // Secondary panel highlight
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(-b.w / 3 + 2, -b.h / 3 + 1);
      ctx.lineTo(b.w / 3 - 2, -b.h / 3 + 1);
      ctx.stroke();

      // Rotating shield segments
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + totalTime * 1.5;
        const segR = 35 + Math.sin(totalTime * 3 + i) * 5;
        const sg2 = ctx.createRadialGradient(
          Math.cos(a) * segR, Math.sin(a) * segR, 0,
          Math.cos(a) * segR, Math.sin(a) * segR, 8
        );
        sg2.addColorStop(0, 'rgba(255,45,120,0.6)');
        sg2.addColorStop(1, 'rgba(255,45,120,0)');
        ctx.fillStyle = sg2;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * segR, Math.sin(a) * segR, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central core — multi-layer
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 20;
      const coreR = 14 + Math.sin(totalTime * 4) * 3;
      const cg2 = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
      cg2.addColorStop(0, '#fff');
      cg2.addColorStop(0.3, '#ff2d78');
      cg2.addColorStop(0.7, '#e11d48');
      cg2.addColorStop(1, '#881337');
      ctx.fillStyle = cg2;
      ctx.beginPath();
      ctx.arc(0, 0, coreR, 0, Math.PI * 2);
      ctx.fill();

      // Core inner glow
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.globalAlpha = 0.3 + Math.sin(totalTime * 5) * 0.15;
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Weapon ports (glowing)
      const wpColors = ['#f43f5e', '#e11d48'];
      ctx.shadowBlur = 8;
      for (let wi = 0; wi < 2; wi++) {
        const wx = wi === 0 ? -b.w / 2 + 10 : b.w / 2 - 25;
        ctx.fillStyle = wpColors[wi];
        ctx.shadowColor = wpColors[wi];
        ctx.fillRect(wx, b.h / 2 - 8, 15, 6);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff';
        ctx.fillRect(wx + 2, b.h / 2 - 5, 3, 2);
      }

      // HP bar
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ff2d78';
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 8;
      ctx.fillRect(-b.w / 2, -b.h / 2 - 20, b.w * (b.hp / b.maxHp), 6);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,45,120,0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-b.w / 2, -b.h / 2 - 20, b.w, 6);

      ctx.restore();
    }

    // Floating text
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.life / ft.maxLife);
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.font = 'bold 16px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  hitPlayer() {
    if (this.gameOver || this.ship.shield) {
      if (this.ship.shield) {
        this.ship.shield = false;
        this.engine.particles.emitBurst(this.ship.x, this.ship.y, ['#00f0ff', '#ffffff'], 20);
        this.audio.hit();
        this.engine.shake(8, 0.1);
      }
      return;
    }
    this.lives--;
    this.engine.particles.emitBurst(this.ship.x, this.ship.y, ['#ff2d78', '#facc15', '#ffffff'], 30);
    this.engine.particles.emitRing(this.ship.x, this.ship.y, '#ff2d78', 30);
    this.engine.shake(15, 0.3);
    
    if (this.lives <= 0) {
      this.endGame();
    } else {
      this.audio.hit();
    }
  }

  endGame() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.audio.die();
    this.engine.shake(25, 1.5);
    this.engine.flash('#ff2d78', 0.5);
    window.removeEventListener('resize', this._onResize);
    
    setTimeout(() => {
      if (this.gameOverCallback) this.gameOverCallback(this.score);
    }, 600);
  }

  setHUDCallback(cb) { this.hudCallback = cb; }
  setGameOverCallback(cb) { this.gameOverCallback = cb; }

  destroy() {
    window.removeEventListener('resize', this._onResize);
  }
}
