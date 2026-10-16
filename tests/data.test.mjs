import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
}

test('planet catalog contains the eight ordered Solar System planets', async () => {
  const planets = await readJson('../src/data/planets.json');
  assert.equal(planets.length, 8);
  assert.deepEqual(planets.map((planet) => planet.orderFromSun), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set(planets.map((planet) => planet.id)).size, planets.length);
});

test('every planet has the information and viewer settings required by Phase 2', async () => {
  const planets = await readJson('../src/data/planets.json');
  const requiredFacts = [
    'distanceFromSun', 'diameter', 'mass', 'gravity', 'temperature', 'dayLength',
    'yearLength', 'moons', 'composition', 'features', 'curiosities', 'discovery', 'earthComparison'
  ];

  for (const planet of planets) {
    assert.equal(planet.available, true, `${planet.name} should be available`);
    assert.equal(typeof planet.viewer.styleIndex, 'number');
    assert.equal(typeof planet.viewer.rotationSpeed, 'number');
    assert.equal(typeof planet.viewer.cameraDistance, 'number');
    assert.equal(typeof planet.source.url, 'string');
    assert.match(planet.source.url, /^https:\/\/science\.nasa\.gov\//);
    for (const key of requiredFacts) assert.ok(Object.hasOwn(planet.facts, key), `${planet.name} is missing facts.${key}`);
    assert.ok(planet.facts.features.length >= 3);
    assert.ok(planet.facts.curiosities.length >= 3);
  }
});

test('star catalog contains eight complete interactive stars', async () => {
  const stars = await readJson('../src/data/stars.json');
  const requiredFacts = [
    'distance', 'mass', 'radius', 'temperature', 'luminosity', 'color', 'age', 'stage',
    'composition', 'features', 'curiosities', 'sunComparison', 'systemNote'
  ];

  assert.equal(stars.length, 8);
  assert.equal(new Set(stars.map((star) => star.id)).size, stars.length);

  for (const star of stars) {
    assert.equal(star.available, true, `${star.name} should be interactive`);
    assert.equal(typeof star.constellation, 'string');
    assert.equal(typeof star.type, 'string');
    assert.equal(typeof star.spectralType, 'string');
    assert.equal(typeof star.viewer.pulseIntensity, 'number');
    assert.equal(typeof star.viewer.pulseDuration, 'number');
    assert.match(star.source.url, /^https:\/\/science\.nasa\.gov\//);
    for (const key of requiredFacts) assert.ok(Object.hasOwn(star.facts, key), `${star.name} is missing facts.${key}`);
    assert.ok(star.facts.features.length >= 3);
    assert.ok(star.facts.curiosities.length >= 3);
  }
});
