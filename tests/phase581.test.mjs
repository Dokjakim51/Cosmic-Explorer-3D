import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  applyPlanetRendererVisibility,
  resolveCelestialTrigger
} from '../src/features/universe/celestial-interaction.js';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('Phase 5.8.1 applies planet renderer visibility without an out-of-scope fallback variable', () => {
  const nodes = {
    '.planet-canvas': { hidden: false },
    '.earth-three-canvas': { hidden: true },
    '.planet-fallback': { hidden: true }
  };
  const modal = { querySelector: (selector) => nodes[selector] };

  applyPlanetRendererVisibility(modal, { usingEarthRenderer: false, standardUsesFallback: true });
  assert.equal(nodes['.planet-canvas'].hidden, true);
  assert.equal(nodes['.earth-three-canvas'].hidden, true);
  assert.equal(nodes['.planet-fallback'].hidden, false);

  applyPlanetRendererVisibility(modal, { usingEarthRenderer: true, standardUsesFallback: false });
  assert.equal(nodes['.planet-canvas'].hidden, true);
  assert.equal(nodes['.earth-three-canvas'].hidden, false);
  assert.equal(nodes['.planet-fallback'].hidden, true);
});

test('Phase 5.8.1 resolves clicks from any part of a planet or star card', () => {
  const planetCard = { dataset: { planetId: 'earth' } };
  const planetVisual = { dataset: {}, closest: (selector) => selector.includes('planet-thumbnail') ? planetVisual : planetCard };
  const planetRoot = { contains: (node) => node === planetCard };
  const planetMatch = resolveCelestialTrigger({
    root: planetRoot,
    target: planetVisual,
    dataAttribute: 'data-planet-id',
    visualSelector: '.planet-thumbnail, .celestial-orb'
  });
  assert.equal(planetMatch.id, 'earth');
  assert.equal(planetMatch.origin, planetVisual);

  const starCard = { dataset: { starId: 'sirius' } };
  const starText = { closest: (selector) => selector.includes('[data-star-id]') ? starCard : null };
  const starRoot = { contains: (node) => node === starCard };
  const starMatch = resolveCelestialTrigger({
    root: starRoot,
    target: starText,
    dataAttribute: 'data-star-id',
    visualSelector: '.star-orb, .celestial-orb'
  });
  assert.equal(starMatch.id, 'sirius');
  assert.equal(starMatch.origin, starCard);
});

test('Phase 5.8.1 keeps whole planet and star cards keyboard actionable', async () => {
  const home = await source('../src/pages/home.js');
  const universe = await source('../src/pages/universe.js');
  const planetViewer = await source('../src/features/universe/planet-viewer.js');
  const starViewer = await source('../src/features/universe/star-viewer.js');
  assert.match(home, /card\.setAttribute\('role', 'button'\)/);
  assert.match(universe, /card\.setAttribute\('role', 'button'\)/);
  assert.match(planetViewer, /resolveCelestialTrigger/);
  assert.match(starViewer, /resolveCelestialTrigger/);
  assert.match(planetViewer, /Unable to open planet viewer/);
  assert.match(starViewer, /Unable to open star viewer/);
});

test('Phase 5.8.1 removes the split hero panel and strengthens visible rings/themes', async () => {
  const css = await source('../src/styles/phase581.css');
  const hero = await source('../src/features/home/hero-three-scene.js');
  assert.match(css, /one continuous scene/);
  assert.match(css, /background: transparent !important/);
  assert.match(css, /data-backdrop-theme="blackhole"/);
  assert.match(css, /data-backdrop-theme="solar"/);
  assert.match(css, /data-backdrop-theme="nebula"/);
  assert.match(hero, /opacity: 0\.96/);
  assert.match(hero, /degToRad\(53\)/);
});
