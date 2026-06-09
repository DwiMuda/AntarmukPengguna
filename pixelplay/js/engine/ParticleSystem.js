class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, config) {
    const count = config.count || 10;
    const color = config.color || '#00f0ff';
    const speed = config.speed || 100;
    const life = config.life || 0.5;
    const size = config.size || 3;
    const type = config.type || 'spark';
    const spread = config.spread || Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * spread + (config.angle || 0) + (Math.random() - 0.5) * 0.5;
      const s = speed * (0.3 + Math.random() * 0.7);
      const p = {
        x, y,
        vx: Math.cos(angle) * s,
        vy: Math.sin(angle) * s,
        life: life * (0.5 + Math.random() * 0.5),
        maxLife: life,
        size: size * (0.5 + Math.random() * 0.5),
        maxSize: size,
        color,
        type,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 5,
        gravity: config.gravity || 0,
        fadeOut: config.fadeOut !== false,
      };
      this.particles.push(p);
    }
  }

  emitBurst(x, y, colors, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 150;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        size: 2 + Math.random() * 4,
        maxSize: 4,
        color,
        type: 'spark',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 0,
        gravity: 0,
        fadeOut: true,
      });
    }
  }

  emitRing(x, y, color, radius) {
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * radius * 0.5,
        vy: Math.sin(angle) * radius * 0.5,
        life: 0.3,
        maxLife: 0.3,
        size: 3,
        maxSize: 3,
        color,
        type: 'ring',
        rotation: 0,
        rotSpeed: 0,
        gravity: 0,
        fadeOut: true,
      });
    }
  }

  emitTrail(x, y, color, size) {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      life: 0.2,
      maxLife: 0.2,
      size: size || 4,
      maxSize: size || 4,
      color,
      type: 'trail',
      rotation: 0,
      rotSpeed: 0,
      gravity: 0,
      fadeOut: true,
    });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.rotSpeed) p.rotation += p.rotSpeed * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      const alpha = p.fadeOut ? Math.max(0, p.life / p.maxLife) : 1;
      const sizeScale = p.fadeOut ? alpha : 1;
      const s = p.size * sizeScale;

      ctx.globalAlpha = alpha;

      switch (p.type) {
        case 'spark':
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          ctx.shadowBlur = 0;
          break;

        case 'trail':
          ctx.globalAlpha = alpha * 0.3;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 12;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          break;

        case 'ring':
          ctx.globalAlpha = alpha * 0.6;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          const r = (1 - alpha) * 20 + 5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
          break;

        case 'glow':
          ctx.globalAlpha = alpha * 0.4;
          const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, s * 3);
          grad.addColorStop(0, p.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, s * 3, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'debris':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(-s / 2, -s / 2, s, s * 0.6);
          ctx.restore();
          break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear() {
    this.particles.length = 0;
  }
}
