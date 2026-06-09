class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._prevKeys = {};
    this.touches = { x: 0, y: 0, active: false };
    this.canvas = null;

    this.onKeyDown = (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    };

    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    this.updateTouchPos = (e) => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const t = e.touches[0];
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      this.touches.x = (t.clientX - rect.left) * scaleX;
      this.touches.y = (t.clientY - rect.top) * scaleY;
    };

    this.onTouchStart = (e) => {
      this.updateTouchPos(e);
      this.touches.active = true;
      this.justPressed['Touch'] = true;
      
      if (e.target.tagName === 'CANVAS' && e.cancelable) {
        e.preventDefault();
      }
    };

    this.onTouchMove = (e) => {
      this.updateTouchPos(e);
      if (e.target.tagName === 'CANVAS' && e.cancelable) {
        e.preventDefault();
      }
    };

    this.onTouchEnd = (e) => {
      this.touches.active = false;
      if (e.target.tagName === 'CANVAS' && e.cancelable) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  setCanvas(canvas) {
    this.canvas = canvas;
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.justPressed[code] || !!this.justPressed['Touch'];
  }

  isTouchActive() {
    return this.touches.active;
  }

  getTouchX() {
    return this.touches.x;
  }

  getTouchY() {
    return this.touches.y;
  }

  endFrame() {
    this.justPressed = {};
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('touchstart', this.onTouchStart);
    window.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('touchend', this.onTouchEnd);
  }
}
