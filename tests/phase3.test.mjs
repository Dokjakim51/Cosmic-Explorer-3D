import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('planet viewer close button has an explicit close action', async () => {
  const code = await source('../src/features/universe/planet-viewer.js');
  assert.match(code, /data-action="close"/);
  assert.match(code, /if \(action === 'close'\)/);
});

test('planet visual itself is accepted as an opening trigger', async () => {
  const code = await source('../src/features/universe/planet-viewer.js');
  assert.match(code, /visualSelector: '\.planet-thumbnail, \.celestial-orb'/);
  assert.match(code, /resolveCelestialTrigger/);
});

test('Phase 3 includes star viewer and celestial search modules', async () => {
  const starViewer = await source('../src/features/universe/star-viewer.js');
  const search = await source('../src/features/universe/cosmic-search.js');
  assert.match(starViewer, /createStarExplorer/);
  assert.match(starViewer, /data-action="close"/);
  assert.match(search, /createCosmicSearch/);
  assert.match(search, /aria-autocomplete="list"/);
});
