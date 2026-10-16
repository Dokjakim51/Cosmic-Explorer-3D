import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import test from 'node:test';

async function text(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

function normalize([x, y, z]) {
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Three.js Euler order XYZ: this is the transformed local +Y axis,
// which is the normal of Cosmic Explorer's XZ ring plane.
function transformedRingNormal(x, y, z) {
  const cx = Math.cos(x);
  const sx = Math.sin(x);
  const cy = Math.cos(y);
  const sy = Math.sin(y);
  const cz = Math.cos(z);
  const sz = Math.sin(z);
  return [
    -cy * sz,
    cx * cz - sx * sz * sy,
    sx * cz + cx * sz * sy
  ];
}

test('Phase 5.9.3 gives Saturn an open, visible initial ring projection', async () => {
  const planets = JSON.parse(await text('../src/data/planets.json'));
  const saturn = planets.find((planet) => planet.id === 'saturn');
  assert.ok(saturn, 'Saturn must exist in the planet catalog');

  const { initialPitch, initialYaw, initialRoll, axialTilt } = saturn.viewer;
  const ringNormal = normalize(transformedRingNormal(
    initialPitch,
    initialYaw,
    axialTilt + initialRoll
  ));
  const initialCameraDirection = normalize([0.06, 0.08, 6.10]);
  const projectedOpening = Math.abs(dot(ringNormal, initialCameraDirection));

  assert.ok(initialPitch >= 0.5, 'Saturn must start above the ring plane instead of nearly edge-on');
  assert.ok(projectedOpening > 0.52, `Projected ring opening should be clearly visible; received ${projectedOpening}`);
});

test('Phase 5.9.3 uses a dedicated two-sided Saturn ring system with real depth handling', async () => {
  const renderer = await text('../src/features/universe/planet-three-renderer.js');
  assert.match(renderer, /function createSaturnRingSystem/);
  assert.match(renderer, /THREE\.FrontSide/);
  assert.match(renderer, /THREE\.BackSide/);
  assert.match(renderer, /top\.position\.y = offset/);
  assert.match(renderer, /bottom\.position\.y = -offset/);
  assert.match(renderer, /customDepthMaterial/);
  assert.match(renderer, /alphaToCoverage: true/);
  assert.match(renderer, /depthTest: true/);
  assert.match(renderer, /createSaturnRingParticles/);
  assert.match(renderer, /createSaturnRingShadow/);
  assert.match(renderer, /rings_color\.png/);
  assert.match(renderer, /rings_alpha\.png/);
  assert.match(renderer, /getPresentationCameraDistance/);
  assert.match(renderer, /fitRingsInInitialView: true/);
});

test('Phase 5.9.3 applies Saturn pose with exactly three Euler components', async () => {
  const renderer = await text('../src/features/universe/planet-three-renderer.js');
  const match = renderer.match(/planetRoot\.rotation\.set\(([\s\S]*?)\);/);
  assert.ok(match, 'The planet root rotation assignment must exist');
  assert.match(match[1], /initialPitch/);
  assert.match(match[1], /initialYaw/);
  assert.match(match[1], /axialTilt/);
  assert.match(match[1], /initialRoll/);
  assert.equal((match[1].match(/initialYaw/g) || []).length, 1, 'Yaw must not accidentally occupy the roll component');
});

test('Phase 5.9.3 includes high-resolution Saturn surface and radial ring maps', async () => {
  const required = [
    ['../public/textures/planets/saturn/color.jpg', 900_000],
    ['../public/textures/planets/saturn/normal.png', 500_000],
    ['../public/textures/planets/saturn/bump.png', 150_000],
    ['../public/textures/planets/saturn/roughness.png', 75_000],
    ['../public/textures/planets/saturn/rings_color.png', 20_000],
    ['../public/textures/planets/saturn/rings_alpha.png', 5_000]
  ];

  for (const [path, minimumSize] of required) {
    const file = await stat(new URL(path, import.meta.url));
    assert.ok(file.size > minimumSize, `${path} must contain a substantive texture map`);
  }
});
