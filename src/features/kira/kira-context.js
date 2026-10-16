import { getLanguage } from '../../i18n/i18n.js';
import { KIRA_CONTEXT_EVENT } from './kira-events.js';

const STORAGE_KEY = 'cosmic-explorer:kira-session:v3';
const LEGACY_STORAGE_KEYS = ['cosmic-explorer:kira-session:v2', 'cosmic-explorer:kira-session:v1'];

const ROUTE_SECTIONS = Object.freeze({
  '/home': 'home',
  '/favorites': 'favorites',
  '/universe': 'universe',
  '/gallery': 'gallery',
  '/music-space': 'music-space',
  '/cosmic-defender': 'cosmic-defender',
  '/404': 'unknown'
});

function safeReadKey(key) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function safeRead() {
  return safeReadKey(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map(safeReadKey).find(Boolean) || {};
}

function safeWrite(value) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // The in-memory store remains functional when sessionStorage is unavailable.
  }
}

function normalizeRoute(hash = window.location.hash) {
  const value = String(hash || '').replace(/^#/, '').split('?')[0].replace(/\/+$/, '');
  return value || '/home';
}

function normalizeEntityRef(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.objectId || value.id || '').trim();
  const type = String(value.objectType || value.type || value.kind || '').trim();
  if (!id || !type) return null;
  return { id, type };
}

function cloneObject(value) {
  if (!value || typeof value !== 'object') return null;
  const id = String(value.objectId || value.id || '').trim();
  const type = String(value.objectType || value.type || value.kind || 'object').trim();
  if (!id) return null;
  return {
    id,
    kind: type,
    type,
    category: String(value.category || type || ''),
    section: String(value.section || ''),
    name: String(value.name || id),
    route: String(value.route || normalizeRoute()),
    meta: value.meta && typeof value.meta === 'object' ? structuredClone(value.meta) : {}
  };
}

function uniqueRefs(values) {
  const result = [];
  for (const value of Array.isArray(values) ? values : []) {
    const ref = normalizeEntityRef(value);
    if (!ref) continue;
    if (!result.some((item) => item.id === ref.id && item.type === ref.type)) result.push(ref);
  }
  return result.slice(-8);
}

export function createKiraContext() {
  const saved = safeRead();
  const routeSection = ROUTE_SECTIONS[normalizeRoute()] || 'unknown';
  const savedCurrent = cloneObject(saved.currentObject);
  const savedPrevious = cloneObject(saved.previousObject) || savedCurrent;

  let state = {
    baseSection: routeSection,
    currentSection: routeSection,
    previousSection: saved.previousSection || null,
    currentCategory: null,
    currentObjectId: null,
    currentObjectType: null,
    previousObjectId: savedPrevious?.id || null,
    previousObjectType: savedPrevious?.type || null,
    currentObject: null,
    previousObject: savedPrevious,
    lastMentionedObjectIds: uniqueRefs(saved.lastMentionedObjectIds),
    lastComparisonPair: uniqueRefs(saved.lastComparisonPair).slice(-2),
    lastComparisonProperty: saved.lastComparisonProperty || null,
    lastIntent: saved.lastIntent || null,
    lastProperty: saved.lastProperty || saved.lastComparisonProperty || null,
    lastCategory: saved.lastCategory || null,
    lastSection: saved.lastSection || null,
    lastAnswerContext: saved.lastAnswerContext && typeof saved.lastAnswerContext === 'object' ? saved.lastAnswerContext : null,
    language: getLanguage(),
    isOpen: Boolean(saved.isOpen),
    isMinimized: Boolean(saved.isMinimized),
    game: saved.game && typeof saved.game === 'object'
      ? saved.game
      : { active: false, levelId: 'mercury', difficulty: 'normal', wave: 0 },
    music: saved.music && typeof saved.music === 'object'
      ? saved.music
      : { currentTrack: null, isPlaying: false }
  };

  const listeners = new Set();
  const controller = new AbortController();
  const { signal } = controller;
  let domScanFrame = 0;

  function snapshot() {
    return structuredClone(state);
  }

  function persist() {
    safeWrite({
      previousSection: state.previousSection,
      currentObject: state.currentObject,
      previousObject: state.previousObject,
      lastMentionedObjectIds: state.lastMentionedObjectIds,
      lastComparisonPair: state.lastComparisonPair,
      lastComparisonProperty: state.lastComparisonProperty,
      lastIntent: state.lastIntent,
      lastProperty: state.lastProperty,
      lastCategory: state.lastCategory,
      lastSection: state.lastSection,
      lastAnswerContext: state.lastAnswerContext,
      language: state.language,
      isOpen: state.isOpen,
      isMinimized: state.isMinimized,
      game: state.game,
      music: state.music
    });
  }

  function emit() {
    persist();
    const value = snapshot();
    listeners.forEach((listener) => listener(value));
  }

  function applyObject(nextObject) {
    const next = cloneObject(nextObject);
    if (!next?.id) return false;
    const same = state.currentObject?.id === next.id && state.currentObject?.type === next.type;

    if (!same && state.currentObject) {
      state.previousObject = state.currentObject;
      state.previousObjectId = state.currentObject.id;
      state.previousObjectType = state.currentObject.type;
      state.previousSection = state.currentSection;
    }

    state.currentObject = next;
    state.currentObjectId = next.id;
    state.currentObjectType = next.type;
    state.currentCategory = next.category || next.type;
    state.currentSection = next.section || state.baseSection;
    return !same;
  }

  function setRoute(path) {
    const section = ROUTE_SECTIONS[path] || 'unknown';
    const changed = section !== state.baseSection;
    if (changed) {
      state.previousSection = state.currentSection;
      if (state.currentObject) {
        state.previousObject = state.currentObject;
        state.previousObjectId = state.currentObject.id;
        state.previousObjectType = state.currentObject.type;
      }
      state.currentObject = null;
      state.currentObjectId = null;
      state.currentObjectType = null;
      state.currentCategory = null;
    }
    state.baseSection = section;
    state.currentSection = section;
    if (section !== 'cosmic-defender') state.game = { ...state.game, active: false };
    emit();
  }

  function setObject(detail) {
    const next = cloneObject({
      ...detail,
      id: detail?.objectId || detail?.id,
      type: detail?.objectType || detail?.type || detail?.kind,
      kind: detail?.objectType || detail?.type || detail?.kind,
      section: detail?.section || state.baseSection,
      category: detail?.category || detail?.objectType || detail?.kind
    });
    if (!next?.id) return;

    const same = state.currentObject?.id === next.id && state.currentObject?.type === next.type;
    if (same && JSON.stringify(state.currentObject) === JSON.stringify(next)) return;
    applyObject(next);
    emit();
  }

  function clearObject(type = null) {
    if (!state.currentObject) return;
    if (type && ![state.currentObject.type, state.currentObject.kind, state.currentObject.category].includes(type)) return;
    state.previousObject = state.currentObject;
    state.previousObjectId = state.currentObject.id;
    state.previousObjectType = state.currentObject.type;
    state.previousSection = state.currentSection;
    state.currentObject = null;
    state.currentObjectId = null;
    state.currentObjectType = null;
    state.currentCategory = null;
    state.currentSection = state.baseSection;
    emit();
  }

  function updateConversationMemory(patch = {}) {
    let changed = false;
    if (patch.lastMentionedObjectIds) {
      state.lastMentionedObjectIds = uniqueRefs(patch.lastMentionedObjectIds);
      changed = true;
    }
    if (patch.lastComparisonPair) {
      state.lastComparisonPair = uniqueRefs(patch.lastComparisonPair).slice(-2);
      changed = true;
    }
    if (Object.hasOwn(patch, 'lastComparisonProperty')) {
      state.lastComparisonProperty = patch.lastComparisonProperty || null;
      changed = true;
    }
    for (const key of ['lastIntent', 'lastProperty', 'lastCategory', 'lastSection']) {
      if (Object.hasOwn(patch, key)) {
        state[key] = patch[key] || null;
        changed = true;
      }
    }
    if (Object.hasOwn(patch, 'lastAnswerContext')) {
      state.lastAnswerContext = patch.lastAnswerContext && typeof patch.lastAnswerContext === 'object'
        ? structuredClone(patch.lastAnswerContext)
        : null;
      changed = true;
    }
    if (changed) emit();
  }

  function setUiState({ isOpen, isMinimized } = {}) {
    let changed = false;
    if (typeof isOpen === 'boolean' && isOpen !== state.isOpen) {
      state.isOpen = isOpen;
      changed = true;
    }
    if (typeof isMinimized === 'boolean' && isMinimized !== state.isMinimized) {
      state.isMinimized = isMinimized;
      changed = true;
    }
    if (changed) emit();
  }

  function detectDomObject() {
    domScanFrame = 0;
    const planetViewer = document.querySelector('.planet-viewer-overlay.is-open:not([hidden]):not(.star-viewer-overlay)');
    if (planetViewer?.dataset.planet) {
      setObject({ objectId: planetViewer.dataset.planet, objectType: 'planet', category: 'planet', section: 'universe', name: planetViewer.dataset.planet });
      return;
    }
    const starViewer = document.querySelector('.star-viewer-overlay.is-open:not([hidden])');
    if (starViewer?.dataset.star) {
      setObject({ objectId: starViewer.dataset.star, objectType: 'star', category: 'star', section: 'universe', name: starViewer.dataset.star });
      return;
    }
    const galleryViewer = document.querySelector('.gallery-viewer.is-open:not([hidden])');
    if (galleryViewer?.dataset.galleryId) {
      setObject({ objectId: galleryViewer.dataset.galleryId, objectType: 'gallery', category: 'gallery-object', section: 'gallery', name: galleryViewer.dataset.galleryId });
      return;
    }

    // Opening animations briefly expose a visible viewer before its `is-open`
    // class is applied. Do not erase explicit context during that transition.
    // A detailed object is cleared only when its matching viewer is truly hidden;
    // route changes and explicit close events continue to clear immediately.
    const currentType = state.currentObject?.type;
    const matchingViewer = currentType === 'planet'
      ? document.querySelector('.planet-viewer-overlay:not(.star-viewer-overlay)')
      : currentType === 'star'
        ? document.querySelector('.star-viewer-overlay')
        : currentType === 'gallery'
          ? document.querySelector('.gallery-viewer')
          : null;
    if (matchingViewer?.hidden && ['planet', 'star', 'gallery'].includes(currentType)) clearObject(currentType);
  }

  function scheduleDomScan() {
    if (domScanFrame) return;
    domScanFrame = requestAnimationFrame(detectDomObject);
  }

  const domObserver = new MutationObserver(scheduleDomScan);
  domObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'hidden', 'data-planet', 'data-star', 'data-gallery-id']
  });

  document.addEventListener('cosmic-explorer:route-change', (event) => {
    setRoute(event.detail?.path || normalizeRoute());
    scheduleDomScan();
  }, { signal });

  document.addEventListener(KIRA_CONTEXT_EVENT, (event) => {
    const detail = event.detail || {};
    if (detail.action === 'close-object') {
      clearObject(detail.objectType || null);
      return;
    }
    if (detail.action === 'section' && detail.section) {
      state.previousSection = state.currentSection;
      state.currentSection = detail.section;
      emit();
      return;
    }
    if (detail.objectId || detail.id) setObject(detail);
  }, { signal });

  // Legacy event support for older feature modules.
  document.addEventListener('cosmic-explorer:kira-object', (event) => setObject(event.detail), { signal });
  document.addEventListener('cosmic-explorer:kira-object-clear', (event) => clearObject(event.detail?.kind || null), { signal });

  document.addEventListener('cosmic-explorer:kira-game', (event) => {
    const detail = event.detail || {};
    state.game = { ...state.game, ...detail };
    if (detail.levelId) {
      setObject({
        objectId: detail.levelId,
        objectType: 'game-level',
        category: 'game-level',
        section: 'cosmic-defender',
        name: detail.levelName || detail.levelId,
        meta: { difficulty: detail.difficulty || 'normal', active: Boolean(detail.active), wave: Number(detail.wave || 0) }
      });
      return;
    }
    emit();
  }, { signal });

  window.addEventListener('cosmic-explorer:language-change', (event) => {
    state.language = event.detail?.language || getLanguage();
    emit();
  }, { signal });

  window.addEventListener('cosmic-explorer:music-state', (event) => {
    const detail = event.detail || {};
    state.music = {
      currentTrack: detail.currentTrack ? {
        id: detail.currentTrack.id,
        title: detail.currentTrack.title,
        artist: detail.currentTrack.artist
      } : null,
      isPlaying: Boolean(detail.isPlaying)
    };
    if (state.baseSection === 'music-space') state.currentSection = 'music-space';
    emit();
  }, { signal });

  setRoute(normalizeRoute());
  scheduleDomScan();

  return {
    getState: snapshot,
    subscribe(listener) {
      listeners.add(listener);
      listener(snapshot());
      return () => listeners.delete(listener);
    },
    updateConversationMemory,
    setUiState,
    destroy() {
      controller.abort();
      domObserver.disconnect();
      if (domScanFrame) cancelAnimationFrame(domScanFrame);
      listeners.clear();
    }
  };
}
