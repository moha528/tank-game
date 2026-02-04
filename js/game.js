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
const loadingStatus = document.querySelector("#loading-status");
const loadingProgress = document.querySelector("#loading-progress");
const hudMode = document.querySelector("#hud-mode");
const hudObjective = document.querySelector("#hud-objective");
const hudSystems = document.querySelector("#hud-systems");
const hudEnemies = document.querySelector("#hud-enemies");
const hudWave = document.querySelector("#hud-wave");
const hudTank = document.querySelector("#hud-tank");
const hudWeapon = document.querySelector("#hud-weapon");
const hudScore = document.querySelector("#hud-score");
const healthBar = document.querySelector("#health-bar");
const energyBar = document.querySelector("#energy-bar");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  padding: 24,
};

const GAME_MODES = {
  training: {
    label: "Entraînement Sandbox",
    description: "Terrain libre, objectifs personnalisés, aucun risque.",
    objective: "Déployez-vous et testez vos armes.",
    enemyCount: 2,
    waves: 1,
    systems: "Diagnostics, modules libres",
    scoreMultiplier: 0.5,
  },
  "bot-battle": {
    label: "Combat Bot",
    description: "Escarmouche rapide contre des IA tactiques.",
    objective: "Neutralisez les drones avant la prochaine vague.",
    enemyCount: 5,
    waves: 3,
    systems: "IA tactique, radar actif",
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
  },
  brute: {
    label: "Brute",
    speed: 150,
    size: { width: 54, height: 40 },
    color: "#ffb45d",
    maxHealth: 160,
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

const input = {
  keys: new Set(),
  pointer: { x: canvas.width / 2, y: canvas.height / 2 },
  shooting: false,
};

const gameState = {
  phase: "menu",
  mode: "training",
  score: 0,
  wave: 1,
  totalWaves: 1,
  energy: 1,
  shakeTime: 0,
  shakeIntensity: 0,
};

let selectedTank = "scout";
let selectedWeapon = "cannon";

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
    this.typeKey = typeKey;
    this.label = type.label;
    this.speed = type.speed;
    this.width = type.size.width;
    this.height = type.size.height;
    this.color = type.color;
    this.maxHealth = type.maxHealth;
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
  }

  update(dt) {
    this.cooldownTimer = Math.max(0, this.cooldownTimer - dt);
    if (input.shooting && this.cooldownTimer === 0) {
      this.fire();
      this.cooldownTimer = this.cooldown;
    }
  }

  fire() {
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
  }

  takeDamage(amount) {
    this.health -= amount;
    if (this.health <= 0) {
      this.isAlive = false;
      spawnExplosion(this.x, this.y);
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
}

function spawnEnemies(count) {
  enemies.length = 0;
  for (let i = 0; i < count; i += 1) {
    const x = 120 + Math.random() * (WORLD.width - 240);
    const y = 120 + Math.random() * (WORLD.height - 240);
    enemies.push(new Enemy(x, y));
  }
}

function setPhase(phase) {
  gameState.phase = phase;
  mainMenu.classList.toggle("is-active", phase === "menu");
  loadingScreen.classList.toggle("is-active", phase === "loading");
  pauseMenu.classList.toggle("is-active", phase === "paused");
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
  gameState.score = 0;
  gameState.energy = 1;
  player.health = player.maxHealth;
  bullets.length = 0;
  particles.length = 0;
  spawnEnemies(GAME_MODES[gameState.mode].enemyCount);
}

function returnToMenu() {
  setPhase("menu");
  gameState.score = 0;
  gameState.wave = 1;
  gameState.energy = 1;
  bullets.length = 0;
  particles.length = 0;
  enemies.length = 0;
}

function togglePause() {
  if (gameState.phase === "playing") {
    setPhase("paused");
  } else if (gameState.phase === "paused") {
    setPhase("playing");
  }
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
  hudWave.textContent = `Vague ${gameState.wave} / ${mode.waves}`;
  hudTank.textContent = player.label;
  hudWeapon.textContent = player.weapon.label;
  hudScore.textContent = gameState.score;
  healthBar.style.width = `${(player.health / player.maxHealth) * 100}%`;
  energyBar.style.width = `${gameState.energy * 100}%`;
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

tankButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedTank = button.dataset.tank;
    player.setType(selectedTank);
    player.health = player.maxHealth;
    setActiveButton(tankButtons, selectedTank);
  });
});

weaponButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedWeapon = button.dataset.weapon;
    player.weapon.setType(selectedWeapon);
    setActiveButton(weaponButtons, selectedWeapon);
  });
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Escape") {
    togglePause();
    return;
  }
  input.keys.add(event.code);
  if (event.code === "Space") input.shooting = true;
  if (event.code === "Digit1") {
    selectedWeapon = "cannon";
    player.weapon.setType(selectedWeapon);
    setActiveButton(weaponButtons, selectedWeapon);
  }
  if (event.code === "Digit2") {
    selectedWeapon = "scatter";
    player.weapon.setType(selectedWeapon);
    setActiveButton(weaponButtons, selectedWeapon);
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
setPhase("menu");
requestAnimationFrame(loop);
