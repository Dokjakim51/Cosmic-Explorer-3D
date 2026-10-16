import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 5.7 REAL installs and maps pinned Three.js r185', async () => {
  const pkg = JSON.parse(await source('../package.json'));
  const html = await source('../index.html');
  assert.equal(pkg.dependencies.three, '0.185.1');
  assert.match(html, /node_modules\/three\/build\/three\.module\.js/);
  assert.match(html, /node_modules\/three\/examples\/jsm/);
});

test('Phase 5.7 REAL uses PBR Earth layers and postprocessing', async () => {
  const earth = await source('../src/features/universe/earth-three-renderer.js');
  const utilities = await source('../src/features/three/three-scene-utils.js');
  assert.match(earth, /MeshPhysicalMaterial/);
  assert.match(earth, /normalMap/);
  assert.match(earth, /roughnessMap/);
  assert.match(earth, /earth_clouds_2k/);
  assert.match(earth, /earth_night_2k/);
  assert.match(earth, /createAtmosphereMaterial/);
  assert.match(utilities, /UnrealBloomPass/);
  assert.match(utilities, /ACESFilmicToneMapping/);
});

test('Phase 5.7 REAL keeps the genuine Three.js home scene and Phase 5.11 replaces flat Gallery photography with real scenes', async () => {
  const hero = await source('../src/features/home/hero-three-scene.js');
  const gallery = await source('../src/pages/gallery.js');
  const scenes = await source('../src/features/gallery/gallery-three-scenes.js');
  const data = JSON.parse(await source('../src/data/gallery.json'));
  assert.match(hero, /RingGeometry/);
  assert.match(hero, /MeshPhysicalMaterial/);
  assert.match(hero, /createComposer/);
  assert.match(gallery, /gallery-viewer-canvas/);
  assert.match(gallery, /createGalleryPreviewRenderer/);
  assert.match(scenes, /ShaderMaterial/);
  assert.match(scenes, /MeshPhysicalMaterial/);
  assert.equal(data.items.length, 16);
  assert.ok(data.items.every((item) => item.scene));
  await Promise.all([
    access(new URL('../public/textures/earth/earth_day_2k.jpg', import.meta.url)),
    access(new URL('../public/textures/earth/earth_normal_2k.png', import.meta.url)),
    access(new URL('../public/textures/earth/earth_roughness_2k.png', import.meta.url))
  ]);
});
