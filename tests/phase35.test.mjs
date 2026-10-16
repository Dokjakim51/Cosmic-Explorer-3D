import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

async function json(path) {
  return JSON.parse(await source(path));
}

test('planet renderer uses a virtual trackball and quaternion orientation', async () => {
  const renderer = await source('../src/features/universe/webgl-planet-renderer.js');
  assert.match(renderer, /mapPointerToTrackball/);
  assert.match(renderer, /quaternionBetween/);
  assert.match(renderer, /quatMultiply/);
  assert.match(renderer, /uModelRotation/);
  assert.match(renderer, /inertialSpeed/);
});

test('planet rings share the planet orientation and have moving ring detail', async () => {
  const renderer = await source('../src/features/universe/webgl-planet-renderer.js');
  assert.match(renderer, /uRingRotation/);
  assert.match(renderer, /ring:\s*base/);
  assert.match(renderer, /uRingPhase/);
  assert.match(renderer, /aPosition\.y, aPosition\.z/);
});

test('ringed planets have enhanced ring configuration', async () => {
  const planets = await json('../src/data/planets.json');
  const saturn = planets.find((planet) => planet.id === 'saturn');
  const uranus = planets.find((planet) => planet.id === 'uranus');
  assert.equal(saturn.viewer.hasRings, true);
  assert.ok(saturn.viewer.ringOpacity >= .9);
  assert.ok(saturn.viewer.ringScale > 1);
  assert.equal(uranus.viewer.hasRings, true);
  assert.ok(uranus.viewer.ringOpacity >= .45);
});

test('a functional CSS fallback keeps planet controls available without WebGL', async () => {
  const viewer = await source('../src/features/universe/planet-viewer.js');
  const fallback = await source('../src/features/universe/fallback-planet-renderer.js');
  assert.match(viewer, /createFallbackPlanetRenderer/);
  assert.match(fallback, /pointermove/);
  assert.match(fallback, /rotateX/);
  assert.match(fallback, /planet-thumbnail-ring/);
});

test('all eight stars have individual visual selectors and richer viewer layers', async () => {
  const css = await source('../src/styles/phase35.css');
  const viewer = await source('../src/features/universe/star-viewer.js');
  for (const id of ['sun', 'sirius', 'vega', 'betelgeuse', 'rigel', 'polaris', 'proxima-centauri', 'antares']) {
    assert.match(css, new RegExp(`data-star=\\"${id}\\"|star-orb--${id}`));
  }
  assert.match(viewer, /star-orbital-disk/);
  assert.match(viewer, /star-pulse-shell/);
  assert.match(viewer, /star-companion/);
  assert.match(viewer, /star-ray--diagonal-one/);
});
