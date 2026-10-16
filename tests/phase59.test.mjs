import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 5.9 keeps Earth untouched while rebuilding the other seven planets in the procedural renderer', async () => {
  const renderer = await source('../src/features/universe/webgl-planet-renderer.js');
  assert.match(renderer, /vec3 earth\(vec2 uv\)/);
  assert.match(renderer, /vec3 mercury\(vec2 uv\)/);
  assert.match(renderer, /craterMask/);
  assert.match(renderer, /vec3 venus\(vec2 uv\)/);
  assert.match(renderer, /vec3 mars\(vec2 uv\)/);
  assert.match(renderer, /vec3 jupiter\(vec2 uv\)/);
  assert.match(renderer, /grsUv/);
  assert.match(renderer, /vec3 saturn\(vec2 uv\)/);
  assert.match(renderer, /vec3 uranus\(vec2 uv\)/);
  assert.match(renderer, /vec3 neptune\(vec2 uv\)/);
  assert.match(renderer, /specularStrength/);
  assert.match(renderer, /hazeStrength/);
});

test('Phase 5.9 upgrades planet thumbnails and keeps rings visible for Saturn and Uranus', async () => {
  const css = await source('../src/styles/phase56.css');
  assert.match(css, /\.planet-thumbnail--mercury/);
  assert.match(css, /\.planet-thumbnail--venus/);
  assert.match(css, /\.planet-thumbnail--mars/);
  assert.match(css, /\.planet-thumbnail--jupiter/);
  assert.match(css, /\.planet-thumbnail--saturn/);
  assert.match(css, /\.planet-thumbnail--uranus/);
  assert.match(css, /\.planet-thumbnail--neptune/);
  assert.match(css, /display: block;[\s\S]*?border-color: rgba\(255,245,208,.92\)/);
  assert.match(css, /display: block;[\s\S]*?border-color: rgba\(186,246,255,.58\)/);
});

test('Phase 5.9 smooths the solar backdrop and gives Neptune faint rings in its viewer configuration', async () => {
  const css = await source('../src/styles/phase581.css');
  const planets = await source('../src/data/planets.json');
  assert.match(css, /data-backdrop-theme="solar"/);
  assert.match(css, /hero::before/);
  assert.match(css, /radial-gradient\(circle at 9% 21%/);
  assert.match(planets, /"id": "earth"[\s\S]*?"hasRings": false/);
  assert.match(planets, /"id": "neptune"[\s\S]*?"hasRings": true/);
  assert.match(planets, /"id": "saturn"[\s\S]*?"ringScale": 1\.11/);
});
