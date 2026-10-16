import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  AMBIENT_AUDIO_PROFILES,
  AMBIENT_AUDIO_STORAGE_KEY,
  AMBIENT_SOUND_MODES,
  ALL_AMBIENT_PROFILES,
  resolveAmbientProfile,
  sanitizeAmbientSettings,
  settingsForMode
} from '../src/features/ambient/ambient-audio-config.js';
import { answerKiraQuestion } from '../src/features/kira/kira-knowledge.js';

const project = new URL('../', import.meta.url);
const source = async (path) => readFile(new URL(path, project), 'utf8');

test('Phase 8.13 defines one unique identity for every section, planet, star, and Gallery object', () => {
  assert.equal(Object.keys(AMBIENT_AUDIO_PROFILES.sections).length, 7);
  assert.equal(Object.keys(AMBIENT_AUDIO_PROFILES.planets).length, 8);
  assert.equal(Object.keys(AMBIENT_AUDIO_PROFILES.stars).length, 8);
  assert.equal(Object.keys(AMBIENT_AUDIO_PROFILES.gallery).length, 16);
  assert.equal(Object.keys(ALL_AMBIENT_PROFILES).length, 39);

  const signatures = Object.values(ALL_AMBIENT_PROFILES).map((item) => JSON.stringify(item.layers));
  assert.equal(new Set(signatures).size, signatures.length, 'Every identity must use a distinct layer configuration.');
  for (const profile of Object.values(ALL_AMBIENT_PROFILES)) {
    assert.ok(profile.names.es && profile.names.en);
    assert.ok(profile.description.es && profile.description.en);
    assert.ok(profile.layers.length >= 1);
    assert.ok(['artistic-ambience','hybrid-data-inspired','data-inspired-sonification'].includes(profile.audioType));
  }
});

test('Phase 8.13 resolves detailed object identities before section ambience', () => {
  const settings = sanitizeAmbientSettings({ enabled:true, soundByObject:true, soundBySection:true });
  assert.equal(resolveAmbientProfile({ section:'universe', objectId:'jupiter', objectType:'planet', settings }).id, 'planet-jupiter');
  assert.equal(resolveAmbientProfile({ section:'universe', objectId:'sirius', objectType:'star', settings }).id, 'star-sirius');
  assert.equal(resolveAmbientProfile({ section:'gallery', objectId:'pulsar', objectType:'gallery', settings }).id, 'gallery-pulsar');
  assert.equal(resolveAmbientProfile({ section:'favorites', settings }).id, 'section-favorites');
});

test('Phase 8.13 provides six materially different sound modes and safe persistence', () => {
  assert.deepEqual(Object.keys(AMBIENT_SOUND_MODES), ['silent','soft','balanced','immersive','scientific','relaxation']);
  const immersive = settingsForMode('immersive');
  const scientific = settingsForMode('scientific');
  const silent = settingsForMode('silent');
  assert.ok(immersive.ambienceVolume > scientific.ambienceVolume);
  assert.ok(scientific.sonificationVolume > immersive.sonificationVolume);
  assert.equal(silent.enabled, false);
  assert.equal(AMBIENT_AUDIO_STORAGE_KEY, 'cosmic-explorer-ambient-audio-v2');

  const damaged = sanitizeAmbientSettings({ profile:'broken', masterVolume:40, musicBehavior:'invalid', transitionDuration:-2, perSectionProfiles:{ home:'scientific', bad:'invalid' } });
  assert.equal(damaged.profile, 'balanced');
  assert.equal(damaged.masterVolume, 1);
  assert.equal(damaged.musicBehavior, 'pause');
  assert.equal(damaged.transitionDuration, 0);
  assert.deepEqual(damaged.perSectionProfiles, { home:'scientific' });
});

test('Phase 8.13 uses one central Web Audio graph, crossfades, and cancels session timers', async () => {
  const manager = await source('src/features/ambient/ambient-audio-manager.js');
  assert.match(manager, /class AmbientAudioManager/);
  assert.match(manager, /new AudioContextClass\(\{ latencyHint:'playback' \}\)/);
  assert.match(manager, /this\.musicGain\.connect\(this\.masterGain\)/);
  assert.match(manager, /this\.ambienceGain\.connect\(this\.masterGain\)/);
  assert.match(manager, /this\.sonificationGain\.connect\(this\.masterGain\)/);
  assert.match(manager, /this\.effectsGain\.connect\(this\.masterGain\)/);
  assert.match(manager, /this\.fadeSession\(previous,0,duration\)/);
  assert.match(manager, /for \(const timer of session\.timers\) clearTimeout\(timer\)/);
  assert.match(manager, /this\.observer\.disconnect\(\)/);
  assert.match(manager, /activeSessionCount/);
});

test('Phase 8.13 protects Music Space, Cosmic Defender, visibility, and autoplay policy', async () => {
  const manager = await source('src/features/ambient/ambient-audio-manager.js');
  const control = await source('src/components/layout/ambient-audio-control.js');
  assert.match(manager, /cosmic-explorer:music-state/);
  assert.match(manager, /musicBehavior === 'pause'/);
  assert.match(manager, /cosmic-explorer:kira-game/);
  assert.match(manager, /gameBehavior === 'reduce'/);
  assert.match(manager, /visibilitychange/);
  assert.match(manager, /async activate\(\)/);
  assert.match(control, /data-ambient-audio-toggle/);
  assert.match(control, /await ambientAudioManager\.activate\(\)/);
});

test('Appearance exposes complete ambient controls with preview, reset, and per-section modes', async () => {
  const panel = await source('src/components/layout/theme-customizer.js');
  const css = await source('src/styles/phase8-13-audio.css');
  for (const marker of ['Sonido ambiental','data-ambient-range','data-ambient-section-profile','data-ambient-object-override','data-sound-action="preview"','data-sound-action="reset"','musicBehavior','gameBehavior']) {
    assert.ok(panel.includes(marker), `Missing ambient panel marker: ${marker}`);
  }
  assert.match(panel, /ambientAudioManager\.previewSettings/);
  assert.match(panel, /ambientAudioManager\.commitSettings/);
  assert.match(css, /ambient-audio-quick-control/);
  assert.match(css, /ambient-behavior-grid/);
});

test('Kira explains ambient sound honestly in Spanish and English', () => {
  const context = { currentSection:'universe', ambientAudioSummary:{ enabled:true, authorized:true, profileName:'Científico', soundName:'Júpiter · Núcleo de tormenta', audioType:'data-inspired-sonification', masterPercent:35, scientificNote:'No direct recording is embedded.' } };
  const current = answerKiraQuestion('¿Qué sonido está reproduciéndose?', context, 'es').text;
  const real = answerKiraQuestion('¿Es un sonido real del espacio?', context, 'es').text;
  const volume = answerKiraQuestion('¿Cómo bajo el volumen ambiental?', context, 'es').text;
  const english = answerKiraQuestion('How do I enable ambient sound?', context, 'en').text;
  assert.match(current, /Júpiter/);
  assert.match(real, /sonificación procedural/i);
  assert.match(real, /no una grabación literal/i);
  assert.match(volume, /Apariencia/);
  assert.match(english, /sound button|Appearance/i);
});

test('Phase 8.14 embeds original local audio files and documents credits', async () => {
  const credits = await source('AUDIO_CREDITS.md');
  const config = await source('src/features/ambient/ambient-audio-config.js');
  assert.match(credits, /original|generado|generated/i);
  assert.match(config, /audio\/ambient/i);
  assert.doesNotMatch(config, /https?:\/\/[^'"\s]+\.(mp3|ogg|wav|m4a)/i);
});
