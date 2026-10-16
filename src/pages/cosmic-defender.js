import levelsData from '../data/game-levels.json' with { type: 'json' };
import { appStore } from '../store/app-store.js';
import { getLanguage } from '../i18n/i18n.js';
import { CosmicDefenderEngine, GAME_STATES, cosmicDefenderThemes } from '../features/game/cosmic-defender-engine.js';
import { cosmicDefenderAudio, cosmicDefenderTracks } from '../features/game/cosmic-defender-audio.js';
import { emitKiraGameContext } from '../features/kira/kira-events.js';
import { musicPlayer } from '../features/music/music-player.js';
import { getLevelDefinition } from '../features/game/cosmic-defender-levels.js';
import { loadPlayerProfile, updatePlayerName, recordAttempt, recordGameResult, resetProgress, sanitizePlayerName, isDifficultyUnlocked } from '../features/game/player-profile.js';

const copy = {
  en: {
    title:'Cosmic Defender', subtitle:'Choose a world, master its enemy family, and defend Cosmic Explorer.', profile:'Pilot profile', save:'Save name', scores:'Progress & scores', play:'Launch level', locked:'Locked', available:'Available', completed:'Completed', best:'Best', enemies:'Enemies', lives:'Lives', accuracy:'Accuracy', attempts:'Attempts', reset:'Reset progress', score:'Score', level:'Level', pause:'Pause', resume:'Resume', fire:'FIRE', complete:'Level complete', defeated:'Mission failed', retry:'Retry', continue:'Next level', selector:'Level selector', newBest:'NEW BEST SCORE', confirmReset:'Delete saved scores and difficulty progress? Your pilot name can be preserved.', removeName:'Also reset the pilot name', cancel:'Cancel', confirm:'Reset', controls:'Move with arrows or WASD. Fire with Space. Pause with P or Esc.', preparing:'PREPARING', failed:'LEVEL COULD NOT START', details:'View details', back:'Back to selector', waveComplete:'WAVE COMPLETE', nextWave:'NEXT WAVE IN', wave:'WAVE', boss:'FINAL BOSS', exit:'Exit level', loadingHint:'Loading enemy family, formation, and combat patterns…', normal:'Normal', hard:'Hard', difficulty:'Difficulty', hardLocked:'Complete Normal to unlock Hard', hardUnlocked:'HARD MODE UNLOCKED', multiplier:'Score multiplier', roster:'Enemy family', bossLabel:'Boss', rank:'Rank', highestWave:'Highest wave', normalBest:'Normal best', hardBest:'Hard best', audio:'Game audio', audioSettings:'Audio controls', masterVolume:'Master volume', musicVolume:'Music volume', effectsVolume:'Effects volume', musicOn:'Music', effectsOn:'Effects', vibration:'Vibration', muteAll:'Mute all', unmuteAll:'Restore sound', currentTrack:'Current track', audioUnavailable:'Web Audio is not available in this browser', playing:'Playing', musicPaused:'Music paused', pauseMusic:'Pause music', resumeMusic:'Resume music', audioLocal:'Procedural Web Audio · settings saved locally', close:'Close'
  },
  es: {
    title:'Cosmic Defender', subtitle:'Elige un mundo, domina su familia de enemigos y defiende Cosmic Explorer.', profile:'Perfil del piloto', save:'Guardar nombre', scores:'Progreso y puntuaciones', play:'Iniciar nivel', locked:'Bloqueado', available:'Disponible', completed:'Completado', best:'Mejor', enemies:'Enemigos', lives:'Vidas', accuracy:'Precisión', attempts:'Intentos', reset:'Reiniciar progreso', score:'Puntuación', level:'Nivel', pause:'Pausa', resume:'Reanudar', fire:'DISPARAR', complete:'Nivel completado', defeated:'Misión fallida', retry:'Repetir', continue:'Siguiente nivel', selector:'Selector de niveles', newBest:'NUEVA MEJOR PUNTUACIÓN', confirmReset:'¿Eliminar puntuaciones y progreso de dificultad? Puedes conservar el nombre del piloto.', removeName:'También reiniciar el nombre del piloto', cancel:'Cancelar', confirm:'Reiniciar', controls:'Muévete con Flechas o WASD. Dispara con Espacio. Pausa con P o Esc.', preparing:'PREPARANDO', failed:'NO SE PUDO INICIAR EL NIVEL', details:'Ver detalles', back:'Volver al selector', waveComplete:'OLEADA COMPLETADA', nextWave:'SIGUIENTE OLEADA EN', wave:'OLEADA', boss:'BOSS FINAL', exit:'Salir del nivel', loadingHint:'Cargando familia enemiga, formación y patrones de combate…', normal:'Normal', hard:'Difícil', difficulty:'Dificultad', hardLocked:'Completa Normal para desbloquear Difícil', hardUnlocked:'MODO DIFÍCIL DESBLOQUEADO', multiplier:'Multiplicador de puntuación', roster:'Familia de enemigos', bossLabel:'Jefe', rank:'Rango', highestWave:'Mayor oleada', normalBest:'Mejor en Normal', hardBest:'Mejor en Difícil', audio:'Audio del juego', audioSettings:'Controles de audio', masterVolume:'Volumen general', musicVolume:'Volumen de música', effectsVolume:'Volumen de efectos', musicOn:'Música', effectsOn:'Efectos', vibration:'Vibración', muteAll:'Silenciar todo', unmuteAll:'Restaurar sonido', currentTrack:'Pista actual', audioUnavailable:'Web Audio no está disponible en este navegador', playing:'Reproduciendo', musicPaused:'Música pausada', pauseMusic:'Pausar música', resumeMusic:'Reanudar música', audioLocal:'Web Audio procedural · ajustes guardados localmente', close:'Cerrar'
  }
};

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()));
const capturePointerSafely = (element, pointerId) => { try { element.setPointerCapture?.(pointerId); } catch { /* Pointer may already be released. */ } };
const formatNumber = (value) => Number(value || 0).toLocaleString();
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;' })[character]);

export function renderCosmicDefenderPage(outlet) {
  const language = getLanguage();
  const tx = copy[language] || copy.en;
  document.title = `${tx.title} | Cosmic Explorer`;

  let profile = loadPlayerProfile();
  let engine = null;
  let selected = 'mercury';
  let selectedDifficulty = 'normal';
  let launching = false;
  let announcementTimer = 0;
  let restoreSiteMusic = false;
  let audioUnsubscribe = null;
  const pageController = new AbortController();
  const { signal } = pageController;

  const page = document.createElement('div');
  page.className = 'page cosmic-defender-page';
  page.innerHTML = `
    <section class="game-hero container">
      <div><p class="eyebrow">COSMIC_EXPLORER ARCADE</p><h1>${tx.title}</h1><p>${tx.subtitle}</p></div>
      <div class="game-profile glass-card">
        <label for="pilot-name">${tx.profile}</label>
        <div><input id="pilot-name" maxlength="16" autocomplete="nickname" value="${escapeHtml(profile.playerName)}"><button class="button button--secondary" data-save-name>${tx.save}</button></div>
        <small>1–16 characters · stored only on this device</small>
      </div>
    </section>

    <section class="game-shell container" data-shell>
      <aside class="game-level-panel glass-card" aria-label="${tx.selector}" data-level-panel>
        <div class="game-panel-heading"><div><p class="eyebrow">SOLAR ROUTE</p><h2>${tx.selector}</h2></div><button class="game-reset-link" data-reset>${tx.reset}</button></div>
        <div class="game-level-grid" data-level-grid></div>
      </aside>

      <section class="game-stage glass-card" data-stage tabindex="-1">
        <div class="game-stage-intro" data-intro>
          <div class="game-world-orb" data-world-orb></div>
          <p class="eyebrow" data-world-status></p><h2 data-world-name></h2><p data-world-description></p>
          <div class="game-difficulty" aria-label="${tx.difficulty}">
            <span>${tx.difficulty}</span>
            <div><button data-difficulty="normal">${tx.normal}</button><button data-difficulty="hard">${tx.hard}</button></div>
            <small data-difficulty-hint></small>
          </div>
          <div class="game-world-stats" data-world-stats></div>
          <div class="game-enemy-preview"><div><span>${tx.roster}</span><ul data-enemy-roster></ul></div><div><span>${tx.bossLabel}</span><b data-boss-name></b></div></div>
          <button class="button button--primary" data-launch>${tx.play}</button>
          <button class="game-audio-open" data-audio-toggle>🔊 ${tx.audio}</button>
          <p class="game-control-help">${tx.controls}</p>
        </div>

        <div class="game-session" data-session hidden>
          <div class="game-hud" aria-live="polite">
            <div class="game-hud__left"><b data-hud-name></b><small>${tx.lives}: <strong data-hud-lives>3</strong></small></div>
            <div class="game-hud__center"><b><span data-hud-level></span> · <span data-hud-difficulty></span></b><small>${tx.wave} <strong data-hud-wave>1</strong>/<strong data-hud-total>4</strong> · <span data-hud-wave-name></span></small></div>
            <div class="game-hud__right"><b>${tx.score}: <strong data-hud-score>0</strong></b><small>${tx.best}: <strong data-hud-best>0</strong> · ×<strong data-hud-multiplier>1</strong></small></div>
            <div class="game-hud__actions"><button class="game-hud-button" data-audio-toggle aria-label="${tx.audio}">♫</button><button class="game-hud-button" data-pause aria-label="${tx.pause}">Ⅱ</button><button class="game-hud-button" data-exit aria-label="${tx.exit}">×</button></div>
          </div>

          <div class="game-canvas-viewport" data-viewport>
            <canvas class="game-canvas" data-canvas tabindex="0" aria-label="Cosmic Defender game canvas"></canvas>
            <div class="game-wave-message" data-wave-message hidden></div>
            <div class="game-pause-overlay" data-pause-overlay hidden><p class="eyebrow">${tx.pause}</p><h2>${tx.pause}</h2><button class="button button--primary" data-resume>${tx.resume}</button></div>
            <div class="game-loading-overlay" data-loading-overlay hidden><div class="game-loader" aria-hidden="true"></div><p class="eyebrow" data-loading-title></p><h2 data-loading-world></h2><small>${tx.loadingHint}</small></div>
            <div class="game-error-overlay" data-error-overlay hidden><p class="eyebrow">SYSTEM ALERT</p><h2>${tx.failed}</h2><details><summary>${tx.details}</summary><pre data-error-details></pre></details><div><button class="button button--primary" data-retry-start>${tx.retry}</button><button class="button button--secondary" data-error-back>${tx.back}</button></div></div>
          </div>

          <div class="game-mobile-controls" aria-label="Touch controls"><div class="game-joystick" data-joystick><span data-joystick-knob></span></div><button class="game-fire" data-fire>${tx.fire}</button></div>
        </div>

        <div class="game-result" data-result hidden></div>

        <aside class="game-audio-panel" data-audio-panel hidden aria-label="${tx.audioSettings}">
          <div class="game-audio-panel__header"><div><p class="eyebrow">COSMIC_EXPLORER SOUND SYSTEM</p><h3>${tx.audioSettings}</h3></div><button data-audio-close aria-label="${tx.close}">×</button></div>
          <div class="game-audio-track"><span>${tx.currentTrack}</span><strong data-audio-title></strong><small data-audio-status></small></div>
          <label class="game-audio-slider"><span>${tx.masterVolume}<output data-audio-output="master"></output></span><input type="range" min="0" max="1" step="0.01" data-audio-volume="master"></label>
          <label class="game-audio-slider"><span>${tx.musicVolume}<output data-audio-output="music"></output></span><input type="range" min="0" max="1" step="0.01" data-audio-volume="music"></label>
          <label class="game-audio-slider"><span>${tx.effectsVolume}<output data-audio-output="sfx"></output></span><input type="range" min="0" max="1" step="0.01" data-audio-volume="sfx"></label>
          <div class="game-audio-actions">
            <button data-audio-action="music"></button><button data-audio-action="sfx"></button><button data-audio-action="vibration"></button><button data-audio-action="music-play"></button><button data-audio-action="mute"></button>
          </div>
          <small class="game-audio-support" data-audio-support></small>
        </aside>
      </section>
    </section>

    <section class="game-scoreboard container glass-card" data-scoreboard>
      <div class="game-panel-heading"><div><p class="eyebrow">PILOT: <span data-score-name></span></p><h2>${tx.scores}</h2></div></div>
      <div class="game-score-table-wrap"><table><thead><tr><th>${tx.level}</th><th>World</th><th>${tx.normalBest}</th><th>${tx.hardBest}</th><th>Status</th><th>${tx.highestWave}</th><th>${tx.attempts}</th></tr></thead><tbody data-score-body></tbody></table></div>
    </section>

    <dialog class="game-reset-dialog" data-reset-dialog><form method="dialog"><h2>${tx.reset}</h2><p>${tx.confirmReset}</p><label><input type="checkbox" data-remove-name> ${tx.removeName}</label><div><button value="cancel" class="button button--secondary">${tx.cancel}</button><button value="confirm" class="button button--primary">${tx.confirm}</button></div></form></dialog>
  `;
  outlet.replaceChildren(page);

  const query = (selector) => page.querySelector(selector);
  const grid = query('[data-level-grid]');
  const shell = query('[data-shell]');
  const stage = query('[data-stage]');
  const session = query('[data-session]');
  const canvas = query('[data-canvas]');
  const viewport = query('[data-viewport]');
  const loadingOverlay = query('[data-loading-overlay]');
  const errorOverlay = query('[data-error-overlay]');
  const pauseOverlay = query('[data-pause-overlay]');
  const waveMessage = query('[data-wave-message]');
  const audioPanel = query('[data-audio-panel]');

  const statusLabel = (status) => tx[status] || status;

  function syncAudioPanel(state = cosmicDefenderAudio.getState()) {
    const trackId = engine ? state.levelId : selected;
    const track = cosmicDefenderTracks[trackId] || cosmicDefenderTracks.mercury;
    query('[data-audio-title]').textContent = `${cosmicDefenderThemes[trackId]?.name || trackId} — ${track.title}${state.bossMode ? ' · BOSS MIX' : ''}`;
    query('[data-audio-status]').textContent = !state.supported ? tx.audioUnavailable : state.musicPlaying && state.settings.musicEnabled && !state.settings.muted ? tx.playing : tx.musicPaused;
    for (const channel of ['master','music','sfx']) {
      const input = query(`[data-audio-volume="${channel}"]`);
      const output = query(`[data-audio-output="${channel}"]`);
      input.value = String(state.settings[channel]);
      output.textContent = `${Math.round(state.settings[channel] * 100)}%`;
    }
    const setButton = (action, active, label) => {
      const button = query(`[data-audio-action="${action}"]`);
      button.classList.toggle('is-active', active);
      button.textContent = `${active ? '✓' : '○'} ${label}`;
    };
    setButton('music', state.settings.musicEnabled, tx.musicOn);
    setButton('sfx', state.settings.sfxEnabled, tx.effectsOn);
    setButton('vibration', state.settings.vibrationEnabled, tx.vibration);
    const musicPlayButton = query('[data-audio-action="music-play"]');
    musicPlayButton.classList.toggle('is-active', state.musicPlaying);
    musicPlayButton.textContent = state.musicPlaying ? `Ⅱ ${tx.pauseMusic}` : `▶ ${tx.resumeMusic}`;
    const muteButton = query('[data-audio-action="mute"]');
    muteButton.classList.toggle('is-active', state.settings.muted);
    muteButton.textContent = state.settings.muted ? `🔇 ${tx.unmuteAll}` : `🔊 ${tx.muteAll}`;
    query('[data-audio-support]').textContent = state.supported ? tx.audioLocal : tx.audioUnavailable;
  }

  function pauseSiteMusicForGame() {
    const siteMusic = musicPlayer.getState();
    restoreSiteMusic = restoreSiteMusic || Boolean(siteMusic.isPlaying);
    if (restoreSiteMusic) musicPlayer.pause();
  }

  async function restoreSiteMusicIfNeeded() {
    if (!restoreSiteMusic) return;
    restoreSiteMusic = false;
    try { await musicPlayer.play(); }
    catch (error) { console.warn('[Cosmic Defender] Site music could not resume.', error); }
  }

  function toggleAudioPanel(force) {
    const shouldOpen = typeof force === 'boolean' ? force : audioPanel.hidden;
    audioPanel.hidden = !shouldOpen;
    if (shouldOpen) {
      cosmicDefenderAudio.activate();
      syncAudioPanel();
    }
  }
  const modeProgress = (levelId = selected, difficulty = selectedDifficulty) => profile.levels[levelId][difficulty];
  const localizedLevelName = (id = selected) => language === 'es' ? ({ mercury:'Mercurio', venus:'Venus', earth:'Tierra', mars:'Marte', jupiter:'Júpiter', saturn:'Saturno', uranus:'Urano', neptune:'Neptuno' }[id] || cosmicDefenderThemes[id]?.name || id) : (cosmicDefenderThemes[id]?.name || id);
  const syncKiraGame = (active = false, wave = 0) => emitKiraGameContext({ active, levelId: selected, levelName: localizedLevelName(), difficulty: selectedDifficulty, wave });

  function renderLevels() {
    grid.innerHTML = levelsData.levels.map((level) => {
      const progress = profile.levels[level.id];
      const theme = cosmicDefenderThemes[level.id];
      const normalBest = progress.normal.bestScore;
      const hardMark = progress.hard.unlocked ? `${tx.hard}: ${formatNumber(progress.hard.bestScore)}` : `🔒 ${tx.hard}`;
      return `<button class="game-level-card ${selected === level.id ? 'is-selected' : ''}" data-level="${level.id}" ${progress.status === 'locked' ? 'disabled' : ''} style="--level-accent:${level.accentColor}"><span class="game-level-number">${String(level.order).padStart(2, '0')}</span><span><b>${theme.name}</b><small>${statusLabel(progress.status)} · ${tx.normal}: ${formatNumber(normalBest)} · ${hardMark}</small></span><i></i></button>`;
    }).join('');

    query('[data-score-name]').textContent = profile.playerName;
    query('[data-score-body]').innerHTML = levelsData.levels.map((level) => {
      const progress = profile.levels[level.id];
      const highest = Math.max(progress.normal.highestWave, progress.hard.highestWave);
      const attempts = progress.normal.attempts + progress.hard.attempts;
      return `<tr><td>${level.order}</td><td>${cosmicDefenderThemes[level.id].world}</td><td>${progress.normal.bestScore ? formatNumber(progress.normal.bestScore) : '—'} <small>${progress.normal.rank}</small></td><td>${progress.hard.unlocked ? `${progress.hard.bestScore ? formatNumber(progress.hard.bestScore) : '0'} <small>${progress.hard.rank}</small>` : '🔒'}</td><td><span class="score-status score-status--${progress.status}">${statusLabel(progress.status)}</span></td><td>${highest || '—'}</td><td>${attempts}</td></tr>`;
    }).join('');

    grid.querySelectorAll('[data-level]').forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.level;
      if (!isDifficultyUnlocked(profile, selected, selectedDifficulty)) selectedDifficulty = 'normal';
      renderLevels();
      renderIntro();
      syncAudioPanel();
    }, { signal }));
  }

  function renderIntro() {
    const levelData = levelsData.levels.find((item) => item.id === selected);
    const progress = profile.levels[selected];
    const theme = cosmicDefenderThemes[selected];
    const definition = getLevelDefinition(selected);
    const unlocked = isDifficultyUnlocked(profile, selected, selectedDifficulty);
    const current = modeProgress();
    query('[data-world-name]').textContent = theme.name;
    query('[data-world-status]').textContent = `${statusLabel(progress.status)} · LEVEL ${levelData.order} · ${selectedDifficulty === 'hard' ? tx.hard : tx.normal}`;
    query('[data-world-description]').textContent = `${definition.description} ${definition.waves.length} combat waves + ${definition.boss.name}.`;
    query('[data-world-orb]').style.setProperty('--world-color', levelData.accentColor);
    query('[data-world-stats]').innerHTML = `<span>${tx.best}<b>${formatNumber(current.bestScore)}</b></span><span>${tx.rank}<b>${current.rank}</b></span><span>${tx.attempts}<b>${current.attempts}</b></span><span>${tx.highestWave}<b>${current.highestWave || 0}/${definition.waves.length + 1}</b></span><span>${tx.multiplier}<b>×${selectedDifficulty === 'hard' ? '1.5' : '1'}</b></span>`;
    query('[data-enemy-roster]').innerHTML = theme.roster.map((name) => `<li>${escapeHtml(name)}</li>`).join('');
    query('[data-boss-name]').textContent = definition.boss.name;
    query('[data-difficulty-hint]').textContent = selectedDifficulty === 'hard' && !progress.hard.unlocked ? tx.hardLocked : selectedDifficulty === 'hard' ? 'Faster enemies · new formations · elite variants · extra boss attack' : 'Standard patterns · complete this mode to unlock Hard';
    query('[data-launch]').disabled = progress.status === 'locked' || !unlocked;
    page.querySelectorAll('[data-difficulty]').forEach((button) => {
      const mode = button.dataset.difficulty;
      button.classList.toggle('is-active', mode === selectedDifficulty);
      button.disabled = mode === 'hard' && !progress.hard.unlocked;
      button.title = button.disabled ? tx.hardLocked : '';
    });
    syncKiraGame(false, 0);
  }

  function hideAllStageViews() {
    query('[data-intro]').hidden = true;
    session.hidden = true;
    query('[data-result]').hidden = true;
  }

  function clearAnnouncement() {
    window.clearTimeout(announcementTimer);
    waveMessage.hidden = true;
    waveMessage.textContent = '';
  }

  function showAnnouncement(html, duration = 0) {
    clearAnnouncement();
    waveMessage.innerHTML = html;
    waveMessage.hidden = false;
    if (duration > 0) announcementTimer = window.setTimeout(clearAnnouncement, duration);
  }

  function cleanupEngine() {
    engine?.destroy();
    engine = null;
    cosmicDefenderAudio.stopLevel();
    clearAnnouncement();
    pauseOverlay.hidden = true;
    query('[data-pause]').textContent = 'Ⅱ';
  }

  function showSelector() {
    cleanupEngine();
    restoreSiteMusicIfNeeded();
    shell.classList.remove('is-session-active');
    document.documentElement.classList.remove('cosmic-game-input-locked');
    document.body.classList.remove('cosmic-game-input-locked');
    hideAllStageViews();
    query('[data-intro]').hidden = false;
    loadingOverlay.hidden = true;
    errorOverlay.hidden = true;
    renderLevels();
    renderIntro();
    stage.focus({ preventScroll:true });
  }

  function updateHud(hud, bestScore) {
    query('[data-hud-name]').textContent = hud.playerName;
    query('[data-hud-score]').textContent = formatNumber(hud.score);
    query('[data-hud-level]').textContent = hud.level;
    query('[data-hud-difficulty]').textContent = hud.difficultyLabel;
    query('[data-hud-best]').textContent = formatNumber(bestScore);
    query('[data-hud-lives]').textContent = hud.lives;
    query('[data-hud-wave]').textContent = hud.wave;
    query('[data-hud-total]').textContent = hud.totalWaves;
    query('[data-hud-wave-name]').textContent = hud.waveName || '';
    query('[data-hud-multiplier]').textContent = hud.multiplier;
  }

  function handleEngineState(detail) {
    if (!engine || detail.state === GAME_STATES.DESTROYED) return;
    syncKiraGame(detail.state !== GAME_STATES.LEVEL_COMPLETE && detail.state !== GAME_STATES.GAME_OVER, detail.wave || detail.currentWave || 0);
    pauseOverlay.hidden = detail.state !== GAME_STATES.PAUSED;
    if (detail.state === GAME_STATES.WAVE_COMPLETE) {
      showAnnouncement(`<strong>${tx.waveComplete}</strong>`);
    } else if (detail.state === GAME_STATES.WAVE_COUNTDOWN) {
      showAnnouncement(`<strong>${tx.waveComplete}</strong><span>${tx.nextWave} ${Math.max(1, detail.countdown || 1)}</span>`);
    } else if (detail.state === GAME_STATES.PLAYING && detail.announcement) {
      showAnnouncement(`<strong>${escapeHtml(detail.announcement)}</strong>`, 1200);
    } else if (detail.state !== GAME_STATES.PAUSED) {
      clearAnnouncement();
    }
  }

  async function startLevel() {
    if (launching) return;
    const levelData = levelsData.levels.find((item) => item.id === selected);
    const progress = profile.levels[selected];
    if (!levelData || !progress || progress.status === 'locked' || !isDifficultyUnlocked(profile, selected, selectedDifficulty)) return;

    launching = true;
    await cosmicDefenderAudio.activate();
    pauseSiteMusicForGame();
    cleanupEngine();
    hideAllStageViews();
    shell.classList.add('is-session-active');
    session.hidden = false;
    session.classList.add('is-preparing');
    loadingOverlay.hidden = false;
    errorOverlay.hidden = true;
    pauseOverlay.hidden = true;
    query('[data-loading-title]').textContent = `${tx.preparing} ${cosmicDefenderThemes[selected].name.toUpperCase()} · ${selectedDifficulty === 'hard' ? tx.hard.toUpperCase() : tx.normal.toUpperCase()}…`;
    query('[data-loading-world]').textContent = cosmicDefenderThemes[selected].world;

    try {
      await nextFrame();
      await nextFrame();
      const bounds = viewport.getBoundingClientRect();
      if (bounds.width < 2 || bounds.height < 2) throw new Error(`The game viewport has invalid dimensions (${Math.round(bounds.width)} × ${Math.round(bounds.height)}).`);

      const bestScore = modeProgress().bestScore;
      const freshEngine = new CosmicDefenderEngine({
        canvas,
        viewport,
        levelId:selected,
        difficulty:selectedDifficulty,
        playerName:profile.playerName,
        onHud:(hud) => updateHud(hud, bestScore),
        onState:handleEngineState,
        onFinish:(result) => finishLevel(result, true),
        onGameOver:(result) => finishLevel(result, false),
        onPause:(paused) => { query('[data-pause]').textContent = paused ? '▶' : 'Ⅱ'; },
        onAudio:(eventName, detail) => cosmicDefenderAudio.playEvent(eventName, detail)
      });
      engine = freshEngine;
      globalThis.__COSMIC_EXPLORER_COSMIC_ENGINE__ = freshEngine;
      await cosmicDefenderAudio.startLevel(selected, selectedDifficulty);
      freshEngine.start();
      const snapshot = freshEngine.getDebugState();
      if (!snapshot.running || snapshot.canvasWidth < 2 || snapshot.canvasHeight < 2 || snapshot.enemies < 1) throw new Error(`Game initialization did not produce a valid session: ${JSON.stringify(snapshot)}`);
      syncKiraGame(true, snapshot.wave || 1);

      profile = recordAttempt(profile, selected, selectedDifficulty);
      renderLevels();
      loadingOverlay.hidden = true;
      session.classList.remove('is-preparing');
      stage.scrollIntoView({ behavior:'instant', block:'start' });
      document.documentElement.classList.add('cosmic-game-input-locked');
      document.body.classList.add('cosmic-game-input-locked');
      canvas.focus({ preventScroll:true });
    } catch (error) {
      console.error('[Cosmic Defender] Level startup failed.', error);
      engine?.destroy();
      engine = null;
      cosmicDefenderAudio.stopLevel();
      loadingOverlay.hidden = true;
      session.classList.remove('is-preparing');
      query('[data-error-details]').textContent = error?.stack || String(error);
      errorOverlay.hidden = false;
    } finally {
      launching = false;
    }
  }

  function finishLevel(result, won) {
    syncKiraGame(false, result.highestWave || 0);
    cosmicDefenderAudio.stopLevel();
    const recorded = recordGameResult(profile, result, won);
    if (recorded.hardUnlocked) cosmicDefenderAudio.playEvent('hard-unlocked');
    profile = recorded.profile;
    renderLevels();
    const index = levelsData.levels.findIndex((item) => item.id === selected);
    const next = levelsData.levels[index + 1];
    hideAllStageViews();
    shell.classList.remove('is-session-active');
    document.documentElement.classList.remove('cosmic-game-input-locked');
    document.body.classList.remove('cosmic-game-input-locked');
    query('[data-result]').hidden = false;
    const mode = result.difficulty === 'hard' ? tx.hard : tx.normal;
    query('[data-result]').innerHTML = `<p class="eyebrow">${won ? tx.complete : tx.defeated} · ${mode}</p><h2>${cosmicDefenderThemes[selected].name}</h2>${recorded.isBest ? `<div class="new-best">${tx.newBest}</div>` : ''}${recorded.hardUnlocked ? `<div class="hard-unlocked">${tx.hardUnlocked}</div>` : ''}<div class="result-score">${formatNumber(result.score)}</div><div class="result-grid"><span>${tx.best}<b>${formatNumber(profile.levels[selected][result.difficulty].bestScore)}</b></span><span>${tx.enemies}<b>${result.enemiesDestroyed}</b></span><span>${tx.lives}<b>${result.livesRemaining}</b></span><span>${tx.accuracy}<b>${result.accuracy}%</b></span><span>TIME<b>${result.time}s</b></span><span>${tx.rank}<b>${result.rank}</b></span><span>${tx.highestWave}<b>${result.highestWave}/${result.totalWaves}</b></span></div><div class="result-actions"><button class="button button--secondary" data-retry>${tx.retry}</button>${won && next ? `<button class="button button--primary" data-next>${tx.continue}</button>` : ''}<button class="button button--secondary" data-selector>${tx.selector}</button></div>`;
    query('[data-retry]').addEventListener('click', startLevel, { signal });
    query('[data-selector]').addEventListener('click', showSelector, { signal });
    query('[data-next]')?.addEventListener('click', () => { selected = next.id; selectedDifficulty = 'normal'; renderLevels(); renderIntro(); startLevel(); }, { signal });
  }


  page.querySelectorAll('[data-audio-toggle]').forEach((button) => button.addEventListener('click', () => toggleAudioPanel(), { signal }));
  query('[data-audio-close]').addEventListener('click', () => toggleAudioPanel(false), { signal });
  page.querySelectorAll('[data-audio-volume]').forEach((input) => input.addEventListener('input', () => cosmicDefenderAudio.setVolume(input.dataset.audioVolume, input.value), { signal }));
  query('[data-audio-action="music"]').addEventListener('click', () => cosmicDefenderAudio.toggleChannel('music'), { signal });
  query('[data-audio-action="sfx"]').addEventListener('click', () => cosmicDefenderAudio.toggleChannel('sfx'), { signal });
  query('[data-audio-action="vibration"]').addEventListener('click', () => cosmicDefenderAudio.toggleVibration(), { signal });
  query('[data-audio-action="music-play"]').addEventListener('click', () => cosmicDefenderAudio.setMusicPlaying(!cosmicDefenderAudio.getState().musicPlaying), { signal });
  query('[data-audio-action="mute"]').addEventListener('click', () => cosmicDefenderAudio.toggleMute(), { signal });
  audioUnsubscribe = cosmicDefenderAudio.subscribe(syncAudioPanel);

  query('[data-save-name]').addEventListener('click', () => {
    profile = updatePlayerName(profile, sanitizePlayerName(query('#pilot-name').value));
    query('#pilot-name').value = profile.playerName;
    renderLevels();
    renderIntro();
  }, { signal });
  page.querySelectorAll('[data-difficulty]').forEach((button) => button.addEventListener('click', () => {
    const requested = button.dataset.difficulty;
    if (!isDifficultyUnlocked(profile, selected, requested)) return;
    selectedDifficulty = requested;
    renderIntro();
  }, { signal }));
  query('[data-launch]').addEventListener('click', startLevel, { signal });
  query('[data-pause]').addEventListener('click', () => engine?.togglePause(), { signal });
  query('[data-resume]').addEventListener('click', () => { if (engine?.resume()) canvas.focus({ preventScroll:true }); }, { signal });
  query('[data-exit]').addEventListener('click', showSelector, { signal });
  query('[data-retry-start]').addEventListener('click', startLevel, { signal });
  query('[data-error-back]').addEventListener('click', showSelector, { signal });

  canvas.addEventListener('pointerdown', (event) => {
    if (!engine) return;
    const rect = canvas.getBoundingClientRect();
    const state = engine.getDebugState();
    engine.setPointerTarget((event.clientX - rect.left) / rect.width * state.logicalWidth, (event.clientY - rect.top) / rect.height * state.logicalHeight, true);
    capturePointerSafely(canvas, event.pointerId);
    canvas.focus({ preventScroll:true });
    event.preventDefault();
  }, { signal });
  canvas.addEventListener('pointermove', (event) => {
    if (!engine || (!event.buttons && event.pointerType !== 'touch')) return;
    const rect = canvas.getBoundingClientRect();
    const state = engine.getDebugState();
    engine.setPointerTarget((event.clientX - rect.left) / rect.width * state.logicalWidth, (event.clientY - rect.top) / rect.height * state.logicalHeight, true);
    event.preventDefault();
  }, { signal });
  const clearPointerTarget = () => engine?.setPointerTarget(0, 0, false);
  canvas.addEventListener('pointerup', clearPointerTarget, { signal });
  canvas.addEventListener('pointercancel', clearPointerTarget, { signal });

  const joystick = query('[data-joystick]');
  const joystickKnob = query('[data-joystick-knob]');
  let joystickPointer = null;
  function updateJoystick(event) {
    const rect = joystick.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    let x = (event.clientX - (rect.left + rect.width / 2)) / radius;
    let y = (event.clientY - (rect.top + rect.height / 2)) / radius;
    const length = Math.hypot(x, y);
    if (length > 1) { x /= length; y /= length; }
    joystickKnob.style.transform = `translate(${x * radius * .42}px, ${y * radius * .42}px)`;
    engine?.setTouchVector(x, y);
    event.preventDefault();
  }
  joystick.addEventListener('pointerdown', (event) => { joystickPointer = event.pointerId; capturePointerSafely(joystick, event.pointerId); updateJoystick(event); }, { signal });
  joystick.addEventListener('pointermove', (event) => { if (event.pointerId === joystickPointer) updateJoystick(event); }, { signal });
  const releaseJoystick = (event) => {
    if (joystickPointer !== null && event.pointerId !== joystickPointer) return;
    joystickPointer = null;
    joystickKnob.style.transform = 'translate(0, 0)';
    engine?.setTouchVector(0, 0);
  };
  joystick.addEventListener('pointerup', releaseJoystick, { signal });
  joystick.addEventListener('pointercancel', releaseJoystick, { signal });

  const fireButton = query('[data-fire]');
  fireButton.addEventListener('pointerdown', (event) => { engine?.setTouchFire(true); capturePointerSafely(fireButton, event.pointerId); event.preventDefault(); }, { signal });
  ['pointerup','pointercancel','pointerleave'].forEach((eventName) => fireButton.addEventListener(eventName, () => engine?.setTouchFire(false), { signal }));

  const dialog = query('[data-reset-dialog]');
  query('[data-reset]').addEventListener('click', () => dialog.showModal(), { signal });
  dialog.addEventListener('close', () => {
    if (dialog.returnValue !== 'confirm') return;
    profile = resetProgress(profile, query('[data-remove-name]').checked);
    query('#pilot-name').value = profile.playerName;
    selected = 'mercury';
    selectedDifficulty = 'normal';
    renderLevels();
    renderIntro();
  }, { signal });

  document.addEventListener('cosmic-explorer:menu-open', () => engine?.pause('menu'), { signal });
  renderLevels();
  renderIntro();
  syncAudioPanel();
  appStore.setState({ lastVisitedRoute:'/cosmic-defender' });

  return () => {
    launching = false;
    cleanupEngine();
    restoreSiteMusicIfNeeded();
    audioUnsubscribe?.();
    cosmicDefenderAudio.close();
    emitKiraGameContext({ active:false, levelId:selected, levelName:localizedLevelName(), difficulty:selectedDifficulty, wave:0 });
    document.documentElement.classList.remove('cosmic-game-input-locked');
    document.body.classList.remove('cosmic-game-input-locked');
    pageController.abort();
    window.clearTimeout(announcementTimer);
  };
}
