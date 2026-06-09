class HUD {
  constructor(storage) {
    this.storage = storage;
    this.currentMode = 'asteroid';

    this.scoreEl = document.getElementById('hud-score');
    this.highScoreEl = document.getElementById('hud-highscore');
    this.comboContainerEl = document.getElementById('hud-combo-container');
    this.comboEl = document.getElementById('hud-combo');
    this.multiplierEl = document.getElementById('hud-multiplier');
    this.livesEl = document.getElementById('hud-lives');
    this.coinsEl = document.getElementById('hud-coins-val');
  }

  setMode(mode) {
    this.currentMode = mode;
    this.updateHighScore();
  }

  updateHighScore() {
    this.highScoreEl.textContent = this.storage.getHighScore(this.currentMode);
  }

  update(data) {
    this.scoreEl.textContent = data.score;
    this.updateHighScore();
    
    if (this.coinsEl) {
      this.coinsEl.textContent = this.storage.getCoins();
    }

    if (data.combo !== undefined && data.combo > 1) {
      this.comboContainerEl.classList.remove('hidden');
      this.comboEl.textContent = `COMBO x${data.combo}`;
      this.multiplierEl.textContent = `${data.multiplier.toFixed(1)}x`;
    } else {
      this.comboContainerEl.classList.add('hidden');
    }

    if (data.lives !== undefined) {
      this.livesEl.innerHTML = '';
      for (let i = 0; i < data.lives; i++) {
        const heart = document.createElement('span');
        heart.className = 'heart-icon';
        heart.innerHTML = '&#10084;'; // heart symbol
        this.livesEl.appendChild(heart);
      }
    }
  }

  show() {
    document.getElementById('screen-hud').classList.remove('hidden');
  }

  hide() {
    document.getElementById('screen-hud').classList.add('hidden');
  }
}
