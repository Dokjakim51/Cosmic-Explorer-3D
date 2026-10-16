import { createSectionHeading } from '../components/ui/section-heading.js';
import { getIcon } from '../components/ui/icons.js';
import { createGalleryPreviewRenderer, createGalleryViewerRenderer } from '../features/gallery/gallery-three-renderer.js';
import { t } from '../i18n/i18n.js';
import { loadJson } from '../services/data-service.js';
import { appStore } from '../store/app-store.js';
import { trapFocus } from '../utils/focus.js';
import { activateRevealAnimations } from '../utils/reveal.js';
import { emitKiraObjectContext, clearKiraObjectContext } from '../features/kira/kira-events.js';

const categories = ['all', 'compactObjects', 'explosions', 'starFormation', 'stellarSystems', 'largeScale', 'favorites'];
const favoriteKey = (id) => `gallery:${id}`;

function isFavorite(id) {
  return (appStore.getState().favorites || []).includes(favoriteKey(id));
}

function toggleFavorite(id) {
  const key = favoriteKey(id);
  const favorites = appStore.getState().favorites || [];
  appStore.setState({ favorites: favorites.includes(key) ? favorites.filter((item) => item !== key) : [...favorites, key] });
}

function createCard(item, index, total) {
  const title = t(item.titleKey);
  const favorite = isFavorite(item.id);
  const card = document.createElement('article');
  const layout = ['hero', 'portrait', 'compact', 'wide', 'half'].includes(item.layout) ? item.layout : 'compact';
  card.className = `gallery-card gallery-card--thumbnail gallery-card--${layout}`;
  card.dataset.galleryId = item.id;
  card.dataset.category = item.category;
  card.dataset.galleryLayout = layout;
  card.dataset.gallerySceneId = item.scene;
  card.dataset.reveal = '';
  card.style.setProperty('--reveal-delay', `${(index % 6) * 45}ms`);
  card.style.setProperty('--gallery-card-accent', item.accent || '#8fdcff');
  card.style.setProperty('--gallery-card-accent-secondary', item.accentSecondary || item.accent || '#d9b4ff');
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', t('gallery.openItem', { title }));
  card.innerHTML = `
    <div class="gallery-card-media gallery-scene-host" data-gallery-scene="${item.scene}" aria-hidden="true">
      <canvas class="gallery-card-canvas" data-gallery-thumbnail></canvas>
      <div class="gallery-scene-fallback"><span></span><span></span><span></span><b></b></div>
      <div class="gallery-scene-vignette"></div>
      <span class="gallery-live-badge"><i></i>${t('gallery.live3d')}</span>
      <span class="gallery-card-index">${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
    </div>
    <div class="gallery-card-overlay">
      <div class="gallery-card-copy">
        <small><i></i>${t(`gallery.filter.${item.category}`)}</small>
        <h2>${title}</h2>
        <p>${t(item.descriptionKey)}</p>
        <span class="gallery-open-cue">${t('gallery.enterScene')} ${getIcon('arrow')}</span>
      </div>
      <button class="gallery-favorite-button${favorite ? ' is-favorite' : ''}" type="button" data-gallery-favorite="${item.id}" aria-label="${t(favorite ? 'gallery.removeFavorite' : 'gallery.addFavorite', { title })}" aria-pressed="${favorite}">${getIcon('heart')}</button>
    </div>`;
  return card;
}

function createViewer(items, { onOpen, onClose } = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'gallery-viewer gallery-viewer--phase511';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="gallery-viewer-shell" role="dialog" aria-modal="true" aria-labelledby="gallery-viewer-title" aria-describedby="gallery-viewer-description">
      <header class="gallery-viewer-header">
        <div class="gallery-viewer-identity">
          <p class="eyebrow" data-viewer-category></p>
          <h2 id="gallery-viewer-title" data-viewer-title></h2>
        </div>
        <div class="gallery-viewer-actions">
          <span class="gallery-viewer-live"><i></i>${t('gallery.liveSimulation')}</span>
          <button type="button" data-viewer-action="favorite" aria-label="${t('gallery.addFavoriteGeneric')}">${getIcon('heart')}</button>
          <button type="button" data-viewer-action="close" aria-label="${t('gallery.close')}">${getIcon('close')}</button>
        </div>
      </header>
      <div class="gallery-viewer-stage">
        <canvas class="gallery-viewer-canvas" data-viewer-canvas aria-label="${t('gallery.viewerCanvas')}"></canvas>
        <div class="gallery-viewer-stage-grid" aria-hidden="true"></div>
        <span class="gallery-viewer-counter" data-viewer-counter></span>
        <span class="gallery-viewer-hint">${getIcon('expand')} ${t('gallery.interactionHint')}</span>
        <button class="gallery-viewer-nav gallery-viewer-nav--prev" type="button" data-viewer-action="previous" aria-label="${t('gallery.previous')}">${getIcon('chevronLeft')}</button>
        <button class="gallery-viewer-nav gallery-viewer-nav--next" type="button" data-viewer-action="next" aria-label="${t('gallery.next')}">${getIcon('chevronRight')}</button>
      </div>
      <footer class="gallery-viewer-footer">
        <div class="gallery-viewer-copy">
          <p id="gallery-viewer-description" data-viewer-description></p>
          <div class="gallery-viewer-technique">
            <strong>${t('gallery.visualConstruction')}</strong>
            <span data-viewer-technique></span>
          </div>
          <div class="gallery-viewer-tags" data-viewer-tags></div>
        </div>
        <div class="gallery-zoom-controls" aria-label="${t('gallery.viewControls')}">
          <button type="button" data-viewer-action="zoom-out" aria-label="${t('gallery.zoomOut')}">${getIcon('zoomOut')}</button>
          <button type="button" data-viewer-action="reset" aria-label="${t('gallery.resetZoom')}">${getIcon('reset')}</button>
          <button type="button" data-viewer-action="zoom-in" aria-label="${t('gallery.zoomIn')}">${getIcon('zoomIn')}</button>
        </div>
      </footer>
    </div>`;
  document.body.append(overlay);

  const canvas = overlay.querySelector('[data-viewer-canvas]');
  const sceneRenderer = createGalleryViewerRenderer(canvas);
  let currentIndex = 0;
  let currentScene = '';
  let lastFocus = null;

  const update = ({ forceScene = false } = {}) => {
    const item = items[currentIndex];
    if (!item) return;
    overlay.dataset.galleryId = item.id;
    overlay.querySelector('[data-viewer-category]').textContent = t(`gallery.filter.${item.category}`);
    overlay.querySelector('[data-viewer-title]').textContent = t(item.titleKey);
    overlay.querySelector('[data-viewer-description]').textContent = t(item.descriptionKey);
    overlay.querySelector('[data-viewer-technique]').textContent = t(item.techniqueKey);
    overlay.querySelector('[data-viewer-counter]').textContent = `${String(currentIndex + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
    overlay.querySelector('[data-viewer-tags]').replaceChildren(...(item.tags || []).map((key) => {
      const tag = document.createElement('span');
      tag.textContent = t(key);
      return tag;
    }));

    const favoriteButton = overlay.querySelector('[data-viewer-action="favorite"]');
    const favorite = isFavorite(item.id);
    favoriteButton.classList.toggle('is-favorite', favorite);
    favoriteButton.setAttribute('aria-pressed', String(favorite));
    favoriteButton.setAttribute('aria-label', t(favorite ? 'gallery.removeFavorite' : 'gallery.addFavorite', { title: t(item.titleKey) }));

    if (forceScene || currentScene !== item.scene) {
      currentScene = item.scene;
      overlay.classList.add('is-changing-scene');
      sceneRenderer.setScene(item.scene);
      requestAnimationFrame(() => overlay.classList.remove('is-changing-scene'));
    }
    if (!overlay.hidden) {
      emitKiraObjectContext({
        section: 'gallery',
        category: 'gallery-object',
        objectId: item.id,
        objectType: 'gallery',
        name: t(item.titleKey),
        meta: { category: item.category, scene: item.scene }
      });
    }
  };

  const move = (direction) => {
    currentIndex = (currentIndex + direction + items.length) % items.length;
    update({ forceScene: true });
  };

  const close = () => {
    if (overlay.hidden) return;
    overlay.classList.remove('is-open');
    sceneRenderer.setActive(false);
    document.body.classList.remove('viewer-open');
    window.setTimeout(() => {
      overlay.hidden = true;
      lastFocus?.focus?.();
    }, 220);
    clearKiraObjectContext('gallery');
    onClose?.();
  };

  overlay.addEventListener('click', (event) => {
    const action = event.target.closest('[data-viewer-action]')?.dataset.viewerAction;
    if (event.target === overlay) close();
    if (action === 'close') close();
    if (action === 'previous') move(-1);
    if (action === 'next') move(1);
    if (action === 'zoom-in') sceneRenderer.zoomBy(0.82);
    if (action === 'zoom-out') sceneRenderer.zoomBy(1.2);
    if (action === 'reset') sceneRenderer.resetView();
    if (action === 'favorite') {
      toggleFavorite(items[currentIndex].id);
      update();
    }
  });

  overlay.addEventListener('keydown', (event) => {
    trapFocus(overlay.querySelector('.gallery-viewer-shell'), event);
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
    if (event.key === '+' || event.key === '=') sceneRenderer.zoomBy(0.82);
    if (event.key === '-') sceneRenderer.zoomBy(1.2);
    if (event.key === '0') sceneRenderer.resetView();
  });

  let touchStartX = 0;
  let touchStartY = 0;
  overlay.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchStartX = touch?.clientX ?? 0;
    touchStartY = touch?.clientY ?? 0;
  }, { passive: true });
  overlay.addEventListener('touchend', (event) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;
    if (Math.abs(deltaX) < 58 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    move(deltaX > 0 ? -1 : 1);
  }, { passive: true });

  return {
    open(id, origin) {
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return;
      currentIndex = index;
      currentScene = '';
      lastFocus = origin || document.activeElement;
      overlay.hidden = false;
      document.body.classList.add('viewer-open');
      onOpen?.();
      update({ forceScene: true });
      requestAnimationFrame(() => {
        overlay.classList.add('is-open');
        sceneRenderer.setActive(true);
        overlay.querySelector('[data-viewer-action="close"]').focus();
      });
    },
    update,
    destroy() {
      clearKiraObjectContext('gallery');
      sceneRenderer.destroy();
      overlay.remove();
    }
  };
}

export function renderGalleryPage(outlet) {
  document.title = t('gallery.title');
  let stopped = false;
  let activeFilter = 'all';
  let query = '';
  let items = [];
  let viewer = null;
  let preview = null;
  let stopReveal = () => {};

  const page = document.createElement('div');
  page.className = 'page gallery-page gallery-phase55 gallery-phase56 gallery-phase511';
  const intro = document.createElement('section');
  intro.className = 'page-hero container gallery-hero gallery-hero--phase511';
  const heading = createSectionHeading({
    eyebrow: t('gallery.eyebrow'),
    title: t('gallery.heading'),
    description: t('gallery.description')
  });
  heading.dataset.reveal = '';
  intro.append(heading);

  const gallery = document.createElement('section');
  gallery.className = 'section container gallery-showcase gallery-showcase--phase511';
  gallery.innerHTML = `
    <div class="gallery-toolbar glass-card" data-reveal>
      <div class="gallery-filters" data-gallery-filters></div>
      <label class="gallery-search">${getIcon('search')}<span class="sr-only">${t('gallery.searchLabel')}</span><input type="search" data-gallery-search placeholder="${t('gallery.searchPlaceholder')}" autocomplete="off"></label>
    </div>
    <div class="gallery-results-summary" data-gallery-summary></div>
    <div class="gallery-grid gallery-grid--phase511" data-gallery-grid></div>
    <div class="gallery-empty glass-card" data-gallery-empty hidden><span>${getIcon('galaxy')}</span><h2>${t('gallery.emptyTitle')}</h2><p>${t('gallery.emptyDescription')}</p></div>`;

  page.append(intro, gallery);
  outlet.replaceChildren(page);
  appStore.setState({ lastVisitedRoute: '/gallery' });

  const filters = gallery.querySelector('[data-gallery-filters]');
  const grid = gallery.querySelector('[data-gallery-grid]');
  const empty = gallery.querySelector('[data-gallery-empty]');
  const summary = gallery.querySelector('[data-gallery-summary]');
  const search = gallery.querySelector('[data-gallery-search]');

  categories.forEach((id) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `filter-chip${id === 'all' ? ' is-active' : ''}`;
    button.dataset.galleryFilter = id;
    button.textContent = t(`gallery.filter.${id}`);
    filters.append(button);
  });

  const render = () => {
    if (!items.length || stopped) return;
    const normalized = query.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const filtered = items.filter((item) => {
      const matchesCategory = activeFilter === 'all' || (activeFilter === 'favorites' ? isFavorite(item.id) : item.category === activeFilter);
      const haystack = `${t(item.titleKey)} ${t(item.descriptionKey)} ${t(item.techniqueKey)} ${t(`gallery.filter.${item.category}`)} ${(item.tags || []).map((key) => t(key)).join(' ')}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return matchesCategory && haystack.includes(normalized);
    });
    const cards = filtered.map((item) => createCard(item, items.indexOf(item), items.length));
    grid.replaceChildren(...cards);
    grid.hidden = filtered.length === 0;
    empty.hidden = filtered.length !== 0;
    summary.textContent = t('gallery.results', { count: filtered.length });
    preview?.sync(filtered);
    stopReveal();
    stopReveal = activateRevealAnimations(page);
  };

  filters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-gallery-filter]');
    if (!button) return;
    activeFilter = button.dataset.galleryFilter;
    filters.querySelectorAll('button').forEach((item) => item.classList.toggle('is-active', item === button));
    render();
  });
  search.addEventListener('input', () => { query = search.value; render(); });
  grid.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-gallery-favorite]');
    if (favorite) {
      event.stopPropagation();
      toggleFavorite(favorite.dataset.galleryFavorite);
      render();
      viewer?.update();
      return;
    }
    const card = event.target.closest('[data-gallery-id]');
    if (card) viewer?.open(card.dataset.galleryId, card);
  });
  grid.addEventListener('keydown', (event) => {
    if (event.target.closest('button, input, select, textarea, a')) return;
    const card = event.target.closest('[data-gallery-id]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      viewer?.open(card.dataset.galleryId, card);
    }
  });

  loadJson('./src/data/gallery.json').then((data) => {
    if (stopped) return;
    items = data.items || [];
    preview = createGalleryPreviewRenderer({ page, grid });
    viewer = createViewer(items, {
      onOpen: () => preview?.pause(),
      onClose: () => preview?.resume()
    });
    render();
  }).catch((error) => {
    empty.hidden = false;
    empty.querySelector('h2').textContent = t('gallery.loadErrorTitle');
    empty.querySelector('p').textContent = t('gallery.loadError', { message: error.message });
  });

  const unsubscribe = appStore.subscribe(() => render());
  stopReveal = activateRevealAnimations(page);
  return () => {
    stopped = true;
    unsubscribe();
    viewer?.destroy();
    preview?.destroy();
    stopReveal();
  };
}
