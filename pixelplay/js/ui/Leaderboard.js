class LeaderboardUI {
  constructor(storage, menu) {
    this.storage = storage;
    this.menu = menu;
    this.currentMode = 'asteroid';

    this.entriesEl = document.getElementById('lb-entries');

    document.querySelectorAll('.lb-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        if (this.menu.audio) this.menu.audio.menuSelect();
        document.querySelectorAll('.lb-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentMode = tab.dataset.mode;
        this.render();
      });
    });
  }

  show() {
    this.menu.showScreen('screen-leaderboard');
    this.render();
  }

  hide() {
    document.getElementById('screen-leaderboard').classList.add('hidden');
  }

  render() {
    const scores = this.storage.getScores(this.currentMode);
    this.entriesEl.innerHTML = '';

    if (scores.length === 0) {
      this.entriesEl.innerHTML = '<div class="lb-empty">No scores yet. Play a game!</div>';
      return;
    }

    scores.forEach((entry, i) => {
      const div = document.createElement('div');
      div.className = 'lb-entry';

      const rank = document.createElement('span');
      rank.className = 'lb-rank';
      if (i === 0) rank.classList.add('gold');
      else if (i === 1) rank.classList.add('silver');
      else if (i === 2) rank.classList.add('bronze');
      rank.textContent = `#${i + 1}`;

      const name = document.createElement('span');
      name.className = 'lb-name';
      name.textContent = entry.name;

      const score = document.createElement('span');
      score.className = 'lb-score';
      score.textContent = entry.score.toLocaleString();

      div.appendChild(rank);
      div.appendChild(name);
      div.appendChild(score);
      this.entriesEl.appendChild(div);
    });
  }
}
