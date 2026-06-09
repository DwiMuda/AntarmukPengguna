class ShadowDodge {
  constructor() {
    this.engine = null;
    this.input = null;
    this.audio = null;

    this.player = null;
    this.obstacles = [];
    this.coins = [];

    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.alive = true;
    this.gameOver = false;

    this.speed = 200;
    this.difficultyTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.laneCount = 5;
    this.laneWidth = 0;
    this.offsetX = 0;
    this.coinTimer = 0;
    this.laserTimer = 0;
    this.draftingTime = 0;
  }

  init(engine) {
    this.engine = engine;
    this.input = engine.input;
    this.audio = engine.audio;

    this.laneWidth = Math.min(80, engine.width / this.laneCount);
    this.offsetX = (engine.width - this.laneWidth * this.laneCount) / 2;

    this.player = {
      lane: 2, x: 0, y: 0,
      size: 28, targetX: 0,
      color: '#00f0ff',
    };
    this.updatePlayerPos();
    this.player.y = engine.height - 80;

    this.obstacles = [];
    this.coins = [];
    this.score = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.speed = 200;
    this.alive = true;
    this.gameOver = false;
    this.spawnTimer = 0;
    this.spawnInterval = 1.2;
    this.difficultyTimer = 0;
    this.flashTimer = 0;
    this.coinTimer = 0;
    this.laserTimer = 0;
    this.lasers = [];
    this.draftingTime = 0;

    this._onResize = () => {
      this.laneWidth = Math.min(80, this.engine.width / this.laneCount);
      this.offsetX = (this.engine.width - this.laneWidth * this.laneCount) / 2;
      this.updatePlayerPos();
      this.player.y = this.engine.height - 80;
    };
    window.addEventListener('resize', this._onResize);

    engine.particles.clear();
    engine.audio.startBGM();
  }

  updatePlayerPos() {
    this.player.x = this.offsetX + this.player.lane * this.laneWidth + this.laneWidth / 2;
    this.player.targetX = this.player.x;
  }

  update(dt) {
    if (this.gameOver) return;

    const { width, height } = this.engine;

    // Movement...
    if (this.input.wasPressed('ArrowLeft') || this.input.wasPressed('KeyA')) {
      if (this.player.lane > 0) { this.player.lane--; this.updatePlayerPos(); this.audio.menuSelect(); }
    }
    if (this.input.wasPressed('ArrowRight') || this.input.wasPressed('KeyD')) {
      if (this.player.lane < this.laneCount - 1) { this.player.lane++; this.updatePlayerPos(); this.audio.menuSelect(); }
    }

    if (this.input.isTouchActive()) {
      const tx = this.input.getTouchX();
      const tl = Math.floor((tx - this.offsetX) / this.laneWidth);
      const cl = Math.max(0, Math.min(this.laneCount - 1, tl));
      if (cl !== this.player.lane) { this.player.lane = cl; this.updatePlayerPos(); }
    }

    this.player.x += (this.player.targetX - this.player.x) * 12 * dt;

    this.difficultyTimer += dt;
    this.speed = 200 + this.difficultyTimer * 12;
    this.spawnInterval = Math.max(0.45, 1.3 - this.difficultyTimer * 0.012);

    // Lasers
    this.laserTimer += dt;
    if (this.difficultyTimer > 10 && this.laserTimer > 4) {
      this.laserTimer = 0;
      const l1 = Math.floor(Math.random() * this.laneCount);
      const l2 = (l1 + 1) % this.laneCount;
      this.lasers.push({ lanes: [l1, l2], warn: 1.5, life: 1 });
    }

    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      if (l.warn > 0) {
        l.warn -= dt;
      } else {
        l.life -= dt;
        if (l.lanes.includes(this.player.lane)) {
          this.die();
          return;
        }
        if (l.life <= 0) this.lasers.splice(i, 1);
      }
    }

    // Spawn...
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      const lane = Math.floor(Math.random() * this.laneCount);
      const size = 16 + Math.random() * 22;
      this.obstacles.push({
        lane, size,
        x: this.offsetX + lane * this.laneWidth + this.laneWidth / 2,
        y: -size,
        speed: this.speed * (Math.random() < 0.3 ? 1.5 : 1),
        color: Math.random() < 0.3 ? '#ff2d78' : '#a855f7',
        shapeType: Math.floor(Math.random() * 3),
        rotation: 0,
        rotSpeed: (Math.random() - 0.5) * 3,
      });
    }

    // Drafting Check
    let isDrafting = false;
    for (const o of this.obstacles) {
      if (o.lane === this.player.lane && o.y < this.player.y && o.y > this.player.y - 150) {
        isDrafting = true;
        this.score += Math.floor(dt * 50);
        this.draftingTime += dt;
        this.engine.particles.emit(this.player.x, this.player.y - this.player.size / 2, { count: 1, color: '#facc15', speed: 40, life: 0.2, size: 2, spread: 0.5 });
      }
    }

    // Update obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.y += o.speed * dt;
      o.rotation += o.rotSpeed * dt;

      if (o.y > height + 50) {
        this.obstacles.splice(i, 1);
        this.combo++;
        this.comboTimer = 1.5;
        const lvl = Math.min(Math.floor(this.combo / 5), 5);
        this.multiplier = 1 + lvl * 0.5;
        this.score += Math.floor(10 * this.multiplier);
        continue;
      }

      if (Math.abs(o.x - this.player.x) < (o.size + this.player.size) * 0.35 &&
          Math.abs(o.y - this.player.y) < (o.size + this.player.size) * 0.35) {
        this.engine.effects.hitStop(0.1);
        this.die();
        return;
      }
    }


    // Update coins
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      c.y += this.speed * 0.6 * dt;
      if (c.y > height + 20) { this.coins.splice(i, 1); continue; }
      if (Math.abs(c.x - this.player.x) < (c.size + this.player.size) / 2 &&
          Math.abs(c.y - this.player.y) < (c.size + this.player.size) / 2) {
        this.coins.splice(i, 1);
        this.score += 25;
        this.audio.coin();
        this.engine.particles.emit(c.x, c.y, {
          count: 8, color: '#facc15', speed: 80, life: 0.3, size: 3, type: 'spark', spread: Math.PI * 2,
        });
      }
    }

    // Combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 0; this.multiplier = 1; }
    }

    // Trail particles
    if (this.player.x !== this.player.targetX || this.speed > 250) {
      if (Math.random() > 0.4) {
        this.engine.particles.emitTrail(this.player.x, this.player.y + this.player.size / 2, '#00f0ff', this.player.size * 0.6);
      }
    }

    this.engine.particles.update(dt);
    this.flashTimer = Math.max(0, this.flashTimer - dt);

    if (this.hudCallback) {
      this.hudCallback({ score: this.score, highScore: 0, combo: this.combo, multiplier: this.multiplier, lives: 1, coins: 0 });
    }
  }

  render(ctx) {
    const { width, height, bgRenderer, totalTime } = this.engine;

    bgRenderer.drawShadowBackground(totalTime, this.speed);

    // Lasers
    for (const l of this.lasers) {
      for (const laneIdx of l.lanes) {
        const lx = this.offsetX + laneIdx * this.laneWidth;
        if (l.warn > 0) {
          // Warning
          ctx.fillStyle = `rgba(255, 45, 120, ${0.1 + Math.sin(totalTime * 15) * 0.1})`;
          ctx.fillRect(lx, 0, this.laneWidth, height);
          ctx.strokeStyle = '#ff2d78';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]);
          ctx.beginPath();
          ctx.moveTo(lx + this.laneWidth / 2, 0);
          ctx.lineTo(lx + this.laneWidth / 2, height);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          // Active Laser
          const grad = ctx.createLinearGradient(lx, 0, lx + this.laneWidth, 0);
          grad.addColorStop(0, 'rgba(255, 45, 120, 0)');
          grad.addColorStop(0.5, '#ff2d78');
          grad.addColorStop(1, 'rgba(255, 45, 120, 0)');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.6 + Math.random() * 0.4;
          ctx.fillRect(lx, 0, this.laneWidth, height);
          ctx.shadowColor = '#ff2d78';
          ctx.shadowBlur = 20;
          ctx.fillStyle = '#fff';
          ctx.fillRect(lx + this.laneWidth / 2 - 2, 0, 4, height);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        }
      }
    }

    // Lane LED strip effect
    for (let i = 0; i < this.laneCount; i++) {
      const lx = this.offsetX + i * this.laneWidth;
      const ledPhase = (totalTime * 2 + i * 0.5) % 1;
      ctx.fillStyle = `rgba(168, 85, 247, ${0.05 + ledPhase * 0.08})`;
      ctx.fillRect(lx, 0, this.laneWidth, height);

      ctx.strokeStyle = `rgba(168, 85, 247, ${0.08 + (1 - ledPhase) * 0.06})`;
      ctx.lineWidth = 1;
      ctx.strokeRect(lx, 0, this.laneWidth, height);
    }

    // Speed lines at edges
    for (let i = 0; i < 8; i++) {
      const sx = this.offsetX + this.laneCount * this.laneWidth + 5 + i * 4;
      const sy = (i * 60 + totalTime * this.speed * 0.3) % height;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.03 + (1 - i / 8) * 0.05})`;
      ctx.fillRect(sx, sy, 2, 30 + this.speed * 0.02);
    }
    for (let i = 0; i < 8; i++) {
      const sx = this.offsetX - 5 - i * 4;
      const sy = (i * 60 + totalTime * this.speed * 0.3) % height;
      ctx.fillStyle = `rgba(0, 240, 255, ${0.03 + (1 - i / 8) * 0.05})`;
      ctx.fillRect(sx, sy, 2, 30 + this.speed * 0.02);
    }

    // Coins
    for (const c of this.coins) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#facc15';
      const pulse = Math.sin(totalTime * 5) * 2;
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

    // Obstacles — gradient neon holographic
    for (const o of this.obstacles) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rotation);

      const s = o.size;
      const h = s / 2;
      const baseColor = o.color;
      const lightColor = o.color === '#ff2d78' ? '#fda4af' : o.color === '#a855f7' ? '#d8b4fe' : '#67e8f9';
      const darkColor = o.color === '#ff2d78' ? '#9f1239' : o.color === '#a855f7' ? '#581c87' : '#155e75';

      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 18;

      if (o.shapeType === 0) {
        // Square — 3D beveled
        const sg = ctx.createLinearGradient(-h, -h, h, h);
        sg.addColorStop(0, lightColor);
        sg.addColorStop(0.4, baseColor);
        sg.addColorStop(0.7, darkColor);
        sg.addColorStop(1, '#000');
        ctx.fillStyle = sg;
        ctx.fillRect(-h, -h, s, s);

        // Top-left highlight edge
        ctx.shadowBlur = 0;
        ctx.strokeStyle = lightColor + '66';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-h + 2, -h + 2);
        ctx.lineTo(h - 2, -h + 2);
        ctx.lineTo(h - 2, -h + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-h + 2, -h + 2);
        ctx.lineTo(-h + 2, h - 2);
        ctx.lineTo(-h + 4, h - 2);
        ctx.stroke();

        // Inner glow border
        ctx.strokeStyle = baseColor + '66';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 10;
        ctx.strokeRect(-h + 4, -h + 4, s - 8, s - 8);

        // Center cross
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.globalAlpha = 0.15 + Math.sin(totalTime * 2 + o.x) * 0.08;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-h * 0.5, -h * 0.5);
        ctx.lineTo(h * 0.5, h * 0.5);
        ctx.moveTo(h * 0.5, -h * 0.5);
        ctx.lineTo(-h * 0.5, h * 0.5);
        ctx.stroke();
        ctx.globalAlpha = 0.85;

        // Pulsing border
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 6 + Math.sin(totalTime * 4 + o.x) * 4;
        ctx.strokeStyle = baseColor + '44';
        ctx.lineWidth = 1;
        ctx.strokeRect(-h, -h, s, s);
      } else if (o.shapeType === 1) {
        // Circle — sphere with radial gradient
        const sg = ctx.createRadialGradient(-h * 0.3, -h * 0.3, 0, 0, 0, h);
        sg.addColorStop(0, lightColor);
        sg.addColorStop(0.5, baseColor);
        sg.addColorStop(0.85, darkColor);
        sg.addColorStop(1, '#000');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(0, 0, h, 0, Math.PI * 2);
        ctx.fill();

        // Scan ring animation
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.15 + Math.sin(totalTime * 3 + o.x) * 0.08;
        const scanR = h * 0.4 + Math.sin(totalTime * 2) * h * 0.15;
        ctx.beginPath();
        ctx.arc(0, 0, scanR, 0, Math.PI * 1.5);
        ctx.stroke();

        // Crosshair
        ctx.strokeStyle = baseColor + '88';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.moveTo(-h * 0.7, 0);
        ctx.lineTo(h * 0.7, 0);
        ctx.moveTo(0, -h * 0.7);
        ctx.lineTo(0, h * 0.7);
        ctx.stroke();
        ctx.globalAlpha = 0.85;

        // Pulsing edge glow
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 6 + Math.sin(totalTime * 4 + o.x) * 4;
        ctx.strokeStyle = baseColor + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, h, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Hexagon — segmented with gradient
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * h, Math.sin(a) * h);
        }
        ctx.closePath();

        // Radial gradient
        const sg = ctx.createRadialGradient(-h * 0.2, -h * 0.2, 0, 0, 0, h);
        sg.addColorStop(0, lightColor);
        sg.addColorStop(0.5, baseColor);
        sg.addColorStop(0.85, darkColor);
        sg.addColorStop(1, '#000');
        ctx.fillStyle = sg;
        ctx.fill();

        // Segment lines
        ctx.shadowBlur = 0;
        ctx.strokeStyle = baseColor + '44';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * h, Math.sin(a) * h);
          ctx.stroke();
        }

        // Rotating inner ring
        ctx.strokeStyle = lightColor + '66';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.4;
        const ringR = h * 0.55;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + o.rotation * 0.5;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * ringR, Math.sin(a) * ringR);
        }
        ctx.closePath();
        ctx.stroke();

        // Center glow
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = lightColor;
        ctx.globalAlpha = 0.5 + Math.sin(totalTime * 3) * 0.2;
        ctx.beginPath();
        ctx.arc(0, 0, 4 + Math.sin(totalTime * 4) * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.85;

        // Edge glow
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 6 + Math.sin(totalTime * 4 + o.x) * 4;
        ctx.strokeStyle = baseColor + '44';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
          ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * h, Math.sin(a) * h);
        }
        ctx.closePath();
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Player
    if (!this.gameOver) {
      const p = this.player;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Glow
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 25;

      // Outer hexagon — gradient fill
      const pg = ctx.createRadialGradient(-3, -3, 0, 0, 0, p.size / 2);
      pg.addColorStop(0, '#67e8f9');
      pg.addColorStop(0.5, '#00f0ff');
      pg.addColorStop(1, '#0891b2');
      ctx.fillStyle = pg;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + totalTime;
        const r = p.size / 2;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();

      // Inner rotating ring
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2 - totalTime * 2;
        const r = p.size * 0.4;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Center dot
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(0, 0, 4 + Math.sin(totalTime * 3) * 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  die() {
    if (this.gameOver) return;
    this.alive = false;
    this.gameOver = true;
    this.audio.die();

    const p = this.player;
    this.engine.particles.emitBurst(p.x, p.y, ['#ff2d78', '#00f0ff', '#ffffff'], 35);
    this.engine.particles.emitRing(p.x, p.y, '#ff2d78', 30);
    this.engine.shake(20, 0.8);
    this.engine.flash('#ff2d78', 0.3);
    this.engine.effects.setBorderGlow('#ff2d78', 1);

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
