import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Phase 5.6 adds RGB and saved custom accent support", async () => {
  const customizer = await source("../src/components/layout/theme-customizer.js");
  const app = await source("../src/app.js");
  const store = await source("../src/store/app-store.js");
  const translations = await source("../src/i18n/translations.js");
  assert.match(store, /customAccentColor/);
  assert.match(customizer, /'rgb'/);
  assert.match(customizer, /data-custom-color/);
  assert.match(customizer, /apply-custom-accent/);
  assert.match(app, /startRgbAccentAnimation/);
  assert.match(app, /buildAccentPalette/);
  assert.match(translations, /theme\.accent\.rgb/);
  assert.match(translations, /theme\.customApply/);
});

test("Phase 5.6 marks the major visual overhaul surfaces", async () => {
  const home = await source("../src/pages/home.js");
  const universe = await source("../src/pages/universe.js");
  const gallery = await source("../src/pages/gallery.js");
  const css = await source("../src/styles/phase56.css");
  assert.match(home, /home-page--phase56/);
  assert.match(universe, /universe-page--phase56/);
  assert.match(gallery, /gallery-phase56/);
  assert.match(css, /planet-thumbnail--earth/);
  assert.match(css, /gallery-phase56 \.gallery-viewer-stage::before/);
  assert.match(css, /planet-viewer-shell/);
});
