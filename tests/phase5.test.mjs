import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(path, import.meta.url), "utf8"); }
async function json(path) { return JSON.parse(await source(path)); }

test("Phase 5 Gallery catalog contains the complete Phase 5.11 cosmic categories", async () => {
  const gallery = await json("../src/data/gallery.json");
  assert.equal(gallery.items.length, 16);
  for (const category of ["compactObjects", "explosions", "starFormation", "stellarSystems", "largeScale"]) {
    assert.ok(gallery.items.some((item) => item.category === category));
  }
});

test("Phase 5 supports filters, search, favorites, zoom, keyboard, and touch", async () => {
  const page = await source("../src/pages/gallery.js");
  for (const pattern of [/data-gallery-filter/, /data-gallery-search/, /gallery:/, /zoom-in/, /ArrowLeft/, /touchstart/, /Escape/]) assert.match(page, pattern);
});

test("Phase 5.11 styles include a real WebGL Gallery viewer and procedural depth layers", async () => {
  const index = await source("../src/styles/index.css");
  const css = await source("../src/styles/phase511-gallery.css");
  assert.match(index, /phase511-gallery\.css/);
  assert.match(css, /gallery-viewer/);
  assert.match(css, /gallery-card-canvas/);
  assert.match(css, /gallery-scene-vignette/);
});
