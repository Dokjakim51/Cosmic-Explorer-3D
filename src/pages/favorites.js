import { createSectionHeading } from '../components/ui/section-heading.js';
import { getIcon } from '../components/ui/icons.js';
import { localizeCatalog, t } from '../i18n/i18n.js';
import { loadJson } from '../services/data-service.js';
import { appStore } from '../store/app-store.js';
import { activateRevealAnimations } from '../utils/reveal.js';

function createFavoriteCard(item, kind, index) {
  const key = `${kind}:${item.id}`;
  const card = document.createElement('article');
  card.className = `favorite-planet-card favorite-celestial-card favorite-celestial-card--${kind} glass-card`;
  card.dataset.reveal = '';
  card.style.setProperty('--accent', item.accentColor);
  card.style.setProperty('--reveal-delay', `${index * 60}ms`);

  const visual = kind === 'planet'
    ? `<div class="planet-thumbnail planet-thumbnail--${item.id}" aria-hidden="true"><span class="planet-thumbnail-ring"></span></div>`
    : `<div class="favorite-star-visual star-orb star-orb--${item.id}" aria-hidden="true"><span class="star-orb-detail"></span><span class="star-orb-companion"></span></div>`;
  const query = kind === 'planet' ? `planet=${item.id}` : `star=${item.id}`;
  const label = kind === 'planet' ? item.type : `${item.spectralType} · ${item.constellation}`;

  card.innerHTML = `
    ${visual}
    <div>
      <p class="celestial-kind">${label}</p>
      <h3>${item.name}</h3>
      <p>${item.shortDescription}</p>
      <div class="favorite-card-actions">
        <a class="planet-explore" href="#/universe?${query}" aria-label="${t('favorites.openObject', { name: item.name, kind: t(`search.kind.${kind}`) })}">${t('favorites.explore')} ${getIcon('arrow')}</a>
        <button class="remove-favorite" type="button" data-remove-favorite="${key}" aria-label="${t('favorites.removeObject', { name: item.name })}">${getIcon('close')}<span>${t('favorites.remove')}</span></button>
      </div>
    </div>
  `;
  return card;
}

function createFavoriteSection({ title, eyebrow, description, items, kind, startIndex = 0 }) {
  const section = document.createElement('section');
  section.className = 'favorite-category';
  const header = document.createElement('header');
  header.className = 'catalog-header';
  header.innerHTML = `
    <div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>${description}</p></div>
    <span>${t('favorites.objectCount', { count: items.length })}</span>
  `;
  const grid = document.createElement('div');
  grid.className = 'favorite-planet-grid';
  items.forEach((item, index) => grid.append(createFavoriteCard(item, kind, startIndex + index)));
  section.append(header, grid);
  return section;
}

export function renderFavoritesPage(outlet) {
  document.title = t('favorites.title');
  let cancelled = false;
  let planets = [];
  let stars = [];
  let stopReveal = () => {};

  const page = document.createElement('div');
  page.className = 'page favorites-page';
  const intro = document.createElement('section');
  intro.className = 'page-hero container';
  const heading = createSectionHeading({
    eyebrow: t('favorites.eyebrow'),
    title: t('favorites.heading'),
    description: t('favorites.description')
  });
  heading.dataset.reveal = '';
  intro.append(heading);

  const content = document.createElement('section');
  content.className = 'section container favorites-content';
  content.innerHTML = `<div class="loading-state glass-card">${t('favorites.loading')}</div>`;
  page.append(intro, content);
  outlet.replaceChildren(page);

  function renderFavorites() {
    if (cancelled || !planets.length || !stars.length) return;
    const favorites = appStore.getState().favorites || [];
    const selectedPlanets = planets.filter((planet) => favorites.includes(`planet:${planet.id}`));
    const selectedStars = stars.filter((star) => favorites.includes(`star:${star.id}`));

    if (!selectedPlanets.length && !selectedStars.length) {
      content.innerHTML = `
        <div class="favorite-empty glass-card" data-reveal>
          <span class="favorite-heart" aria-hidden="true">${getIcon('heart')}</span>
          <div>
            <p class="eyebrow">${t('favorites.emptyEyebrow')}</p>
            <h2>${t('favorites.emptyTitle')}</h2>
            <p>${t('favorites.emptyDescription')}</p>
            <a class="button button--primary" href="#/universe">${t('favorites.exploreUniverse')} ${getIcon('arrow')}</a>
          </div>
          <div class="favorite-orbits" aria-hidden="true"><span></span><span></span><span></span></div>
        </div>
      `;
    } else {
      const fragment = document.createDocumentFragment();
      if (selectedPlanets.length) {
        fragment.append(createFavoriteSection({
          eyebrow: t('favorites.planetsEyebrow'),
          title: t('favorites.planetsTitle'),
          description: t('favorites.planetsDescription', { count: selectedPlanets.length }),
          items: selectedPlanets,
          kind: 'planet'
        }));
      }
      if (selectedStars.length) {
        fragment.append(createFavoriteSection({
          eyebrow: t('favorites.starsEyebrow'),
          title: t('favorites.starsTitle'),
          description: t('favorites.starsDescription', { count: selectedStars.length }),
          items: selectedStars,
          kind: 'star',
          startIndex: selectedPlanets.length
        }));
      }
      content.replaceChildren(fragment);
    }
    stopReveal();
    stopReveal = activateRevealAnimations(page);
  }

  const onRemove = (event) => {
    const button = event.target.closest('[data-remove-favorite]');
    if (!button) return;
    const favorites = (appStore.getState().favorites || []).filter((item) => item !== button.dataset.removeFavorite);
    appStore.setState({ favorites });
  };
  content.addEventListener('click', onRemove);

  Promise.all([
    loadJson('./src/data/planets.json'),
    loadJson('./src/data/stars.json')
  ]).then(([planetData, starData]) => {
    if (cancelled) return;
    planets = localizeCatalog(planetData, 'planet');
    stars = localizeCatalog(starData, 'star');
    renderFavorites();
  }).catch((error) => {
    content.innerHTML = `<div class="loading-state error-state glass-card">${t('favorites.loadError', { message: error.message })}</div>`;
  });

  const unsubscribe = appStore.subscribe(() => renderFavorites());
  appStore.setState({ lastVisitedRoute: '/favorites' });
  stopReveal = activateRevealAnimations(page);
  return () => {
    cancelled = true;
    unsubscribe();
    content.removeEventListener('click', onRemove);
    stopReveal();
  };
}
