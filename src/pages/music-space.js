import { setMiniPlayerMode, toggleMiniPlayerVisibility } from '../components/layout/mini-player.js';
import { createSectionHeading } from '../components/ui/section-heading.js';
import { getIcon } from '../components/ui/icons.js';
import { createMusicVisualizer } from '../features/music/music-visualizer.js';
import { musicPlayer } from '../features/music/music-player.js';
import { t } from '../i18n/i18n.js';
import { appStore } from '../store/app-store.js';
import { activateRevealAnimations } from '../utils/reveal.js';

function formatTime(value) {
  if (!Number.isFinite(value) || value <= 0) return '0:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
  const megabytes = bytes / 1024 / 1024;
  return `${megabytes < 10 ? megabytes.toFixed(1) : Math.round(megabytes)} MB`;
}

function normalizeSearch(value) {
  return String(value || '').toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function createTrackRow(track, state, index) {
  const row = document.createElement('article');
  const active = track.id === state.currentTrackId;
  row.className = `music-track-row${active ? ' is-current' : ''}`;
  row.dataset.trackId = track.id;
  row.style.setProperty('--track-hue', String(track.accentSeed ?? 260));
  row.innerHTML = `
    <button class="track-play-button" type="button" data-track-action="play" aria-label="${t(active && state.isPlaying ? 'music.pauseTrack' : 'music.playTrack', { title: track.title })}">
      ${active && state.isPlaying ? getIcon('pause') : getIcon('play')}
    </button>
    <span class="track-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
    <span class="track-text"><strong></strong><small></small></span>
    <span class="track-album">${t('music.localLibrary')}</span>
    <span class="track-duration">${formatTime(track.duration)}</span>
    <button class="track-delete-button" type="button" data-track-action="delete" aria-label="${t('music.removeTrack', { title: track.title })}">${getIcon('trash')}</button>
  `;
  row.querySelector('.track-text strong').textContent = track.title;
  row.querySelector('.track-text small').textContent = track.artist;
  return row;
}

export function renderMusicSpacePage(outlet) {
  document.title = t('music.title');
  let destroyed = false;
  let stopReveal = () => {};
  let stopVisualizer = () => {};
  let unsubscribe = () => {};
  let unsubscribeAppStore = () => {};
  let query = '';
  let lastTrackSignature = '';

  const page = document.createElement('div');
  page.className = 'page music-page music-space-phase4';

  const intro = document.createElement('section');
  intro.className = 'page-hero container music-page-hero';
  const heading = createSectionHeading({
    eyebrow: t('music.eyebrow'),
    title: t('music.heading'),
    description: t('music.description')
  });
  heading.dataset.reveal = '';
  intro.append(heading);

  const playerSection = document.createElement('section');
  playerSection.className = 'music-player-section container';
  playerSection.innerHTML = `
    <div class="music-console glass-card" data-reveal>
      <section class="music-visual-panel" aria-label="${t('music.visualizerAria')}">
        <div class="music-visualizer-shell">
          <canvas class="music-visualizer-canvas" aria-hidden="true"></canvas>
          <div class="music-cover-orbit" aria-hidden="true">
            <span class="music-cover-core">${getIcon('music')}</span>
            <i></i><i></i><i></i>
          </div>
          <div class="music-visual-status"><span></span>${t('music.visualizerLive')}</div>
        </div>
        <div class="music-now-playing">
          <p class="eyebrow">${t('music.nowPlaying')}</p>
          <h2 data-music-title>${t('music.waiting')}</h2>
          <p data-music-artist>${t('music.private')}</p>
        </div>
      </section>

      <section class="music-control-panel" aria-label="${t('music.playerControls')}">
        <div class="music-control-track">
          <p class="eyebrow">${t('music.nowPlaying')}</p>
          <h2 data-music-control-title>${t('music.waiting')}</h2>
          <p data-music-control-artist>${t('music.private')}</p>
        </div>
        <div class="music-progress-row">
          <span data-music-current>0:00</span>
          <input class="music-progress" data-music-progress type="range" min="0" max="100" value="0" step="0.1" aria-label="${t('music.seek')}">
          <span data-music-duration>0:00</span>
        </div>
        <div class="music-primary-controls">
          <button class="music-option-button" type="button" data-music-action="shuffle" aria-label="${t('music.shuffle')}">${getIcon('shuffle')}</button>
          <button class="music-round-button" type="button" data-music-action="previous" aria-label="${t('music.previous')}">${getIcon('previous')}</button>
          <button class="music-main-play" type="button" data-music-action="play" aria-label="${t('music.play')}">${getIcon('play')}</button>
          <button class="music-round-button" type="button" data-music-action="next" aria-label="${t('music.next')}">${getIcon('next')}</button>
          <button class="music-option-button music-repeat-button" type="button" data-music-action="repeat" aria-label="${t('music.repeat')}">${getIcon('repeat')}<span data-repeat-badge></span></button>
        </div>
        <div class="music-secondary-controls">
          <button class="music-volume-button" type="button" data-music-action="mute" aria-label="${t('music.mute')}">${getIcon('volume')}</button>
          <input data-music-volume class="music-volume" type="range" min="0" max="1" value="0.7" step="0.01" aria-label="${t('music.volume')}">
          <p>${t('music.noAutoplay')}</p>
          <div class="music-mini-modes">
            <button class="button button--secondary music-mini-toggle" type="button" data-music-action="toggle-mini"></button>
            <button class="button button--secondary" type="button" data-music-action="mode-bar">${t('music.mini.bar')}</button>
            <button class="button button--secondary" type="button" data-music-action="mode-floating">${t('music.mini.floating')}</button>
            <button class="button button--secondary" type="button" data-music-action="external-player">${t('music.mini.external')}</button>
          </div>
          <label class="music-visualizer-picker">
            <span>${t('music.visualizer.choose')}</span>
            <select data-music-visualizer>
              <option value="bars">${t('music.visualizer.bars')}</option>
              <option value="orbit">${t('music.visualizer.orbit')}</option>
              <option value="wave">${t('music.visualizer.wave')}</option>
              <option value="black-hole">${t('music.visualizer.blackHole')}</option>
              <option value="constellation">${t('music.visualizer.constellation')}</option>
            </select>
          </label>
          <small class="music-mini-shortcut">${t('music.mini.shortcut')} ${t('music.mini.modeShortcut')}</small>
        </div>
      </section>
    </div>

    <aside class="music-upload-card glass-card" data-reveal>
      <div class="music-upload-heading">
        <div><p class="eyebrow">${t('music.uploadEyebrow')}</p><h2>${t('music.uploadTitle')}</h2></div>
        <button class="music-upload-trigger" type="button" data-music-action="choose" aria-label="${t('music.chooseFiles')}" title="${t('music.upload.quick')}">${getIcon('upload')}</button>
      </div>
      <p>${t('music.uploadDescription')}</p>
      <label class="music-drop-zone" data-music-drop-zone>
        <input class="sr-only" data-music-file-input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.opus,.webm" multiple>
        <span class="music-drop-icon" aria-hidden="true">${getIcon('upload')}</span>
        <strong>${t('music.dropTitle')}</strong>
        <small>${t('music.dropDescription')}</small>
        <span class="button button--primary">${t('music.chooseFiles')}</span>
      </label>
      <div class="music-privacy-note"><span aria-hidden="true">${getIcon('info')}</span><p>${t('music.privacy')}</p></div>
      <div class="music-library-summary">
        <div><strong data-library-count>0</strong><span>${t('music.tracks')}</span></div>
        <div><strong data-library-duration>0:00</strong><span>${t('music.totalTime')}</span></div>
        <div><strong data-library-size>0 MB</strong><span>${t('music.storage')}</span></div>
      </div>
    </aside>
  `;

  const librarySection = document.createElement('section');
  librarySection.className = 'section container music-library-section';
  librarySection.innerHTML = `
    <header class="music-library-header" data-reveal>
      <div><p class="eyebrow">${t('music.libraryEyebrow')}</p><h2>${t('music.libraryTitle')}</h2><p>${t('music.libraryDescription')}</p></div>
      <div class="music-library-actions">
        <label class="music-library-search">${getIcon('search')}<span class="sr-only">${t('music.searchLabel')}</span><input data-music-search type="search" placeholder="${t('music.searchPlaceholder')}" autocomplete="off"></label>
        <button class="button button--secondary music-clear-button" type="button" data-music-action="clear">${getIcon('trash')} ${t('music.clearLibrary')}</button>
      </div>
    </header>
    <div class="music-library-table glass-card" data-reveal>
      <div class="music-track-head" aria-hidden="true"><span></span><span>#</span><span>${t('music.trackColumn')}</span><span>${t('music.albumColumn')}</span><span>${t('music.timeColumn')}</span><span></span></div>
      <div class="music-track-list" data-music-track-list></div>
      <div class="music-empty-library" data-music-empty>
        <span aria-hidden="true">${getIcon('music')}</span>
        <h3>${t('music.emptyTitle')}</h3>
        <p>${t('music.emptyDescription')}</p>
      </div>
    </div>
    <p class="music-status sr-only" data-music-status aria-live="polite"></p>
  `;

  page.append(intro, playerSection, librarySection);
  outlet.replaceChildren(page);
  appStore.setState({ lastVisitedRoute: '/music-space' });

  const canvas = page.querySelector('.music-visualizer-canvas');
  const fileInput = page.querySelector('[data-music-file-input]');
  const dropZone = page.querySelector('[data-music-drop-zone]');
  const trackList = page.querySelector('[data-music-track-list]');
  const emptyState = page.querySelector('[data-music-empty]');
  const searchInput = page.querySelector('[data-music-search]');
  const progress = page.querySelector('[data-music-progress]');
  const volume = page.querySelector('[data-music-volume]');
  const status = page.querySelector('[data-music-status]');
  const visualizerSelect = page.querySelector('[data-music-visualizer]');

  const announce = (message) => {
    status.textContent = '';
    window.setTimeout(() => {
      if (!destroyed) status.textContent = message;
    }, 20);
  };

  const updateMiniToggle = () => {
    const store = appStore.getState();
    const visible = store.miniPlayerVisible !== false;
    const button = page.querySelector('[data-music-action="toggle-mini"]');
    button.textContent = visible ? t('music.mini.hide') : t('music.mini.show');
    button.setAttribute('aria-label', visible ? t('music.mini.hide') : t('music.mini.show'));
    button.setAttribute('aria-pressed', String(visible));
    page.querySelector('[data-music-action="mode-bar"]').classList.toggle('is-active', store.miniPlayerMode !== 'floating');
    page.querySelector('[data-music-action="mode-floating"]').classList.toggle('is-active', store.miniPlayerMode === 'floating');
    visualizerSelect.value = store.musicVisualizer || 'orbit';
    page.dataset.visualizerMode = store.musicVisualizer || 'orbit';
    page.querySelector('.music-cover-orbit').hidden = (store.musicVisualizer || 'orbit') !== 'orbit';
  };

  const render = (state) => {
    if (destroyed) return;
    const current = state.currentTrack;
    page.querySelector('[data-music-title]').textContent = current?.title ?? t('music.waiting');
    page.querySelector('[data-music-artist]').textContent = current?.artist ?? t('music.private');
    page.querySelector('[data-music-control-title]').textContent = current?.title ?? t('music.waiting');
    page.querySelector('[data-music-control-artist]').textContent = current?.artist ?? t('music.private');
    page.querySelector('[data-music-current]').textContent = formatTime(state.currentTime);
    page.querySelector('[data-music-duration]').textContent = formatTime(state.duration);
    const progressPercent = state.duration > 0 ? state.currentTime / state.duration * 100 : 0;
    progress.value = String(progressPercent);
    progress.style.setProperty('--progress', `${progressPercent}%`);
    volume.value = String(state.muted ? 0 : state.volume);
    volume.style.setProperty('--progress', `${(state.muted ? 0 : state.volume) * 100}%`);

    const playButton = page.querySelector('[data-music-action="play"]');
    playButton.innerHTML = state.isPlaying ? getIcon('pause') : getIcon('play');
    playButton.setAttribute('aria-label', state.isPlaying ? t('music.pause') : t('music.play'));
    playButton.disabled = !current;
    page.querySelector('[data-music-action="previous"]').disabled = !current;
    page.querySelector('[data-music-action="next"]').disabled = !current;

    const shuffleButton = page.querySelector('[data-music-action="shuffle"]');
    shuffleButton.classList.toggle('is-active', state.shuffle);
    shuffleButton.setAttribute('aria-pressed', String(state.shuffle));

    const repeatButton = page.querySelector('[data-music-action="repeat"]');
    repeatButton.classList.toggle('is-active', state.repeat !== 'off');
    repeatButton.setAttribute('aria-pressed', String(state.repeat !== 'off'));
    repeatButton.querySelector('[data-repeat-badge]').textContent = state.repeat === 'one' ? '1' : '';
    repeatButton.setAttribute('aria-label', t(`music.repeat.${state.repeat}`));

    const muteButton = page.querySelector('[data-music-action="mute"]');
    muteButton.innerHTML = state.muted || state.volume === 0 ? getIcon('volumeOff') : getIcon('volume');
    muteButton.setAttribute('aria-label', state.muted ? t('music.unmute') : t('music.mute'));

    const totalDuration = state.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
    const totalSize = state.tracks.reduce((sum, track) => sum + (track.size || 0), 0);
    page.querySelector('[data-library-count]').textContent = String(state.tracks.length);
    page.querySelector('[data-library-duration]').textContent = formatTime(totalDuration);
    page.querySelector('[data-library-size]').textContent = formatSize(totalSize);

    const trackSignature = `${state.tracks.map((track) => track.id).join('|')}::${state.currentTrackId || ''}::${state.isPlaying}::${query}`;
    if (trackSignature !== lastTrackSignature) {
      lastTrackSignature = trackSignature;
      const normalizedQuery = normalizeSearch(query);
      const filtered = state.tracks.filter((track) => normalizeSearch(`${track.title} ${track.artist} ${track.fileName}`).includes(normalizedQuery));
      trackList.replaceChildren(...filtered.map((track, index) => createTrackRow(track, state, index)));
      emptyState.hidden = state.tracks.length > 0;
      trackList.hidden = filtered.length === 0;
      if (state.tracks.length > 0 && filtered.length === 0) {
        emptyState.hidden = false;
        emptyState.querySelector('h3').textContent = t('music.noResultsTitle');
        emptyState.querySelector('p').textContent = t('music.noResultsDescription', { query });
      } else {
        emptyState.querySelector('h3').textContent = t('music.emptyTitle');
        emptyState.querySelector('p').textContent = t('music.emptyDescription');
      }
    }

    page.querySelector('.music-cover-orbit').classList.toggle('is-playing', state.isPlaying);
    page.querySelector('.music-visual-status').classList.toggle('is-live', state.isPlaying);
    page.querySelector('.music-clear-button').disabled = state.tracks.length === 0;
    updateMiniToggle();
    if (state.error) announce(t('music.error', { message: state.error }));
  };

  const uploadFiles = async (files) => {
    if (!files?.length) return;
    dropZone.classList.add('is-loading');
    announce(t('music.importing'));
    try {
      const result = await musicPlayer.addFiles(files);
      const messages = [];
      if (result.added.length) messages.push(t('music.added', { count: result.added.length }));
      else messages.push(t('music.noValidFiles'));
      if (result.rejected) messages.push(t('music.rejected', { count: result.rejected }));
      announce(messages.join(' '));
    } catch (error) {
      announce(t('music.error', { message: error.message }));
    } finally {
      dropZone.classList.remove('is-loading');
      fileInput.value = '';
    }
  };

  fileInput.addEventListener('change', () => uploadFiles(fileInput.files));
  dropZone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragover', (event) => event.preventDefault());
  dropZone.addEventListener('dragleave', (event) => {
    if (!dropZone.contains(event.relatedTarget)) dropZone.classList.remove('is-dragging');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    uploadFiles(event.dataTransfer?.files);
  });

  page.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-music-action]')?.dataset.musicAction;
    if (action === 'play') await musicPlayer.togglePlay();
    if (action === 'previous') await musicPlayer.previous();
    if (action === 'next') await musicPlayer.next();
    if (action === 'shuffle') musicPlayer.setShuffle(!musicPlayer.getState().shuffle);
    if (action === 'repeat') musicPlayer.cycleRepeat();
    if (action === 'mute') musicPlayer.toggleMute();
    if (action === 'choose') fileInput.click();
    if (action === 'toggle-mini') {
      const visible = toggleMiniPlayerVisibility();
      updateMiniToggle();
      announce(t(visible ? 'music.mini.visible' : 'music.mini.hidden'));
    }
    if (action === 'mode-bar') {
      setMiniPlayerMode('bar');
      toggleMiniPlayerVisibility(true);
      announce(t('music.mini.barActive'));
    }
    if (action === 'external-player') {
      try {
        const opened = await window.cosmicExplorerExternalPlayer?.open?.();
        announce(t(opened ? 'music.mini.externalOpened' : 'music.mini.externalUnsupported'));
      } catch (error) {
        announce(t('music.mini.externalError', { message: error.message }));
      }
    }
    if (action === 'mode-floating') {
      setMiniPlayerMode('floating');
      toggleMiniPlayerVisibility(true);
      announce(t('music.mini.floatingActive'));
    }
    if (action === 'clear' && window.confirm(t('music.clearConfirm'))) {
      await musicPlayer.clearLibrary();
      announce(t('music.cleared'));
    }
  });

  trackList.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-track-action]')?.dataset.trackAction;
    const row = event.target.closest('[data-track-id]');
    if (!action || !row) return;
    if (action === 'play') {
      const state = musicPlayer.getState();
      if (state.currentTrackId === row.dataset.trackId) await musicPlayer.togglePlay();
      else await musicPlayer.selectTrack(row.dataset.trackId, { play: true });
    }
    if (action === 'delete') {
      const track = musicPlayer.getState().tracks.find((item) => item.id === row.dataset.trackId);
      if (track && window.confirm(t('music.removeConfirm', { title: track.title }))) {
        await musicPlayer.removeTrack(track.id);
        announce(t('music.removed', { title: track.title }));
      }
    }
  });

  progress.addEventListener('input', () => {
    const state = musicPlayer.getState();
    musicPlayer.seek(Number(progress.value) / 100 * state.duration);
  });
  volume.addEventListener('input', () => musicPlayer.setVolume(volume.value));
  visualizerSelect.addEventListener('change', () => {
    appStore.setState({ musicVisualizer: visualizerSelect.value });
    announce(t('music.visualizer.changed', { name: visualizerSelect.options[visualizerSelect.selectedIndex].textContent }));
  });
  searchInput.addEventListener('input', () => {
    query = searchInput.value;
    render(musicPlayer.getState());
  });

  stopReveal = activateRevealAnimations(page);
  stopVisualizer = createMusicVisualizer(canvas, musicPlayer);
  unsubscribe = musicPlayer.subscribe(render);
  unsubscribeAppStore = appStore.subscribe(() => updateMiniToggle());
  musicPlayer.initialize();
  updateMiniToggle();

  return () => {
    destroyed = true;
    stopReveal();
    stopVisualizer();
    unsubscribe();
    unsubscribeAppStore();
  };
}
