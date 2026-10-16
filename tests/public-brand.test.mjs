import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';

const read=(name)=>readFile(new URL(`../${name}`,import.meta.url),'utf8');

test('Cosmic Explorer is the name in metadata and package config',async()=>{
  const [html,pkg]=await Promise.all([read('index.html'),read('package.json')]);
  assert.match(html,/<title>Cosmic Explorer/);
  assert.equal(JSON.parse(pkg).name,'cosmic-explorer-3d');
  assert.doesNotMatch(html,/Michelle|Michelliverse/i);
});

test('README explains credits and public deployment',async()=>{
  const readme=await read('README.md');
  assert.match(readme,/CREDITS.md/);
  assert.match(readme,/npm run verify/);
  assert.match(readme,/netlify.toml/);
});
