function dataProperty(attributeName) {
  return attributeName.replace(/^data-/, '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function resolveCelestialTrigger({ root, target, dataAttribute, visualSelector }) {
  if (!root || !target?.closest) return null;
  const trigger = target.closest(`[${dataAttribute}]`);
  if (!trigger || !root.contains(trigger)) return null;
  const id = trigger.dataset?.[dataProperty(dataAttribute)];
  if (!id) return null;
  const visual = target.closest(visualSelector);
  return { id, origin: visual || trigger };
}

export function applyPlanetRendererVisibility(modal, { usingEarthRenderer, standardUsesFallback }) {
  const standardCanvas = modal.querySelector('.planet-canvas');
  const earthCanvas = modal.querySelector('.earth-three-canvas');
  const fallback = modal.querySelector('.planet-fallback');
  standardCanvas.hidden = usingEarthRenderer || standardUsesFallback;
  earthCanvas.hidden = !usingEarthRenderer;
  fallback.hidden = usingEarthRenderer || !standardUsesFallback;
}
