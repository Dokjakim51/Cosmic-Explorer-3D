import {
  APPEARANCE_SECTIONS,
  APPEARANCE_STORAGE_KEY,
  BACKGROUNDS,
  PERFORMANCE_PROFILES,
  PRESET_THEMES,
  cloneAppearance,
  contrastRatio,
  createDefaultAppearance,
  resolvePreset,
  sanitizeAppearance
} from './appearance-config.js';

function clamp(value, min, max) { return Math.min(max, Math.max(min, Number(value) || 0)); }
function rgba(hex, alpha) {
  const value = Number.parseInt(String(hex).slice(1), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function mix(left, right, amount = 0.5) {
  const parse = (hex) => {
    const value = Number.parseInt(String(hex).slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  };
  const [lr, lg, lb] = parse(left);
  const [rr, rg, rb] = parse(right);
  const value = [lr, lg, lb].map((channel, index) => Math.round(channel + ([rr, rg, rb][index] - channel) * amount));
  return `#${value.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

function routeToSection(path = '') {
  const normalized = String(path).replace(/^#?\//, '').split('?')[0];
  if (APPEARANCE_SECTIONS.includes(normalized)) return normalized;
  if (normalized === 'favorites') return 'favorites';
  return 'home';
}

function migrateLegacyAppearance() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('cosmic-explorer:app:v1:state');
    if (!raw) return null;
    const legacy = JSON.parse(raw);
    const state = createDefaultAppearance();
    const backgroundMap = { galaxy:'galaxy', solar:'solar', blackhole:'blackhole', nebula:'nebula' };
    if (backgroundMap[legacy.backdropTheme]) state.global.background = backgroundMap[legacy.backdropTheme];
    const accentMap = {
      violet:['#a855f7','#38bdf8','#e879f9'],
      aqua:['#22d3ee','#67e8f9','#a5f3fc'],
      rose:['#f472b6','#c4b5fd','#fb7185'],
      gold:['#f59e0b','#fde68a','#fdba74']
    };
    const palette = legacy.accentTheme === 'custom'
      ? [String(legacy.customAccentColor || '#8b5cf6'), '#38bdf8', '#e879f9']
      : accentMap[legacy.accentTheme];
    if (palette) {
      state.global.colors.accent = palette[0];
      state.global.colors.secondary = palette[1];
      state.global.colors.accentSoft = palette[2];
      state.global.themeId = 'legacy-customized';
      state.activeTheme = 'legacy-customized';
    }
    if (legacy.accentTheme === 'rgb') state.global.effects.rgbAnimation = true;
    for (const section of APPEARANCE_SECTIONS) state.sections[section] = cloneAppearance(state.global);
    return sanitizeAppearance(state);
  } catch { return null; }
}

function readStorage() {
  if (typeof localStorage === 'undefined') return { state: createDefaultAppearance(), recovered: false };
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return { state: migrateLegacyAppearance() || createDefaultAppearance(), recovered: false };
    const parsed = JSON.parse(raw);
    const state = sanitizeAppearance(parsed);
    const recovered = JSON.stringify(parsed) !== JSON.stringify(state);
    return { state, recovered };
  } catch {
    return { state: createDefaultAppearance(), recovered: true };
  }
}

function writeStorage(state) {
  try { localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(state)); return true; } catch { return false; }
}

function effectiveConfig(state, section) {
  if (state.mode === 'section' && state.sections?.[section]) return state.sections[section];
  return state.global;
}

function applyVariables(root, config, state) {
  const colors = config.colors;
  const effects = config.effects;
  const accessibility = config.accessibility;
  const panelAlpha = accessibility.reduceTransparency ? 0.96 : 0.58 + effects.transparency / 250;
  const panelSolidAlpha = accessibility.reduceTransparency ? 0.99 : 0.78 + effects.transparency / 500;
  const bloom = accessibility.reduceBloom ? Math.min(28, effects.bloom) : effects.bloom;
  const particles = accessibility.reduceParticles ? Math.min(14, effects.particles) : effects.particles;
  const movement = accessibility.reduceMotion ? 0 : effects.backgroundMotion;
  const blur = accessibility.reduceTransparency ? 0 : effects.panelBlur;
  const glow = accessibility.reduceBloom ? Math.min(32, effects.glow) : effects.glow;
  const textPrimary = accessibility.highContrast ? '#ffffff' : colors.textPrimary;
  const textSecondary = accessibility.highContrast ? '#e7edf8' : colors.textSecondary;
  const accentTextRatio = contrastRatio(colors.accent, '#ffffff');
  const buttonText = accessibility.autoContrast ? (accentTextRatio >= 4.5 ? '#ffffff' : '#07101f') : '#ffffff';

  const variables = {
    '--appearance-accent': colors.accent,
    '--appearance-secondary': colors.secondary,
    '--appearance-soft': colors.accentSoft,
    '--appearance-panel': rgba(colors.panel, panelAlpha),
    '--appearance-panel-solid': rgba(colors.panelSolid, panelSolidAlpha),
    '--appearance-border': rgba(colors.border, accessibility.highContrast ? 0.74 : 0.28 + glow / 240),
    '--appearance-text-primary': textPrimary,
    '--appearance-text-secondary': textSecondary,
    '--appearance-background-primary': colors.backgroundPrimary,
    '--appearance-background-secondary': colors.backgroundSecondary,
    '--appearance-button-text': buttonText,
    '--appearance-bloom': `${bloom / 100}`,
    '--appearance-particles': `${particles / 100}`,
    '--appearance-particle-speed': `${effects.particleSpeed / 100}`,
    '--appearance-motion': `${movement / 100}`,
    '--appearance-panel-blur': `${blur}px`,
    '--appearance-ambient': `${effects.ambientBrightness / 100}`,
    '--appearance-nebula': `${effects.nebulaIntensity / 100}`,
    '--appearance-glow': `${glow / 100}`,
    '--appearance-scale': `${config.interface.scale / 100}`,
    '--appearance-pixel-ratio': String(effects.pixelRatio),
    '--appearance-layer-quality': String(effects.layerQuality),
    '--background-primary': colors.backgroundPrimary,
    '--background-secondary': colors.backgroundSecondary,
    '--blue-primary': mix(colors.accent, '#2563eb', 0.42),
    '--blue-light': colors.secondary,
    '--purple-primary': mix(colors.accent, '#4c1d95', 0.34),
    '--violet': colors.accent,
    '--cosmic-pink': colors.accentSoft,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-muted': mix(textSecondary, colors.backgroundPrimary, 0.28),
    '--glass-background': rgba(colors.panel, panelAlpha),
    '--glass-background-light': rgba(colors.panelSolid, Math.max(0.5, panelAlpha - 0.12)),
    '--glass-border': rgba(colors.border, accessibility.highContrast ? 0.62 : 0.22),
    '--glass-border-bright': rgba(colors.accent, 0.48),
    '--gradient-primary': `linear-gradient(135deg, ${colors.accentSoft} 0%, ${colors.accent} 42%, ${colors.secondary} 100%)`,
    '--gradient-panel': `linear-gradient(145deg, ${rgba(colors.panelSolid, panelSolidAlpha)}, ${rgba(colors.panel, panelAlpha)})`,
    '--shadow-cosmic': `0 0 ${18 + glow * 0.22}px ${rgba(colors.accent, 0.18 + glow / 340)}, 0 0 ${38 + glow * 0.36}px ${rgba(colors.secondary, 0.12 + glow / 520)}`,
    '--panel-blur': `${blur}px`,
    '--glow-strength': `${glow / 100}`,
    '--interface-scale': `${config.interface.scale / 100}`
  };
  for (const [name, value] of Object.entries(variables)) root.style.setProperty(name, value);

  root.dataset.appearanceTheme = config.themeId;
  root.dataset.backdropTheme = config.background;
  root.dataset.performanceProfile = state.performanceProfile;
  root.dataset.cardStyle = config.interface.cards;
  root.dataset.radiusStyle = config.interface.radius;
  root.dataset.density = config.interface.density;
  root.dataset.textSize = config.interface.textSize;
  root.dataset.reducedMotion = String(accessibility.reduceMotion);
  root.dataset.highContrast = String(accessibility.highContrast);
  root.dataset.reduceTransparency = String(accessibility.reduceTransparency);
  root.dataset.removeFlashes = String(accessibility.removeFlashes);
  root.dataset.focusVisible = String(accessibility.focusVisible);
  root.dataset.decorations = String(config.interface.decorations);
  root.dataset.interfaceMotion = String(config.interface.interfaceMotion && !accessibility.reduceMotion);
  root.dataset.rgbAnimation = String(Boolean(config.effects.rgbAnimation) && !accessibility.reduceMotion && !accessibility.removeFlashes);
  root.dataset.layerQuality = String(effects.layerQuality);
}

class AppearanceManager {
  constructor() {
    const loaded = readStorage();
    this.appliedAppearance = loaded.state;
    this.draftAppearance = cloneAppearance(loaded.state);
    this.listeners = new Set();
    this.section = routeToSection(typeof location !== 'undefined' ? location.hash : '/home');
    this.previewing = false;
    this.initialized = false;
    this.recovered = loaded.recovered;
    this.handleRoute = this.handleRoute.bind(this);
    this.handleMedia = this.handleMedia.bind(this);
  }

  init() {
    if (this.initialized || typeof document === 'undefined') return this;
    this.initialized = true;
    document.addEventListener('cosmic-explorer:route-change', this.handleRoute);
    this.motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)') || null;
    this.motionQuery?.addEventListener?.('change', this.handleMedia);
    this.apply(this.appliedAppearance);
    if (this.recovered) writeStorage(this.appliedAppearance);
    if (this.recovered) queueMicrotask(() => document.dispatchEvent(new CustomEvent('cosmic-explorer:appearance-notice', { detail: { type: 'recovered' } })));
    window.cosmicExplorerAppearance = this.publicApi();
    return this;
  }

  destroy() {
    document.removeEventListener('cosmic-explorer:route-change', this.handleRoute);
    this.motionQuery?.removeEventListener?.('change', this.handleMedia);
    delete window.cosmicExplorerAppearance;
    this.initialized = false;
  }

  publicApi() {
    return {
      getApplied: () => this.getApplied(),
      getEffective: (section) => this.getEffective(section),
      getSummary: (language) => this.getSummary(language),
      openPanel: () => document.dispatchEvent(new CustomEvent('cosmic-explorer:appearance-open')),
      resetAll: () => { this.beginDraft(); this.resetDraft('all'); this.applyDraft(); }
    };
  }

  handleRoute(event) {
    this.section = routeToSection(event.detail?.path || location.hash);
    document.documentElement.dataset.appearanceSection = this.section;
    this.apply(this.previewing ? this.draftAppearance : this.appliedAppearance);
  }

  handleMedia() { this.apply(this.previewing ? this.draftAppearance : this.appliedAppearance); }

  getApplied() { return cloneAppearance(this.appliedAppearance); }
  getDraft() { return cloneAppearance(this.draftAppearance); }
  getEffective(section = this.section, source = this.previewing ? this.draftAppearance : this.appliedAppearance) { return cloneAppearance(effectiveConfig(source, section)); }

  beginDraft() {
    this.draftAppearance = cloneAppearance(this.appliedAppearance);
    this.previewing = true;
    this.apply(this.draftAppearance);
    this.emit('draft');
    return this.getDraft();
  }

  mutateDraft(mutator) {
    if (!this.previewing) this.beginDraft();
    const draft = cloneAppearance(this.draftAppearance);
    mutator(draft);
    this.draftAppearance = sanitizeAppearance(draft);
    this.apply(this.draftAppearance);
    this.emit('preview');
    return this.getDraft();
  }

  applyDraft() {
    this.appliedAppearance = sanitizeAppearance(this.draftAppearance);
    this.draftAppearance = cloneAppearance(this.appliedAppearance);
    this.previewing = false;
    writeStorage(this.appliedAppearance);
    this.apply(this.appliedAppearance);
    document.dispatchEvent(new CustomEvent('cosmic-explorer:appearance-change', { detail: { appearance: this.getApplied(), section: this.section } }));
    this.emit('applied');
    return this.getApplied();
  }

  cancelDraft() {
    this.draftAppearance = cloneAppearance(this.appliedAppearance);
    this.previewing = false;
    this.apply(this.appliedAppearance);
    this.emit('cancelled');
  }

  setMode(mode, sourceSection = null) {
    return this.mutateDraft((draft) => {
      if (mode === 'section' && draft.mode !== 'section') {
        draft.sections = Object.fromEntries(APPEARANCE_SECTIONS.map((section) => [section, cloneAppearance(draft.global)]));
      }
      if (mode === 'global' && sourceSection && draft.sections?.[sourceSection]) {
        draft.global = cloneAppearance(draft.sections[sourceSection]);
        draft.activeTheme = draft.global.themeId;
        for (const section of APPEARANCE_SECTIONS) draft.sections[section] = cloneAppearance(draft.global);
      }
      draft.mode = mode === 'section' ? 'section' : 'global';
    });
  }

  selectTheme(themeId, section = null) {
    return this.mutateDraft((draft) => {
      const preset = resolvePreset(themeId, draft.customThemes);
      if (!preset) return;
      const config = cloneAppearance(preset.config);
      config.themeId = themeId;
      if (preset.mode === 'section' && preset.sections) {
        draft.mode = 'section';
        draft.sections = cloneAppearance(preset.sections);
        draft.global = cloneAppearance(config);
        draft.activeTheme = themeId;
      } else if (section && draft.mode === 'section') draft.sections[section] = config;
      else {
        draft.global = config;
        draft.activeTheme = themeId;
        if (draft.mode === 'global') for (const name of APPEARANCE_SECTIONS) draft.sections[name] = cloneAppearance(config);
      }
    });
  }

  setPerformanceProfile(profileId) {
    const profile = PERFORMANCE_PROFILES[profileId];
    if (!profile) return this.getDraft();
    return this.mutateDraft((draft) => {
      draft.performanceProfile = profileId;
      draft.global.effects = { ...draft.global.effects, ...cloneAppearance(profile.effects) };
      for (const section of APPEARANCE_SECTIONS) {
        draft.sections[section].effects = { ...draft.sections[section].effects, ...cloneAppearance(profile.effects) };
      }
    });
  }

  updateConfig(section, updater) {
    return this.mutateDraft((draft) => {
      const target = section && draft.mode === 'section' ? draft.sections[section] : draft.global;
      updater(target, draft);
    });
  }

  resetDraft(scope = 'all', section = null) {
    return this.mutateDraft((draft) => {
      const original = cloneAppearance(PRESET_THEMES['cosmic-explorer-original'].config);
      const target = section && draft.mode === 'section' ? draft.sections[section] : draft.global;
      if (scope === 'all') {
        const defaults = createDefaultAppearance();
        Object.assign(draft, defaults, { customThemes: draft.customThemes });
      } else if (scope === 'background') target.background = original.background;
      else if (scope === 'colors') target.colors = cloneAppearance(original.colors);
      else if (scope === 'effects') target.effects = cloneAppearance(original.effects);
      else if (scope === 'interface') target.interface = cloneAppearance(original.interface);
      else if (scope === 'accessibility') target.accessibility = cloneAppearance(original.accessibility);
    });
  }

  saveCustomTheme(name, section = null) {
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!cleanName) return { ok: false, reason: 'empty' };
    const normalized = cleanName.toLowerCase();
    if (this.draftAppearance.customThemes.some((item) => item.name.toLowerCase() === normalized)) return { ok: false, reason: 'duplicate' };
    const id = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    this.mutateDraft((draft) => {
      const config = cloneAppearance(section && draft.mode === 'section' ? draft.sections[section] : draft.global);
      config.themeId = id;
      draft.customThemes.push({
        id,
        name: cleanName,
        createdAt: new Date().toISOString(),
        mode: draft.mode,
        section: draft.mode === 'section' ? section : null,
        config,
        sections: draft.mode === 'section' ? cloneAppearance(draft.sections) : null
      });
    });
    return { ok: true, id };
  }

  renameCustomTheme(id, name) {
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    if (!cleanName) return false;
    const normalized = cleanName.toLowerCase();
    if (this.draftAppearance.customThemes.some((theme) => theme.id !== id && theme.name.toLowerCase() === normalized)) return false;
    this.mutateDraft((draft) => { const item = draft.customThemes.find((theme) => theme.id === id); if (item) item.name = cleanName; });
    return true;
  }

  duplicateCustomTheme(id) {
    this.mutateDraft((draft) => {
      const item = draft.customThemes.find((theme) => theme.id === id);
      if (!item) return;
      const nextId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      let copyName = `${item.name} Copy`.slice(0, 40);
      let suffix = 2;
      while (draft.customThemes.some((theme) => theme.name.toLowerCase() === copyName.toLowerCase())) copyName = `${item.name} Copy ${suffix++}`.slice(0, 40);
      draft.customThemes.push({
        id: nextId,
        name: copyName,
        createdAt: new Date().toISOString(),
        mode: item.mode || 'global',
        section: item.section || null,
        config: cloneAppearance(item.config),
        sections: item.sections ? cloneAppearance(item.sections) : null
      });
    });
  }

  deleteCustomTheme(id) { this.mutateDraft((draft) => { draft.customThemes = draft.customThemes.filter((theme) => theme.id !== id); }); }

  apply(state) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const config = cloneAppearance(effectiveConfig(state, this.section));
    const prefersReduced = Boolean(this.motionQuery?.matches);
    if (prefersReduced && !config.accessibility.reduceMotion) config.accessibility = { ...config.accessibility, reduceMotion: true };
    root.dataset.appearanceMode = state.mode;
    root.dataset.appearanceSection = this.section;
    applyVariables(root, config, state);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', config.colors.backgroundPrimary);
  }

  getSummary(language = 'es') {
    const state = this.appliedAppearance;
    const config = cloneAppearance(effectiveConfig(state, this.section));
    const preset = resolvePreset(config.themeId, state.customThemes);
    const themeName = preset?.name?.[language] || preset?.name?.es || (config.themeId === 'custom-preview' || config.themeId === 'legacy-customized' ? (language === 'es' ? 'Personalizado' : 'Custom') : config.themeId);
    const profileName = PERFORMANCE_PROFILES[state.performanceProfile]?.name?.[language] || state.performanceProfile;
    const backgroundName = BACKGROUNDS[config.background]?.name?.[language] || config.background;
    return { themeId: config.themeId, themeName, profileId: state.performanceProfile, profileName, backgroundId: config.background, backgroundName, mode: state.mode, section: this.section };
  }

  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(type) { const snapshot = this.previewing ? this.getDraft() : this.getApplied(); for (const listener of this.listeners) listener({ type, state: snapshot }); }
}

export const appearanceManager = new AppearanceManager();
export { routeToSection };
