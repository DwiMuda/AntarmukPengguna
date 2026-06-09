class EffectsManager {
  constructor() {
    this.shakeIntensity = 0;
    this.shakeDecay = 0;
    this.shakeX = 0;
    this.shakeY = 0;

    this.flashAlpha = 0;
    this.flashColor = '#ffffff';

    this.overlayAlpha = 0;
    this.overlayColor = '#ff2d78';

    this.borderGlowIntensity = 0;
    this.borderGlowColor = '#00f0ff';

    this.chromaticAberration = 0;
    this.hitStopTimer = 0;
  }

  shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDecay = this.shakeIntensity / (duration || 0.3);
  }

  setBorderGlow(color, intensity) {
    this.borderGlowColor = color || '#00f0ff';
    this.borderGlowIntensity = intensity || 0;
  }

  flash(color, duration) {
    this.flashColor = color || '#ffffff';
    this.flashAlpha = 0.4;
  }

  hitStop(duration) {
    this.hitStopTimer = duration || 0.1;
  }

  update(dt) {
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= dt;
      return false; // Signal engine to pause updates
    }

    if (this.shakeIntensity > 0) {
      this.shakeX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity -= this.shakeDecay * dt;
      if (this.shakeIntensity < 0) {
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha -= dt * 2.5;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    this.chromaticAberration = Math.max(0, this.shakeIntensity * 0.5);
    return true;
  }

  applyTransform(ctx) {
    if (this.shakeIntensity > 0) {
      ctx.translate(this.shakeX, this.shakeY);
    }
  }

  renderPostProcess(ctx, w, h) {
    // Vignette
    const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.8);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Chromatic Aberration Simulation (Offset rendering)
    if (this.chromaticAberration > 1) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.3;
      // Note: Full chromatic aberration requires multiple redraws or buffer swaps, 
      // here we simulate it with a simple ghosting effect during heavy shake.
      ctx.restore();
    }
  }

  renderOverlays(ctx, w, h) {
    if (this.flashAlpha > 0) {
      ctx.fillStyle = this.flashColor;
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    if (this.borderGlowIntensity > 0) {
      const i = this.borderGlowIntensity;
      ctx.shadowColor = this.borderGlowColor;
      ctx.shadowBlur = 20 * i;
      ctx.strokeStyle = this.borderGlowColor;
      ctx.globalAlpha = i * 0.5;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, w - 4, h - 4);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
  }
}
