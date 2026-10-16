import { getIcon } from '../../components/ui/icons.js';
import { t } from '../../i18n/i18n.js';
import { appStore } from '../../store/app-store.js';
import { trapFocus } from '../../utils/focus.js';
import { supportsWebGL } from './webgl.js';
import { createPlanetThreeRenderer } from './planet-three-renderer.js';
import { createFallbackPlanetRenderer } from './fallback-planet-renderer.js';
import { applyPlanetRendererVisibility, resolveCelestialTrigger } from './celestial-interaction.js';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function favoriteKey(id) {
  return `planet:${id}`;
}

function getFactRows(planet) {
  return [
    [t('planet.fact.distance'), planet.facts.distanceFromSun],
    [t('planet.fact.diameter'), planet.facts.diameter],
    [t('planet.fact.mass'), planet.facts.mass],
    [t('planet.fact.gravity'), planet.facts.gravity],
    [t('planet.fact.temperature'), planet.facts.temperature],
    [t('planet.fact.day'), planet.facts.dayLength],
    [t('planet.fact.year'), planet.facts.yearLength],
    [t('planet.fact.moons'), String(planet.facts.moons)]
  ];
}

function createList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function createTransitionOrb(planet, origin, target, reverse = false) {
  if (!origin || !target || reducedMotion()) return Promise.resolve();
  const originRect = origin.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (!originRect.width || !targetRect.width) return Promise.resolve();

  const orb = document.createElement('div');
  orb.className = `planet-transition-orb planet-thumbnail planet-thumbnail--${planet.id}`;
  orb.setAttribute('aria-hidden', 'true');
  orb.innerHTML = '<span class="planet-thumbnail-ring"></span>';
  document.body.append(orb);

  const from = reverse ? targetRect : originRect;
  const to = reverse ? originRect : targetRect;
  const startSize = Math.min(from.width, from.height);
  const endSize = Math.min(to.width, to.height) * 0.72;

  Object.assign(orb.style, {
    left: `${from.left + (from.width - startSize) / 2}px`,
    top: `${from.top + (from.height - startSize) / 2}px`,
    width: `${startSize}px`,
    height: `${startSize}px`
  });

  const animation = orb.animate([
    {
      left: `${from.left + (from.width - startSize) / 2}px`,
      top: `${from.top + (from.height - startSize) / 2}px`,
      width: `${startSize}px`,
      height: `${startSize}px`,
      opacity: 0.96,
      filter: 'brightness(1) saturate(1)'
    },
    {
      left: `${to.left + (to.width - endSize) / 2}px`,
      top: `${to.top + (to.height - endSize) / 2}px`,
      width: `${endSize}px`,
      height: `${endSize}px`,
      opacity: reverse ? 0.45 : 0.18,
      filter: 'brightness(1.45) saturate(1.25)'
    }
  ], {
    duration: reverse ? 440 : 620,
    easing: 'cubic-bezier(.22,1,.36,1)',
    fill: 'forwards'
  });

  return animation.finished.catch(() => {}).finally(() => orb.remove());
}

function getOriginVisual(origin) {
  if (!origin) return null;
  return origin.matches('.planet-thumbnail, .celestial-orb')
    ? origin
    : origin.querySelector('.planet-thumbnail, .celestial-orb');
}

export function getPlanetIdFromHash() {
  const raw = String(window.location.hash || '');
  const question = raw.indexOf('?');
  if (question < 0) return null;
  const params = new URLSearchParams(raw.slice(question + 1));
  return params.get('planet');
}

export function createPlanetExplorer({ planets }) {
  const planetById = new Map(planets.map((planet) => [planet.id, planet]));
  let modal = null;
  let renderer = null;
  let earthRenderer = null;
  let usingEarthRenderer = false;
  let standardUsesFallback = false;
  let currentPlanet = null;
  let currentIndex = -1;
  let lastFocused = null;
  let originElement = null;
  let cleanupSubscription = null;
  let closing = false;

  function createModal() {
    modal = document.createElement('div');
    modal.className = 'planet-viewer-overlay';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="planet-viewer-shell" role="dialog" aria-modal="true" aria-labelledby="planet-viewer-title" aria-describedby="planet-viewer-summary">
        <div class="planet-viewer-stars" aria-hidden="true"><span></span><span></span><span></span></div>
        <header class="planet-viewer-topbar">
          <div class="planet-viewer-identity">
            <span class="planet-order" data-viewer-order></span>
            <div>
              <p class="eyebrow">${t('planet.archive')}</p>
              <h2 id="planet-viewer-title" data-viewer-name></h2>
            </div>
          </div>
          <button class="viewer-icon-button viewer-close" type="button" data-action="close" aria-label="${t('planet.close')}">${getIcon('close')}</button>
        </header>

        <div class="planet-viewer-layout">
          <section class="planet-stage" aria-label="${t('planet.stage')}">
            <div class="planet-stage-glow" aria-hidden="true"></div>
            <canvas class="planet-canvas" aria-label="${t('planet.canvas')}"></canvas>
            <canvas class="earth-three-canvas" aria-label="${t('planet.canvas')}" hidden></canvas>
            <div class="planet-fallback" hidden aria-hidden="true"><div class="planet-thumbnail"><span class="planet-thumbnail-ring"></span></div></div>
            <p class="planet-stage-hint"><span aria-hidden="true">↔</span> ${t('planet.hint')}</p>
            <div class="planet-viewer-controls" aria-label="${t('planet.controls')}">
              <button class="viewer-control" type="button" data-action="zoom-in" aria-label="${t('planet.zoomIn')}">${getIcon('zoomIn')}<span>${t('planet.zoomIn')}</span></button>
              <button class="viewer-control" type="button" data-action="zoom-out" aria-label="${t('planet.zoomOut')}">${getIcon('zoomOut')}<span>${t('planet.zoomOut')}</span></button>
              <button class="viewer-control" type="button" data-action="reset" aria-label="${t('planet.reset')}">${getIcon('reset')}<span>${t('planet.reset')}</span></button>
              <button class="viewer-control" type="button" data-action="rotation" aria-label="${t('planet.pauseAria')}">${getIcon('pause')}<span>${t('planet.pause')}</span></button>
            </div>
            <button class="planet-nav planet-nav--previous" type="button" data-action="previous" aria-label="${t('planet.previous')}">${getIcon('chevronLeft')}</button>
            <button class="planet-nav planet-nav--next" type="button" data-action="next" aria-label="${t('planet.next')}">${getIcon('chevronRight')}</button>
          </section>

          <aside class="planet-information">
            <div class="planet-information-scroll">
              <div class="planet-summary-row">
                <div>
                  <p class="planet-type" data-viewer-type></p>
                  <p id="planet-viewer-summary" class="planet-summary" data-viewer-summary></p>
                </div>
                <button class="favorite-button" type="button" data-action="favorite" aria-pressed="false">${getIcon('heart')}<span>${t('planet.addFavorite')}</span></button>
              </div>

              <dl class="planet-fact-grid" data-viewer-facts></dl>

              <section class="planet-detail-block">
                <p class="eyebrow">${t('planet.compositionEyebrow')}</p>
                <h3>${t('planet.compositionTitle')}</h3>
                <p data-viewer-composition></p>
              </section>

              <div class="planet-detail-columns">
                <section class="planet-detail-block">
                  <p class="eyebrow">${t('planet.featuresEyebrow')}</p>
                  <h3>${t('planet.featuresTitle')}</h3>
                  <div data-viewer-features></div>
                </section>
                <section class="planet-detail-block">
                  <p class="eyebrow">${t('planet.curiositiesEyebrow')}</p>
                  <h3>${t('planet.curiositiesTitle')}</h3>
                  <div data-viewer-curiosities></div>
                </section>
              </div>

              <section class="planet-detail-block planet-comparison">
                <span aria-hidden="true">${getIcon('info')}</span>
                <div><p class="eyebrow">${t('planet.comparisonEyebrow')}</p><p data-viewer-comparison></p></div>
              </section>

              <section class="planet-detail-block">
                <p class="eyebrow">${t('planet.discoveryEyebrow')}</p>
                <p data-viewer-discovery></p>
              </section>

              <p class="planet-data-note">${t('planet.note')}</p>
              <a class="planet-source-link" data-viewer-source target="_blank" rel="noreferrer">${t('planet.source')} ${getIcon('arrow')}</a>
            </div>
          </aside>
        </div>
      </div>
    `;
    document.body.append(modal);

    const canvas = modal.querySelector('.planet-canvas');
    const fallback = modal.querySelector('.planet-fallback');
    if (supportsWebGL()) {
      try {
        renderer = createPlanetThreeRenderer(canvas, {
          onInteraction() {
            const rotationButton = modal.querySelector('[data-action="rotation"]');
            rotationButton.innerHTML = `${getIcon('play')}<span>${t('planet.resume')}</span>`;
            rotationButton.setAttribute('aria-label', t('planet.resumeAria'));
          }
        });
      } catch (error) {
        console.warn('Planet Three.js PBR viewer unavailable:', error);
        canvas.hidden = true;
        fallback.hidden = false;
        standardUsesFallback = true;
        renderer = createFallbackPlanetRenderer(fallback, {
          onInteraction() {
            const rotationButton = modal.querySelector('[data-action="rotation"]');
            rotationButton.innerHTML = `${getIcon('play')}<span>${t('planet.resume')}</span>`;
            rotationButton.setAttribute('aria-label', t('planet.resumeAria'));
          }
        });
      }
    } else {
      canvas.hidden = true;
      fallback.hidden = false;
      standardUsesFallback = true;
      renderer = createFallbackPlanetRenderer(fallback, {
        onInteraction() {
          const rotationButton = modal.querySelector('[data-action="rotation"]');
          rotationButton.innerHTML = `${getIcon('play')}<span>${t('planet.resume')}</span>`;
          rotationButton.setAttribute('aria-label', t('planet.resumeAria'));
        }
      });
    }

    const earthCanvas = modal.querySelector('.earth-three-canvas');
    import('./earth-three-renderer.js').then(({ createEarthThreeRenderer }) => {
      if (!modal?.isConnected) return;
      earthRenderer = createEarthThreeRenderer(earthCanvas, {
        onInteraction() {
          const rotationButton = modal.querySelector('[data-action="rotation"]');
          rotationButton.innerHTML = `${getIcon('play')}<span>${t('planet.resume')}</span>`;
          rotationButton.setAttribute('aria-label', t('planet.resumeAria'));
        }
      });
      if (currentPlanet?.id === 'earth') updateContent(currentPlanet);
    }).catch((error) => {
      console.warn('Three.js Earth renderer unavailable:', error);
      earthRenderer = null;
      if (currentPlanet?.id === 'earth') updateContent(currentPlanet);
    });

    modal.addEventListener('click', onModalClick);
    modal.addEventListener('keydown', onModalKeydown);
    cleanupSubscription = appStore.subscribe(updateFavoriteButton);
  }

  function updateFavoriteButton() {
    if (!modal || !currentPlanet) return;
    const button = modal.querySelector('[data-action="favorite"]');
    const favorites = appStore.getState().favorites || [];
    const active = favorites.includes(favoriteKey(currentPlanet.id));
    button.classList.toggle('is-favorite', active);
    button.setAttribute('aria-pressed', String(active));
    button.innerHTML = `${getIcon('heart')}<span>${active ? t('planet.favorited') : t('planet.addFavorite')}</span>`;
  }

  function markVisited(planet) {
    const state = appStore.getState();
    const key = favoriteKey(planet.id);
    const visited = Array.isArray(state.visitedObjects) ? state.visitedObjects : [];
    if (!visited.includes(key)) appStore.setState({ visitedObjects: [...visited, key] });
  }

  function updateContent(planet) {
    currentPlanet = planet;
    currentIndex = planets.findIndex((item) => item.id === planet.id);
    modal.style.setProperty('--planet-accent', planet.accentColor);
    modal.dataset.planet = planet.id;
    modal.querySelector('[data-viewer-order]').textContent = String(planet.orderFromSun).padStart(2, '0');
    modal.querySelector('[data-viewer-name]').textContent = planet.name;
    modal.querySelector('[data-viewer-type]').textContent = planet.type;
    modal.querySelector('[data-viewer-summary]').textContent = planet.shortDescription;
    modal.querySelector('[data-viewer-composition]').textContent = planet.facts.composition;
    modal.querySelector('[data-viewer-features]').innerHTML = createList(planet.facts.features);
    modal.querySelector('[data-viewer-curiosities]').innerHTML = createList(planet.facts.curiosities);
    modal.querySelector('[data-viewer-comparison]').textContent = planet.facts.earthComparison;
    modal.querySelector('[data-viewer-discovery]').textContent = planet.facts.discovery;

    const facts = modal.querySelector('[data-viewer-facts]');
    facts.innerHTML = getFactRows(planet).map(([label, value]) => `
      <div class="planet-fact">
        <dt>${label}</dt>
        <dd>${value}</dd>
      </div>
    `).join('');

    const source = modal.querySelector('[data-viewer-source]');
    source.href = planet.source.url;
    source.setAttribute('aria-label', t('planet.sourceAria', { name: planet.name }));

    const fallbackOrb = modal.querySelector('.planet-fallback .planet-thumbnail');
    fallbackOrb.className = `planet-thumbnail planet-thumbnail--${planet.id}`;
    fallbackOrb.innerHTML = '<span class="planet-thumbnail-ring"></span>';

    usingEarthRenderer = planet.id === 'earth' && Boolean(earthRenderer);
    applyPlanetRendererVisibility(modal, { usingEarthRenderer, standardUsesFallback });
    if (usingEarthRenderer) earthRenderer.setPlanet(planet);
    else renderer?.setPlanet(planet);

    const rotationButton = modal.querySelector('[data-action="rotation"]');
    rotationButton.innerHTML = `${getIcon('pause')}<span>${t('planet.pause')}</span>`;
    rotationButton.setAttribute('aria-label', t('planet.pauseAria'));
    updateFavoriteButton();
    markVisited(planet);
  }

  async function open(id, origin = null) {
    const planet = planetById.get(id);
    if (!planet) return false;
    if (!modal) createModal();
    if (!modal.hidden && currentPlanet?.id === id) return true;

    lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    originElement = getOriginVisual(origin) || document.querySelector(`[data-planet-id="${id}"] .planet-thumbnail, [data-planet-id="${id}"] .celestial-orb`);
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('viewer-open');
    updateContent(planet);

    requestAnimationFrame(() => modal.classList.add('is-open'));
    const stage = modal.querySelector('.planet-stage');
    await createTransitionOrb(planet, originElement, stage);
    modal.querySelector('.viewer-close').focus({ preventScroll: true });
    return true;
  }

  async function close({ immediate = false } = {}) {
    if (!modal || modal.hidden || closing) return;
    closing = true;
    const planet = currentPlanet;
    const stage = modal.querySelector('.planet-stage');
    const validOrigin = originElement?.isConnected ? originElement : null;
    modal.classList.remove('is-open');

    if (!immediate) {
      await Promise.all([
        createTransitionOrb(planet, validOrigin, stage, true),
        new Promise((resolve) => window.setTimeout(resolve, reducedMotion() ? 0 : 330))
      ]);
    }

    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('viewer-open');
    closing = false;
    currentPlanet = null;
    if (lastFocused?.isConnected) lastFocused.focus({ preventScroll: true });
  }

  function switchPlanet(direction) {
    const nextIndex = (currentIndex + direction + planets.length) % planets.length;
    const next = planets[nextIndex];
    const info = modal.querySelector('.planet-information-scroll');
    info.animate([
      { opacity: 1, transform: 'translateY(0)' },
      { opacity: 0, transform: `translateY(${direction > 0 ? '-10px' : '10px'})` }
    ], { duration: reducedMotion() ? 1 : 150, easing: 'ease', fill: 'forwards' }).finished
      .catch(() => {})
      .then(() => {
        updateContent(next);
        info.scrollTop = 0;
        info.animate([
          { opacity: 0, transform: `translateY(${direction > 0 ? '10px' : '-10px'})` },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: reducedMotion() ? 1 : 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      });
  }

  function toggleFavorite() {
    if (!currentPlanet) return;
    const state = appStore.getState();
    const favorites = Array.isArray(state.favorites) ? [...state.favorites] : [];
    const key = favoriteKey(currentPlanet.id);
    const index = favorites.indexOf(key);
    if (index >= 0) favorites.splice(index, 1);
    else favorites.push(key);
    appStore.setState({ favorites });
  }

  function getActiveRenderer() {
    return usingEarthRenderer ? earthRenderer : renderer;
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
    if (action === 'zoom-in') getActiveRenderer()?.zoomIn();
    if (action === 'zoom-out') getActiveRenderer()?.zoomOut();
    if (action === 'reset') {
      getActiveRenderer()?.reset();
      const button = modal.querySelector('[data-action="rotation"]');
      button.innerHTML = `${getIcon('pause')}<span>${t('planet.pause')}</span>`;
      button.setAttribute('aria-label', t('planet.pauseAria'));
    }
    if (action === 'rotation') {
      const enabled = getActiveRenderer()?.toggleAutoRotation();
      const button = modal.querySelector('[data-action="rotation"]');
      button.innerHTML = enabled ? `${getIcon('pause')}<span>${t('planet.pause')}</span>` : `${getIcon('play')}<span>${t('planet.resume')}</span>`;
      button.setAttribute('aria-label', enabled ? t('planet.pauseAria') : t('planet.resumeAria'));
    }
    if (action === 'previous') switchPlanet(-1);
    if (action === 'next') switchPlanet(1);
    if (action === 'favorite') toggleFavorite();
  }

  function onModalKeydown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowLeft' && !event.target.closest('.planet-information')) {
      event.preventDefault();
      switchPlanet(-1);
      return;
    }
    if (event.key === 'ArrowRight' && !event.target.closest('.planet-information')) {
      event.preventDefault();
      switchPlanet(1);
      return;
    }
    trapFocus(modal.querySelector('.planet-viewer-shell'), event);
  }

  function attach(root) {
    const onClick = (event) => {
      const match = resolveCelestialTrigger({
        root,
        target: event.target,
        dataAttribute: 'data-planet-id',
        visualSelector: '.planet-thumbnail, .celestial-orb'
      });
      if (!match) return;
      event.preventDefault();
      void open(match.id, match.origin).catch((error) => console.error('Unable to open planet viewer.', error));
    };
    const onKeydown = (event) => {
      const trigger = event.target.closest('[data-planet-id]');
      if (!trigger || !root.contains(trigger)) return;
      if ((event.key === 'Enter' || event.key === ' ') && !event.target.closest('a, button')) {
        event.preventDefault();
        open(trigger.dataset.planetId, trigger);
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
    renderer?.dispose();
    earthRenderer?.dispose();
    renderer = null;
    cleanupSubscription?.();
    cleanupSubscription = null;
    modal?.remove();
    modal = null;
  }

  return { attach, open, close, destroy };
}
