import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { normalizeAppState } from '../src/store/app-store.js';
import { runProductionPreflight } from '../scripts/production-preflight.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');

async function waitForServer(url, attempts=40) {
  for(let i=0;i<attempts;i+=1){try{const response=await fetch(url);if(response.ok)return response;}catch{} await new Promise(r=>setTimeout(r,50));}
  throw new Error(`Server did not start at ${url}`);
}

test('Phase 9 normalizes corrupt global app state and removes invalid object references',()=>{
  const state=normalizeAppState({language:'xx',volume:99,musicRepeat:'forever',miniPlayerMode:'giant',miniPlayerPosition:{x:'bad',y:42},lastVisitedRoute:'/secret',favorites:['planet:earth','planet:earth','planet:pluto','gallery:pulsar'],visitedObjects:'bad'});
  assert.ok(['es','en'].includes(state.language));
  assert.equal(state.volume,1);
  assert.equal(state.musicRepeat,'off');
  assert.equal(state.miniPlayerMode,'bar');
  assert.deepEqual(state.miniPlayerPosition,{x:null,y:42});
  assert.equal(state.lastVisitedRoute,'/home');
  assert.deepEqual(state.favorites,['planet:earth','gallery:pulsar']);
  assert.deepEqual(state.visitedObjects,[]);
});

test('Phase 9 route table is lazy and router protects asynchronous navigation races',async()=>{
  const routes=await readFile(resolve(root,'src/router/routes.js'),'utf8');
  const router=await readFile(resolve(root,'src/router/router.js'),'utf8');
  assert.match(routes,/lazyPage/);
  assert.match(routes,/import\('\.\.\/pages\/home\.js'\)/);
  assert.doesNotMatch(routes,/^import \{ renderHomePage/m);
  assert.match(router,/renderToken/);
  assert.match(router,/token !== renderToken/);
  assert.match(router,/route-status--error/);
});

test('Phase 9 production build fails safely unless Three.js and output assets validate',async()=>{
  const build=await readFile(resolve(root,'scripts/build.mjs'),'utf8');
  assert.match(build,/requireThree:true/);
  assert.match(build,/validateDist/);
  assert.match(build,/await rm\(output,\{recursive:true,force:true\}\)/);
  assert.match(build,/collectThreeAddonFiles/);
});

test('Netlify production configuration builds dist without masking missing assets',async()=>{
  const config=await readFile(resolve(root,'netlify.toml'),'utf8');
  assert.match(config,/command = "npm run build"/);
  assert.match(config,/publish = "dist"/);
  assert.match(config,/NODE_VERSION = "20"/);
  assert.doesNotMatch(config,/\/\*\s+\/index\.html\s+200/);
});

test('Kilonova MP3 is no longer binary-identical to Supernova MP3',async()=>{
  const files=['gallery-neutron-star-merger-kilonova/sonification.mp3','gallery-supernova/sonification.mp3'];
  const hashes=[];
  for(const file of files) hashes.push(createHash('sha256').update(await readFile(resolve(root,'public/audio/ambient',file))).digest('hex'));
  assert.notEqual(hashes[0],hashes[1]);
});

test('Phase 9 source preflight verifies the complete 234-file ambient catalog',async()=>{
  const result=await runProductionPreflight({root,requireThree:false});
  assert.equal(result.ok,true,JSON.stringify(result.errors));
  assert.equal(result.ambientAudioFiles,234);
  assert.equal(result.errors.length,0);
});

test('Development server returns audio MIME, byte ranges, HEAD, and real missing-asset 404',async(t)=>{
  const port=5200+Math.floor(Math.random()*300);
  const child=spawn(process.execPath,['scripts/dev-server.mjs','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
  t.after(()=>child.kill('SIGTERM'));
  const base=`http://127.0.0.1:${port}`;
  await waitForServer(`${base}/index.html`);
  const audioPath='/public/audio/ambient/planet-earth/music.mp3';
  const head=await fetch(`${base}${audioPath}`,{method:'HEAD'});
  assert.equal(head.status,200);
  assert.match(head.headers.get('content-type')??'',/audio\/mpeg/);
  const range=await fetch(`${base}${audioPath}`,{headers:{Range:'bytes=0-31'}});
  assert.equal(range.status,206);
  assert.match(range.headers.get('content-range')??'',/^bytes 0-31\//);
  assert.equal((await range.arrayBuffer()).byteLength,32);
  const missing=await fetch(`${base}/public/images/definitely-missing.png`);
  assert.equal(missing.status,404);
  assert.doesNotMatch(await missing.text(),/<!doctype html>/i);
});

test('Phase 9 preserves visible keyboard focus in Appearance and Cosmic Defender',async()=>{
  const appearance=await readFile(resolve(root,'src/styles/phase8-appearance.css'),'utf8');
  const game=await readFile(resolve(root,'src/styles/phase6-game.css'),'utf8');
  assert.doesNotMatch(appearance,/data-focus-visible="false"[^\n]*outline\s*:\s*none/);
  assert.match(game,/\.game-canvas:focus-visible/);
  assert.match(game,/outline:\s*3px/);
});

test('Cosmic Explorer repository documents its installation and deployment limits', async()=>{
  const [readme,issues,checklist,change]=await Promise.all(['README.md','KNOWN_ISSUES.md','DEPLOYMENT_CHECKLIST.md','CHANGELOG.md'].map(file=>readFile(resolve(root,file),'utf8')));
  assert.match(readme,/Cosmic Explorer/);
  assert.match(readme,/npm ci/);
  assert.match(readme,/npm run build/);
  assert.match(issues,/no se ha verificado una URL de Netlify/i);
  assert.match(checklist,/npm run verify/);
  assert.match(change,/1\.0\.0/);
});
