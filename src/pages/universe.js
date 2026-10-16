import { createSectionHeading } from '../components/ui/section-heading.js';
import { getIcon } from '../components/ui/icons.js';
import { createCosmicSearch } from '../features/universe/cosmic-search.js';
import { createPlanetExplorer, getPlanetIdFromHash } from '../features/universe/planet-viewer.js';
import { createStarExplorer, getStarIdFromHash } from '../features/universe/star-viewer.js';
import { localizeCatalog, t } from '../i18n/i18n.js';
import { loadJson } from '../services/data-service.js';
import { appStore } from '../store/app-store.js';
import { activateRevealAnimations } from '../utils/reveal.js';

function createCelestialCard(item, kind, index) {
  const isPlanet = kind === 'planet';
  const card = document.createElement('article');
  card.className = `celestial-card glass-card celestial-card--${kind}`;
  card.dataset.reveal = '';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', t(kind === 'planet' ? 'universe.openPlanet' : 'universe.openStar', { name: item.name }));
  card.style.setProperty('--accent', item.accentColor);
  card.style.setProperty('--reveal-delay', `${(index % 4) * 55}ms`);
  if (isPlanet) card.dataset.planetId = item.id;
  else card.dataset.starId = item.id;

  const openLabel = t(isPlanet ? 'universe.openPlanet' : 'universe.openStar', { name: item.name });
  const visual = isPlanet
    ? `<div class="celestial-orb planet-thumbnail planet-thumbnail--${item.id}" role="button" tabindex="0" aria-label="${openLabel}"><span class="planet-thumbnail-aura"></span><span class="planet-thumbnail-ring"></span></div>`
    : `<div class="celestial-orb star-orb star-orb--${item.id}" role="button" tabindex="0" aria-label="${openLabel}"><span class="star-orb-detail"></span><span class="star-orb-companion"></span><span class="star-orb-halo"></span></div>`;

  const action = `<button class="celestial-explore-button" type="button" aria-label="${openLabel}">${t(isPlanet ? 'universe.explorePlanet' : 'universe.exploreStar')} ${getIcon('arrow')}</button>`;

  card.innerHTML = `
    <span class="celestial-order">${isPlanet ? String(item.orderFromSun).padStart(2, '0') : item.spectralType}</span>
    ${visual}
    <div class="celestial-card-copy">
      <p class="celestial-kind">${isPlanet ? item.type : `${item.type} · ${item.constellation}`}</p>
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      ${action}
    </div>
  `;
  return card;
}

export function renderUniversePage(outlet) {
  document.title = t('universe.title');
  let cancelled = false;
  let stopReveal = () => {};
  let detachPlanetExplorer = () => {};
  let detachStarExplorer = () => {};
  let planetExplorer = null;
  let starExplorer = null;
  let cosmicSearch = null;

  const page = document.createElement('div');
  page.className = 'page universe-page universe-page--phase55 universe-page--phase56';
  const intro = document.createElement('section');
  intro.className = 'page-hero container universe-hero';
  const heading = createSectionHeading({
    eyebrow: t('universe.eyebrow'),
    title: t('universe.heading'),
    description: t('universe.description')
  });
  heading.dataset.reveal = '';
  intro.append(heading);

  const searchSlot = document.createElement('div');
  searchSlot.className = 'container universe-search-slot';
  searchSlot.innerHTML = `<div class="loading-state glass-card">${t('universe.preparingSearch')}</div>`;

  const catalog = document.createElement('section');
  catalog.className = 'section container celestial-catalog';
  const status = document.createElement('div');
  status.className = 'loading-state glass-card';
  status.textContent = t('universe.loading');
  catalog.append(status);
  page.append(intro, searchSlot, catalog);
  outlet.replaceChildren(page);

  Promise.all([
    loadJson('./src/data/planets.json'),
    loadJson('./src/data/stars.json')
  ]).then(([planetData, starData]) => {
    if (cancelled) return;
    const planets = localizeCatalog(planetData, 'planet');
    const stars = localizeCatalog(starData, 'star');
    const contents = document.createDocumentFragment();

    const planetsHeader = document.createElement('header');
    planetsHeader.className = 'catalog-header';
    planetsHeader.dataset.reveal = '';
    planetsHeader.innerHTML = `
      <div><p class="eyebrow">${t('universe.planetsEyebrow')}</p><h2>${t('universe.planetsTitle')}</h2><p>${t('universe.planetsDescription')}</p></div>
      <span>${t('universe.worldCount', { count: planets.length })}</span>
    `;
    const planetGrid = document.createElement('div');
    planetGrid.className = 'celestial-grid';
    planetGrid.dataset.planetCatalog = '';
    planets.forEach((planet, index) => planetGrid.append(createCelestialCard(planet, 'planet', index)));

    const starsHeader = document.createElement('header');
    starsHeader.className = 'catalog-header catalog-header--stars';
    starsHeader.dataset.reveal = '';
    starsHeader.innerHTML = `
      <div><p class="eyebrow">${t('universe.starsEyebrow')}</p><h2>${t('universe.starsTitle')}</h2><p>${t('universe.starsDescription')}</p></div>
      <span>${t('universe.starCount', { count: stars.length })}</span>
    `;
    const starGrid = document.createElement('div');
    starGrid.className = 'celestial-grid';
    starGrid.dataset.starCatalog = '';
    stars.forEach((star, index) => starGrid.append(createCelestialCard(star, 'star', index)));

    contents.append(planetsHeader, planetGrid, starsHeader, starGrid);
    status.replaceWith(contents);

    planetExplorer = createPlanetExplorer({ planets });
    starExplorer = createStarExplorer({ stars });
    detachPlanetExplorer = planetExplorer.attach(planetGrid);
    detachStarExplorer = starExplorer.attach(starGrid);

    cosmicSearch = createCosmicSearch({
      planets,
      stars,
      async onSelect(item) {
        if (item.searchKind === 'planet') {
          await starExplorer.close({ immediate: true });
          const origin = planetGrid.querySelector(`[data-planet-id="${item.id}"]`);
          planetExplorer.open(item.id, origin);
        } else {
          await planetExplorer.close({ immediate: true });
          const origin = starGrid.querySelector(`[data-star-id="${item.id}"]`);
          starExplorer.open(item.id, origin);
        }
      }
    });
    searchSlot.replaceChildren(cosmicSearch.element);

    stopReveal();
    stopReveal = activateRevealAnimations(page);

    const requestedPlanet = getPlanetIdFromHash();
    const requestedStar = getStarIdFromHash();
    if (requestedPlanet && planets.some((planet) => planet.id === requestedPlanet)) {
      window.setTimeout(() => {
        if (!cancelled) {
          const origin = planetGrid.querySelector(`[data-planet-id="${requestedPlanet}"]`);
          planetExplorer.open(requestedPlanet, origin);
        }
      }, 180);
    } else if (requestedStar && stars.some((star) => star.id === requestedStar)) {
      window.setTimeout(() => {
        if (!cancelled) {
          const origin = starGrid.querySelector(`[data-star-id="${requestedStar}"]`);
          starExplorer.open(requestedStar, origin);
        }
      }, 180);
    }
  }).catch((error) => {
    if (cancelled) return;
    status.classList.add('error-state');
    status.textContent = t('universe.loadError', { message: error.message });
    searchSlot.innerHTML = `<div class="loading-state error-state glass-card">${t('universe.searchUnavailable')}</div>`;
  });

  appStore.setState({ lastVisitedRoute: '/universe' });
  stopReveal = activateRevealAnimations(page);
  return () => {
    cancelled = true;
    detachPlanetExplorer();
    detachStarExplorer();
    cosmicSearch?.destroy();
    planetExplorer?.destroy();
    starExplorer?.destroy();
    stopReveal();
  };
}
