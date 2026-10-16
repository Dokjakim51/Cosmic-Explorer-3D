function lazyPage(importer, exportName) {
  let pending = null;
  return Object.freeze({
    async load() {
      pending ??= importer().then((module) => {
        const renderer = module[exportName];
        if (typeof renderer !== 'function') throw new TypeError(`Route module does not export ${exportName}.`);
        return renderer;
      }).catch((error) => {
        pending = null;
        throw error;
      });
      return pending;
    }
  });
}

export const routes = new Map([
  ['/home', lazyPage(() => import('../pages/home.js'), 'renderHomePage')],
  ['/favorites', lazyPage(() => import('../pages/favorites.js'), 'renderFavoritesPage')],
  ['/universe', lazyPage(() => import('../pages/universe.js'), 'renderUniversePage')],
  ['/gallery', lazyPage(() => import('../pages/gallery.js'), 'renderGalleryPage')],
  ['/music-space', lazyPage(() => import('../pages/music-space.js'), 'renderMusicSpacePage')],
  ['/cosmic-defender', lazyPage(() => import('../pages/cosmic-defender.js'), 'renderCosmicDefenderPage')],
  ['/404', lazyPage(() => import('../pages/not-found.js'), 'renderNotFoundPage')]
]);

export async function preloadRoute(path) {
  const entry = routes.get(path);
  if (!entry?.load) return false;
  await entry.load();
  return true;
}

export const navigationRoutes = [
  { path: '/home', labelKey: 'nav.home' },
  { path: '/favorites', labelKey: 'nav.favorites' },
  { path: '/universe', labelKey: 'nav.universe' },
  { path: '/gallery', labelKey: 'nav.gallery' }
];
