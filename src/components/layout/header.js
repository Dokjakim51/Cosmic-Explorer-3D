import { getLanguage, t, toggleLanguage } from '../../i18n/i18n.js';
import { navigationRoutes } from '../../router/routes.js';
import { appStore } from '../../store/app-store.js';
import { createLogo } from '../ui/logo.js';
import { createThemeCustomizer } from './theme-customizer.js';
import { createAmbientAudioControl } from './ambient-audio-control.js';

export function createHeader() {
  const header = document.createElement('header');
  header.className = 'site-header';

  const container = document.createElement('div');
  container.className = 'container header-inner';

  const brand = document.createElement('a');
  brand.className = 'brand-link';
  brand.href = '#/home';
  brand.append(createLogo());

  const toggle = document.createElement('button');
  toggle.className = 'menu-toggle icon-button';
  toggle.type = 'button';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', 'primary-navigation');
  toggle.innerHTML = '<span></span><span></span><span></span>';

  const nav = document.createElement('nav');
  nav.id = 'primary-navigation';
  nav.className = 'primary-navigation';

  const list = document.createElement('ul');
  list.className = 'nav-list';
  for (const item of navigationRoutes) {
    const listItem = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${item.path}`;
    link.dataset.navLink = '';
    link.dataset.translationKey = item.labelKey;
    listItem.append(link);
    list.append(listItem);
  }

  const themeCustomizer = createThemeCustomizer();
  const ambientAudioControl = createAmbientAudioControl();

  const languageButton = document.createElement('button');
  languageButton.className = 'language-switcher';
  languageButton.type = 'button';
  languageButton.innerHTML = `
    <span class="language-switcher-icon" aria-hidden="true">文</span>
    <span class="language-switcher-code"></span>
  `;

  nav.append(list);
  const actions = document.createElement('div');
  actions.className = 'header-actions';
  actions.append(themeCustomizer, ambientAudioControl, languageButton);
  container.append(brand, toggle, nav, actions);
  header.append(container);

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', t('nav.open'));
  };

  const updateLanguage = () => {
    const language = getLanguage();
    brand.setAttribute('aria-label', t('brand.home'));
    toggle.setAttribute('aria-label', nav.classList.contains('is-open') ? t('nav.close') : t('nav.open'));
    nav.setAttribute('aria-label', t('nav.primary'));
    list.querySelectorAll('[data-translation-key]').forEach((link) => {
      link.textContent = t(link.dataset.translationKey);
    });
    languageButton.querySelector('.language-switcher-code').textContent = t('language.short');
    languageButton.setAttribute('aria-label', t('language.switchTo'));
    languageButton.setAttribute('title', `${t('language.current')} · ${t('language.switchTo')}`);
    languageButton.dataset.language = language;
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? t('nav.close') : t('nav.open'));
  });

  languageButton.addEventListener('click', toggleLanguage);

  nav.addEventListener('click', (event) => {
    if (event.target.closest('a')) closeMenu();
  });

  document.addEventListener('cosmic-explorer:route-change', closeMenu);
  window.addEventListener('cosmic-explorer:language-change', updateLanguage);
  appStore.subscribe((state) => {
    if (state.language) updateLanguage();
  });

  const updateScrollState = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
  updateScrollState();
  updateLanguage();
  window.addEventListener('scroll', updateScrollState, { passive: true });

  return header;
}
