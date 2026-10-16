import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path) {
  return readFile(new URL(path, import.meta.url), "utf8");
}

test("Gallery cards now attach each catalog item to a real Three.js scene host", async () => {
  const page = await source("../src/pages/gallery.js");
  assert.match(page, /gallery-scene-host/);
  assert.match(page, /data-gallery-scene="\$\{item\.scene\}"/);
  assert.match(page, /gallery-scene-fallback/);
  assert.match(page, /createGalleryPreviewRenderer/);
  assert.doesNotMatch(page, /gallery-visual gallery-visual--\$\{item\.visual\}/);
});

test("Phase 5.1 keeps its historical visible art definitions available", async () => {
  const css = await source("../src/styles/phase51.css");
  for (const id of [
    "violet-nebula", "ringed-dream", "spiral-dreams", "blue-supergiant",
    "silent-moon", "cosmic-imagination", "solar-flare", "emerald-nebula",
    "black-hole-garden", "crimson-world", "stellar-river", "celestial-gateway"
  ]) assert.match(css, new RegExp(`gallery-visual--${id}`));
});
