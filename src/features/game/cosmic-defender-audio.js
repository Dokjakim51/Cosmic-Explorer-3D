const STORAGE_KEY = 'cosmic-explorer:cosmic-defender-audio:v1';
const DEFAULT_SETTINGS = Object.freeze({
  master: 0.82,
  music: 0.56,
  sfx: 0.86,
  muted: false,
  musicEnabled: true,
  sfxEnabled: true,
  vibrationEnabled: true
});

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, Number(value)));
const midi = (note) => 440 * (2 ** ((note - 69) / 12));
const normalizeSettings = (candidate = {}) => ({
  master: clamp(candidate.master ?? DEFAULT_SETTINGS.master),
  music: clamp(candidate.music ?? DEFAULT_SETTINGS.music),
  sfx: clamp(candidate.sfx ?? DEFAULT_SETTINGS.sfx),
  muted: typeof candidate.muted === 'boolean' ? candidate.muted : DEFAULT_SETTINGS.muted,
  musicEnabled: typeof candidate.musicEnabled === 'boolean' ? candidate.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
  sfxEnabled: typeof candidate.sfxEnabled === 'boolean' ? candidate.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
  vibrationEnabled: typeof candidate.vibrationEnabled === 'boolean' ? candidate.vibrationEnabled : DEFAULT_SETTINGS.vibrationEnabled
});

const safeStorage = {
  read() {
    try { return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch { return { ...DEFAULT_SETTINGS }; }
  },
  write(settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); }
    catch { /* Audio preferences remain in memory when storage is unavailable. */ }
  }
};

const TRACKS = Object.freeze({
  mercury: { title:'Iron Swarm', bpm:134, lead:'square', bass:'sawtooth', scale:[52,55,57,59,64], leadPattern:[0,null,2,null,3,2,1,null,0,null,4,3,2,null,1,null], bassPattern:[0,0,null,0,1,1,null,1,2,2,null,2,1,null,0,null], accent:[0,4,8,12], filter:1700 },
  venus: { title:'Corrosive Veil', bpm:102, lead:'triangle', bass:'sine', scale:[48,51,55,58,60], leadPattern:[0,null,null,2,null,3,null,1,0,null,4,null,3,null,1,null], bassPattern:[0,null,0,null,1,null,1,null,2,null,1,null,0,null,0,null], accent:[0,6,10,14], filter:1150 },
  earth: { title:'Orbital Resolve', bpm:124, lead:'sawtooth', bass:'triangle', scale:[50,54,57,59,62], leadPattern:[0,null,2,3,4,null,3,2,0,null,2,4,3,null,1,2], bassPattern:[0,0,null,0,2,2,null,2,1,1,null,1,3,null,2,null], accent:[0,4,8,12], filter:2200 },
  mars: { title:'Red Assault', bpm:142, lead:'square', bass:'square', scale:[45,48,52,55,57], leadPattern:[0,0,2,null,3,3,2,null,4,3,2,1,0,null,1,null], bassPattern:[0,0,0,null,1,1,1,null,2,2,2,null,0,null,0,null], accent:[0,2,4,8,10,12], filter:1850 },
  jupiter: { title:'Storm Core', bpm:112, lead:'sawtooth', bass:'sine', scale:[41,44,48,51,53], leadPattern:[0,null,3,2,null,4,3,null,1,null,3,4,2,null,1,null], bassPattern:[0,null,0,0,2,null,2,2,1,null,1,1,3,null,2,null], accent:[0,5,8,13], filter:1350 },
  saturn: { title:'Ring Sovereignty', bpm:118, lead:'triangle', bass:'triangle', scale:[50,53,57,60,62], leadPattern:[0,2,4,null,3,2,1,null,0,1,3,null,4,3,2,null], bassPattern:[0,null,0,null,1,null,1,null,2,null,2,null,3,null,2,null], accent:[0,3,8,11], filter:2450 },
  uranus: { title:'Axial Frost', bpm:108, lead:'sine', bass:'triangle', scale:[51,54,58,61,63], leadPattern:[0,null,4,null,2,3,null,1,0,null,3,null,4,2,null,1], bassPattern:[0,null,null,0,1,null,null,1,2,null,null,2,3,null,1,null], accent:[0,7,8,15], filter:2900 },
  neptune: { title:'Dark Wind Pursuit', bpm:154, lead:'square', bass:'sawtooth', scale:[43,46,50,53,55], leadPattern:[0,2,null,3,4,3,2,null,1,3,null,4,3,2,1,0], bassPattern:[0,0,1,0,2,2,1,2,3,3,2,3,1,1,0,1], accent:[0,2,4,6,8,10,12,14], filter:2100 }
});

const EVENT_VIBRATION = Object.freeze({
  'player-hit':[36,24,42], 'enemy-explode':18, 'boss-explode':[70,40,110], 'level-complete':[35,20,35,20,90], 'game-over':[90,45,120]
});

export class CosmicDefenderAudio {
  constructor() {
    this.settings = safeStorage.read();
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.scheduler = 0;
    this.nextStepTime = 0;
    this.step = 0;
    this.levelId = 'mercury';
    this.difficulty = 'normal';
    this.bossMode = false;
    this.paused = false;
    this.musicPlaying = true;
    this.listeners = new Set();
    this.eventCounts = {};
    this.lastEnemyShotAt = 0;
  }

  get supported() {
    return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext);
  }

  get track() {
    return TRACKS[this.levelId] || TRACKS.mercury;
  }

  getState() {
    return {
      supported:this.supported,
      initialized:Boolean(this.context),
      contextState:this.context?.state || 'uninitialized',
      levelId:this.levelId,
      difficulty:this.difficulty,
      title:this.track.title,
      bossMode:this.bossMode,
      paused:this.paused,
      musicPlaying:this.musicPlaying,
      settings:{ ...this.settings },
      eventCounts:{ ...this.eventCounts }
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  emit() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
    globalThis.dispatchEvent?.(new CustomEvent('cosmic-explorer:cosmic-audio-state', { detail:snapshot }));
  }

  persist() {
    safeStorage.write(this.settings);
    this.applyVolumes();
    this.emit();
  }

  async activate() {
    if (!this.supported) {
      this.emit();
      return false;
    }
    if (!this.context || this.context.state === 'closed') this.createGraph();
    if (this.context.state === 'suspended' || this.context.state === 'interrupted') {
      try { await this.context.resume(); }
      catch (error) { console.warn('[Cosmic Defender Audio] AudioContext could not resume.', error); }
    }
    this.applyVolumes(true);
    this.emit();
    return this.context.state === 'running';
  }

  createGraph() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.context = new AudioContextClass({ latencyHint:'interactive' });
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -20;
    this.compressor.knee.value = 16;
    this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.004;
    this.compressor.release.value = 0.18;
    this.musicGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.compressor).connect(this.context.destination);
    this.noiseBuffer = this.createNoiseBuffer();
    this.context.addEventListener?.('statechange', () => this.emit());
  }

  createNoiseBuffer() {
    const buffer = this.context.createBuffer(1, Math.floor(this.context.sampleRate * 1.25), this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < data.length; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.84 + white * 0.16;
      data[index] = white * 0.55 + last * 0.45;
    }
    return buffer;
  }

  ramp(node, value, duration = 0.04) {
    if (!node || !this.context) return;
    const now = this.context.currentTime;
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(0.0001, node.gain.value || 0.0001), now);
    node.gain.exponentialRampToValueAtTime(Math.max(0.0001, value), now + duration);
  }

  applyVolumes(immediate = false) {
    if (!this.context) return;
    const duration = immediate ? 0.006 : 0.045;
    const master = this.settings.muted ? 0.0001 : clamp(this.settings.master);
    const music = this.settings.musicEnabled && this.musicPlaying && !this.paused ? clamp(this.settings.music) : 0.0001;
    const sfx = this.settings.sfxEnabled ? clamp(this.settings.sfx) : 0.0001;
    this.ramp(this.masterGain, master, duration);
    this.ramp(this.musicGain, music, duration);
    this.ramp(this.sfxGain, sfx, duration);
  }

  setVolume(channel, value) {
    if (!['master','music','sfx'].includes(channel)) return;
    this.settings[channel] = clamp(value);
    if (this.settings[channel] > 0 && channel !== 'master') this.settings[`${channel}Enabled`] = true;
    if (channel === 'master' && value > 0) this.settings.muted = false;
    this.persist();
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.persist();
    return this.settings.muted;
  }

  toggleChannel(channel) {
    const key = channel === 'music' ? 'musicEnabled' : 'sfxEnabled';
    this.settings[key] = !this.settings[key];
    if (channel === 'music' && this.settings[key] && this.context) this.nextStepTime = this.context.currentTime + 0.03;
    this.persist();
    return this.settings[key];
  }

  toggleVibration() {
    this.settings.vibrationEnabled = !this.settings.vibrationEnabled;
    this.persist();
    return this.settings.vibrationEnabled;
  }

  setMusicPlaying(playing) {
    this.musicPlaying = Boolean(playing);
    if (this.musicPlaying && this.context) this.nextStepTime = this.context.currentTime + 0.03;
    this.applyVolumes();
    this.emit();
  }

  async startLevel(levelId, difficulty = 'normal') {
    await this.activate();
    this.levelId = TRACKS[levelId] ? levelId : 'mercury';
    this.difficulty = difficulty === 'hard' ? 'hard' : 'normal';
    this.bossMode = false;
    this.paused = false;
    this.musicPlaying = true;
    this.restartScheduler();
    this.playEvent('level-start');
    this.emit();
  }

  stopLevel() {
    this.stopScheduler();
    this.bossMode = false;
    this.paused = false;
    this.emit();
  }

  pauseGame(paused) {
    this.paused = Boolean(paused);
    this.applyVolumes();
    this.playEvent(paused ? 'pause' : 'resume');
    this.emit();
  }

  setBossMode(enabled) {
    const next = Boolean(enabled);
    if (next === this.bossMode) return;
    this.bossMode = next;
    this.step = 0;
    this.nextStepTime = this.context?.currentTime || 0;
    this.emit();
  }

  restartScheduler() {
    this.stopScheduler();
    if (!this.context) return;
    this.step = 0;
    this.nextStepTime = this.context.currentTime + 0.06;
    this.scheduler = globalThis.setInterval(() => this.scheduleAhead(), 25);
    this.scheduleAhead();
  }

  stopScheduler() {
    if (this.scheduler) globalThis.clearInterval(this.scheduler);
    this.scheduler = 0;
  }

  scheduleAhead() {
    if (!this.context || this.context.state !== 'running' || !this.settings.musicEnabled || !this.musicPlaying) return;
    if (this.nextStepTime < this.context.currentTime - 0.5) this.nextStepTime = this.context.currentTime + 0.03;
    const track = this.track;
    const bpm = track.bpm * (this.difficulty === 'hard' ? 1.06 : 1) * (this.bossMode ? 1.13 : 1);
    const stepDuration = (60 / bpm) / 4;
    while (this.nextStepTime < this.context.currentTime + 0.16) {
      this.scheduleMusicStep(this.step, this.nextStepTime, stepDuration);
      this.step = (this.step + 1) % 16;
      this.nextStepTime += stepDuration;
    }
  }

  scheduleMusicStep(step, time, duration) {
    const track = this.track;
    const hard = this.difficulty === 'hard';
    const leadIndex = track.leadPattern[step];
    const bassIndex = track.bassPattern[step];
    if (bassIndex !== null && bassIndex !== undefined && step % 2 === 0) {
      this.tone(midi(track.scale[bassIndex] - 12), time, duration * 1.7, 0.05, track.bass, this.musicGain, { filter:track.filter * 0.62, attack:0.008, release:0.12 });
    }
    if (leadIndex !== null && leadIndex !== undefined && (this.bossMode || step % 2 === 0 || hard)) {
      const octave = this.bossMode && step % 4 === 2 ? 12 : 0;
      this.tone(midi(track.scale[leadIndex] + octave), time, duration * (this.bossMode ? 1.4 : 0.9), this.bossMode ? 0.042 : 0.028, track.lead, this.musicGain, { filter:track.filter, attack:0.012, release:0.09 });
    }
    if (step % 4 === 0) this.kick(time, this.bossMode ? 0.075 : 0.055);
    if (step === 4 || step === 12) this.snare(time, this.bossMode ? 0.055 : 0.038);
    if (track.accent.includes(step) || (hard && step % 2 === 1)) this.hat(time, hard ? 0.022 : 0.014);
    if (this.bossMode && step % 4 === 3) this.tone(midi(track.scale[(step / 4) % track.scale.length | 0] + 12), time, duration * 0.45, 0.018, 'square', this.musicGain, { filter:3100, attack:0.002, release:0.04 });
  }

  tone(frequency, start, duration, volume, type = 'square', destination = this.sfxGain, options = {}) {
    if (!this.context || !destination || volume <= 0) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, frequency), start);
    if (options.endFrequency) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency), start + duration);
    filter.type = options.filterType || 'lowpass';
    filter.frequency.setValueAtTime(options.filter || 4200, start);
    filter.Q.value = options.q || 0.8;
    const attack = Math.max(0.001, options.attack || 0.004);
    const release = Math.max(0.012, options.release || Math.min(0.12, duration * 0.45));
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + attack);
    gain.gain.setValueAtTime(Math.max(0.0001, volume * 0.74), Math.max(start + attack, start + duration - release));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter).connect(gain).connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.025);
  }

  noise(start, duration, volume, options = {}) {
    if (!this.context || !this.noiseBuffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = options.rate || 1;
    filter.type = options.filterType || 'bandpass';
    filter.frequency.setValueAtTime(options.frequency || 1200, start);
    filter.Q.value = options.q || 0.7;
    gain.gain.setValueAtTime(Math.max(0.0001, volume), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter).connect(gain).connect(options.destination || this.sfxGain);
    source.start(start, Math.random() * 0.25, duration);
  }

  kick(time, volume) {
    this.tone(125, time, 0.13, volume, 'sine', this.musicGain, { endFrequency:42, filter:700, attack:0.002, release:0.08 });
  }

  snare(time, volume) {
    this.noise(time, 0.11, volume, { frequency:1800, q:0.5, destination:this.musicGain });
    this.tone(190, time, 0.09, volume * 0.45, 'triangle', this.musicGain, { endFrequency:100, filter:1200 });
  }

  hat(time, volume) {
    this.noise(time, 0.035, volume, { frequency:7000, q:0.35, destination:this.musicGain, rate:1.6 });
  }

  vibrate(eventName) {
    const vibration = globalThis.navigator?.vibrate?.bind(globalThis.navigator);
    if (!this.settings.vibrationEnabled || !vibration) return;
    const pattern = EVENT_VIBRATION[eventName];
    if (pattern) vibration(pattern);
  }

  playEvent(eventName, detail = {}) {
    this.eventCounts[eventName] = (this.eventCounts[eventName] || 0) + 1;
    if (eventName === 'boss-wave') this.setBossMode(true);
    if (eventName === 'wave-start' && !detail.boss) this.setBossMode(false);
    if (eventName === 'pause') this.paused = true;
    if (eventName === 'resume') this.paused = false;
    this.applyVolumes();
    this.vibrate(eventName);
    if (!this.context || !this.settings.sfxEnabled || this.settings.muted) { this.emit(); return; }
    const now = this.context.currentTime + 0.002;
    switch (eventName) {
      case 'player-shot':
        this.tone(940, now, 0.075, 0.10, 'square', this.sfxGain, { endFrequency:320, filter:5200, attack:0.001, release:0.045 });
        break;
      case 'enemy-shot': {
        const stamp = performance.now();
        if (stamp - this.lastEnemyShotAt < 72) break;
        this.lastEnemyShotAt = stamp;
        this.tone(detail.boss ? 180 : 260, now, detail.boss ? 0.17 : 0.095, detail.boss ? 0.055 : 0.025, 'sawtooth', this.sfxGain, { endFrequency:detail.boss ? 90 : 180, filter:1600 });
        break;
      }
      case 'enemy-hit':
        this.tone(220, now, 0.045, 0.03, 'triangle', this.sfxGain, { endFrequency:150, filter:2200 });
        break;
      case 'shield-hit':
        this.tone(760, now, 0.09, 0.055, 'sine', this.sfxGain, { endFrequency:1180, filter:6000 });
        break;
      case 'enemy-explode':
        this.noise(now, detail.elite ? 0.22 : 0.14, detail.elite ? 0.13 : 0.075, { frequency:detail.elite ? 620 : 900, q:0.45, rate:0.82 });
        this.tone(detail.elite ? 150 : 220, now, detail.elite ? 0.22 : 0.13, detail.elite ? 0.08 : 0.045, 'sawtooth', this.sfxGain, { endFrequency:48, filter:1100 });
        break;
      case 'boss-explode':
        this.noise(now, 0.68, 0.22, { frequency:380, q:0.35, rate:0.62 });
        this.tone(110, now, 0.72, 0.15, 'sawtooth', this.sfxGain, { endFrequency:28, filter:850, release:0.42 });
        break;
      case 'player-hit':
        this.noise(now, 0.28, 0.17, { frequency:980, q:0.4, rate:0.9 });
        this.tone(330, now, 0.32, 0.11, 'square', this.sfxGain, { endFrequency:70, filter:1800 });
        break;
      case 'wave-complete':
        [0,4,7].forEach((offset, index) => this.tone(midi(64 + offset), now + index * 0.07, 0.3, 0.075, 'triangle', this.sfxGain, { filter:4200 }));
        break;
      case 'countdown':
        this.tone(detail.count === 1 ? 880 : 620, now, 0.11, 0.065, 'square', this.sfxGain, { filter:3600 });
        break;
      case 'wave-start':
        this.tone(520, now, 0.12, 0.055, 'square', this.sfxGain, { endFrequency:760, filter:4200 });
        this.tone(780, now + 0.08, 0.13, 0.052, 'square', this.sfxGain, { endFrequency:1060, filter:4800 });
        break;
      case 'boss-intro': case 'boss-wave':
        [110,92,73].forEach((frequency, index) => this.tone(frequency, now + index * 0.16, 0.3, 0.105, 'sawtooth', this.sfxGain, { endFrequency:frequency * 0.72, filter:1000 }));
        break;
      case 'boss-phase':
        [55,58,62].forEach((note, index) => this.tone(midi(note), now + index * 0.055, 0.22, 0.075, 'square', this.sfxGain, { filter:3100 }));
        break;
      case 'level-complete':
        [60,64,67,72].forEach((note, index) => this.tone(midi(note), now + index * 0.105, 0.48, 0.09, index % 2 ? 'triangle' : 'square', this.sfxGain, { filter:4800 }));
        break;
      case 'hard-unlocked':
        [60,63,67,72,75].forEach((note, index) => this.tone(midi(note), now + index * 0.08, 0.4, 0.075, 'triangle', this.sfxGain, { filter:5200 }));
        break;
      case 'game-over':
        [55,51,48,43].forEach((note, index) => this.tone(midi(note), now + index * 0.14, 0.38, 0.08, 'square', this.sfxGain, { endFrequency:midi(note - 5), filter:1900 }));
        break;
      case 'pause':
        this.tone(420, now, 0.08, 0.035, 'triangle', this.sfxGain, { endFrequency:320, filter:2200 });
        break;
      case 'resume':
        this.tone(360, now, 0.08, 0.035, 'triangle', this.sfxGain, { endFrequency:520, filter:2600 });
        break;
      case 'level-start':
        this.tone(220, now, 0.15, 0.05, 'sine', this.sfxGain, { endFrequency:440, filter:1800 });
        break;
      default:
        break;
    }
    this.emit();
  }

  async close() {
    this.stopScheduler();
    if (this.context && this.context.state !== 'closed') {
      try { await this.context.close(); }
      catch { /* Context may already be unavailable during navigation teardown. */ }
    }
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.compressor = null;
    this.noiseBuffer = null;
    this.emit();
  }
}

export const cosmicDefenderAudio = new CosmicDefenderAudio();
export const cosmicDefenderTracks = TRACKS;
