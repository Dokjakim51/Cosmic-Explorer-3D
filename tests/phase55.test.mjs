import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Phase 5.5 adds persistent appearance customization", async () => {
  const store = await source("../src/store/app-store.js");
  const header = await source("../src/components/layout/header.js");
  const customizer = await source("../src/components/layout/theme-customizer.js");
  const css = await source("../src/styles/phase55.css");
  assert.match(store, /backdropTheme/);
  assert.match(store, /accentTheme/);
  assert.match(header, /createThemeCustomizer/);
  assert.match(customizer, /data-theme-backdrop/);
  assert.match(customizer, /data-theme-accent/);
  assert.match(css, /data-backdrop-theme="blackhole"/);
  assert.match(css, /data-accent-theme="gold"/);
});

test("Phase 5.5 applies premium redesign hooks to Universe and Gallery", async () => {
  const universe = await source("../src/pages/universe.js");
  const gallery = await source("../src/pages/gallery.js");
  const css = await source("../src/styles/phase55.css");
  assert.match(universe, /universe-page--phase55/);
  assert.match(universe, /planet-thumbnail-aura/);
  assert.match(gallery, /gallery-phase55/);
  assert.match(gallery, /gallery-viewer-canvas/);
  assert.match(css, /gallery-phase55 \.gallery-card/);
  assert.match(css, /universe-page--phase55 \.celestial-card/);
});
