class StorageManager {
  constructor() {
    this.storageKey = 'pixelplay_leaderboard';
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === 'object' && parsed !== null) {
          if (parsed.coins === undefined) parsed.coins = 0;
          if (!parsed.upgrades) parsed.upgrades = { health: 0, fireRate: 0, speed: 0 };
          return parsed;
        }
      }
    } catch {}
    return { asteroid: [], shadow: [], runner: [], coins: 0, upgrades: { health: 0, fireRate: 0, speed: 0 } };
  }

  _save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch {}
  }

  getScores(mode) {
    return this.data[mode] || [];
  }

  addScore(mode, name, score) {
    if (!this.data[mode]) this.data[mode] = [];
    this.data[mode].push({ name: name.toUpperCase(), score: Math.floor(score), date: Date.now() });
    this.data[mode].sort((a, b) => b.score - a.score);
    if (this.data[mode].length > 10) {
      this.data[mode] = this.data[mode].slice(0, 10);
    }
    this._save();
  }

  isHighScore(mode, score) {
    const scores = this.getScores(mode);
    if (scores.length < 10) return true;
    return score > scores[scores.length - 1].score;
  }

  getHighScore(mode) {
    const scores = this.getScores(mode);
    return scores.length > 0 ? scores[0].score : 0;
  }

  addCoins(amount) {
    this.data.coins += amount;
    this._save();
  }

  getCoins() {
    return this.data.coins;
  }

  getUpgrades() {
    return this.data.upgrades;
  }

  buyUpgrade(type, cost) {
    if (this.data.coins >= cost && this.data.upgrades[type] < 5) {
      this.data.coins -= cost;
      this.data.upgrades[type]++;
      this._save();
      return true;
    }
    return false;
  }
}
