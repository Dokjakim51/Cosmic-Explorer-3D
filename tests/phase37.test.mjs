import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { catalogEs } from '../src/i18n/catalog-es.js';
import { localizeCelestial, t } from '../src/i18n/i18n.js';
import { translations } from '../src/i18n/translations.js';

async function source(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('English and Spanish interface dictionaries contain the same keys', () => {
  const english = Object.keys(translations.en).sort();
  const spanish = Object.keys(translations.es).sort();
  assert.deepEqual(spanish, english);
});

test('translation helper replaces variables and plural forms', () => {
  assert.equal(t('universe.worldCount', { count: 1 }, 'en'), '1 world');
  assert.equal(t('universe.worldCount', { count: 8 }, 'es'), '8 mundos');
  assert.equal(t('footer.copyright', { year: 2026 }, 'es'), '© 2026 Cosmic Explorer. Todos los derechos reservados.');
});

test('all planets and stars have complete Spanish catalog translations', () => {
  const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
  const stars = ['sun', 'sirius', 'vega', 'betelgeuse', 'rigel', 'polaris', 'proxima-centauri', 'antares'];
  for (const id of planets) {
    const item = catalogEs.planets[id];
    assert.ok(item?.name);
    assert.ok(item?.shortDescription);
    assert.equal(item?.facts?.features?.length, 3);
    assert.equal(item?.facts?.curiosities?.length, 3);
  }
  for (const id of stars) {
    const item = catalogEs.stars[id];
    assert.ok(item?.name);
    assert.ok(item?.shortDescription);
    assert.equal(item?.facts?.features?.length, 3);
    assert.equal(item?.facts?.curiosities?.length, 3);
  }
});

test('celestial localization preserves technical renderer fields', () => {
  const earth = {
    id: 'earth',
    name: 'Earth',
    type: 'Terrestrial planet',
    shortDescription: 'Our home.',
    accentColor: '#38bdf8',
    viewer: { styleIndex: 2 },
    facts: { moons: 1 }
  };
  const localized = localizeCelestial(earth, 'planet', 'es');
  assert.equal(localized.name, 'Tierra');
  assert.equal(localized.viewer.styleIndex, 2);
  assert.equal(localized.accentColor, '#38bdf8');
  assert.ok(localized.searchAliases.includes('Earth'));
  assert.ok(localized.searchAliases.includes('Tierra'));
});

test('Phase 3.7 includes a persistent language switch and rerenders routes', async () => {
  const header = await source('../src/components/layout/header.js');
  const router = await source('../src/router/router.js');
  const store = await source('../src/store/app-store.js');
  const styles = await source('../src/styles/phase37.css');
  assert.match(header, /language-switcher/);
  assert.match(header, /toggleLanguage/);
  assert.match(router, /cosmic-explorer:language-change/);
  assert.match(store, /language:\s*preferredLanguage/);
  assert.match(styles, /Restore the Phase 3\.5 Home hero planet appearance/);
});
