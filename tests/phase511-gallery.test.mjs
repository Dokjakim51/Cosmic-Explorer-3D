import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';

const root = resolve(new URL('..', import.meta.url).pathname);
const expectedScenes = [
  'black-hole',
  'quasar',
  'blazar',
  'tidal-disruption',
  'pulsar',
  'magnetar',
  'supernova',
  'supernova-remnant',
  'kilonova',
  'protostar',
  'planetary-nebula',
  'cosmic-web',
  'wolf-rayet',
  'vampire-star',
  'herbig-haro',
  'gamma-ray-burst'
];
const removedScenes = ['einstein-ring', 'galaxy-collision', 'stellar-nursery', 'rogue-planet'];

async function source(relativePath) {
  return readFile(resolve(root, relativePath), 'utf8');
}

async function sha256(relativePath) {
  const bytes = await readFile(resolve(root, relativePath));
  return createHash('sha256').update(bytes).digest('hex');
}

test('Phase 5.11.5 data contains exactly the requested final sixteen Gallery scenes', async () => {
  const data = JSON.parse(await source('src/data/gallery.json'));
  assert.equal(data.phase, '5.11.5');
  assert.equal(data.items.length, 16);
  assert.deepEqual(data.items.map((item) => item.scene), expectedScenes);
  assert.equal(new Set(data.items.map((item) => item.id)).size, 16);
  assert.equal(new Set(data.items.map((item) => item.scene)).size, 16);
  assert.deepEqual(data.categories, ['compactObjects', 'explosions', 'starFormation', 'stellarSystems', 'largeScale']);
  assert.equal(data.items.some((item) => removedScenes.includes(item.scene)), false);
  for (const item of data.items) {
    assert.ok(item.titleKey && item.descriptionKey && item.techniqueKey);
    assert.ok(Array.isArray(item.tags) && item.tags.length >= 3);
    assert.ok(['hero', 'portrait', 'compact', 'wide', 'half'].includes(item.layout));
    assert.match(item.accent, /^#[0-9a-f]{6}$/i);
    assert.match(item.accentSecondary, /^#[0-9a-f]{6}$/i);
  }
});

test('Phase 5.11.5 exposes only the final scene builders', async () => {
  const scenes = await source('src/features/gallery/gallery-three-scenes.js');
  const builders = scenes.slice(scenes.indexOf('const BUILDERS = {'), scenes.indexOf('export function createGalleryScene'));
  for (const id of expectedScenes) {
    assert.ok(builders.includes(`'${id}':`) || builders.includes(`\n  ${id}:`), `Missing builder for ${id}`);
  }
  for (const id of removedScenes) assert.doesNotMatch(builders, new RegExp(`['\"]?${id}['\"]?\\s*:`));
  assert.equal((scenes.match(/const record = makeBaseScene\(\{/g) || []).length, 16);
  assert.match(scenes, /ShaderMaterial/);
  assert.match(scenes, /TubeGeometry/);
  assert.match(scenes, /CatmullRomCurve3/);
  assert.match(scenes, /MeshPhysicalMaterial/);
  assert.match(scenes, /disposeThreeObject/);
});

test('Phase 5.11.5 deeply builds the four replacement phenomena', async () => {
  const scenes = await source('src/features/gallery/gallery-three-scenes.js');
  const wolf = scenes.slice(scenes.indexOf('function buildWolfRayet'), scenes.indexOf('function makeAccretionDiskCloud'));
  for (const marker of ['innerShell', 'outerShell', 'clumpyEjecta', 'fastWind', 'filaments', 'makeFilamentCage']) assert.match(wolf, new RegExp(marker));

  const vampire = scenes.slice(scenes.indexOf('function buildVampireStar'), scenes.indexOf('function makeBowShock'));
  for (const marker of ['donor', 'accretor', 'diskGroup', 'streamCurve', 'streamCore', 'streamSheath', 'streamParticles', 'impactGlow']) assert.match(vampire, new RegExp(marker));

  const herbig = scenes.slice(scenes.indexOf('function buildHerbigHaro'), scenes.indexOf('function makeGammaJet'));
  for (const marker of ['coreClouds', 'foregroundDust', 'protostar', 'diskGroup', 'jetParticles', 'knots', 'bowPositive', 'bowNegative', 'shockedGas']) assert.match(herbig, new RegExp(marker));

  const burst = scenes.slice(scenes.indexOf('function buildGammaRayBurst'), scenes.indexOf('const BUILDERS'));
  for (const marker of ['engine', 'positiveJet', 'negativeJet', 'jetAxis', 'cocoon', 'afterglow', 'ejecta', 'internal shock']) {
    if (marker === 'internal shock') assert.match(scenes, /const shocks = new THREE\.Group/);
    else assert.match(burst, new RegExp(marker));
  }
});

test('Phase 5.11.5 uses one shared postprocessed preview renderer and per-card canvases', async () => {
  const renderer = await source('src/features/gallery/gallery-three-renderer.js');
  const page = await source('src/pages/gallery.js');
  assert.match(renderer, /createGalleryPreviewRenderer/);
  assert.match(renderer, /preserveDrawingBuffer:\s*true/);
  assert.match(renderer, /PREVIEWS_PER_FRAME/);
  assert.match(renderer, /IntersectionObserver/);
  assert.match(renderer, /previewComposer\.render/);
  assert.match(renderer, /previewBloom\.strength/);
  assert.match(renderer, /targetHeight/);
  assert.match(renderer, /hostAspect/);
  assert.match(renderer, /PREVIEW_MAX_HEIGHT = 780/);
  assert.match(renderer, /drawImage\(sourceCanvas/);
  assert.match(page, /<canvas class="gallery-card-canvas" data-gallery-thumbnail/);
  assert.match(page, /card\.dataset\.gallerySceneId = item\.scene/);
  assert.match(page, /data-gallery-scene="\$\{item\.scene\}"/);
});

test('Phase 5.11.5 has a stable varied mosaic with a real thirty-pixel gap', async () => {
  const data = JSON.parse(await source('src/data/gallery.json'));
  const css = await source('src/styles/phase511-gallery.css');
  assert.ok(new Set(data.items.map((item) => item.layout)).size >= 5);
  assert.ok(new Set(data.items.map((item) => item.accent)).size >= 14);
  assert.match(css, /Phase 5\.11\.4/);
  assert.match(css, /grid-template-columns:\s*repeat\(12/);
  assert.match(css, /grid-auto-rows:\s*auto\s*!important/);
  assert.match(css, /grid-auto-flow:\s*row dense/);
  assert.match(css, /gap:\s*30px\s*!important/);
  assert.match(css, /gallery-card--hero,[\s\S]*gallery-card--wide\s*\{\s*grid-column:\s*span 8/);
  assert.match(css, /gallery-card--half\s*\{\s*grid-column:\s*span 6/);
  assert.match(css, /gallery-card--portrait,[\s\S]*gallery-card--compact\s*\{\s*grid-column:\s*span 4/);
  assert.match(css, /contain:\s*layout paint style/);
  assert.match(css, /overflow:\s*hidden/);
  assert.match(css, /@media \(max-width: 68rem\)/);
  assert.match(css, /@media \(max-width: 48rem\)/);
});

test('Phase 5.11.5 keeps names, categories, descriptions, and explore cues visible before hover', async () => {
  const page = await source('src/pages/gallery.js');
  const css = await source('src/styles/phase511-gallery.css');
  assert.match(page, /<small><i><\/i>\$\{t\(`gallery\.filter\.\$\{item\.category\}`\)\}<\/small>/);
  assert.match(page, /<h2>\$\{title\}<\/h2>/);
  assert.match(page, /<p>\$\{t\(item\.descriptionKey\)\}<\/p>/);
  assert.match(page, /gallery-open-cue/);
  assert.match(css, /gallery-card-overlay h2[\s\S]*visibility:\s*visible/);
  assert.match(css, /gallery-card-overlay h2[\s\S]*opacity:\s*1/);
  assert.doesNotMatch(css.slice(css.lastIndexOf('Phase 5.11.5')), /gallery-card:hover[\s\S]*scale\(/);
});

test('Phase 5.11.5 gives each active scene its own camera and calibrated bloom', async () => {
  const scenes = await source('src/features/gallery/gallery-three-scenes.js');
  const baseCalls = [...scenes.matchAll(/makeBaseScene\(\{[\s\S]*?bloom:\s*\{\s*strength:\s*([0-9.]+),\s*radius:\s*([0-9.]+),\s*threshold:\s*([0-9.]+)\s*\}[\s\S]*?previewBloom:\s*\{\s*strength:\s*([0-9.]+),\s*radius:\s*([0-9.]+),\s*threshold:\s*([0-9.]+)\s*\}[\s\S]*?exposure:\s*([0-9.]+),\s*previewExposure:\s*([0-9.]+)[\s\S]*?\}\);/g)];
  assert.equal(baseCalls.length, 16);
  const strengths = new Set();
  const previews = new Set();
  for (const match of baseCalls) {
    const strength = Number(match[1]);
    const radius = Number(match[2]);
    const threshold = Number(match[3]);
    const previewStrength = Number(match[4]);
    const exposure = Number(match[7]);
    const previewExposure = Number(match[8]);
    strengths.add(strength);
    previews.add(previewStrength);
    assert.ok(strength >= 0.68 && strength <= 0.87, `Viewer bloom outside controlled range: ${strength}`);
    assert.ok(previewStrength >= 0.59 && previewStrength <= 0.76, `Preview bloom outside controlled range: ${previewStrength}`);
    assert.ok(radius >= 0.35 && radius <= 0.45, `Bloom radius outside range: ${radius}`);
    assert.ok(threshold >= 0.76 && threshold <= 0.825, `Bloom threshold outside range: ${threshold}`);
    assert.ok(exposure >= 1.03 && exposure <= 1.06, `Exposure outside range: ${exposure}`);
    assert.ok(previewExposure >= 1.01 && previewExposure <= exposure, `Invalid preview exposure: ${previewExposure}`);
  }
  assert.ok(strengths.size >= 12);
  assert.ok(previews.size >= 10);
  assert.equal((scenes.match(/previewCamera:/g) || []).length, 16);
  assert.equal((scenes.match(/previewBloom:\s*\{/g) || []).length, 16);
});

test('Phase 5.11.5 provides visible scene-specific fallbacks without invisible click interception', async () => {
  const css = await source('src/styles/phase511-gallery.css');
  for (const id of ['wolf-rayet', 'vampire-star', 'herbig-haro', 'gamma-ray-burst']) {
    assert.match(css, new RegExp(`data-gallery-scene-id=\\"${id}\\"`));
  }
  assert.match(css, /gallery-scene-fallback,[\s\S]*gallery-card-index\s*\{\s*pointer-events:\s*none\s*!important/);
  assert.match(css, /gallery-card-canvas[\s\S]*pointer-events:\s*none\s*!important/);
});

test('Phase 5.11.5 contains English and Spanish labels for the replacement scenes', async () => {
  const translations = await source('src/i18n/translations.js');
  for (const key of ['wolfRayet', 'vampireStar', 'herbigHaro', 'gammaRayBurst']) {
    assert.equal((translations.match(new RegExp(`gallery\\.item\\.${key}`, 'g')) || []).length, 2, `Missing bilingual item key ${key}`);
    assert.equal((translations.match(new RegExp(`gallery\\.desc\\.${key}`, 'g')) || []).length, 2, `Missing bilingual description key ${key}`);
    assert.equal((translations.match(new RegExp(`gallery\\.tech\\.${key}`, 'g')) || []).length, 2, `Missing bilingual technique key ${key}`);
  }
  assert.equal((translations.match(/gallery\.filter\.stellarSystems/g) || []).length, 2);
});

test('Phase 5.11.5 keeps the viewer navigation and orbit controls intact', async () => {
  const renderer = await source('src/features/gallery/gallery-three-renderer.js');
  const page = await source('src/pages/gallery.js');
  assert.match(renderer, /createGalleryViewerRenderer/);
  assert.match(renderer, /OrbitControls/);
  assert.match(renderer, /createComposer/);
  assert.match(renderer, /zoomBy/);
  assert.match(renderer, /resetView/);
  assert.match(page, /data-viewer-canvas/);
  assert.match(page, /data-viewer-action="previous"/);
  assert.match(page, /data-viewer-action="next"/);
  assert.match(page, /event\.key === 'ArrowLeft'/);
  assert.match(page, /event\.key === 'ArrowRight'/);
});

test('Phase 5.11.5 fixes the shared animated shell uniform used by Wolf-Rayet and Gamma-Ray Burst', async () => {
  const scenes = await source('src/features/gallery/gallery-three-scenes.js');
  const shellMaterial = scenes.slice(scenes.indexOf('function makeNebulaShellMaterial'), scenes.indexOf('function buildPlanetaryNebula'));
  assert.match(shellMaterial, /uTime:\s*\{\s*value:\s*0\s*\}/);
  assert.match(shellMaterial, /uniform float uTime;/);
  assert.match(shellMaterial, /vec3 drift = vec3\(uTime/);

  const wolf = scenes.slice(scenes.indexOf('function buildWolfRayet'), scenes.indexOf('function makeAccretionDiskCloud'));
  const burst = scenes.slice(scenes.indexOf('function buildGammaRayBurst'), scenes.indexOf('const BUILDERS'));
  assert.match(wolf, /innerShell\.material\.uniforms\.uTime\.value/);
  assert.match(wolf, /outerShell\.material\.uniforms\.uTime\.value/);
  assert.match(burst, /cocoon\.material\.uniforms\.uTime\.value/);
});

test('Phase 5.11.5 prevents one failed preview from freezing all shared thumbnails', async () => {
  const renderer = await source('src/features/gallery/gallery-three-renderer.js');
  assert.match(renderer, /const failPreviewEntry = \(entry, error\)/);
  assert.match(renderer, /Preview scene .* stopped safely/);
  assert.match(renderer, /entry\.host\.classList\.remove\('has-rendered-thumbnail'\)/);
  assert.match(renderer, /entry\.context\?\.clearRect/);
  assert.match(renderer, /try \{[\s\S]*previewComposer\.render\(delta\)[\s\S]*\} catch \(error\) \{[\s\S]*failPreviewEntry\(entry, error\)/);
  assert.match(renderer, /entry\.failed = true/);
});

test('Phase 5.11.5 clears stale viewer frames and keeps the animation loop alive after scene errors', async () => {
  const renderer = await source('src/features/gallery/gallery-three-renderer.js');
  assert.match(renderer, /const clearViewerFrame = \(\) =>/);
  assert.match(renderer, /renderer\.setRenderTarget\(null\)/);
  assert.match(renderer, /renderer\.clear\(true, true, true\)/);
  assert.match(renderer, /renderPass\.scene = fallbackScene/);
  assert.match(renderer, /const renderCurrentFrame = \(time, delta\) =>/);
  assert.match(renderer, /handleViewerFailure\(error, lastFailedScene\)/);
  assert.match(renderer, /releaseCurrentRecord\(\);[\s\S]*clearViewerFrame\(\);[\s\S]*buildSceneSafely\(id, stage, 'viewer'\)/);
  assert.match(renderer, /renderCurrentFrame\(lastTime, 0\)/);
});

test('Phase 5.11.5 keeps card names and fallbacks visible even when WebGL preview rendering fails', async () => {
  const page = await source('src/pages/gallery.js');
  const css = await source('src/styles/phase511-gallery.css');
  assert.match(page, /<h2>\$\{title\}<\/h2>/);
  assert.match(css, /Phase 5\.11\.5/);
  assert.match(css, /gallery-grid--phase511 > \.gallery-card \{[\s\S]*display:\s*flex[\s\S]*height:\s*auto/);
  assert.match(css, /gallery-scene-host\.has-scene-error \.gallery-card-canvas[\s\S]*opacity:\s*0/);
  assert.match(css, /gallery-scene-host\.has-scene-error \.gallery-scene-fallback[\s\S]*opacity:\s*\.88/);
  assert.match(css, /gallery-card-overlay h2[\s\S]*color:\s*#f7fbff/);
});

test('Phase 5.11 preserves planet and star implementation files byte-for-byte', async () => {
  const manifest = await source('tests/phase511-protected-baseline.sha256');
  for (const line of manifest.trim().split(/\r?\n/).filter(Boolean)) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/);
    assert.ok(match, `Invalid manifest line: ${line}`);
    const [, expected, relativePath] = match;
    assert.equal(await sha256(relativePath), expected, `Protected planet/star file changed: ${relativePath}`);
  }
});
