import { getLanguage } from '../../i18n/i18n.js';
import { ambientAudioManager } from '../../features/ambient/ambient-audio-manager.js';

const COPY = {
  es:{ activate:'Activar sonido de Cosmic Explorer', disable:'Desactivar ambientación sonora', enable:'Activar sonido de Cosmic Explorer', unavailable:'Audio ambiental no disponible', active:'Ambientación activa', waiting:'Pulsa para activar el ambiente', open:'Configurar sonido ambiental' },
  en:{ activate:'Enable Cosmic Explorer sound', disable:'Disable ambient sound', enable:'Enable Cosmic Explorer sound', unavailable:'Ambient audio unavailable', active:'Ambient sound active', waiting:'Press to enable ambience', open:'Configure ambient sound' }
};

export function createAmbientAudioControl() {
  const wrapper = document.createElement('div');
  wrapper.className = 'ambient-audio-quick-control';
  wrapper.innerHTML = `
    <button type="button" class="ambient-audio-toggle" data-ambient-audio-toggle aria-pressed="false">
      <span aria-hidden="true" data-ambient-icon>◌</span>
      <span class="sr-only" data-ambient-label></span>
    </button>
    <button type="button" class="ambient-audio-settings-shortcut" data-ambient-settings-shortcut>
      <span aria-hidden="true">♫</span><span class="sr-only" data-ambient-settings-label></span>
    </button>`;
  const toggle = wrapper.querySelector('[data-ambient-audio-toggle]');
  const shortcut = wrapper.querySelector('[data-ambient-settings-shortcut]');

  const sync = (state = ambientAudioManager.getState()) => {
    const lang = getLanguage() === 'es' ? 'es':'en';
    const copy = COPY[lang];
    const active = Boolean(state.settings.enabled && state.authorized && state.contextState === 'running');
    const label = !state.supported ? copy.unavailable : state.settings.enabled ? (active ? copy.disable : copy.activate) : copy.enable;
    toggle.disabled = !state.supported;
    toggle.setAttribute('aria-pressed', String(active));
    toggle.setAttribute('aria-label', label);
    toggle.title = active ? `${copy.active} · ${state.profile?.names?.[lang] || ''}` : copy.waiting;
    toggle.querySelector('[data-ambient-icon]').textContent = active ? '◉' : state.settings.enabled ? '◌' : '○';
    toggle.querySelector('[data-ambient-label]').textContent = label;
    shortcut.setAttribute('aria-label', copy.open);
    shortcut.title = copy.open;
    shortcut.querySelector('[data-ambient-settings-label]').textContent = copy.open;
    wrapper.dataset.ambientActive = String(active);
  };

  toggle.addEventListener('click', async () => {
    const state = ambientAudioManager.getState();
    if (state.settings.enabled && state.authorized) await ambientAudioManager.toggleEnabled();
    else if (!state.settings.enabled) await ambientAudioManager.toggleEnabled();
    else await ambientAudioManager.activate();
  });
  shortcut.addEventListener('click', () => document.dispatchEvent(new CustomEvent('cosmic-explorer:appearance-open', { detail:{ tab:'sound' } })));
  window.addEventListener('cosmic-explorer:language-change', () => sync());
  const unsubscribe = ambientAudioManager.subscribe(sync);
  wrapper.destroy = unsubscribe;
  return wrapper;
}
