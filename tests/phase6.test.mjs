import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Phase 6 uses a playable isolated canvas engine and data-driven level definitions', async () => {
  const [page, engine, levels, styles] = await Promise.all([
    read('src/pages/cosmic-defender.js'),
    read('src/features/game/cosmic-defender-engine.js'),
    read('src/features/game/cosmic-defender-levels.js'),
    read('src/styles/phase6-game.css')
  ]);
  assert.match(page, /new CosmicDefenderEngine/);
  assert.match(page, /data-canvas/);
  assert.match(engine, /requestAnimationFrame/);
  assert.match(engine, /spawnWave\(waveNumber\)/);
  assert.match(engine, /makeFormationPositions/);
  assert.match(levels, /LEVEL_DEFINITIONS/);
  assert.match(styles, /touch-action:\s*none/);
});

test('Phase 6.3 includes eight planetary families, five archetypes each, and unique bosses', async () => {
  const levels = await read('src/features/game/cosmic-defender-levels.js');
  for (const id of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']) {
    assert.match(levels, new RegExp(`${id}:\\s*\\{`));
  }
  for (const role of ['basic','fast','tank','shooter','special']) {
    assert.ok((levels.match(new RegExp(`${role}:\\s*\\{`, 'g')) || []).length >= 8, `${role} must exist in every level`);
  }
  for (const boss of ['Solar Sentinel','Cloud Empress','Orbital Warden','Dust Colossus','Red Eye Titan','Ring Sovereign','Axial Phantom','Dark Wind']) {
    assert.match(levels, new RegExp(boss));
  }
  for (const familyShape of ['mercury-drone','venus-mite','earth-cube','mars-trooper','jupiter-cell','saturn-sentry','uranus-prism','neptune-blade']) {
    assert.match(levels, new RegExp(familyShape));
  }
});

test('Phase 6.3 waves use varied formations, events, movements, and weapons', async () => {
  const [levels, engine] = await Promise.all([
    read('src/features/game/cosmic-defender-levels.js'),
    read('src/features/game/cosmic-defender-engine.js')
  ]);
  for (const formation of ['split-flanks','spiral','orbit-pairs','ambush','double-ring','tilted-ring','x-strike']) assert.match(levels, new RegExp(formation));
  for (const weapon of ['corrosive','laser','electric','orbit-shot','freeze','gust','split']) assert.match(levels, new RegExp(`weapon:'${weapon}'|weapons:\\[[^\\]]*'${weapon}'`));
  for (const event of ['meteor','cloud','dust','vortex','ring-debris','freeze-zone','dark-wind']) assert.match(engine, new RegExp(event));
  assert.match(engine, /updateEnemyMovement/);
  assert.match(engine, /fireEnemyWeapon/);
});

test('Phase 6.3 persists separate Normal and Hard progress with unlocking', async () => {
  const [profile, page, levels] = await Promise.all([
    read('src/features/game/player-profile.js'),
    read('src/pages/cosmic-defender.js'),
    read('src/features/game/cosmic-defender-levels.js')
  ]);
  assert.match(profile, /normal:\s*blankDifficulty\(true\)/);
  assert.match(profile, /hard:\s*blankDifficulty\(false\)/);
  assert.match(profile, /level\.hard\.unlocked = true/);
  assert.match(profile, /recordGameResult/);
  assert.match(page, /data-difficulty="normal"/);
  assert.match(page, /data-difficulty="hard"/);
  assert.match(page, /isDifficultyUnlocked/);
  assert.match(levels, /scoreMultiplier:\s*1\.5/);
});

test('Phase 6 preserves keyboard and mobile controls', async () => {
  const page = await read('src/pages/cosmic-defender.js');
  const engine = await read('src/features/game/cosmic-defender-engine.js');
  assert.match(engine, /ArrowLeft/);
  assert.match(engine, /ArrowUp/);
  assert.match(engine, /KeyW/);
  assert.match(engine, /Space/);
  assert.match(engine, /KeyP/);
  assert.match(engine, /WAVE_COUNTDOWN/);
  assert.match(page, /data-joystick/);
  assert.match(page, /data-fire/);
  assert.match(page, /pointerdown/);
});


test('Phase 6.4 includes procedural planet music, arcade SFX, and saved audio controls', async () => {
  const [audio, page, engine, styles] = await Promise.all([
    read('src/features/game/cosmic-defender-audio.js'),
    read('src/pages/cosmic-defender.js'),
    read('src/features/game/cosmic-defender-engine.js'),
    read('src/styles/phase6-game.css')
  ]);
  for (const id of ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune']) {
    assert.match(audio, new RegExp(`${id}:\\s*\\{`));
  }
  for (const eventName of ['player-shot','enemy-shot','enemy-explode','boss-explode','player-hit','wave-complete','boss-intro','level-complete','game-over']) {
    assert.match(audio, new RegExp(`case '${eventName}'|EVENT_VIBRATION[^]*'${eventName}'`));
  }
  assert.match(audio, /AudioContext/);
  assert.match(audio, /createGain/);
  assert.match(audio, /localStorage/);
  assert.match(page, /data-audio-panel/);
  assert.match(page, /data-audio-volume="master"/);
  assert.match(page, /musicPlayer\.pause/);
  assert.match(engine, /onAudio/);
  assert.match(engine, /emitAudio\('player-shot'\)/);
  assert.match(styles, /\.game-audio-panel/);
});
