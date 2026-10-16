import { createStorage } from '../services/storage.js';

const storage = typeof window !== 'undefined' ? createStorage('app', 1) : null;
const preferredLanguage = typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en';

const PLANET_IDS = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];
const STAR_IDS = ['sun','sirius','vega','betelgeuse','rigel','polaris','proxima-centauri','antares'];
const GALLERY_IDS = [
  'black-hole-accretion-disk','quasar','blazar','tidal-disruption-event','pulsar','magnetar','supernova',
  'supernova-remnant','neutron-star-merger-kilonova','protostar-protoplanetary-disk','planetary-nebula','cosmic-web',
  'wolf-rayet-star','vampire-star-system','herbig-haro-stellar-jet','gamma-ray-burst'
];
const VALID_OBJECT_KEYS = new Set([
  ...PLANET_IDS.map((id) => `planet:${id}`),
  ...STAR_IDS.map((id) => `star:${id}`),
  ...GALLERY_IDS.map((id) => `gallery:${id}`)
]);
const ROUTES = new Set(['/home','/favorites','/universe','/gallery','/music-space','/cosmic-defender']);
const REPEAT_VALUES = new Set(['off','all','one']);
const MINI_PLAYER_MODES = new Set(['bar','floating']);
const VISUALIZERS = new Set(['orbit','bars','wave','black-hole','constellation']);
const BACKDROPS = new Set(['galaxy','solar','blackhole','nebula']);
const ACCENTS = new Set(['violet','aqua','rose','gold','custom','rgb']);

export const defaultAppState = Object.freeze({
  language: preferredLanguage,
  animationsEnabled: true,
  soundEnabled: false,
  volume: 0.7,
  musicCurrentTrackId: null,
  musicShuffle: false,
  musicRepeat: 'off',
  miniPlayerVisible: true,
  miniPlayerMode: 'bar',
  miniPlayerPosition: { x: null, y: null },
  musicVisualizer: 'orbit',
  backdropTheme: 'galaxy',
  accentTheme: 'violet',
  customAccentColor: '#8b5cf6',
  lastVisitedRoute: '/home',
  favorites: [],
  visitedObjects: []
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function nullableCoordinate(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function sanitizeObjectKeys(value, limit) {
  if (!Array.isArray(value)) return [];
  const result = [];
  const seen = new Set();
  for (const item of value) {
    const key = String(item ?? '');
    if (!VALID_OBJECT_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
    if (result.length >= limit) break;
  }
  return result;
}

function enumValue(value, allowed, fallback) {
  const normalized = String(value ?? '');
  return allowed.has(normalized) ? normalized : fallback;
}

export function normalizeAppState(candidate = {}) {
  const source = isPlainObject(candidate) ? candidate : {};
  const position = isPlainObject(source.miniPlayerPosition) ? source.miniPlayerPosition : {};
  const routeCandidate = String(source.lastVisitedRoute ?? '').split('?')[0];
  const trackId = typeof source.musicCurrentTrackId === 'string' && source.musicCurrentTrackId.trim()
    ? source.musicCurrentTrackId.trim().slice(0, 200)
    : null;

  return {
    language: source.language === 'es' || source.language === 'en' ? source.language : defaultAppState.language,
    animationsEnabled: typeof source.animationsEnabled === 'boolean' ? source.animationsEnabled : defaultAppState.animationsEnabled,
    soundEnabled: typeof source.soundEnabled === 'boolean' ? source.soundEnabled : defaultAppState.soundEnabled,
    volume: clampNumber(source.volume, 0, 1, defaultAppState.volume),
    musicCurrentTrackId: trackId,
    musicShuffle: typeof source.musicShuffle === 'boolean' ? source.musicShuffle : defaultAppState.musicShuffle,
    musicRepeat: enumValue(source.musicRepeat, REPEAT_VALUES, defaultAppState.musicRepeat),
    miniPlayerVisible: typeof source.miniPlayerVisible === 'boolean' ? source.miniPlayerVisible : defaultAppState.miniPlayerVisible,
    miniPlayerMode: enumValue(source.miniPlayerMode, MINI_PLAYER_MODES, defaultAppState.miniPlayerMode),
    miniPlayerPosition: { x: nullableCoordinate(position.x), y: nullableCoordinate(position.y) },
    musicVisualizer: enumValue(source.musicVisualizer, VISUALIZERS, defaultAppState.musicVisualizer),
    backdropTheme: enumValue(source.backdropTheme, BACKDROPS, defaultAppState.backdropTheme),
    accentTheme: enumValue(source.accentTheme, ACCENTS, defaultAppState.accentTheme),
    customAccentColor: /^#[0-9a-f]{6}$/i.test(String(source.customAccentColor ?? ''))
      ? String(source.customAccentColor).toLowerCase()
      : defaultAppState.customAccentColor,
    lastVisitedRoute: ROUTES.has(routeCandidate) ? routeCandidate : defaultAppState.lastVisitedRoute,
    favorites: sanitizeObjectKeys(source.favorites, VALID_OBJECT_KEYS.size),
    visitedObjects: sanitizeObjectKeys(source.visitedObjects, VALID_OBJECT_KEYS.size)
  };
}

let state = normalizeAppState(storage?.read('state', {}) ?? {});
const listeners = new Set();

function emit() {
  const snapshot = structuredClone(state);
  listeners.forEach((listener) => listener(snapshot));
}

export const appStore = {
  getState() {
    return structuredClone(state);
  },
  setState(partial) {
    state = normalizeAppState({ ...state, ...(isPlainObject(partial) ? partial : {}) });
    storage?.write('state', state);
    emit();
  },
  subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  reset() {
    state = normalizeAppState(defaultAppState);
    storage?.write('state', state);
    emit();
  }
};
