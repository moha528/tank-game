const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const hud = document.querySelector("#hud");
const tankButtons = document.querySelectorAll("#tank-options button");
const weaponButtons = document.querySelectorAll("#weapon-options button");

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

const input = {
  keys: new Set(),
  pointer: { x: canvas.width / 2, y: canvas.height / 2 },
  shooting: false,
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
    }
  }
}

class Bullet {
  constructor({ x, y, angle, speed, size, damage, color }) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.speed = speed;
    this.size = size;
    this.damage = damage;
    this.color = color;
    this.isAlive = true;
  }

  update(dt) {
    this.x += Math.cos(this.angle) * this.speed * dt;
    this.y += Math.sin(this.angle) * this.speed * dt;

    if (
      this.x < WORLD.padding ||
      this.x > WORLD.width - WORLD.padding ||
      this.y < WORLD.padding ||
      this.y > WORLD.height - WORLD.padding
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
        return;
      }
    }

    for (const enemy of enemies) {
      if (!enemy.isAlive) continue;
      if (rectsIntersect(bulletRect, getRect(enemy))) {
        enemy.takeDamage(this.damage);
        this.isAlive = false;
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

const player = new Tank(selectedTank);
const bullets = [];

enemies.push(new Enemy(160, 320));
enemies.push(new Enemy(760, 220));
enemies.push(new Enemy(680, 480));

function setActiveButton(buttons, value) {
  buttons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tank === value || button.dataset.weapon === value);
  });
}

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
  hud.innerHTML = `
    <strong>${player.label}</strong> — ${player.weapon.label}<br />
    PV: ${Math.max(0, Math.round(player.health))} / ${player.maxHealth}<br />
    Ennemis restants : ${aliveEnemies}
  `;
}

let lastTime = 0;
function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  player.update(dt);
  enemies.forEach((enemy) => enemy.update(dt, player));

  bullets.forEach((bullet) => bullet.update(dt));
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    if (!bullets[i].isAlive) bullets.splice(i, 1);
  }

  drawArena();
  player.draw();
  enemies.forEach((enemy) => enemy.draw());
  bullets.forEach((bullet) => bullet.draw());

  updateHud();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
