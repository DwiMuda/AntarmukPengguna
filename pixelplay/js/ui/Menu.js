class Menu {
  constructor() {
    this.engine = null;
    this.audio = null;
    this.onStartGame = null;
    this.onShowLeaderboard = null;
    this.onShowGarage = null;

    this.state = 'menu';
    this.particles = [];
    this.hoverCard = -1;
    this.mouseX = -0.5;
    this.mouseY = 0.5;
    this.transitionAlpha = 0;
    this.transitionTarget = null;
    this.glitchTimer = 0;
    this.cardAnimOffset = [0, 0.15, 0.3];
  }

  init(audio, callbacks, engine, storage) {
    this.audio = audio;
    this.engine = engine;
    this.storage = storage;
    this.onStartGame = callbacks.onStartGame;
    this.onShowLeaderboard = callbacks.onShowLeaderboard;
    this.onShowGarage = callbacks.onShowGarage;
  }

  handleAction(action) {
    // This is now largely handled by main.js delegation, 
    // but kept for any internal Menu calls if necessary.
    if (this.audio) this.audio.menuSelect();
    switch (action) {
      case 'menu': this.showScreen('screen-menu'); break;
    }
  }

  startTransition(mode) {
    this.transitionTarget = mode;
    this.transitionAlpha = 0;
    this.audio.menuSelect();
  }

  setLastMode(mode) { this._lastMode = mode; }

  showScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => {
      if (s.id === id) s.classList.remove('hidden');
      else s.classList.add('hidden');
    });
  }

  getCardRects(W, H) {
    const isSmall = W < 600;
    const isPortrait = H > W;
    
    let cardW, cardH, gap, totalW, startX, y;

    if (isSmall || isPortrait) {
      // Mobile / Portrait layout: Stacked or very narrow cards
      cardW = Math.min(220, W * 0.8);
      cardH = Math.min(140, H * 0.18);
      gap = 15;
      totalW = cardW;
      startX = (W - totalW) / 2;
      const totalH = cardH * 3 + gap * 2;
      y = (H * 0.55) - totalH / 2;
    } else {
      // Desktop / Landscape layout
      cardW = Math.min(270, W * 0.26);
      cardH = Math.min(360, H * 0.55);
      gap = Math.min(30, W * 0.02);
      totalW = cardW * 3 + gap * 2;
      startX = (W - totalW) / 2;
      y = H * 0.52 - cardH / 2;
    }

    const cards = [];
    const modes = ['asteroid', 'shadow', 'runner'];
    const labels = ['ASTEROID BLASTER', 'SHADOW DODGE', 'PIXEL RUNNER'];
    for (let i = 0; i < 3; i++) {
      const cardY = (isSmall || isPortrait) ? y + i * (cardH + gap) : y;
      const cardX = (isSmall || isPortrait) ? startX : startX + i * (cardW + gap);
      
      cards.push({
        x: cardX, y: cardY, w: cardW, h: cardH,
        mode: modes[i], label: labels[i],
        color: ['#00f0ff', '#a855f7', '#ff2d78'][i],
        iconColor: ['#00f0ff', '#a855f7', '#ff2d78'][i],
        highScore: 0,
        isSmallLayout: isSmall || isPortrait
      });
    }
    return cards;
  }

  render(ctx, W, H, time) {
    if (this.state !== 'menu') return;

    if (this.transitionTarget) {
      this.transitionAlpha += 0.025;
      if (this.transitionAlpha >= 1) {
        const mode = this.transitionTarget;
        this.transitionTarget = null;
        this.transitionAlpha = 0;
        if (this.onStartGame) this.onStartGame(mode);
        return;
      }
    }

    this.drawBackground(ctx, W, H, time);
    this.drawParticles(ctx, time);
    this.drawTitle(ctx, W, H, time);

    const cards = this.getCardRects(W, H);
    this.drawCards(ctx, cards, time);
    this.drawBottomBar(ctx, W, H);

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawBackground(ctx, W, H, time) {
    const grad = ctx.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.7);
    grad.addColorStop(0, '#1a1040');
    grad.addColorStop(0.4, '#0d0d2b');
    grad.addColorStop(1, '#050510');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5 + time * 5) % W;
      const sy = (i * 97.3 + time * 2) % H;
      const size = 0.5 + Math.sin(i + time * 3) * 0.5;
      const alpha = 0.1 + Math.sin(i * 2 + time) * 0.1;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const colors = ['rgba(0,240,255,0.03)', 'rgba(168,85,247,0.03)', 'rgba(255,45,120,0.03)'];
    for (let i = 0; i < 3; i++) {
      const cx = W * (0.2 + i * 0.3) + Math.sin(time * 0.3 + i * 2) * 50;
      const cy = H * (0.3 + i * 0.15) + Math.cos(time * 0.2 + i * 3) * 30;
      const grad2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 200);
      grad2.addColorStop(0, colors[i]);
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, W, H);
    }
  }

  drawParticles(ctx, time) {
    if (Math.random() < 0.15) {
      this.particles.push({
        x: Math.random(),
        y: 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.3,
        size: 1 + Math.random() * 2.5,
        life: 2 + Math.random() * 3,
        color: ['#00f0ff', '#a855f7', '#ff2d78'][Math.floor(Math.random() * 3)],
      });
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;
      if (p.life <= 0 || p.y < -0.05) { this.particles.splice(i, 1); continue; }
      const alpha = Math.min(1, p.life) * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x * ctx.canvas.width, p.y * ctx.canvas.height, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawTitle(ctx, W, H, time) {
    ctx.save();
    const titleY = H * 0.14;
    const fontSize = Math.min(72, W * 0.065);

    ctx.font = `900 ${fontSize}px Rajdhani, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    this.glitchTimer += 0.016;
    const doGlitch = Math.sin(this.glitchTimer * 0.3) > 0.95;

    if (doGlitch) {
      ctx.fillStyle = '#ff2d78';
      ctx.fillText('PIXELPLAY', W / 2 + 4, titleY + 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('PIXELPLAY', W / 2 - 4, titleY - 2);
    }

    const grad = ctx.createLinearGradient(W / 2 - 200, titleY, W / 2 + 200, titleY);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, '#a855f7');
    grad.addColorStop(1, '#ff2d78');
    ctx.fillStyle = grad;

    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 30 + Math.sin(time * 2) * 10;
    ctx.fillText('PIXELPLAY', W / 2, titleY);
    ctx.shadowBlur = 0;

    ctx.font = `300 ${Math.min(16, W * 0.014)}px Outfit, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.letterSpacing = '0.5em';
    ctx.fillText('THREE GAMES. ONE CHALLENGE.', W / 2, titleY + fontSize * 0.6);
    ctx.restore();
  }

  drawCards(ctx, cards, time) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      const isHover = this.hoverCard === i;
      const hoverScale = isHover ? 1.07 : 1;
      const hoverY = isHover ? -12 : 0;

      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(hoverScale, hoverScale);
      ctx.translate(-cx, -cy);
      ctx.translate(0, hoverY);

      const cardAlpha = Math.min(1, Math.max(0, (time - this.cardAnimOffset[i]) * 2));
      ctx.globalAlpha = cardAlpha;

      // Card background
      ctx.shadowColor = isHover ? c.color : 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = isHover ? 40 : 20;
      const bgGrad = ctx.createLinearGradient(c.x, c.y, c.x, c.y + c.h);
      bgGrad.addColorStop(0, isHover ? 'rgba(30,20,60,0.85)' : 'rgba(18,18,42,0.7)');
      bgGrad.addColorStop(1, isHover ? 'rgba(10,10,26,0.9)' : 'rgba(10,10,26,0.85)');
      ctx.fillStyle = bgGrad;
      this.roundRect(ctx, c.x, c.y, c.w, c.h, 14);
      ctx.fill();

      // Card border glow
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isHover ? c.color : 'rgba(255,255,255,0.08)';
      ctx.lineWidth = isHover ? 2 : 1;
      ctx.globalAlpha = isHover ? 0.8 : 0.3;
      this.roundRect(ctx, c.x, c.y, c.w, c.h, 14);
      ctx.stroke();

      // Game icon
      ctx.globalAlpha = 1;
      const iconSize = c.isSmallLayout ? c.h * 0.45 : Math.min(80, c.w * 0.35);
      const iconX = c.isSmallLayout ? c.x + c.w * 0.2 : c.x + c.w / 2;
      const iconY = c.isSmallLayout ? c.y + c.h / 2 : c.y + c.h * 0.3;
      this.drawGameIcon(ctx, i, iconX, iconY, iconSize, time, isHover);

      // Game label
      ctx.fillStyle = '#fff';
      const fontSize = c.isSmallLayout ? Math.min(16, c.w * 0.08) : Math.min(18, c.w * 0.07);
      ctx.font = `700 ${fontSize}px Rajdhani, sans-serif`;
      ctx.textAlign = c.isSmallLayout ? 'left' : 'center';
      ctx.textBaseline = 'middle';
      const labelX = c.isSmallLayout ? c.x + c.w * 0.4 : c.x + c.w / 2;
      const labelY = c.isSmallLayout ? c.y + c.h * 0.35 : c.y + c.h * 0.62;
      ctx.fillText(c.label, labelX, labelY);

      // Play button or text
      if (c.isSmallLayout) {
        ctx.fillStyle = c.color;
        ctx.font = `700 12px Outfit, sans-serif`;
        ctx.fillText('TAP TO PLAY', labelX, c.y + c.h * 0.65);
      } else {
        // Difficulty
        const starY = c.y + c.h * 0.7;
        const starCount = [3, 3, 2][i];
        ctx.font = `${Math.min(12, c.w * 0.05)}px sans-serif`;
        for (let s = 0; s < 5; s++) {
          ctx.fillStyle = s < starCount ? c.color : 'rgba(255,255,255,0.15)';
          ctx.shadowColor = s < starCount ? c.color : 'transparent';
          ctx.shadowBlur = s < starCount ? 6 : 0;
          ctx.fillText('\u2605', c.x + c.w / 2 + (s - 2) * 18, starY);
        }
        ctx.shadowBlur = 0;

        // Play button
        const btnY = c.y + c.h * 0.82;
        ctx.fillStyle = isHover ? c.color : 'rgba(255,255,255,0.08)';
        ctx.globalAlpha = isHover ? 1 : 0.5;
        this.roundRect(ctx, c.x + c.w * 0.2, btnY, c.w * 0.6, 34, 17);
        ctx.fill();
        ctx.fillStyle = isHover ? '#0a0a1a' : c.color;
        ctx.globalAlpha = 1;
        ctx.font = `700 ${Math.min(13, c.w * 0.05)}px Outfit, sans-serif`;
        ctx.fillText('PLAY NOW', c.x + c.w / 2, btnY + 17);
      }

      // High score
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = `${Math.min(11, c.w * 0.045)}px Outfit, sans-serif`;
      const hsX = c.isSmallLayout ? c.x + c.w - 15 : c.x + c.w / 2;
      const hsY = c.isSmallLayout ? c.y + c.h - 15 : c.y + c.h - 18;
      ctx.textAlign = c.isSmallLayout ? 'right' : 'center';
      ctx.fillText('HI: ' + this.getHighScore(c.mode).toLocaleString(), hsX, hsY);

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  drawGameIcon(ctx, idx, x, y, size, time, hover) {
    const t = time * (hover ? 3 : 1.5);
    ctx.save();
    ctx.translate(x, y);

    if (idx === 0) {
      // Asteroid: triangle ship + small circles
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.4);
      ctx.lineTo(-size * 0.35, size * 0.35);
      ctx.lineTo(size * 0.35, size * 0.35);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,240,255,0.1)';
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const a = t + i * 2.1;
        const r = size * 0.45;
        ctx.fillStyle = ['#00f0ff', '#a855f7', '#ff2d78'][i];
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r, Math.sin(a) * r + size * 0.1, 3 + Math.sin(t + i) * 1, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (idx === 1) {
      // Shadow: hexagon + lanes
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + t * 0.5;
        const r = size * 0.4;
        ctx[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = 'rgba(168,85,247,0.1)';
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = '#a855f7';
        ctx.globalAlpha = 0.2 + Math.sin(t * 2 + i) * 0.1;
        const lx = (i - 1) * size * 0.25;
        ctx.fillRect(lx - 2, -size * 0.35, 4, size * 0.7);
      }
    } else {
      // Runner: running figure
      ctx.shadowColor = '#ff2d78';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff2d78';
      const legAnim = Math.sin(t * 4) * 3;
      ctx.fillRect(-size * 0.08, -size * 0.4, size * 0.16, size * 0.45);
      ctx.fillRect(-size * 0.12 + legAnim, size * 0.05, size * 0.1, size * 0.2);
      ctx.fillRect(size * 0.02 - legAnim, size * 0.05, size * 0.1, size * 0.2);
      ctx.fillStyle = '#facc15';
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 6;
      ctx.fillRect(-size * 0.18, -size * 0.15, size * 0.36, size * 0.04);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = '#0a0a1a';
        ctx.shadowBlur = 0;
        ctx.fillRect(-size * 0.06 + i * size * 0.14, -size * 0.32, size * 0.06, size * 0.06);
      }
    }
    ctx.restore();
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  getHighScore(mode) {
    if (!this.storage) return 0;
    const lb = this.storage.getScores(mode);
    return lb.length > 0 ? lb[0].score : 0;
  }

  drawBottomBar(ctx, W, H) {
    const barY = H - 60;
    ctx.fillStyle = 'rgba(10,10,26,0.6)';
    ctx.fillRect(0, barY, W, 60);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barY);
    ctx.lineTo(W, barY);
    ctx.stroke();

    const items = [
      { label: 'GARAGE', icon: '\u2699', action: 'garage' },
      { label: 'LEADERBOARD', icon: '\u265B', action: 'leaderboard' },
    ];
    const btnW = 160;
    const btnGap = 30;
    const totalW = items.length * btnW + (items.length - 1) * btnGap;
    const startX = (W - totalW) / 2;

    for (let i = 0; i < items.length; i++) {
      const bx = startX + i * (btnW + btnGap);
      const by = barY + 10;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      this.roundRect(ctx, bx, by, btnW, 40, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth = 1;
      this.roundRect(ctx, bx, by, btnW, 40, 8);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 11px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(items[i].icon + '  ' + items[i].label, bx + btnW / 2, by + 20);
    }
  }

  handleCanvasClick(mx, my) {
    if (this.state !== 'menu') return;
    const W = this.engine ? this.engine.width : window.innerWidth;
    const H = this.engine ? this.engine.height : window.innerHeight;
    const cards = this.getCardRects(W, H);
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        this.startTransition(c.mode);
        return;
      }
    }
    const barY = H - 60;
    if (my >= barY) {
      const btnW = 160;
      const btnGap = 30;
      const totalW = 2 * btnW + btnGap;
      const startX = (W - totalW) / 2;
      if (mx >= startX && mx <= startX + btnW && this.onShowGarage) this.onShowGarage();
      if (mx >= startX + btnW + btnGap && mx <= startX + 2 * btnW + btnGap && this.onShowLeaderboard) this.onShowLeaderboard();
    }
  }

  handleCanvasMove(mx, my) {
    if (this.state !== 'menu') { this.hoverCard = -1; return; }
    const W = this.engine ? this.engine.width : window.innerWidth;
    const H = this.engine ? this.engine.height : window.innerHeight;
    const cards = this.getCardRects(W, H);
    this.hoverCard = -1;
    for (let i = 0; i < cards.length; i++) {
      const c = cards[i];
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        this.hoverCard = i;
        break;
      }
    }
  }
}
