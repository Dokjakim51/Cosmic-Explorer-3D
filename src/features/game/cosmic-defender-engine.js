import { getDifficultyDefinition, getLevelDefinition, cosmicDefenderThemes } from './cosmic-defender-levels.js';

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const intersects = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
const normalize = (x, y) => {
  const length = Math.hypot(x, y) || 1;
  return { x: x / length, y: y / length };
};

export const GAME_STATES = Object.freeze({
  STARTING: 'STARTING',
  PLAYING: 'PLAYING',
  WAVE_COMPLETE: 'WAVE_COMPLETE',
  WAVE_COUNTDOWN: 'WAVE_COUNTDOWN',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  GAME_OVER: 'GAME_OVER',
  DESTROYED: 'DESTROYED'
});

const ACTIVE_INPUT_STATES = new Set([
  GAME_STATES.PLAYING,
  GAME_STATES.WAVE_COMPLETE,
  GAME_STATES.WAVE_COUNTDOWN,
  GAME_STATES.PAUSED
]);

const DANGEROUS_PROJECTILES = new Set(['laser','ice-wall','lightning-wall','rotating-wall']);

export class CosmicDefenderEngine {
  constructor({ canvas, viewport, levelId, difficulty = 'normal', playerName, onHud, onState, onFinish, onGameOver, onPause, onAudio }) {
    if (!(canvas instanceof HTMLCanvasElement)) throw new TypeError('Cosmic Defender requires a canvas element.');
    this.canvas = canvas;
    this.viewport = viewport || canvas.parentElement;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('The 2D canvas context could not be created.');

    this.level = getLevelDefinition(levelId);
    this.levelId = this.level.id;
    this.theme = cosmicDefenderThemes[this.levelId];
    this.difficultyId = difficulty === 'hard' ? 'hard' : 'normal';
    this.difficulty = getDifficultyDefinition(this.difficultyId);
    this.playerName = playerName || 'Pilot';
    this.onHud = onHud;
    this.onState = onState;
    this.onFinish = onFinish;
    this.onGameOver = onGameOver;
    this.onPause = onPause;
    this.onAudio = onAudio;

    this.state = GAME_STATES.STARTING;
    this.stateBeforePause = GAME_STATES.PLAYING;
    this.keys = new Set();
    this.touchVector = { x: 0, y: 0 };
    this.pointerTarget = null;
    this.touchFire = false;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.startedAt = 0;
    this.autoPauseArmedAt = Number.POSITIVE_INFINITY;
    this.abortController = new AbortController();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.viewport || this.canvas);

    this.logicalWidth = 960;
    this.logicalHeight = 720;
    this.reset();
    this.bindEvents();
    this.resize(true);
  }

  bindEvents() {
    const signal = this.abortController.signal;
    window.addEventListener('keydown', (event) => this.keyDown(event), { signal, capture: true });
    window.addEventListener('keyup', (event) => this.keyUp(event), { signal, capture: true });
    window.addEventListener('blur', () => {
      if (performance.now() >= this.autoPauseArmedAt) this.pause('blur');
    }, { signal });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && performance.now() >= this.autoPauseArmedAt) this.pause('hidden');
    }, { signal });
  }

  reset() {
    this.time = 0;
    this.score = 0;
    this.lives = 3;
    this.currentWave = 0;
    this.totalWaves = this.level.waves.length + 1;
    this.combo = 0;
    this.maxCombo = 0;
    this.shots = 0;
    this.hits = 0;
    this.destroyed = 0;
    this.countdown = 0;
    this.stateTimer = 0;
    this.waveStarted = false;
    this.waveEvent = null;
    this.eventTimer = 0;
    this.bossPhase = 0;
    this.player = {
      x: this.logicalWidth / 2,
      y: this.logicalHeight - 70,
      w: 32,
      h: 40,
      speed: 430,
      cooldown: 0,
      invulnerable: 0,
      slowTimer: 0,
      pullX: 0,
      pullY: 0
    };
    this.bullets = [];
    this.enemyBullets = [];
    this.enemies = [];
    this.hazards = [];
    this.particles = [];
    this.stars = Array.from({ length: 100 }, () => this.makeStar());
  }

  makeStar() {
    return {
      x: Math.random() * this.logicalWidth,
      y: Math.random() * this.logicalHeight,
      size: Math.random() * 2 + 0.4,
      speed: 20 + Math.random() * 70
    };
  }

  calculateLogicalSize(width, height) {
    const aspect = width / height;
    if (aspect >= 1) return { width: clamp(Math.round(720 * aspect), 960, 1280), height: 720 };
    return { width: 720, height: clamp(Math.round(720 / aspect), 900, 1280) };
  }

  resize(required = false) {
    const rect = (this.viewport || this.canvas).getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      if (required) throw new Error(`Invalid game viewport dimensions: ${Math.round(rect.width)} × ${Math.round(rect.height)}.`);
      return false;
    }

    const oldWidth = this.logicalWidth;
    const oldHeight = this.logicalHeight;
    const logical = this.calculateLogicalSize(rect.width, rect.height);
    this.logicalWidth = logical.width;
    this.logicalHeight = logical.height;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(2, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(2, Math.round(rect.height * dpr));
    this.canvas.style.width = `${Math.round(rect.width)}px`;
    this.canvas.style.height = `${Math.round(rect.height)}px`;
    this.ctx.setTransform(this.canvas.width / this.logicalWidth, 0, 0, this.canvas.height / this.logicalHeight, 0, 0);

    if (oldWidth && oldHeight) {
      const sx = this.logicalWidth / oldWidth;
      const sy = this.logicalHeight / oldHeight;
      if (this.player) {
        this.player.x = clamp(this.player.x * sx, 24, this.logicalWidth - 24);
        this.player.y = clamp(this.player.y * sy, 70, this.logicalHeight - 28);
      }
      for (const entity of [...this.enemies, ...this.bullets, ...this.enemyBullets, ...this.hazards, ...this.particles, ...this.stars]) {
        entity.x *= sx;
        entity.y *= sy;
        if ('baseX' in entity) entity.baseX *= sx;
        if ('baseY' in entity) entity.baseY *= sy;
        if ('targetX' in entity) entity.targetX *= sx;
        if ('targetY' in entity) entity.targetY *= sy;
      }
    }

    this.emitHud();
    this.draw();
    return true;
  }

  isInputActive() {
    return this.running && ACTIVE_INPUT_STATES.has(this.state);
  }

  keyDown(event) {
    const controls = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space','KeyP','Escape'];
    if (!controls.includes(event.code) || !this.isInputActive()) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
    event.preventDefault();
    event.stopPropagation();

    if ((event.code === 'KeyP' || event.code === 'Escape') && !event.repeat) {
      this.togglePause();
      return;
    }
    this.keys.add(event.code);
  }

  keyUp(event) {
    if (this.keys.has(event.code)) {
      event.preventDefault();
      this.keys.delete(event.code);
    }
  }

  setTouchVector(x, y) {
    const length = Math.hypot(x, y);
    this.touchVector.x = length > 1 ? x / length : x;
    this.touchVector.y = length > 1 ? y / length : y;
  }

  setPointerTarget(x, y, active = true) {
    this.pointerTarget = active ? {
      x: clamp(x, 24, this.logicalWidth - 24),
      y: clamp(y, 76, this.logicalHeight - 28)
    } : null;
  }

  setTouchFire(active) {
    this.touchFire = Boolean(active);
  }

  start() {
    if (this.running || this.state === GAME_STATES.DESTROYED) return;
    this.resize(true);
    this.running = true;
    this.startedAt = performance.now();
    this.autoPauseArmedAt = this.startedAt + 900;
    this.last = this.startedAt;
    this.transition(GAME_STATES.STARTING);
    this.beginWave(1);
    this.draw();
    this.emitHud();
    this.raf = requestAnimationFrame((time) => this.loop(time));
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.keys.clear();
    this.setTouchVector(0, 0);
    this.pointerTarget = null;
    this.touchFire = false;
  }

  destroy() {
    if (this.state === GAME_STATES.DESTROYED) return;
    this.stop();
    this.resizeObserver.disconnect();
    this.abortController.abort();
    this.transition(GAME_STATES.DESTROYED);
    if (globalThis.__COSMIC_EXPLORER_COSMIC_ENGINE__ === this) delete globalThis.__COSMIC_EXPLORER_COSMIC_ENGINE__;
  }

  transition(nextState, detail = {}) {
    this.state = nextState;
    this.onState?.({ state: nextState, wave: this.currentWave, totalWaves: this.totalWaves, countdown: this.countdown, ...detail });
  }

  emitAudio(eventName, detail = {}) {
    this.onAudio?.(eventName, {
      levelId:this.levelId,
      difficulty:this.difficultyId,
      wave:this.currentWave,
      boss:this.currentWave === this.totalWaves,
      ...detail
    });
  }

  pause(reason = 'manual') {
    if (!this.running || ![GAME_STATES.PLAYING, GAME_STATES.WAVE_COMPLETE, GAME_STATES.WAVE_COUNTDOWN].includes(this.state)) return false;
    this.stateBeforePause = this.state;
    this.transition(GAME_STATES.PAUSED, { reason });
    this.emitAudio('pause', { reason });
    this.keys.clear();
    this.onPause?.(true);
    this.draw();
    return true;
  }

  resume() {
    if (!this.running || this.state !== GAME_STATES.PAUSED) return false;
    this.last = performance.now();
    this.transition(this.stateBeforePause || GAME_STATES.PLAYING);
    this.emitAudio('resume');
    this.onPause?.(false);
    return true;
  }

  togglePause() {
    return this.state === GAME_STATES.PAUSED ? this.resume() : this.pause('manual');
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(Math.max((now - this.last) / 1000, 0), 0.05);
    this.last = now;
    if (this.state !== GAME_STATES.PAUSED) this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame((time) => this.loop(time));
  }

  update(dt) {
    if ([GAME_STATES.LEVEL_COMPLETE, GAME_STATES.GAME_OVER, GAME_STATES.DESTROYED].includes(this.state)) return;
    this.time += dt;
    this.updateStars(dt);
    this.updatePlayer(dt);
    this.updateParticles(dt);

    if (this.state === GAME_STATES.PLAYING) {
      this.updateCombat(dt);
      if (this.running && this.waveStarted && this.enemies.length === 0) this.completeCurrentWave();
    } else if (this.state === GAME_STATES.WAVE_COMPLETE) {
      this.stateTimer -= dt;
      this.updatePlayerBullets(dt, false);
      if (this.stateTimer <= 0) {
        this.countdown = 5;
        this.lastAudioCountdown = 6;
        this.stateTimer = 5;
        this.transition(GAME_STATES.WAVE_COUNTDOWN);
      }
    } else if (this.state === GAME_STATES.WAVE_COUNTDOWN) {
      this.stateTimer -= dt;
      this.countdown = Math.max(0, Math.ceil(this.stateTimer));
      if (this.countdown > 0 && this.countdown !== this.lastAudioCountdown) {
        this.lastAudioCountdown = this.countdown;
        this.emitAudio('countdown', { count:this.countdown });
      }
      this.updatePlayerBullets(dt, false);
      this.onState?.({ state: this.state, wave: this.currentWave, totalWaves: this.totalWaves, countdown: this.countdown });
      if (this.stateTimer <= 0) this.beginWave(this.currentWave + 1);
    }

    this.emitHud();
  }

  updateStars(dt) {
    const wind = this.levelId === 'neptune' ? 45 : 0;
    for (const star of this.stars) {
      star.y += star.speed * dt;
      star.x += wind * dt;
      if (star.y > this.logicalHeight + 4) star.y = -4;
      if (star.x > this.logicalWidth + 4) star.x = -4;
    }
  }

  updatePlayer(dt) {
    this.player.cooldown = Math.max(0, this.player.cooldown - dt);
    this.player.invulnerable = Math.max(0, this.player.invulnerable - dt);
    this.player.slowTimer = Math.max(0, this.player.slowTimer - dt);
    if (this.state === GAME_STATES.PAUSED) return;

    let x = (this.keys.has('ArrowRight') || this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('ArrowLeft') || this.keys.has('KeyA') ? 1 : 0);
    let y = (this.keys.has('ArrowDown') || this.keys.has('KeyS') ? 1 : 0) - (this.keys.has('ArrowUp') || this.keys.has('KeyW') ? 1 : 0);
    x += this.touchVector.x;
    y += this.touchVector.y;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }

    const speed = this.player.speed * (this.player.slowTimer > 0 ? 0.56 : 1);
    if (this.pointerTarget) {
      this.player.x += (this.pointerTarget.x - this.player.x) * Math.min(1, dt * 12);
      this.player.y += (this.pointerTarget.y - this.player.y) * Math.min(1, dt * 12);
    } else {
      this.player.x += x * speed * dt;
      this.player.y += y * speed * dt;
    }
    this.player.x += this.player.pullX * dt;
    this.player.y += this.player.pullY * dt;
    this.player.pullX *= Math.pow(0.03, dt);
    this.player.pullY *= Math.pow(0.03, dt);

    this.player.x = clamp(this.player.x, 24, this.logicalWidth - 24);
    this.player.y = clamp(this.player.y, 82, this.logicalHeight - 28);

    if ((this.keys.has('Space') || this.touchFire) && this.state === GAME_STATES.PLAYING) this.fire();
  }

  updateParticles(dt) {
    for (const particle of this.particles) {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  updateCombat(dt) {
    this.updatePlayerBullets(dt, false);
    this.updateEnemyProjectiles(dt);
    this.updateHazards(dt);
    this.updateWaveEvent(dt);

    for (const enemy of this.enemies) {
      enemy.t += dt;
      if (enemy.activeDelay > 0) {
        enemy.activeDelay -= dt;
        continue;
      }
      enemy.active = true;
      this.updateEnemyMovement(enemy, dt);
      this.updateEnemyAbility(enemy, dt);
      this.updateEnemyWeapon(enemy, dt);
    }

    this.collisions();
  }

  updateEnemyAbility(enemy, dt) {
    if (enemy.config.special === 'healer') {
      enemy.abilityTimer -= dt;
      if (enemy.abilityTimer <= 0) {
        const target = this.enemies.find((candidate) => candidate !== enemy && !candidate.dead && candidate.hp < candidate.maxHp);
        if (target) target.hp = Math.min(target.maxHp, target.hp + 1);
        enemy.abilityTimer = 2.2;
      }
    }
    if (enemy.config.special === 'cloak') {
      enemy.alpha = 0.3 + (Math.sin(enemy.t * 2.4) + 1) * 0.35;
    }
    if (enemy.config.special === 'shield') {
      enemy.shield = Math.max(0, enemy.shield || 0);
    }
  }

  updateEnemyWeapon(enemy, dt) {
    if (!enemy.active || enemy.y < 25) return;
    if (enemy.telegraph > 0) {
      enemy.telegraph -= dt;
      if (enemy.telegraph <= 0) {
        this.fireEnemyWeapon(enemy, enemy.pendingWeapon);
        if (enemy.pendingWeapon && enemy.pendingWeapon !== 'none') this.emitAudio('enemy-shot', { weapon:enemy.pendingWeapon, boss:enemy.boss });
        enemy.pendingWeapon = null;
      }
      return;
    }

    enemy.fire -= dt;
    if (enemy.fire > 0) return;
    const weapon = this.selectEnemyWeapon(enemy);
    enemy.pendingWeapon = weapon;
    enemy.telegraph = DANGEROUS_PROJECTILES.has(weapon) ? 0.72 : enemy.boss ? 0.4 : 0.24;
    const baseRate = enemy.boss ? 1.05 : enemy.config.fireRate;
    enemy.fire = Math.max(0.42, baseRate * this.difficulty.fireRate * (0.82 + Math.random() * 0.35));
  }

  selectEnemyWeapon(enemy) {
    if (!enemy.boss) return enemy.config.weapon;
    const ratio = enemy.hp / enemy.maxHp;
    let phaseIndex = 0;
    for (let index = 0; index < enemy.config.phases.length; index += 1) {
      if (ratio <= enemy.config.phases[index].threshold) phaseIndex = index;
    }
    if (this.difficulty.bossPhaseBonus && ratio < 0.22) phaseIndex = enemy.config.phases.length;
    if (phaseIndex !== this.bossPhase) {
      this.bossPhase = phaseIndex;
      this.transition(GAME_STATES.PLAYING, { announcement: `BOSS PHASE ${phaseIndex + 1}` });
      this.emitAudio('boss-phase', { phase:phaseIndex + 1 });
    }
    const phase = enemy.config.phases[Math.min(phaseIndex, enemy.config.phases.length - 1)];
    const weapons = phase.weapons;
    enemy.weaponCycle = (enemy.weaponCycle || 0) + 1;
    if (phaseIndex >= enemy.config.phases.length && enemy.config.hardWeapon) return enemy.config.hardWeapon;
    if (this.difficultyId === 'hard' && enemy.weaponCycle % 4 === 0 && enemy.config.hardWeapon) return enemy.config.hardWeapon;
    return weapons[enemy.weaponCycle % weapons.length];
  }

  updateEnemyMovement(enemy, dt) {
    const movement = enemy.movement;
    const speed = enemy.config.speed * this.difficulty.speed;
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const player = this.player;

    if (enemy.entryProgress < 1) {
      enemy.entryProgress = Math.min(1, enemy.entryProgress + dt * (0.85 + speed * 0.35));
      const eased = 1 - Math.pow(1 - enemy.entryProgress, 3);
      enemy.x = lerp(enemy.spawnX, enemy.baseX, eased);
      enemy.y = lerp(enemy.spawnY, enemy.baseY, eased);
      return;
    }

    switch (movement) {
      case 'direct': case 'march': case 'advance': case 'grid':
        enemy.y += (9 + this.currentWave * 1.4) * speed * dt;
        enemy.x = enemy.baseX + Math.sin(enemy.t * 1.1 + enemy.phase) * 24;
        break;
      case 'dive': case 'charge':
        if (!enemy.diveTarget) enemy.diveTarget = { x: player.x, y: height + 80 };
        enemy.x += (enemy.diveTarget.x - enemy.x) * dt * 1.8 * speed;
        enemy.y += 220 * speed * dt;
        if (enemy.y > height + 50) this.resetEnemyPass(enemy, -50);
        break;
      case 'sine': case 'wave': case 'sine-row':
        enemy.x = enemy.baseX + Math.sin(enemy.t * (movement === 'wave' ? 2.2 : 1.25) + enemy.phase) * (movement === 'wave' ? 100 : 62);
        enemy.y = enemy.baseY + Math.sin(enemy.t * 1.5 + enemy.phase) * 18 + enemy.t * 4;
        break;
      case 'float':
        enemy.x = enemy.baseX + Math.sin(enemy.t * .8 + enemy.phase) * 44;
        enemy.y = enemy.baseY + Math.sin(enemy.t * 1.15 + enemy.phase) * 26;
        break;
      case 'hover': case 'strafe': case 'edge-strafe':
        enemy.x = clamp(enemy.baseX + Math.sin(enemy.t * (movement === 'edge-strafe' ? 2.1 : 1.45) + enemy.phase) * width * .28, 35, width - 35);
        enemy.y = enemy.baseY + Math.sin(enemy.t * .8 + enemy.phase) * 15;
        break;
      case 'cloak': case 'teleport':
        enemy.x = enemy.baseX + Math.sin(enemy.t * 1.35 + enemy.phase) * 115;
        enemy.y = enemy.baseY + Math.cos(enemy.t * 1.7 + enemy.phase) * 26;
        if (movement === 'teleport' && enemy.t - enemy.lastTeleport > 2.7) {
          enemy.baseX = 70 + Math.random() * (width - 140);
          enemy.lastTeleport = enemy.t;
          this.burst(enemy.x, enemy.y, 8);
        }
        break;
      case 'intercept': case 'flank': case 'pass-return': case 'ambush-return': case 'boomerang':
        this.updatePassMovement(enemy, dt, movement, speed);
        break;
      case 'orbit': case 'circle': case 'orbit-pairs': case 'ring-lock':
        enemy.orbitAngle += dt * (0.65 + speed * .45) * enemy.orbitDirection;
        enemy.x = enemy.orbitCenterX + Math.cos(enemy.orbitAngle) * enemy.orbitRadius;
        enemy.y = enemy.orbitCenterY + Math.sin(enemy.orbitAngle) * enemy.orbitRadius * .38;
        break;
      case 'waypoints': case 'escort': case 'hunt': case 'chase-x':
        if (movement === 'chase-x' || movement === 'hunt') enemy.targetX = player.x;
        enemy.x += (enemy.targetX - enemy.x) * dt * (movement === 'hunt' ? 1.5 : .85);
        enemy.y += (enemy.targetY - enemy.y) * dt * .8;
        if (Math.abs(enemy.x - enemy.targetX) < 20) enemy.targetX = 70 + Math.random() * (width - 140);
        break;
      case 'turbulent': case 'zigzag': case 'vortex':
        enemy.x = enemy.baseX + Math.sin(enemy.t * (movement === 'zigzag' ? 4 : 1.8) + enemy.phase) * (movement === 'vortex' ? 145 : 85);
        enemy.y = enemy.baseY + Math.cos(enemy.t * 2.3 + enemy.phase) * (movement === 'turbulent' ? 42 : 24);
        if (movement === 'vortex') {
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const distance = Math.max(120, Math.hypot(dx, dy));
          player.pullX += dx / distance * 11 * dt;
          player.pullY += dy / distance * 8 * dt;
        }
        break;
      case 'diagonal': case 'tilted': case 'tilted-wave': case 'lateral-random': case 'rotate-axis':
        enemy.x = enemy.baseX + Math.sin(enemy.t * (movement === 'lateral-random' ? 2.8 : 1.35) + enemy.phase) * (movement === 'lateral-random' ? 130 : 72);
        enemy.y = enemy.baseY + Math.sin(enemy.t * .9 + enemy.phase) * 26 + (movement === 'diagonal' ? enemy.t * 5 : 0);
        enemy.rotation = enemy.t * (movement === 'rotate-axis' ? 1.8 : .45) + .55;
        break;
      case 'sweep':
        enemy.x = clamp(enemy.baseX + Math.sin(enemy.t * .8 + enemy.phase) * width * .38, 45, width - 45);
        enemy.y = enemy.baseY + Math.sin(enemy.t * 1.4) * 18;
        break;
      case 'boss-fortress':
        enemy.x = width / 2 + Math.sin(enemy.t * .55) * width * .22;
        enemy.y = 108 + Math.sin(enemy.t * 1.1) * 12;
        break;
      case 'boss-cloud':
        enemy.x = width / 2 + Math.sin(enemy.t * .75) * width * .31;
        enemy.y = 112 + Math.sin(enemy.t * 1.7) * 28;
        enemy.alpha = .75 + Math.sin(enemy.t * 2) * .18;
        break;
      case 'boss-orbit':
        enemy.x = width / 2 + Math.cos(enemy.t * .62) * width * .3;
        enemy.y = 125 + Math.sin(enemy.t * 1.2) * 34;
        enemy.rotation = enemy.t * .45;
        break;
      case 'boss-tank':
        enemy.x += (player.x - enemy.x) * dt * .25;
        enemy.y = 118 + Math.sin(enemy.t * .8) * 9;
        break;
      case 'boss-storm':
        enemy.x = width / 2 + Math.sin(enemy.t * .95) * width * .34;
        enemy.y = 130 + Math.cos(enemy.t * 1.6) * 38;
        player.pullX += Math.sin(enemy.t * 2) * 4 * dt;
        break;
      case 'boss-ring':
        enemy.x = width / 2 + Math.cos(enemy.t * .62) * width * .27;
        enemy.y = 120 + Math.sin(enemy.t * .62) * 28;
        enemy.rotation = enemy.t * 1.1;
        break;
      case 'boss-axis':
        enemy.x = width / 2 + Math.sin(enemy.t * 1.15) * width * .3;
        enemy.y = 122 + Math.sin(enemy.t * 2.15) * 30;
        enemy.rotation = enemy.t * 1.5;
        if (Math.floor(enemy.t) % 4 === 0 && enemy.t - enemy.lastTeleport > 2.9) {
          enemy.x = 100 + Math.random() * (width - 200);
          enemy.lastTeleport = enemy.t;
        }
        break;
      case 'boss-hunter':
        if (!enemy.dashTimer) enemy.dashTimer = 2.4;
        enemy.dashTimer -= dt;
        if (enemy.dashTimer <= 0) {
          enemy.targetX = Math.random() > .5 ? 70 : width - 70;
          enemy.targetY = 90 + Math.random() * 160;
          enemy.dashTimer = 1.5;
        }
        enemy.x += (enemy.targetX - enemy.x) * dt * 2.7;
        enemy.y += (enemy.targetY - enemy.y) * dt * 2.2;
        break;
      default:
        enemy.x = enemy.baseX + Math.sin(enemy.t + enemy.phase) * 45;
    }

    enemy.x = clamp(enemy.x, -enemy.w, width + enemy.w);
    if (!enemy.boss && enemy.y > height + 80) this.resetEnemyPass(enemy, -60);
  }

  updatePassMovement(enemy, dt, movement, speed) {
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    const direction = enemy.passDirection;
    const horizontalSpeed = (movement === 'pass-return' || movement === 'ambush-return' ? 290 : 220) * speed;
    enemy.x += direction * horizontalSpeed * dt;
    enemy.y += Math.sin(enemy.t * 3 + enemy.phase) * 55 * dt + (movement === 'flank' ? 32 : 12) * dt;
    if (movement === 'boomerang') enemy.y = enemy.baseY + Math.sin(enemy.t * 1.7 + enemy.phase) * 90;
    if ((direction > 0 && enemy.x > width + 70) || (direction < 0 && enemy.x < -70)) {
      enemy.passDirection *= -1;
      enemy.y = clamp(enemy.y + 60, 90, height * .62);
      if (movement === 'ambush-return') enemy.baseY = 100 + Math.random() * height * .35;
    }
  }

  resetEnemyPass(enemy, y) {
    enemy.y = y;
    enemy.x = clamp(60 + Math.random() * (this.logicalWidth - 120), 35, this.logicalWidth - 35);
    enemy.baseX = enemy.x;
    enemy.diveTarget = null;
  }

  updateEnemyProjectiles(dt) {
    const additions = [];
    for (const bullet of this.enemyBullets) {
      bullet.age += dt;
      bullet.life -= dt;
      if (bullet.curve) {
        const angle = Math.atan2(bullet.vy, bullet.vx) + bullet.curve * dt;
        const speed = Math.hypot(bullet.vx, bullet.vy);
        bullet.vx = Math.cos(angle) * speed;
        bullet.vy = Math.sin(angle) * speed;
      }
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.type === 'mine') {
        bullet.vx *= Math.pow(.08, dt);
        bullet.vy *= Math.pow(.08, dt);
      }
      if (bullet.type === 'split' && !bullet.split && bullet.age > .7) {
        bullet.split = true;
        for (const offset of [-.55,.55]) {
          const angle = Math.atan2(bullet.vy, bullet.vx) + offset;
          additions.push(this.makeEnemyProjectile(bullet.x, bullet.y, angle, Math.hypot(bullet.vx, bullet.vy) * .92, 'shard'));
        }
        bullet.dead = true;
      }
    }
    this.enemyBullets.push(...additions);
    this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.dead && bullet.life > 0 && bullet.x > -100 && bullet.x < this.logicalWidth + 100 && bullet.y > -120 && bullet.y < this.logicalHeight + 120);
  }

  updateHazards(dt) {
    for (const hazard of this.hazards) {
      hazard.age += dt;
      hazard.life -= dt;
      hazard.x += (hazard.vx || 0) * dt;
      hazard.y += (hazard.vy || 0) * dt;
      if (hazard.warning > 0) {
        hazard.warning -= dt;
        continue;
      }
      const dx = this.player.x - hazard.x;
      const dy = this.player.y - hazard.y;
      if (!hazard.hit && Math.hypot(dx, dy) < hazard.radius + 14) {
        if (hazard.slow) this.player.slowTimer = Math.max(this.player.slowTimer, hazard.slow);
        if (hazard.pull) {
          this.player.pullX += -dx * hazard.pull;
          this.player.pullY += -dy * hazard.pull;
        }
        if (hazard.damage) {
          hazard.hit = true;
          this.damagePlayer();
        }
      }
    }
    this.hazards = this.hazards.filter((hazard) => hazard.life > 0 && hazard.y < this.logicalHeight + 100);
  }

  updateWaveEvent(dt) {
    if (!this.waveEvent) return;
    this.eventTimer -= dt;
    if (this.eventTimer > 0) return;
    const event = this.waveEvent;
    const width = this.logicalWidth;
    const height = this.logicalHeight;
    if (event === 'meteor') {
      this.hazards.push({ type:'meteor', x:30 + Math.random()*(width-60), y:-40, radius:18, vx:(Math.random()-.5)*80, vy:250, life:4, age:0, warning:.55, damage:true });
      this.eventTimer = 1.15;
    } else if (event === 'cloud' || event === 'acid-rain') {
      this.hazards.push({ type:'acid', x:60 + Math.random()*(width-120), y:height*.35+Math.random()*height*.45, radius:45, life:4.5, age:0, warning:.8, slow:1.2, damage:event==='acid-rain' });
      this.eventTimer = 2.4;
    } else if (event === 'satellite') {
      this.hazards.push({ type:'satellite', x:Math.random()> .5 ? -30 : width+30, y:100+Math.random()*height*.45, radius:16, vx:Math.random()>.5?170:-170, vy:25, life:7, age:0, warning:.4, damage:true });
      this.eventTimer = 2;
    } else if (event === 'dust') {
      this.hazards.push({ type:'dust', x:width/2, y:height*.55, radius:width*.65, life:2.2, age:0, warning:.25, slow:.8 });
      this.eventTimer = 4.5;
    } else if (event === 'vortex') {
      this.hazards.push({ type:'vortex', x:80+Math.random()*(width-160), y:120+Math.random()*height*.35, radius:70, life:4, age:0, warning:.8, pull:.016 });
      this.eventTimer = 3.4;
    } else if (event === 'ring-debris') {
      this.hazards.push({ type:'debris', x:Math.random()>.5?-30:width+30, y:100+Math.random()*height*.55, radius:22, vx:Math.random()>.5?210:-210, vy:0, life:6, age:0, warning:.6, damage:true });
      this.eventTimer = 1.7;
    } else if (event === 'freeze-zone') {
      this.hazards.push({ type:'freeze', x:70+Math.random()*(width-140), y:height*.45+Math.random()*height*.35, radius:58, life:4.5, age:0, warning:.8, slow:1.8 });
      this.eventTimer = 3.1;
    } else if (event === 'dark-wind') {
      this.hazards.push({ type:'wind', x:width/2, y:height/2, radius:Math.max(width,height), life:1.2, age:0, warning:.25, pull:.025 });
      this.player.pullX += (Math.random()>.5?1:-1)*180;
      this.eventTimer = 3.2;
    }
  }

  updatePlayerBullets(dt, allowCollisions) {
    for (const bullet of this.bullets) bullet.y -= bullet.v * dt;
    this.bullets = this.bullets.filter((bullet) => bullet.y > -30 && !bullet.dead);
    if (allowCollisions) this.collisions();
  }

  fire() {
    if (this.player.cooldown > 0 || this.state !== GAME_STATES.PLAYING) return false;
    this.player.cooldown = 0.15;
    this.shots += 1;
    this.bullets.push({ x:this.player.x, y:this.player.y - 28, w:5, h:18, v:780 });
    this.emitAudio('player-shot');
    return true;
  }

  beginWave(number) {
    if (!this.running && number !== 1) return;
    this.currentWave = number;
    this.waveStarted = true;
    this.countdown = 0;
    this.stateTimer = 0;
    this.enemyBullets.length = 0;
    this.bullets.length = 0;
    this.hazards.length = 0;
    this.waveEvent = null;
    this.eventTimer = 1.4;
    if (number <= this.level.waves.length) this.spawnWave(number);
    else this.spawnBoss();
    this.emitAudio(number === this.totalWaves ? 'boss-wave' : 'wave-start', { number, boss:number === this.totalWaves });
    this.transition(GAME_STATES.PLAYING, {
      announcement: number === this.totalWaves ? this.level.boss.name : this.level.waves[number - 1].name
    });
  }

  spawnWave(waveNumber) {
    const waveConfig = this.level.waves[waveNumber - 1];
    const hardFormations = ['split-flanks','spiral','ambush','double-ring','x-strike','tilted-ring','crossfire'];
    const formation = this.difficultyId === 'hard'
      ? (waveConfig.hardFormation || hardFormations[(this.level.order + waveNumber) % hardFormations.length])
      : waveConfig.formation;
    const groups = waveConfig.groups.map((entry) => ({ ...entry }));
    if (this.difficulty.extraEnemies > 0) {
      const target = groups.find((entry) => entry.type === 'fast' || entry.type === 'special') || groups[0];
      target.count += this.difficulty.extraEnemies;
      if (waveNumber >= 3) groups.push({ type:'special', count:1, elite:true });
    }
    const total = groups.reduce((sum, entry) => sum + entry.count, 0) + (waveConfig.miniboss ? 1 : 0);
    const positions = this.makeFormationPositions(total, formation);
    let index = 0;
    for (const group of groups) {
      for (let count = 0; count < group.count; count += 1) {
        this.enemies.push(this.createEnemy(group.type, positions[index], index, {
          elite: Boolean(group.elite) || (this.difficultyId === 'hard' && Math.random() < this.difficulty.eliteChance),
          movement: group.movement
        }));
        index += 1;
      }
    }
    if (waveConfig.miniboss) {
      const enemy = this.createEnemy(waveConfig.miniboss, positions[index] || positions[0], index, { elite:true, miniboss:true });
      enemy.hp = Math.ceil(enemy.hp * 2.2);
      enemy.maxHp = enemy.hp;
      enemy.w *= 1.35;
      enemy.h *= 1.35;
      enemy.scoreValue *= 2.5;
      this.enemies.push(enemy);
    }
    this.waveEvent = waveConfig.event || null;
  }

  spawnBoss() {
    const config = this.level.boss;
    const hp = Math.ceil(config.hp * this.difficulty.hp);
    this.enemies.push({
      x:this.logicalWidth / 2,
      y:-130,
      spawnX:this.logicalWidth / 2,
      spawnY:-130,
      baseX:this.logicalWidth / 2,
      baseY:118,
      targetX:this.logicalWidth / 2,
      targetY:118,
      w:config.size[0],
      h:config.size[1],
      hp,
      maxHp:hp,
      t:0,
      phase:0,
      activeDelay:0,
      entryProgress:0,
      active:true,
      boss:true,
      miniboss:false,
      elite:true,
      config,
      movement:config.movement,
      fire:.9,
      telegraph:0,
      pendingWeapon:null,
      weaponCycle:0,
      scoreValue:5000,
      rotation:0,
      lastTeleport:-10,
      dashTimer:2,
      alpha:1
    });
    this.waveEvent = this.level.event;
    this.eventTimer = 2.5;
  }

  createEnemy(type, position, index, options = {}) {
    const config = this.level.enemies[type] || this.level.enemies.basic;
    const elite = Boolean(options.elite);
    const hp = Math.max(1, Math.ceil(config.hp * this.difficulty.hp * (elite ? 1.45 : 1)));
    const [w,h] = config.size;
    const movement = options.movement || config.movement;
    return {
      x:position.spawnX,
      y:position.spawnY,
      spawnX:position.spawnX,
      spawnY:position.spawnY,
      baseX:position.x,
      baseY:position.y,
      targetX:position.x,
      targetY:position.y,
      w:w * (elite ? 1.12 : 1),
      h:h * (elite ? 1.12 : 1),
      hp,
      maxHp:hp,
      shield:config.special === 'shield' ? Math.ceil(2 * this.difficulty.hp) : 0,
      t:index * .12,
      phase:index * .73,
      activeDelay:index * .075,
      entryProgress:0,
      active:false,
      boss:false,
      miniboss:Boolean(options.miniboss),
      elite,
      type,
      config,
      movement,
      fire:.9 + Math.random()*1.6,
      telegraph:0,
      pendingWeapon:null,
      scoreValue:config.score * (elite ? 1.6 : 1),
      orbitAngle:index/Math.max(1,10)*TAU,
      orbitRadius:55 + (index%3)*28,
      orbitCenterX:position.x,
      orbitCenterY:position.y,
      orbitDirection:index%2?1:-1,
      passDirection:position.spawnX < 0 ? 1 : -1,
      rotation:0,
      lastTeleport:-10,
      abilityTimer:1.5,
      alpha:1
    };
  }

  makeFormationPositions(count, formation) {
    const width = this.logicalWidth;
    const top = Math.min(160, this.logicalHeight * .2);
    const positions = [];
    const columns = Math.min(8, Math.max(1, Math.ceil(Math.sqrt(count * 1.7))));
    const spacingX = Math.min(105, (width - 140) / Math.max(1, columns - 1));
    const center = width / 2;

    const push = (x, y, spawnX = x, spawnY = -70) => positions.push({ x:clamp(x,45,width-45), y, spawnX, spawnY });

    for (let index = 0; index < count; index += 1) {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const lineX = center - spacingX * (Math.min(columns, count) - 1) / 2 + column * spacingX;
      if (['line','grid','stagger','columns'].includes(formation)) {
        const x = formation === 'stagger' ? lineX + (row%2?spacingX/2:0) : lineX;
        const y = top + row * (formation === 'columns' ? 84 : 66);
        push(x,y,x,-70-row*60-index*8);
      } else if (['v','wedge','spearhead','inclined-v'].includes(formation)) {
        const side = index%2 ? 1 : -1;
        const depth = Math.floor(index/2);
        const tilt = formation === 'inclined-v' ? depth*18 : 0;
        push(center + side*(40+depth*55), top + depth*32 + tilt, center + side*(width*.55), -60-depth*40);
      } else if (['circle','ring','double-ring','tilted-ring'].includes(formation)) {
        const angle = index/count*TAU - Math.PI/2;
        const radius = formation === 'double-ring' ? (index%2?150:85) : 105 + (formation === 'tilted-ring'?35*Math.sin(angle):0);
        push(center+Math.cos(angle)*radius, top+85+Math.sin(angle)*radius*.45, center+Math.cos(angle)*(width*.65), -90);
      } else if (formation === 'spiral') {
        const angle = index*.9;
        const radius = 30+index*16;
        push(center+Math.cos(angle)*radius, top+70+Math.sin(angle)*radius*.45, center+Math.cos(angle)*width*.55, -80-index*18);
      } else if (['split-flanks','ambush','x-strike','boomerang'].includes(formation)) {
        const left = index%2===0;
        const x = left ? 70+(index%4)*48 : width-70-(index%4)*48;
        const y = top+Math.floor(index/2)*44;
        push(x,y,left?-80:width+80,y-30);
      } else if (['diamond','cross'].includes(formation)) {
        const angle = index/count*TAU;
        const radius = 55+Math.floor(index/4)*55;
        const x = center + (formation==='diamond'?Math.cos(angle):Math.sign(Math.cos(angle)))*radius;
        const y = top+70 + (formation==='diamond'?Math.sin(angle):Math.sign(Math.sin(angle)))*radius*.55;
        push(x,y,x,-80-index*12);
      } else if (['orbit-pairs','escort'].includes(formation)) {
        const pair = Math.floor(index/2);
        const side = index%2?1:-1;
        push(center+side*(55+pair*42), top+pair*38, center+side*width*.6,-70-pair*25);
      } else if (['diagonal','zigzag','turbulence','waves','sine-row','scatter'].includes(formation)) {
        const x = 60+(index/(Math.max(1,count-1)))*(width-120);
        const y = top+(index%3)*55+(formation==='diagonal'?index*20:0);
        push(x,y,formation==='scatter'?Math.random()*width:x,-80-index*18);
      } else {
        push(lineX,top+row*65,lineX,-70-row*55-index*7);
      }
    }
    return positions;
  }

  fireEnemyWeapon(enemy, weapon) {
    if (!weapon || weapon === 'none') return;
    const speed = (enemy.boss ? 270 : 220) * this.difficulty.bulletSpeed;
    const aimed = normalize(this.player.x - enemy.x, this.player.y - enemy.y);
    const aimedAngle = Math.atan2(aimed.y, aimed.x);
    const downward = Math.PI / 2;
    const add = (angle, multiplier = 1, type = weapon, options = {}) => {
      this.enemyBullets.push({ ...this.makeEnemyProjectile(enemy.x, enemy.y + enemy.h*.32, angle, speed*multiplier, type), ...options });
    };

    switch (weapon) {
      case 'straight': add(downward,1,'straight'); break;
      case 'straight-fast': add(downward,1.45,'straight-fast'); break;
      case 'aimed': add(aimedAngle,1,'aimed'); break;
      case 'aimed-fast': add(aimedAngle,1.45,'aimed-fast'); break;
      case 'burst':
        for (const offset of [-.13,0,.13]) add(aimedAngle+offset,1.05,'burst');
        break;
      case 'fan': case 'spread': case 'spread-fast':
        for (const offset of [-.62,-.31,0,.31,.62]) add(downward+offset,weapon==='spread-fast'?1.35:.92,weapon);
        break;
      case 'ring':
        for (let index=0; index<12; index+=1) add(index/12*TAU, .82, 'ring');
        break;
      case 'arc':
        for (const curve of [-1,1]) add(downward+curve*.32,1,'arc',{curve:curve*1.1});
        break;
      case 'electric':
        for (const offset of [-.24,.24]) add(aimedAngle+offset,1.3,'electric',{curve:-offset*.8});
        break;
      case 'corrosive': add(aimedAngle,.68,'corrosive',{slow:1.4,life:6,w:16,h:16}); break;
      case 'mine': add(downward,.45,'mine',{life:7,w:20,h:20}); break;
      case 'orbit-shot':
        for (const curve of [-1,1]) add(downward+curve*.6,.9,'orbit-shot',{curve:curve*1.5});
        break;
      case 'split': add(aimedAngle,.9,'split',{life:5,w:13,h:13}); break;
      case 'laser': add(aimedAngle,2.3,'laser',{w:10,h:38,life:2.4}); break;
      case 'gust':
        for (const offset of [-.4,0,.4]) add(aimedAngle+offset,.75,'gust',{pull:110,w:18,h:18});
        break;
      case 'meteor':
        this.hazards.push({type:'meteor',x:this.player.x,y:-40,radius:24,vx:0,vy:300,life:4,age:0,warning:.7,damage:true});
        break;
      case 'satellite':
        for (const side of [-1,1]) this.hazards.push({type:'satellite',x:enemy.x+side*80,y:enemy.y,radius:17,vx:side*130,vy:110,life:5,age:0,warning:.5,damage:true});
        break;
      case 'spiral':
        enemy.spiralAngle = (enemy.spiralAngle || 0) + .55;
        for (let index=0; index<4; index+=1) add(enemy.spiralAngle+index*TAU/4,1,'spiral',{curve:.25});
        break;
      case 'lightning-wall': case 'ice-wall': case 'rotating-wall':
        for (let index=0; index<7; index+=1) {
          const x = 70 + index*(this.logicalWidth-140)/6;
          const gap = Math.abs(x-this.player.x)<75;
          if (!gap) this.enemyBullets.push({ ...this.makeEnemyProjectile(x,-20,downward,speed*1.25,weapon), w:14,h:38,life:4 });
        }
        break;
      case 'teleport-burst':
        enemy.x = 80+Math.random()*(this.logicalWidth-160);
        for (const offset of [-.35,0,.35]) add(aimedAngle+offset,1.25,'teleport-burst');
        break;
      case 'cloak-burst':
        enemy.alpha=.25;
        for (let index=0; index<8; index+=1) add(index/8*TAU,1,'cloak-burst');
        break;
      case 'dash-barrage':
        for (const offset of [-.5,-.25,0,.25,.5]) add(aimedAngle+offset,1.55,'dash-barrage');
        break;
      default: add(downward,1,'straight');
    }
  }

  makeEnemyProjectile(x, y, angle, speed, type) {
    return { x,y,w:8,h:14,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,type,life:5,age:0,curve:0,slow:0,pull:0,damage:1,dead:false };
  }

  collisions() {
    for (const bullet of this.bullets) {
      if (bullet.dead) continue;
      for (const enemy of this.enemies) {
        if (enemy.dead || !enemy.active || !intersects(bullet, enemy)) continue;
        bullet.dead = true;
        this.hits += 1;
        if (enemy.shield > 0) {
          enemy.shield -= 1;
          this.emitAudio('shield-hit', { enemyType:enemy.type, boss:enemy.boss });
          this.burst(bullet.x, bullet.y, 5);
          break;
        }
        enemy.hp -= 1;
        this.emitAudio('enemy-hit', { enemyType:enemy.type, boss:enemy.boss });
        this.score += enemy.boss ? 80 : 25;
        if (enemy.hp <= 0) this.destroyEnemy(enemy);
        break;
      }
    }

    for (const bullet of this.enemyBullets) {
      if (!bullet.dead && intersects(bullet, this.player)) {
        bullet.dead = true;
        if (bullet.slow || bullet.type === 'freeze' || bullet.type === 'corrosive') this.player.slowTimer = Math.max(this.player.slowTimer, bullet.slow || 1.4);
        if (bullet.pull || bullet.type === 'gust') {
          const direction = normalize(bullet.vx, bullet.vy);
          this.player.pullX += direction.x * (bullet.pull || 90);
          this.player.pullY += direction.y * (bullet.pull || 90);
        }
        this.damagePlayer();
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.dead && enemy.active && intersects(enemy, this.player)) {
        enemy.dead = true;
        this.damagePlayer();
      }
    }

    this.bullets = this.bullets.filter((bullet) => !bullet.dead);
    this.enemyBullets = this.enemyBullets.filter((bullet) => !bullet.dead);
    this.enemies = this.enemies.filter((enemy) => !enemy.dead);
  }

  destroyEnemy(enemy) {
    enemy.dead = true;
    this.destroyed += 1;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const base = enemy.boss ? 5000 : enemy.scoreValue;
    this.score += base * Math.min(5, 1 + this.combo * .08);
    this.burst(enemy.x, enemy.y, enemy.boss ? 42 : enemy.elite ? 18 : 10);
    this.emitAudio(enemy.boss ? 'boss-explode' : 'enemy-explode', { enemyType:enemy.type, elite:enemy.elite, boss:enemy.boss });
    if (enemy.config.special === 'split' || enemy.config.splitOnDeath) {
      for (let index=0; index<2; index+=1) {
        const position = { x:enemy.x+(index?24:-24),y:enemy.y,spawnX:enemy.x,spawnY:enemy.y };
        const child = this.createEnemy('fast',position,index,{ elite:false });
        child.entryProgress=1; child.activeDelay=0; child.active=true; child.hp=1; child.maxHp=1;
        this.enemies.push(child);
      }
    }
  }

  completeCurrentWave() {
    if (this.state !== GAME_STATES.PLAYING || !this.waveStarted) return;
    this.waveStarted = false;
    this.enemyBullets.length = 0;
    this.bullets.length = 0;
    this.hazards.length = 0;
    if (this.currentWave >= this.totalWaves) {
      this.completeLevel();
      return;
    }
    this.stateTimer = .75;
    this.emitAudio('wave-complete');
    this.transition(GAME_STATES.WAVE_COMPLETE);
  }

  damagePlayer() {
    if (this.player.invulnerable > 0 || this.state !== GAME_STATES.PLAYING) return;
    this.lives -= 1;
    this.combo = 0;
    this.player.invulnerable = 1.4;
    this.burst(this.player.x, this.player.y, 20);
    this.emitAudio('player-hit', { lives:this.lives });
    if (this.lives <= 0) this.gameOver();
  }

  burst(x, y, count) {
    for (let index=0; index<count; index+=1) {
      const angle=Math.random()*TAU;
      const speed=50+Math.random()*180;
      this.particles.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.35+Math.random()*.5});
    }
  }

  snapshot() {
    return {
      playerName:this.playerName,
      score:Math.round(this.score * this.difficulty.scoreMultiplier),
      lives:this.lives,
      wave:this.currentWave,
      totalWaves:this.totalWaves,
      waveName:this.currentWave<=this.level.waves.length?this.level.waves[this.currentWave-1]?.name:this.level.boss.name,
      level:this.level.name,
      difficulty:this.difficultyId,
      difficultyLabel:this.difficulty.label,
      multiplier:this.difficulty.scoreMultiplier,
      state:this.state,
      countdown:this.countdown,
      canvasWidth:this.canvas.width,
      canvasHeight:this.canvas.height,
      logicalWidth:this.logicalWidth,
      logicalHeight:this.logicalHeight,
      enemies:this.enemies.length,
      enemyTypes:[...new Set(this.enemies.map((enemy)=>enemy.type||'boss'))],
      bullets:this.bullets.length,
      enemyBullets:this.enemyBullets.length,
      shots:this.shots,
      bossPhase:this.bossPhase+1,
      event:this.waveEvent
    };
  }

  emitHud() {
    this.onHud?.(this.snapshot());
  }

  rank(score, accuracy, lives) {
    const scaled = score / this.difficulty.scoreMultiplier;
    if (scaled > 15000 && accuracy > 70 && lives >= 2) return 'S';
    if (scaled > 9500 && accuracy > 55) return 'A';
    if (scaled > 5000) return 'B';
    return 'C';
  }

  result() {
    const accuracy = this.shots ? Math.round(this.hits / this.shots * 100) : 0;
    const score = Math.round((this.score + this.lives*500 + accuracy*20) * this.difficulty.scoreMultiplier);
    return {
      levelId:this.levelId,
      difficulty:this.difficultyId,
      score,
      enemiesDestroyed:this.destroyed,
      livesRemaining:this.lives,
      accuracy,
      time:Math.round(this.time),
      maxCombo:this.maxCombo,
      rank:this.rank(score,accuracy,this.lives),
      highestWave:this.currentWave,
      totalWaves:this.totalWaves
    };
  }

  completeLevel() {
    if (!this.running) return;
    const result=this.result();
    this.emitAudio('level-complete', result);
    this.transition(GAME_STATES.LEVEL_COMPLETE);
    this.stop();
    this.onFinish?.(result);
  }

  gameOver() {
    if (!this.running) return;
    const result=this.result();
    this.emitAudio('game-over', result);
    this.transition(GAME_STATES.GAME_OVER);
    this.stop();
    this.onGameOver?.(result);
  }

  draw() {
    const context=this.ctx;
    const width=this.logicalWidth;
    const height=this.logicalHeight;
    context.save();
    context.setTransform(this.canvas.width/width,0,0,this.canvas.height/height,0,0);
    context.clearRect(0,0,width,height);
    const gradient=context.createLinearGradient(0,0,0,height);
    gradient.addColorStop(0,this.level.colors[0]);
    gradient.addColorStop(.65,this.level.colors[1]);
    gradient.addColorStop(1,'#02030a');
    context.fillStyle=gradient;
    context.fillRect(0,0,width,height);
    this.drawBackdrop(context,width,height);

    for (const star of this.stars) {
      context.globalAlpha=.35+star.size/3;
      context.fillStyle='#fff';
      context.fillRect(star.x,star.y,star.size,star.size*2);
    }
    context.globalAlpha=1;

    this.drawHazards(context);
    for (const bullet of this.bullets) {
      context.fillStyle='#bffcff';
      context.shadowColor='#55eaff';
      context.shadowBlur=12;
      context.fillRect(bullet.x-2,bullet.y-10,4,20);
    }
    context.shadowBlur=0;
    for (const bullet of this.enemyBullets) this.drawEnemyProjectile(context,bullet);
    for (const enemy of this.enemies) if (enemy.active || enemy.entryProgress>0) this.drawEnemy(context,enemy);
    for (const particle of this.particles) {
      context.globalAlpha=Math.max(0,particle.life);
      context.fillStyle=this.level.colors[2];
      context.fillRect(particle.x,particle.y,3,3);
    }
    context.globalAlpha=1;
    this.drawShip(context);
    context.restore();
  }

  drawBackdrop(context,width,height) {
    context.save();
    context.globalAlpha=.32;
    const x=width*.82;
    if (this.levelId==='saturn') {
      context.strokeStyle=this.level.colors[2]; context.lineWidth=18;
      context.beginPath(); context.ellipse(x,170,190,46,-.22,0,TAU); context.stroke();
      context.fillStyle='#d7c48b'; context.beginPath(); context.arc(x,170,92,0,TAU); context.fill();
    } else if (this.levelId==='jupiter') {
      context.fillStyle=this.level.colors[2]; context.beginPath(); context.ellipse(x,170,175,145,0,0,TAU); context.fill();
      context.fillStyle='#9f3d2d'; context.beginPath(); context.ellipse(x+40,200,45,22,-.2,0,TAU); context.fill();
    } else if (this.levelId==='venus') {
      context.fillStyle='#f59e0b'; context.beginPath(); context.arc(x,155,118,0,TAU); context.fill();
      context.strokeStyle='#fde68a'; context.lineWidth=12;
      for (let i=-2;i<=2;i+=1){context.beginPath();context.arc(x,155,75+i*15,.2,2.7);context.stroke();}
    } else if (this.levelId==='earth') {
      context.fillStyle='#0ea5e9'; context.beginPath(); context.arc(x,155,110,0,TAU); context.fill();
      context.fillStyle='#22c55e'; context.beginPath(); context.ellipse(x-25,145,35,20,.4,0,TAU); context.fill();
    } else if (this.levelId==='uranus') {
      context.fillStyle='#67e8f9'; context.beginPath(); context.arc(x,155,105,0,TAU); context.fill();
      context.strokeStyle='#d9faff';context.lineWidth=8;context.beginPath();context.ellipse(x,155,140,20,1.4,0,TAU);context.stroke();
    } else if (this.levelId==='neptune') {
      context.fillStyle='#2563eb';context.beginPath();context.arc(x,155,112,0,TAU);context.fill();
      context.strokeStyle='#818cf8';context.lineWidth=10;context.beginPath();context.arc(x,155,72,.2,2.8);context.stroke();
    } else {
      context.fillStyle=this.level.colors[2];context.beginPath();context.arc(x,155,112,0,TAU);context.fill();
    }
    if (this.waveEvent==='dust') {
      context.globalAlpha=.12+.08*Math.sin(this.time*2);context.fillStyle='#f97316';context.fillRect(0,0,width,height);
    }
    context.restore();
  }

  drawHazards(context) {
    for (const hazard of this.hazards) {
      context.save();
      const warning=hazard.warning>0;
      context.globalAlpha=warning?.35:clamp(hazard.life/2,0,.75);
      context.strokeStyle=warning?'#fff':this.level.colors[2];
      context.fillStyle=this.level.colors[3];
      context.lineWidth=3;
      context.beginPath();
      if (hazard.type==='meteor'||hazard.type==='debris'||hazard.type==='satellite') {
        context.translate(hazard.x,hazard.y);context.rotate(hazard.age*2);
        context.rect(-hazard.radius,-hazard.radius*.7,hazard.radius*2,hazard.radius*1.4);
      } else {
        context.arc(hazard.x,hazard.y,hazard.radius*(warning?.85:1),0,TAU);
      }
      warning?context.stroke():context.fill();
      context.restore();
    }
  }

  drawEnemyProjectile(context,bullet) {
    context.save();
    context.translate(bullet.x,bullet.y);
    context.fillStyle=this.level.colors[2];
    context.strokeStyle=this.level.colors[3];
    context.shadowColor=this.level.colors[2];
    context.shadowBlur=8;
    if (bullet.type==='laser'||bullet.type.includes('wall')) {
      context.fillRect(-bullet.w/2,-bullet.h/2,bullet.w,bullet.h);
    } else if (bullet.type==='mine') {
      context.rotate(bullet.age*2);context.beginPath();
      for(let i=0;i<8;i+=1){const a=i/8*TAU;context.lineTo(Math.cos(a)*(i%2?7:12),Math.sin(a)*(i%2?7:12));}
      context.closePath();context.fill();
    } else if (bullet.type==='split') {
      context.rotate(bullet.age*3);context.beginPath();context.moveTo(0,-9);context.lineTo(8,7);context.lineTo(-8,7);context.closePath();context.fill();
    } else {
      context.beginPath();context.ellipse(0,0,bullet.w/2,bullet.h/2,0,0,TAU);context.fill();
    }
    context.restore();
  }

  drawShip(context) {
    context.save();
    context.translate(this.player.x,this.player.y);
    context.globalAlpha=this.player.invulnerable>0&&Math.floor(this.player.invulnerable*10)%2?.25:1;
    context.fillStyle='#d9fbff';
    context.beginPath();context.moveTo(0,-25);context.lineTo(18,20);context.lineTo(6,14);context.lineTo(0,25);context.lineTo(-6,14);context.lineTo(-18,20);context.closePath();context.fill();
    context.fillStyle=this.player.slowTimer>0?'#a5f3fc':'#6ee7ff';context.fillRect(-4,-5,8,18);
    context.restore();
  }

  drawEnemy(context,enemy) {
    context.save();
    context.translate(enemy.x,enemy.y);
    context.rotate(enemy.rotation||0);
    context.globalAlpha=enemy.alpha??1;
    if (enemy.telegraph>0) {
      context.shadowColor='#fff';context.shadowBlur=24;context.globalAlpha=.55+.35*Math.sin(enemy.telegraph*25);
    }
    if (enemy.boss) this.drawBossShape(context,enemy);
    else this.drawFamilyShape(context,enemy);
    context.shadowBlur=0;
    if (enemy.elite&&!enemy.boss) {
      context.strokeStyle='#fff';context.lineWidth=2;context.beginPath();context.arc(0,0,Math.max(enemy.w,enemy.h)*.62,0,TAU);context.stroke();
    }
    if (enemy.shield>0) {
      context.strokeStyle='#a5f3fc';context.lineWidth=3;context.globalAlpha=.65;context.beginPath();context.ellipse(0,0,enemy.w*.68,enemy.h*.68,0,0,TAU);context.stroke();
    }
    context.restore();
    if (enemy.boss) this.drawBossBar(context,enemy);
  }

  drawFamilyShape(context,enemy) {
    const role=enemy.config.role;
    const primary=this.level.colors[2];
    const secondary=this.level.colors[1];
    context.fillStyle=role==='tank'?secondary:primary;
    context.strokeStyle=this.level.colors[3];
    context.lineWidth=2.4;
    context.beginPath();

    if (this.levelId==='mercury') {
      if(role==='fast'){context.moveTo(0,18);context.lineTo(-9,-15);context.lineTo(0,-8);context.lineTo(9,-15);context.closePath();}
      else if(role==='tank'){context.rect(-24,-16,48,32);context.moveTo(-30,0);context.lineTo(-24,0);context.moveTo(24,0);context.lineTo(30,0);}
      else if(role==='shooter'){context.moveTo(-20,10);context.lineTo(-13,-13);context.lineTo(0,-7);context.lineTo(13,-13);context.lineTo(20,10);context.lineTo(0,15);context.closePath();}
      else if(role==='special'){context.moveTo(0,-20);context.lineTo(23,4);context.lineTo(8,18);context.lineTo(0,8);context.lineTo(-8,18);context.lineTo(-23,4);context.closePath();}
      else {for(let i=0;i<6;i+=1){const a=i/6*TAU;context.lineTo(Math.cos(a)*(i%2?14:20),Math.sin(a)*(i%2?14:20));}context.closePath();}
    } else if (this.levelId==='venus') {
      if(role==='fast'){context.ellipse(0,0,23,9,0,0,TAU);context.moveTo(-18,0);context.quadraticCurveTo(0,20,18,0);}
      else if(role==='tank'){context.arc(0,0,24,0,TAU);context.moveTo(-25,4);context.bezierCurveTo(-35,20,35,20,25,4);}
      else if(role==='shooter'){context.moveTo(0,-18);context.bezierCurveTo(25,-8,26,16,0,12);context.bezierCurveTo(-26,16,-25,-8,0,-18);}
      else if(role==='special'){context.ellipse(0,0,22,14,0,0,TAU);context.moveTo(-26,-4);context.quadraticCurveTo(0,26,26,-4);}
      else {context.arc(0,0,16,0,TAU);context.moveTo(-22,5);context.quadraticCurveTo(0,20,22,5);}
    } else if (this.levelId==='earth') {
      if(role==='fast'){context.moveTo(0,-14);context.lineTo(24,8);context.lineTo(8,5);context.lineTo(0,14);context.lineTo(-8,5);context.lineTo(-24,8);context.closePath();}
      else if(role==='tank'){context.rect(-20,-20,40,40);context.moveTo(-31,0);context.lineTo(31,0);context.moveTo(0,-31);context.lineTo(0,31);}
      else if(role==='shooter'){context.rect(-24,-10,48,20);context.moveTo(0,-10);context.lineTo(0,-24);}
      else if(role==='special'){context.arc(0,0,15,0,TAU);for(let i=0;i<4;i+=1){const a=i/4*TAU;context.moveTo(Math.cos(a)*15,Math.sin(a)*15);context.lineTo(Math.cos(a)*26,Math.sin(a)*26);}}
      else {context.rect(-15,-15,30,30);}
    } else if (this.levelId==='mars') {
      if(role==='fast'){context.moveTo(0,-15);context.lineTo(27,8);context.lineTo(6,5);context.lineTo(0,13);context.lineTo(-6,5);context.lineTo(-27,8);context.closePath();}
      else if(role==='tank'){context.rect(-28,-15,56,30);context.moveTo(-20,15);context.lineTo(-25,24);context.moveTo(20,15);context.lineTo(25,24);}
      else if(role==='shooter'){context.arc(0,2,17,0,TAU);context.moveTo(0,-15);context.lineTo(0,-28);context.moveTo(-24,12);context.lineTo(24,12);}
      else if(role==='special'){context.moveTo(0,-16);context.lineTo(29,7);context.lineTo(12,3);context.lineTo(4,15);context.lineTo(-4,15);context.lineTo(-12,3);context.lineTo(-29,7);context.closePath();}
      else {context.moveTo(0,-17);context.lineTo(19,12);context.lineTo(6,8);context.lineTo(0,16);context.lineTo(-6,8);context.lineTo(-19,12);context.closePath();}
    } else if (this.levelId==='jupiter') {
      if(role==='fast'){context.moveTo(0,-22);context.bezierCurveTo(16,-8,16,8,0,22);context.bezierCurveTo(-16,8,-16,-8,0,-22);}
      else if(role==='tank'){context.arc(0,0,28,0,TAU);context.moveTo(-30,-8);context.bezierCurveTo(-5,-20,5,20,30,8);}
      else if(role==='shooter'){context.arc(0,0,21,0,TAU);context.moveTo(-28,0);context.lineTo(28,0);context.moveTo(0,-28);context.lineTo(0,28);}
      else if(role==='special'){context.arc(0,0,25,0,TAU);context.moveTo(-14,-6);context.bezierCurveTo(0,-25,14,-6,0,18);context.closePath();}
      else {context.arc(0,0,18,0,TAU);context.moveTo(-22,0);context.bezierCurveTo(-8,-12,8,12,22,0);}
    } else if (this.levelId==='saturn') {
      if(role==='fast'){context.ellipse(0,0,25,7,0,0,TAU);context.moveTo(-30,0);context.lineTo(30,0);}
      else if(role==='tank'){context.rect(-22,-18,44,36);context.ellipse(0,0,35,12,.2,0,TAU);}
      else if(role==='shooter'){context.moveTo(0,-20);context.lineTo(13,-5);context.lineTo(28,0);context.lineTo(13,5);context.lineTo(0,20);context.lineTo(-13,5);context.lineTo(-28,0);context.lineTo(-13,-5);context.closePath();}
      else if(role==='special'){context.arc(0,0,16,0,TAU);context.ellipse(0,0,30,10,-.35,0,TAU);context.ellipse(0,0,24,8,.55,0,TAU);}
      else {context.ellipse(0,0,19,11,0,0,TAU);context.ellipse(0,0,28,6,-.25,0,TAU);}
    } else if (this.levelId==='uranus') {
      if(role==='fast'){context.moveTo(0,-25);context.lineTo(9,0);context.lineTo(0,25);context.lineTo(-9,0);context.closePath();}
      else if(role==='tank'){for(let i=0;i<6;i+=1){const a=i/6*TAU;context.lineTo(Math.cos(a)*27,Math.sin(a)*27);}context.closePath();context.moveTo(0,-27);context.lineTo(0,27);}
      else if(role==='shooter'){context.moveTo(0,-22);context.lineTo(13,-3);context.lineTo(26,18);context.lineTo(4,9);context.lineTo(0,22);context.lineTo(-4,9);context.lineTo(-26,18);context.lineTo(-13,-3);context.closePath();}
      else if(role==='special'){context.moveTo(0,-27);context.lineTo(17,-5);context.lineTo(10,24);context.lineTo(-10,24);context.lineTo(-17,-5);context.closePath();}
      else {context.moveTo(0,-21);context.lineTo(15,0);context.lineTo(0,21);context.lineTo(-15,0);context.closePath();}
    } else {
      if(role==='fast'){context.moveTo(0,-25);context.lineTo(12,-5);context.lineTo(5,20);context.lineTo(0,12);context.lineTo(-5,20);context.lineTo(-12,-5);context.closePath();}
      else if(role==='tank'){context.moveTo(-32,-12);context.lineTo(22,-20);context.lineTo(34,0);context.lineTo(22,20);context.lineTo(-32,12);context.closePath();}
      else if(role==='shooter'){context.moveTo(-28,0);context.lineTo(-8,-14);context.lineTo(26,-8);context.lineTo(12,0);context.lineTo(26,8);context.lineTo(-8,14);context.closePath();}
      else if(role==='special'){context.moveTo(0,-18);context.lineTo(30,-4);context.lineTo(12,7);context.lineTo(25,18);context.lineTo(0,11);context.lineTo(-25,18);context.lineTo(-12,7);context.lineTo(-30,-4);context.closePath();}
      else {context.moveTo(0,-18);context.lineTo(24,0);context.lineTo(0,18);context.lineTo(-24,0);context.closePath();}
    }
    context.fill();context.stroke();
  }

  drawBossShape(context,enemy) {
    const c2=this.level.colors[2], c3=this.level.colors[3];
    context.fillStyle=c2;context.strokeStyle=c3;context.lineWidth=5;
    context.beginPath();
    if(this.levelId==='mercury'){
      for(let i=0;i<10;i+=1){const a=i/10*TAU;const r=i%2?45:75;context.lineTo(Math.cos(a)*r,Math.sin(a)*r*.7);}context.closePath();
      context.rect(-28,-24,56,48);
    } else if(this.levelId==='venus'){
      context.arc(0,0,48,0,TAU);context.moveTo(-85,0);context.bezierCurveTo(-55,-58,55,-58,85,0);context.bezierCurveTo(55,58,-55,58,-85,0);
    } else if(this.levelId==='earth'){
      context.rect(-55,-38,110,76);context.moveTo(-95,0);context.lineTo(95,0);context.moveTo(0,-72);context.lineTo(0,72);context.arc(0,0,32,0,TAU);
    } else if(this.levelId==='mars'){
      context.rect(-75,-36,150,72);context.moveTo(-55,36);context.lineTo(-65,60);context.moveTo(55,36);context.lineTo(65,60);context.moveTo(-45,-36);context.lineTo(-45,-70);context.moveTo(45,-36);context.lineTo(45,-70);
    } else if(this.levelId==='jupiter'){
      context.arc(0,0,68,0,TAU);context.moveTo(-90,-10);context.bezierCurveTo(-35,-65,35,65,90,10);context.moveTo(-45,5);context.bezierCurveTo(-15,-25,15,25,45,-5);
    } else if(this.levelId==='saturn'){
      context.arc(0,0,42,0,TAU);context.ellipse(0,0,104,28,enemy.rotation*.25,0,TAU);context.ellipse(0,0,78,18,-enemy.rotation*.4,0,TAU);
    } else if(this.levelId==='uranus'){
      for(let i=0;i<8;i+=1){const a=i/8*TAU;context.lineTo(Math.cos(a)*(i%2?45:78),Math.sin(a)*(i%2?45:78));}context.closePath();context.moveTo(0,-85);context.lineTo(0,85);
    } else {
      context.moveTo(0,-58);context.lineTo(92,-20);context.lineTo(48,0);context.lineTo(88,38);context.lineTo(20,25);context.lineTo(0,58);context.lineTo(-20,25);context.lineTo(-88,38);context.lineTo(-48,0);context.lineTo(-92,-20);context.closePath();
    }
    context.fill();context.stroke();
    context.fillStyle='#06111c';context.beginPath();context.arc(0,0,18,0,TAU);context.fill();
    context.fillStyle='#fff';context.beginPath();context.arc(0,0,8,0,TAU);context.fill();
  }

  drawBossBar(context,enemy) {
    const width=Math.min(520,this.logicalWidth*.58);
    const x=(this.logicalWidth-width)/2;
    const y=18;
    context.save();
    context.fillStyle='rgba(0,0,0,.58)';context.fillRect(x,y,width,12);
    context.fillStyle=this.level.colors[2];context.fillRect(x,y,width*(enemy.hp/enemy.maxHp),12);
    context.strokeStyle='rgba(255,255,255,.7)';context.strokeRect(x,y,width,12);
    context.fillStyle='#fff';context.font='700 12px monospace';context.textAlign='center';context.fillText(`${enemy.config.name} · PHASE ${this.bossPhase+1}`,this.logicalWidth/2,y+28);
    context.restore();
  }

  getDebugState() {
    return { ...this.snapshot(), running:this.running, player:{...this.player}, state:this.state, levelId:this.levelId, difficulty:this.difficultyId };
  }

  debugDefeatWave() {
    if (this.state !== GAME_STATES.PLAYING) return false;
    for (const enemy of this.enemies) this.destroyEnemy(enemy);
    this.enemies.length = 0;
    return true;
  }
}

export { cosmicDefenderThemes };
