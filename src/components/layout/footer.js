import { t } from '../../i18n/i18n.js';
import { createLogo } from '../ui/logo.js';

export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const container = document.createElement('div');
  container.className = 'container footer-inner';

  const identity = document.createElement('div');
  identity.className = 'footer-identity';
  identity.append(createLogo({ compact: true }));
  const tagline = document.createElement('p');
  identity.append(tagline);

  const copyright = document.createElement('p');
  copyright.className = 'copyright';

  const updateLanguage = () => {
    tagline.textContent = t('footer.tagline');
    copyright.textContent = t('footer.copyright', { year: new Date().getFullYear() });
  };
  updateLanguage();
  window.addEventListener('cosmic-explorer:language-change', updateLanguage);

  container.append(identity, copyright);
  footer.append(container);
  return footer;
}
