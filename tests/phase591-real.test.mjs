import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 5.9 REAL routes the seven non-Earth planets through a Three.js PBR renderer', async () => {
  const viewer = await source('../src/features/universe/planet-viewer.js');
  const renderer = await source('../src/features/universe/planet-three-renderer.js');
  assert.match(viewer, /createPlanetThreeRenderer/);
  assert.match(viewer, /createEarthThreeRenderer/);
  assert.match(renderer, /new THREE\.MeshPhysicalMaterial/);
  assert.match(renderer, /normalMap/);
  assert.match(renderer, /roughnessMap/);
  assert.match(renderer, /bumpMap/);
  assert.match(renderer, /createAtmosphereMaterial/);
  assert.match(renderer, /createRadialRingGeometry/);
  assert.match(renderer, /new THREE\.SphereGeometry\(config\.radius, 192, 128\)/);
  assert.doesNotMatch(renderer, /earth:\s*\{/);
});

test('Phase 5.9 REAL includes real 2K source textures and derived maps for all seven planets', async () => {
  const planets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  for (const planet of planets) {
    for (const file of ['color.jpg', 'normal.png', 'roughness.png', 'bump.png']) {
      const fileStat = await stat(new URL(`../public/textures/planets/${planet}/${file}`, import.meta.url));
      assert.ok(fileStat.size > 2_500, `${planet}/${file} should contain a real texture map`);
    }
    const thumbnailStat = await stat(new URL(`../public/images/planets/${planet}-pbr-card.png`, import.meta.url));
    assert.ok(thumbnailStat.size > 20_000, `${planet} should have a texture-derived thumbnail`);
  }
});

test('Phase 5.9 REAL keeps the accepted Earth renderer byte-for-byte unchanged', async () => {
  const earth = await readFile(new URL('../src/features/universe/earth-three-renderer.js', import.meta.url));
  const digest = createHash('sha256').update(earth).digest('hex');
  assert.equal(digest, '7fd8b386084415595ecbf0e1df2d876b2cd74ded7df4eac846cb4cfb7c8d0b20');
});

test('Phase 5.9 REAL imports the final texture-based thumbnail overrides', async () => {
  const indexCss = await source('../src/styles/index.css');
  const phaseCss = await source('../src/styles/phase59-real.css');
  assert.match(indexCss, /phase59-real\.css/);
  for (const planet of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
    assert.match(phaseCss, new RegExp(`${planet}-pbr-card\\.png`));
  }
});
