import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { answerKiraQuestion, getKiraSuggestions } from '../src/features/kira/kira-knowledge.js';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const context = {
  currentSection: 'planets',
  currentObject: { id: 'jupiter', kind: 'planet', section: 'planets', name: 'Júpiter' },
  previousObject: { id: 'mars', kind: 'planet', section: 'planets', name: 'Marte' },
  game: { active: false, levelId: 'mercury', difficulty: 'normal' }
};

test('Phase 7 mounts one global local assistant outside routed pages', async () => {
  const [app, assistant, contextSource, styles] = await Promise.all([
    read('src/app.js'),
    read('src/features/kira/kira-assistant.js'),
    read('src/features/kira/kira-context.js'),
    read('src/styles/phase7-kira.css')
  ]);
  assert.match(app, /createKiraAssistant/);
  assert.match(assistant, /data-kira-root/);
  assert.match(assistant, /sessionStorage/);
  assert.match(contextSource, /cosmic-explorer:kira-object/);
  assert.match(contextSource, /cosmic-explorer:route-change/);
  assert.match(styles, /is-game-active/);
  assert.doesNotMatch(assistant, /fetch\(|XMLHttpRequest|WebSocket/);
});

test('Kira answers local contextual planet facts in both languages', () => {
  const spanish = answerKiraQuestion('¿Cuál es su temperatura?', context, 'es');
  const english = answerKiraQuestion('How many moons does it have?', context, 'en');
  assert.match(spanish.text, /Júpiter/);
  assert.match(spanish.text, /−110|110/);
  assert.match(english.text, /Jupiter/);
  assert.match(english.text, /moon/i);
});

test('Kira compares the current and previous local objects', () => {
  const answer = answerKiraQuestion('¿Cuál es más grande?', context, 'es');
  assert.match(answer.text, /Júpiter/);
  assert.match(answer.text, /Marte/);
  assert.match(answer.text, /más grande/);
});

test('Kira is honest about unknown questions and provides contextual suggestions', () => {
  const answer = answerKiraQuestion('¿Cuál es su comida favorita?', context, 'es');
  assert.match(answer.text, /no pude identificar completamente/i);
  const suggestions = getKiraSuggestions(context, 'es');
  assert.ok(suggestions.some((item) => /temperatura/i.test(item)));
  assert.ok(suggestions.some((item) => /Compáralo/i.test(item)));
});

test('Kira reads explicit data attributes for viewers and receives game context events', async () => {
  const [contextSource, game] = await Promise.all([
    read('src/features/kira/kira-context.js'),
    read('src/pages/cosmic-defender.js')
  ]);
  assert.match(contextSource, /data-planet/);
  assert.match(contextSource, /data-star/);
  assert.match(contextSource, /data-gallery-id/);
  assert.match(contextSource, /MutationObserver/);
  assert.match(game, /emitKiraGameContext/);
});

test('Kira recognizes named objects from Home without requiring an open viewer', () => {
  const homeContext = {
    currentSection: 'home', currentCategory: null, currentObject: null, previousObject: null,
    lastMentionedObjectIds: [], lastComparisonPair: [], lastComparisonProperty: null
  };
  assert.match(answerKiraQuestion('Háblame de la Tierra', homeContext, 'es').text, /Tierra/);
  assert.match(answerKiraQuestion('Cuéntame de Júpiter', homeContext, 'es').text, /Júpiter/);
  assert.match(answerKiraQuestion('Explícame qué es un quazar', homeContext, 'es').text, /Cuásar/);
  assert.match(answerKiraQuestion('Tell me about Mars', homeContext, 'en').text, /Mars/);
});

test('Kira answers general local rankings', () => {
  const homeContext = { currentSection: 'home', currentObject: null, previousObject: null, lastComparisonPair: [], lastMentionedObjectIds: [] };
  assert.match(answerKiraQuestion('¿Cuál es el planeta más grande?', homeContext, 'es').text, /Júpiter/);
  assert.match(answerKiraQuestion('¿Cuál es el planeta más caliente?', homeContext, 'es').text, /Venus/);
  assert.match(answerKiraQuestion('Which is the closest star to Earth?', homeContext, 'en').text, /Proxima Centauri/);
});

test('Kira maintains the last comparison pair through follow-up questions', () => {
  let memoryContext = {
    currentSection: 'home', currentObject: null, previousObject: null,
    lastMentionedObjectIds: [], lastComparisonPair: [], lastComparisonProperty: null
  };
  for (const question of ['Háblame de Venus', 'Compáralo con la Tierra']) {
    const response = answerKiraQuestion(question, memoryContext, 'es');
    if (response.memoryPatch) memoryContext = { ...memoryContext, ...response.memoryPatch };
  }
  const hotter = answerKiraQuestion('¿Cuál es más caliente?', memoryContext, 'es');
  assert.match(hotter.text, /Venus/);
  assert.match(hotter.text, /449/);
  memoryContext = { ...memoryContext, ...hotter.memoryPatch };
  const larger = answerKiraQuestion('¿Y cuál es más grande?', memoryContext, 'es');
  assert.match(larger.text, /Tierra/);
  assert.match(larger.text, /652/);
  memoryContext = { ...memoryContext, ...larger.memoryPatch };
  const farther = answerKiraQuestion('¿Cuál está más lejos del Sol?', memoryContext, 'es');
  assert.match(farther.text, /41\.400\.000|41,400,000/);
});

test('Kira explains variable Earth distances and travel assumptions', () => {
  let memoryContext = {
    currentSection: 'home', currentObject: null, previousObject: null,
    lastMentionedObjectIds: [], lastComparisonPair: [], lastComparisonProperty: null
  };
  const distance = answerKiraQuestion('¿A qué distancia está Marte de la Tierra?', memoryContext, 'es');
  assert.match(distance.text, /cambia constantemente/i);
  assert.match(distance.text, /54\.600\.000|54,600,000/);
  memoryContext = { ...memoryContext, ...distance.memoryPatch };
  const travel = answerKiraQuestion('¿Cuánto tardaría la luz?', memoryContext, 'es');
  assert.match(travel.text, /velocidad de la luz/i);
  assert.match(travel.text, /estimación/i);
});

test('Every tested Kira message produces a controlled non-empty response', () => {
  const homeContext = { currentSection: 'home', currentObject: null, previousObject: null, lastComparisonPair: [], lastMentionedObjectIds: [] };
  const questions = ['', 'blablabla imposible', '¿Cuál es más grande?', '¿Qué estoy observando?', '¿Qué objeto vi anteriormente?'];
  for (const question of questions) {
    const response = answerKiraQuestion(question, homeContext, 'es');
    assert.equal(typeof response.text, 'string');
    assert.ok(response.text.trim().length > 0);
  }
});

test('Kira global layer stays above detailed viewers and context uses structured attributes', async () => {
  const [assistant, contextSource, styles, gallery] = await Promise.all([
    read('src/features/kira/kira-assistant.js'),
    read('src/features/kira/kira-context.js'),
    read('src/styles/phase7-kira.css'),
    read('src/pages/gallery.js')
  ]);
  assert.match(assistant, /data-kira-global-layer/);
  assert.match(styles, /2147483000/);
  assert.match(contextSource, /data-planet/);
  assert.match(contextSource, /data-star/);
  assert.match(contextSource, /data-gallery-id/);
  assert.match(contextSource, /lastComparisonPair/);
  assert.match(gallery, /emitKiraObjectContext/);
});

test('Phase 7.2 gives every planet, star, and Gallery object a local description', async () => {
  const { getKiraKnowledgeCoverage } = await import('../src/features/kira/kira-knowledge.js');
  const coverage = getKiraKnowledgeCoverage('es');
  assert.equal(coverage.planets.length, 8);
  assert.equal(coverage.stars.length, 8);
  assert.equal(coverage.gallery.length, 16);
  assert.ok([...coverage.planets, ...coverage.stars, ...coverage.gallery].every((item) => item.hasDescription));
});

test('Kira describes Gallery phenomena naturally in Spanish and English', () => {
  const blank = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[] };
  const questions = [
    ['¿Qué es un púlsar?', /estrella de neutrones/i, 'es'],
    ['¿Qué es un magnetar?', /campo magnético/i, 'es'],
    ['¿Qué es un cuásar?', /galaxia activa|agujero negro supermasivo/i, 'es'],
    ['Explícame Gamma-Ray Burst', /rayos gamma/i, 'es'],
    ['What is a blazar?', /relativistic jet/i, 'en']
  ];
  for (const [question, pattern, language] of questions) assert.match(answerKiraQuestion(question, blank, language).text, pattern);
});

test('Kira answers nearest-known category questions from static local astronomy data', () => {
  const blank = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastAnswerContext:null };
  assert.match(answerKiraQuestion('¿Cuál es el agujero negro más cercano a la Tierra?', blank, 'es').text, /Gaia BH1/i);
  assert.match(answerKiraQuestion('¿Cuál es el púlsar más cercano?', blank, 'es').text, /PSR J0108/i);
  assert.match(answerKiraQuestion('¿Cuál es el magnetar más cercano?', blank, 'es').text, /Swift J1822/i);
  assert.match(answerKiraQuestion('¿Cuál es el cuásar más cercano?', blank, 'es').text, /Markarian 231/i);
  assert.match(answerKiraQuestion('What is the nearest known black hole?', blank, 'en').text, /Gaia BH1/i);
});

test('Kira remembers distance, description, and temperature across incomplete follow-ups', () => {
  let memory = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastCategory:null, lastAnswerContext:null };
  const run = (question) => {
    const response = answerKiraQuestion(question, memory, 'es');
    memory = { ...memory, ...(response.memoryPatch || {}) };
    return response.text;
  };
  assert.match(run('¿A qué distancia está el Sol de la Tierra?'), /149\.600\.000|149,600,000/);
  assert.match(run('¿Y el agujero negro más cercano?'), /Gaia BH1/);
  assert.match(run('¿Y el púlsar?'), /PSR J0108/);
  assert.match(run('¿Cuánto tardaría la luz?'), /velocidad de la luz/i);

  memory = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastCategory:null, lastAnswerContext:null };
  assert.match(run('¿Cuál es la temperatura de Venus?'), /464/);
  assert.match(run('¿Y Marte?'), /-65|−65/);
  assert.match(run('¿Y la Tierra?'), /15/);

  memory = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastCategory:null, lastAnswerContext:null };
  assert.match(run('¿Qué es un magnetar?'), /estrella de neutrones/i);
  assert.match(run('¿Y un púlsar?'), /far[oó]|pulsos/i);
  assert.match(run('¿Y un cuásar?'), /galaxia activa/i);
});

test('Kira widget supports persistent pointer dragging and position reset', async () => {
  const [assistant, styles, contextSource] = await Promise.all([
    read('src/features/kira/kira-assistant.js'),
    read('src/styles/phase7-kira.css'),
    read('src/features/kira/kira-context.js')
  ]);
  assert.match(assistant, /DRAG_THRESHOLD = 6/);
  assert.match(assistant, /pointerdown/);
  assert.match(assistant, /pointermove/);
  assert.match(assistant, /setPointerCapture/);
  assert.match(assistant, /localStorage/);
  assert.match(assistant, /data-kira-reset-position/);
  assert.match(assistant, /launcherPosition/);
  assert.match(assistant, /panelPosition/);
  assert.match(styles, /touch-action: none/);
  assert.match(styles, /cursor: grab/);
  assert.match(contextSource, /lastAnswerContext/);
  assert.match(contextSource, /lastProperty/);
});


test('Phase 7.3 answers naturally without exposing Kira internal storage', () => {
  const blank = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastCategory:null, lastAnswerContext:null };
  const answers = [
    answerKiraQuestion('¿Cuál es la temperatura de Venus?', blank, 'es').text,
    answerKiraQuestion('¿Cuál es el agujero negro más cercano?', blank, 'es').text,
    answerKiraQuestion('¿Qué es un púlsar?', blank, 'es').text,
    answerKiraQuestion('What is the nearest known black hole?', blank, 'en').text
  ];
  const internalTerms = /base local|datos locales|informaci[oó]n guardada|datos almacenados|local database|local data|stored information|stored local|sin api|no api/i;
  answers.forEach((answer) => assert.doesNotMatch(answer, internalTerms));
  assert.match(answers[0], /Venus.*464/i);
  assert.match(answers[1], /Gaia BH1/i);
  assert.match(answers[2], /estrella de neutrones/i);
});

test('Phase 7.3 gives explicit section help before using the current Mars object', () => {
  const marsContext = {
    currentSection:'universe',
    currentObject:{ id:'mars', kind:'planet', section:'universe', name:'Marte' },
    previousObject:{ id:'earth', kind:'planet', section:'universe', name:'Tierra' },
    lastMentionedObjectIds:[{ id:'mars', type:'planet' }],
    lastComparisonPair:[{ id:'mars', type:'planet' }, { id:'earth', type:'planet' }],
    lastComparisonProperty:'size', lastIntent:'compare', lastProperty:'size', lastCategory:'planet'
  };
  const cases = [
    ['¿Qué puedo hacer en Gallery?', /16 fenómenos|Gallery/i, /Marte es/i, 'gallery'],
    ['¿Qué puedo hacer en Music Space?', /canciones|minirreproductor/i, /Marte es/i, 'music-space'],
    ['¿Cómo funciona Cosmic Defender?', /juego arcade|oleadas/i, /Marte es/i, 'cosmic-defender'],
    ['¿Para qué sirve Favoritos?', /planetas, estrellas y escenas|colección/i, /Marte es/i, 'favorites'],
    ['¿Qué puedo ver en Universe?', /ocho planetas|estrellas/i, /Marte es/i, 'universe'],
    ['Explícame Inicio.', /entrada principal/i, /Marte es/i, 'home']
  ];
  for (const [question, expected, forbidden, section] of cases) {
    const response = answerKiraQuestion(question, marsContext, 'es');
    assert.match(response.text, expected);
    assert.doesNotMatch(response.text, forbidden);
    assert.equal(response.memoryPatch.lastIntent, 'section-help');
    assert.equal(response.memoryPatch.lastSection, section);
    assert.deepEqual(marsContext.lastComparisonPair, [{ id:'mars', type:'planet' }, { id:'earth', type:'planet' }]);
  }
});

test('Phase 7.3 uses the current section for contextual navigation help', () => {
  const cases = [
    ['gallery', '¿Qué puedo hacer aquí?', /16 fenómenos|Gallery/i],
    ['universe', '¿Qué hay en esta sección?', /ocho planetas|estrellas/i],
    ['music-space', '¿Cómo funciona esto?', /canciones|minirreproductor/i],
    ['cosmic-defender', '¿Qué hago aquí?', /juego arcade|oleadas/i],
    ['favorites', '¿Para qué sirve esta parte?', /Favoritos|colección/i]
  ];
  for (const [currentSection, question, expected] of cases) {
    const response = answerKiraQuestion(question, { currentSection, currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[] }, 'es');
    assert.match(response.text, expected);
    assert.equal(response.memoryPatch.lastIntent, 'section-help');
    assert.equal(response.memoryPatch.lastSection, currentSection);
  }
});

test('Phase 7.3 changes cleanly between object, section, and object intents', () => {
  let memory = { currentSection:'universe', currentObject:{id:'mars',kind:'planet',section:'universe'}, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[], lastIntent:null, lastProperty:null, lastCategory:null, lastSection:null, lastAnswerContext:null };
  const run = (question) => {
    const response = answerKiraQuestion(question, memory, 'es');
    memory = { ...memory, ...(response.memoryPatch || {}) };
    return response.text;
  };
  assert.match(run('Háblame de Marte.'), /Marte:/);
  assert.match(run('¿Qué puedo hacer en Gallery?'), /16 fenómenos|Gallery/i);
  assert.match(run('¿Y qué es un púlsar?'), /estrella de neutrones/i);
});

test('Phase 7.3 explains Kira capabilities without claiming unsupported features', () => {
  const blank = { currentSection:'home', currentObject:null, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[] };
  const spanish = answerKiraQuestion('¿Qué puedes hacer?', blank, 'es');
  const english = answerKiraQuestion('How can you help me?', blank, 'en');
  assert.match(spanish.text, /comparaciones|temperatura|Cosmic Defender/i);
  assert.match(english.text, /comparisons|temperature|Cosmic Defender/i);
  assert.equal(spanish.memoryPatch.lastIntent, 'assistant-capabilities');
});

test('Kira context persists the last section help without clearing astronomy memory', async () => {
  const source = await read('src/features/kira/kira-context.js');
  assert.match(source, /lastSection/);
  assert.match(source, /lastComparisonPair/);
  assert.match(source, /lastProperty/);
});


test('Phase 7.3 section help works in English and tolerates common section typos', () => {
  const base = { currentSection:'gallery', currentObject:{id:'mars',kind:'planet',section:'universe'}, previousObject:null, lastMentionedObjectIds:[], lastComparisonPair:[] };
  assert.match(answerKiraQuestion('What can I do in Music Space?', base, 'en').text, /play your songs|mini-player/i);
  assert.match(answerKiraQuestion('What can I do here?', base, 'en').text, /16 cosmic phenomena|Gallery/i);
  assert.match(answerKiraQuestion('¿Qué puedo hacer en galery?', base, 'es').text, /16 fenómenos|Gallery/i);
  assert.match(answerKiraQuestion('¿Para qué sirve favritos?', base, 'es').text, /Favoritos|colección/i);
});
