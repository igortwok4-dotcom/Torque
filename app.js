(() => {
  const TelegramApp = window.Telegram?.WebApp;
  if (TelegramApp) {
    TelegramApp.ready();
    TelegramApp.expand();
    const theme = TelegramApp.themeParams || {};
    document.body.style.backgroundColor = theme.bg_color || '#0b0b0f';
    document.body.style.color = theme.text_color || '#ffffff';
  }

  const XP_PER_LEVEL = 1000;
  const MIN_STAKE = 2000;
  const MIN_DRAG_STAKE = 3000;
  const DRAG_PAYOUT_SINGLE = 4.5;
  const DRAG_PAYOUT_DOUBLE = 2.25;
  const DRAG_COUNTDOWN_SECONDS = 5;
  const DRAG_RACE_SECONDS = 10;
  const STORAGE_KEYS = {
    torque: 'torque',
    cars: 'cars',
    lastUpdate: 'lastUpdate',
    walletConnected: 'walletConnected',
    level: 'level',
    xp: 'xp',
    raceWins: 'raceWins',
    achievements: 'achievements',
    leaderboard: 'leaderboard',
    raceStake: 'raceStake'
  };

  const carImages = [
    'https://i.imgur.com/0k1K0jK.png',
    'https://i.imgur.com/5v3kWjD.png',
    'https://i.imgur.com/JpL9Z0Z.png',
    'https://i.imgur.com/8kL3fRj.png',
    'https://i.imgur.com/QwL9v5p.png'
  ];

  const carNames = ['Volt Racer', 'Turbo Drift', 'Chrome Bullet', 'Hyper Surge', 'Neon Phantom'];
  const fallbackCarImage = 'assets/car-placeholder.svg';

  const state = {
    torque: Number(localStorage.getItem(STORAGE_KEYS.torque) || '0'),
    incomePerHour: 0,
    lastUpdate: Number(localStorage.getItem(STORAGE_KEYS.lastUpdate) || Date.now()),
    cars: JSON.parse(localStorage.getItem(STORAGE_KEYS.cars) || '[]'),
    isWalletConnected: localStorage.getItem(STORAGE_KEYS.walletConnected) === 'true',
    level: Number(localStorage.getItem(STORAGE_KEYS.level) || '1'),
    xp: Number(localStorage.getItem(STORAGE_KEYS.xp) || '0'),
    raceWins: Number(localStorage.getItem(STORAGE_KEYS.raceWins) || '0'),
    achievements: JSON.parse(localStorage.getItem(STORAGE_KEYS.achievements) || '[]'),
    leaderboard: JSON.parse(localStorage.getItem(STORAGE_KEYS.leaderboard) || '[]'),
    currentRaceStake: Number(localStorage.getItem(STORAGE_KEYS.raceStake) || '0'),
    dragStake: 0,
    dragSelectedCars: [],
    dragRaceRunning: false,
    dragWinner: null,
    isOpeningBox: false
  };

  localStorage.setItem(STORAGE_KEYS.lastUpdate, String(state.lastUpdate));

  const elements = {
    balance: document.getElementById('balance'),
    connectWallet: document.getElementById('connect-wallet'),
    collect: document.getElementById('collect'),
    incomeDisplay: document.getElementById('income-display'),
    garageGrid: document.getElementById('garage-grid'),
    garageHint: document.getElementById('garage-hint'),
    navItems: document.querySelectorAll('.nav-item'),
    goRaces: document.getElementById('go-races'),
    backToGarage: document.getElementById('back-to-garage'),
    detailImg: document.getElementById('detail-img'),
    detailName: document.getElementById('detail-name'),
    detailRarity: document.getElementById('detail-rarity'),
    detailIncome: document.getElementById('detail-income'),
    raceCanvas: document.getElementById('race-canvas'),
    multiplier: document.getElementById('multiplier'),
    startRace: document.getElementById('start-race'),
    cashOut: document.getElementById('cash-out-btn'),
    nitro: document.getElementById('nitro-btn'),
    stakeInput: document.getElementById('stake-input'),
    stakeBalance: document.getElementById('stake-balance'),
    stakeDisplay: document.getElementById('stake-display'),
    stakeQuick2000: document.getElementById('stake-quick-2000'),
    stakeQuick5000: document.getElementById('stake-quick-5000'),
    stakeMax: document.getElementById('stake-max'),
    raceTab: document.getElementById('race-tab'),
    dragTab: document.getElementById('drag-tab'),
    raceGame: document.getElementById('race-game'),
    dragGame: document.getElementById('drag-game'),
    dragStakeInput: document.getElementById('drag-stake'),
    dragQuick3000: document.getElementById('drag-quick-3000'),
    dragQuick10000: document.getElementById('drag-quick-10000'),
    dragMax: document.getElementById('drag-max'),
    dragBalance: document.getElementById('drag-balance'),
    dragOptions: document.getElementById('drag-options'),
    dragStart: document.getElementById('drag-start'),
    dragBars: document.getElementById('drag-bars'),
    dragModal: document.getElementById('drag-modal'),
    dragModalTitle: document.getElementById('drag-modal-title'),
    dragModalText: document.getElementById('drag-modal-text'),
    dragClose: document.getElementById('drag-close'),
    dragAgain: document.getElementById('drag-again'),
    boxModal: document.getElementById('box-modal'),
    revealCar: document.getElementById('reveal-car'),
    newCarImg: document.getElementById('new-car-img'),
    newCarName: document.getElementById('new-car-name'),
    newCarRarity: document.getElementById('new-car-rarity'),
    closeBox: document.getElementById('close-box'),
    userAvatar: document.getElementById('user-avatar'),
    userName: document.getElementById('user-name'),
    userLevel: document.getElementById('user-level'),
    userRank: document.getElementById('user-rank'),
    levelProgress: document.getElementById('level-progress'),
    carsOwned: document.getElementById('cars-owned'),
    garageValue: document.getElementById('garage-value'),
    raceWins: document.getElementById('race-wins'),
    leaderboardList: document.getElementById('leaderboard-list')
  };

  const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: 'https://torquesh.vercel.app/tonconnect-manifest.json',
    buttonRootId: null
  });

  function getCssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
  }

  function applyImageFallback(img, label) {
    if (!img) return;
    img.onerror = () => {
      if (img.src.includes(fallbackCarImage)) return;
      img.src = fallbackCarImage;
      img.alt = label || 'Car';
      img.classList.add('img-fallback');
    };
  }

  function syncTorqueUI() {
    if (!elements.balance) return;
    elements.balance.textContent = `$TORQUE ${state.torque.toLocaleString()}`;
    localStorage.setItem(STORAGE_KEYS.torque, String(state.torque));
    updateStakeUI();
    updateDragStakeUI();
  }

  function accrueIncome() {
    if (!state.isWalletConnected || state.incomePerHour <= 0) return;
    const now = Date.now();
    const elapsedHours = (now - state.lastUpdate) / 3600000;
    if (elapsedHours <= 0) return;
    const earned = Math.floor(state.incomePerHour * elapsedHours);
    if (earned <= 0) {
      state.lastUpdate = now;
      localStorage.setItem(STORAGE_KEYS.lastUpdate, String(state.lastUpdate));
      return;
    }
    state.torque += earned;
    state.lastUpdate = now;
    localStorage.setItem(STORAGE_KEYS.lastUpdate, String(state.lastUpdate));
  }

  function renderGarage() {
    const totalIncome = state.cars.reduce((sum, car) => sum + car.income, 0);
    state.incomePerHour = totalIncome;

    if (elements.incomeDisplay) {
      elements.incomeDisplay.textContent = `${totalIncome.toLocaleString()} $TORQUE/hr`;
    }

    if (elements.collect) {
      elements.collect.style.display = totalIncome > 0 ? 'block' : 'none';
    }

    if (elements.garageHint) {
      elements.garageHint.style.display = state.cars.length === 0 ? 'block' : 'none';
    }

    if (!elements.garageGrid) return;
    elements.garageGrid.innerHTML = '';

    state.cars.forEach((car, index) => {
      const card = document.createElement('div');
      card.className = 'car-card';

      const imageWrap = document.createElement('div');
      imageWrap.className = 'car-image-wrap';

      const img = document.createElement('img');
      img.className = 'car-img';
      img.src = car.img;
      img.alt = car.name;
      applyImageFallback(img, car.name);

      const badges = document.createElement('div');
      badges.className = 'car-badges';

      const rarity = document.createElement('span');
      rarity.className = 'badge rarity';
      rarity.textContent = car.rarity;

      const level = document.createElement('span');
      level.className = 'badge level';
      level.textContent = `Lv.${car.level}`;

      badges.appendChild(rarity);
      badges.appendChild(level);
      imageWrap.appendChild(img);
      imageWrap.appendChild(badges);

      const title = document.createElement('div');
      title.className = 'car-title';
      title.textContent = car.name;

      const income = document.createElement('div');
      income.className = 'car-income';
      income.innerHTML = `<span>⚡</span>${car.income} / hr`;

      card.appendChild(imageWrap);
      card.appendChild(title);
      card.appendChild(income);

      card.addEventListener('click', () => showCarDetail(index));
      elements.garageGrid.appendChild(card);
    });

    for (let i = state.cars.length; i < 9; i += 1) {
      const slot = document.createElement('div');
      slot.className = 'car-card';
      slot.innerHTML = `
        <div class="empty-slot">+</div>
        <div class="car-title">Open Box</div>
        <div class="car-income">Get a new car</div>
      `;
      slot.addEventListener('click', () => showSection('shop'));
      elements.garageGrid.appendChild(slot);
    }
  }

  function showCarDetail(index) {
    const car = state.cars[index];
    if (!car) return;
    if (elements.detailImg) {
      elements.detailImg.src = car.img;
      elements.detailImg.alt = car.name;
      applyImageFallback(elements.detailImg, car.name);
    }
    if (elements.detailName) elements.detailName.textContent = car.name;
    if (elements.detailRarity) elements.detailRarity.textContent = `${car.rarity} • Level ${car.level}`;
    if (elements.detailIncome) elements.detailIncome.textContent = `${car.income} $TORQUE/hr`;
    showSection('car-detail');
  }

  function addXP(amount) {
    state.xp += amount;
    while (state.xp >= XP_PER_LEVEL) {
      state.xp -= XP_PER_LEVEL;
      state.level += 1;
      if (TelegramApp) {
        TelegramApp.showPopup({
          title: 'Level Up!',
          message: `You are now level ${state.level}!`,
          buttons: [{ type: 'ok', text: 'Nice!' }]
        });
      }
    }
    localStorage.setItem(STORAGE_KEYS.xp, String(state.xp));
    localStorage.setItem(STORAGE_KEYS.level, String(state.level));
  }

  function applyAchievementClasses() {
    document.querySelectorAll('.achievement').forEach((el) => {
      const key = el.dataset.achievement;
      if (state.achievements.includes(key)) {
        el.classList.add('unlocked');
      }
    });
  }

  function checkAchievements() {
    const unlock = (key) => {
      if (!state.achievements.includes(key)) {
        state.achievements.push(key);
      }
    };

    if (state.cars.length >= 1) unlock('first-ride');
    if (state.raceWins >= 10) unlock('speed-demon');
    if (state.cars.length >= 5) unlock('collector');

    localStorage.setItem(STORAGE_KEYS.achievements, JSON.stringify(state.achievements));
    applyAchievementClasses();
  }

  function updateLeaderboard(username) {
    const entryIndex = state.leaderboard.findIndex((entry) => entry.username === username);
    const entry = {
      username,
      value: state.torque,
      wins: state.raceWins
    };

    if (entryIndex >= 0) {
      state.leaderboard[entryIndex] = entry;
    } else {
      state.leaderboard.push(entry);
    }

    state.leaderboard.sort((a, b) => b.value - a.value);
    state.leaderboard = state.leaderboard.slice(0, 5);
    localStorage.setItem(STORAGE_KEYS.leaderboard, JSON.stringify(state.leaderboard));

    if (!elements.leaderboardList) return;
    elements.leaderboardList.innerHTML = '';
    state.leaderboard.forEach((item, index) => {
      const li = document.createElement('li');
      li.textContent = `${index + 1}. ${item.username} — ${item.value.toLocaleString()} Value`;
      elements.leaderboardList.appendChild(li);
    });
  }

  function updateProfile() {
    const user = TelegramApp?.initDataUnsafe?.user || { username: 'Player', first_name: 'Player' };
    const username = user.username || user.first_name || 'Player';
    const photoUrl = user.photo_url || `https://via.placeholder.com/80/111/00FFFF?text=${username[0]}`;

    if (elements.userName) elements.userName.textContent = username;
    if (elements.userAvatar) {
      elements.userAvatar.src = photoUrl;
      elements.userAvatar.alt = username;
      elements.userAvatar.onerror = () => {
        elements.userAvatar.src = 'https://via.placeholder.com/80/111/00FFFF?text=U';
      };
    }
    if (elements.userLevel) elements.userLevel.textContent = String(state.level);
    if (elements.userRank) elements.userRank.textContent = String(999 - state.level);

    if (elements.levelProgress) {
      const progress = Math.min(100, Math.floor((state.xp / XP_PER_LEVEL) * 100));
      elements.levelProgress.value = progress;
    }

    if (elements.carsOwned) elements.carsOwned.textContent = String(state.cars.length);
    if (elements.garageValue) elements.garageValue.textContent = state.torque.toLocaleString();
    if (elements.raceWins) elements.raceWins.textContent = String(state.raceWins);

    checkAchievements();
    updateLeaderboard(username);
  }

  function parseStakeValue(raw) {
    const normalized = String(raw || '').replace(/[^0-9]/g, '');
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) return 0;
    return Math.floor(value);
  }

  function getCurrentStakeInput() {
    if (!elements.stakeInput) return 0;
    return parseStakeValue(elements.stakeInput.value);
  }

  function isStakeValid(value) {
    return value >= MIN_STAKE && value <= state.torque;
  }

  function updateStakeUI() {
    if (elements.stakeBalance) {
      elements.stakeBalance.textContent = `Balance: ${state.torque.toLocaleString()} $TORQUE`;
    }

    if (elements.stakeDisplay) {
      const displayValue = state.currentRaceStake || getCurrentStakeInput();
      elements.stakeDisplay.textContent = `Stake: ${displayValue.toLocaleString()} $TORQUE`;
    }

    if (elements.startRace) {
      const stakeValue = getCurrentStakeInput();
      const isValid = isStakeValid(stakeValue) && !raceGameRunning;
      elements.startRace.disabled = !isValid;
    }
  }

  function setStakeInputValue(value) {
    if (!elements.stakeInput) return;
    elements.stakeInput.value = value > 0 ? String(value) : '';
    updateStakeUI();
  }

  function updateDragStakeUI() {
    if (elements.dragBalance) {
      elements.dragBalance.textContent = `Balance: ${state.torque.toLocaleString()} $TORQUE`;
    }

    if (elements.dragStart) {
      const stakeValue = parseStakeValue(elements.dragStakeInput?.value);
      const isValidStake = stakeValue >= MIN_DRAG_STAKE && stakeValue <= state.torque;
      const hasSelection = state.dragSelectedCars.length > 0;
      elements.dragStart.disabled = !isValidStake || !hasSelection || state.dragRaceRunning;
    }
  }

  function updateDragChips() {
    if (!elements.dragOptions) return;
    elements.dragOptions.querySelectorAll('.drag-chip').forEach((chip) => {
      const carId = Number(chip.dataset.car);
      if (state.dragSelectedCars.includes(carId)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    });
  }

  function resetDragBars() {
    if (!elements.dragBars) return;
    elements.dragBars.querySelectorAll('.drag-bar').forEach((bar) => {
      bar.classList.remove('leading', 'winner');
      const fill = bar.querySelector('.drag-fill');
      if (fill) {
        fill.style.height = '10%';
      }
    });
  }

  function showDragModal(title, message, showActions = false) {
    if (!elements.dragModal || !elements.dragModalTitle || !elements.dragModalText) return;
    elements.dragModalTitle.textContent = title;
    elements.dragModalText.textContent = message;
    elements.dragModal.classList.add('active');
    elements.dragModal.setAttribute('aria-hidden', 'false');
    if (elements.dragClose && elements.dragAgain) {
      elements.dragClose.style.display = showActions ? 'inline-flex' : 'none';
      elements.dragAgain.style.display = showActions ? 'inline-flex' : 'none';
    }
  }

  function hideDragModal() {
    if (!elements.dragModal) return;
    elements.dragModal.classList.remove('active');
    elements.dragModal.setAttribute('aria-hidden', 'true');
  }

  function generateCrashPoint() {
    const roll = Math.random();
    let min = 1.01;
    let max = 3;

    if (roll < 0.6) {
      min = 1.01;
      max = 3;
    } else if (roll < 0.75) {
      min = 3;
      max = 5;
    } else if (roll < 0.9) {
      min = 5;
      max = 10;
    } else if (roll < 0.95) {
      min = 10;
      max = 15;
    } else if (roll < 0.995) {
      min = 15;
      max = 20;
    } else {
      min = 20;
      max = 30;
    }

    const bias = 2.2;
    const u = Math.pow(Math.random(), bias);
    const value = min + (max - min) * u;
    return Math.max(1.01, Number(value.toFixed(2)));
  }

  function showSection(id) {
    if (!state.isWalletConnected && id !== 'onboarding') {
      alert('Please connect your TON wallet first.');
      return;
    }

    document.querySelectorAll('.section').forEach((section) => section.classList.remove('active'));
    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    elements.navItems.forEach((item) => item.classList.remove('active'));
    const activeNav = document.querySelector(`.nav-item[data-section="${id}"]`);
    if (activeNav) activeNav.classList.add('active');

    if (id === 'garage') {
      renderGarage();
    }

    if (id === 'profile') {
      updateProfile();
    }

    if (id === 'races') {
      activateRaceCanvas();
      updateStakeUI();
      updateDragStakeUI();
    } else {
      deactivateRaceCanvas();
    }
  }

  let raceAnimationId = null;
  let raceGameRunning = false;
  let crashPoint = 0;
  let multiplier = 1;
  let roadOffset = 0;
  let nitroActive = false;
  let lastFrameTime = 0;
  let dragInterval = null;

  function resizeRaceCanvas() {
    if (!elements.raceCanvas) return;
    const rect = elements.raceCanvas.getBoundingClientRect();
    if (rect.width === 0) return;
    elements.raceCanvas.width = rect.width;
    elements.raceCanvas.height = 240;
  }

  function drawRaceFrame(timestamp) {
    if (!elements.raceCanvas) return;
    const ctx = elements.raceCanvas.getContext('2d');
    if (!ctx) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const delta = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    const neonCyan = getCssVar('neon-cyan');
    const neonBlue = getCssVar('neon-blue');
    const neonMagenta = getCssVar('neon-magenta');
    const textColor = getCssVar('text');

    ctx.clearRect(0, 0, elements.raceCanvas.width, elements.raceCanvas.height);
    ctx.fillStyle = '#0b0b0f';
    ctx.fillRect(0, 0, elements.raceCanvas.width, elements.raceCanvas.height);

    roadOffset += delta * 120;
    if (roadOffset > 60) roadOffset = 0;

    ctx.strokeStyle = neonCyan;
    ctx.lineWidth = 4;
    for (let i = -60; i < elements.raceCanvas.height; i += 60) {
      ctx.beginPath();
      ctx.moveTo(elements.raceCanvas.width / 2 - 60 + roadOffset, i);
      ctx.lineTo(elements.raceCanvas.width / 2 + 60 - roadOffset, i);
      ctx.stroke();
    }

    ctx.fillStyle = neonBlue;
    ctx.fillRect(elements.raceCanvas.width / 2 - 30, elements.raceCanvas.height - 100, 60, 80);
    ctx.fillStyle = neonMagenta;
    ctx.fillRect(elements.raceCanvas.width / 2 - 40, elements.raceCanvas.height - 120, 80, 40);

    if (raceGameRunning) {
      const baseGrowth = 0.22;
      const nitroBoost = nitroActive ? 0.4 : 0;
      multiplier += delta * (baseGrowth + nitroBoost);
      if (multiplier >= crashPoint) {
        multiplier = crashPoint;
        raceGameRunning = false;
        endRace(false, true);
      }
    }

    if (elements.multiplier) {
      elements.multiplier.textContent = `${multiplier.toFixed(2)}x`;
      elements.multiplier.style.color = multiplier > 5 ? 'tomato' : textColor;
    }

    if (raceAnimationId !== null) {
      raceAnimationId = requestAnimationFrame(drawRaceFrame);
    }
  }

  function startRace() {
    if (raceGameRunning) return;
    if (!state.isWalletConnected) {
      alert('Connect your TON wallet first.');
      return;
    }

    accrueIncome();
    syncTorqueUI();

    const stakeValue = getCurrentStakeInput();
    if (!Number.isFinite(stakeValue) || stakeValue <= 0) {
      alert('Enter a valid stake.');
      return;
    }

    if (!Number.isInteger(stakeValue)) {
      alert('Stake must be a whole number.');
      return;
    }

    if (stakeValue < MIN_STAKE) {
      alert(`Minimum stake is ${MIN_STAKE.toLocaleString()} $TORQUE.`);
      return;
    }

    if (stakeValue > state.torque) {
      alert('Stake cannot exceed your balance.');
      return;
    }

    if (state.cars.length === 0) {
      alert('Open a box to get your first car before racing.');
      return;
    }

    state.torque -= stakeValue;
    syncTorqueUI();
    state.currentRaceStake = stakeValue;
    localStorage.setItem(STORAGE_KEYS.raceStake, String(stakeValue));

    raceGameRunning = true;
    multiplier = 1;
    crashPoint = generateCrashPoint();

    if (elements.stakeInput) elements.stakeInput.disabled = true;
    if (elements.startRace) elements.startRace.style.display = 'none';
    if (elements.nitro) elements.nitro.style.display = 'block';
    if (elements.cashOut) elements.cashOut.style.display = 'block';

    updateStakeUI();
  }

  function cashOut() {
    if (!raceGameRunning) return;
    raceGameRunning = false;

    const payout = Math.floor(state.currentRaceStake * multiplier);
    state.torque += payout;
    state.raceWins += 1;
    localStorage.setItem(STORAGE_KEYS.raceWins, String(state.raceWins));
    addXP(300 + Math.floor(multiplier * 50));
    syncTorqueUI();
    updateProfile();
    endRace(true, false);
  }

  function resetRaceStake() {
    state.currentRaceStake = 0;
    localStorage.removeItem(STORAGE_KEYS.raceStake);
    if (elements.stakeInput) elements.stakeInput.disabled = false;
    updateStakeUI();
  }

  function endRace(success, crashed) {
    if (elements.startRace) elements.startRace.style.display = 'block';
    if (elements.nitro) elements.nitro.style.display = 'none';
    if (elements.cashOut) elements.cashOut.style.display = 'none';

    if (crashed) {
      alert(`Crash at ${multiplier.toFixed(2)}x! Stake lost.`);
      TelegramApp?.HapticFeedback?.notificationOccurred('error');
    } else if (success) {
      alert(`Cash out at ${multiplier.toFixed(2)}x!`);
      TelegramApp?.HapticFeedback?.notificationOccurred('success');
    }

    multiplier = 1;
    resetRaceStake();
  }

  function activateRaceCanvas() {
    resizeRaceCanvas();
    if (raceAnimationId === null) {
      lastFrameTime = 0;
      raceAnimationId = requestAnimationFrame(drawRaceFrame);
    }
  }

  function deactivateRaceCanvas() {
    if (raceAnimationId !== null) {
      cancelAnimationFrame(raceAnimationId);
      raceAnimationId = null;
    }
    raceGameRunning = false;
    if (elements.startRace) elements.startRace.style.display = 'block';
    if (elements.nitro) elements.nitro.style.display = 'none';
    if (elements.cashOut) elements.cashOut.style.display = 'none';
    if (elements.multiplier) elements.multiplier.textContent = '1.00x';
    resetRaceStake();
  }

  function startDragCountdown() {
    let remaining = DRAG_COUNTDOWN_SECONDS;
    showDragModal('Starting Drag Race', `Starting in ${remaining}…`, false);

    const countdownTimer = setInterval(() => {
      if (!state.dragRaceRunning) {
        clearInterval(countdownTimer);
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(countdownTimer);
        hideDragModal();
        runDragRace();
      } else {
        showDragModal('Starting Drag Race', `Starting in ${remaining}…`, false);
      }
    }, 1000);
  }

  function computeDragTimeline(winnerIndex) {
    const ticks = Math.floor(DRAG_RACE_SECONDS * 10);
    const timeline = Array.from({ length: ticks }, () => Array(5).fill(0));
    const current = Array(5).fill(10);

    for (let t = 0; t < ticks; t += 1) {
      for (let i = 0; i < 5; i += 1) {
        const jitter = Math.random() * 6;
        const growth = 1 + jitter + (i === winnerIndex ? Math.random() * 2 : 0);
        current[i] = Math.min(95, current[i] + growth);
      }

      const leadShift = Math.floor(Math.random() * 5);
      current[leadShift] = Math.min(95, current[leadShift] + 3 + Math.random() * 4);

      if (t === ticks - 1) {
        current.forEach((_, i) => {
          current[i] = 60 + Math.random() * 25;
        });
        current[winnerIndex] = 92;
      }

      timeline[t] = current.map((value) => Math.max(8, Math.min(95, value)));
    }

    return timeline;
  }

  function runDragRace() {
    if (!elements.dragBars) return;
    const bars = Array.from(elements.dragBars.querySelectorAll('.drag-bar'));
    resetDragBars();

    const winnerIndex = Math.floor(Math.random() * 5);
    state.dragWinner = winnerIndex + 1;

    const timeline = computeDragTimeline(winnerIndex);
    let tick = 0;

    dragInterval = setInterval(() => {
      if (!state.dragRaceRunning) {
        clearInterval(dragInterval);
        return;
      }
      const heights = timeline[tick];
      let lead = 0;
      heights.forEach((height, idx) => {
        if (height > heights[lead]) lead = idx;
        const fill = bars[idx].querySelector('.drag-fill');
        if (fill) {
          fill.style.height = `${height}%`;
        }
        bars[idx].classList.remove('leading');
      });
      bars[lead].classList.add('leading');

      tick += 1;
      if (tick >= timeline.length) {
        clearInterval(dragInterval);
        bars.forEach((bar) => bar.classList.remove('leading'));
        bars[winnerIndex].classList.add('winner');
        finishDragRace();
      }
    }, 100);
  }

  function finishDragRace() {
    state.dragRaceRunning = false;
    const selected = state.dragSelectedCars;
    const winner = state.dragWinner;
    const stake = state.dragStake;
    const won = selected.includes(winner);

    let payout = 0;
    if (won) {
      const multiplierValue = selected.length === 1 ? DRAG_PAYOUT_SINGLE : DRAG_PAYOUT_DOUBLE;
      payout = Math.floor(stake * multiplierValue);
      state.torque += payout;
      addXP(150 + Math.floor(multiplierValue * 50));
      state.raceWins += 1;
      localStorage.setItem(STORAGE_KEYS.raceWins, String(state.raceWins));
      syncTorqueUI();
      updateProfile();
      TelegramApp?.HapticFeedback?.notificationOccurred('success');
    } else {
      TelegramApp?.HapticFeedback?.notificationOccurred('error');
    }

    const resultText = won
      ? `You Won +${payout.toLocaleString()} $TORQUE`
      : `You Lost -${stake.toLocaleString()} $TORQUE`;

    showDragModal('Race Complete!', `Winner: Car #${winner}. ${resultText}`, true);
    updateDragStakeUI();
  }

  function resetDragGame() {
    state.dragStake = 0;
    state.dragSelectedCars = [];
    state.dragWinner = null;
    state.dragRaceRunning = false;
    if (elements.dragStakeInput) {
      elements.dragStakeInput.value = '';
      elements.dragStakeInput.disabled = false;
    }
    updateDragChips();
    updateDragStakeUI();
    resetDragBars();
  }

  function startDragRace() {
    if (state.dragRaceRunning) return;
    if (!state.isWalletConnected) {
      alert('Connect your TON wallet first.');
      return;
    }

    accrueIncome();
    syncTorqueUI();

    const stakeValue = parseStakeValue(elements.dragStakeInput?.value);
    if (!stakeValue || stakeValue < MIN_DRAG_STAKE) {
      alert(`Minimum stake is ${MIN_DRAG_STAKE.toLocaleString()} $TORQUE.`);
      return;
    }
    if (stakeValue > state.torque) {
      alert('Stake cannot exceed your balance.');
      return;
    }
    if (state.dragSelectedCars.length === 0) {
      alert('Select at least one car.');
      return;
    }

    state.torque -= stakeValue;
    syncTorqueUI();

    state.dragStake = stakeValue;
    state.dragRaceRunning = true;
    if (elements.dragStakeInput) elements.dragStakeInput.disabled = true;
    updateDragStakeUI();

    startDragCountdown();
  }

  function handleDragSelection(event) {
    const chip = event.target.closest('.drag-chip');
    if (!chip || state.dragRaceRunning) return;
    const carId = Number(chip.dataset.car);
    if (!carId) return;

    const selected = state.dragSelectedCars;
    if (selected.includes(carId)) {
      state.dragSelectedCars = selected.filter((id) => id !== carId);
    } else if (selected.length < 2) {
      state.dragSelectedCars = [...selected, carId];
    } else {
      alert('You can only select up to two cars.');
    }

    updateDragChips();
    updateDragStakeUI();
  }

  function toggleGameTab(target) {
    if (raceGameRunning || state.dragRaceRunning) {
      alert('Finish the current race before switching games.');
      return;
    }

    const showRace = target === 'race';
    if (elements.raceGame) elements.raceGame.hidden = !showRace;
    if (elements.dragGame) elements.dragGame.hidden = showRace;

    if (elements.raceTab) elements.raceTab.classList.toggle('chip-active', showRace);
    if (elements.dragTab) elements.dragTab.classList.toggle('chip-active', !showRace);
  }

  function openBoxModal() {
    if (!elements.boxModal || !elements.revealCar) return;
    elements.boxModal.style.display = 'flex';
    elements.boxModal.setAttribute('aria-hidden', 'false');
    elements.revealCar.style.display = 'none';
    elements.revealCar.classList.remove('show');

    const boxElement = elements.boxModal.querySelector('.box');
    if (boxElement) {
      boxElement.classList.remove('box-rotating');
      void boxElement.offsetWidth;
      boxElement.classList.add('box-rotating');
    }
  }

  function closeBoxModal() {
    if (!elements.boxModal) return;
    elements.boxModal.style.display = 'none';
    elements.boxModal.setAttribute('aria-hidden', 'true');
    state.isOpeningBox = false;
    toggleShopButtons(false);
  }

  function toggleShopButtons(disabled) {
    document.querySelectorAll('#shop .btn[data-box]').forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function createCarFromBox(boxType) {
    let rarity = 'Common';
    if (boxType === 'common') {
      const roll = Math.random();
      if (roll < 0.6) rarity = 'Common';
      else if (roll < 0.9) rarity = 'Rare';
      else rarity = 'Epic';
    } else if (boxType === 'rare') {
      const roll = Math.random();
      if (roll < 0.4) rarity = 'Rare';
      else if (roll < 0.8) rarity = 'Epic';
      else rarity = 'Legendary';
    } else {
      rarity = Math.random() < 0.5 ? 'Epic' : 'Legendary';
    }

    const income =
      rarity === 'Common'
        ? Math.floor(Math.random() * 500) + 200
        : rarity === 'Rare'
          ? Math.floor(Math.random() * 800) + 500
          : rarity === 'Epic'
            ? Math.floor(Math.random() * 1200) + 800
            : Math.floor(Math.random() * 2000) + 1200;

    return {
      name: carNames[Math.floor(Math.random() * carNames.length)],
      rarity,
      level: Math.floor(Math.random() * 10) + 1,
      income,
      img: carImages[Math.floor(Math.random() * carImages.length)]
    };
  }

  function handleBoxOpen(event) {
    const btn = event.currentTarget;
    if (!btn || state.isOpeningBox) return;
    if (!state.isWalletConnected) {
      alert('Connect your TON wallet first.');
      return;
    }

    accrueIncome();
    syncTorqueUI();

    const cost = Number(btn.dataset.cost || 0);
    if (state.torque < cost) {
      alert('Not enough $TORQUE. Win races or wait for passive income.');
      return;
    }

    state.torque -= cost;
    syncTorqueUI();
    state.isOpeningBox = true;
    toggleShopButtons(true);
    openBoxModal();

    const boxType = btn.dataset.box || 'common';
    const newCar = createCarFromBox(boxType);

    setTimeout(() => {
      if (!elements.revealCar) return;
      if (elements.newCarImg) {
        elements.newCarImg.src = newCar.img;
        elements.newCarImg.alt = newCar.name;
        applyImageFallback(elements.newCarImg, newCar.name);
      }
      if (elements.newCarName) elements.newCarName.textContent = `${newCar.name} Lv.${newCar.level}`;
      if (elements.newCarRarity) {
        elements.newCarRarity.textContent = `${newCar.rarity} • +${newCar.income} $TORQUE/hr`;
      }
      elements.revealCar.style.display = 'block';
      elements.revealCar.classList.add('show');

      state.cars.push(newCar);
      localStorage.setItem(STORAGE_KEYS.cars, JSON.stringify(state.cars));
      renderGarage();
      addXP(200);
      updateProfile();

      if (TelegramApp) {
        TelegramApp.HapticFeedback?.notificationOccurred('success');
      }
    }, 2000);
  }

  function setupShop() {
    document.querySelectorAll('#shop .btn[data-box]').forEach((btn) => {
      btn.addEventListener('click', handleBoxOpen);
    });
  }

  function setupRaceStakeControls() {
    if (elements.stakeInput) {
      elements.stakeInput.addEventListener('input', () => {
        const value = parseStakeValue(elements.stakeInput.value);
        if (String(value) !== elements.stakeInput.value && elements.stakeInput.value !== '') {
          elements.stakeInput.value = value > 0 ? String(value) : '';
        }
        updateStakeUI();
      });
    }

    if (elements.stakeQuick2000) {
      elements.stakeQuick2000.addEventListener('click', () => {
        setStakeInputValue(getCurrentStakeInput() + 2000);
      });
    }

    if (elements.stakeQuick5000) {
      elements.stakeQuick5000.addEventListener('click', () => {
        setStakeInputValue(getCurrentStakeInput() + 5000);
      });
    }

    if (elements.stakeMax) {
      elements.stakeMax.addEventListener('click', () => {
        setStakeInputValue(state.torque);
      });
    }
  }

  function setupDragControls() {
    if (elements.dragOptions) {
      elements.dragOptions.addEventListener('click', handleDragSelection);
    }

    if (elements.dragStakeInput) {
      elements.dragStakeInput.addEventListener('input', () => {
        const value = parseStakeValue(elements.dragStakeInput.value);
        if (String(value) !== elements.dragStakeInput.value && elements.dragStakeInput.value !== '') {
          elements.dragStakeInput.value = value > 0 ? String(value) : '';
        }
        updateDragStakeUI();
      });
    }

    if (elements.dragQuick3000) {
      elements.dragQuick3000.addEventListener('click', () => {
        const value = parseStakeValue(elements.dragStakeInput?.value) + 3000;
        if (elements.dragStakeInput) elements.dragStakeInput.value = String(value);
        updateDragStakeUI();
      });
    }

    if (elements.dragQuick10000) {
      elements.dragQuick10000.addEventListener('click', () => {
        const value = parseStakeValue(elements.dragStakeInput?.value) + 10000;
        if (elements.dragStakeInput) elements.dragStakeInput.value = String(value);
        updateDragStakeUI();
      });
    }

    if (elements.dragMax) {
      elements.dragMax.addEventListener('click', () => {
        if (elements.dragStakeInput) elements.dragStakeInput.value = String(state.torque);
        updateDragStakeUI();
      });
    }

    if (elements.dragStart) {
      elements.dragStart.addEventListener('click', startDragRace);
    }

    if (elements.dragClose) {
      elements.dragClose.addEventListener('click', () => {
        if (state.dragRaceRunning) return;
        hideDragModal();
      });
    }

    if (elements.dragAgain) {
      elements.dragAgain.addEventListener('click', () => {
        hideDragModal();
        resetDragGame();
      });
    }

    if (elements.raceTab) {
      elements.raceTab.addEventListener('click', () => toggleGameTab('race'));
    }

    if (elements.dragTab) {
      elements.dragTab.addEventListener('click', () => toggleGameTab('drag'));
    }
  }

  function setupEvents() {
    elements.navItems.forEach((item) => {
      item.addEventListener('click', () => showSection(item.dataset.section));
    });

    if (elements.goRaces) {
      elements.goRaces.addEventListener('click', () => showSection('races'));
    }

    if (elements.backToGarage) {
      elements.backToGarage.addEventListener('click', () => showSection('garage'));
    }

    if (elements.connectWallet) {
      elements.connectWallet.addEventListener('click', async () => {
        try {
          await tonConnectUI.connectWallet();
          state.isWalletConnected = true;
          localStorage.setItem(STORAGE_KEYS.walletConnected, 'true');
          state.lastUpdate = Date.now();
          localStorage.setItem(STORAGE_KEYS.lastUpdate, String(state.lastUpdate));
          showSection('garage');
          syncTorqueUI();
        } catch (error) {
          console.error(error);
          alert('Connection failed. Please try Tonkeeper or check the manifest.');
        }
      });
    }

    if (elements.collect) {
      elements.collect.addEventListener('click', () => {
        if (!state.isWalletConnected) {
          alert('Connect your TON wallet first.');
          return;
        }
        elements.collect.textContent = 'Collected!';
        setTimeout(() => {
          elements.collect.textContent = 'Collect Rewards';
        }, 1200);
        TelegramApp?.HapticFeedback?.notificationOccurred('success');
      });
    }

    if (elements.startRace) elements.startRace.addEventListener('click', startRace);
    if (elements.cashOut) elements.cashOut.addEventListener('click', cashOut);

    if (elements.nitro) {
      const activateNitro = () => {
        nitroActive = true;
      };
      const deactivateNitro = () => {
        nitroActive = false;
      };
      elements.nitro.addEventListener('mousedown', activateNitro);
      elements.nitro.addEventListener('mouseup', deactivateNitro);
      elements.nitro.addEventListener('mouseleave', deactivateNitro);
      elements.nitro.addEventListener('touchstart', activateNitro);
      elements.nitro.addEventListener('touchend', deactivateNitro);
    }

    if (elements.closeBox) {
      elements.closeBox.addEventListener('click', closeBoxModal);
    }

    if (elements.boxModal) {
      elements.boxModal.addEventListener('click', (event) => {
        if (event.target === elements.boxModal && elements.revealCar?.style.display === 'block') {
          closeBoxModal();
        }
      });
    }

    window.addEventListener('resize', () => {
      const racesActive = document.getElementById('races')?.classList.contains('active');
      if (racesActive) resizeRaceCanvas();
    });
  }

  function init() {
    renderGarage();
    syncTorqueUI();
    applyAchievementClasses();
    updateProfile();
    setupShop();
    setupRaceStakeControls();
    setupDragControls();
    setupEvents();
    updateDragChips();
    updateDragStakeUI();
    resetDragBars();

    if (state.isWalletConnected) {
      showSection('garage');
    }

    if (state.currentRaceStake && elements.stakeInput) {
      setStakeInputValue(state.currentRaceStake);
    }

    setInterval(() => {
      accrueIncome();
      syncTorqueUI();
    }, 5000);
  }

  init();
})();
