const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const hud = document.querySelector("#hud");
const tankButtons = document.querySelectorAll("#tank-options button");
const weaponButtons = document.querySelectorAll("#weapon-options button");
const modeButtons = document.querySelectorAll("#mode-options button");
const menuOverlay = document.querySelector("#main-menu");
const loadingOverlay = document.querySelector("#loading-screen");
const loadingProgress = document.querySelector("#loading-progress");
const menuStartButtons = document.querySelectorAll("[data-start]");

const WORLD = {
  width: canvas.width,
  height: canvas.height,
  padding: 24,
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
    trail: "#7dd3fc",
    impact: "#bae6fd",
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
    trail: "#facc15",
    impact: "#fde68a",
  },
};

const GAME_MODES = {
  sandbox: {
    label: "Entraînement",
    description: "Exploration libre et tir sur cible.",
    enemyCount: 0,
  },
  bots: {
    label: "Combat bot",
    description: "Affronte des bots agressifs.",
    enemyCount: 4,
  },
  online: {
    label: "En ligne",
    description: "Mode réseau en préparation.",
    enemyCount: 0,
    locked: true,
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

let selectedTank = "scout";
let selectedWeapon = "cannon";
let selectedMode = "sandbox";

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

function spawnParticles({ x, y, color, count, spread, speed, life, size }) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const velocity = speed * (0.4 + Math.random() * 0.6);
    particles.push(
      new Particle({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color,
        life: life * (0.7 + Math.random() * 0.5),
        size: size * (0.6 + Math.random() * 0.7),
        spread,
      })
    );
  }
}

class Tank {
  constructor(typeKey) {
    this.setType(typeKey);
    this.x = WORLD.width / 2;
    this.y = WORLD.height / 2;
    this.angle = 0;
    this.weapon = new Weapon(selectedWeapon, this);
    this.health = this.maxHealth;
    this.energy = 100;
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

    this.energy = clamp(this.energy + dt * 6, 0, 100);
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = this.color;
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
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
    this.trail = type.trail;
    this.impact = type.impact;
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
      const muzzleX = this.owner.x + Math.cos(angle) * (this.owner.width / 2 + 6);
      const muzzleY = this.owner.y + Math.sin(angle) * (this.owner.width / 2 + 6);
      bullets.push(
        new Bullet({
          x: muzzleX,
          y: muzzleY,
          angle,
          speed: this.bulletSpeed,
          size: this.bulletSize,
          damage: this.damage,
          color: this.color,
          trail: this.trail,
          impact: this.impact,
        })
      );
      spawnParticles({
        x: muzzleX,
        y: muzzleY,
        color: this.trail,
        count: 10,
        spread: 0.6,
        speed: 120,
        life: 0.35,
        size: 2.4,
      });
    }
  }
}

class Bullet {
  constructor({ x, y, angle, speed, size, damage, color, trail, impact }) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size;
    this.damage = damage;
    this.color = color;
    this.trail = trail;
    this.impact = impact;
    this.isAlive = true;
    this.life = 1.2;
  }

  update(dt) {
    const previous = { x: this.x, y: this.y };
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;
    this.life -= dt;

    spawnParticles({
      x: (previous.x + this.x) / 2,
      y: (previous.y + this.y) / 2,
      color: this.trail,
      count: 2,
      spread: 0.2,
      speed: 40,
      life: 0.25,
      size: 1.6,
    });

    if (
      this.x < WORLD.padding ||
      this.x > WORLD.width - WORLD.padding ||
      this.y < WORLD.padding ||
      this.y > WORLD.height - WORLD.padding ||
      this.life <= 0
    ) {
      this.isAlive = false;
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
        spawnImpact(this.x, this.y, this.impact);
        return;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (rectsIntersect(bulletRect, getRect(enemy))) {
        enemy.takeDamage(this.damage);
        this.isAlive = false;
        spawnImpact(this.x, this.y, this.impact);
        return;
      }
    }
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Particle {
  constructor({ x, y, vx, vy, color, life, size }) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.isAlive = true;
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) {
      this.isAlive = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vx *= 0.96;
    this.vy *= 0.96;
  }

  draw() {
    const alpha = clamp(this.life / this.maxLife, 0, 1);
    ctx.fillStyle = `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Shockwave {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.radius = 6;
    this.color = color;
    this.life = 0.45;
    this.maxLife = this.life;
    this.isAlive = true;
  }

  update(dt) {
    this.life -= dt;
    this.radius += dt * 160;
    if (this.life <= 0) this.isAlive = false;
  }

  draw() {
    const alpha = this.life / this.maxLife;
    ctx.strokeStyle = `${this.color}${Math.floor(alpha * 255).toString(16).padStart(2, "0")}`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.stroke();
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
      spawnImpact(this.x, this.y, "#f87171");
    }
  }

  draw() {
    if (!this.isAlive) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.fillStyle = "#f87171";
    ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
    ctx.fillStyle = "#1f2937";
    ctx.fillRect(-6, -this.height / 2, 12, this.height);
    ctx.restore();
  }
}

function spawnImpact(x, y, color) {
  spawnParticles({
    x,
    y,
    color,
    count: 16,
    spread: 1,
    speed: 180,
    life: 0.5,
    size: 3.2,
  });
  particles.push(new Shockwave(x, y, color));
}

const player = new Tank(selectedTank);

function setActiveButton(buttons, value) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tank === value || button.dataset.weapon === value || button.dataset.mode === value);
  });
}

function updateMode(modeKey) {
  const mode = GAME_MODES[modeKey];
  if (mode.locked) return;
  selectedMode = modeKey;
  setActiveButton(modeButtons, selectedMode);
}

function resetSession() {
  bullets.length = 0;
  particles.length = 0;
  enemies.length = 0;
  player.x = WORLD.width / 2;
  player.y = WORLD.height / 2;
  player.health = player.maxHealth;
  player.energy = 100;

  const mode = GAME_MODES[selectedMode];
  if (mode.enemyCount > 0) {
    for (let i = 0; i < mode.enemyCount; i += 1) {
      enemies.push(new Enemy(160 + i * 160, 220 + (i % 2) * 160));
    }
  }
}

function showOverlay(element, show) {
  element.classList.toggle("is-visible", show);
  element.setAttribute("aria-hidden", String(!show));
}

function runLoadingSequence() {
  showOverlay(menuOverlay, false);
  showOverlay(loadingOverlay, true);
  let progress = 0;
  const timer = setInterval(() => {
    progress = clamp(progress + Math.random() * 18, 0, 100);
    loadingProgress.style.width = `${progress}%`;
    if (progress >= 100) {
      clearInterval(timer);
      showOverlay(loadingOverlay, false);
      resetSession();
    }
  }, 160);
}

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateMode(button.dataset.mode);
  });
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

menuStartButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const startMode = button.dataset.start;
    updateMode(startMode);
    runLoadingSequence();
  });
});

window.addEventListener("keydown", (event) => {
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
  if (event.code === "Escape") {
    showOverlay(menuOverlay, true);
  }
});

window.addEventListener("keyup", (event) => {
  input.keys.delete(event.code);
  if (event.code === "Space") input.shooting = false;
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  input.pointer.x = (event.clientX - rect.left) * scaleX;
  input.pointer.y = (event.clientY - rect.top) * scaleY;
});

canvas.addEventListener("mousedown", () => {
  input.shooting = true;
});

canvas.addEventListener("mouseup", () => {
  input.shooting = false;
});

function drawArena() {
  ctx.fillStyle = "#0d111c";
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 3;
  ctx.strokeRect(WORLD.padding, WORLD.padding, WORLD.width - WORLD.padding * 2, WORLD.height - WORLD.padding * 2);

  ctx.fillStyle = "#1f2937";
  obstacles.forEach((obstacle) => {
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });
}

function updateHud() {
  const aliveEnemies = enemies.filter((enemy) => enemy.isAlive).length;
  const mode = GAME_MODES[selectedMode];
  const healthPercent = Math.round((player.health / player.maxHealth) * 100);
  const energyPercent = Math.round(player.energy);

  hud.innerHTML = `
    <div class="hud-badge">${mode.label}</div>
    <div class="hud-title">${player.label} — ${player.weapon.label}</div>
    <div>
      <div class="hud-line"><span>PV</span><span>${Math.max(0, Math.round(player.health))}/${player.maxHealth}</span></div>
      <div class="hud-bar"><div class="hud-bar-fill" style="width: ${healthPercent}%"></div></div>
    </div>
    <div>
      <div class="hud-line"><span>Énergie</span><span>${energyPercent}%</span></div>
      <div class="hud-bar"><div class="hud-bar-fill" style="width: ${energyPercent}%; background: linear-gradient(90deg, #a855f7, #f472b6);"></div></div>
    </div>
    <div class="hud-line"><span>Ennemis</span><span>${aliveEnemies}</span></div>
    <div class="hud-line"><span>Objectif</span><span>${mode.description}</span></div>
  `;
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (!menuOverlay.classList.contains("is-visible") && !loadingOverlay.classList.contains("is-visible")) {
    player.update(dt);
    enemies.forEach((enemy) => enemy.update(dt, player));

    bullets.forEach((bullet) => bullet.update(dt));
    for (let i = bullets.length - 1; i >= 0; i -= 1) {
      if (!bullets[i].isAlive) bullets.splice(i, 1);
    }

    particles.forEach((particle) => particle.update(dt));
    for (let i = particles.length - 1; i >= 0; i -= 1) {
      if (!particles[i].isAlive) particles.splice(i, 1);
    }
  }

  drawArena();
  particles.forEach((particle) => particle.draw());
  player.draw();
  enemies.forEach((enemy) => enemy.draw());
  bullets.forEach((bullet) => bullet.draw());

  updateHud();
  requestAnimationFrame(loop);
}

showOverlay(menuOverlay, true);
requestAnimationFrame(loop);
