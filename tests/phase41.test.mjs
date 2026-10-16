import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Phase 4.1 adds mini-player visibility controls and keyboard toggle", async () => {
  const mini = await source("../src/components/layout/mini-player.js");
  const page = await source("../src/pages/music-space.js");
  const store = await source("../src/store/app-store.js");
  assert.match(store, /miniPlayerVisible/);
  assert.match(mini, /toggleMiniPlayerVisibility/);
  assert.match(mini, /event\.key.*m/si);
  assert.match(mini, /data-mini-action="hide"/);
  assert.match(page, /data-music-action="toggle-mini"/);
});

test("Phase 4.1 makes the upload shortcut functional and feature cards fully clickable", async () => {
  const page = await source("../src/pages/music-space.js");
  const cards = await source("../src/components/ui/status-card.js");
  assert.match(page, /data-music-action="choose"/);
  assert.match(page, /fileInput\.click\(\)/);
  assert.match(cards, /status-card--interactive/);
  assert.match(cards, /window\.location\.hash/);
});
