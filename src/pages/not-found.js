import { t } from '../i18n/i18n.js';

export function renderNotFoundPage(outlet) {
  document.title = t('notFound.title');
  const page = document.createElement('section');
  page.className = 'page section container not-found';
  page.innerHTML = `
    <p class="eyebrow">${t('notFound.eyebrow')}</p>
    <h1>404</h1>
    <h2>${t('notFound.heading')}</h2>
    <p>${t('notFound.description')}</p>
    <a class="button button--primary" href="#/home">${t('notFound.return')}</a>
  `;
  outlet.replaceChildren(page);
}
