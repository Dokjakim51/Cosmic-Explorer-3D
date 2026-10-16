import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(path, import.meta.url), "utf8"); }

test("Phase 4.5 supports bottom bar and draggable floating player modes", async () => {
  const mini = await source("../src/components/layout/mini-player.js");
  const store = await source("../src/store/app-store.js");
  assert.match(store, /miniPlayerMode/);
  assert.match(store, /miniPlayerPosition/);
  assert.match(mini, /floating-player/);
  assert.match(mini, /data-floating-handle/);
  assert.match(mini, /pointermove/);
  assert.match(mini, /setMiniPlayerMode/);
});

test("Phase 4.5 provides synchronized cosmic visualizer choices", async () => {
  const visualizer = await source("../src/features/music/music-visualizer.js");
  const page = await source("../src/pages/music-space.js");
  const styles = await source("../src/styles/phase45.css");
  for (const name of ["bars", "orbit", "wave", "black-hole", "constellation"]) {
    assert.match(visualizer, new RegExp(name.replace("-", "\\-")));
    assert.match(page, new RegExp(`value=\"${name}\"`));
  }
  assert.match(visualizer, /musicVisualizer/);
  assert.match(styles, /floating-player-visualizer/);
  assert.match(styles, /mini-player-visualizer/);
});
