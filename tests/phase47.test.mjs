import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(path, import.meta.url), "utf8"); }

test("Phase 4.7 external player falls back to a regular popup", async () => {
  const mini = await source("../src/components/layout/mini-player.js");
  assert.match(mini, /documentPictureInPicture/);
  assert.match(mini, /window\.open/);
  assert.match(mini, /externalPopupBlocked/);
});

test("Phase 4.7 improves constellation and black-hole rendering", async () => {
  const visualizer = await source("../src/features/music/music-visualizer.js");
  assert.match(visualizer, /maxDistance/);
  assert.match(visualizer, /createLinearGradient\(points\[i\]\.x/);
  assert.match(visualizer, /globalCompositeOperation = 'lighter'/);
  assert.match(visualizer, /radius \* 3\.2/);
});

test("hero sphere is displayed only for planetary orbit mode", async () => {
  const page = await source("../src/pages/music-space.js");
  const css = await source("../src/styles/phase45.css");
  assert.match(page, /music-cover-orbit'\)\.hidden/);
  assert.match(page, /!== 'orbit'/);
  assert.match(css, /music-cover-orbit\[hidden\]/);
});
