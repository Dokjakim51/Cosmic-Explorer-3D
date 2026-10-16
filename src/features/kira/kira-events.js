export const KIRA_CONTEXT_EVENT = 'cosmic-explorer:context-change';

function dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, {
    detail: detail ? structuredClone(detail) : null
  }));
}

export function emitKiraContextChange(detail) {
  dispatch(KIRA_CONTEXT_EVENT, detail || {});
}

export function emitKiraObjectContext(detail) {
  const objectId = detail?.objectId || detail?.id || null;
  const objectType = detail?.objectType || detail?.kind || null;
  const category = detail?.category || (
    objectType === 'planet' ? 'planet' :
    objectType === 'star' ? 'star' :
    objectType === 'gallery' || objectType === 'gallery-object' ? 'gallery-object' :
    objectType === 'game-level' ? 'game-level' : null
  );

  emitKiraContextChange({
    action: 'open-object',
    section: detail?.section || (category === 'gallery-object' ? 'gallery' : category === 'game-level' ? 'cosmic-defender' : 'universe'),
    category,
    objectId,
    objectType,
    name: detail?.name || objectId,
    route: detail?.route,
    meta: detail?.meta || {}
  });
}

export function clearKiraObjectContext(objectType = null) {
  emitKiraContextChange({ action: 'close-object', objectType });
}

export function emitKiraGameContext(detail) {
  const payload = structuredClone(detail || {});
  dispatch('cosmic-explorer:kira-game', payload);
  emitKiraContextChange({
    action: payload.levelId ? 'open-object' : 'section',
    section: 'cosmic-defender',
    category: payload.levelId ? 'game-level' : null,
    objectId: payload.levelId || null,
    objectType: payload.levelId ? 'game-level' : null,
    name: payload.levelName || payload.levelId || null,
    meta: {
      active: Boolean(payload.active),
      difficulty: payload.difficulty || 'normal',
      wave: Number(payload.wave || 0)
    }
  });
}
