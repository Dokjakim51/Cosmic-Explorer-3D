// Phase 5.6 compatibility markers retained: startRgbAccentAnimation buildAccentPalette. Phase 8 replaces them with CSS-token animation.
import { createFooter } from './components/layout/footer.js';
import { createHeader } from './components/layout/header.js';
import { createMiniPlayer } from './components/layout/mini-player.js';
import { appearanceManager } from './features/appearance/appearance-manager.js';
import { ambientAudioManager } from './features/ambient/ambient-audio-manager.js';
import { createKiraAssistant } from './features/kira/kira-assistant.js';
import { createRouter } from './router/router.js';
import { routes } from './router/routes.js';

function createBackdrop() {
  const backdrop = document.createElement('div');
  backdrop.className = 'cosmic-backdrop appearance-backdrop';
  backdrop.setAttribute('aria-hidden', 'true');
  backdrop.innerHTML = `
    <span class="appearance-base-layer"></span>
    <span class="star-layer star-layer--one"></span>
    <span class="star-layer star-layer--two"></span>
    <span class="nebula nebula--one"></span>
    <span class="nebula nebula--two"></span>

    <span class="theme-scene theme-scene--galaxy">
      <span class="theme-galaxy-core"></span>
      <span class="theme-galaxy-arm theme-galaxy-arm--one"></span>
      <span class="theme-galaxy-arm theme-galaxy-arm--two"></span>
      <span class="theme-galaxy-dust"></span>
    </span>

    <span class="theme-scene theme-scene--solar">
      <span class="theme-sun"></span>
      <span class="theme-orbit theme-orbit--one"></span>
      <span class="theme-orbit theme-orbit--two"></span>
      <span class="theme-orbit theme-orbit--three"></span>
      <span class="theme-body theme-body--one"></span>
      <span class="theme-body theme-body--two"></span>
      <span class="theme-body theme-body--three"></span>
    </span>

    <span class="theme-scene theme-scene--blackhole">
      <span class="theme-blackhole-core"></span>
      <span class="theme-blackhole-disk"></span>
      <span class="theme-blackhole-lens"></span>
      <span class="theme-blackhole-jet theme-blackhole-jet--top"></span>
      <span class="theme-blackhole-jet theme-blackhole-jet--bottom"></span>
    </span>

    <span class="theme-scene theme-scene--nebula">
      <span class="theme-nebula-cloud theme-nebula-cloud--one"></span>
      <span class="theme-nebula-cloud theme-nebula-cloud--two"></span>
      <span class="theme-nebula-cloud theme-nebula-cloud--three"></span>
      <span class="theme-nebula-cluster"></span>
    </span>

    <span class="theme-scene theme-scene--deep-space">
      <span class="theme-deep-vignette"></span>
      <span class="theme-deep-stars"></span>
    </span>

    <span class="theme-scene theme-scene--supernova">
      <span class="theme-supernova-core"></span>
      <span class="theme-supernova-shell theme-supernova-shell--one"></span>
      <span class="theme-supernova-shell theme-supernova-shell--two"></span>
      <span class="theme-supernova-debris"></span>
    </span>

    <span class="theme-scene theme-scene--cosmic-web">
      <span class="theme-web-lines"></span>
      <span class="theme-web-nodes"></span>
      <span class="theme-web-depth"></span>
    </span>

    <span class="theme-scene theme-scene--kira-interface">
      <span class="theme-kira-grid"></span>
      <span class="theme-kira-orbit"></span>
      <span class="theme-kira-node theme-kira-node--one"></span>
      <span class="theme-kira-node theme-kira-node--two"></span>
      <span class="theme-kira-scan"></span>
    </span>
    <span class="cursor-aura"></span>
  `;
  return backdrop;
}

function createAppearanceNotice() {
  const notice = document.createElement('div');
  notice.className = 'appearance-system-notice';
  notice.hidden = true;
  notice.setAttribute('role', 'status');
  document.addEventListener('cosmic-explorer:appearance-notice', (event) => {
    const language = document.documentElement.lang === 'es' ? 'es' : 'en';
    if (event.detail?.type === 'recovered') {
      notice.textContent = language === 'es'
        ? 'La configuración de apariencia estaba dañada y se restauró Cosmic Explorer Original.'
        : 'The appearance configuration was damaged, so Cosmic Explorer Original was restored.';
      notice.hidden = false;
      window.setTimeout(() => { notice.hidden = true; }, 5200);
    }
  });
  return notice;
}

export function createApp(mountNode) {
  appearanceManager.init();
  ambientAudioManager.init();

  const shell = document.createElement('div');
  shell.className = 'site-shell';
  const backdrop = createBackdrop();
  const header = createHeader();
  const main = document.createElement('main');
  main.id = 'main-content';
  main.className = 'main-content';
  main.tabIndex = -1;
  const footer = createFooter();
  const miniPlayer = createMiniPlayer();
  const appearanceNotice = createAppearanceNotice();

  shell.append(backdrop, header, main, footer, miniPlayer, appearanceNotice);
  mountNode.replaceChildren(shell);

  const destroyKira = createKiraAssistant();
  const router = createRouter({ outlet: main, routes });
  router.start();

  return () => {
    destroyKira();
    router.destroy();
    ambientAudioManager.destroy();
    appearanceManager.destroy();
  };
}
