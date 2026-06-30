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

  // Initialize menu
  menu.init(audio, {
    onStartGame: (mode) => startGame(mode),
    onShowLeaderboard: () => leaderboard.show(),
    onShowGarage: () => {
      refreshGarage();
      menu.showScreen('screen-garage');
    }
  }, engine, storage);

  let currentGame = null;
  let gameOverScoreTarget = 0;
  let gameOverScoreCurrent = 0;
  let gameOverBusy = false;
  let currentSessionId = 0;

  engine.menuRenderer = (ctx, W, H, time) => {
    menu.render(ctx, W, H, time);
  };

  // --- INTERACTION HANDLING (CANVAS ONLY) ---
  const handleCanvasInteraction = (e) => {
    // If we click UI elements, ignore it here
    if (e.target !== canvas) return;

    if (gameOverBusy) {
      if (e.cancelable) e.preventDefault();
      return;
    }

    // Block canvas clicks while game over popup is showing
    const goScreen = document.getElementById('screen-gameover');
    if (goScreen && !goScreen.classList.contains('hidden')) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const isTouch = e.type.startsWith('touch');
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = (clientX - rect.left) * scaleX;
    const my = (clientY - rect.top) * scaleY;

    if (mx >= 0 && mx <= canvas.width && my >= 0 && my <= canvas.height) {
      if (engine.state === 'menu') {
        if (e.type === 'mousemove') {
          menu.handleCanvasMove(mx, my);
        } else {
          menu.handleCanvasClick(mx, my);
        }
      }
    }
  };

  window.addEventListener('click', handleCanvasInteraction);
  window.addEventListener('mousemove', handleCanvasInteraction);
  window.addEventListener('touchstart', (e) => {
    if (e.target === canvas) handleCanvasInteraction(e);
  }, { passive: false });

  // --- BUTTON & UI HANDLING (DELEGATION) ---
  document.addEventListener('click', (e) => {
    try {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      console.log('Action triggered:', action);
      
      audio.menuSelect();

      if (action === 'menu') {
        currentSessionId++;
        gameOverBusy = false;
        engine.stop();
        menu.showScreen('screen-menu');
        engine.state = 'menu';
        engine.menuRenderer = (ctx, W, H, time) => menu.render(ctx, W, H, time);
    } else if (action === 'retry') {
      if (!gameOverBusy && menu._lastMode) {
        startGame(menu._lastMode);
      } else {
        menu.showScreen('screen-menu');
        engine.state = 'menu';
        engine.menuRenderer = (ctx, W, H, time) => menu.render(ctx, W, H, time);
      }
      } else if (action === 'leaderboard') {
        leaderboard.show();
      } else if (action === 'garage') {
        menu.showScreen('screen-garage');
      }
    } catch (err) {
      console.error('Delegation handler error:', err);
    }
  }, true); // Use capture phase to ensure it runs before other handlers

  function startGame(mode) {
    if (!mode) return;
    try {
      currentSessionId++;
      gameOverBusy = false;
      engine.stop(); 
      
      if (!audio.ctx) audio.init();
      audio.resume();
      
      menu.setLastMode(mode);
      
      // Reset UI visibility
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
      // Set a static background for Game Over screen
      engine.menuRenderer = (ctx2, W2, H2, time2) => {
        ctx2.fillStyle = '#050510';
        ctx2.fillRect(0, 0, W2, H2);
      };
    };

    // Backup timer to ensure the screen appears even if animation fails
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

  // Save score interaction
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

  // --- GARAGE ---
  const upgCosts = {
    health: [100, 200, 400, 800, 1600],
    fireRate: [150, 300, 600, 1200, 2400],
    speed: [150, 300, 600, 1200, 2400],
  };

  let garageAnimId = null;
  const garageCanvas = document.getElementById('garage-preview');
  const garageCtx = garageCanvas ? garageCanvas.getContext('2d') : null;

  function drawGaragePreview(ctx, W, H, t, upgrades) {
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, W, H);

    // Draw scanning grid lines
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.1)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    const offset = (t * 15) % gridSize;
    for (let x = offset; x < W; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = offset; y < H; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Target ring
    ctx.save();
    ctx.translate(W / 2, H / 2 + 10);
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 45, t * 0.4, t * 0.4 + Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Ship hologram
    ctx.save();
    ctx.translate(W / 2, H / 2 + 10);
    ctx.scale(1.2, 1.2);
    const shipW = 32;
    const shipH = 32;
    
    // Engine flame
    const speedLvl = upgrades.speed || 0;
    const flameH = 8 + speedLvl * 3 + Math.sin(t * 32) * 3;
    const fGrad = ctx.createLinearGradient(0, shipH / 2, 0, shipH / 2 + flameH);
    fGrad.addColorStop(0, '#ffffff');
    fGrad.addColorStop(0.3, '#00f0ff');
    fGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.moveTo(-5, shipH / 2);
    ctx.quadraticCurveTo(-8, shipH / 2 + flameH * 0.7, 0, shipH / 2 + flameH);
    ctx.quadraticCurveTo(8, shipH / 2 + flameH * 0.7, 5, shipH / 2);
    ctx.closePath();
    ctx.fill();

    // Ship hull
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8 + Math.sin(t * 6) * 2;
    ctx.fillStyle = 'rgba(0, 240, 255, 0.12)';
    ctx.beginPath();
    ctx.moveTo(0, -shipH / 2);
    ctx.lineTo(-shipW / 2, shipH / 2);
    ctx.lineTo(-shipW / 4, shipH / 2 - 5);
    ctx.lineTo(0, shipH / 2 - 7);
    ctx.lineTo(shipW / 4, shipH / 2 - 5);
    ctx.lineTo(shipW / 2, shipH / 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Shield bubble
    const healthLvl = upgrades.health || 0;
    if (healthLvl > 0) {
      ctx.strokeStyle = `rgba(168, 85, 247, ${0.15 + (healthLvl * 0.12)})`;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, 36 + healthLvl * 2, -t * 0.6, -t * 0.6 + Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Stats HUD overlay
    ctx.font = '700 9px Rajdhani, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'left';
    ctx.fillText('SYS: FIGHTER_MK1', 12, 18);
    ctx.fillText('HULL ARMR: Lv.' + (upgrades.health || 0), 12, 28);
    ctx.fillText('BLST CORE: Lv.' + (upgrades.fireRate || 0), 12, 38);
    ctx.fillText('THRUSTER:  Lv.' + (upgrades.speed || 0), 12, 48);

    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.fillText('HOLOGRAPHIC PREVIEW', W - 12, 18);
    ctx.fillStyle = '#10b981';
    ctx.fillText('STATUS: ONLINE', W - 12, 28);
  }

  function refreshGarage() {
    document.getElementById('garage-coins').textContent = storage.getCoins();
    const upgrades = storage.getUpgrades();
    for (const key of ['health', 'fireRate', 'speed']) {
      const level = upgrades[key] || 0;
      const fill = document.getElementById('upg-bar-' + key);
      const lvlEl = document.getElementById('upg-lvl-' + key);
      const btn = document.getElementById('btn-buy-' + key);
      fill.style.width = (level / 5) * 100 + '%';
      lvlEl.textContent = 'Lv.' + level;
      if (level >= 5) {
        btn.textContent = 'MAXED';
        btn.disabled = true;
      } else {
        const cost = upgCosts[key][level];
        btn.textContent = 'Buy (' + cost + '\u25C7)';
        btn.disabled = storage.getCoins() < cost;
      }
    }

    if (garageCtx) {
      if (garageAnimId) cancelAnimationFrame(garageAnimId);
      const startTime = performance.now();
      const loop = (now) => {
        const t = (now - startTime) / 1000;
        drawGaragePreview(garageCtx, garageCanvas.width, garageCanvas.height, t, upgrades);
        const goScreen = document.getElementById('screen-garage');
        if (goScreen && !goScreen.classList.contains('hidden')) {
          garageAnimId = requestAnimationFrame(loop);
        }
      };
      garageAnimId = requestAnimationFrame(loop);
    }
  }

  document.getElementById('btn-buy-health').addEventListener('click', function () {
    const level = storage.getUpgrades().health || 0;
    if (level >= 5) return;
    if (storage.buyUpgrade('health', upgCosts.health[level])) {
      refreshGarage();
      audio.menuSelect();
    }
  });
  document.getElementById('btn-buy-fireRate').addEventListener('click', function () {
    const level = storage.getUpgrades().fireRate || 0;
    if (level >= 5) return;
    if (storage.buyUpgrade('fireRate', upgCosts.fireRate[level])) {
      refreshGarage();
      audio.menuSelect();
    }
  });
  document.getElementById('btn-buy-speed').addEventListener('click', function () {
    const level = storage.getUpgrades().speed || 0;
    if (level >= 5) return;
    if (storage.buyUpgrade('speed', upgCosts.speed[level])) {
      refreshGarage();
      audio.menuSelect();
    }
  });

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  // Boot the engine
  engine.state = 'menu';
  engine.running = true;
  engine.lastTime = performance.now();
  requestAnimationFrame((t) => engine.loop(t));

})();
