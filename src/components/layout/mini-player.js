import { createMusicVisualizer } from '../../features/music/music-visualizer.js';
import { musicPlayer } from '../../features/music/music-player.js';
import { t } from '../../i18n/i18n.js';
import { appStore } from '../../store/app-store.js';
import { getIcon } from '../ui/icons.js';

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function setMiniPlayerVisible(visible) {
  appStore.setState({ miniPlayerVisible: Boolean(visible) });
}

export function toggleMiniPlayerVisibility(force) {
  const current = appStore.getState().miniPlayerVisible !== false;
  const next = typeof force === 'boolean' ? force : !current;
  setMiniPlayerVisible(next);
  return next;
}

export function setMiniPlayerMode(mode) {
  appStore.setState({ miniPlayerMode: mode === 'floating' ? 'floating' : 'bar' });
}

function canUseShortcutTarget(target) {
  if (!(target instanceof HTMLElement)) return true;
  return !target.closest('input, textarea, select, [contenteditable="true"]');
}

export function createMiniPlayer() {
  const player = document.createElement('aside');
  player.className = 'mini-player';
  player.hidden = true;
  player.setAttribute('aria-label', t('music.mini.label'));
  player.innerHTML = `
    <div class="mini-player-bar container" data-mini-bar>
      <a class="mini-player-track" href="#/music-space" aria-label="${t('music.mini.open')}">
        <span class="mini-player-art" aria-hidden="true">${getIcon('music')}</span>
        <span class="mini-player-copy"><strong data-mini-title></strong><small data-mini-artist></small></span>
      </a>
      <canvas class="mini-player-visualizer" data-mini-visualizer aria-hidden="true"></canvas>
      <div class="mini-player-controls">
        <button type="button" data-mini-action="previous" aria-label="${t('music.previous')}">${getIcon('previous')}</button>
        <button class="mini-player-play" type="button" data-mini-action="play" aria-label="${t('music.play')}">${getIcon('play')}</button>
        <button type="button" data-mini-action="next" aria-label="${t('music.next')}">${getIcon('next')}</button>
      </div>
      <div class="mini-player-progress-wrap">
        <span data-mini-current>0:00</span>
        <input data-mini-progress type="range" min="0" max="100" value="0" step="0.1" aria-label="${t('music.seek')}">
        <span data-mini-duration>0:00</span>
      </div>
      <div class="mini-player-visibility">
        <button type="button" data-mini-action="floating" aria-label="${t('music.mini.floating')}">${getIcon('expand')}</button>
        <button type="button" data-mini-action="hide" aria-label="${t('music.mini.hide')}">${getIcon('close')}</button>
      </div>
    </div>

    <div class="floating-player" data-floating-player hidden>
      <header class="floating-player-handle" data-floating-handle>
        <span>COSMIC_EXPLORER // AUDIO</span>
        <div>
          <button type="button" data-mini-action="external" aria-label="${t('music.mini.external')}">↗</button>
          <button type="button" data-mini-action="bar" aria-label="${t('music.mini.bar')}">▔</button>
          <button type="button" data-mini-action="hide" aria-label="${t('music.mini.hide')}">${getIcon('close')}</button>
        </div>
      </header>
      <a class="floating-player-track" href="#/music-space" aria-label="${t('music.mini.open')}">
        <span aria-hidden="true">♫</span>
        <strong data-floating-title></strong>
        <small data-floating-artist></small>
      </a>
      <canvas class="floating-player-visualizer" data-floating-visualizer aria-hidden="true"></canvas>
      <div class="floating-player-controls">
        <button type="button" data-mini-action="previous" aria-label="${t('music.previous')}">${getIcon('previous')}</button>
        <button type="button" data-mini-action="play" aria-label="${t('music.play')}">${getIcon('play')}</button>
        <button type="button" data-mini-action="next" aria-label="${t('music.next')}">${getIcon('next')}</button>
      </div>
      <div class="floating-player-progress">
        <span data-floating-current>0:00</span>
        <input data-floating-progress type="range" min="0" max="100" value="0" step="0.1" aria-label="${t('music.seek')}">
        <span data-floating-duration>0:00</span>
      </div>
      <div class="floating-player-volume">
        <span>VOL</span>
        <input data-floating-volume type="range" min="0" max="1" value="0.7" step="0.01" aria-label="${t('music.volume')}">
      </div>
    </div>
  `;

  const bar = player.querySelector('[data-mini-bar]');
  const floating = player.querySelector('[data-floating-player]');
  const barProgress = player.querySelector('[data-mini-progress]');
  const floatingProgress = player.querySelector('[data-floating-progress]');
  const floatingVolume = player.querySelector('[data-floating-volume]');
  const stopBarVisualizer = createMusicVisualizer(player.querySelector('[data-mini-visualizer]'), musicPlayer, { compact: true });
  const stopFloatingVisualizer = createMusicVisualizer(player.querySelector('[data-floating-visualizer]'), musicPlayer, { compact: true });
  let externalWindow = null;
  let stopExternalVisualizer = () => {};
  let unsubscribeExternal = () => {};

  function externalPlayerSupported() {
    return Boolean(window.documentPictureInPicture?.requestWindow || window.open);
  }

  function closeExternalPlayer() {
    stopExternalVisualizer();
    stopExternalVisualizer = () => {};
    unsubscribeExternal();
    unsubscribeExternal = () => {};
    if (externalWindow && !externalWindow.closed) externalWindow.close();
    externalWindow = null;
  }

  async function openExternalPlayer() {
    if (!externalPlayerSupported() || !musicPlayer.getState().currentTrack) return false;
    if (externalWindow && !externalWindow.closed) {
      externalWindow.focus();
      return true;
    }
    try {
      if (window.isSecureContext && window.documentPictureInPicture?.requestWindow) {
        externalWindow = await window.documentPictureInPicture.requestWindow({ width: 320, height: 390 });
      } else {
        externalWindow = window.open('', 'CosmicExplorerExternalPlayer', 'popup=yes,width=340,height=430,resizable=yes');
      }
    } catch (error) {
      console.warn('Document Picture-in-Picture was unavailable; using a regular external window.', error);
      externalWindow = window.open('', 'CosmicExplorerExternalPlayer', 'popup=yes,width=340,height=430,resizable=yes');
    }
    if (!externalWindow) throw new Error(t('music.mini.externalPopupBlocked'));
    const doc = externalWindow.document;
    doc.title = 'Cosmic Explorer Audio';
    doc.body.innerHTML = `
      <main class="pip-player">
        <header><span>COSMIC_EXPLORER // AUDIO</span><button data-pip-action="close" aria-label="${t('music.mini.externalClosed')}">×</button></header>
        <section class="pip-track"><span>♫</span><div><strong data-pip-title></strong><small data-pip-artist></small></div></section>
        <canvas data-pip-visualizer></canvas>
        <div class="pip-controls">
          <button data-pip-action="previous" aria-label="${t('music.previous')}">${getIcon('previous')}</button>
          <button data-pip-action="play" aria-label="${t('music.play')}">${getIcon('play')}</button>
          <button data-pip-action="next" aria-label="${t('music.next')}">${getIcon('next')}</button>
        </div>
        <div class="pip-progress"><span data-pip-current>0:00</span><input data-pip-seek type="range" min="0" max="100" value="0" step=".1"><span data-pip-duration>0:00</span></div>
        <div class="pip-volume"><span>VOL</span><input data-pip-volume type="range" min="0" max="1" value=".7" step=".01"></div>
      </main>`;
    const style = doc.createElement('style');
    style.textContent = `
      *{box-sizing:border-box}html,body{margin:0;min-height:100%;background:#030712;color:#f8fafc;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}button,input{font:inherit}button{cursor:pointer}.pip-player{min-height:100vh;padding:10px;border:1px solid rgba(125,211,252,.75);background:linear-gradient(rgba(125,211,252,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(125,211,252,.035) 1px,transparent 1px),#030712;background-size:13px 13px}header{display:flex;align-items:center;justify-content:space-between;padding:4px 5px 9px;border-bottom:1px solid rgba(125,211,252,.22);color:#c4b5fd;font-size:10px;font-weight:800;letter-spacing:.14em}header button{width:28px;height:28px;border:1px solid transparent;color:#e9d5ff;background:transparent}.pip-track{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:10px;padding:14px 7px 10px}.pip-track>span{color:#a78bfa;font-size:19px}.pip-track div{display:grid;min-width:0}.pip-track strong,.pip-track small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pip-track strong{font-size:14px}.pip-track small{margin-top:3px;color:#cbd5e1;font-size:11px}canvas{display:block;width:100%;height:105px;border-block:1px solid rgba(125,211,252,.18);background:rgba(2,5,16,.5)}.pip-controls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 6px 6px}.pip-controls button{display:grid;place-items:center;min-height:39px;border:1px solid rgba(125,211,252,.2);border-radius:4px;color:#e9d5ff;background:rgba(124,58,237,.08)}svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.pip-progress,.pip-volume{display:grid;align-items:center;gap:7px;padding:7px}.pip-progress{grid-template-columns:35px 1fr 35px;color:#94a3b8;font-size:9px}.pip-progress span:last-child{text-align:right}.pip-volume{grid-template-columns:34px 1fr;color:#c4b5fd;font-size:10px}input{width:100%;accent-color:#a855f7}`;
    doc.head.append(style);
    const canvas = doc.querySelector('[data-pip-visualizer]');
    stopExternalVisualizer = createMusicVisualizer(canvas, musicPlayer, { compact: true });
    const renderExternal = (state) => {
      if (!externalWindow || externalWindow.closed || !state.currentTrack) return;
      doc.querySelector('[data-pip-title]').textContent = state.currentTrack.title;
      doc.querySelector('[data-pip-artist]').textContent = state.currentTrack.artist;
      doc.querySelector('[data-pip-current]').textContent = formatTime(state.currentTime);
      doc.querySelector('[data-pip-duration]').textContent = formatTime(state.duration);
      const percent = state.duration > 0 ? state.currentTime / state.duration * 100 : 0;
      doc.querySelector('[data-pip-seek]').value = String(percent);
      doc.querySelector('[data-pip-volume]').value = String(state.muted ? 0 : state.volume);
      const play = doc.querySelector('[data-pip-action="play"]');
      play.innerHTML = state.isPlaying ? getIcon('pause') : getIcon('play');
      play.setAttribute('aria-label', state.isPlaying ? t('music.pause') : t('music.play'));
    };
    doc.body.addEventListener('click', (event) => {
      const action = event.target.closest('[data-pip-action]')?.dataset.pipAction;
      if (action === 'play') musicPlayer.togglePlay();
      if (action === 'previous') musicPlayer.previous();
      if (action === 'next') musicPlayer.next();
      if (action === 'close') closeExternalPlayer();
    });
    doc.querySelector('[data-pip-seek]').addEventListener('input', (event) => {
      const state = musicPlayer.getState();
      musicPlayer.seek(Number(event.target.value) / 100 * state.duration);
    });
    doc.querySelector('[data-pip-volume]').addEventListener('input', (event) => musicPlayer.setVolume(event.target.value));
    unsubscribeExternal = musicPlayer.subscribe(renderExternal);
    externalWindow.addEventListener('pagehide', () => {
      stopExternalVisualizer();
      unsubscribeExternal();
      externalWindow = null;
    }, { once: true });
    return true;
  }

  window.cosmicExplorerExternalPlayer = { open: openExternalPlayer, close: closeExternalPlayer, supported: externalPlayerSupported };

  function applyFloatingPosition() {
    const saved = appStore.getState().miniPlayerPosition || {};
    const width = floating.offsetWidth || 250;
    const height = floating.offsetHeight || 270;
    const x = Number.isFinite(saved.x) ? Math.min(Math.max(8, saved.x), window.innerWidth - width - 8) : window.innerWidth - width - 24;
    const y = Number.isFinite(saved.y) ? Math.min(Math.max(82, saved.y), window.innerHeight - height - 16) : 110;
    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;
  }

  const render = (state) => {
    const store = appStore.getState();
    const visible = Boolean(state.currentTrack) && store.miniPlayerVisible !== false;
    const mode = store.miniPlayerMode === 'floating' ? 'floating' : 'bar';
    player.hidden = !visible;
    player.classList.toggle('is-floating', visible && mode === 'floating');
    bar.hidden = !visible || mode !== 'bar';
    floating.hidden = !visible || mode !== 'floating';
    document.body.classList.toggle('has-mini-player', visible && mode === 'bar');
    document.body.classList.toggle('has-floating-player', visible && mode === 'floating');
    if (!visible) return;
    const percent = state.duration > 0 ? state.currentTime / state.duration * 100 : 0;
    player.querySelector('[data-mini-title]').textContent = state.currentTrack.title;
    player.querySelector('[data-mini-artist]').textContent = state.currentTrack.artist;
    player.querySelector('[data-floating-title]').textContent = state.currentTrack.title;
    player.querySelector('[data-floating-artist]').textContent = state.currentTrack.artist;
    player.querySelector('[data-mini-current]').textContent = formatTime(state.currentTime);
    player.querySelector('[data-mini-duration]').textContent = formatTime(state.duration);
    player.querySelector('[data-floating-current]').textContent = formatTime(state.currentTime);
    player.querySelector('[data-floating-duration]').textContent = formatTime(state.duration);
    for (const input of [barProgress, floatingProgress]) {
      input.value = String(percent);
      input.style.setProperty('--progress', `${percent}%`);
    }
    floatingVolume.value = String(state.muted ? 0 : state.volume);
    player.querySelectorAll('[data-mini-action="play"]').forEach((button) => {
      button.innerHTML = state.isPlaying ? getIcon('pause') : getIcon('play');
      button.setAttribute('aria-label', state.isPlaying ? t('music.pause') : t('music.play'));
    });
    if (mode === 'floating') requestAnimationFrame(applyFloatingPosition);
  };

  player.addEventListener('click', (event) => {
    const action = event.target.closest('[data-mini-action]')?.dataset.miniAction;
    if (action === 'play') musicPlayer.togglePlay();
    if (action === 'previous') musicPlayer.previous();
    if (action === 'next') musicPlayer.next();
    if (action === 'hide') toggleMiniPlayerVisibility(false);
    if (action === 'floating') setMiniPlayerMode('floating');
    if (action === 'bar') setMiniPlayerMode('bar');
    if (action === 'external') openExternalPlayer();
  });

  for (const input of [barProgress, floatingProgress]) {
    input.addEventListener('input', () => {
      const state = musicPlayer.getState();
      musicPlayer.seek((Number(input.value) / 100) * state.duration);
    });
  }
  floatingVolume.addEventListener('input', () => musicPlayer.setVolume(floatingVolume.value));

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;
  const handle = player.querySelector('[data-floating-handle]');
  handle.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    dragging = true;
    const rect = floating.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    handle.setPointerCapture?.(event.pointerId);
    floating.classList.add('is-dragging');
  });
  handle.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const x = Math.min(Math.max(8, event.clientX - offsetX), window.innerWidth - floating.offsetWidth - 8);
    const y = Math.min(Math.max(72, event.clientY - offsetY), window.innerHeight - floating.offsetHeight - 8);
    floating.style.left = `${x}px`;
    floating.style.top = `${y}px`;
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    floating.classList.remove('is-dragging');
    appStore.setState({ miniPlayerPosition: { x: parseFloat(floating.style.left), y: parseFloat(floating.style.top) } });
  };
  handle.addEventListener('pointerup', endDrag);
  handle.addEventListener('pointercancel', endDrag);

  const onKeydown = (event) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || !canUseShortcutTarget(event.target)) return;
    const key = String(event.key || '').toLowerCase();
    if (key === 'm' && musicPlayer.getState().currentTrack) {
      event.preventDefault();
      toggleMiniPlayerVisibility();
    }
    if (key === 'p' && musicPlayer.getState().currentTrack) {
      event.preventDefault();
      setMiniPlayerMode(appStore.getState().miniPlayerMode === 'floating' ? 'bar' : 'floating');
    }
  };

  musicPlayer.subscribe(render);
  appStore.subscribe(() => render(musicPlayer.getState()));
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', applyFloatingPosition);
  musicPlayer.initialize();
  return player;
}
