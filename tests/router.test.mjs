import assert from 'node:assert/strict';
import test from 'node:test';
import { getRoutePath, normalizeRoute } from '../src/router/router.js';

test('normalizeRoute returns home for empty hashes', () => {
  assert.equal(normalizeRoute(''), '/home');
  assert.equal(normalizeRoute('#/'), '/home');
});

test('normalizeRoute creates stable hash paths', () => {
  assert.equal(normalizeRoute('#favorites'), '/favorites');
  assert.equal(normalizeRoute('#/universe/'), '/universe');
});


test('getRoutePath separates the route from celestial query parameters', () => {
  assert.equal(normalizeRoute('#/universe?planet=saturn'), '/universe?planet=saturn');
  assert.equal(getRoutePath('/universe?planet=saturn'), '/universe');
  assert.equal(normalizeRoute('#/universe?star=vega'), '/universe?star=vega');
  assert.equal(getRoutePath('/universe?star=vega'), '/universe');
});
