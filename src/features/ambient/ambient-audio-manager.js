import { KIRA_CONTEXT_EVENT } from '../kira/kira-events.js';
import {
  ALL_AMBIENT_PROFILES,
  AMBIENT_AUDIO_STORAGE_KEY,
  LEGACY_AMBIENT_AUDIO_STORAGE_KEY,
  AMBIENT_SOUND_MODES,
  DEFAULT_AMBIENT_AUDIO_SETTINGS,
  THEME_AUDIO_RECOMMENDATIONS,
  resolveAmbientProfile,
  sanitizeAmbientSettings,
  settingsForMode
} from './ambient-audio-config.js';

const EPSILON = 0.0001;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));
const randomBetween = ([min = 1, max = min] = []) => min + Math.random() * Math.max(0, max - min);
const normalizeSection = (path = '') => {
  const value = String(path).replace(/^#?\//, '').split('?')[0] || 'home';
  return ['home','universe','gallery','favorites','music-space','cosmic-defender'].includes(value) ? value : 'home';
};
const perceptualGain = (value) => {
  const normalized = clamp(value);
  if (normalized <= 0) return 0;
  // Keeps the middle of a slider audible without making the top excessively loud.
  return 0.10 + 0.90 * Math.pow(normalized, 1.15);
};

function readSettings() {
  try {
    const current = localStorage.getItem(AMBIENT_AUDIO_STORAGE_KEY);
    const legacy = localStorage.getItem(LEGACY_AMBIENT_AUDIO_STORAGE_KEY);
    const parsed = JSON.parse(current || legacy || '{}');
    const migrated = sanitizeAmbientSettings({ ...DEFAULT_AMBIENT_AUDIO_SETTINGS, ...parsed, version:parsed.version || 1 });
    if (!current || Number(parsed.version || 1) < 2) localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return sanitizeAmbientSettings(DEFAULT_AMBIENT_AUDIO_SETTINGS);
  }
}
function writeSettings(settings) {
  try { localStorage.setItem(AMBIENT_AUDIO_STORAGE_KEY, JSON.stringify(settings)); }
  catch { /* Audio continues in memory if storage is unavailable. */ }
}

class AmbientAudioManager {
  constructor() {
    this.settings = typeof window !== 'undefined' ? readSettings() : sanitizeAmbientSettings(DEFAULT_AMBIENT_AUDIO_SETTINGS);
    this.context = null;
    this.masterGain = null;
    this.musicGain = null;
    this.ambienceGain = null;
    this.sonificationGain = null;
    this.effectsGain = null;
    this.compressor = null;
    this.listeners = new Set();
    this.controller = null;
    this.observer = null;
    this.initialized = false;
    this.authorized = false;
    this.section = normalizeSection(typeof location !== 'undefined' ? location.hash : '/home');
    this.objectId = null;
    this.objectType = null;
    this.currentProfile = resolveAmbientProfile({ section:this.section, settings:this.settings });
    this.activeSession = null;
    this.previewSession = null;
    this.transitionToken = 0;
    this.musicPlaying = false;
    this.gameActive = false;
    this.documentHidden = false;
    this.appearanceTheme = 'cosmic-explorer-original';
    this.lastError = null;
    this.loadErrors = [];
    this.bufferCache = new Map();
    this.pendingLoads = new Map();
    this.diagnosticPanel = null;
    this.metrics = {
      transitions:0, sessionsCreated:0, sessionsStopped:0, peakConcurrentSessions:0,
      activeTimers:0, buffersLoaded:0, cacheHits:0, loadFailures:0
    };
  }

  get supported() { return Boolean(globalThis.AudioContext || globalThis.webkitAudioContext); }

  init() {
    if (this.initialized || typeof document === 'undefined') return this;
    this.initialized = true;
    this.controller = new AbortController();
    const { signal } = this.controller;

    document.addEventListener('cosmic-explorer:route-change', (event) => {
      this.section = normalizeSection(event.detail?.path || location.hash);
      this.objectId = null;
      this.objectType = null;
      this.refreshProfile('route');
      this.scheduleDomScan();
    }, { signal });

    document.addEventListener(KIRA_CONTEXT_EVENT, (event) => {
      const detail = event.detail || {};
      if (detail.action === 'close-object') {
        this.objectId = null;
        this.objectType = null;
      } else if (detail.objectId || detail.id) {
        this.section = detail.section || this.section;
        this.objectId = detail.objectId || detail.id;
        this.objectType = detail.objectType || detail.type || detail.category || null;
      }
      this.refreshProfile('context');
    }, { signal });

    window.addEventListener('cosmic-explorer:music-state', (event) => {
      this.musicPlaying = Boolean(event.detail?.isPlaying);
      this.applyVolumes();
    }, { signal });

    document.addEventListener('cosmic-explorer:kira-game', (event) => {
      this.gameActive = Boolean(event.detail?.active);
      this.applyVolumes();
    }, { signal });

    window.addEventListener('cosmic-explorer:cosmic-audio-state', (event) => {
      if (event.detail?.levelId) this.gameActive = !event.detail?.paused && Boolean(event.detail?.musicPlaying);
      this.applyVolumes();
    }, { signal });

    document.addEventListener('cosmic-explorer:appearance-change', (event) => {
      const appearance = event.detail?.appearance;
      this.appearanceTheme = appearance?.activeTheme || appearance?.global?.themeId || this.appearanceTheme;
      if (this.settings.applyThemeRecommendation) {
        const recommended = THEME_AUDIO_RECOMMENDATIONS[this.appearanceTheme];
        if (recommended) this.setMode(recommended);
      }
      this.emit();
    }, { signal });

    document.addEventListener('visibilitychange', () => {
      this.documentHidden = document.hidden;
      this.applyVolumes(true);
    }, { signal });
    window.addEventListener('pagehide', () => this.suspend(), { signal });
    window.addEventListener('pageshow', () => { if (this.authorized) this.resume(); }, { signal });
    // Browsers may suspend Web Audio after an interruption. A later valid user gesture restores it.
    const recover = () => { if (this.authorized && this.context?.state === 'suspended') this.resume(); };
    window.addEventListener('pointerdown', recover, { signal, passive:true });
    window.addEventListener('keydown', recover, { signal });

    this.observer = new MutationObserver(() => this.scheduleDomScan());
    this.observer.observe(document.body, { subtree:true, childList:true, attributes:true, attributeFilter:['class','hidden','data-planet','data-star','data-gallery-id'] });
    this.scheduleDomScan();
    this.exposeApi();
    this.syncDiagnosticsPanel();
    this.emit();
    return this;
  }

  exposeApi() {
    window.cosmicExplorerAmbientAudio = {
      activate: () => this.activate(),
      toggle: () => this.toggleEnabled(),
      getState: () => this.getState(),
      getDiagnostics: () => this.getDiagnostics(),
      getSummary: (language) => this.getSummary(language),
      update: (patch) => this.updateSettings(patch),
      previewSettings: (settings) => this.previewSettings(settings),
      commitSettings: (settings) => this.commitSettings(settings),
      setMode: (mode) => this.setMode(mode),
      preview: (profileId) => this.preview(profileId),
      stopPreview: () => this.stopPreview(),
      reset: () => this.reset(),
      setDiagnostics: (enabled) => this.updateSettings({ diagnosticsEnabled:Boolean(enabled) })
    };
  }

  destroy() {
    this.transitionToken += 1;
    this.controller?.abort();
    if (this.observer) this.observer.disconnect();
    this.stopSession(this.activeSession, 0);
    this.stopSession(this.previewSession, 0);
    this.activeSession = null;
    this.previewSession = null;
    this.bufferCache.clear();
    this.pendingLoads.clear();
    this.diagnosticPanel?.remove();
    this.diagnosticPanel = null;
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null;
    this.initialized = false;
    if (typeof window !== 'undefined') delete window.cosmicExplorerAmbientAudio;
  }

  scheduleDomScan() {
    if (this.domFrame || typeof requestAnimationFrame === 'undefined') return;
    this.domFrame = requestAnimationFrame(() => { this.domFrame = 0; this.scanDomContext(); });
  }

  scanDomContext() {
    const planet = document.querySelector('.planet-viewer-overlay.is-open:not([hidden]):not(.star-viewer-overlay)');
    const star = document.querySelector('.star-viewer-overlay.is-open:not([hidden])');
    const gallery = document.querySelector('.gallery-viewer.is-open:not([hidden])');
    const next = planet?.dataset.planet ? { id:planet.dataset.planet, type:'planet', section:'universe' }
      : star?.dataset.star ? { id:star.dataset.star, type:'star', section:'universe' }
        : gallery?.dataset.galleryId ? { id:gallery.dataset.galleryId, type:'gallery', section:'gallery' }
          : null;
    if (next) {
      const changed = next.id !== this.objectId || next.type !== this.objectType;
      this.objectId = next.id; this.objectType = next.type; this.section = next.section;
      if (changed) this.refreshProfile('viewer');
      return;
    }
    if (this.objectId && ['planet','star','gallery','gallery-object'].includes(this.objectType)) {
      this.objectId = null; this.objectType = null; this.refreshProfile('viewer-close');
    }
  }

  createGraph() {
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    this.context = new AudioContextClass({ latencyHint:'playback' });
    this.masterGain = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.ambienceGain = this.context.createGain();
    this.sonificationGain = this.context.createGain();
    this.effectsGain = this.context.createGain();
    this.compressor = this.context.createDynamicsCompressor();
    this.compressor.threshold.value = -12;
    this.compressor.knee.value = 14;
    this.compressor.ratio.value = 3;
    this.compressor.attack.value = 0.012;
    this.compressor.release.value = 0.30;
    this.musicGain.connect(this.masterGain);
    this.ambienceGain.connect(this.masterGain);
    this.sonificationGain.connect(this.masterGain);
    this.effectsGain.connect(this.masterGain);
    this.masterGain.connect(this.compressor).connect(this.context.destination);
    this.context.addEventListener?.('statechange', () => this.emit());
    this.applyVolumes(true);
    return true;
  }

  async activate() {
    if (!this.supported) {
      this.lastError = 'Web Audio API is unavailable.';
      this.emit(); return false;
    }
    if (!this.context || this.context.state === 'closed') this.createGraph();
    try {
      if (this.context.state !== 'running') await this.context.resume();
      this.authorized = this.context.state === 'running';
      if (this.authorized && this.settings.enabled) await this.switchProfile(this.currentProfile, { immediate:!this.activeSession });
      this.applyVolumes(true);
      this.emit();
      return this.authorized;
    } catch (error) {
      this.lastError = error?.message || String(error); this.emit(); return false;
    }
  }

  async suspend() {
    if (this.context?.state === 'running') await this.context.suspend().catch(() => {});
    this.emit();
  }
  async resume() {
    if (!this.authorized || !this.settings.enabled) return false;
    if (this.context?.state === 'suspended') await this.context.resume().catch(() => {});
    this.applyVolumes(true); this.emit(); return this.context?.state === 'running';
  }

  effectiveMode() {
    const perSection = this.settings.perSectionProfiles?.[this.section];
    return AMBIENT_SOUND_MODES[perSection] || AMBIENT_SOUND_MODES[this.settings.profile] || AMBIENT_SOUND_MODES.balanced;
  }

  getDuckFactors() {
    if (!this.settings.enabled || this.documentHidden) return { master:0, music:0, ambience:0, sonification:0, effects:0 };
    const result = { master:1, music:1, ambience:1, sonification:1, effects:1 };
    if (this.section === 'music-space' && this.settings.musicBehavior === 'off') return { master:0, music:0, ambience:0, sonification:0, effects:0 };
    if (this.musicPlaying) {
      result.music = 0;
      if (this.settings.musicBehavior === 'pause') { result.ambience=0; result.sonification=0; result.effects=.18; }
      if (this.settings.musicBehavior === 'reduce') { result.ambience=.14; result.sonification=.10; result.effects=.25; }
      if (this.settings.musicBehavior === 'mix') { result.ambience=.34; result.sonification=.20; result.effects=.32; }
    }
    if (this.gameActive) {
      result.music = 0;
      if (this.settings.gameBehavior === 'pause') { result.ambience=0; result.sonification=0; result.effects=0; }
      if (this.settings.gameBehavior === 'reduce') { result.ambience=.10; result.sonification=.08; result.effects=.12; }
      if (this.settings.gameBehavior === 'mix') { result.ambience=.28; result.sonification=.18; result.effects=.20; }
    }
    return result;
  }
  getDuckFactor() { return this.getDuckFactors().master; }

  rampGain(node, value, duration = 0.08) {
    if (!node || !this.context) return;
    const now = this.context.currentTime;
    const target = Math.max(EPSILON, value);
    node.gain.cancelScheduledValues(now);
    node.gain.setValueAtTime(Math.max(EPSILON, Number(node.gain.value) || EPSILON), now);
    node.gain.exponentialRampToValueAtTime(target, now + Math.max(0.006, duration));
  }

  applyVolumes(immediate = false) {
    if (!this.context) return;
    const mode = this.effectiveMode();
    const useModeDefaults = Boolean(this.settings.perSectionProfiles?.[this.section]);
    const values = {
      master:useModeDefaults ? mode.master : this.settings.masterVolume,
      music:useModeDefaults ? mode.music : this.settings.relaxingMusicVolume,
      ambience:useModeDefaults ? mode.ambience : this.settings.ambienceVolume,
      sonification:useModeDefaults ? mode.sonification : this.settings.sonificationVolume,
      effects:useModeDefaults ? mode.effects : this.settings.effectsVolume
    };
    const duck = this.getDuckFactors();
    const duration = immediate ? 0.01 : 0.20;
    const cap = perceptualGain(clamp(this.settings.maxVolume, 0.05, 1));
    this.rampGain(this.masterGain, Math.min(cap, perceptualGain(values.master)) * duck.master, duration);
    this.rampGain(this.musicGain, this.settings.relaxingMusicEnabled ? perceptualGain(values.music) * duck.music : 0, duration);
    this.rampGain(this.ambienceGain, this.settings.ambienceEnabled ? perceptualGain(values.ambience) * duck.ambience : 0, duration);
    this.rampGain(this.sonificationGain, this.settings.sonificationEnabled ? perceptualGain(values.sonification) * duck.sonification : 0, duration);
    this.rampGain(this.effectsGain, this.settings.effectsEnabled ? perceptualGain(values.effects) * duck.effects : 0, duration);
    this.syncDiagnosticsPanel();
  }

  refreshProfile(reason = 'context') {
    const profile = resolveAmbientProfile({ section:this.section, objectId:this.objectId, objectType:this.objectType, settings:this.settings });
    const changed = profile.id !== this.currentProfile?.id;
    this.currentProfile = profile;
    if (changed && this.authorized && this.settings.enabled && !this.previewSession) this.switchProfile(profile);
    this.applyVolumes(); this.emit({ reason });
  }

  async loadBuffer(sources, assetId) {
    const key = `${assetId}:${sources.join('|')}`;
    if (this.bufferCache.has(key)) { this.metrics.cacheHits += 1; return this.bufferCache.get(key); }
    if (this.pendingLoads.has(key)) return this.pendingLoads.get(key);
    const promise = (async () => {
      let lastError = null;
      for (const source of sources) {
        try {
          const url = new URL(source, document.baseURI).href;
          const response = await fetch(url, { cache:'force-cache' });
          if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
          const bytes = await response.arrayBuffer();
          if (!bytes.byteLength) throw new Error('empty audio resource');
          const buffer = await this.context.decodeAudioData(bytes.slice(0));
          if (!buffer?.duration) throw new Error('decoded audio has no duration');
          const channelData = buffer.getChannelData(0);
          let sumSquares = 0;
          const stride = Math.max(1, Math.floor(channelData.length / 12000));
          let samples = 0;
          for (let index = 0; index < channelData.length; index += stride) { sumSquares += channelData[index] * channelData[index]; samples += 1; }
          const rms = Math.sqrt(sumSquares / Math.max(1, samples));
          const result = { buffer, url, size:bytes.byteLength, rms, rmsDb:rms > 0 ? 20 * Math.log10(rms) : -Infinity };
          this.bufferCache.set(key, result);
          this.metrics.buffersLoaded += 1;
          return result;
        } catch (error) {
          lastError = error;
          this.loadErrors.push({ assetId, source, message:error?.message || String(error), at:Date.now() });
          if (this.loadErrors.length > 30) this.loadErrors.shift();
        }
      }
      this.metrics.loadFailures += 1;
      throw lastError || new Error(`Unable to load ${assetId}`);
    })().finally(() => this.pendingLoads.delete(key));
    this.pendingLoads.set(key, promise);
    return promise;
  }

  channelNode(channel) {
    return channel === 'music' ? this.musicGain : channel === 'sonification' ? this.sonificationGain : channel === 'effects' ? this.effectsGain : this.ambienceGain;
  }

  async createSession(profile, token) {
    const session = {
      id:`ambient-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      profile, gains:{}, nodes:[], timers:new Set(), stopped:false, loadedAssets:[], failedAssets:[]
    };
    for (const channel of ['music','ambience','sonification','effects']) {
      const gain = this.context.createGain();
      gain.gain.value = EPSILON;
      gain.connect(this.channelNode(channel));
      session.gains[channel] = gain;
    }
    const assets = Object.values(profile.assets || {});
    const settled = await Promise.allSettled(assets.map(async (asset) => {
      const loaded = await this.loadBuffer(asset.sources, asset.id);
      if (token !== this.transitionToken || session.stopped) return;
      const source = this.context.createBufferSource();
      source.buffer = loaded.buffer;
      source.loop = asset.loop !== false;
      const stemGain = this.context.createGain();
      const mixValue = Number(profile.mix?.[asset.channel]) || 1;
      stemGain.gain.value = mixValue;
      source.connect(stemGain).connect(session.gains[asset.channel] || session.gains.ambience);
      source.start(0, Math.random() * Math.min(2.5, Math.max(0, loaded.buffer.duration - .1)));
      session.nodes.push(source, stemGain);
      session.loadedAssets.push({ id:asset.id, channel:asset.channel, url:loaded.url, duration:loaded.buffer.duration, rmsDb:loaded.rmsDb, label:asset.label });
    }));
    settled.forEach((result, index) => {
      if (result.status === 'rejected') session.failedAssets.push({ id:assets[index]?.id, message:result.reason?.message || String(result.reason) });
    });
    if (!session.loadedAssets.length) {
      // The procedural fallback is only used after a real file loading/decoding failure.
      this.createProceduralFallback(session, profile);
      this.lastError = `Audio files failed for ${profile.id}; procedural fallback active.`;
    } else this.lastError = session.failedAssets.length ? `${session.failedAssets.length} audio stem(s) failed; remaining stems are active.` : null;
    this.scheduleProfileEffects(session, profile);
    this.metrics.sessionsCreated += 1;
    this.metrics.peakConcurrentSessions = Math.max(this.metrics.peakConcurrentSessions, Number(Boolean(this.activeSession)) + Number(Boolean(this.previewSession)) + 1);
    return session;
  }

  createProceduralFallback(session, profile) {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const seed = [...profile.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    oscillator.type = ['sine','triangle','sawtooth'][seed % 3];
    oscillator.frequency.value = 55 + (seed % 180);
    gain.gain.value = .10;
    oscillator.connect(gain).connect(session.gains.ambience);
    oscillator.start();
    session.nodes.push(oscillator, gain);
    session.loadedAssets.push({ id:`${profile.id}-procedural-fallback`, channel:'ambience', url:null, duration:null, label:{ es:'Respaldo procedural', en:'Procedural fallback' } });
  }

  scheduleProfileEffects(session, profile) {
    const mode = this.effectiveMode();
    for (const soundLayer of profile.layers || []) {
      if (!['pulse','chime','burst'].includes(soundLayer.type)) continue;
      if (Math.random() > Math.max(.25, mode.density)) continue;
      this.scheduleTransient(session, soundLayer);
    }
  }

  createPanner(value = 0) {
    if (!this.settings.spatialAudio || !this.context.createStereoPanner) return null;
    const panner = this.context.createStereoPanner(); panner.pan.value = clamp(value, -0.85, 0.85); return panner;
  }
  safeFrequency(value) {
    const frequency = Number(value) || 110;
    return this.settings.disableDeepBass ? Math.max(72, frequency) : Math.max(24, frequency);
  }

  scheduleTransient(session, soundLayer) {
    const scheduleNext = () => {
      if (session.stopped) return;
      const mode = this.effectiveMode();
      const delay = Math.max(.8, randomBetween(soundLayer.interval || [6,12]) / Math.max(.35, mode.density));
      const timer = setTimeout(() => {
        session.timers.delete(timer); this.metrics.activeTimers = Math.max(0, this.metrics.activeTimers - 1);
        if (!session.stopped) { this.playTransient(session, soundLayer); scheduleNext(); }
      }, delay * 1000);
      session.timers.add(timer); this.metrics.activeTimers += 1;
    };
    const initial = setTimeout(() => {
      session.timers.delete(initial); this.metrics.activeTimers = Math.max(0, this.metrics.activeTimers - 1);
      if (!session.stopped) { this.playTransient(session, soundLayer); scheduleNext(); }
    }, Math.min(2800, randomBetween(soundLayer.interval || [4,8]) * 430));
    session.timers.add(initial); this.metrics.activeTimers += 1;
  }

  playTransient(session, soundLayer) {
    if (!this.context || session.stopped || this.context.state !== 'running' || !this.settings.effectsEnabled) return;
    const now = this.context.currentTime;
    const duration = Math.max(.04, Number(soundLayer.duration) || .3);
    const safety = this.settings.reduceIntenseSounds ? .45 : 1;
    const transientGain = this.context.createGain();
    transientGain.gain.setValueAtTime(EPSILON, now);
    transientGain.gain.exponentialRampToValueAtTime(Math.max(EPSILON, (soundLayer.gain || .025) * safety * 2.4), now + Math.min(.08, duration*.25));
    transientGain.gain.exponentialRampToValueAtTime(EPSILON, now + duration);
    const panner = this.createPanner((Math.random()*2-1)*(soundLayer.pan || .25));
    if (panner) transientGain.connect(panner).connect(session.gains.effects); else transientGain.connect(session.gains.effects);
    const frequencies = soundLayer.type === 'chime' ? soundLayer.frequencies || [440] : [soundLayer.frequency || 440];
    frequencies.slice(0,4).forEach((frequency,index) => {
      const oscillator = this.context.createOscillator();
      oscillator.type = soundLayer.waveform || (soundLayer.type === 'pulse' ? 'square':'sine');
      oscillator.frequency.value = this.safeFrequency(frequency);
      const noteGain = this.context.createGain(); noteGain.gain.value = 1/Math.max(1,frequencies.length);
      oscillator.connect(noteGain).connect(transientGain);
      const offset=index*Math.min(.18,duration/Math.max(2,frequencies.length));
      oscillator.start(now+offset); oscillator.stop(now+duration+offset+.02);
      oscillator.onended=()=>{ try{oscillator.disconnect();noteGain.disconnect();}catch{} };
    });
    setTimeout(()=>{try{transientGain.disconnect();panner?.disconnect();}catch{}},(duration+.9)*1000);
  }

  async switchProfile(profile, { immediate = false } = {}) {
    if (!this.context || !profile || !this.settings.enabled) return false;
    if (this.activeSession?.profile.id === profile.id && !immediate) return true;
    const token = ++this.transitionToken;
    const duration = immediate ? .05 : clamp(this.settings.transitionDuration,.2,8);
    const previous = this.activeSession;
    let next;
    try { next = await this.createSession(profile, token); }
    catch (error) { this.lastError=error?.message || String(error); this.emit(); return false; }
    if (token !== this.transitionToken) { this.stopSession(next,0); return false; }
    this.activeSession = next;
    this.metrics.transitions += 1;
    this.fadeSession(next,1,duration);
    if (previous) {
      this.fadeSession(previous,0,duration);
      setTimeout(()=>this.stopSession(previous,0),duration*1000+120);
    }
    this.applyVolumes(); this.emit(); return true;
  }

  fadeSession(session, value, duration) {
    if (!session || !this.context) return;
    const now=this.context.currentTime;
    for (const gain of Object.values(session.gains)) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(Math.max(EPSILON,Number(gain.gain.value)||EPSILON),now);
      gain.gain.exponentialRampToValueAtTime(Math.max(EPSILON,value),now+Math.max(.02,duration));
    }
  }

  stopSession(session, fade=.08) {
    if (!session || session.stopped) return;
    session.stopped=true;
    for (const timer of session.timers) clearTimeout(timer);
    this.metrics.activeTimers=Math.max(0,this.metrics.activeTimers-session.timers.size); session.timers.clear();
    const finish=()=>{
      for(const node of session.nodes){try{node.stop?.();}catch{} try{node.disconnect?.();}catch{}}
      for(const gain of Object.values(session.gains))try{gain.disconnect();}catch{}
      session.nodes.length=0; this.metrics.sessionsStopped+=1;
    };
    if(fade>0&&this.context){this.fadeSession(session,0,fade);setTimeout(finish,fade*1000+40);}else finish();
  }

  previewSettings(candidate={}) {
    this.settings=sanitizeAmbientSettings({...this.settings,...candidate});
    this.refreshProfile('settings-preview'); this.applyVolumes(); this.syncDiagnosticsPanel(); this.emit({previewing:true}); return this.getState();
  }
  commitSettings(candidate={}) {
    this.settings=sanitizeAmbientSettings({...this.settings,...candidate}); writeSettings(this.settings);
    this.refreshProfile('settings-commit'); this.applyVolumes(); this.syncDiagnosticsPanel(); this.emit({previewing:false}); return this.getState();
  }
  updateSettings(patch={}) {
    this.settings=sanitizeAmbientSettings({...this.settings,...patch}); writeSettings(this.settings);
    this.refreshProfile('settings'); this.applyVolumes(); this.syncDiagnosticsPanel(); this.emit(); return this.getState();
  }
  setMode(modeId) {
    this.settings=settingsForMode(modeId,this.settings); writeSettings(this.settings);
    if(!this.settings.enabled){this.stopSession(this.activeSession,.35);this.activeSession=null;}
    else if(this.authorized)this.switchProfile(this.currentProfile,{immediate:!this.activeSession});
    this.applyVolumes();this.emit();return this.getState();
  }
  setPerSectionProfile(section,modeId){const next={...this.settings.perSectionProfiles};if(!modeId||modeId==='inherit')delete next[section];else if(AMBIENT_SOUND_MODES[modeId])next[section]=modeId;return this.updateSettings({perSectionProfiles:next});}

  async toggleEnabled(){
    if(!this.settings.enabled){this.settings=sanitizeAmbientSettings({...this.settings,enabled:true,profile:this.settings.profile==='silent'?'balanced':this.settings.profile});writeSettings(this.settings);await this.activate();}
    else{this.settings=sanitizeAmbientSettings({...this.settings,enabled:false});writeSettings(this.settings);this.stopSession(this.activeSession,.4);this.activeSession=null;this.applyVolumes();}
    this.emit();return this.settings.enabled;
  }

  async preview(profileId=null){
    await this.activate(); const profile=ALL_AMBIENT_PROFILES[profileId]||this.currentProfile;
    if(!profile||!this.context)return false;
    const token=++this.transitionToken;
    if(this.previewSession)this.stopSession(this.previewSession,.15);
    const session=await this.createSession(profile,token);
    if(token!==this.transitionToken){this.stopSession(session,0);return false;}
    if(this.activeSession)this.fadeSession(this.activeSession,.12,.25);
    this.previewSession=session;this.fadeSession(session,1,.35);this.emit();return true;
  }
  stopPreview(){if(!this.previewSession)return;this.transitionToken+=1;this.stopSession(this.previewSession,.3);this.previewSession=null;if(this.activeSession)this.fadeSession(this.activeSession,1,.35);else if(this.authorized&&this.settings.enabled)this.switchProfile(this.currentProfile,{immediate:true});this.emit();}

  reset(){
    this.settings=sanitizeAmbientSettings(DEFAULT_AMBIENT_AUDIO_SETTINGS);writeSettings(this.settings);
    try{localStorage.removeItem(LEGACY_AMBIENT_AUDIO_STORAGE_KEY);}catch{}
    this.refreshProfile('reset');this.applyVolumes();this.emit();return this.getState();
  }

  getFinalGains(){
    const read=(node)=>Number(node?.gain?.value||0);
    return {master:read(this.masterGain),music:read(this.musicGain),ambience:read(this.ambienceGain),sonification:read(this.sonificationGain),effects:read(this.effectsGain)};
  }
  getDiagnostics(){
    return {
      audioContext:this.context?.state||'uninitialized',profile:this.currentProfile?.id||null,section:this.section,objectId:this.objectId,
      mode:this.effectiveMode().id,settings:{master:this.settings.masterVolume,music:this.settings.relaxingMusicVolume,ambience:this.settings.ambienceVolume,sonification:this.settings.sonificationVolume,effects:this.settings.effectsVolume},
      finalGains:this.getFinalGains(),duck:this.getDuckFactors(),musicSpaceReducing:this.musicPlaying,cosmicDefenderPriority:this.gameActive,
      loadedAssets:this.activeSession?.loadedAssets||[],failedAssets:this.activeSession?.failedAssets||[],lastError:this.lastError,loadErrors:[...this.loadErrors]
    };
  }
  syncDiagnosticsPanel(){
    if(typeof document==='undefined')return;
    const requested=this.settings.diagnosticsEnabled||location.search.includes('audioDebug=1')||location.hash.includes('audioDebug=1');
    if(!requested){this.diagnosticPanel?.remove();this.diagnosticPanel=null;return;}
    if(!this.diagnosticPanel){this.diagnosticPanel=document.createElement('pre');this.diagnosticPanel.className='ambient-audio-diagnostics';this.diagnosticPanel.setAttribute('aria-live','polite');document.body.append(this.diagnosticPanel);}
    this.diagnosticPanel.textContent=JSON.stringify(this.getDiagnostics(),null,2);
  }

  getSummary(language='en'){
    const lang=language==='es'?'es':'en';const mode=this.effectiveMode();
    return {enabled:this.settings.enabled,authorized:this.authorized,profileId:mode.id,profileName:mode.name[lang],soundName:this.currentProfile?.names?.[lang]||this.currentProfile?.id||'',audioType:this.currentProfile?.audioType||'artistic-ambience',masterPercent:Math.round(this.settings.masterVolume*100),musicPercent:Math.round(this.settings.relaxingMusicVolume*100),section:this.section,objectId:this.objectId,musicBehavior:this.settings.musicBehavior,gameBehavior:this.settings.gameBehavior,scientificNote:this.currentProfile?.scientificNote||null,activeLayers:(this.activeSession?.loadedAssets||[]).map(item=>item.label?.[lang]||item.id)};
  }
  getState(){return {supported:this.supported,initialized:this.initialized,authorized:this.authorized,contextState:this.context?.state||'uninitialized',section:this.section,objectId:this.objectId,objectType:this.objectType,profileId:this.currentProfile?.id||null,profile:this.currentProfile,previewProfileId:this.previewSession?.profile?.id||null,settings:structuredClone(this.settings),musicPlaying:this.musicPlaying,gameActive:this.gameActive,duckFactor:this.getDuckFactor(),duckFactors:this.getDuckFactors(),finalGains:this.getFinalGains(),activeLayers:((this.previewSession || this.activeSession)?.loadedAssets||[]),activeSessionCount:Number(Boolean(this.activeSession))+Number(Boolean(this.previewSession)),lastError:this.lastError,loadErrors:[...this.loadErrors],metrics:{...this.metrics}};}
  subscribe(listener){this.listeners.add(listener);listener(this.getState());return()=>this.listeners.delete(listener);}
  emit(extra={}){const state={...this.getState(),...extra};this.listeners.forEach(listener=>listener(state));if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('cosmic-explorer:ambient-audio-state',{detail:state}));this.syncDiagnosticsPanel();}
}

export const ambientAudioManager = new AmbientAudioManager();
