export function registerCosmicPointer() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  const root = document.documentElement;
  let frame = 0;
  const update = (event) => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      root.style.setProperty('--pointer-x', `${event.clientX}px`);
      root.style.setProperty('--pointer-y', `${event.clientY}px`);
    });
  };
  window.addEventListener('pointermove', update, { passive: true });
  return () => {
    window.removeEventListener('pointermove', update);
    if (frame) cancelAnimationFrame(frame);
  };
}
