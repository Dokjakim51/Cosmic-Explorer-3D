import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 5.8.3 presents the hero rings clearly from the initial camera pose', async () => {
  const hero = await source('../src/features/home/hero-three-scene.js');
  assert.match(hero, /points\.rotation\.x = THREE\.MathUtils\.degToRad\(53\)/);
  assert.match(hero, /points\.rotation\.z = THREE\.MathUtils\.degToRad\(-10\.5\)/);
  assert.match(hero, /ring\.rotation\.x = THREE\.MathUtils\.degToRad\(53\)/);
  assert.match(hero, /tilt - 9\.5/);
  assert.match(hero, /ringGroup\.rotation\.x = THREE\.MathUtils\.degToRad\(-1\.5\)/);
});

test('Phase 5.8.3 controls Earth exposure, bloom, cloud opacity, and reflective highlights', async () => {
  const earth = await source('../src/features/universe/earth-three-renderer.js');
  assert.match(earth, /exposure: 0\.86/);
  assert.match(earth, /strength: 0\.12, radius: 0\.24, threshold: 0\.96/);
  assert.match(earth, /new THREE\.DirectionalLight\(0xfff7ee, 2\.15\)/);
  assert.match(earth, /createAlphaMapFromTexture/);
  assert.match(earth, /alphaMap: cloudAlphaMap/);
  assert.match(earth, /opacity: 0\.42/);
  assert.match(earth, /specularIntensity: 0\.28/);
  assert.match(earth, /intensity: 0\.72, power: 4\.1, opacity: 0\.48/);
});
