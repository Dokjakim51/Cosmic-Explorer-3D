import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  APPEARANCE_SECTIONS,
  BACKGROUNDS,
  PERFORMANCE_PROFILES,
  PRESET_THEMES,
  contrastRatio,
  createDefaultAppearance,
  sanitizeAppearance
} from '../src/features/appearance/appearance-config.js';
import { answerKiraQuestion } from '../src/features/kira/kira-knowledge.js';
import { appearanceManager } from '../src/features/appearance/appearance-manager.js';

async function source(path) { return readFile(new URL(path, import.meta.url), 'utf8'); }

test('Phase 8 defines eight distinct backgrounds and seven coordinated presets', () => {
  assert.deepEqual(Object.keys(BACKGROUNDS), ['galaxy','solar','blackhole','nebula','deep-space','supernova','cosmic-web','kira-interface']);
  assert.equal(Object.keys(PRESET_THEMES).length, 7);
  for (const theme of Object.values(PRESET_THEMES)) {
    assert.ok(BACKGROUNDS[theme.config.background]);
    assert.match(theme.config.colors.accent, /^#[0-9a-f]{6}$/i);
    assert.ok(theme.config.effects.bloom >= 0);
  }
});

test('Phase 8 performance profiles materially reduce visual cost', () => {
  const low = PERFORMANCE_PROFILES.performance.effects;
  const balanced = PERFORMANCE_PROFILES.balanced.effects;
  const high = PERFORMANCE_PROFILES.high.effects;
  assert.ok(low.particles < balanced.particles && balanced.particles < high.particles);
  assert.ok(low.bloom < balanced.bloom && balanced.bloom < high.bloom);
  assert.ok(low.layerQuality < balanced.layerQuality && balanced.layerQuality < high.layerQuality);
  assert.ok(low.pixelRatio < high.pixelRatio);
});

test('Phase 8 default state supports global and per-section configurations', () => {
  const state = createDefaultAppearance();
  assert.equal(state.mode, 'global');
  assert.deepEqual(Object.keys(state.sections), APPEARANCE_SECTIONS);
  assert.notEqual(state.sections.home, state.global);
  assert.equal(state.global.themeId, 'cosmic-explorer-original');
});

test('Phase 8 sanitizes damaged persisted settings safely', () => {
  const state = sanitizeAppearance({
    version: 1,
    mode: 'section',
    performanceProfile: 'impossible',
    global: { background: 'unknown', colors: { accent: 'bad' }, effects: { bloom: 9999 }, interface: { scale: 999 } },
    sections: {},
    customThemes: [{ id:'x', name:'X', config:{ background:'bad' } }]
  });
  assert.equal(state.performanceProfile, 'balanced');
  assert.equal(state.global.background, 'galaxy');
  assert.equal(state.global.effects.bloom, 100);
  assert.equal(state.global.interface.scale, 120);
  assert.match(state.global.colors.accent, /^#[0-9a-f]{6}$/i);
});

test('Phase 8 contrast utility detects readable and unreadable combinations', () => {
  assert.ok(contrastRatio('#ffffff', '#000000') > 20);
  assert.ok(contrastRatio('#777777', '#777777') < 1.1);
});

test('Phase 8 panel includes draft/apply/cancel, restoration, custom themes and section mode', async () => {
  const panel = await source('../src/components/layout/theme-customizer.js');
  assert.match(panel, /beginDraft/);
  assert.match(panel, /applyDraft/);
  assert.match(panel, /cancelDraft/);
  assert.match(panel, /data-reset/);
  assert.match(panel, /saveCustomTheme/);
  assert.match(panel, /data-mode/);
  assert.match(panel, /data-section-select/);
  assert.match(panel, /data-color-rgb/);
});

test('Phase 8 backdrop has one global host and all independent scene compositions', async () => {
  const app = await source('../src/app.js');
  const css = await source('../src/styles/phase8-appearance.css');
  for (const id of ['galaxy','solar','blackhole','nebula','deep-space','supernova','cosmic-web','kira-interface']) {
    assert.match(app, new RegExp(`theme-scene--${id}`));
    assert.match(css, new RegExp(`data-backdrop-theme="${id}"`));
  }
  assert.match(css, /animation-play-state/);
  assert.match(app, /appearanceManager\.init/);
});

test('Phase 8 protects astronomical canvases and essential game colors', async () => {
  const css = await source('../src/styles/phase8-appearance.css');
  assert.match(css, /gallery-viewer-canvas[\s\S]*filter:none/);
  assert.match(css, /game-stage canvas[\s\S]*filter:none/);
  assert.doesNotMatch(css, /game-stage canvas[^}]*hue-rotate/);
});



test('Phase 8 applies performance profiles consistently to every section', () => {
  appearanceManager.beginDraft();
  appearanceManager.setMode('section');
  appearanceManager.setPerformanceProfile('performance');
  const state = appearanceManager.getDraft();
  assert.equal(state.performanceProfile, 'performance');
  assert.equal(state.global.effects.pixelRatio, 1);
  for (const section of APPEARANCE_SECTIONS) {
    assert.equal(state.sections[section].effects.layerQuality, 1);
    assert.equal(state.sections[section].effects.particles, PERFORMANCE_PROFILES.performance.effects.particles);
  }
  appearanceManager.cancelDraft();
});

test('Phase 8 preserves custom themes with section snapshots during sanitization', () => {
  const defaultState = createDefaultAppearance();
  const custom = {
    id: 'custom-section-test',
    name: 'Mi combinación',
    createdAt: '2026-08-01T00:00:00.000Z',
    mode: 'section',
    section: 'gallery',
    config: defaultState.global,
    sections: Object.fromEntries(APPEARANCE_SECTIONS.map((section) => [section, {
      ...defaultState.global,
      background: section === 'gallery' ? 'blackhole' : 'deep-space'
    }]))
  };
  const state = sanitizeAppearance({ ...defaultState, customThemes: [custom] });
  assert.equal(state.customThemes[0].mode, 'section');
  assert.equal(state.customThemes[0].sections.gallery.background, 'blackhole');
  assert.equal(state.customThemes[0].sections.home.background, 'deep-space');
});

test('Kira explains Phase 8 controls and reports the active theme without changing it', () => {
  const context = { appearanceSummary:{ themeName:'Cosmic Violet', profileName:'Equilibrado', backgroundName:'Nebulosa', mode:'global' } };
  assert.match(answerKiraQuestion('¿Qué tema tengo activo?', context, 'es').text, /Cosmic Violet/);
  assert.match(answerKiraQuestion('¿Cómo cambio el fondo?', context, 'es').text, /Apariencia/);
  assert.match(answerKiraQuestion('¿Qué tema consume menos recursos?', context, 'es').text, /Espacio profundo/);
  assert.match(answerKiraQuestion('How do I use a different theme in Gallery?', context, 'en').text, /By section|section/i);
});
