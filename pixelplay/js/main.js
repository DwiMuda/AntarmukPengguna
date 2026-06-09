(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const engine = new GameEngine(canvas);
  const input = new InputManager();
  const audio = new AudioManager();
  const storage = new StorageManager();
  const menu = new Menu();
  const hud = new HUD(storage);
  const leaderboard = new LeaderboardUI(storage, menu);

  engine.input = input;
  engine.audio = audio;

  let currentGame = null;
  let gameOverScoreTarget = 0;
  let gameOverScoreCurrent = 0;
  let gameOverBusy = false;

  engine.menuRenderer = (ctx, W, H, time) => {
    menu.render(ctx, W, H, time);
  };

  canvas.addEventListener('click', (e) => {
    if (gameOverBusy) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    if (engine.state === 'menu') {
      menu.handleCanvasClick(mx, my);
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (gameOverBusy) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    menu.handleCanvasMove(mx, my);
  });

  menu.init(audio, {
    onStartGame(mode) {
      audio.resume();
      menu.setLastMode(mode);
      startGame(mode);
    },
    onShowLeaderboard() {
      leaderboard.show();
    },
    onShowGarage() {
      updateGarageUI();
      menu.showScreen('screen-garage');
      drawGaragePreview();
    }
  }, engine, storage);

  function drawGaragePreview() {
    const canvas2 = document.getElementById('garage-preview');
    if (!canvas2) return;
    const ctx2 = canvas2.getContext('2d');
    const W2 = canvas2.width;
    const H2 = canvas2.height;
    ctx2.clearRect(0, 0, W2, H2);

    const upg = storage.getUpgrades();
    const healthLv = upg.health;
    const speedLv = upg.speed;

    // Background grid
    ctx2.strokeStyle = 'rgba(0,240,255,0.05)';
    ctx2.lineWidth = 1;
    for (let i = 0; i < W2; i += 20) {
      ctx2.beginPath();
      ctx2.moveTo(i, 0); ctx2.lineTo(i, H2);
      ctx2.stroke();
    }
    for (let i = 0; i < H2; i += 20) {
      ctx2.beginPath();
      ctx2.moveTo(0, i); ctx2.lineTo(W2, i);
      ctx2.stroke();
    }

    // Ship — grows with health, cyan glow with speed
    const shipSize = 20 + healthLv * 4;
    const glowSize = 8 + speedLv * 2;
    const cx = W2 / 2;
    const cy = H2 / 2 + 10;

    ctx2.shadowColor = '#00f0ff';
    ctx2.shadowBlur = 10 + glowSize;

    const sg = ctx2.createLinearGradient(cx - shipSize, cy - shipSize, cx + shipSize, cy + shipSize);
    sg.addColorStop(0, '#67e8f9');
    sg.addColorStop(0.5, '#00f0ff');
    sg.addColorStop(1, '#0891b2');
    ctx2.fillStyle = sg;

    ctx2.beginPath();
    ctx2.moveTo(cx, cy - shipSize);
    ctx2.lineTo(cx - shipSize, cy + shipSize * 0.6);
    ctx2.lineTo(cx - shipSize * 0.4, cy + shipSize * 0.3);
    ctx2.lineTo(cx, cy + shipSize * 0.5 - 4);
    ctx2.lineTo(cx + shipSize * 0.4, cy + shipSize * 0.3);
    ctx2.lineTo(cx + shipSize, cy + shipSize * 0.6);
    ctx2.closePath();
    ctx2.fill();

    // Shield ring if health >= 3
    if (healthLv >= 3) {
      ctx2.shadowBlur = 0;
      ctx2.strokeStyle = `rgba(0,240,255,${0.15 + (healthLv - 3) * 0.05})`;
      ctx2.lineWidth = 2;
      ctx2.beginPath();
      ctx2.arc(cx, cy, shipSize * 0.9, 0, Math.PI * 2);
      ctx2.stroke();
    }

    // Label
    ctx2.shadowBlur = 0;
    ctx2.fillStyle = 'rgba(255,255,255,0.3)';
    ctx2.font = '10px Outfit, sans-serif';
    ctx2.textAlign = 'center';
    ctx2.fillText('Lv.' + healthLv + ' Hull \u00B7 Lv.' + speedLv + ' Thrusters', cx, H2 - 12);
  }

  function updateGarageUI() {
    document.getElementById('garage-coins').textContent = storage.getCoins();
    const upg = storage.getUpgrades();

    ['health', 'fireRate', 'speed'].forEach(type => {
      const lvl = upg[type];
      document.getElementById(`upg-lvl-${type}`).textContent = `Lv.${lvl}`;
      const bar = document.getElementById(`upg-bar-${type}`);
      if (bar) bar.style.width = (lvl / 5 * 100) + '%';

      const btn = document.getElementById(`btn-buy-${type}`);
      if (lvl >= 5) {
        btn.textContent = 'MAX';
        btn.disabled = true;
      } else {
        const cost = type === 'health' ? 100 : 150;
        btn.textContent = `Buy (${cost}◎)`;
        btn.disabled = storage.getCoins() < cost;
      }
    });
  }

  ['health', 'fireRate', 'speed'].forEach(type => {
    document.getElementById(`btn-buy-${type}`).addEventListener('click', () => {
      const cost = type === 'health' ? 100 : 150;
      if (storage.buyUpgrade(type, cost)) {
        audio.powerup();
        updateGarageUI();
        drawGaragePreview();
      } else {
        audio.hit();
      }
    });
  });

  function startGame(mode) {
    if (!mode) { console.error('startGame: invalid mode', mode); return; }
    try {
      if (!audio.ctx) audio.init();
      audio.resume();
      menu._lastMode = mode;
      document.getElementById('screen-gameover').classList.add('hidden');
      document.getElementById('screen-menu').classList.add('hidden');
      document.getElementById('screen-leaderboard').classList.add('hidden');

      let game;
      switch (mode) {
        case 'asteroid':
          game = new AsteroidBlaster();
          game.upgrades = storage.getUpgrades();
          game.onAddCoins = (amt) => storage.addCoins(amt);
          break;
        case 'shadow':
          game = new ShadowDodge();
          game.onAddCoins = (amt) => storage.addCoins(amt);
          break;
        case 'runner':
          game = new PixelRunner();
          game.onAddCoins = (amt) => storage.addCoins(amt);
          break;
      }

      if (!game) { console.error('startGame: unknown mode', mode); return; }

      currentGame = game;
      hud.setMode(mode);

      const gameOverHandler = (score) => {
        showGameOver(mode, score);
      };
      game.setGameOverCallback(gameOverHandler);

      const hudUpdate = (data) => {
        hud.update(data);
        engine.hudData = {
          score: data.score,
          highScore: storage.getHighScore(mode),
          combo: data.combo,
          multiplier: data.multiplier,
          lives: data.lives,
          coins: storage.getCoins(),
        };
      };
      game.setHUDCallback(hudUpdate);

      engine.start(game);
    } catch (e) {
      console.error('startGame error:', e);
      menu.showScreen('screen-menu');
    }
  }

  function showGameOver(mode, score) {
    engine.stop();
    hud.hide();
    gameOverBusy = true;
    gameOverScoreTarget = Math.floor(score);
    gameOverScoreCurrent = 0;
    menu.state = 'menu';
    menu._lastMode = mode;
    menu.transitionTarget = null;
    menu.transitionAlpha = 0;

    const isHighScore = storage.isHighScore(mode, score);
    const finalScoreEl = document.getElementById('final-score');
    const highScoreMsg = document.getElementById('screen-gameover').querySelector('.final-highscore');
    const nameInput = document.querySelector('.name-input');

    // Backup: show panel after 2s regardless of animation
    var backupTimer = setTimeout(function () {
      if (gameOverBusy) {
        gameOverBusy = false;
        finalScoreEl.textContent = gameOverScoreTarget.toLocaleString();
        if (isHighScore && score > 0) {
          highScoreMsg.style.display = 'block';
          nameInput.classList.remove('hidden');
        } else {
          highScoreMsg.style.display = 'none';
          nameInput.classList.add('hidden');
        }
        menu.showScreen('screen-gameover');
        engine.menuRenderer = function (ctx2, W2, H2, time2) { menu.render(ctx2, W2, H2, time2); };
      }
    }, 2000);

    engine.menuRenderer = function (ctx, W, H, time) {
      try {
        var p = Math.min(1, time / 0.8);

        var bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
        bg.addColorStop(0, 'rgba(255,45,120,' + (0.08 * (1 - p)) + ')');
        bg.addColorStop(0.5, 'rgba(10,10,26,' + (0.6 * p) + ')');
        bg.addColorStop(1, 'rgba(5,5,16,' + (0.95 * p) + ')');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        ctx.globalAlpha = 0.15 * (1 - p);
        for (var i = 0; i < 20; i++) {
          var sx = (i * 37 + time * 20 * (1 - p)) % W;
          var sy = (i * 53 + time * 10 * (1 - p)) % H;
          ctx.fillStyle = i % 2 === 0 ? '#ff2d78' : '#facc15';
          ctx.beginPath();
          ctx.arc(sx, sy, 1 + Math.sin(time + i), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        if (time > 0.3) {
          var ct = Math.min(1, (time - 0.3) / 0.7);
          gameOverScoreCurrent = Math.floor(gameOverScoreTarget * easeOutCubic(ct));

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 20 + Math.sin(time * 3) * 5;
          var sg = ctx.createLinearGradient(W / 2 - 100, H / 2 - 20, W / 2 + 100, H / 2 + 20);
          sg.addColorStop(0, '#67e8f9');
          sg.addColorStop(0.5, '#00f0ff');
          sg.addColorStop(1, '#0891b2');
          ctx.fillStyle = sg;
          ctx.font = '700 48px Rajdhani, sans-serif';
          ctx.fillText(gameOverScoreCurrent.toLocaleString(), W / 2, H / 2);

          if (ct >= 1) {
            clearTimeout(backupTimer);
            finalScoreEl.textContent = gameOverScoreCurrent.toLocaleString();
            if (isHighScore && score > 0) {
              highScoreMsg.style.display = 'block';
              nameInput.classList.remove('hidden');
            } else {
              highScoreMsg.style.display = 'none';
              nameInput.classList.add('hidden');
            }
            gameOverBusy = false;
            menu.showScreen('screen-gameover');
            engine.menuRenderer = function (ctx2, W2, H2, time2) { menu.render(ctx2, W2, H2, time2); };
          }
        }
      } catch (e) {
        console.error('gameOverAnimation error:', e);
        clearTimeout(backupTimer);
        gameOverBusy = false;
        menu.showScreen('screen-gameover');
        engine.menuRenderer = function (ctx2, W2, H2, time2) { menu.render(ctx2, W2, H2, time2); };
      }
    };

  }

  // Save score
  document.getElementById('save-score').addEventListener('click', () => {
    const nameInput2 = document.getElementById('player-name');
    const name = nameInput2.value.trim() || 'PLAYER';
    const score2 = parseInt(document.getElementById('final-score').textContent.replace(/,/g, ''));
    const mode2 = menu._lastMode;
    if (mode2) {
      storage.addScore(mode2, name, score2);
      nameInput2.value = '';
      document.querySelector('.name-input').classList.add('hidden');
      leaderboard.show();
    }
  });

  document.getElementById('player-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('save-score').click();
  });

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Start engine loop
  engine.running = true;
  engine.lastTime = performance.now();
  engine.loop(engine.lastTime);

})();
