const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const hud = document.querySelector("#hud");
const tankButtons = document.querySelectorAll("#tank-options button");
const weaponButtons = document.querySelectorAll("#weapon-options button");
const modeButtons = document.querySelectorAll("#mode-options .mode-card");
const modeDetails = document.querySelector("#mode-details");
const startMissionButton = document.querySelector("#start-mission");
const mainMenu = document.querySelector("#main-menu");
const loadingScreen = document.querySelector("#loading-screen");
const pauseMenu = document.querySelector("#pause-menu");
const resumeMissionButton = document.querySelector("#resume-mission");
const exitMissionButton = document.querySelector("#exit-mission");
const hangarPanel = document.querySelector("#hangar-panel");
const openHangarButton = document.querySelector("#open-hangar");
const closeHangarButton = document.querySelector("#close-hangar");
const hangarTabs = document.querySelectorAll(".hangar-tab");
const hangarSections = document.querySelectorAll(".hangar-section");
const loadingStatus = document.querySelector("#loading-status");
const loadingProgress = document.querySelector("#loading-progress");
const hudMode = document.querySelector("#hud-mode");
const hudObjective = document.querySelector("#hud-objective");
const hudSystems = document.querySelector("#hud-systems");
const hudEnemies = document.querySelector("#hud-enemies");
const hudWave = document.querySelector("#hud-wave");
const hudWaveStatus = document.querySelector("#hud-wave-status");
const hudTank = document.querySelector("#hud-tank");
const hudWeapon = document.querySelector("#hud-weapon");
const hudScore = document.querySelector("#hud-score");
const hudCash = document.querySelector("#hud-cash");
const healthBar = document.querySelector("#health-bar");
const energyBar = document.querySelector("#energy-bar");
const ammoBar = document.querySelector("#ammo-bar");
const cashBalance = document.querySelector("#cash-balance");
const tankShop = document.querySelector("#tank-shop");
const weaponShop = document.querySelector("#weapon-shop");
const ammoShop = document.querySelector("#ammo-shop");
const upgradeShop = document.querySelector("#upgrade-shop");
const endScreen = document.querySelector("#end-screen");
const endSummary = document.querySelector("#end-summary");
const endScore = document.querySelector("#end-score");
const bestScore = document.querySelector("#best-score");
const leaderboardList = document.querySelector("#leaderboard-list");
const restartMissionButton = document.querySelector("#restart-mission");
const backToMenuButton = document.querySelector("#back-to-menu");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  padding: 24,
};

const GAME_MODES = {
  training: {
    label: "Entraînement Sandbox",
    description: "Terrain libre avec vagues d'entraînement progressives.",
    objective: "Tenez 3 vagues et testez vos loadouts.",
    enemyCount: 3,
    waves: 3,
    systems: "Diagnostics, modules libres, zone d'essai",
    scoreMultiplier: 0.5,
  },
  "bot-battle": {
    label: "Combat Bot",
    description: "Escarmouche infinie contre des IA tactiques.",
    objective: "Survivez et grimpez au leaderboard.",
    enemyCount: 5,
    waves: Infinity,
    systems: "IA tactique, radar actif, score persistant",
    scoreMultiplier: 1,
  },
  online: {
    label: "En ligne",
    description: "Batailles classées synchronisées (à venir).",
    objective: "Mode en préparation : testez la stabilité réseau.",
    enemyCount: 4,
    waves: 2,
    systems: "Synchronisation en file d'attente",
    scoreMultiplier: 1.5,
  },
};

const TANK_TYPES = {
  scout: {
    label: "Scout",
    speed: 220,
    size: { width: 44, height: 32 },
    color: "#5dd4ff",
    maxHealth: 100,
    price: 0,
    upgrade: { health: 12, speed: 8 },
  },
  brute: {
    label: "Brute",
    speed: 150,
    size: { width: 54, height: 40 },
    color: "#ffb45d",
    maxHealth: 160,
    price: 1200,
    upgrade: { health: 18, speed: 6 },
  },
  striker: {
    label: "Striker",
    speed: 190,
    size: { width: 50, height: 36 },
    color: "#a78bfa",
    maxHealth: 130,
    price: 2200,
    upgrade: { health: 15, speed: 9 },
  },
  bastion: {
    label: "Bastion",
    speed: 135,
    size: { width: 60, height: 46 },
    color: "#34d399",
    maxHealth: 200,
    price: 3200,
    upgrade: { health: 24, speed: 4 },
  },
};

const WEAPON_TYPES = {
  cannon: {
    label: "Canon",
    cooldown: 0.45,
    bulletSpeed: 420,
    bulletSize: 6,
    damage: 22,
    color: "#9ce7ff",
    spread: 0,
    pellets: 1,
    energyDrain: 0.18,
    ammoPerShot: 0,
    maxAmmo: Infinity,
    price: 0,
  },
  scatter: {
    label: "Scatter",
    cooldown: 0.75,
    bulletSpeed: 360,
    bulletSize: 4,
    damage: 12,
    color: "#ffd29c",
    spread: 0.18,
    pellets: 4,
    energyDrain: 0.32,
    ammoPerShot: 1,
    maxAmmo: 24,
    price: 900,
  },
  lancer: {
    label: "Lancer",
    cooldown: 1.05,
    bulletSpeed: 520,
    bulletSize: 7,
    damage: 38,
    color: "#fda4af",
    spread: 0.05,
    pellets: 1,
    energyDrain: 0.45,
    ammoPerShot: 1,
    maxAmmo: 16,
    price: 1400,
  },
  burst: {
    label: "Burst",
    cooldown: 0.18,
    bulletSpeed: 420,
    bulletSize: 4,
    damage: 10,
    color: "#fde68a",
    spread: 0.12,
    pellets: 2,
    energyDrain: 0.2,
    ammoPerShot: 1,
    maxAmmo: 36,
    price: 1100,
  },
};

const obstacles = [
  { x: 140, y: 120, width: 120, height: 60 },
  { x: 360, y: 220, width: 160, height: 90 },
  { x: 620, y: 120, width: 120, height: 120 },
  { x: 200, y: 420, width: 200, height: 80 },
  { x: 520, y: 380, width: 200, height: 70 },
];

const enemies = [];
const bullets = [];
const particles = [];

const STORAGE_KEY = "tank-arena-profile";
const MAX_LEADERBOARD = 5;

const input = {
  keys: new Set(),
  pointer: { x: canvas.width / 2, y: canvas.height / 2 },
  shooting: false,
};

const DEFAULT_PROFILE = {
  cash: 999999,
  ownedTanks: ["scout"],
  ownedWeapons: ["cannon"],
  ammo: {
    scatter: 12,
    lancer: 0,
    burst: 0,
  },
  upgrades: {
    scout: 0,
    brute: 0,
    striker: 0,
    bastion: 0,
  },
  bestScore: 0,
  leaderboard: [],
};

function loadProfile() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    const parsed = JSON.parse(stored);
    return {
      ...JSON.parse(JSON.stringify(DEFAULT_PROFILE)),
      ...parsed,
      ammo: { ...DEFAULT_PROFILE.ammo, ...parsed.ammo },
      upgrades: { ...DEFAULT_PROFILE.upgrades, ...parsed.upgrades },
    };
  } catch (error) {
    console.warn("Profile load error", error);
    return JSON.parse(JSON.stringify(DEFAULT_PROFILE));
  }
}

function saveProfile() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

const profile = loadProfile();

const gameState = {
  phase: "menu",
  mode: "training",
  score: 0,
  wave: 1,
  totalWaves: 1,
  energy: 1,
  cash: profile.cash,
  waveStatus: "En attente",
  waveCountdown: 0,
  waveCooldown: 0,
  shakeTime: 0,
  shakeIntensity: 0,
};

let selectedTank = "scout";
let selectedWeapon = "cannon";
let lastPhaseBeforeHangar = "playing";

const AMMO_PACK = 12;

function addCash(amount) {
  gameState.cash = Math.max(0, gameState.cash + amount);
  profile.cash = gameState.cash;
  saveProfile();
  updateShop();
}

function spendCash(amount) {
  if (gameState.cash < amount) return false;
  gameState.cash -= amount;
  profile.cash = gameState.cash;
  saveProfile();
  updateShop();
  return true;
}

function formatCash(value) {
  return `${value.toLocaleString("fr-FR")} ¢`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRect(entity) {
  return {
    x: entity.x - entity.width / 2,
    y: entity.y - entity.height / 2,
    width: entity.width,
    height: entity.height,
  };
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function resolveAxis(entity, dx, dy, solids) {
  let newX = entity.x + dx;
  let newY = entity.y + dy;

  const resolved = { x: newX, y: newY };

  if (dx !== 0) {
    const rect = {
      x: newX - entity.width / 2,
      y: entity.y - entity.height / 2,
      width: entity.width,
      height: entity.height,
    };
    for (const solid of solids) {
      if (rectsIntersect(rect, solid)) {
        if (dx > 0) {
          resolved.x = solid.x - entity.width / 2;
        } else {
          resolved.x = solid.x + solid.width + entity.width / 2;
        }
        break;
      }
    }
  }

  if (dy !== 0) {
    const rect = {
      x: resolved.x - entity.width / 2,
      y: newY - entity.height / 2,
      width: entity.width,
      height: entity.height,
    };
    for (const solid of solids) {
      if (rectsIntersect(rect, solid)) {
        if (dy > 0) {
          resolved.y = solid.y - entity.height / 2;
        } else {
          resolved.y = solid.y + solid.height + entity.height / 2;
        }
        break;
      }
    }
  }

  resolved.x = clamp(resolved.x, WORLD.padding + entity.width / 2, WORLD.width - WORLD.padding - entity.width / 2);
  resolved.y = clamp(resolved.y, WORLD.padding + entity.height / 2, WORLD.height - WORLD.padding - entity.height / 2);

  return resolved;
}

function addScreenShake(intensity) {
  gameState.shakeTime = 0.2;
  gameState.shakeIntensity = Math.max(gameState.shakeIntensity, intensity);
}

class Particle {
  constructor({ x, y, vx, vy, size, color, life, layer = "front", drag = 0.98, glow = 0 }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.layer = layer;
    this.drag = drag;
    this.glow = glow;
  }

  update(dt) {
    this.life -= dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= this.drag;
    this.vy *= this.drag;
    this.size *= 0.98;
  }

  draw() {
    if (this.life <= 0) return;
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    if (this.glow > 0) {
      ctx.shadowColor = this.color;
      ctx.shadowBlur = this.glow;
    }
    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0.5, this.size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Shockwave {
  constructor({ x, y, radius, color }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.color = color;
    this.life = 0.4;
    this.maxLife = 0.4;
  }

  update(dt) {
    this.life -= dt;
    this.radius += 80 * dt;
  }

  draw() {
    if (this.life <= 0) return;
    const alpha = this.life / this.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function spawnMuzzleFlash(x, y, angle, color) {
  const spread = 0.6;
  for (let i = 0; i < 8; i += 1) {
    const speed = 120 + Math.random() * 140;
    particles.push(
      new Particle({
        x,
        y,
        vx: Math.cos(angle + (Math.random() - 0.5) * spread) * speed,
        vy: Math.sin(angle + (Math.random() - 0.5) * spread) * speed,
        size: 3 + Math.random() * 3,
        color,
        life: 0.35,
        glow: 12,
      })
    );
  }
  particles.push(new Shockwave({ x, y, radius: 6, color }));
  addScreenShake(2.2);
}

function spawnImpact(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 180;
    particles.push(
      new Particle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color,
        life: 0.45,
        glow: 10,
      })
    );
  }
  particles.push(new Shockwave({ x, y, radius: 8, color }));
  addScreenShake(3.4);
}

function spawnExplosion(x, y) {
  for (let i = 0; i < 24; i += 1) {
    const angle = (Math.PI * 2 * i) / 24;
    const speed = 120 + Math.random() * 200;
    particles.push(
      new Particle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: "#ffb347",
        life: 0.8,
        glow: 14,
      })
    );
  }
  particles.push(new Shockwave({ x, y, radius: 10, color: "#ffd08a" }));
  addScreenShake(5);
}

class Tank {
  constructor(typeKey) {
    this.setType(typeKey);
    this.x = WORLD.width / 2;
    this.y = WORLD.height / 2;
    this.angle = 0;
    this.weapon = new Weapon(selectedWeapon, this);
    this.health = this.maxHealth;
  }

  setType(typeKey) {
    const type = TANK_TYPES[typeKey];
    const upgradeLevel = profile.upgrades[typeKey] ?? 0;
    this.typeKey = typeKey;
    this.label = type.label;
    this.speed = type.speed + upgradeLevel * type.upgrade.speed;
    this.width = type.size.width;
    this.height = type.size.height;
    this.color = type.color;
    this.maxHealth = type.maxHealth + upgradeLevel * type.upgrade.health;
  }

  update(dt) {
    const direction = { x: 0, y: 0 };
    if (input.keys.has("ArrowUp") || input.keys.has("KeyW") || input.keys.has("KeyZ")) direction.y -= 1;
    if (input.keys.has("ArrowDown") || input.keys.has("KeyS")) direction.y += 1;
    if (input.keys.has("ArrowLeft") || input.keys.has("KeyA") || input.keys.has("KeyQ")) direction.x -= 1;
    if (input.keys.has("ArrowRight") || input.keys.has("KeyD")) direction.x += 1;

    const magnitude = Math.hypot(direction.x, direction.y) || 1;
    const velocity = {
      x: (direction.x / magnitude) * this.speed * dt,
      y: (direction.y / magnitude) * this.speed * dt,
    };

    const resolved = resolveAxis(this, velocity.x, velocity.y, obstacles);
    this.x = resolved.x;
    this.y = resolved.y;

    this.angle = Math.atan2(input.pointer.y - this.y, input.pointer.x - this.x);
    this.weapon.update(dt);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1d2232";
    ctx.fillRect(-6, -this.height / 2, 12, this.height);
    ctx.fillStyle = "#c7d2fe";
    ctx.fillRect(0, -4, this.width / 2 + 6, 8);
    ctx.restore();
  }
}

class Weapon {
  constructor(typeKey, owner) {
    this.owner = owner;
    this.setType(typeKey);
    this.cooldownTimer = 0;
  }

  setType(typeKey) {
    const type = WEAPON_TYPES[typeKey];
    this.typeKey = typeKey;
    this.label = type.label;
    this.cooldown = type.cooldown;
    this.bulletSpeed = type.bulletSpeed;
    this.bulletSize = type.bulletSize;
    this.damage = type.damage;
    this.color = type.color;
    this.spread = type.spread;
    this.pellets = type.pellets;
    this.energyDrain = type.energyDrain;
    this.ammoPerShot = type.ammoPerShot;
    this.maxAmmo = type.maxAmmo;
  }

  update(dt) {
    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    if (input.shooting && this.cooldownTimer === 0 && this.hasAmmo() && gameState.energy >= this.energyDrain) {
      this.fire();
      this.cooldownTimer = this.cooldown;
    }
  }

  hasAmmo() {
    if (this.ammoPerShot === 0) return true;
    return (profile.ammo[this.typeKey] ?? 0) >= this.ammoPerShot;
  }

  fire() {
    if (this.ammoPerShot > 0) {
      profile.ammo[this.typeKey] = Math.max(0, (profile.ammo[this.typeKey] ?? 0) - this.ammoPerShot);
      saveProfile();
    }
    for (let i = 0; i < this.pellets; i += 1) {
      const jitter = (Math.random() - 0.5) * this.spread;
      const angle = this.owner.angle + jitter;
      bullets.push(
        new Bullet({
          x: this.owner.x + Math.cos(angle) * (this.owner.width / 2 + 6),
          y: this.owner.y + Math.sin(angle) * (this.owner.width / 2 + 6),
          angle,
          speed: this.bulletSpeed,
          size: this.bulletSize,
          damage: this.damage,
          color: this.color,
        })
      );
      spawnMuzzleFlash(
        this.owner.x + Math.cos(angle) * (this.owner.width / 2 + 8),
        this.owner.y + Math.sin(angle) * (this.owner.width / 2 + 8),
        angle,
        this.color
      );
    }
    gameState.energy = clamp(gameState.energy - this.energyDrain, 0, 1);
  }
}

class Bullet {
  constructor({ x, y, angle, speed, size, damage, color }) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size;
    this.damage = damage;
    this.color = color;
    this.isAlive = true;
  }

  update(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    if (
      this.x < WORLD.padding ||
      this.x > WORLD.width - WORLD.padding ||
      this.y < WORLD.padding ||
      this.y > WORLD.height - WORLD.padding
    ) {
      this.isAlive = false;
      spawnImpact(this.x, this.y, this.color);
      return;
    }

    const bulletRect = {
      x: this.x - this.size,
      y: this.y - this.size,
      width: this.size * 2,
      height: this.size * 2,
    };

    for (const solid of obstacles) {
      if (rectsIntersect(bulletRect, solid)) {
        this.isAlive = false;
        spawnImpact(this.x, this.y, this.color);
        return;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (rectsIntersect(bulletRect, getRect(enemy))) {
        enemy.takeDamage(this.damage);
        this.isAlive = false;
        spawnImpact(this.x, this.y, this.color);
        gameState.score += Math.round(10 * GAME_MODES[gameState.mode].scoreMultiplier);
        return;
      }
    }
  }

  draw() {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size * 1.2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(this.prevX, this.prevY);
    ctx.lineTo(this.x, this.y);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

class Enemy {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 42;
    this.height = 32;
    this.speed = 120;
    this.health = 60;
    this.isAlive = true;
    this.wanderTimer = 0;
    this.direction = { x: 0, y: 0 };
  }

  update(dt, target) {
    if (!this.isAlive) return;

    const toTarget = {
      x: target.x - this.x,
      y: target.y - this.y,
    };
    const distance = Math.hypot(toTarget.x, toTarget.y);

    if (distance < 280) {
      const magnitude = distance || 1;
      this.direction = { x: toTarget.x / magnitude, y: toTarget.y / magnitude };
    } else {
      this.wanderTimer -= dt;
      if (this.wanderTimer <= 0) {
        this.wanderTimer = 1 + Math.random() * 2.5;
        const angle = Math.random() * Math.PI * 2;
        this.direction = { x: Math.cos(angle), y: Math.sin(angle) };
      }
    }

    const velocity = {
      x: this.direction.x * this.speed * dt,
      y: this.direction.y * this.speed * dt,
    };

    const resolved = resolveAxis(this, velocity.x, velocity.y, obstacles);
    this.x = resolved.x;
    this.y = resolved.y;

    if (distance < 46) {
      target.health = Math.max(0, target.health - dt * 24);
      addScreenShake(1.4);
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.isAlive = false;
      spawnExplosion(this.x, this.y);
      addCash(80);
    }
  }

  draw() {
    if (!this.isAlive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#f87171";
    ctx.shadowColor = "#ff7b7b";
    ctx.shadowBlur = 10;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-6, -this.height / 2, 12, this.height);
    ctx.restore();
  }
}

const player = new Tank(selectedTank);

function setActiveButton(buttons, value) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tank === value || button.dataset.weapon === value || button.dataset.mode === value);
  });
}

function setMode(modeKey) {
  const mode = GAME_MODES[modeKey];
  gameState.mode = modeKey;
  gameState.totalWaves = mode.waves;
  gameState.wave = 1;
  modeDetails.innerHTML = `
    <strong>${mode.label}</strong><br />
    ${mode.description}<br />
    <em>${mode.objective}</em>
  `;
  setActiveButton(modeButtons, modeKey);
  updateShop();
}

function spawnEnemies(count) {
  enemies.length = 0;
  for (let i = 0; i < count; i += 1) {
    const x = 120 + Math.random() * (WORLD.width - 240);
    const y = 120 + Math.random() * (WORLD.height - 240);
    enemies.push(new Enemy(x, y));
  }
}

function getWaveEnemyCount() {
  const mode = GAME_MODES[gameState.mode];
  const base = mode.enemyCount;
  const scale = gameState.wave - 1;
  return Math.round(base + scale * 1.6);
}

function scheduleNextWave() {
  gameState.waveStatus = "Préparation de vague";
  gameState.waveCountdown = 2.5;
}

function startWave() {
  gameState.waveStatus = "Vague en cours";
  spawnEnemies(getWaveEnemyCount());
}

function updateWaves(dt) {
  if (gameState.waveCountdown > 0) {
    gameState.waveCountdown = Math.max(0, gameState.waveCountdown - dt);
    gameState.waveStatus = `Déploiement dans ${gameState.waveCountdown.toFixed(1)}s`;
    if (gameState.waveCountdown === 0) {
      startWave();
    }
  }

  const aliveEnemies = enemies.filter((enemy) => enemy.isAlive).length;
  if (aliveEnemies === 0 && gameState.waveCountdown === 0) {
    const mode = GAME_MODES[gameState.mode];
    if (mode.waves !== Infinity && gameState.wave >= mode.waves) {
      finishMatch("Vagues terminées. Mission accomplie.");
      return;
    }
    if (gameState.waveCooldown <= 0) {
      gameState.waveCooldown = 1.8;
      gameState.waveStatus = "Extraction des données";
      addCash(200);
    } else {
      gameState.waveCooldown = Math.max(0, gameState.waveCooldown - dt);
      if (gameState.waveCooldown === 0) {
        gameState.wave += 1;
        scheduleNextWave();
      }
    }
  }
}

function setPhase(phase) {
  gameState.phase = phase;
  mainMenu.classList.toggle("is-active", phase === "menu");
  loadingScreen.classList.toggle("is-active", phase === "loading");
  pauseMenu.classList.toggle("is-active", phase === "paused");
  endScreen.classList.toggle("is-active", phase === "end");
  hangarPanel.classList.toggle("is-active", phase === "hangar");
  hud.classList.toggle("is-active", phase === "playing" || phase === "paused");
  if (phase !== "playing") {
    input.keys.clear();
    input.shooting = false;
  }
}

function startLoading() {
  setPhase("loading");
  const messages = [
    "Calibration des moteurs...",
    "Synchronisation des capteurs...",
    "Chargement des modules tactiques...",
    "Vérification des communications...",
    "Systèmes prêts.",
  ];
  let progress = 0;
  let messageIndex = 0;
  loadingStatus.textContent = messages[messageIndex];
  const interval = setInterval(() => {
    progress += 0.12 + Math.random() * 0.08;
    if (progress >= 1) {
      progress = 1;
    }
    loadingProgress.style.width = `${Math.round(progress * 100)}%`;
    if (progress > (messageIndex + 1) / messages.length && messageIndex < messages.length - 1) {
      messageIndex += 1;
      loadingStatus.textContent = messages[messageIndex];
    }
    if (progress >= 1) {
      clearInterval(interval);
      startMatch();
    }
  }, 180);
}

function startMatch() {
  setPhase("playing");
  if (!profile.ownedTanks.includes(selectedTank)) {
    selectedTank = "scout";
  }
  if (!profile.ownedWeapons.includes(selectedWeapon)) {
    selectedWeapon = "cannon";
  }
  player.setType(selectedTank);
  player.weapon.setType(selectedWeapon);
  gameState.score = 0;
  gameState.energy = 1;
  player.health = player.maxHealth;
  gameState.wave = 1;
  gameState.waveCountdown = 0;
  gameState.waveCooldown = 0;
  gameState.waveStatus = "Préparation de vague";
  bullets.length = 0;
  particles.length = 0;
  scheduleNextWave();
  updateShop();
}

function finishMatch(summary) {
  if (gameState.mode === "bot-battle") {
    updateLeaderboard(gameState.score);
  }
  endSummary.textContent = summary;
  endScore.textContent = gameState.score;
  bestScore.textContent = profile.bestScore;
  renderLeaderboard();
  setPhase("end");
}

function returnToMenu() {
  setPhase("menu");
  gameState.score = 0;
  gameState.wave = 1;
  gameState.energy = 1;
  bullets.length = 0;
  particles.length = 0;
  enemies.length = 0;
  updateShop();
}

function updateLeaderboard(score) {
  if (score > profile.bestScore) {
    profile.bestScore = score;
  }
  profile.leaderboard = [...profile.leaderboard, score]
    .sort((a, b) => b - a)
    .slice(0, MAX_LEADERBOARD);
  saveProfile();
}

function renderLeaderboard() {
  leaderboardList.innerHTML = "";
  const scores = profile.leaderboard.length ? profile.leaderboard : [0];
  scores.forEach((score) => {
    const item = document.createElement("li");
    item.textContent = `${score} pts`;
    leaderboardList.appendChild(item);
  });
}

function togglePause() {
  if (gameState.phase === "playing") {
    setPhase("paused");
  } else if (gameState.phase === "paused") {
    setPhase("playing");
  }
}

function openHangar() {
  if (["loading", "end"].includes(gameState.phase)) return;
  lastPhaseBeforeHangar = gameState.phase === "hangar" ? "playing" : gameState.phase;
  setPhase("hangar");
}

function closeHangar() {
  if (gameState.phase !== "hangar") return;
  const nextPhase = lastPhaseBeforeHangar === "hangar" ? "playing" : lastPhaseBeforeHangar;
  setPhase(nextPhase);
}

function setHangarTab(tabKey) {
  hangarTabs.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabKey);
  });
  hangarSections.forEach((section) => {
    section.classList.toggle("is-active", section.dataset.tab === tabKey);
  });
}

function drawArena() {
  ctx.fillStyle = "#0d111c";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 3;
  ctx.strokeRect(WORLD.padding, WORLD.padding, WORLD.width - WORLD.padding * 2, WORLD.height - WORLD.padding * 2);

  ctx.strokeStyle = "rgba(95, 128, 255, 0.08)";
  ctx.lineWidth = 1;
  for (let x = WORLD.padding; x < WORLD.width - WORLD.padding; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, WORLD.padding);
    ctx.lineTo(x, WORLD.height - WORLD.padding);
    ctx.stroke();
  }
  for (let y = WORLD.padding; y < WORLD.height - WORLD.padding; y += 48) {
    ctx.beginPath();
    ctx.moveTo(WORLD.padding, y);
    ctx.lineTo(WORLD.width - WORLD.padding, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#1f2937";
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}

function updateHud() {
  const aliveEnemies = enemies.filter((enemy) => enemy.isAlive).length;
  const mode = GAME_MODES[gameState.mode];
  hudMode.textContent = mode.label;
  hudObjective.textContent = mode.objective;
  hudSystems.textContent = mode.systems;
  hudEnemies.textContent = `Ennemis : ${aliveEnemies}`;
  const waveTotal = mode.waves === Infinity ? "∞" : mode.waves;
  hudWave.textContent = `Vague ${gameState.wave} / ${waveTotal}`;
  hudWaveStatus.textContent = gameState.waveStatus;
  hudTank.textContent = player.label;
  hudWeapon.textContent = player.weapon.label;
  hudScore.textContent = gameState.score;
  hudCash.textContent = formatCash(gameState.cash);
  healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
  energyBar.style.width = `${gameState.energy * 100}%`;
  const ammo = player.weapon.ammoPerShot === 0 ? 1 : (profile.ammo[player.weapon.typeKey] ?? 0) / player.weapon.maxAmmo;
  ammoBar.style.width = `${Math.max(0, Math.min(1, ammo)) * 100}%`;
}

function createShopItem({ title, detail, actionLabel, onClick, isOwned, isActive, isLocked }) {
  const wrapper = document.createElement("div");
  wrapper.className = "shop-item";
  if (isOwned) wrapper.classList.add("is-owned");
  if (isActive) wrapper.classList.add("is-active");
  if (isLocked) wrapper.classList.add("is-locked");

  const meta = document.createElement("div");
  meta.className = "meta";
  const name = document.createElement("strong");
  name.textContent = title;
  const detailLine = document.createElement("span");
  detailLine.textContent = detail;
  meta.append(name, detailLine);

  const button = document.createElement("button");
  button.textContent = actionLabel;
  button.disabled = isLocked;
  button.addEventListener("click", onClick);

  wrapper.append(meta, button);
  return wrapper;
}

function updateShop() {
  cashBalance.textContent = formatCash(gameState.cash);
  hudCash.textContent = formatCash(gameState.cash);

  tankButtons.forEach((button) => {
    const key = button.dataset.tank;
    const owned = profile.ownedTanks.includes(key);
    button.disabled = !owned;
    button.classList.toggle("is-active", selectedTank === key);
  });

  weaponButtons.forEach((button) => {
    const key = button.dataset.weapon;
    const owned = profile.ownedWeapons.includes(key);
    button.disabled = !owned;
    button.classList.toggle("is-active", selectedWeapon === key);
  });

  tankShop.innerHTML = "";
  Object.entries(TANK_TYPES).forEach(([key, tank]) => {
    const owned = profile.ownedTanks.includes(key);
    const active = selectedTank === key;
    const priceLabel = owned ? "Déjà acquis" : `Acheter ${formatCash(tank.price)}`;
    const actionLabel = owned ? (active ? "Actif" : "Activer") : priceLabel;
    const item = createShopItem({
      title: tank.label,
      detail: `${tank.maxHealth} PV · ${tank.speed} vit.`,
      actionLabel,
      isOwned: owned,
      isActive: active,
      isLocked: !owned && gameState.cash < tank.price,
      onClick: () => {
        if (!owned) {
          if (!spendCash(tank.price)) return;
          profile.ownedTanks.push(key);
          saveProfile();
        }
        selectedTank = key;
        player.setType(selectedTank);
        player.health = player.maxHealth;
        setActiveButton(tankButtons, selectedTank);
        updateShop();
      },
    });
    tankShop.appendChild(item);
  });

  weaponShop.innerHTML = "";
  Object.entries(WEAPON_TYPES).forEach(([key, weapon]) => {
    const owned = profile.ownedWeapons.includes(key);
    const active = selectedWeapon === key;
    const priceLabel = owned ? "Déjà acquis" : `Acheter ${formatCash(weapon.price)}`;
    const actionLabel = owned ? (active ? "Actif" : "Équiper") : priceLabel;
    const item = createShopItem({
      title: weapon.label,
      detail: `${weapon.damage} dmg · ${weapon.cooldown}s`,
      actionLabel,
      isOwned: owned,
      isActive: active,
      isLocked: !owned && gameState.cash < weapon.price,
      onClick: () => {
        if (!owned) {
          if (!spendCash(weapon.price)) return;
          profile.ownedWeapons.push(key);
          profile.ammo[key] = profile.ammo[key] ?? Math.ceil(weapon.maxAmmo / 2);
          saveProfile();
        }
        selectedWeapon = key;
        player.weapon.setType(selectedWeapon);
        setActiveButton(weaponButtons, selectedWeapon);
        updateShop();
      },
    });
    weaponShop.appendChild(item);
  });

  ammoShop.innerHTML = "";
  Object.entries(WEAPON_TYPES).forEach(([key, weapon]) => {
    if (weapon.ammoPerShot === 0) return;
    const owned = profile.ownedWeapons.includes(key);
    const ammoCount = profile.ammo[key] ?? 0;
    const cost = 160;
    const item = createShopItem({
      title: `${weapon.label} +${AMMO_PACK}`,
      detail: `${ammoCount}/${weapon.maxAmmo} en stock`,
      actionLabel: owned ? `Acheter ${formatCash(cost)}` : "Verrouillé",
      isOwned: owned,
      isLocked: !owned || gameState.cash < cost,
      onClick: () => {
        if (!owned) return;
        if (!spendCash(cost)) return;
        profile.ammo[key] = Math.min(weapon.maxAmmo, ammoCount + AMMO_PACK);
        saveProfile();
        updateShop();
      },
    });
    ammoShop.appendChild(item);
  });

  upgradeShop.innerHTML = "";
  Object.entries(TANK_TYPES).forEach(([key, tank]) => {
    const level = profile.upgrades[key] ?? 0;
    const maxLevel = 3;
    const cost = 420 + level * 220;
    const locked = level >= maxLevel || gameState.cash < cost;
    const item = createShopItem({
      title: `${tank.label} niveau ${level}/${maxLevel}`,
      detail: `+${tank.upgrade.health} PV · +${tank.upgrade.speed} vit.`,
      actionLabel: level >= maxLevel ? "Max" : `Améliorer ${formatCash(cost)}`,
      isOwned: level > 0,
      isLocked: locked && level < maxLevel,
      onClick: () => {
        if (level >= maxLevel) return;
        if (!spendCash(cost)) return;
        profile.upgrades[key] = level + 1;
        saveProfile();
        if (selectedTank === key) {
          player.setType(key);
          player.health = player.maxHealth;
        }
        updateShop();
      },
    });
    upgradeShop.appendChild(item);
  });
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
  });
});

startMissionButton.addEventListener("click", () => {
  if (gameState.phase === "menu") {
    startLoading();
  }
});

resumeMissionButton.addEventListener("click", () => {
  if (gameState.phase === "paused") {
    setPhase("playing");
  }
});

exitMissionButton.addEventListener("click", () => {
  returnToMenu();
});

openHangarButton.addEventListener("click", () => {
  openHangar();
});

closeHangarButton.addEventListener("click", () => {
  closeHangar();
});

restartMissionButton.addEventListener("click", () => {
  if (gameState.phase === "end") {
    startLoading();
  }
});

backToMenuButton.addEventListener("click", () => {
  if (gameState.phase === "end") {
    returnToMenu();
  }
});

hangarTabs.forEach((button) => {
  button.addEventListener("click", () => {
    setHangarTab(button.dataset.tab);
  });
});

tankButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTank = button.dataset.tank;
    if (!profile.ownedTanks.includes(targetTank)) return;
    selectedTank = targetTank;
    player.setType(selectedTank);
    player.health = player.maxHealth;
    setActiveButton(tankButtons, selectedTank);
    updateShop();
  });
});

weaponButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetWeapon = button.dataset.weapon;
    if (!profile.ownedWeapons.includes(targetWeapon)) return;
    selectedWeapon = targetWeapon;
    player.weapon.setType(selectedWeapon);
    setActiveButton(weaponButtons, selectedWeapon);
    updateShop();
  });
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    if (gameState.phase === "hangar") {
      closeHangar();
      return;
    }
    togglePause();
    return;
  }
  input.keys.add(event.code);
  if (event.code === "Space") input.shooting = true;
  if (event.code === "Digit1") {
    selectedWeapon = "cannon";
    if (profile.ownedWeapons.includes(selectedWeapon)) {
      player.weapon.setType(selectedWeapon);
      setActiveButton(weaponButtons, selectedWeapon);
      updateShop();
    }
  }
  if (event.code === "Digit2") {
    selectedWeapon = "scatter";
    if (profile.ownedWeapons.includes(selectedWeapon)) {
      player.weapon.setType(selectedWeapon);
      setActiveButton(weaponButtons, selectedWeapon);
      updateShop();
    }
  }
  if (event.code === "Digit3") {
    selectedWeapon = "lancer";
    if (profile.ownedWeapons.includes(selectedWeapon)) {
      player.weapon.setType(selectedWeapon);
      setActiveButton(weaponButtons, selectedWeapon);
      updateShop();
    }
  }
  if (event.code === "Digit4") {
    selectedWeapon = "burst";
    if (profile.ownedWeapons.includes(selectedWeapon)) {
      player.weapon.setType(selectedWeapon);
      setActiveButton(weaponButtons, selectedWeapon);
      updateShop();
    }
  }
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
  if (event.code === "Space") input.shooting = false;
});

canvas.addEventListener("mousemove", (event) => {
  if (gameState.phase !== "playing") return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  input.pointer.x = (event.clientX - rect.left) * scaleX;
  input.pointer.y = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener("mousedown", () => {
  if (gameState.phase !== "playing") return;
  input.shooting = true;
});

canvas.addEventListener("mouseup", () => {
  input.shooting = false;
});

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (gameState.phase === "playing") {
    gameState.energy = clamp(gameState.energy + dt * 0.25, 0, 1);
    player.update(dt);
    enemies.forEach((enemy) => enemy.update(dt, player));
    bullets.forEach((bullet) => bullet.update(dt));
    updateWaves(dt);
    if (player.health <= 0) {
      finishMatch("Votre tank a été détruit. Analysez vos améliorations.");
    }
  }

  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    if (!bullets[i].isAlive) bullets.splice(i, 1);
  }

  particles.forEach((particle) => particle.update(dt));
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }

  if (gameState.shakeTime > 0) {
    gameState.shakeTime -= dt;
  } else {
    gameState.shakeIntensity = 0;
  }

  const shakeX = (Math.random() - 0.5) * gameState.shakeIntensity;
  const shakeY = (Math.random() - 0.5) * gameState.shakeIntensity;

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawArena();

  particles.filter((particle) => particle.layer === "behind").forEach((particle) => particle.draw());
  player.draw();
  enemies.forEach((enemy) => enemy.draw());
  bullets.forEach((bullet) => bullet.draw());
  particles.filter((particle) => particle.layer !== "behind").forEach((particle) => particle.draw());
  ctx.restore();

  updateHud();
  requestAnimationFrame(loop);
}

setMode(gameState.mode);
setHangarTab("loadout");
setPhase("menu");
updateShop();
renderLeaderboard();
requestAnimationFrame(loop);
