import { createApp } from './app.js';
import { initializeLanguage } from './i18n/i18n.js';
import { registerCosmicPointer } from './utils/cosmic-pointer.js';
import { registerVisibilityObserver } from './utils/visibility.js';

const mountNode = document.querySelector('#app');

if (!mountNode) {
  throw new Error('Cosmic Explorer could not find the #app mount element.');
}

initializeLanguage();
createApp(mountNode);
registerVisibilityObserver();
registerCosmicPointer();
