import { getIcon } from '../../components/ui/icons.js';
import { t } from '../../i18n/i18n.js';
import { appStore } from '../../store/app-store.js';
import { trapFocus } from '../../utils/focus.js';
import { resolveCelestialTrigger } from './celestial-interaction.js';
import { createStarThreeRenderer } from './star-three-renderer.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function favoriteKey(id) {
  return `star:${id}`;
}

function createList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function getFactRows(star) {
  return [
    [t('star.fact.constellation'), star.constellation],
    [t('star.fact.spectral'), star.spectralType],
    [t('star.fact.distance'), star.facts.distance],
    [t('star.fact.mass'), star.facts.mass],
    [t('star.fact.radius'), star.facts.radius],
    [t('star.fact.temperature'), star.facts.temperature],
    [t('star.fact.luminosity'), star.facts.luminosity],
    [t('star.fact.color'), star.facts.color],
    [t('star.fact.age'), star.facts.age],
    [t('star.fact.stage'), star.facts.stage]
  ];
}

function createTransitionStar(star, origin, target, reverse = false) {
  if (!origin || !target || reducedMotion()) return Promise.resolve();
  const originRect = origin.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!originRect.width || !targetRect.width) return Promise.resolve();

  const visual = document.createElement('div');
  visual.className = 'star-transition-orb';
  visual.style.setProperty('--star-color', star.accentColor);
  visual.setAttribute('aria-hidden', 'true');
  visual.innerHTML = '<span></span>';
  document.body.append(visual);

  const from = reverse ? targetRect : originRect;
  const to = reverse ? originRect : targetRect;
  const startSize = Math.min(from.width, from.height);
  const endSize = Math.min(to.width, to.height) * 0.46;

  const position = (rect, size) => ({
    left: `${rect.left + (rect.width - size) / 2}px`,
    top: `${rect.top + (rect.height - size) / 2}px`,
    width: `${size}px`,
    height: `${size}px`
  });

  Object.assign(visual.style, position(from, startSize));
  const start = position(from, startSize);
  const finish = position(to, endSize);
  const animation = visual.animate([
    { ...start, opacity: .96, filter: 'brightness(1) saturate(1)' },
    { ...finish, opacity: reverse ? .42 : .12, filter: 'brightness(1.8) saturate(1.3)' }
  ], {
    duration: reverse ? 410 : 610,
    easing: 'cubic-bezier(.22,1,.36,1)',
    fill: 'forwards'
  });

  return animation.finished.catch(() => {}).finally(() => visual.remove());
}

function getOriginVisual(origin) {
  if (!origin) return null;
  return origin.matches('.star-orb, .celestial-orb')
    ? origin
    : origin.querySelector('.star-orb, .celestial-orb');
}

export function getStarIdFromHash() {
  const raw = String(window.location.hash || '');
  const question = raw.indexOf('?');
  if (question < 0) return null;
  return new URLSearchParams(raw.slice(question + 1)).get('star');
}

export function createStarExplorer({ stars }) {
  const starById = new Map(stars.map((star) => [star.id, star]));
  let modal = null;
  let currentStar = null;
  let currentIndex = -1;
  let lastFocused = null;
  let originElement = null;
  let cleanupSubscription = null;
  let closing = false;
  let pulsePaused = false;
  let starRenderer = null;
  let rendererFailed = false;

  function createModal() {
    modal = document.createElement('div');
    modal.className = 'planet-viewer-overlay star-viewer-overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="planet-viewer-shell star-viewer-shell" role="dialog" aria-modal="true" aria-labelledby="star-viewer-title" aria-describedby="star-viewer-summary">
        <div class="planet-viewer-stars" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="planet-viewer-topbar">
          <div class="planet-viewer-identity">
            <span class="planet-order star-spectral-badge" data-viewer-spectral></span>
            <div>
              <p class="eyebrow">${t('star.archive')}</p>
              <h2 id="star-viewer-title" data-viewer-name></h2>
            </div>
          </div>
          <button class="viewer-icon-button viewer-close" type="button" data-action="close" aria-label="${t('star.close')}">${getIcon('close')}</button>
        </header>

        <div class="planet-viewer-layout star-viewer-layout">
          <section class="planet-stage star-stage" aria-label="${t('star.stage')}">
            <div class="star-space-dust" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <div class="star-viewer-visual" data-star-visual>
              <canvas class="star-three-canvas" data-star-canvas aria-label="${t('star.stage')}"></canvas>
              <div class="star-render-fallback" data-star-fallback aria-hidden="true">
                <span class="star-orbital-disk"></span>
                <span class="star-pulse-shell star-pulse-shell--one"></span>
                <span class="star-pulse-shell star-pulse-shell--two"></span>
                <span class="star-corona star-corona--outer"></span>
                <span class="star-corona star-corona--middle"></span>
                <span class="star-core"><i></i><b></b><em></em></span>
                <span class="star-flare star-flare--one"></span>
                <span class="star-flare star-flare--two"></span>
                <span class="star-ray star-ray--diagonal-one"></span>
                <span class="star-ray star-ray--diagonal-two"></span>
                <span class="star-companion star-companion--primary"></span>
                <span class="star-companion star-companion--secondary"></span>
              </div>
            </div>
            <p class="planet-stage-hint star-stage-hint"><span aria-hidden="true">↔</span> ${t('planet.hint')}</p>
            <div class="planet-viewer-controls star-three-controls" aria-label="${t('star.controls')}">
              <button class="viewer-control" type="button" data-action="zoom-in" aria-label="${t('planet.zoomIn')}">${getIcon('zoomIn')}<span>${t('planet.zoomIn')}</span></button>
              <button class="viewer-control" type="button" data-action="zoom-out" aria-label="${t('planet.zoomOut')}">${getIcon('zoomOut')}<span>${t('planet.zoomOut')}</span></button>
              <button class="viewer-control" type="button" data-action="focus" aria-label="${t('planet.reset')}">${getIcon('reset')}<span>${t('planet.reset')}</span></button>
              <button class="viewer-control" type="button" data-action="pulse" aria-label="${t('star.pausePulseAria')}">${getIcon('pause')}<span>${t('star.pausePulse')}</span></button>
            </div>
            <button class="planet-nav planet-nav--previous" type="button" data-action="previous" aria-label="${t('star.previous')}">${getIcon('chevronLeft')}</button>
            <button class="planet-nav planet-nav--next" type="button" data-action="next" aria-label="${t('star.next')}">${getIcon('chevronRight')}</button>
          </section>

          <aside class="planet-information star-information">
            <div class="planet-information-scroll">
              <div class="planet-summary-row">
                <div>
                  <p class="planet-type" data-viewer-type></p>
                  <p id="star-viewer-summary" class="planet-summary" data-viewer-summary></p>
                </div>
                <button class="favorite-button" type="button" data-action="favorite" aria-pressed="false">${getIcon('heart')}<span>${t('planet.addFavorite')}</span></button>
              </div>

              <dl class="planet-fact-grid star-fact-grid" data-viewer-facts></dl>

              <section class="planet-detail-block">
                <p class="eyebrow">${t('star.compositionEyebrow')}</p>
                <h3>${t('star.compositionTitle')}</h3>
                <p data-viewer-composition></p>
              </section>

              <div class="planet-detail-columns">
                <section class="planet-detail-block">
                  <p class="eyebrow">${t('star.featuresEyebrow')}</p>
                  <h3>${t('star.featuresTitle')}</h3>
                  <div data-viewer-features></div>
                </section>
                <section class="planet-detail-block">
                  <p class="eyebrow">${t('star.curiositiesEyebrow')}</p>
                  <h3>${t('star.curiositiesTitle')}</h3>
                  <div data-viewer-curiosities></div>
                </section>
              </div>

              <section class="planet-detail-block planet-comparison">
                <span aria-hidden="true">${getIcon('star')}</span>
                <div><p class="eyebrow">${t('star.comparisonEyebrow')}</p><p data-viewer-comparison></p></div>
              </section>

              <section class="planet-detail-block">
                <p class="eyebrow">${t('star.systemEyebrow')}</p>
                <p data-viewer-system></p>
              </section>

              <p class="planet-data-note">${t('star.note')}</p>
              <a class="planet-source-link" data-viewer-source target="_blank" rel="noreferrer">${t('star.source')} ${getIcon('arrow')}</a>
            </div>
          </aside>
        </div>
      </div>
    `;
    document.body.append(modal);
    modal.addEventListener('click', onModalClick);
    modal.addEventListener('keydown', onModalKeydown);
    cleanupSubscription = appStore.subscribe(updateFavoriteButton);

    const canvas = modal.querySelector('[data-star-canvas]');
    try {
      starRenderer = createStarThreeRenderer(canvas, {
        onInteraction: () => modal?.classList.add('star-user-interacted'),
        onError: (error) => console.error('Unable to initialize the stellar Three.js renderer.', error)
      });
      rendererFailed = false;
      modal.dataset.starRenderer = 'three';
    } catch (error) {
      rendererFailed = true;
      modal.dataset.starRenderer = 'fallback';
      canvas.hidden = true;
      console.error('The stellar viewer is using its CSS fallback.', error);
    }
  }

  function updateFavoriteButton() {
    if (!modal || !currentStar) return;
    const button = modal.querySelector('[data-action="favorite"]');
    const favorites = appStore.getState().favorites || [];
    const active = favorites.includes(favoriteKey(currentStar.id));
    button.classList.toggle('is-favorite', active);
    button.setAttribute('aria-pressed', String(active));
    button.innerHTML = `${getIcon('heart')}<span>${active ? t('planet.favorited') : t('planet.addFavorite')}</span>`;
  }

  function markVisited(star) {
    const state = appStore.getState();
    const key = favoriteKey(star.id);
    const visited = Array.isArray(state.visitedObjects) ? state.visitedObjects : [];
    if (!visited.includes(key)) appStore.setState({ visitedObjects: [...visited, key] });
  }

  function updateContent(star) {
    currentStar = star;
    currentIndex = stars.findIndex((item) => item.id === star.id);
    modal.style.setProperty('--planet-accent', star.accentColor);
    modal.style.setProperty('--star-color', star.accentColor);
    modal.style.setProperty('--star-pulse-intensity', String(star.viewer.pulseIntensity ?? .08));
    modal.style.setProperty('--star-pulse-duration', `${star.viewer.pulseDuration ?? 4.5}s`);
    modal.style.setProperty('--star-visual-scale', String(star.viewer.visualScale ?? 1));
    modal.dataset.star = star.id;
    modal.dataset.starPattern = star.viewer.surfacePattern || 'radiant';
    modal.querySelector('[data-viewer-spectral]').textContent = star.spectralType;
    modal.querySelector('[data-viewer-name]').textContent = star.name;
    modal.querySelector('[data-viewer-type]').textContent = star.type;
    modal.querySelector('[data-viewer-summary]').textContent = star.shortDescription;
    modal.querySelector('[data-viewer-composition]').textContent = star.facts.composition;
    modal.querySelector('[data-viewer-features]').innerHTML = createList(star.facts.features);
    modal.querySelector('[data-viewer-curiosities]').innerHTML = createList(star.facts.curiosities);
    modal.querySelector('[data-viewer-comparison]').textContent = star.facts.sunComparison;
    modal.querySelector('[data-viewer-system]').textContent = star.facts.systemNote;
    modal.querySelector('[data-viewer-facts]').innerHTML = getFactRows(star).map(([label, value]) => `
      <div class="planet-fact">
        <dt>${label}</dt>
        <dd>${value}</dd>
      </div>
    `).join('');

    const source = modal.querySelector('[data-viewer-source]');
    source.href = star.source.url;
    source.setAttribute('aria-label', t('star.sourceAria', { name: star.name }));
    pulsePaused = false;
    modal.classList.remove('star-pulse-paused');
    const pulseButton = modal.querySelector('[data-action="pulse"]');
    pulseButton.innerHTML = `${getIcon('pause')}<span>${t('star.pausePulse')}</span>`;
    pulseButton.setAttribute('aria-label', t('star.pausePulseAria'));
    modal.classList.toggle('star-render-fallback-active', rendererFailed);
    if (!rendererFailed) {
      try {
        starRenderer?.setStar(star);
        starRenderer?.setActive(true);
      } catch (error) {
        rendererFailed = true;
        modal.dataset.starRenderer = 'fallback';
        modal.classList.add('star-render-fallback-active');
        modal.querySelector('[data-star-canvas]').hidden = true;
        console.error(`Unable to render ${star.name} in Three.js.`, error);
      }
    }
    updateFavoriteButton();
    markVisited(star);
  }

  async function open(id, origin = null) {
    const star = starById.get(id);
    if (!star) return false;
    if (!modal) createModal();
    if (!modal.hidden && currentStar?.id === id) return true;

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    originElement = getOriginVisual(origin) || document.querySelector(`[data-star-id="${id}"] .star-orb, [data-star-id="${id}"] .celestial-orb`);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('viewer-open');
    updateContent(star);
    requestAnimationFrame(() => modal.classList.add('is-open'));
    const stage = modal.querySelector('.star-stage');
    await createTransitionStar(star, originElement, stage);
    modal.querySelector('.viewer-close').focus({ preventScroll: true });
    return true;
  }

  async function close({ immediate = false } = {}) {
    if (!modal || modal.hidden || closing) return;
    closing = true;
    const star = currentStar;
    const stage = modal.querySelector('.star-stage');
    const validOrigin = originElement?.isConnected ? originElement : null;
    modal.classList.remove('is-open');
    starRenderer?.setActive(false);

    if (!immediate) {
      await Promise.all([
        createTransitionStar(star, validOrigin, stage, true),
        new Promise((resolve) => window.setTimeout(resolve, reducedMotion() ? 0 : 320))
      ]);
    }

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('viewer-open');
    currentStar = null;
    closing = false;
    if (lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
  }

  function switchStar(direction) {
    const nextIndex = (currentIndex + direction + stars.length) % stars.length;
    const next = stars[nextIndex];
    const information = modal.querySelector('.planet-information-scroll');
    information.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: `translateY(${direction > 0 ? '-10px' : '10px'})` }
    ], { duration: reducedMotion() ? 1 : 140, easing: 'ease', fill: 'forwards' }).finished
      .catch(() => {})
      .then(() => {
        updateContent(next);
        information.scrollTop = 0;
        information.animate([
          { opacity: 0, transform: `translateY(${direction > 0 ? '10px' : '-10px'})` },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: reducedMotion() ? 1 : 250, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      });
  }

  function toggleFavorite() {
    if (!currentStar) return;
    const state = appStore.getState();
    const favorites = Array.isArray(state.favorites) ? [...state.favorites] : [];
    const key = favoriteKey(currentStar.id);
    const index = favorites.indexOf(key);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(key);
    appStore.setState({ favorites });
  }

  function togglePulse() {
    const active = rendererFailed ? pulsePaused : starRenderer?.toggleAnimation();
    pulsePaused = rendererFailed ? !pulsePaused : !active;
    modal.classList.toggle('star-pulse-paused', pulsePaused);
    const button = modal.querySelector('[data-action="pulse"]');
    button.innerHTML = pulsePaused ? `${getIcon('play')}<span>${t('star.resumePulse')}</span>` : `${getIcon('pause')}<span>${t('star.pausePulse')}</span>`;
    button.setAttribute('aria-label', pulsePaused ? t('star.resumePulseAria') : t('star.pausePulseAria'));
  }

  function replayFocus() {
    if (!rendererFailed) {
      starRenderer?.reset();
      modal.classList.remove('star-user-interacted');
      return;
    }
    const visual = modal.querySelector('[data-star-visual]');
    visual.classList.remove('is-refocusing');
    void visual.offsetWidth;
    visual.classList.add('is-refocusing');
  }

  function onModalClick(event) {
    if (event.target === modal) {
      close();
      return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'close') {
      close();
      return;
    }
    if (action === 'previous') switchStar(-1);
    if (action === 'next') switchStar(1);
    if (action === 'favorite') toggleFavorite();
    if (action === 'pulse') togglePulse();
    if (action === 'focus') replayFocus();
    if (action === 'zoom-in') starRenderer?.zoomIn();
    if (action === 'zoom-out') starRenderer?.zoomOut();
  }

  function onModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowLeft' && !event.target.closest('.planet-information')) {
      event.preventDefault();
      switchStar(-1);
      return;
    }
    if (event.key === 'ArrowRight' && !event.target.closest('.planet-information')) {
      event.preventDefault();
      switchStar(1);
      return;
    }
    trapFocus(modal.querySelector('.star-viewer-shell'), event);
  }

  function attach(root) {
    const onClick = (event) => {
      const match = resolveCelestialTrigger({
        root,
        target: event.target,
        dataAttribute: 'data-star-id',
        visualSelector: '.star-orb, .celestial-orb'
      });
      if (!match) return;
      event.preventDefault();
      void open(match.id, match.origin).catch((error) => console.error('Unable to open star viewer.', error));
    };
    const onKeydown = (event) => {
      const trigger = event.target.closest('[data-star-id]');
      if (!trigger || !root.contains(trigger)) return;
      if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a, button')) {
        event.preventDefault();
        open(trigger.dataset.starId, trigger);
      }
    };
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKeydown);
    return () => {
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeydown);
    };
  }

  function destroy() {
    close({ immediate: true });
    cleanupSubscription?.();
    cleanupSubscription = null;
    starRenderer?.destroy();
    starRenderer = null;
    modal?.remove();
    modal = null;
  }

  return { attach, open, close, destroy };
}
