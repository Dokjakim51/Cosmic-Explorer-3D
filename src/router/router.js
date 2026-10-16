import { focusMainContent } from '../utils/focus.js';

export function normalizeRoute(hash) {
  const value = String(hash ?? '').replace(/^#/, '').trim();
  if (!value || value === '/') return '/home';
  const withSlash = value.startsWith('/') ? value : `/${value}`;
  return withSlash.replace(/\/+$/, '') || '/home';
}

export function getRoutePath(route) {
  return String(route || '/home').split('?')[0] || '/home';
}

function setNavigationState(routePath) {
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const active = link.getAttribute('href') === `#${routePath}`;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function renderLoading(outlet) {
  const language = document.documentElement.lang === 'es' ? 'es' : 'en';
  outlet.setAttribute('aria-busy', 'true');
  outlet.innerHTML = `<section class="route-status route-status--loading" role="status"><span class="route-status-orbit" aria-hidden="true"></span><p>${language === 'es' ? 'Cargando esta zona del universo…' : 'Loading this region of the universe…'}</p></section>`;
}

function renderRouteError(outlet, error) {
  const language = document.documentElement.lang === 'es' ? 'es' : 'en';
  outlet.removeAttribute('aria-busy');
  outlet.innerHTML = `
    <section class="route-status route-status--error" role="alert">
      <p class="eyebrow">${language === 'es' ? 'No se pudo abrir esta sección' : 'This section could not be opened'}</p>
      <h1>${language === 'es' ? 'La zona no terminó de cargar' : 'The area did not finish loading'}</h1>
      <p>${language === 'es' ? 'Comprueba que la instalación esté completa y vuelve a intentarlo.' : 'Check that the installation is complete and try again.'}</p>
      <div class="button-row">
        <button class="button button--primary" type="button" data-route-retry>${language === 'es' ? 'Reintentar' : 'Try again'}</button>
        <a class="button button--ghost" href="#/favorites">${language === 'es' ? 'Abrir Favoritos' : 'Open Favorites'}</a>
      </div>
    </section>`;
  outlet.querySelector('[data-route-retry]')?.addEventListener('click', () => window.dispatchEvent(new HashChangeEvent('hashchange')), { once: true });
  console.error('Cosmic Explorer route failed to render.', error);
}

export function createRouter({ outlet, routes }) {
  if (!(outlet instanceof HTMLElement)) throw new TypeError('Router outlet must be an HTMLElement.');

  let currentCleanup = null;
  let renderToken = 0;
  let destroyed = false;

  const cleanupCurrent = () => {
    if (typeof currentCleanup !== 'function') return;
    try {
      currentCleanup();
    } catch (error) {
      console.error('Cosmic Explorer route cleanup failed.', error);
    }
    currentCleanup = null;
  };

  const render = async () => {
    const token = ++renderToken;
    const path = normalizeRoute(window.location.hash);
    const routePath = getRoutePath(path);
    const routeEntry = routes.get(routePath) ?? routes.get('/404');

    cleanupCurrent();
    outlet.dataset.route = routePath;
    setNavigationState(routePath);
    renderLoading(outlet);

    try {
      const pageRenderer = typeof routeEntry === 'function' ? routeEntry : await routeEntry?.load?.();
      if (destroyed || token !== renderToken) return;
      if (typeof pageRenderer !== 'function') throw new TypeError(`No renderer is available for ${routePath}.`);
      outlet.replaceChildren();
      outlet.removeAttribute('aria-busy');
      const cleanup = pageRenderer(outlet);
      if (destroyed || token !== renderToken) {
        if (typeof cleanup === 'function') cleanup();
        return;
      }
      currentCleanup = typeof cleanup === 'function' ? cleanup : null;
      document.dispatchEvent(new CustomEvent('cosmic-explorer:route-change', { detail: { path: routePath, fullPath: path } }));
      focusMainContent(outlet);
    } catch (error) {
      if (destroyed || token !== renderToken) return;
      renderRouteError(outlet, error);
      focusMainContent(outlet);
    }
  };

  return {
    start() {
      destroyed = false;
      window.addEventListener('hashchange', render);
      window.addEventListener('cosmic-explorer:language-change', render);
      if (!window.location.hash) history.replaceState(null, '', '#/home');
      void render();
    },
    navigate(path) {
      window.location.hash = normalizeRoute(path);
    },
    destroy() {
      destroyed = true;
      renderToken += 1;
      window.removeEventListener('hashchange', render);
      window.removeEventListener('cosmic-explorer:language-change', render);
      cleanupCurrent();
    }
  };
}
