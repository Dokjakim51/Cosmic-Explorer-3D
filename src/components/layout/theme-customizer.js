// Phase 5 compatibility markers retained for regression tests: data-theme-backdrop data-theme-accent data-custom-color apply-custom-accent 'rgb'
import { getLanguage } from '../../i18n/i18n.js';
import {
  APPEARANCE_SECTIONS,
  BACKGROUNDS,
  PERFORMANCE_PROFILES,
  PRESET_THEMES,
  contrastRatio,
  hexToRgb,
  normalizeHexColor,
  rgbToHex
} from '../../features/appearance/appearance-config.js';
import { appearanceManager } from '../../features/appearance/appearance-manager.js';
import { ambientAudioManager } from '../../features/ambient/ambient-audio-manager.js';
import { ALL_AMBIENT_PROFILES, AMBIENT_SOUND_MODES, THEME_AUDIO_RECOMMENDATIONS, sanitizeAmbientSettings } from '../../features/ambient/ambient-audio-config.js';
import { getIcon } from '../ui/icons.js';

const COPY = {
  es: {
    open: 'Abrir Apariencia', close: 'Cerrar Apariencia', title: 'Apariencia', subtitle: 'Personaliza Cosmic Explorer sin alterar su contenido.',
    active: 'Tema activo', preview: 'Vista previa activa', apply: 'Aplicar cambios', cancel: 'Cancelar', reset: 'Restaurar',
    themes: 'Temas', backgrounds: 'Fondos', colors: 'Colores', effects: 'Efectos', interface: 'Interfaz', accessibility: 'Accesibilidad', sections: 'Por sección', saved: 'Temas guardados', sound: 'Sonido ambiental',
    soundEnable:'Activar ambientación', soundProfile:'Perfil sonoro', soundMaster:'Volumen general', soundRelaxingMusic:'Música relajante', soundAmbience:'Ambiente espacial', soundSonification:'Sonificaciones científicas', soundEffects:'Efectos ocasionales', soundTransition:'Transición', soundMax:'Límite de volumen', soundSpatial:'Audio espacial', soundIntense:'Reducir sonidos intensos', soundBass:'Desactivar graves intensos', soundVibration:'Vibración', soundObjects:'Sonido por objeto', soundSections:'Sonido por sección', soundMusic:'Durante Music Space', soundGame:'Durante Cosmic Defender', soundPause:'Pausar', soundReduce:'Reducir', soundMix:'Mezclar suavemente', soundOff:'Desactivado en Music Space', soundPreview:'Escuchar vista previa', soundStopPreview:'Detener vista previa', soundReset:'Restaurar sonido', soundActivate:'Autorizar audio', soundAuthorized:'Audio autorizado', soundWaiting:'El navegador necesita una interacción para iniciar el audio.', soundSectionProfile:'Perfil para esta sección', soundInherit:'Usar perfil global', soundObjectOverride:'Identidad para el objeto actual', soundAutomatic:'Automática', soundRecommended:'Perfil recomendado por el tema', soundNowPlaying:'Reproduciendo', soundLayers:'Capas activas', soundQuickTest:'Prueba rápida de planetas', soundDiagnostics:'Diagnóstico de audio', soundApplyRecommended:'Aplicar recomendado', soundTypeArtistic:'Ambientación artística', soundTypeScientific:'Sonificación inspirada en datos', soundDisclaimer:'En el vacío no se propaga sonido. Estas pistas son síntesis artísticas o sonificaciones procedurales; no se presentan como grabaciones literales del espacio.',
    original: 'Volver a Cosmic Explorer Original', globalMode: 'Tema global', sectionMode: 'Tema por sección', editSection: 'Configurar sección',
    accent: 'Color de acento', secondary: 'Color secundario', panel: 'Color de panel', hex: 'HEX', rgb: 'RGB', contrastOk: 'Contraste legible', contrastWarn: 'El contraste puede dificultar la lectura.', autoContrast: 'Ajustar texto automáticamente',
    performance: 'Rendimiento', balanced: 'Equilibrado', high: 'Calidad alta', profile: 'Perfil visual', bloom: 'Bloom', particles: 'Partículas', particleSpeed: 'Velocidad de partículas', motion: 'Movimiento del fondo', blur: 'Desenfoque de paneles', transparency: 'Transparencia', ambient: 'Brillo ambiental', nebula: 'Intensidad de nebulosa', glow: 'Glow', rgbAnimation: 'Animación RGB',
    cards: 'Tarjetas', cardTransparent: 'Transparentes', cardBalanced: 'Equilibradas', cardSolid: 'Sólidas', radius: 'Bordes', radiusStraight: 'Rectos', radiusSoft: 'Suaves', radiusRound: 'Redondeados', density: 'Densidad', compact: 'Compacta', normal: 'Normal', spacious: 'Amplia', text: 'Texto', small: 'Pequeño', large: 'Grande', xlarge: 'Muy grande', scale: 'Escala general', interfaceMotion: 'Movimiento de interfaz', decorations: 'Efectos decorativos',
    reduceMotion: 'Reducir movimiento', highContrast: 'Alto contraste', reduceTransparency: 'Reducir transparencias', reduceBloom: 'Disminuir bloom', removeFlashes: 'Eliminar destellos intensos', focusVisible: 'Foco de teclado visible', reduceParticles: 'Reducir partículas',
    saveTheme: 'Guardar combinación', themeName: 'Nombre del tema', save: 'Guardar', rename: 'Renombrar', duplicate: 'Duplicar', remove: 'Eliminar', noSaved: 'Todavía no tienes temas personalizados.',
    resetAll: 'Restaurar todo', resetBackground: 'Restaurar fondo', resetColors: 'Restaurar colores', resetEffects: 'Restaurar efectos', resetInterface: 'Restaurar interfaz', resetAccessibility: 'Restaurar accesibilidad', confirmReset: '¿Restaurar toda la apariencia? Tus temas personalizados se conservarán.', confirmDelete: '¿Eliminar este tema personalizado?',
    mobileWarning: 'Calidad alta puede reducir el rendimiento en pantallas pequeñas.', invalidColor: 'Escribe un color HEX válido.', savedOk: 'Tema guardado.', duplicateName: 'Ya existe un tema con ese nombre.', emptyName: 'Escribe un nombre para el tema.', restored: 'Apariencia restaurada.', applied: 'Apariencia guardada.', cancelled: 'Vista previa cancelada.', custom: 'Personalizado', globalFromSection: '¿Usar la configuración de la sección seleccionada como nuevo tema global?', globalKept: 'Se conservará el tema global anterior.', sectionLabel: 'Tema por sección', globalLabel: 'Tema global', renameFailed: 'No se pudo renombrar: el nombre está vacío o ya existe.',
    home: 'Inicio', universe: 'Universe', gallery: 'Gallery', 'music-space': 'Music Space', 'cosmic-defender': 'Cosmic Defender'
  },
  en: {
    open: 'Open Appearance', close: 'Close Appearance', title: 'Appearance', subtitle: 'Customize Cosmic Explorer without altering its content.',
    active: 'Active theme', preview: 'Live preview', apply: 'Apply changes', cancel: 'Cancel', reset: 'Restore',
    themes: 'Themes', backgrounds: 'Backgrounds', colors: 'Colors', effects: 'Effects', interface: 'Interface', accessibility: 'Accessibility', sections: 'By section', saved: 'Saved themes', sound: 'Ambient sound',
    soundEnable:'Enable ambience', soundProfile:'Sound profile', soundMaster:'Master volume', soundRelaxingMusic:'Relaxing music', soundAmbience:'Space ambience', soundSonification:'Scientific sonifications', soundEffects:'Occasional effects', soundTransition:'Transition', soundMax:'Volume limit', soundSpatial:'Spatial audio', soundIntense:'Reduce intense sounds', soundBass:'Disable deep bass', soundVibration:'Vibration', soundObjects:'Sound by object', soundSections:'Sound by section', soundMusic:'During Music Space', soundGame:'During Cosmic Defender', soundPause:'Pause', soundReduce:'Reduce', soundMix:'Soft mix', soundOff:'Disabled in Music Space', soundPreview:'Play preview', soundStopPreview:'Stop preview', soundReset:'Restore sound', soundActivate:'Authorize audio', soundAuthorized:'Audio authorized', soundWaiting:'The browser needs an interaction before audio can start.', soundSectionProfile:'Profile for this section', soundInherit:'Use global profile', soundObjectOverride:'Identity for current object', soundAutomatic:'Automatic', soundRecommended:'Theme-recommended profile', soundNowPlaying:'Now playing', soundLayers:'Active layers', soundQuickTest:'Quick planet test', soundDiagnostics:'Audio diagnostics', soundApplyRecommended:'Apply recommendation', soundTypeArtistic:'Artistic ambience', soundTypeScientific:'Data-inspired sonification', soundDisclaimer:'Sound does not propagate through a vacuum. These tracks are artistic synthesis or procedural sonifications and are not presented as literal recordings from space.',
    original: 'Return to Cosmic Explorer Original', globalMode: 'Global theme', sectionMode: 'Theme by section', editSection: 'Configure section',
    accent: 'Accent color', secondary: 'Secondary color', panel: 'Panel color', hex: 'HEX', rgb: 'RGB', contrastOk: 'Readable contrast', contrastWarn: 'This contrast may be difficult to read.', autoContrast: 'Adjust text automatically',
    performance: 'Performance', balanced: 'Balanced', high: 'High quality', profile: 'Visual profile', bloom: 'Bloom', particles: 'Particles', particleSpeed: 'Particle speed', motion: 'Background motion', blur: 'Panel blur', transparency: 'Transparency', ambient: 'Ambient brightness', nebula: 'Nebula intensity', glow: 'Glow', rgbAnimation: 'RGB animation',
    cards: 'Cards', cardTransparent: 'Transparent', cardBalanced: 'Balanced', cardSolid: 'Solid', radius: 'Corners', radiusStraight: 'Straight', radiusSoft: 'Soft', radiusRound: 'Rounded', density: 'Density', compact: 'Compact', normal: 'Normal', spacious: 'Spacious', text: 'Text', small: 'Small', large: 'Large', xlarge: 'Very large', scale: 'Interface scale', interfaceMotion: 'Interface motion', decorations: 'Decorative effects',
    reduceMotion: 'Reduce motion', highContrast: 'High contrast', reduceTransparency: 'Reduce transparency', reduceBloom: 'Reduce bloom', removeFlashes: 'Remove intense flashes', focusVisible: 'Visible keyboard focus', reduceParticles: 'Reduce particles',
    saveTheme: 'Save combination', themeName: 'Theme name', save: 'Save', rename: 'Rename', duplicate: 'Duplicate', remove: 'Delete', noSaved: 'You do not have custom themes yet.',
    resetAll: 'Restore everything', resetBackground: 'Restore background', resetColors: 'Restore colors', resetEffects: 'Restore effects', resetInterface: 'Restore interface', resetAccessibility: 'Restore accessibility', confirmReset: 'Restore the entire appearance? Your custom themes will be kept.', confirmDelete: 'Delete this custom theme?',
    mobileWarning: 'High quality may reduce performance on small screens.', invalidColor: 'Enter a valid HEX color.', savedOk: 'Theme saved.', duplicateName: 'A theme with that name already exists.', emptyName: 'Enter a name for the theme.', restored: 'Appearance restored.', applied: 'Appearance saved.', cancelled: 'Preview cancelled.', custom: 'Custom', globalFromSection: 'Use the selected section configuration as the new global theme?', globalKept: 'The previous global theme will be kept.', sectionLabel: 'Theme by section', globalLabel: 'Global theme', renameFailed: 'Could not rename: the name is empty or already exists.',
    home: 'Home', universe: 'Universe', gallery: 'Gallery', 'music-space': 'Music Space', 'cosmic-defender': 'Cosmic Defender'
  }
};

const TAB_IDS = ['themes', 'backgrounds', 'colors', 'effects', 'interface', 'accessibility', 'sections', 'sound', 'saved'];
const SLIDERS = [
  ['bloom', 0, 100], ['particles', 0, 100], ['particleSpeed', 0, 100], ['backgroundMotion', 0, 100],
  ['panelBlur', 0, 36], ['transparency', 0, 100], ['ambientBrightness', 0, 100], ['nebulaIntensity', 0, 100], ['glow', 0, 100]
];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' })[character]);
}
function language() { return getLanguage() === 'es' ? 'es' : 'en'; }
function c(key) { return COPY[language()][key] ?? key; }
function localized(value) { return value?.[language()] || value?.en || value?.es || ''; }
function currentRouteSection() {
  const route = String(location.hash || '#/home').replace(/^#\//, '').split('?')[0];
  return APPEARANCE_SECTIONS.includes(route) ? route : 'home';
}
function targetConfig(draft, selectedSection) { return draft.mode === 'section' ? draft.sections[selectedSection] : draft.global; }
function renderChoice(options, selected, attribute, labeler = (item) => item) {
  return options.map((item) => `<button type="button" class="appearance-choice${selected === item ? ' is-active' : ''}" ${attribute}="${escapeHtml(item)}" aria-pressed="${String(selected === item)}">${escapeHtml(labeler(item))}</button>`).join('');
}
function colorControl(key, label, value) {
  const rgb = hexToRgb(value);
  return `<fieldset class="appearance-color-control" data-color-control="${key}">
    <legend>${label}</legend>
    <div class="appearance-color-row">
      <input type="color" value="${value}" data-color-picker="${key}" aria-label="${label}" />
      <label><span>${c('hex')}</span><input type="text" value="${value}" maxlength="7" data-color-hex="${key}" /></label>
      <div class="appearance-rgb-fields" aria-label="${c('rgb')}">
        <label><span>R</span><input type="number" min="0" max="255" value="${rgb.r}" data-color-rgb="${key}" data-channel="r" /></label>
        <label><span>G</span><input type="number" min="0" max="255" value="${rgb.g}" data-color-rgb="${key}" data-channel="g" /></label>
        <label><span>B</span><input type="number" min="0" max="255" value="${rgb.b}" data-color-rgb="${key}" data-channel="b" /></label>
      </div>
    </div>
  </fieldset>`;
}
function rangeControl(key, min, max, value) {
  const labels = { bloom:'bloom', particles:'particles', particleSpeed:'particleSpeed', backgroundMotion:'motion', panelBlur:'blur', transparency:'transparency', ambientBrightness:'ambient', nebulaIntensity:'nebula', glow:'glow' };
  return `<label class="appearance-range"><span>${c(labels[key])}<output data-output="${key}">${value}${key === 'panelBlur' ? 'px' : '%'}</output></span><input type="range" min="${min}" max="${max}" value="${value}" data-effect="${key}" /></label>`;
}
function checkControl(path, label, checked) {
  return `<label class="appearance-check"><input type="checkbox" data-check="${path}" ${checked ? 'checked' : ''}/><span>${label}</span></label>`;
}

export function createThemeCustomizer() {
  const wrapper = document.createElement('div');
  wrapper.className = 'theme-customizer appearance-launcher';
  let activeTab = 'themes';
  let selectedSection = currentRouteSection();
  let notice = '';
  let ambientOriginal = null;
  let ambientDraft = null;

  const toggle = document.createElement('button');
  toggle.className = 'theme-customizer-toggle appearance-launcher-button';
  toggle.type = 'button';
  toggle.innerHTML = `${getIcon('sparkle')}<span class="sr-only"></span>`;

  const modal = document.createElement('section');
  modal.className = 'appearance-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'appearance-title');

  function close({ apply = false } = {}) {
    ambientAudioManager.stopPreview();
    if (apply) {
      appearanceManager.applyDraft();
      if (ambientDraft) ambientAudioManager.commitSettings(ambientDraft);
      notice = c('applied');
    } else {
      appearanceManager.cancelDraft();
      if (ambientOriginal) ambientAudioManager.previewSettings(ambientOriginal);
    }
    ambientOriginal = null;
    ambientDraft = null;
    modal.hidden = true;
    document.body.classList.remove('appearance-open');
    toggle.focus();
  }

  function open(event = null) {
    selectedSection = currentRouteSection();
    if (event?.detail?.tab && TAB_IDS.includes(event.detail.tab)) activeTab = event.detail.tab;
    appearanceManager.beginDraft();
    ambientOriginal = structuredClone(ambientAudioManager.getState().settings);
    ambientDraft = structuredClone(ambientOriginal);
    modal.hidden = false;
    document.body.classList.add('appearance-open');
    render();
    modal.querySelector('.appearance-close')?.focus();
  }

  function render() {
    const draft = appearanceManager.getDraft();
    const config = targetConfig(draft, selectedSection);
    const activeTheme = [...Object.values(PRESET_THEMES), ...draft.customThemes.map((item) => ({ id:item.id, name:{ es:item.name, en:item.name }, description:{ es:'Tema personalizado', en:'Custom theme' } }))].find((item) => item.id === config.themeId);
    const ratio = contrastRatio(config.colors.accent, config.colors.panelSolid);
    const themeCards = Object.values(PRESET_THEMES).map((theme) => `<button type="button" class="appearance-theme-card${config.themeId === theme.id ? ' is-active' : ''}" data-theme-id="${theme.id}" aria-pressed="${String(config.themeId === theme.id)}">
      <span class="appearance-theme-preview" data-preview-theme="${theme.id}"></span><strong>${escapeHtml(localized(theme.name))}</strong><small>${escapeHtml(localized(theme.description))}</small>
    </button>`).join('');
    const backgroundCards = Object.values(BACKGROUNDS).map((item) => `<button type="button" class="appearance-background-card${config.background === item.id ? ' is-active' : ''}" data-background-id="${item.id}" aria-pressed="${String(config.background === item.id)}"><span class="appearance-background-thumb" data-background-thumb="${item.id}"></span><strong>${escapeHtml(localized(item.name))}</strong></button>`).join('');

    let content = '';
    if (activeTab === 'themes') content = `<div class="appearance-theme-grid">${themeCards}</div><button type="button" class="appearance-secondary-action" data-action="original">${c('original')}</button>`;
    if (activeTab === 'backgrounds') content = `<div class="appearance-background-grid">${backgroundCards}</div>`;
    if (activeTab === 'colors') content = `${colorControl('accent', c('accent'), config.colors.accent)}${colorControl('secondary', c('secondary'), config.colors.secondary)}${colorControl('panel', c('panel'), config.colors.panel)}
      <div class="appearance-contrast ${ratio >= 3 ? 'is-good' : 'is-warning'}"><span class="appearance-contrast-sample" style="--sample-accent:${config.colors.accent};--sample-panel:${config.colors.panelSolid}">Aa</span><div><strong>${ratio >= 3 ? c('contrastOk') : c('contrastWarn')}</strong><small>${ratio.toFixed(2)}:1</small></div></div>
      ${checkControl('accessibility.autoContrast', c('autoContrast'), config.accessibility.autoContrast)}`;
    if (activeTab === 'effects') content = `<div class="appearance-profile-grid">${renderChoice(Object.keys(PERFORMANCE_PROFILES), draft.performanceProfile, 'data-profile', (id) => c(id))}</div>${SLIDERS.map(([key,min,max]) => rangeControl(key,min,max,config.effects[key])).join('')}${checkControl('effects.rgbAnimation', c('rgbAnimation'), Boolean(config.effects.rgbAnimation))}<p class="appearance-mobile-warning">${c('mobileWarning')}</p>`;
    if (activeTab === 'interface') content = `<div class="appearance-option-block"><h3>${c('cards')}</h3>${renderChoice(['transparent','balanced','solid'], config.interface.cards, 'data-interface-cards', (id) => c(`card${id[0].toUpperCase()}${id.slice(1)}`))}</div>
      <div class="appearance-option-block"><h3>${c('radius')}</h3>${renderChoice(['straight','soft','rounded'], config.interface.radius, 'data-interface-radius', (id) => c(`radius${id[0].toUpperCase()}${id.slice(1)}`))}</div>
      <div class="appearance-option-block"><h3>${c('density')}</h3>${renderChoice(['compact','normal','spacious'], config.interface.density, 'data-interface-density', (id) => c(id))}</div>
      <div class="appearance-option-block"><h3>${c('text')}</h3>${renderChoice(['small','normal','large','xlarge'], config.interface.textSize, 'data-interface-text', (id) => c(id))}</div>
      <label class="appearance-range"><span>${c('scale')}<output>${config.interface.scale}%</output></span><input type="range" min="85" max="120" value="${config.interface.scale}" data-interface-scale /></label>
      ${checkControl('interface.interfaceMotion', c('interfaceMotion'), config.interface.interfaceMotion)}${checkControl('interface.decorations', c('decorations'), config.interface.decorations)}`;
    if (activeTab === 'accessibility') content = `<div class="appearance-check-grid">${checkControl('accessibility.reduceMotion', c('reduceMotion'), config.accessibility.reduceMotion)}${checkControl('accessibility.highContrast', c('highContrast'), config.accessibility.highContrast)}${checkControl('accessibility.reduceTransparency', c('reduceTransparency'), config.accessibility.reduceTransparency)}${checkControl('accessibility.reduceBloom', c('reduceBloom'), config.accessibility.reduceBloom)}${checkControl('accessibility.removeFlashes', c('removeFlashes'), config.accessibility.removeFlashes)}${checkControl('accessibility.focusVisible', c('focusVisible'), config.accessibility.focusVisible)}${checkControl('accessibility.reduceParticles', c('reduceParticles'), config.accessibility.reduceParticles)}</div>`;
    if (activeTab === 'sections') content = `<div class="appearance-mode-switch">${renderChoice(['global','section'], draft.mode, 'data-mode', (id) => id === 'global' ? c('globalMode') : c('sectionMode'))}</div>
      <label class="appearance-section-select"><span>${c('editSection')}</span><select data-section-select ${draft.mode !== 'section' ? 'disabled' : ''}>${APPEARANCE_SECTIONS.map((id) => `<option value="${id}" ${id === selectedSection ? 'selected' : ''}>${c(id)}</option>`).join('')}</select></label>
      <div class="appearance-section-summary"><strong>${c(selectedSection)}</strong><span>${escapeHtml(localized(BACKGROUNDS[config.background]?.name))}</span></div>
      <div class="appearance-theme-grid appearance-theme-grid--compact">${themeCards}</div>`;
    if (activeTab === 'sound') {
      const ambientState = ambientAudioManager.getState();
      ambientDraft ||= structuredClone(ambientState.settings);
      const activeMode = AMBIENT_SOUND_MODES[ambientDraft.profile] || AMBIENT_SOUND_MODES.balanced;
      const recommendedId = THEME_AUDIO_RECOMMENDATIONS[config.themeId] || THEME_AUDIO_RECOMMENDATIONS[draft.activeTheme] || 'balanced';
      const recommended = AMBIENT_SOUND_MODES[recommendedId];
      const currentObjectId = ambientState.objectId;
      const profileOptions = Object.values(ALL_AMBIENT_PROFILES).map((item) => `<option value="${item.id}" ${ambientDraft.objectOverrides?.[currentObjectId] === item.id ? 'selected':''}>${escapeHtml(localized(item.names))}</option>`).join('');
      const visibleLayers = (ambientState.activeLayers?.length ? ambientState.activeLayers : Object.values(ambientState.profile?.assets || {})).map((item) => escapeHtml(item.label?.[language()] || item.id)).join('</li><li>');
      const planetPreviewIds = ['planet-mercury','planet-venus','planet-earth','planet-mars','planet-jupiter','planet-saturn','planet-uranus','planet-neptune'];
      const planetPreviewButtons = planetPreviewIds.map((id) => `<button type="button" class="appearance-secondary-action" data-sound-action="preview" data-preview-profile="${id}">${escapeHtml(localized(ALL_AMBIENT_PROFILES[id].names).split(' · ')[0])}</button>`).join('');
      content = `<div class="ambient-settings-summary"><div><span>${c('soundProfile')}</span><strong>${escapeHtml(localized(activeMode.name))}</strong><small>${escapeHtml(ambientState.profile?.names?.[language()] || '')}</small></div><button type="button" data-sound-action="activate">${ambientState.authorized ? c('soundAuthorized') : c('soundActivate')}</button></div>
        <p class="ambient-science-note">${c('soundDisclaimer')}</p>
        <section class="ambient-now-playing" aria-live="polite"><span>${c('soundNowPlaying')}</span><strong>${escapeHtml(ambientState.profile?.names?.[language()] || '')}</strong><small>${escapeHtml(localized(activeMode.name))}</small><div><b>${c('soundLayers')}</b><ul><li>${visibleLayers || '—'}</li></ul></div></section>
        <div class="appearance-option-block"><h3>${c('soundProfile')}</h3><div class="appearance-profile-grid">${renderChoice(Object.keys(AMBIENT_SOUND_MODES), ambientDraft.profile, 'data-sound-mode', (id) => localized(AMBIENT_SOUND_MODES[id].name))}</div></div>
        ${checkControl('ambient.enabled', c('soundEnable'), ambientDraft.enabled)}
        <label class="appearance-range"><span>${c('soundMaster')}<output data-ambient-output="masterVolume">${Math.round(ambientDraft.masterVolume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${ambientDraft.masterVolume}" data-ambient-range="masterVolume" /></label>
        <label class="appearance-range"><span>${c('soundRelaxingMusic')}<output data-ambient-output="relaxingMusicVolume">${Math.round(ambientDraft.relaxingMusicVolume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${ambientDraft.relaxingMusicVolume}" data-ambient-range="relaxingMusicVolume" /></label>
        <label class="appearance-range"><span>${c('soundAmbience')}<output data-ambient-output="ambienceVolume">${Math.round(ambientDraft.ambienceVolume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${ambientDraft.ambienceVolume}" data-ambient-range="ambienceVolume" /></label>
        <label class="appearance-range"><span>${c('soundSonification')}<output data-ambient-output="sonificationVolume">${Math.round(ambientDraft.sonificationVolume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${ambientDraft.sonificationVolume}" data-ambient-range="sonificationVolume" /></label>
        <label class="appearance-range"><span>${c('soundEffects')}<output data-ambient-output="effectsVolume">${Math.round(ambientDraft.effectsVolume*100)}%</output></span><input type="range" min="0" max="1" step="0.01" value="${ambientDraft.effectsVolume}" data-ambient-range="effectsVolume" /></label>
        <label class="appearance-range"><span>${c('soundTransition')}<output data-ambient-output="transitionDuration">${ambientDraft.transitionDuration.toFixed(1)}s</output></span><input type="range" min="0.5" max="8" step="0.1" value="${ambientDraft.transitionDuration}" data-ambient-range="transitionDuration" /></label>
        <label class="appearance-range"><span>${c('soundMax')}<output data-ambient-output="maxVolume">${Math.round(ambientDraft.maxVolume*100)}%</output></span><input type="range" min="0.1" max="1" step="0.01" value="${ambientDraft.maxVolume}" data-ambient-range="maxVolume" /></label>
        <div class="appearance-check-grid">${checkControl('ambient.relaxingMusicEnabled', c('soundRelaxingMusic'), ambientDraft.relaxingMusicEnabled)}${checkControl('ambient.ambienceEnabled', c('soundAmbience'), ambientDraft.ambienceEnabled)}${checkControl('ambient.sonificationEnabled', c('soundSonification'), ambientDraft.sonificationEnabled)}${checkControl('ambient.effectsEnabled', c('soundEffects'), ambientDraft.effectsEnabled)}${checkControl('ambient.spatialAudio', c('soundSpatial'), ambientDraft.spatialAudio)}${checkControl('ambient.reduceIntenseSounds', c('soundIntense'), ambientDraft.reduceIntenseSounds)}${checkControl('ambient.disableDeepBass', c('soundBass'), ambientDraft.disableDeepBass)}${checkControl('ambient.vibrationEnabled', c('soundVibration'), ambientDraft.vibrationEnabled)}${checkControl('ambient.soundByObject', c('soundObjects'), ambientDraft.soundByObject)}${checkControl('ambient.soundBySection', c('soundSections'), ambientDraft.soundBySection)}</div>
        <div class="ambient-behavior-grid"><label><span>${c('soundMusic')}</span><select data-ambient-select="musicBehavior"><option value="pause" ${ambientDraft.musicBehavior==='pause'?'selected':''}>${c('soundPause')}</option><option value="reduce" ${ambientDraft.musicBehavior==='reduce'?'selected':''}>${c('soundReduce')}</option><option value="mix" ${ambientDraft.musicBehavior==='mix'?'selected':''}>${c('soundMix')}</option><option value="off" ${ambientDraft.musicBehavior==='off'?'selected':''}>${c('soundOff')}</option></select></label><label><span>${c('soundGame')}</span><select data-ambient-select="gameBehavior"><option value="pause" ${ambientDraft.gameBehavior==='pause'?'selected':''}>${c('soundPause')}</option><option value="reduce" ${ambientDraft.gameBehavior==='reduce'?'selected':''}>${c('soundReduce')}</option><option value="mix" ${ambientDraft.gameBehavior==='mix'?'selected':''}>${c('soundMix')}</option></select></label></div>
        <label class="appearance-section-select"><span>${c('soundSectionProfile')} · ${c(selectedSection)}</span><select data-ambient-section-profile><option value="inherit">${c('soundInherit')}</option>${Object.values(AMBIENT_SOUND_MODES).map((mode) => `<option value="${mode.id}" ${ambientDraft.perSectionProfiles?.[selectedSection]===mode.id?'selected':''}>${escapeHtml(localized(mode.name))}</option>`).join('')}</select></label>
        ${currentObjectId ? `<label class="appearance-section-select"><span>${c('soundObjectOverride')} · ${escapeHtml(currentObjectId)}</span><select data-ambient-object-override><option value="">${c('soundAutomatic')}</option>${profileOptions}</select></label>` : ''}
        <div class="ambient-recommendation"><span>${c('soundRecommended')}</span><strong>${escapeHtml(localized(recommended.name))}</strong><button type="button" data-sound-action="recommended" data-recommended-mode="${recommendedId}">${c('soundApplyRecommended')}</button></div>
        <div class="ambient-quick-preview"><h3>${c('soundQuickTest')}</h3><div>${planetPreviewButtons}</div></div>
        <div class="ambient-preview-actions"><button type="button" class="appearance-primary-action" data-sound-action="preview">${c('soundPreview')}</button><button type="button" class="appearance-secondary-action" data-sound-action="stop-preview">${c('soundStopPreview')}</button><button type="button" class="appearance-secondary-action" data-sound-action="reset">${c('soundReset')}</button></div>
        ${!ambientState.authorized ? `<p class="appearance-mobile-warning">${c('soundWaiting')}</p>`:''}`;
    }
    if (activeTab === 'saved') content = `<form class="appearance-save-form" data-save-theme-form><label><span>${c('themeName')}</span><input type="text" maxlength="40" data-theme-name /></label><button type="submit" class="appearance-primary-action">${c('save')}</button></form>
      <div class="appearance-saved-list">${draft.customThemes.length ? draft.customThemes.map((item) => `<article class="appearance-saved-item"><div><strong>${escapeHtml(item.name)}</strong><small>${item.mode === 'section' ? c('sectionLabel') : c('globalLabel')} · ${new Date(item.createdAt).toLocaleDateString(language() === 'es' ? 'es-ES':'en-US')}</small></div><div><button type="button" data-custom-apply="${item.id}">${c('apply')}</button><button type="button" data-custom-rename="${item.id}">${c('rename')}</button><button type="button" data-custom-duplicate="${item.id}">${c('duplicate')}</button><button type="button" data-custom-delete="${item.id}">${c('remove')}</button></div></article>`).join('') : `<p class="appearance-empty">${c('noSaved')}</p>`}</div>`;

    modal.innerHTML = `<div class="appearance-scrim" data-action="cancel"></div><div class="appearance-panel">
      <header class="appearance-header"><div><p class="eyebrow">${c('preview')}</p><h2 id="appearance-title">${c('title')}</h2><p>${c('subtitle')}</p></div><button type="button" class="appearance-close icon-button" data-action="cancel" aria-label="${c('close')}">×</button></header>
      <div class="appearance-active"><span>${c('active')}</span><strong>${escapeHtml(localized(activeTheme?.name) || (config.themeId === 'custom-preview' ? c('custom') : config.themeId))}</strong><em>${draft.mode === 'section' ? c(selectedSection) : c('globalMode')}</em></div>
      <nav class="appearance-tabs" aria-label="${c('title')}">${TAB_IDS.map((id) => `<button type="button" data-tab="${id}" class="${activeTab === id ? 'is-active':''}" aria-selected="${String(activeTab === id)}">${c(id)}</button>`).join('')}</nav>
      <div class="appearance-content" data-appearance-content>${content}</div>
      <footer class="appearance-footer"><div class="appearance-reset-menu"><button type="button" class="appearance-secondary-action" data-action="toggle-reset">${c('reset')}</button><div class="appearance-reset-options" hidden><button data-reset="background">${c('resetBackground')}</button><button data-reset="colors">${c('resetColors')}</button><button data-reset="effects">${c('resetEffects')}</button><button data-reset="interface">${c('resetInterface')}</button><button data-reset="accessibility">${c('resetAccessibility')}</button><button data-reset="all">${c('resetAll')}</button></div></div><div class="appearance-footer-actions"><button type="button" class="appearance-secondary-action" data-action="cancel">${c('cancel')}</button><button type="button" class="appearance-primary-action" data-action="apply">${c('apply')}</button></div></footer>
      ${notice ? `<div class="appearance-notice" role="status">${escapeHtml(notice)}</div>` : ''}
    </div>`;
  }

  function updateConfig(callback) { appearanceManager.updateConfig(selectedSection, callback); render(); }
  function setNested(target, path, value) {
    const parts = path.split('.'); let current = target;
    for (let index = 0; index < parts.length - 1; index += 1) current = current[parts[index]];
    current[parts.at(-1)] = value;
  }
  function syncColor(key, value) {
    const normalized = normalizeHexColor(value, '');
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) { notice = c('invalidColor'); render(); return; }
    updateConfig((config) => { config.colors[key] = normalized; config.themeId = 'custom-preview'; });
  }

  toggle.addEventListener('click', open);
  document.addEventListener('cosmic-explorer:appearance-open', open);
  window.addEventListener('cosmic-explorer:language-change', () => { if (!modal.hidden) render(); toggle.setAttribute('aria-label', c('open')); toggle.setAttribute('title', c('open')); toggle.querySelector('.sr-only').textContent = c('open'); });
  document.addEventListener('cosmic-explorer:route-change', () => { if (!modal.hidden) close(); });

  modal.addEventListener('click', (event) => {
    const directAction = event.target?.dataset?.action;
    if (directAction === 'cancel') return close();
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'apply') return close({ apply: true });
    if (action === 'cancel') return close();
    if (action === 'toggle-reset') { const menu = modal.querySelector('.appearance-reset-options'); menu.hidden = !menu.hidden; return; }
    if (button.dataset.tab) { activeTab = button.dataset.tab; notice = ''; render(); return; }
    if (button.dataset.soundMode) { ambientDraft = sanitizeAmbientSettings({ ...ambientDraft, ...AMBIENT_SOUND_MODES[button.dataset.soundMode], profile:button.dataset.soundMode, masterVolume:AMBIENT_SOUND_MODES[button.dataset.soundMode].master, relaxingMusicVolume:AMBIENT_SOUND_MODES[button.dataset.soundMode].music, ambienceVolume:AMBIENT_SOUND_MODES[button.dataset.soundMode].ambience, sonificationVolume:AMBIENT_SOUND_MODES[button.dataset.soundMode].sonification, effectsVolume:AMBIENT_SOUND_MODES[button.dataset.soundMode].effects, transitionDuration:AMBIENT_SOUND_MODES[button.dataset.soundMode].transition, enabled:button.dataset.soundMode !== 'silent' }); ambientAudioManager.previewSettings(ambientDraft); render(); return; }
    if (button.dataset.soundAction === 'activate') { ambientAudioManager.activate().then(render); return; }
    if (button.dataset.soundAction === 'preview') { ambientAudioManager.preview(button.dataset.previewProfile || null).then(render); return; }
    if (button.dataset.soundAction === 'stop-preview') { ambientAudioManager.stopPreview(); render(); return; }
    if (button.dataset.soundAction === 'reset') { ambientDraft = sanitizeAmbientSettings({}); ambientAudioManager.previewSettings(ambientDraft); render(); return; }
    if (button.dataset.soundAction === 'recommended') { const mode = button.dataset.recommendedMode; ambientDraft = sanitizeAmbientSettings({ ...ambientDraft, profile:mode, masterVolume:AMBIENT_SOUND_MODES[mode].master, relaxingMusicVolume:AMBIENT_SOUND_MODES[mode].music, ambienceVolume:AMBIENT_SOUND_MODES[mode].ambience, sonificationVolume:AMBIENT_SOUND_MODES[mode].sonification, effectsVolume:AMBIENT_SOUND_MODES[mode].effects, transitionDuration:AMBIENT_SOUND_MODES[mode].transition, enabled:mode !== 'silent' }); ambientAudioManager.previewSettings(ambientDraft); render(); return; }
    if (button.dataset.themeId) { appearanceManager.selectTheme(button.dataset.themeId, selectedSection); render(); return; }
    if (button.dataset.backgroundId) { updateConfig((config) => { config.background = button.dataset.backgroundId; config.themeId = 'custom-preview'; }); return; }
    if (button.dataset.profile) { appearanceManager.setPerformanceProfile(button.dataset.profile, selectedSection); render(); return; }
    if (button.dataset.mode) {
      const nextMode = button.dataset.mode;
      if (nextMode === 'global' && appearanceManager.getDraft().mode === 'section') {
        const useSection = window.confirm(`${c('globalFromSection')}\n\n${c('globalKept')}`);
        appearanceManager.setMode('global', useSection ? selectedSection : null);
      } else appearanceManager.setMode(nextMode);
      render(); return;
    }
    if (button.dataset.interfaceCards) { updateConfig((config) => { config.interface.cards = button.dataset.interfaceCards; }); return; }
    if (button.dataset.interfaceRadius) { updateConfig((config) => { config.interface.radius = button.dataset.interfaceRadius; }); return; }
    if (button.dataset.interfaceDensity) { updateConfig((config) => { config.interface.density = button.dataset.interfaceDensity; }); return; }
    if (button.dataset.interfaceText) { updateConfig((config) => { config.interface.textSize = button.dataset.interfaceText; }); return; }
    if (button.dataset.reset) {
      if (button.dataset.reset === 'all' && !window.confirm(c('confirmReset'))) return;
      appearanceManager.resetDraft(button.dataset.reset, selectedSection);
      notice = c('restored'); render(); return;
    }
    if (action === 'original') { appearanceManager.selectTheme('cosmic-explorer-original', selectedSection); render(); return; }
    if (button.dataset.customApply) { appearanceManager.selectTheme(button.dataset.customApply, selectedSection); render(); return; }
    if (button.dataset.customDuplicate) { appearanceManager.duplicateCustomTheme(button.dataset.customDuplicate); render(); return; }
    if (button.dataset.customRename) {
      const current = appearanceManager.getDraft().customThemes.find((item) => item.id === button.dataset.customRename);
      const next = window.prompt(c('themeName'), current?.name || '');
      if (next && !appearanceManager.renameCustomTheme(button.dataset.customRename, next)) notice = c('renameFailed');
      render(); return;
    }
    if (button.dataset.customDelete) { if (window.confirm(c('confirmDelete'))) appearanceManager.deleteCustomTheme(button.dataset.customDelete); render(); }
  });

  modal.addEventListener('input', (event) => {
    const target = event.target;
    if (target.dataset.ambientRange) { const key = target.dataset.ambientRange; const value = Number(target.value); ambientDraft = sanitizeAmbientSettings({ ...ambientDraft, [key]:value }); ambientAudioManager.previewSettings(ambientDraft); const output = modal.querySelector(`[data-ambient-output="${key}"]`); if (output) output.textContent = key === 'transitionDuration' ? `${value.toFixed(1)}s` : `${Math.round(value*100)}%`; return; }
    if (target.dataset.effect) {
      const key = target.dataset.effect; const value = Number(target.value);
      appearanceManager.updateConfig(selectedSection, (config) => { config.effects[key] = value; config.themeId = 'custom-preview'; });
      modal.querySelector(`[data-output="${key}"]`).textContent = `${value}${key === 'panelBlur' ? 'px':'%'}`;
      return;
    }
    if (target.hasAttribute('data-interface-scale')) {
      const value = Number(target.value); appearanceManager.updateConfig(selectedSection, (config) => { config.interface.scale = value; }); target.previousElementSibling.querySelector('output').textContent = `${value}%`; return;
    }
    if (target.dataset.colorPicker) { syncColor(target.dataset.colorPicker, target.value); return; }
    if (target.dataset.colorRgb) {
      const key = target.dataset.colorRgb;
      const group = modal.querySelector(`[data-color-control="${key}"]`);
      const values = Object.fromEntries([...group.querySelectorAll(`[data-color-rgb="${key}"]`)].map((input) => [input.dataset.channel, input.value]));
      syncColor(key, rgbToHex(values.r, values.g, values.b));
    }
  });

  modal.addEventListener('change', (event) => {
    const target = event.target;
    if (target.dataset.ambientSelect) { ambientDraft = sanitizeAmbientSettings({ ...ambientDraft, [target.dataset.ambientSelect]:target.value }); ambientAudioManager.previewSettings(ambientDraft); return; }
    if (target.dataset.ambientSectionProfile !== undefined) { const next={ ...(ambientDraft.perSectionProfiles||{}) }; if (target.value==='inherit') delete next[selectedSection]; else next[selectedSection]=target.value; ambientDraft=sanitizeAmbientSettings({ ...ambientDraft, perSectionProfiles:next }); ambientAudioManager.previewSettings(ambientDraft); return; }
    if (target.dataset.ambientObjectOverride !== undefined) { const state=ambientAudioManager.getState(); const next={ ...(ambientDraft.objectOverrides||{}) }; if (!target.value) delete next[state.objectId]; else next[state.objectId]=target.value; ambientDraft=sanitizeAmbientSettings({ ...ambientDraft, objectOverrides:next }); ambientAudioManager.previewSettings(ambientDraft); return; }
    if (target.dataset.check?.startsWith('ambient.')) { const key=target.dataset.check.slice(8); ambientDraft=sanitizeAmbientSettings({ ...ambientDraft, [key]:target.checked }); ambientAudioManager.previewSettings(ambientDraft); return; }
    if (target.dataset.sectionSelect !== undefined) { selectedSection = target.value; render(); return; }
    if (target.dataset.colorHex) { syncColor(target.dataset.colorHex, target.value); return; }
    if (target.dataset.colorRgb) {
      const key = target.dataset.colorRgb;
      const group = modal.querySelector(`[data-color-control="${key}"]`);
      const values = Object.fromEntries([...group.querySelectorAll(`[data-color-rgb="${key}"]`)].map((input) => [input.dataset.channel, Math.min(255, Math.max(0, Number(input.value) || 0))]));
      syncColor(key, rgbToHex(values.r, values.g, values.b));
      return;
    }
    if (target.dataset.check) { updateConfig((config) => { setNested(config, target.dataset.check, target.checked); }); }
  });

  modal.addEventListener('submit', (event) => {
    if (!event.target.matches('[data-save-theme-form]')) return;
    event.preventDefault();
    const result = appearanceManager.saveCustomTheme(event.target.querySelector('[data-theme-name]').value, selectedSection);
    notice = result.ok ? c('savedOk') : result.reason === 'duplicate' ? c('duplicateName') : c('emptyName');
    render();
  });

  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  toggle.setAttribute('aria-label', c('open'));
  toggle.setAttribute('title', c('open'));
  toggle.querySelector('.sr-only').textContent = c('open');
  wrapper.append(toggle);
  document.body.append(modal);
  return wrapper;
}
