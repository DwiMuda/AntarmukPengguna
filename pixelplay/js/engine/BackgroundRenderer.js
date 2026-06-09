class BackgroundRenderer {
  constructor(ctx, width, height) {
    this.ctx = ctx;
    this.w = width;
    this.h = height;
  }

  resize(w, h) {
    this.w = w;
    this.h = h;
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

  /* ========== RUNNER: Synthwave Skyscape ========== */
  drawRunnerBackground(t, speedMul, groundY) {
    const { ctx, w, h } = this;
    
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    sky.addColorStop(0, '#05050a');
    sky.addColorStop(0.5, '#1a0a30');
    sky.addColorStop(1, '#ff2d7822');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, groundY);

    // Retro Sun
    const sunR = 80;
    const sunX = w * 0.7;
    const sunY = groundY - 40;
    const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
    sunGrad.addColorStop(0, '#ff2d78');
    sunGrad.addColorStop(1, '#facc15');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI, true);
    ctx.fill();

    // Sun stripes
    ctx.fillStyle = '#05050a';
    for (let i = 0; i < 8; i++) {
      const sy = sunY + i * 10;
      if (sy < sunY + sunR) {
        ctx.fillRect(sunX - sunR, sy, sunR * 2, 2 + i);
      }
    }

    // Floor Grid
    const floorH = h - groundY;
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, groundY, w, floorH);
    
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    const scroll = (t * speedMul * 0.1) % 40;
    for (let x = -scroll; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, groundY); ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = groundY; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}
