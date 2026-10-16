export function activateRevealAnimations(scope = document) {
  const nodes = [...scope.querySelectorAll('[data-reveal]')];
  if (!nodes.length) return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    nodes.forEach((node) => node.classList.add('is-visible'));
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });

  nodes.forEach((node) => observer.observe(node));
  return () => observer.disconnect();
}
