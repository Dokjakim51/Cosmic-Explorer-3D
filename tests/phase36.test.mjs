import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("phase 3.6 stylesheet is imported and adds hero realism layers", async () => {
  const indexCss = await source("../src/styles/index.css");
  const phase36 = await source("../src/styles/phase36.css");
  assert.match(indexCss, /phase36\.css/);
  assert.match(phase36, /hero-planet::before/);
  assert.match(phase36, /planet-clouds/);
  assert.match(phase36, /planet-stage-glow/);
  assert.match(phase36, /star-viewer-overlay\[data-star=/);
});

test("planet renderer reset uses per-planet defaults and richer lighting terms", async () => {
  const renderer = await source("../src/features/universe/webgl-planet-renderer.js");
  assert.match(renderer, /resetView\(\);/);
  assert.match(renderer, /fresnel/);
  assert.match(renderer, /oceanSpecular/);
  assert.match(renderer, /atmosphericScatter/);
  assert.match(renderer, /sunScatter/);
});

test("home hero planet markup includes additional realism layers", async () => {
  const home = await source("../src/pages/home.js");
  assert.match(home, /planet-surface--three/);
  assert.match(home, /planet-clouds/);
  assert.match(home, /planet-haze/);
});
