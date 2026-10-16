export function registerVisibilityObserver() {
  const update = () => {
    document.documentElement.dataset.visibility = document.hidden ? 'hidden' : 'visible';
    document.dispatchEvent(new CustomEvent('cosmic-explorer:visibility', {
      detail: { hidden: document.hidden }
    }));
  };
  document.addEventListener('visibilitychange', update);
  update();
  return () => document.removeEventListener('visibilitychange', update);
}
