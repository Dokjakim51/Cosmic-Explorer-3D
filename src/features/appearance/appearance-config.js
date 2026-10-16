export const APPEARANCE_STORAGE_KEY = 'cosmic-explorer-appearance-v1';
export const APPEARANCE_VERSION = 1;

export const APPEARANCE_SECTIONS = Object.freeze([
  'home',
  'universe',
  'gallery',
  'music-space',
  'cosmic-defender'
]);

export const BACKGROUNDS = Object.freeze({
  galaxy: { id: 'galaxy', name: { es: 'Galaxia', en: 'Galaxy' }, cost: 2 },
  solar: { id: 'solar', name: { es: 'Sistema Solar', en: 'Solar System' }, cost: 2 },
  blackhole: { id: 'blackhole', name: { es: 'Agujero negro', en: 'Black hole' }, cost: 2 },
  nebula: { id: 'nebula', name: { es: 'Nebulosa', en: 'Nebula' }, cost: 2 },
  'deep-space': { id: 'deep-space', name: { es: 'Espacio profundo', en: 'Deep space' }, cost: 1 },
  supernova: { id: 'supernova', name: { es: 'Supernova', en: 'Supernova' }, cost: 3 },
  'cosmic-web': { id: 'cosmic-web', name: { es: 'Red cósmica', en: 'Cosmic web' }, cost: 2 },
  'kira-interface': { id: 'kira-interface', name: { es: 'Interfaz Kira', en: 'Kira Interface' }, cost: 2 }
});

export const PERFORMANCE_PROFILES = Object.freeze({
  performance: {
    id: 'performance',
    name: { es: 'Rendimiento', en: 'Performance' },
    effects: {
      bloom: 24,
      particles: 18,
      particleSpeed: 18,
      backgroundMotion: 14,
      panelBlur: 4,
      transparency: 18,
      ambientBrightness: 42,
      nebulaIntensity: 30,
      glow: 28,
      pixelRatio: 1,
      layerQuality: 1,
      rgbAnimation: false
    }
  },
  balanced: {
    id: 'balanced',
    name: { es: 'Equilibrado', en: 'Balanced' },
    effects: {
      bloom: 58,
      particles: 56,
      particleSpeed: 42,
      backgroundMotion: 40,
      panelBlur: 16,
      transparency: 32,
      ambientBrightness: 58,
      nebulaIntensity: 62,
      glow: 62,
      pixelRatio: 1.5,
      layerQuality: 2,
      rgbAnimation: false
    }
  },
  high: {
    id: 'high',
    name: { es: 'Calidad alta', en: 'High quality' },
    effects: {
      bloom: 82,
      particles: 92,
      particleSpeed: 58,
      backgroundMotion: 58,
      panelBlur: 24,
      transparency: 42,
      ambientBrightness: 72,
      nebulaIntensity: 88,
      glow: 86,
      pixelRatio: 2,
      layerQuality: 3,
      rgbAnimation: false
    }
  }
});

const ORIGINAL_COLORS = Object.freeze({
  accent: '#a855f7',
  secondary: '#38bdf8',
  accentSoft: '#e879f9',
  panel: '#080f28',
  panelSolid: '#0f1737',
  border: '#7c8ab0',
  textPrimary: '#f8fafc',
  textSecondary: '#cbd5e1',
  backgroundPrimary: '#030712',
  backgroundSecondary: '#070b1d'
});

const ORIGINAL_INTERFACE = Object.freeze({
  cards: 'balanced',
  radius: 'rounded',
  density: 'normal',
  textSize: 'normal',
  scale: 100,
  interfaceMotion: true,
  decorations: true
});

const ORIGINAL_ACCESSIBILITY = Object.freeze({
  reduceMotion: false,
  highContrast: false,
  reduceTransparency: false,
  reduceBloom: false,
  removeFlashes: false,
  focusVisible: true,
  reduceParticles: false,
  autoContrast: true
});

function makeGlobal({ themeId = 'cosmic-explorer-original', background = 'galaxy', colors = {}, profile = 'balanced', effects = {}, interface: ui = {}, accessibility = {} } = {}) {
  return {
    themeId,
    background,
    colors: { ...ORIGINAL_COLORS, ...colors },
    effects: { ...PERFORMANCE_PROFILES[profile].effects, ...effects },
    interface: { ...ORIGINAL_INTERFACE, ...ui },
    accessibility: { ...ORIGINAL_ACCESSIBILITY, ...accessibility }
  };
}

export const PRESET_THEMES = Object.freeze({
  'cosmic-explorer-original': {
    id: 'cosmic-explorer-original',
    name: { es: 'Cosmic Explorer Original', en: 'Cosmic Explorer Original' },
    description: { es: 'La apariencia original preservada como punto seguro.', en: 'The preserved original appearance and safe restore point.' },
    config: makeGlobal()
  },
  'cosmic-violet': {
    id: 'cosmic-violet',
    name: { es: 'Cosmic Violet', en: 'Cosmic Violet' },
    description: { es: 'Nebulosa violeta, azul oscuro y reflejos rosados.', en: 'Violet nebula, deep blue, and pink highlights.' },
    config: makeGlobal({
      themeId: 'cosmic-violet', background: 'nebula',
      colors: { accent: '#a855f7', secondary: '#38bdf8', accentSoft: '#f472b6', panel: '#090c2a', panelSolid: '#15113c', border: '#9b8cff' },
      effects: { bloom: 68, nebulaIntensity: 80, glow: 76 }
    })
  },
  'solar-gold': {
    id: 'solar-gold',
    name: { es: 'Solar Gold', en: 'Solar Gold' },
    description: { es: 'Dorado, naranja y negro con iluminación solar cálida.', en: 'Gold, orange, and black with warm solar lighting.' },
    config: makeGlobal({
      themeId: 'solar-gold', background: 'solar',
      colors: { accent: '#f59e0b', secondary: '#fcd34d', accentSoft: '#fb923c', panel: '#171006', panelSolid: '#2a1a08', border: '#d7a441' },
      effects: { bloom: 64, ambientBrightness: 66, glow: 72 }
    })
  },
  'event-horizon': {
    id: 'event-horizon',
    name: { es: 'Event Horizon', en: 'Event Horizon' },
    description: { es: 'Negro profundo, rojo oscuro y disco de acreción.', en: 'Deep black, dark red, and an accretion disk.' },
    config: makeGlobal({
      themeId: 'event-horizon', background: 'blackhole',
      colors: { accent: '#f97316', secondary: '#ef4444', accentSoft: '#fbbf24', panel: '#080606', panelSolid: '#1a0b08', border: '#a3482c' },
      effects: { bloom: 54, ambientBrightness: 40, glow: 68 },
      accessibility: { highContrast: true }
    })
  },
  'frozen-neptune': {
    id: 'frozen-neptune',
    name: { es: 'Frozen Neptune', en: 'Frozen Neptune' },
    description: { es: 'Azul profundo, cian y partículas frías.', en: 'Deep blue, cyan, and cold particles.' },
    config: makeGlobal({
      themeId: 'frozen-neptune', background: 'deep-space',
      colors: { accent: '#22d3ee', secondary: '#60a5fa', accentSoft: '#a5f3fc', panel: '#061526', panelSolid: '#0a2944', border: '#4fb9d1' },
      effects: { particles: 48, particleSpeed: 54, bloom: 44, glow: 64 }
    })
  },
  'saturnian-elegance': {
    id: 'saturnian-elegance',
    name: { es: 'Saturnian Elegance', en: 'Saturnian Elegance' },
    description: { es: 'Beige, dorado y crema con detalles orbitales.', en: 'Beige, gold, and cream with orbital details.' },
    config: makeGlobal({
      themeId: 'saturnian-elegance', background: 'solar',
      colors: { accent: '#d6b36a', secondary: '#f4dfb0', accentSoft: '#c99152', panel: '#17140f', panelSolid: '#2b251b', border: '#b99b61', textPrimary: '#fffaf0', textSecondary: '#ddd2bb' },
      effects: { bloom: 42, particles: 38, ambientBrightness: 62 },
      interface: { cards: 'solid', radius: 'soft' }
    })
  },
  'kira-interface': {
    id: 'kira-interface',
    name: { es: 'Kira Interface', en: 'Kira Interface' },
    description: { es: 'Cian, violeta y paneles futuristas inspirados en Kira.', en: 'Cyan, violet, and futuristic panels inspired by Kira.' },
    config: makeGlobal({
      themeId: 'kira-interface', background: 'kira-interface',
      colors: { accent: '#42e8ff', secondary: '#9b72ff', accentSoft: '#d06cff', panel: '#06131d', panelSolid: '#0a2030', border: '#4ed9ee' },
      effects: { bloom: 66, particles: 50, backgroundMotion: 30, glow: 82 },
      interface: { cards: 'balanced', radius: 'soft', density: 'compact' }
    })
  }
});

export function cloneAppearance(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createDefaultAppearance() {
  const global = cloneAppearance(PRESET_THEMES['cosmic-explorer-original'].config);
  return {
    version: APPEARANCE_VERSION,
    mode: 'global',
    activeTheme: 'cosmic-explorer-original',
    performanceProfile: 'balanced',
    global,
    sections: Object.fromEntries(APPEARANCE_SECTIONS.map((section) => [section, cloneAppearance(global)])),
    customThemes: []
  };
}

export function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

export function normalizeHexColor(value, fallback = '#a855f7') {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  if (/^#[0-9a-f]{3}$/i.test(withHash)) {
    return `#${withHash.slice(1).split('').map((char) => `${char}${char}`).join('')}`.toLowerCase();
  }
  if (isHexColor(withHash)) return withHash.toLowerCase();
  return fallback;
}

export function hexToRgb(hex) {
  const normalized = normalizeHexColor(hex).slice(1);
  const value = Number.parseInt(normalized, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex(r, g, b) {
  const clamp = (value) => Math.min(255, Math.max(0, Number.parseInt(value, 10) || 0));
  return `#${[r, g, b].map((value) => clamp(value).toString(16).padStart(2, '0')).join('')}`;
}

function linearizeChannel(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(left, right) {
  const luminance = (hex) => {
    const { r, g, b } = hexToRgb(hex);
    return 0.2126 * linearizeChannel(r) + 0.7152 * linearizeChannel(g) + 0.0722 * linearizeChannel(b);
  };
  const a = luminance(left);
  const b = luminance(right);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function sanitizeConfig(config, fallback) {
  const profile = PERFORMANCE_PROFILES.balanced.effects;
  const next = cloneAppearance(fallback);
  const source = config && typeof config === 'object' ? config : {};
  next.themeId = String(source.themeId || next.themeId);
  next.background = BACKGROUNDS[source.background] ? source.background : next.background;
  for (const key of Object.keys(next.colors)) next.colors[key] = normalizeHexColor(source.colors?.[key], next.colors[key]);
  for (const key of Object.keys(next.effects)) {
    if (key === 'rgbAnimation') {
      next.effects[key] = Boolean(source.effects?.[key] ?? next.effects[key]);
      continue;
    }
    const max = key === 'pixelRatio' ? 2 : key === 'layerQuality' ? 3 : key === 'panelBlur' ? 36 : 100;
    const min = key === 'pixelRatio' || key === 'layerQuality' ? 1 : 0;
    next.effects[key] = clampNumber(source.effects?.[key], min, max, next.effects[key] ?? profile[key]);
  }
  next.interface = { ...next.interface, ...(source.interface || {}) };
  next.interface.cards = ['transparent', 'balanced', 'solid'].includes(next.interface.cards) ? next.interface.cards : fallback.interface.cards;
  next.interface.radius = ['straight', 'soft', 'rounded'].includes(next.interface.radius) ? next.interface.radius : fallback.interface.radius;
  next.interface.density = ['compact', 'normal', 'spacious'].includes(next.interface.density) ? next.interface.density : fallback.interface.density;
  next.interface.textSize = ['small', 'normal', 'large', 'xlarge'].includes(next.interface.textSize) ? next.interface.textSize : fallback.interface.textSize;
  next.interface.scale = clampNumber(next.interface.scale, 85, 120, 100);
  next.interface.interfaceMotion = Boolean(next.interface.interfaceMotion);
  next.interface.decorations = Boolean(next.interface.decorations);
  next.accessibility = { ...next.accessibility, ...(source.accessibility || {}) };
  for (const key of Object.keys(next.accessibility)) next.accessibility[key] = Boolean(next.accessibility[key]);
  return next;
}

export function sanitizeAppearance(value) {
  const fallback = createDefaultAppearance();
  if (!value || typeof value !== 'object' || Number(value.version) !== APPEARANCE_VERSION) return fallback;
  const global = sanitizeConfig(value.global, fallback.global);
  const sections = {};
  for (const section of APPEARANCE_SECTIONS) sections[section] = sanitizeConfig(value.sections?.[section], global);
  const customThemes = Array.isArray(value.customThemes)
    ? value.customThemes.filter((item) => item && item.id && item.name && item.config).slice(0, 24).map((item) => {
        const mode = item.mode === 'section' ? 'section' : 'global';
        const config = sanitizeConfig(item.config, global);
        const sections = mode === 'section'
          ? Object.fromEntries(APPEARANCE_SECTIONS.map((section) => [section, sanitizeConfig(item.sections?.[section], config)]))
          : null;
        return {
          id: String(item.id),
          name: String(item.name).trim().slice(0, 40),
          createdAt: item.createdAt || new Date().toISOString(),
          mode,
          section: APPEARANCE_SECTIONS.includes(item.section) ? item.section : null,
          config,
          sections
        };
      })
    : [];
  return {
    version: APPEARANCE_VERSION,
    mode: value.mode === 'section' ? 'section' : 'global',
    activeTheme: String(value.activeTheme || global.themeId || 'cosmic-explorer-original'),
    performanceProfile: PERFORMANCE_PROFILES[value.performanceProfile] ? value.performanceProfile : 'balanced',
    global,
    sections,
    customThemes
  };
}

export function resolvePreset(themeId, customThemes = []) {
  if (PRESET_THEMES[themeId]) return PRESET_THEMES[themeId];
  const custom = customThemes.find((item) => item.id === themeId);
  return custom ? {
    id: custom.id,
    name: { es: custom.name, en: custom.name },
    description: { es: 'Tema personalizado', en: 'Custom theme' },
    config: custom.config,
    mode: custom.mode,
    section: custom.section,
    sections: custom.sections
  } : null;
}
