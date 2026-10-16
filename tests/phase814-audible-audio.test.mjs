import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  ALL_AMBIENT_PROFILES,
  AMBIENT_AUDIO_STORAGE_KEY,
  DEFAULT_AMBIENT_AUDIO_SETTINGS,
  AMBIENT_SOUND_MODES,
  sanitizeAmbientSettings
} from '../src/features/ambient/ambient-audio-config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(await readFile(resolve(root, 'public/audio/ambient/manifest.json'), 'utf8'));

test('Phase 8.14 ships three real stems for all 39 identities in OGG and MP3', async () => {
  assert.equal(Object.keys(ALL_AMBIENT_PROFILES).length, 39);
  assert.equal(Object.keys(manifest.profiles).length, 39);
  assert.equal(manifest.files.length, 39 * 3 * 2);
  for (const profile of Object.values(ALL_AMBIENT_PROFILES)) {
    for (const stem of ['music','ambience','sonification']) {
      const asset = profile.assets[stem];
      assert.ok(asset, `${profile.id} missing ${stem}`);
      assert.equal(asset.sources.length, 2);
      for (const source of asset.sources) {
        const file = resolve(root, 'public', source.replace(/^\//,''));
        const info = await stat(file);
        assert.ok(info.size > 1000, `${source} is empty or too small`);
      }
    }
  }
});

test('All rendered stems are unique files rather than one shared fallback', async () => {
  const hashes = [];
  for (const item of manifest.files.filter((entry) => entry.format === 'ogg')) {
    const data = await readFile(resolve(root, 'public', item.path));
    hashes.push(createHash('sha256').update(data).digest('hex'));
  }
  assert.equal(new Set(hashes).size, hashes.length);
});

test('Audio stems have useful durations and nonzero sizes', () => {
  for (const file of manifest.files) {
    const expected = file.stem === 'music' ? 29 : file.stem === 'ambience' ? 19 : 15;
    assert.ok(file.duration >= expected, `${file.path} duration ${file.duration}`);
    assert.ok(file.size > 10_000, `${file.path} size ${file.size}`);
  }
});

test('Default and named profiles are materially audible and distinct', () => {
  assert.equal(AMBIENT_AUDIO_STORAGE_KEY, 'cosmic-explorer-ambient-audio-v2');
  assert.ok(DEFAULT_AMBIENT_AUDIO_SETTINGS.masterVolume >= .5);
  assert.ok(DEFAULT_AMBIENT_AUDIO_SETTINGS.relaxingMusicVolume >= .5);
  assert.ok(DEFAULT_AMBIENT_AUDIO_SETTINGS.ambienceVolume >= .45);
  assert.ok(AMBIENT_SOUND_MODES.relaxation.music > AMBIENT_SOUND_MODES.balanced.music);
  assert.ok(AMBIENT_SOUND_MODES.scientific.sonification > AMBIENT_SOUND_MODES.balanced.sonification);
  assert.ok(AMBIENT_SOUND_MODES.immersive.ambience > AMBIENT_SOUND_MODES.soft.ambience);
  assert.equal(AMBIENT_SOUND_MODES.silent.master, 0);
});

test('Legacy near-zero settings migrate to audible defaults without overriding intentional silence', () => {
  const migrated = sanitizeAmbientSettings({ version:1, enabled:true, profile:'balanced', masterVolume:.01, ambienceVolume:0 });
  assert.ok(migrated.masterVolume >= .5);
  assert.ok(migrated.ambienceVolume >= .45);
  assert.ok(migrated.relaxingMusicVolume > 0);
  const intentional = sanitizeAmbientSettings({ version:1, enabled:false, profile:'silent', masterVolume:0, ambienceVolume:0 });
  assert.equal(intentional.enabled, false);
  assert.equal(intentional.masterVolume, 0);
});

test('Manager loads and decodes files before crossfading and keeps previous session on failure', async () => {
  const manager = await readFile(resolve(root, 'src/features/ambient/ambient-audio-manager.js'), 'utf8');
  assert.match(manager, /await this\.loadBuffer/);
  assert.match(manager, /decodeAudioData/);
  assert.match(manager, /if \(!session\.loadedAssets\.length\)/);
  assert.match(manager, /const previous=this\.activeSession|const previous = this\.activeSession/);
  assert.match(manager, /this\.fadeSession\(previous,0,duration\)/);
  assert.match(manager, /procedural fallback active/i);
  assert.match(manager, /getDiagnostics\(\)/);
});

test('Appearance contains separate music, ambience, sonification and effects controls plus quick previews', async () => {
  const panel = await readFile(resolve(root, 'src/components/layout/theme-customizer.js'), 'utf8');
  for (const marker of ['relaxingMusicVolume','relaxingMusicEnabled','ambienceEnabled','sonificationEnabled','effectsEnabled','soundQuickTest','data-preview-profile','soundNowPlaying','soundLayers']) {
    assert.ok(panel.includes(marker), `Missing ${marker}`);
  }
});

test('Kira explains active layers and how to listen to relaxing music only', async () => {
  const kira = await readFile(resolve(root, 'src/features/kira/kira-knowledge.js'), 'utf8');
  assert.match(kira, /ambient-relaxing/);
  assert.match(kira, /Música relajante/);
  assert.match(kira, /Capas activas/);
  assert.match(kira, /musicPercent/);
});
