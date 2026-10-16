import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('..', import.meta.url).pathname);

async function source(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

async function sha256(relativePath) {
  const bytes = await readFile(resolve(root, relativePath));
  return createHash('sha256').update(bytes).digest('hex');
}

test('Phase 5.10 uses a dedicated layered Three.js star renderer', async () => {
  const renderer = await source('src/features/universe/star-three-renderer.js');
  assert.match(renderer, /createStarThreeRenderer/);
  assert.match(renderer, /ShaderMaterial/);
  assert.match(renderer, /SIMPLEX_NOISE_GLSL/);
  assert.match(renderer, /fbm3/);
  assert.match(renderer, /createSurfaceMaterial/);
  assert.match(renderer, /createCoronaMaterial/);
  assert.match(renderer, /createFlarePair/);
  assert.match(renderer, /TubeGeometry/);
  assert.match(renderer, /createSelectiveBloomPipeline/);
  assert.match(renderer, /UnrealBloomPass/);
  assert.match(renderer, /bloomScene/);
  assert.match(renderer, /baseScene/);
});

test('Phase 5.10 differentiates all eight stars beyond a simple color swap', async () => {
  const renderer = await source('src/features/universe/star-three-renderer.js');
  for (const id of ['sun', 'sirius', 'vega', 'betelgeuse', 'rigel', 'polaris', 'proxima-centauri', 'antares']) {
    assert.match(renderer, new RegExp(`['"]?${id.replace('-', '\\-')}['"]?\\s*:`));
  }
  assert.match(renderer, /spotStrength/);
  assert.match(renderer, /flareCount/);
  assert.match(renderer, /coronaStrength/);
  assert.match(renderer, /pulseAmplitude/);
  assert.match(renderer, /polarBrightness/);
  assert.match(renderer, /companion/);
});

test('Phase 5.10 star viewer exposes a real canvas with rotation, zoom and reset controls', async () => {
  const viewer = await source('src/features/universe/star-viewer.js');
  assert.match(viewer, /createStarThreeRenderer/);
  assert.match(viewer, /data-star-canvas/);
  assert.match(viewer, /data-action="zoom-in"/);
  assert.match(viewer, /data-action="zoom-out"/);
  assert.match(viewer, /starRenderer\?\.reset/);
  assert.match(viewer, /starRenderer\?\.toggleAnimation/);
  assert.match(viewer, /starRenderer\?\.destroy/);
});

test('Phase 5.10 includes distinct texture-based star thumbnails and final CSS overrides', async () => {
  const css = await source('src/styles/phase510-stars.css');
  const indexCss = await source('src/styles/index.css');
  assert.match(indexCss, /phase510-stars\.css/);
  for (const id of ['sun', 'sirius', 'vega', 'betelgeuse', 'rigel', 'polaris', 'proxima-centauri', 'antares']) {
    assert.match(css, new RegExp(`${id.replace('-', '\\-')}-stellar-card\\.png`));
    const info = await stat(resolve(root, `public/images/stars/${id}-stellar-card.png`));
    assert.ok(info.size > 25_000, `${id} thumbnail should contain meaningful visual detail`);
  }
  assert.match(css, /filter: none !important/);
  assert.match(css, /star-three-canvas/);
});

test('Phase 5.10 preserves every planet-exclusive file byte-for-byte', async () => {
  const manifest = await source('tests/planet-files-phase59-baseline.sha256');
  const lines = manifest.trim().split(/\r?\n/).filter(Boolean);
  assert.ok(lines.length >= 60);
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    assert.ok(match, `Invalid manifest line: ${line}`);
    const [, expected, relativePath] = match;
    assert.equal(await sha256(relativePath), expected, `Planet file changed: ${relativePath}`);
  }
});
