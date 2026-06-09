class BackgroundRenderer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
    this._initRunnerBuildings();
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
    this._initRunnerBuildings();
  }

  /* Runner building generation */
  _initRunnerBuildings() {
    const w = this.w || 800;
    this.runnerBgs = { far: [], mid: [], near: [], ruins: [], core: [] };

    // Far layer: dense small silhouettes
    let x = 0;
    while (x < w + 300) {
      const bw = 20 + Math.random() * 40;
      const bh = 40 + Math.random() * 80;
      this.runnerBgs.far.push({ x, w: bw, h: bh, tint: 0.3 + Math.random() * 0.2 });
      x += bw + 2 + Math.random() * 8;
    }

    // Mid layer: medium buildings with windows
    x = 0;
    while (x < w + 300) {
      const bw = 35 + Math.random() * 55;
      const bh = 80 + Math.random() * 130;
      const cols = Math.max(1, Math.floor(bw / 14));
      const rows = Math.max(1, Math.floor(bh / 18));
      const windows = [];
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const seed = Math.sin(c * 7.3 + r * 11.7 + x * 0.1) * 0.5 + 0.5;
          windows.push({ lit: seed > 0.6, bright: seed > 0.85 });
        }
      }
      this.runnerBgs.mid.push({ x, w: bw, h: bh, windows, cols, rows });
      x += bw + 4 + Math.random() * 12;
    }

    // Near layer: large foreground buildings with neon
    x = -50;
    while (x < w + 300) {
      const bw = 60 + Math.random() * 100;
      const bh = 140 + Math.random() * 200;
      const cols = Math.max(1, Math.floor(bw / 16));
      const rows = Math.max(1, Math.floor(bh / 22));
      const windows = [];
      let neon = null;
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const seed = Math.sin(c * 5.7 + r * 9.3 + x * 0.07) * 0.5 + 0.5;
          windows.push({ lit: seed > 0.55, bright: seed > 0.8 });
        }
        // One neon sign per column
        if (Math.random() > 0.6) {
          neon = { col: c, color: ['#ff2d78', '#00f0ff', '#facc15', '#a855f7'][Math.floor(Math.random() * 4)] };
        }
      }
      this.runnerBgs.near.push({ x, w: bw, h: bh, windows, cols, rows, neon });
      x += bw + 8 + Math.random() * 20;
    }

    // Wasteland ruins
    x = 0;
    while (x < w + 300) {
      const bw = 30 + Math.random() * 70;
      const bh = 50 + Math.random() * 120;
      const broken = Math.random() > 0.5;
      this.runnerBgs.ruins.push({ x, w: bw, h: bh, broken });
      x += bw + 10 + Math.random() * 25;
    }

    // Core data columns
    x = 0;
    while (x < w + 300) {
      this.runnerBgs.core.push({ x, w: 4 + Math.random() * 8, h: 50 + Math.random() * 150, speed: 0.5 + Math.random() * 1.5 });
      x += 10 + Math.random() * 30;
    }
  }

  _drawBuildingLayer(ctx, t, speedMul, groundY, buildings, speedFactor, alpha) {
    const scroll = (t * speedMul * speedFactor) % (this.w + 300);
    for (const b of buildings) {
      const bx = ((b.x - scroll) % (this.w + 300) + this.w + 300) % (this.w + 300) - 100;
      const by = groundY - b.h;
      ctx.fillStyle = `rgba(5,5,10,${alpha})`;
      ctx.fillRect(bx, by, b.w, b.h);

      if (b.windows) {
        for (let i = 0; i < b.windows.length; i++) {
          const c = i % b.cols;
          const r = Math.floor(i / b.cols);
          const wx = bx + 3 + c * (b.w / b.cols);
          const wy = by + 4 + r * (b.h / b.rows);
          const ww = (b.w / b.cols) - 6;
          const wh = (b.h / b.rows) - 6;
          const win = b.windows[i];
          if (win.lit) {
            ctx.fillStyle = win.bright ? '#ffd700' : 'rgba(255,200,100,0.6)';
            ctx.shadowColor = win.bright ? '#ffd700' : 'transparent';
            ctx.shadowBlur = win.bright ? 6 : 0;
            ctx.fillRect(wx, wy, ww, wh);
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(wx, wy, ww, wh);
          }
        }
      }

      // Neon sign
      if (b.neon && b.neon.col !== undefined) {
        const nx = bx + 2 + b.neon.col * (b.w / b.cols);
        const ny = by + 4;
        ctx.shadowColor = b.neon.color;
        ctx.shadowBlur = 20;
        ctx.fillStyle = b.neon.color;
        ctx.fillRect(nx, ny, (b.w / b.cols) - 4, 8);
        ctx.shadowBlur = 0;
        // Sign text approximation
        ctx.fillStyle = '#05050a';
        ctx.fillRect(nx + 3, ny + 2, (b.w / b.cols) - 10, 4);
        ctx.shadowBlur = 0;
      }
    }
  }

  /* ========== ASTEROID: Nebula Space with Grid ========== */
  drawAsteroidBackground(t, speedMul) {
    const { ctx, w, h } = this;
    
    // Deep Space Base
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, w, h);

    // Parallax Grid
    const gridSize = 100;
    const scroll = (t * 50) % gridSize;
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = -scroll; x < w; x += gridSize) {
      ctx.moveTo(x, 0); ctx.lineTo(x, h);
    }
    for (let y = (t * 20) % gridSize; y < h; y += gridSize) {
      ctx.moveTo(0, y); ctx.lineTo(w, y);
    }
    ctx.stroke();

    // Nebula Glows
    const t1 = t * 0.05;
    const nebula = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w);
    nebula.addColorStop(0, `hsla(280, 80%, 10%, ${0.15 + Math.sin(t1) * 0.05})`);
    nebula.addColorStop(0.5, `hsla(220, 90%, 5%, ${0.1 + Math.cos(t1*0.7) * 0.04})`);
    nebula.addColorStop(1, 'transparent');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, w, h);

    // Pulsing Stars
    for (let i = 0; i < 80; i++) {
      const sx = (i * 137.5 + t * 5 * (1 + (i % 3) * 0.2)) % w;
      const sy = (i * 97.3 + t * 10 * (1 + (i % 2))) % h;
      const flicker = 0.1 + Math.sin(i + t * 3) * 0.1;
      ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flicker)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 4 === 0 ? 1.5 : 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ========== SHADOW: Cyber-Lane Grid ========== */
  drawShadowBackground(t, speedMul) {
    const { ctx, w, h } = this;
    
    // Background Gradient
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#05050a');
    bg.addColorStop(0.7, '#0a0a1a');
    bg.addColorStop(1, '#1a0a30');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Perspective Grid
    const horizon = h * 0.4;
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.15)';
    ctx.lineWidth = 1;
    
    // Vanishing lines
    for (let i = -10; i <= 20; i++) {
      const xStart = w / 2;
      const yStart = horizon;
      const xEnd = (i / 10) * w;
      const yEnd = h;
      ctx.beginPath();
      ctx.moveTo(xStart, yStart);
      ctx.lineTo(xEnd, yEnd);
      ctx.stroke();
    }

    // Horizontal lines (speeding)
    const lineSpeed = (t * speedMul * 0.5) % 1;
    for (let i = 0; i < 15; i++) {
      const p = (i + lineSpeed) / 15;
      const y = horizon + p * p * (h - horizon); // Exponential spacing for 3D
      ctx.globalAlpha = p * 0.5;
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ========== RUNNER: Parallax Cyber City / Wasteland / Core ========== */
  drawRunnerBackground(t, speedMul, groundY, biome) {
    const { ctx, w, h } = this;
    const floorH = h - groundY;
    biome = biome || 'city';

    // ===== SKY =====
    let skyTop, skyMid, skyBot, sunColor1, sunColor2;
    if (biome === 'wasteland') {
      skyTop = '#0a0505'; skyMid = '#1a0a05'; skyBot = '#ff2d7815';
      sunColor1 = '#ff4444'; sunColor2 = '#ff8800';
    } else if (biome === 'core') {
      skyTop = '#000510'; skyMid = '#001030'; skyBot = '#00f0ff10';
      sunColor1 = '#00f0ff'; sunColor2 = '#0891b2';
    } else {
      skyTop = '#05050a'; skyMid = '#1a0a30'; skyBot = '#ff2d7822';
      sunColor1 = '#ff2d78'; sunColor2 = '#facc15';
    }
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, skyTop);
    sky.addColorStop(0.5, skyMid);
    sky.addColorStop(1, skyBot);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // ===== STARS (city + wasteland) =====
    if (biome !== 'core') {
      for (let i = 0; i < 40; i++) {
        const sx = (i * 137.5 + t * 3 * (1 + (i % 3) * 0.2)) % w;
        const sy = (i * 97.3 + t * 2 * (1 + (i % 2))) % (groundY * 0.6);
        const flicker = 0.15 + Math.sin(i * 2.3 + t * 2) * 0.1;
        ctx.fillStyle = `rgba(255,255,255,${Math.max(0, flicker)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 5 === 0 ? 1.5 : 0.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ===== BUILDINGS (parallax layers) =====
    if (biome === 'city') {
      this._drawBuildingLayer(ctx, t, speedMul, groundY, this.runnerBgs.far, 0.04, 0.6);
      this._drawBuildingLayer(ctx, t, speedMul, groundY, this.runnerBgs.mid, 0.10, 0.8);
      this._drawBuildingLayer(ctx, t, speedMul, groundY, this.runnerBgs.near, 0.20, 1.0);
    } else if (biome === 'wasteland') {
      this._drawBuildingLayer(ctx, t, speedMul, groundY, this.runnerBgs.ruins, 0.08, 0.7);
      // Dust haze
      for (let i = 0; i < 20; i++) {
        const dx = (i * 93.7 + t * speedMul * 0.05 * (1 + i % 3)) % w;
        const dy = groundY * 0.3 + (i * 47.3) % (groundY * 0.5);
        ctx.fillStyle = `rgba(255,100,50,${0.02 + Math.sin(i + t * 0.5) * 0.01})`;
        ctx.beginPath();
        ctx.arc(dx, dy, 2 + i % 3, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Core: data stream columns
      const scroll = (t * speedMul * 0.15) % (this.w + 300);
      for (const col of this.runnerBgs.core) {
        const cx = ((col.x - scroll) % (this.w + 300) + this.w + 300) % (this.w + 300) - 50;
        const dataLen = Math.floor(t * col.speed + col.x) % col.h;
        ctx.fillStyle = 'rgba(0,240,255,0.06)';
        ctx.fillRect(cx, groundY - col.h, col.w, col.h);
        ctx.fillStyle = 'rgba(0,240,255,0.15)';
        ctx.fillRect(cx, groundY - col.h + dataLen, col.w, 6);
        ctx.fillStyle = 'rgba(0,240,255,0.08)';
        ctx.fillRect(cx, groundY - col.h + (dataLen + 20) % col.h, col.w, 4);
        ctx.fillRect(cx, groundY - col.h + (dataLen + 45) % col.h, col.w, 3);
      }
    }

    // ===== SUN =====
    const sunR = 70;
    const sunX = w * 0.75;
    const sunY = groundY - 30;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sunGrad.addColorStop(0, sunColor1);
    sunGrad.addColorStop(1, sunColor2);
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI, true);
    ctx.fill();

    // Sun stripes
    ctx.fillStyle = biome === 'core' ? '#000510' : '#05050a';
    for (let i = 0; i < 8; i++) {
      const sy = sunY + i * 10;
      if (sy < sunY + sunR) {
        ctx.fillRect(sunX - sunR, sy, sunR * 2, 2 + i);
      }
    }

    // Sun glow
    ctx.shadowColor = sunColor1;
    ctx.shadowBlur = 40;
    ctx.fillStyle = `rgba(255,255,255,0.02)`;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR + 20, 0, Math.PI, true);
    ctx.fill();
    ctx.shadowBlur = 0;

    // ===== GROUND FLOOR =====
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, groundY, w, floorH);

    // Ground surface glow line
    ctx.fillStyle = biome === 'wasteland' ? 'rgba(255,68,68,0.15)' :
                    biome === 'core' ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.1)';
    ctx.fillRect(0, groundY, w, 2);

    // Ground grid
    const gScroll = (t * speedMul * 0.08) % 40;
    ctx.strokeStyle = biome === 'wasteland' ? 'rgba(255,100,50,0.12)' :
                      biome === 'core' ? 'rgba(0,240,255,0.15)' : 'rgba(0,240,255,0.15)';
    ctx.lineWidth = 1;
    for (let x = -gScroll; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, groundY + 4); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = groundY + 20; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Ground lane markers (scrolling dashed line)
    const laneOffset = (t * speedMul * 0.15) % 40;
    ctx.strokeStyle = biome === 'wasteland' ? 'rgba(255,200,100,0.2)' :
                      biome === 'core' ? 'rgba(0,240,255,0.25)' : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 30]);
    for (let ly = groundY + 20 - laneOffset; ly < h; ly += 50) {
      ctx.beginPath();
      ctx.moveTo(0, ly); ctx.lineTo(w, ly);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Ground neon reflection strip
    ctx.fillStyle = biome === 'wasteland' ? 'rgba(255,68,68,0.04)' :
                    biome === 'core' ? 'rgba(0,240,255,0.05)' : 'rgba(255,45,120,0.04)';
    ctx.fillRect(0, groundY + 4, w, 3);
  }
}
