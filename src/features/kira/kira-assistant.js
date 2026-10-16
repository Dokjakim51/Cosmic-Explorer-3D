import { getLanguage } from '../../i18n/i18n.js';
import { createKiraContext } from './kira-context.js';
import { answerKiraQuestion, getKiraObjectName, getKiraSuggestions, getKiraWelcome } from './kira-knowledge.js';

const HISTORY_KEY = 'cosmic-explorer:kira-messages:v1';
const UI_KEY = 'cosmic-explorer:kira-ui:v2';
const LEGACY_UI_KEY = 'cosmic-explorer:kira-ui:v1';
const MAX_MESSAGES = 40;
const DRAG_THRESHOLD = 6;
const VIEWPORT_MARGIN = 8;

const uiCopy = {
  es: {
    title:'Kira', subtitle:'Asistente contextual local', open:'Abrir Kira', minimize:'Minimizar Kira', close:'Cerrar Kira', clear:'Limpiar historial', reset:'Restablecer posición de Kira', send:'Enviar', placeholder:'Pregunta sobre lo que estás viendo…', context:'Contexto', local:'LOCAL · SIN API', reopened:'Abrir conversación', suggestions:'Preguntas sugeridas', user:'Tú', assistant:'Kira', offline:'Respuestas guardadas dentro de Cosmic Explorer', drag:'Arrastra para mover Kira'
  },
  en: {
    title:'Kira', subtitle:'Local contextual assistant', open:'Open Kira', minimize:'Minimize Kira', close:'Close Kira', clear:'Clear history', reset:'Reset Kira position', send:'Send', placeholder:'Ask about what you are viewing…', context:'Context', local:'LOCAL · NO API', reopened:'Open conversation', suggestions:'Suggested questions', user:'You', assistant:'Kira', offline:'Answers stored inside Cosmic Explorer', drag:'Drag to move Kira'
  }
};

function readSession(key, fallback) {
  try { const value = sessionStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function writeSession(key, value) {
  try { sessionStorage.setItem(key, JSON.stringify(value)); }
  catch { /* In-memory operation remains available. */ }
}
function readLocal(key, fallback) {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) : fallback; }
  catch { return fallback; }
}
function writeLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* In-memory operation remains available. */ }
}
function readUiState() {
  const current = readLocal(UI_KEY, null);
  if (current) return current;
  const legacy = readSession(LEGACY_UI_KEY, null);
  return legacy || { mode:'closed', panelPosition:null, launcherPosition:null, viewport:null };
}
function createMessage(role, text) {
  return { id:`${Date.now()}-${Math.random().toString(36).slice(2)}`, role, text:String(text || ''), createdAt:Date.now() };
}
function contextLabel(context, language) {
  const sectionLabels = language === 'es'
    ? { home:'Inicio', favorites:'Favoritos', universe:'Universe', gallery:'Gallery', 'music-space':'Music Space', 'cosmic-defender':'Cosmic Defender', unknown:'Cosmic Explorer' }
    : { home:'Home', favorites:'Favorites', universe:'Universe', gallery:'Gallery', 'music-space':'Music Space', 'cosmic-defender':'Cosmic Defender', unknown:'Cosmic Explorer' };
  const categoryLabels = language === 'es'
    ? { planet:'Planeta', star:'Estrella', 'gallery-object':'Objeto', gallery:'Objeto', 'game-level':'Nivel', music:'Música' }
    : { planet:'Planet', star:'Star', 'gallery-object':'Object', gallery:'Object', 'game-level':'Level', music:'Music' };
  const parts = [sectionLabels[context.currentSection] || 'Cosmic Explorer'];
  if (context.currentCategory) parts.push(categoryLabels[context.currentCategory] || context.currentCategory);
  if (context.currentObject?.id) parts.push(getKiraObjectName(context.currentObject, language));
  return parts.filter(Boolean).join(' · ');
}

export function createKiraAssistant() {
  const existing = document.querySelector('[data-kira-root]');
  if (existing) return () => {};

  const contextManager = createKiraContext();
  const controller = new AbortController();
  const { signal } = controller;
  let language = getLanguage();
  let tx = uiCopy[language] || uiCopy.en;
  let context = contextManager.getState();
  let uiState = readUiState();
  if (!['open','minimized','closed'].includes(uiState.mode)) uiState.mode = 'closed';
  uiState.panelPosition ||= null;
  uiState.launcherPosition ||= null;
  let messages = readSession(HISTORY_KEY, []);
  if (!Array.isArray(messages)) messages = [];
  messages = messages.slice(-MAX_MESSAGES);

  const root = document.createElement('aside');
  root.className = 'kira-root';
  root.dataset.kiraRoot = '';
  root.innerHTML = `
    <button class="kira-launcher" type="button" data-kira-open>
      <span class="kira-launcher-core" aria-hidden="true"><i></i><b></b></span>
      <span class="sr-only" data-kira-open-label></span>
    </button>
    <section class="kira-panel" data-kira-panel aria-label="Kira" aria-live="off">
      <header class="kira-header" data-kira-drag-handle>
        <div class="kira-avatar" aria-hidden="true"><span></span><i></i></div>
        <div class="kira-heading"><strong>Kira</strong><small data-kira-subtitle></small></div>
        <span class="kira-drag-hint" data-kira-drag-hint aria-hidden="true">⋮⋮</span>
        <span class="kira-local-badge" data-kira-local></span>
        <button type="button" class="kira-icon-button" data-kira-reset-position data-kira-no-drag><span aria-hidden="true">⌖</span></button>
        <button type="button" class="kira-icon-button" data-kira-clear data-kira-no-drag><span aria-hidden="true">↺</span></button>
        <button type="button" class="kira-icon-button" data-kira-minimize data-kira-no-drag><span aria-hidden="true">—</span></button>
        <button type="button" class="kira-icon-button" data-kira-close data-kira-no-drag><span aria-hidden="true">×</span></button>
      </header>
      <div class="kira-body">
        <div class="kira-context-strip"><span></span><small data-kira-context-label></small><b data-kira-context></b></div>
        <div class="kira-messages" data-kira-messages role="log" aria-live="polite" aria-relevant="additions"></div>
        <div class="kira-suggestions" data-kira-suggestions aria-label=""></div>
        <form class="kira-composer" data-kira-form>
          <label class="sr-only" for="kira-input">Kira</label>
          <textarea id="kira-input" data-kira-input rows="1" maxlength="240"></textarea>
          <button type="submit" data-kira-send><span aria-hidden="true">➤</span><span class="sr-only"></span></button>
        </form>
        <p class="kira-offline-note" data-kira-offline></p>
      </div>
    </section>`;

  let layer = document.querySelector('[data-kira-global-layer]');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'kira-global-layer';
    layer.dataset.kiraGlobalLayer = '';
    document.body.append(layer);
  }
  layer.append(root);

  const query = (selector) => root.querySelector(selector);
  const panel = query('[data-kira-panel]');
  const header = query('[data-kira-drag-handle]');
  const messageList = query('[data-kira-messages]');
  const input = query('[data-kira-input]');
  const suggestions = query('[data-kira-suggestions]');
  const launcher = query('[data-kira-open]');

  function saveMessages() {
    messages = messages.slice(-MAX_MESSAGES);
    writeSession(HISTORY_KEY, messages);
  }
  function saveUi() {
    uiState.viewport = { width:window.innerWidth, height:window.innerHeight };
    writeLocal(UI_KEY, uiState);
  }
  function defaultPosition(element, kind) {
    const rect = element.getBoundingClientRect();
    const right = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - Math.max(16, Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16));
    const bottomGap = kind === 'panel' ? Math.max(78, window.innerHeight * 0.08) : Math.max(76, window.innerHeight * 0.09);
    return { x:right, y:Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - bottomGap) };
  }
  function clampPosition(element, position) {
    const rect = element.getBoundingClientRect();
    const maxX = Math.max(VIEWPORT_MARGIN, window.innerWidth - rect.width - VIEWPORT_MARGIN);
    const maxY = Math.max(VIEWPORT_MARGIN, window.innerHeight - rect.height - VIEWPORT_MARGIN);
    return {
      x:Math.min(maxX, Math.max(VIEWPORT_MARGIN, Number(position?.x) || VIEWPORT_MARGIN)),
      y:Math.min(maxY, Math.max(VIEWPORT_MARGIN, Number(position?.y) || VIEWPORT_MARGIN))
    };
  }
  function place(element, kind, { reset = false } = {}) {
    const key = kind === 'panel' ? 'panelPosition' : 'launcherPosition';
    if (reset || !uiState[key]) uiState[key] = defaultPosition(element, kind);
    uiState[key] = clampPosition(element, uiState[key]);
    element.style.left = `${uiState[key].x}px`;
    element.style.top = `${uiState[key].y}px`;
    element.style.right = 'auto';
    element.style.bottom = 'auto';
  }
  function placeVisible() {
    requestAnimationFrame(() => {
      if (uiState.mode === 'open') place(panel, 'panel');
      else place(launcher, 'launcher');
      saveUi();
    });
  }
  function resetPositions() {
    uiState.panelPosition = null;
    uiState.launcherPosition = null;
    place(panel, 'panel', { reset:true });
    place(launcher, 'launcher', { reset:true });
    saveUi();
  }

  function setMode(mode, { focus = false } = {}) {
    uiState.mode = mode;
    root.dataset.mode = mode;
    contextManager.setUiState({ isOpen:mode !== 'closed', isMinimized:mode === 'minimized' });
    panel.hidden = mode !== 'open';
    launcher.hidden = mode === 'open';
    panel.setAttribute('aria-live', mode === 'open' ? 'polite' : 'off');
    saveUi();
    placeVisible();
    if (focus && mode === 'open') requestAnimationFrame(() => input.focus({ preventScroll:true }));
    if (focus && mode !== 'open') requestAnimationFrame(() => launcher.focus({ preventScroll:true }));
  }

  function installDrag(element, handle, kind, { clickOpens = false } = {}) {
    let active = null;
    handle.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      if (kind === 'panel' && event.target.closest('button, input, textarea, a, [data-kira-no-drag]')) return;
      const rect = element.getBoundingClientRect();
      active = { pointerId:event.pointerId, startX:event.clientX, startY:event.clientY, originX:rect.left, originY:rect.top, dragged:false };
      handle.setPointerCapture?.(event.pointerId);
      root.classList.add('is-drag-ready');
    }, { signal });
    handle.addEventListener('pointermove', (event) => {
      if (!active || event.pointerId !== active.pointerId) return;
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      if (!active.dragged && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      active.dragged = true;
      event.preventDefault();
      root.classList.add('is-dragging');
      const position = clampPosition(element, { x:active.originX + dx, y:active.originY + dy });
      const key = kind === 'panel' ? 'panelPosition' : 'launcherPosition';
      uiState[key] = position;
      element.style.left = `${position.x}px`;
      element.style.top = `${position.y}px`;
    }, { signal });
    const finish = (event) => {
      if (!active || event.pointerId !== active.pointerId) return;
      const dragged = active.dragged;
      active = null;
      root.classList.remove('is-drag-ready', 'is-dragging');
      try { handle.releasePointerCapture?.(event.pointerId); } catch { /* already released */ }
      if (dragged) saveUi();
      else if (clickOpens) setMode('open', { focus:true });
    };
    handle.addEventListener('pointerup', finish, { signal });
    handle.addEventListener('pointercancel', finish, { signal });
  }

  function addMessage(role, text) {
    const message = createMessage(role, text);
    messages.push(message); saveMessages(); renderMessages(); return message;
  }
  function renderMessages() {
    messageList.replaceChildren();
    if (!messages.length) messages.push(createMessage('assistant', getKiraWelcome(context, language)));
    messages.slice(-MAX_MESSAGES).forEach((message) => {
      const item = document.createElement('article'); item.className = `kira-message kira-message--${message.role}`;
      const label = document.createElement('span'); label.textContent = message.role === 'user' ? tx.user : tx.assistant;
      const bubble = document.createElement('p'); bubble.textContent = message.text;
      item.append(label, bubble); messageList.append(item);
    });
    saveMessages(); requestAnimationFrame(() => { messageList.scrollTop = messageList.scrollHeight; });
  }
  function renderSuggestions() {
    suggestions.replaceChildren(); suggestions.setAttribute('aria-label', tx.suggestions);
    getKiraSuggestions(context, language).slice(0,4).forEach((text) => {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text;
      button.addEventListener('click', () => submitQuestion(text), { signal }); suggestions.append(button);
    });
  }
  function syncCopy() {
    language = context.language || getLanguage(); tx = uiCopy[language] || uiCopy.en; root.lang = language;
    query('[data-kira-open-label]').textContent = tx.reopened;
    query('[data-kira-subtitle]').textContent = tx.subtitle;
    query('[data-kira-local]').textContent = tx.local;
    query('[data-kira-context-label]').textContent = `${tx.context}:`;
    query('[data-kira-context]').textContent = contextLabel(context, language);
    query('[data-kira-offline]').textContent = tx.offline;
    query('[data-kira-drag-hint]').setAttribute('title', tx.drag);
    query('[data-kira-clear]').setAttribute('aria-label', tx.clear);
    query('[data-kira-reset-position]').setAttribute('aria-label', tx.reset);
    query('[data-kira-minimize]').setAttribute('aria-label', tx.minimize);
    query('[data-kira-close]').setAttribute('aria-label', tx.close);
    launcher.setAttribute('aria-label', tx.open);
    input.placeholder = tx.placeholder;
    query('[data-kira-send]').setAttribute('aria-label', tx.send);
    query('[data-kira-send] .sr-only').textContent = tx.send;
    root.classList.toggle('is-game-active', Boolean(context.game?.active));
    renderMessages(); renderSuggestions(); placeVisible();
  }
  function clearHistory() {
    messages = []; saveMessages();
    addMessage('assistant', language === 'es' ? 'Historial temporal eliminado. ¿Qué quieres explorar ahora?' : 'Temporary history cleared. What would you like to explore now?');
  }
  function submitQuestion(value = input.value) {
    const question = String(value || '').trim();
    if (!question) return;
    setMode('open'); addMessage('user', question); input.value = ''; input.style.height = '';
    let response;
    try { response = answerKiraQuestion(question, context, language) || {}; }
    catch (error) {
      console.error('Kira submit failure:', error);
      response = { text:language === 'es' ? 'Ocurrió un error controlado. Puedes reformular la pregunta o mencionar un objeto por su nombre.' : 'A controlled error occurred. You can rephrase the question or name an object.' };
    }
    if (response.action === 'clear') { messages = []; saveMessages(); }
    if (response.memoryPatch) contextManager.updateConversationMemory(response.memoryPatch);
    addMessage('assistant', String(response.text || (language === 'es' ? 'No pude identificar la pregunta. Menciona un objeto o una propiedad.' : 'I could not identify the question. Mention an object or property.')));
    renderSuggestions(); input.focus({ preventScroll:true });
  }

  installDrag(panel, header, 'panel');
  installDrag(launcher, launcher, 'launcher', { clickOpens:true });
  query('[data-kira-minimize]').addEventListener('click', () => setMode('minimized', { focus:true }), { signal });
  query('[data-kira-close]').addEventListener('click', () => setMode('closed', { focus:true }), { signal });
  query('[data-kira-clear]').addEventListener('click', clearHistory, { signal });
  query('[data-kira-reset-position]').addEventListener('click', resetPositions, { signal });
  query('[data-kira-form]').addEventListener('submit', (event) => { event.preventDefault(); submitQuestion(); }, { signal });
  input.addEventListener('keydown', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitQuestion(); } }, { signal });
  input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight,112)}px`; }, { signal });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (uiState.mode === 'open') { event.stopPropagation(); setMode('minimized', { focus:true }); }
    else if (uiState.mode === 'minimized') { event.stopPropagation(); setMode('closed', { focus:true }); }
  }, { signal, capture:true });
  window.addEventListener('resize', () => {
    uiState.panelPosition = clampPosition(panel, uiState.panelPosition || defaultPosition(panel,'panel'));
    uiState.launcherPosition = clampPosition(launcher, uiState.launcherPosition || defaultPosition(launcher,'launcher'));
    placeVisible(); saveUi();
  }, { signal });

  const unsubscribe = contextManager.subscribe((next) => {
    const wasGameActive = Boolean(context.game?.active); context = next;
    if (!wasGameActive && context.game?.active && uiState.mode === 'open') setMode('minimized');
    syncCopy();
  });

  renderMessages(); syncCopy(); setMode(uiState.mode);

  globalThis.__COSMIC_EXPLORER_KIRA__ = {
    getContext:() => structuredClone(context),
    getMessages:() => structuredClone(messages),
    getUiState:() => structuredClone(uiState),
    ask:submitQuestion,
    open:() => setMode('open'),
    close:() => setMode('closed'),
    minimize:() => setMode('minimized'),
    resetPosition:resetPositions
  };

  return () => {
    unsubscribe(); contextManager.destroy(); controller.abort(); root.remove();
    if (layer && !layer.children.length) layer.remove();
    delete globalThis.__COSMIC_EXPLORER_KIRA__;
  };
}
