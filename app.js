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
  const STORAGE_KEYS = {
    torque: 'torque',
    cars: 'cars',
    lastUpdate: 'lastUpdate',
    walletConnected: 'walletConnected',
    level: 'level',
    xp: 'xp',
    raceWins: 'raceWins',
    achievements: 'achievements',
    leaderboard: 'leaderboard'
  };

  const carImages = [
    'https://i.imgur.com/0k1K0jK.png',
    'https://i.imgur.com/5v3kWjD.png',
    'https://i.imgur.com/JpL9Z0Z.png',
    'https://i.imgur.com/8kL3fRj.png',
    'https://i.imgur.com/QwL9v5p.png'
  ];

  const carNames = ['Volt Racer', 'Turbo Drift', 'Chrome Bullet', 'Hyper Surge', 'Neon Phantom'];

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

  function syncTorqueUI() {
    if (!elements.balance) return;
    elements.balance.textContent = `${state.torque.toLocaleString()} $TORQUE`;
    localStorage.setItem(STORAGE_KEYS.torque, String(state.torque));
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
    localStorage.setItem('income', String(state.incomePerHour));

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
      card.innerHTML = `
        <img class="car-img" src="${car.img}" alt="${car.name}">
        <p><strong>${car.name}</strong></p>
        <p>${car.rarity} • Lv.${car.level}</p>
        <p>${car.income} $TORQUE/hr</p>
      `;
      card.addEventListener('click', () => showCarDetail(index));
      elements.garageGrid.appendChild(card);
    });

    for (let i = state.cars.length; i < 9; i += 1) {
      const slot = document.createElement('div');
      slot.className = 'car-card';
      slot.innerHTML = `
        <div class="empty-slot">+</div>
        <p>Open Box</p>
      `;
      slot.addEventListener('click', () => showSection('shop'));
      elements.garageGrid.appendChild(slot);
    }
  }

  function showCarDetail(index) {
    const car = state.cars[index];
    if (!car) return;
    if (elements.detailImg) elements.detailImg.src = car.img;
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
    if (elements.userAvatar) elements.userAvatar.src = photoUrl;
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

  function resizeRaceCanvas() {
    if (!elements.raceCanvas) return;
    const rect = elements.raceCanvas.getBoundingClientRect();
    if (rect.width === 0) return;
    elements.raceCanvas.width = rect.width;
    elements.raceCanvas.height = 300;
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
      multiplier += delta * (nitroActive ? 0.85 : 0.25);
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
    if (state.cars.length === 0) {
      alert('Open a box to get your first car before racing.');
      return;
    }
    raceGameRunning = true;
    multiplier = 1;
    crashPoint = 1 + Math.random() * 18 + Math.random() * 6;
    if (elements.startRace) elements.startRace.style.display = 'none';
    if (elements.nitro) elements.nitro.style.display = 'block';
    if (elements.cashOut) elements.cashOut.style.display = 'block';
  }

  function cashOut() {
    if (!raceGameRunning) return;
    raceGameRunning = false;
    const reward = Math.floor(1000 * multiplier);
    state.torque += reward;
    state.raceWins += 1;
    localStorage.setItem(STORAGE_KEYS.raceWins, String(state.raceWins));
    addXP(300 + Math.floor(multiplier * 50));
    syncTorqueUI();
    updateProfile();
    endRace(true, false);
  }

  function endRace(success, crashed) {
    if (elements.startRace) elements.startRace.style.display = 'block';
    if (elements.nitro) elements.nitro.style.display = 'none';
    if (elements.cashOut) elements.cashOut.style.display = 'none';

    if (crashed) {
      alert(`Crash at ${multiplier.toFixed(2)}x! Better luck next time.`);
    } else if (success) {
      alert(`Cash out at ${multiplier.toFixed(2)}x!`);
    }

    if (TelegramApp) {
      TelegramApp.HapticFeedback?.notificationOccurred('success');
    }
    multiplier = 1;
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
      if (elements.newCarImg) elements.newCarImg.src = newCar.img;
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
    setupEvents();

    if (state.isWalletConnected) {
      showSection('garage');
    }

    setInterval(() => {
      accrueIncome();
      syncTorqueUI();
    }, 5000);
  }

  init();
})();