import { createStatusCard } from '../components/ui/status-card.js';
import { getIcon } from '../components/ui/icons.js';
import { localizeCatalog, localizeCelestial, t } from '../i18n/i18n.js';
import { loadJson } from '../services/data-service.js';
import { appStore } from '../store/app-store.js';
import { activateRevealAnimations } from '../utils/reveal.js';
import { createPlanetExplorer } from '../features/universe/planet-viewer.js';

const featureDefinitions = [
  { id: 'astronomy', icon: 'telescope', link: '/universe' },
  { id: 'favorites', icon: 'heart', link: '/favorites' },
  { id: 'music', icon: 'music', link: '/music-space' },
  { id: 'gallery', icon: 'galaxy', link: '/gallery' }
];

const previewPlanetDefinitions = [
  { id: 'mercury', name: 'Mercury' },
  { id: 'venus', name: 'Venus' },
  { id: 'earth', name: 'Earth' },
  { id: 'mars', name: 'Mars' },
  { id: 'jupiter', name: 'Jupiter' },
  { id: 'saturn', name: 'Saturn' }
];

function createPlanetCard(definition, index) {
  const planet = localizeCelestial({
    ...definition,
    type: '',
    shortDescription: t(`preview.${definition.id}`),
    facts: {}
  }, 'planet');
  planet.shortDescription = t(`preview.${definition.id}`);

  const card = document.createElement('article');
  card.className = `planet-card${planet.id === 'earth' ? ' planet-card--featured' : ''}`;
  card.dataset.planetId = planet.id;
  card.dataset.reveal = '';
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-label', t('home.openPlanet', { name: planet.name }));
  card.style.setProperty('--reveal-delay', `${index * 55}ms`);
  card.innerHTML = `
    <span class="planet-card-sparkle" aria-hidden="true">${getIcon('sparkle')}</span>
    <a class="planet-thumbnail-link" href="#/universe?planet=${planet.id}" aria-label="${t('home.openPlanet', { name: planet.name })}">
      <div class="planet-thumbnail planet-thumbnail--${planet.id}" aria-hidden="true">
        <span class="planet-thumbnail-ring"></span>
      </div>
    </a>
    <h3>${planet.name}</h3>
    <p>${planet.shortDescription}</p>
    <a class="planet-explore" href="#/universe?planet=${planet.id}" aria-label="${t('home.openPlanet', { name: planet.name })}">${t('home.explorePlanet')} ${getIcon('arrow')}</a>
  `;
  return card;
}

function setupHeroParallax(page) {
  const visual = page.querySelector('.hero-visual');
  if (!visual || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  let frame = 0;
  const onMove = (event) => {
    const rect = visual.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      visual.style.setProperty('--parallax-x', `${x * 14}px`);
      visual.style.setProperty('--parallax-y', `${y * 10}px`);
    });
  };
  const reset = () => {
    visual.style.setProperty('--parallax-x', '0px');
    visual.style.setProperty('--parallax-y', '0px');
  };
  visual.addEventListener('pointermove', onMove, { passive: true });
  visual.addEventListener('pointerleave', reset);
  return () => {
    visual.removeEventListener('pointermove', onMove);
    visual.removeEventListener('pointerleave', reset);
    if (frame) cancelAnimationFrame(frame);
  };
}

export function renderHomePage(outlet) {
  document.title = t('home.title');

  const page = document.createElement('div');
  page.className = 'page home-page home-page--phase56 home-page--three-proof';

  const hero = document.createElement('section');
  hero.className = 'hero container';
  hero.setAttribute('aria-labelledby', 'home-title');
  hero.innerHTML = `
    <div class="hero-copy" data-reveal>
      <p class="eyebrow">${t('home.eyebrow')}</p>
      <h1 id="home-title"><span class="hero-welcome">${t('home.welcome')}</span><span class="gradient-text">Cosmic Explorer</span></h1>
      <p class="hero-lead">${t('home.lead')}</p>
      <p class="hero-description">${t('home.description')}</p>
      <div class="hero-actions">
        <a class="button button--primary" href="#/universe">${t('home.exploreNow')} ${getIcon('arrow')}</a>
        <a class="button button--secondary" href="#discover">${t('home.learnMore')} ${getIcon('sparkle')}</a>
      </div>
    </div>
    <div class="hero-visual hero-visual--three" aria-label="${t('home.heroAria')}">
      <canvas class="hero-three-canvas" aria-hidden="true"></canvas>
      <span class="hero-nebula" aria-hidden="true"></span>
      <span class="hero-star hero-star--one" aria-hidden="true"></span>
      <span class="hero-star hero-star--two" aria-hidden="true"></span>
      <span class="hero-star hero-star--three" aria-hidden="true"></span>
      <span class="shooting-star" aria-hidden="true"></span>
      <div class="orbit orbit--outer" aria-hidden="true"></div>
      <div class="orbit orbit--inner" aria-hidden="true"></div>
      <div class="hero-planet" aria-hidden="true">
        <span class="planet-surface planet-surface--one"></span>
        <span class="planet-surface planet-surface--two"></span>
        <span class="planet-surface planet-surface--three"></span>
        <span class="planet-clouds"></span>
        <span class="planet-haze"></span>
        <span class="planet-shadow"></span>
        <span class="planet-rings planet-rings--back"></span>
        <span class="planet-rings planet-rings--front"></span>
        <span class="planet-atmosphere"></span>
      </div>
      <span class="moon moon--one" aria-hidden="true"></span>
      <span class="moon moon--two" aria-hidden="true"></span>
      <aside class="cosmic-quote-mini" aria-label="${t('home.quoteAria')}">
        <span aria-hidden="true">${getIcon('sparkle')}</span>
        <p>${t('home.quoteMini')}</p>
      </aside>
    </div>
  `;

  const featureSection = document.createElement('section');
  featureSection.id = 'discover';
  featureSection.className = 'feature-section container';
  const featureGrid = document.createElement('div');
  featureGrid.className = 'feature-grid';
  featureDefinitions.forEach((definition, index) => {
    const node = createStatusCard({
      icon: definition.icon,
      title: t(`home.feature.${definition.id}.title`),
      description: t(`home.feature.${definition.id}.description`),
      link: definition.link,
      linkLabel: t(`home.feature.${definition.id}.label`)
    });
    node.style.setProperty('--reveal-delay', `${index * 70}ms`);
    featureGrid.append(node);
  });
  featureSection.append(featureGrid);

  const universe = document.createElement('section');
  universe.className = 'universe-preview container';
  universe.innerHTML = `
    <header class="section-heading section-heading--center" data-reveal>
      <p class="eyebrow">${t('home.cosmosEyebrow')}</p>
      <h2>${t('home.universeTitle')}</h2>
      <p class="section-description">${t('home.universeDescription')}</p>
    </header>
  `;
  const planetGrid = document.createElement('div');
  planetGrid.className = 'planet-preview-grid';
  previewPlanetDefinitions.forEach((planet, index) => planetGrid.append(createPlanetCard(planet, index)));
  universe.append(planetGrid);

  const journey = document.createElement('section');
  journey.className = 'journey-section container';
  journey.dataset.reveal = '';
  journey.innerHTML = `
    <div class="journey-art" aria-hidden="true">
      <span class="journey-galaxy"></span>
      <span class="journey-horizon"></span>
      <span class="journey-person"></span>
      <span class="journey-moon"></span>
    </div>
    <blockquote>
      <span class="quote-mark" aria-hidden="true">“</span>
      <p>${t('home.quote')}</p>
      <cite>— Stephen Hawking</cite>
      <span class="quote-mark quote-mark--end" aria-hidden="true">”</span>
    </blockquote>
  `;

  const launch = document.createElement('section');
  launch.className = 'cosmic-launch container';
  launch.dataset.reveal = '';
  launch.innerHTML = `
    <div>
      <span class="launch-icon" aria-hidden="true">${getIcon('game')}</span>
      <p class="eyebrow">${t('home.gameEyebrow')}</p>
      <h2>${t('home.gameTitle')}</h2>
      <p>${t('home.gameDescription')}</p>
    </div>
    <a class="button button--secondary" href="#/cosmic-defender">${t('home.gameButton')} ${getIcon('arrow')}</a>
  `;

  page.append(hero, featureSection, universe, journey, launch);
  outlet.replaceChildren(page);
  appStore.setState({ lastVisitedRoute: '/home' });

  const stopReveal = activateRevealAnimations(page);
  const stopParallax = setupHeroParallax(page);
  let stopHeroScene = () => {};
  let heroSceneCancelled = false;
  let detachPlanetExplorer = () => {};
  let homePlanetExplorer = null;
  let homeExplorerCancelled = false;

  import('../features/home/hero-three-scene.js').then(({ createHeroThreeScene }) => {
    if (heroSceneCancelled) return;
    stopHeroScene = createHeroThreeScene(page.querySelector('.hero-three-canvas'));
  }).catch((error) => {
    console.error('Unable to initialize the Three.js hero scene.', error);
    page.querySelector('.hero-visual')?.classList.add('hero-three-failed');
  });

  loadJson('./src/data/planets.json').then((planetData) => {
    if (homeExplorerCancelled) return;
    const planets = localizeCatalog(planetData, 'planet');
    homePlanetExplorer = createPlanetExplorer({ planets });
    detachPlanetExplorer = homePlanetExplorer.attach(planetGrid);
  }).catch((error) => {
    console.warn('Home preview modal unavailable. Falling back to route navigation.', error);
  });

  return () => {
    heroSceneCancelled = true;
    homeExplorerCancelled = true;
    stopReveal();
    stopParallax();
    stopHeroScene();
    detachPlanetExplorer();
    homePlanetExplorer?.destroy();
  };
}
