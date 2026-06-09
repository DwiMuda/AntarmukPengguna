(function () {
  'use strict';

  if (window._incompatible) return;

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
  let currentSessionId = 0;

  engine.menuRenderer = (ctx, W, H, time) => {
    menu.render(ctx, W, H, time);
  };

  const handleInteraction = (e) => {
    // If we are in the middle of a Game Over transition, ignore all canvas clicks
    if (gameOverBusy) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    // Don't handle canvas clicks if the click target is a UI element
    if (e.target.closest('.btn') || e.target.closest('.name-input') || e.target.closest('.gameover-content')) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    if (mx >= 0 && mx <= rect.width && my >= 0 && my <= rect.height) {
      if (engine.state === 'menu') {
        menu.handleCanvasClick(mx, my);
      }
    }
  };

  window.addEventListener('click', handleInteraction);
  window.addEventListener('touchstart', (e) => {
    if (e.target === canvas) handleInteraction(e);
  }, { passive: false });

  function startGame(mode) {
    if (!mode) return;
    try {
      currentSessionId++;
      gameOverBusy = false;
      engine.stop(); 
      
      if (!audio.ctx) audio.init();
      audio.resume();
      
      // Hide ALL screens with absolute certainty
      document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
      document.getElementById('screen-hud').classList.remove('hidden');

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

      if (!game) return;
      currentGame = game;
      hud.setMode(mode);

      const sid = currentSessionId;
      game.setGameOverCallback((score) => {
        if (sid === currentSessionId) showGameOver(mode, score, sid);
      });

      game.setHUDCallback((data) => {
        if (sid === currentSessionId) {
          hud.update(data);
          engine.hudData = {
            score: data.score,
            highScore: storage.getHighScore(mode),
            combo: data.combo,
            multiplier: data.multiplier,
            lives: data.lives,
            coins: storage.getCoins(),
          };
        }
      });

      engine.start(game);
    } catch (e) {
      console.error('startGame error:', e);
      menu.showScreen('screen-menu');
    }
  }

  function showGameOver(mode, score, sid) {
    engine.stop();
    hud.hide();
    gameOverBusy = true;
    gameOverScoreTarget = Math.floor(score);
    gameOverScoreCurrent = 0;
    
    const isHighScore = storage.isHighScore(mode, score);
    const finalScoreEl = document.getElementById('final-score');
    const highScoreMsg = document.querySelector('.final-highscore');
    const nameInput = document.querySelector('.name-input');

    const completeGameOver = () => {
      if (sid !== currentSessionId) return;
      gameOverBusy = false;
      finalScoreEl.textContent = gameOverScoreTarget.toLocaleString();
      highScoreMsg.style.display = (isHighScore && gameOverScoreTarget > 0) ? 'block' : 'none';
      if (isHighScore && gameOverScoreTarget > 0) nameInput.classList.remove('hidden');
      else nameInput.classList.add('hidden');
      
      menu.showScreen('screen-gameover');
      engine.menuRenderer = (ctx2, W2, H2, time2) => menu.render(ctx2, W2, H2, time2);
    };

    const backupTimer = setTimeout(() => {
      if (gameOverBusy && sid === currentSessionId) completeGameOver();
    }, 2500);

    engine.menuRenderer = function (ctx, W, H, time) {
      if (sid !== currentSessionId) return;
      try {
        const p = Math.min(1, time / 0.8);
        const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
        bg.addColorStop(0, `rgba(255,45,120,${0.08 * (1 - p)})`);
        bg.addColorStop(0.5, `rgba(10,10,26,${0.6 * p})`);
        bg.addColorStop(1, `rgba(5,5,16,${0.95 * p})`);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, W, H);

        if (time > 0.3) {
          const ct = Math.min(1, (time - 0.3) / 0.7);
          gameOverScoreCurrent = Math.floor(gameOverScoreTarget * easeOutCubic(ct));
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.shadowColor = '#00f0ff';
          ctx.shadowBlur = 20 + Math.sin(time * 3) * 5;
          const sg = ctx.createLinearGradient(W/2-100, H/2-20, W/2+100, H/2+20);
          sg.addColorStop(0, '#67e8f9'); sg.addColorStop(1, '#0891b2');
          ctx.fillStyle = sg;
          ctx.font = '700 48px Rajdhani, sans-serif';
          ctx.fillText(gameOverScoreCurrent.toLocaleString(), W / 2, H / 2);

          if (ct >= 1) {
            clearTimeout(backupTimer);
            completeGameOver();
          }
        }
      } catch (e) {
        clearTimeout(backupTimer);
        completeGameOver();
      }
    };
  }

  // Explicitly handle buttons to avoid race conditions
  document.querySelector('[data-action="retry"]').addEventListener('click', (e) => {
    e.preventDefault();
    if (menu._lastMode) {
      audio.menuSelect();
      startGame(menu._lastMode);
    }
  });

  document.querySelector('[data-action="menu"]').addEventListener('click', (e) => {
    e.preventDefault();
    audio.menuSelect();
    currentSessionId++;
    gameOverBusy = false;
    engine.stop();
    menu.showScreen('screen-menu');
    engine.state = 'menu';
    engine.menuRenderer = (ctx, W, H, time) => menu.render(ctx, W, H, time);
  });

  // Save score
  document.getElementById('save-score').addEventListener('click', () => {
    const nameInput2 = document.getElementById('player-name');
    const name = nameInput2.value.trim() || 'PLAYER';
    const mode2 = menu._lastMode;
    if (mode2 && gameOverScoreTarget > 0) {
      storage.addScore(mode2, name, gameOverScoreTarget);
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
