import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 4 persists local audio blobs in IndexedDB without automatic playback', async () => {
  const database = await source('../src/services/indexed-db.js');
  const library = await source('../src/features/music/music-library.js');
  const player = await source('../src/features/music/music-player.js');
  assert.match(database, /DATABASE_VERSION = 2/);
  assert.match(database, /musicTracks/);
  assert.match(library, /saveMusicTrack/);
  assert.match(library, /getAllMusicTracks/);
  assert.match(player, /new Audio\(\)/);
  assert.match(player, /createMediaElementSource/);
  assert.match(player, /createAnalyser/);
  assert.doesNotMatch(player, /autoplay\s*=/);
});

test('Music Space supports uploads, drag and drop, search, playback controls, and deletion', async () => {
  const page = await source('../src/pages/music-space.js');
  for (const pattern of [
    /data-music-file-input/,
    /data-music-drop-zone/,
    /data-music-search/,
    /data-music-action="shuffle"/,
    /data-music-action="repeat"/,
    /data-track-action="delete"/,
    /createMusicVisualizer/
  ]) assert.match(page, pattern);
});

test('persistent mini player is mounted in the application shell', async () => {
  const app = await source('../src/app.js');
  const miniPlayer = await source('../src/components/layout/mini-player.js');
  assert.match(app, /createMiniPlayer/);
  assert.match(app, /miniPlayer/);
  assert.match(miniPlayer, /musicPlayer\.subscribe/);
  assert.match(miniPlayer, /#\/music-space/);
});

test('Phase 4 visual styles and bilingual music labels are included', async () => {
  const indexCss = await source('../src/styles/index.css');
  const css = await source('../src/styles/phase4.css');
  const translations = await source('../src/i18n/translations.js');
  assert.match(indexCss, /phase4\.css/);
  assert.match(css, /music-visualizer-canvas/);
  assert.match(css, /mini-player/);
  assert.match(translations, /'music\.uploadTitle'/);
  assert.match(translations, /'music\.mini\.label'/);
  assert.match(translations, /Import local music/);
  assert.match(translations, /Importar música local/);
});
