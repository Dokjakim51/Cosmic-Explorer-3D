import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) { return readFile(new URL(path, import.meta.url), "utf8"); }

test("Phase 4.6 adds track identity and compact control layout", async () => {
  const page = await source("../src/pages/music-space.js");
  const css = await source("../src/styles/phase45.css");
  assert.match(page, /data-music-control-title/);
  assert.match(page, /data-music-control-artist/);
  assert.match(css, /music-control-track/);
  assert.match(css, /width: min\(100%, 38rem\)/);
});

test("Phase 4.6 supports an external Document Picture-in-Picture player", async () => {
  const mini = await source("../src/components/layout/mini-player.js");
  const page = await source("../src/pages/music-space.js");
  assert.match(mini, /documentPictureInPicture/);
  assert.match(mini, /requestWindow/);
  assert.match(mini, /cosmicExplorerExternalPlayer/);
  assert.match(page, /data-music-action="external-player"/);
});
