class InputManager {
  constructor() {
    this.keys = {};
    this.justPressed = {};
    this._prevKeys = {};
    this.touches = { x: 0, y: 0, active: false };

    this.onKeyDown = (e) => {
      if (!this.keys[e.code]) {
        this.justPressed[e.code] = true;
      }
      this.keys[e.code] = true;
    };

    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    this.onTouchStart = (e) => {
      const t = e.touches[0];
      this.touches.x = t.clientX;
      this.touches.y = t.clientY;
      this.touches.active = true;
      this.justPressed['Touch'] = true;
      if (e.cancelable) e.preventDefault();
    };

    this.onTouchMove = (e) => {
      const t = e.touches[0];
      this.touches.x = t.clientX;
      this.touches.y = t.clientY;
      if (e.cancelable) e.preventDefault();
    };

    this.onTouchEnd = (e) => {
      this.touches.active = false;
      if (e.cancelable) e.preventDefault();
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('touchstart', this.onTouchStart, { passive: false });
    window.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('touchend', this.onTouchEnd, { passive: false });
  }

  isDown(code) {
    return !!this.keys[code];
  }

  wasPressed(code) {
    return !!this.justPressed[code];
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
