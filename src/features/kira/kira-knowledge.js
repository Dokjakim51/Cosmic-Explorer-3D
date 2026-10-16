import planetsData from '../../data/planets.json' with { type: 'json' };
import starsData from '../../data/stars.json' with { type: 'json' };
import galleryData from '../../data/gallery.json' with { type: 'json' };
import { catalogEs } from '../../i18n/catalog-es.js';
import { t } from '../../i18n/i18n.js';
import { getLevelDefinition } from '../game/cosmic-defender-levels.js';
import {
  KIRA_GALLERY_KNOWLEDGE,
  KIRA_NEAREST_KNOWN
} from './kira-astronomy-data.js';

const KM_PER_LIGHT_YEAR = 9.4607304725808e12;
const SOLAR_RADIUS_KM = 695700;
const EARTH_SUN_KM = 149600000;

const PLANET_NUMBERS = Object.freeze({
  mercury: { diameterKm: 4880, radiusKm: 2440, massKg: 3.30e23, gravityMs2: 3.7, temperatureC: 167, distanceSunKm: 57.9e6, moons: 0, dayHours: 1407.6, yearDays: 88, earthRangeKm: [77e6, 222e6] },
  venus: { diameterKm: 12104, radiusKm: 6052, massKg: 4.87e24, gravityMs2: 8.87, temperatureC: 464, distanceSunKm: 108.2e6, moons: 0, dayHours: 5832, yearDays: 224.7, earthRangeKm: [38e6, 261e6] },
  earth: { diameterKm: 12756, radiusKm: 6378, massKg: 5.97e24, gravityMs2: 9.81, temperatureC: 15, distanceSunKm: 149.6e6, moons: 1, dayHours: 23.9, yearDays: 365.25, earthRangeKm: [0, 0] },
  mars: { diameterKm: 6779, radiusKm: 3389.5, massKg: 6.42e23, gravityMs2: 3.71, temperatureC: -65, distanceSunKm: 228e6, moons: 2, dayHours: 24.6, yearDays: 687, earthRangeKm: [54.6e6, 401e6] },
  jupiter: { diameterKm: 139822, radiusKm: 69911, massKg: 1.90e27, gravityMs2: 24.79, temperatureC: -110, distanceSunKm: 778e6, moons: 95, dayHours: 9.9, yearDays: 4333, earthRangeKm: [588e6, 968e6] },
  saturn: { diameterKm: 120500, radiusKm: 60250, massKg: 5.68e26, gravityMs2: 10.44, temperatureC: -140, distanceSunKm: 1.4e9, moons: 146, dayHours: 10.7, yearDays: 10759, earthRangeKm: [1.2e9, 1.7e9] },
  uranus: { diameterKm: 51118, radiusKm: 25559, massKg: 8.68e25, gravityMs2: 8.69, temperatureC: -195, distanceSunKm: 2.9e9, moons: 28, dayHours: 17.2, yearDays: 30687, earthRangeKm: [2.6e9, 3.2e9] },
  neptune: { diameterKm: 49528, radiusKm: 24764, massKg: 1.02e26, gravityMs2: 11.15, temperatureC: -200, distanceSunKm: 4.5e9, moons: 16, dayHours: 16.1, yearDays: 60190, earthRangeKm: [4.3e9, 4.7e9] }
});

const PLANET_ATMOSPHERES = Object.freeze({
  mercury: { es: 'Tiene una exosfera extremadamente tenue formada, entre otros componentes, por oxígeno, sodio, hidrógeno, helio y potasio.', en: 'It has an extremely thin exosphere containing, among other components, oxygen, sodium, hydrogen, helium, and potassium.' },
  venus: { es: 'Su atmósfera es muy densa y está formada principalmente por dióxido de carbono, con nubes de ácido sulfúrico.', en: 'Its very dense atmosphere is made mostly of carbon dioxide, with sulfuric-acid clouds.' },
  earth: { es: 'Su atmósfera contiene principalmente nitrógeno y oxígeno, además de cantidades menores de otros gases.', en: 'Its atmosphere contains mostly nitrogen and oxygen, with smaller amounts of other gases.' },
  mars: { es: 'Su atmósfera es delgada y está compuesta principalmente por dióxido de carbono, con nitrógeno y argón.', en: 'Its thin atmosphere is made mostly of carbon dioxide, with nitrogen and argon.' },
  jupiter: { es: 'Su atmósfera está formada principalmente por hidrógeno y helio, con nubes y trazas de otros compuestos.', en: 'Its atmosphere consists mainly of hydrogen and helium, with clouds and traces of other compounds.' },
  saturn: { es: 'Su atmósfera está dominada por hidrógeno y helio, con nubes de amoníaco, agua y otros compuestos.', en: 'Its atmosphere is dominated by hydrogen and helium, with clouds of ammonia, water, and other compounds.' },
  uranus: { es: 'Su atmósfera contiene hidrógeno, helio y metano; el metano contribuye a su color azul verdoso.', en: 'Its atmosphere contains hydrogen, helium, and methane; methane helps produce its blue-green color.' },
  neptune: { es: 'Su atmósfera contiene hidrógeno, helio y metano, y presenta algunos de los vientos más rápidos del Sistema Solar.', en: 'Its atmosphere contains hydrogen, helium, and methane, and it has some of the fastest winds in the Solar System.' }
});

const STAR_NUMBERS = Object.freeze({
  sun: { temperatureK: 5778, radiusSolar: 1, massSolar: 1, luminositySolar: 1, distanceLy: 8.316746 / 525960, ageYears: 4.6e9 },
  sirius: { temperatureK: 10000, radiusSolar: 1.7, massSolar: 2.0, luminositySolar: 25, distanceLy: 8.6, ageYears: 250e6 },
  vega: { temperatureK: 9800, radiusSolar: 2.4, massSolar: 2.1, luminositySolar: 40, distanceLy: 25, ageYears: 450e6 },
  betelgeuse: { temperatureK: 3500, radiusSolar: 700, massSolar: 17.5, luminositySolar: 100000, distanceLy: 650, ageYears: 10e6 },
  rigel: { temperatureK: 12000, radiusSolar: 70, massSolar: 20, luminositySolar: 120000, distanceLy: 860, ageYears: 8e6 },
  polaris: { temperatureK: 6000, radiusSolar: 47.5, massSolar: 5, luminositySolar: 2250, distanceLy: 430, ageYears: 60e6 },
  'proxima-centauri': { temperatureK: 3050, radiusSolar: 0.15, massSolar: 0.12, luminositySolar: 0.0017, distanceLy: 4.24, ageYears: 4.8e9 },
  antares: { temperatureK: 3500, radiusSolar: 650, massSolar: 12, luminositySolar: 60000, distanceLy: 550, ageYears: 12.5e6 }
});

const GALLERY_META = Object.freeze({
  'black-hole-accretion-disk': { danger: 10, energy: 9, duration: 9, scale: 7 },
  quasar: { danger: 10, energy: 10, duration: 10, scale: 10 },
  blazar: { danger: 10, energy: 10, duration: 10, scale: 10 },
  'tidal-disruption-event': { danger: 10, energy: 9, duration: 5, scale: 8 },
  pulsar: { danger: 9, energy: 8, duration: 10, scale: 3 },
  magnetar: { danger: 10, energy: 9, duration: 9, scale: 3 },
  supernova: { danger: 10, energy: 10, duration: 3, scale: 8 },
  'supernova-remnant': { danger: 7, energy: 7, duration: 10, scale: 9 },
  'neutron-star-merger-kilonova': { danger: 10, energy: 10, duration: 2, scale: 6 },
  'protostar-protoplanetary-disk': { danger: 5, energy: 5, duration: 10, scale: 7 },
  'planetary-nebula': { danger: 4, energy: 5, duration: 9, scale: 8 },
  'cosmic-web': { danger: 1, energy: 3, duration: 10, scale: 10 },
  'wolf-rayet-star': { danger: 9, energy: 9, duration: 7, scale: 6 },
  'vampire-star-system': { danger: 8, energy: 7, duration: 8, scale: 5 },
  'herbig-haro-stellar-jet': { danger: 7, energy: 7, duration: 6, scale: 6 },
  'gamma-ray-burst': { danger: 10, energy: 10, duration: 1, scale: 9 }
});

const EXTRA_ALIASES = Object.freeze({
  earth: ['la tierra', 'planeta tierra', 'planet earth', 'tiera', 'tirra'],
  mercury: ['mercurio', 'planeta mercurio', 'mercury'],
  venus: ['planeta venus'],
  mars: ['marte', 'planeta marte', 'mars', 'mart'],
  jupiter: ['jupiter', 'júpiter', 'planeta jupiter', 'planeta júpiter', 'jupter'],
  saturn: ['saturno', 'planeta saturno', 'saturn', 'satuno'],
  uranus: ['urano', 'planeta urano', 'uranus'],
  neptune: ['neptuno', 'planeta neptuno', 'neptune', 'neptno'],
  sun: ['sol', 'el sol', 'the sun'],
  'proxima-centauri': ['proxima centauri', 'próxima centauri', 'proxima']
});

const SECTION_ALIASES = Object.freeze({
  home: ['inicio', 'home', 'pagina principal', 'pantalla principal', 'portada'],
  universe: ['universo', 'universe', 'planetas y estrellas', 'apartado de planetas', 'apartado de estrellas'],
  gallery: ['galeria', 'gallery', 'escenas', 'objetos cosmicos', 'fenomenos cosmicos'],
  'music-space': ['music space', 'musica', 'reproductor', 'apartado de musica'],
  'cosmic-defender': ['cosmic defender', 'apartado del juego', 'juego arcade', 'galaga', 'arcade', 'juego'],
  favorites: ['favoritos', 'favorites', 'guardados', 'mis favoritos', 'coleccion'],
  appearance: ['apariencia', 'appearance', 'temas', 'fondos', 'personalizacion']
});

const SECTION_HELP = Object.freeze({
  home: {
    es: 'Inicio es la entrada principal de Cosmic Explorer. Desde aquí puedes conocer la presentación del proyecto, observar el planeta principal, comenzar la exploración, cambiar la apariencia y entrar en Universe, Gallery, Music Space, Favoritos o Cosmic Defender. También puedes abrir Kira cuando necesites orientación.',
    en: 'Home is the main entrance to Cosmic Explorer. From here you can see the project introduction and main planet, begin exploring, change the site appearance, and enter Universe, Gallery, Music Space, Favorites, or Cosmic Defender. You can also open Kira whenever you need guidance.'
  },
  universe: {
    es: 'En Universe puedes explorar los ocho planetas y las estrellas de Cosmic Explorer. Cada cuerpo tiene una vista detallada con información, rotación, zoom y controles interactivos. También puedes añadirlo a Favoritos o preguntarme por sus características y comparaciones.',
    en: 'In Universe you can explore Cosmic Explorer’s eight planets and its stars. Each body has a detailed view with information, rotation, zoom, and interactive controls. You can also add it to Favorites or ask me about its properties and comparisons.'
  },
  gallery: {
    es: 'En Gallery puedes explorar 16 fenómenos y objetos cósmicos, como agujeros negros, cuásares, púlsares, magnetares, supernovas y estallidos de rayos gamma. Puedes abrir cada escena, verla en detalle y preguntarme qué representa, cómo se forma o qué características tiene.',
    en: 'In Gallery you can explore 16 cosmic phenomena and objects, including black holes, quasars, pulsars, magnetars, supernovae, and gamma-ray bursts. You can open each scene, inspect it in detail, and ask me what it represents, how it forms, or what features it has.'
  },
  'music-space': {
    es: 'En Music Space puedes reproducir tus canciones, cambiar de pista, pausar o continuar, controlar el volumen y utilizar el minirreproductor. También puedes cambiar entre sus modos, moverlo cuando corresponda, disfrutar de los visualizadores y mantener la música activa mientras exploras otras secciones.',
    en: 'In Music Space you can play your songs, change tracks, pause or resume, control the volume, and use the mini-player. You can also switch its modes, move it when available, enjoy the visualizers, and keep music playing while you explore other sections.'
  },
  'cosmic-defender': {
    es: 'Cosmic Defender es el juego arcade de Cosmic Explorer. Puedes elegir un planeta, controlar tu nave, destruir enemigos, completar oleadas y derrotar un jefe diferente en cada nivel. Al completar un planeta puedes desbloquear nuevas dificultades, volver a jugarlo y mejorar tus puntuaciones usando controles de computadora o celular.',
    en: 'Cosmic Defender is Cosmic Explorer’s arcade game. You can choose a planet, control your ship, destroy enemies, complete waves, and defeat a different boss in each level. After completing a planet, you can unlock new difficulties, replay it, and improve your scores using computer or mobile controls.'
  },
  favorites: {
    es: 'En Favoritos puedes encontrar los planetas, estrellas y escenas que guardaste durante la exploración. Desde ahí puedes volver a abrirlos rápidamente, organizar tu recorrido personal o eliminarlos de tu colección.',
    en: 'In Favorites you can find the planets, stars, and scenes you saved while exploring. From there you can quickly open them again, organize your personal journey, or remove them from your collection.'
  },
  appearance: {
    es: 'En Apariencia puedes cambiar fondos, temas completos, colores, efectos, interfaz y opciones de accesibilidad. También puedes elegir un tema global o uno diferente para cada sección, guardar combinaciones personalizadas, usar perfiles de rendimiento y restaurar Cosmic Explorer Original cuando quieras.',
    en: 'In Appearance you can change backgrounds, complete themes, colors, effects, interface options, and accessibility settings. You can also use one global theme or a different one for each section, save custom combinations, choose performance profiles, and restore Cosmic Explorer Original at any time.'
  }
});

const KIRA_CAPABILITIES = Object.freeze({
  es: 'Puedo explicarte los planetas, estrellas y fenómenos de Gallery, hacer comparaciones, responder preguntas sobre tamaño, temperatura, distancia, composición y formación, recordar temporalmente los objetos que visitas y ayudarte con Music Space, Favoritos, Apariencia y Cosmic Defender.',
  en: 'I can explain the planets, stars, and Gallery phenomena, make comparisons, answer questions about size, temperature, distance, composition, and formation, temporarily remember the objects you visit, and help you with Music Space, Favorites, Appearance, and Cosmic Defender.'
});

const SPEED_PROFILES = Object.freeze({
  light: { kmh: 1079252848.8, es: 'la velocidad de la luz', en: 'the speed of light' },
  voyager: { kmh: 61000, es: 'una velocidad aproximada de Voyager 1 de 61.000 km/h', en: 'an approximate Voyager 1 speed of 61,000 km/h' },
  spacecraft: { kmh: 40000, es: 'una nave espacial rápida a 40.000 km/h', en: 'a fast spacecraft traveling at 40,000 km/h' },
  plane: { kmh: 900, es: 'un avión comercial a 900 km/h', en: 'a commercial airplane traveling at 900 km/h' },
  car: { kmh: 100, es: 'un automóvil a 100 km/h', en: 'a car traveling at 100 km/h' }
});

const FALLBACK = Object.freeze({
  es: 'No pude identificar completamente la pregunta. Puedes mencionar un planeta, estrella o fenómeno, o preguntarme por descripción, tamaño, temperatura, distancia, formación o comparaciones.',
  en: 'I could not fully identify the question. You can mention a planet, star, or phenomenon, or ask about description, size, temperature, distance, formation, or comparisons.'
});

const NO_DATA = Object.freeze({
  es: 'No tengo ese dato específico, pero puedo darte una descripción general o responder sobre tamaño, temperatura, distancia, formación o comparaciones.',
  en: 'I do not have that specific value, but I can provide a general description or answer about size, temperature, distance, formation, or comparisons.'
});

function tr(language, es, en) { return language === 'es' ? es : en; }
function formatNumber(value, language = 'en', maximumFractionDigits = 2) {
  return new Intl.NumberFormat(language === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits }).format(value);
}
function formatScientific(value, language = 'en') {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) >= 1e12 || (Math.abs(value) > 0 && Math.abs(value) < 0.001)) return value.toExponential(2).replace('e+', 'e');
  return formatNumber(value, language, 2);
}
function plural(value, singular, pluralForm = `${singular}s`) { return Math.abs(value) === 1 ? singular : pluralForm; }

export function normalizeKiraText(value) {
  let text = String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[–—]/g, '-').replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ').trim();
  const corrections = {
    plante: 'planeta', planteta: 'planeta', hablame: 'hablame', cuentame: 'cuentame',
    quazar: 'quasar', cuasar: 'quasar', agugero: 'agujero', jupter: 'jupiter',
    satuno: 'saturno', neptno: 'neptuno', tirra: 'tierra', tiera: 'tierra',
    pulsar: 'pulsar', magnetar: 'magnetar', galery: 'gallery', univerce: 'universe',
    favritos: 'favoritos', aparencia: 'apariencia', muscia: 'musica', defnder: 'defender'
  };
  return text.split(' ').map((word) => corrections[word] || word).join(' ');
}

function localizedPlanet(item, language) {
  if (language !== 'es') return item;
  const localized = catalogEs.planets[item.id] || {};
  return { ...item, ...localized, facts: { ...item.facts, ...(localized.facts || {}) } };
}
function localizedStar(item, language) {
  if (language !== 'es') return item;
  const localized = catalogEs.stars[item.id] || {};
  return { ...item, ...localized, facts: { ...item.facts, ...(localized.facts || {}) } };
}
function createPlanetRecord(item, language) {
  const localized = localizedPlanet(item, language);
  return { ...localized, kind: 'planet', typeId: 'planet', numeric: PLANET_NUMBERS[item.id] || {}, description: localized.shortDescription };
}
function createStarRecord(item, language) {
  const localized = localizedStar(item, language);
  return { ...localized, kind: 'star', typeId: 'star', numeric: STAR_NUMBERS[item.id] || {}, description: localized.shortDescription };
}
function createGalleryRecord(item, language) {
  const extra = KIRA_GALLERY_KNOWLEDGE[item.id] || {};
  return {
    ...item,
    kind: 'gallery', typeId: 'gallery',
    name: t(item.titleKey, {}, language),
    description: extra.description?.[language] || t(item.descriptionKey, {}, language),
    formation: extra.formation?.[language] || null,
    aliases: extra.aliases || [],
    technique: t(item.techniqueKey, {}, language),
    tagsLocalized: (item.tags || []).map((key) => t(key, {}, language)),
    nearestKnownExample: KIRA_NEAREST_KNOWN[item.id] || null,
    numeric: GALLERY_META[item.id] || {}
  };
}
function createGameRecord(id, language) {
  const level = getLevelDefinition(id);
  const names = { mercury:'Mercurio', venus:'Venus', earth:'Tierra', mars:'Marte', jupiter:'Júpiter', saturn:'Saturno', uranus:'Urano', neptune:'Neptuno' };
  return { id, kind:'game-level', typeId:'game-level', name: language === 'es' ? names[id] || level.name : level.name, level, numeric:{} };
}
function allRecords(language, { includeGame = false } = {}) {
  const records = [
    ...planetsData.map((item) => createPlanetRecord(item, language)),
    ...starsData.map((item) => createStarRecord(item, language)),
    ...galleryData.items.map((item) => createGalleryRecord(item, language))
  ];
  if (includeGame) records.push(...Object.keys(PLANET_NUMBERS).map((id) => createGameRecord(id, language)));
  return records;
}
function resolveRecord(ref, language) {
  if (!ref) return null;
  const id = String(ref.id || ref.objectId || '').trim();
  const type = String(ref.type || ref.kind || ref.objectType || '').trim();
  if (!id) return null;
  if (type === 'planet') return planetsData.find((x) => x.id === id) ? createPlanetRecord(planetsData.find((x) => x.id === id), language) : null;
  if (type === 'star') return starsData.find((x) => x.id === id) ? createStarRecord(starsData.find((x) => x.id === id), language) : null;
  if (type === 'gallery' || type === 'gallery-object') return galleryData.items.find((x) => x.id === id) ? createGalleryRecord(galleryData.items.find((x) => x.id === id), language) : null;
  if (type === 'game-level') return createGameRecord(id, language);
  return allRecords(language, { includeGame: true }).find((record) => record.id === id) || null;
}
function refFor(record) { return record ? { id: record.id, type: record.kind } : null; }

function aliasesFor(record) {
  const values = [record.id, record.id.replaceAll('-', ' '), record.name, ...(EXTRA_ALIASES[record.id] || []), ...(record.aliases || [])];
  if (record.kind === 'planet') values.push(planetsData.find((x) => x.id === record.id)?.name, catalogEs.planets[record.id]?.name);
  if (record.kind === 'star') values.push(starsData.find((x) => x.id === record.id)?.name, catalogEs.stars[record.id]?.name);
  if (record.kind === 'gallery') values.push(t(record.titleKey, {}, 'es'), t(record.titleKey, {}, 'en'));
  return [...new Set(values.filter(Boolean).map(normalizeKiraText))].sort((a, b) => b.length - a.length);
}
function levenshtein(a, b) {
  if (a === b) return 0;
  const row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let previous = row[0]; row[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const saved = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = saved;
    }
  }
  return row[b.length];
}
function approximateAliasMatch(text, alias) {
  if (alias.includes(' ') || alias.length < 5) return false;
  return text.split(' ').some((word) => word.length >= 4 && Math.abs(word.length - alias.length) <= 1 && levenshtein(word, alias) <= 1);
}
export function findMentionedRecords(question, language = 'es') {
  const normalized = normalizeKiraText(question);
  const matches = [];
  for (const record of allRecords(language)) {
    let bestIndex = Infinity; let bestLength = 0;
    for (const alias of aliasesFor(record)) {
      const index = normalized.indexOf(alias);
      if (index >= 0 && (index < bestIndex || (index === bestIndex && alias.length > bestLength))) { bestIndex = index; bestLength = alias.length; }
      else if (!Number.isFinite(bestIndex) && approximateAliasMatch(normalized, alias)) { bestIndex = normalized.length + matches.length; bestLength = alias.length; }
    }
    if (Number.isFinite(bestIndex)) matches.push({ record, index: bestIndex, length: bestLength });
  }
  matches.sort((a,b) => a.index - b.index || b.length - a.length);
  return matches.map((x) => x.record).filter((record, index, array) => array.findIndex((x) => x.id === record.id && x.kind === record.kind) === index);
}

function includesAny(text, values) { return values.some((value) => text.includes(value)); }
function isFollowUp(text) {
  return /^(y\b|and\b|what about\b|how about\b|que hay de\b|entre esos|entre ellos|esos dos|ambos|los dos|el anterior|la anterior|ese|esa)/.test(text)
    || includesAny(text, ['what about', 'between those', 'and which', 'y cual', 'y a que', 'y cuanto']);
}
function detectExplicitProperty(text) {
  if (includesAny(text, ['que es','what is','hablame','cuentame','tell me','explain','informacion general','descripcion','description'])) return 'description';
  if (includesAny(text, ['temperatura','caliente','frio','fria','grados','hot','temperature','cold'])) return 'temperature';
  if (includesAny(text, ['diametro','diameter'])) return 'diameter';
  if (includesAny(text, ['tamano','grande','pequeno','size','large','larger','biggest','smallest'])) return 'size';
  if (includesAny(text, ['masa','mass','pesado','heavier'])) return 'mass';
  if (includesAny(text, ['gravedad','gravity'])) return 'gravity';
  if (includesAny(text, ['lunas','luna','moons','moon'])) return 'moons';
  if (includesAny(text, ['luminosidad','luminoso','brillante','luminosity','luminous','brightest'])) return 'luminosity';
  if (includesAny(text, ['edad','age','antiguo','old'])) return 'age';
  if (includesAny(text, ['energia','energy'])) return 'energy';
  if (includesAny(text, ['duracion','dura','duration','lasts'])) return 'duration';
  if (includesAny(text, ['formacion','forma','origen','como se forma','formation','how does it form','origin'])) return 'formation';
  if (includesAny(text, ['atmosfera','atmosphere'])) return 'atmosphere';
  if (includesAny(text, ['composicion','compuesto','composition','made of'])) return 'composition';
  if (includesAny(text, ['tipo','type','spectral'])) return 'type';
  if (includesAny(text, ['dia','rotacion','day length','rotation'])) return 'dayLength';
  if (includesAny(text, ['ano','orbita','year length','orbit'])) return 'yearLength';
  if (includesAny(text, ['distancia','lejos','cerca','distance','far','close','near'])) {
    if (includesAny(text, ['del sol','desde el sol','from the sun'])) return 'distanceFromSun';
    return 'distanceFromEarth';
  }
  if (includesAny(text, ['viaje','llegar','tardaria','tardariamos','travel','reach','take to get'])) return 'travelTime';
  return null;
}
function detectSpeedProfile(text, previous = null) {
  if (includesAny(text, ['luz','light speed','speed of light'])) return 'light';
  if (includesAny(text, ['voyager'])) return 'voyager';
  if (includesAny(text, ['avion','plane','airplane'])) return 'plane';
  if (includesAny(text, ['auto','coche','carro','car '])) return 'car';
  if (includesAny(text, ['nave','spacecraft','rocket'])) return 'spacecraft';
  return previous || 'spacecraft';
}
function canonicalSection(section) {
  if (section === 'planets' || section === 'stars') return 'universe';
  if (section === 'music') return 'music-space';
  if (section === 'game') return 'cosmic-defender';
  return SECTION_HELP[section] ? section : null;
}

function findMentionedSection(text) {
  const normalized = normalizeKiraText(text);
  const candidates = Object.entries(SECTION_ALIASES)
    .flatMap(([section, aliases]) => aliases.map((alias) => ({ section, alias: normalizeKiraText(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);
  return candidates.find(({ alias }) => normalized.includes(alias))?.section || null;
}

function isSectionHelpQuestion(text, mentionedSection) {
  const contextual = includesAny(text, [
    'que puedo hacer aqui', 'que se hace en esta seccion', 'que hay en esta seccion', 'que hay aqui', 'para que sirve esta parte',
    'como funciona esto', 'que hago aqui', 'que puedo ver aqui', 'what can i do here',
    'what is in this section', 'what do you do in this section', 'what is this section for', 'how does this work', 'what can i see here'
  ]);
  const explicitCue = includesAny(text, [
    'que puedo hacer', 'que puedo ver', 'que hay en', 'para que sirve', 'como funciona', 'que hago en',
    'explicame', 'hablame de', 'que es', 'what can i do', 'what can i see', 'what is', 'how does', 'tell me about', 'explain'
  ]);
  return contextual || Boolean(mentionedSection && explicitCue);
}

function requestedSectionFor(text, context) {
  const explicit = findMentionedSection(text);
  if (explicit) return explicit;
  const contextual = isSectionHelpQuestion(text, null);
  if (!contextual) return null;
  return canonicalSection(context.currentSection) || canonicalSection(context.baseSection) || canonicalSection(context.lastSection) || 'home';
}

function categoryFromWords(text) {
  if (includesAny(text, ['planeta','planetas','planet','planets'])) return 'planet';
  if (includesAny(text, ['estrella','estrellas','star','stars'])) return 'star';
  if (includesAny(text, ['gallery','galeria','fenomeno','fenomenos','object','objeto','objetos'])) return 'gallery';
  return null;
}
function categoryFromContext(context) {
  const category = context.currentCategory || context.currentObjectType || context.currentObject?.kind;
  if (category === 'planet' || category === 'game-level') return 'planet';
  if (category === 'star') return 'star';
  if (category === 'gallery' || category === 'gallery-object') return 'gallery';
  return null;
}
function detectIntent(question, context) {
  const text = normalizeKiraText(question);
  const followUp = isFollowUp(text);
  const explicitProperty = detectExplicitProperty(text);
  const mentionedSection = findMentionedSection(text);
  const sectionHelp = isSectionHelpQuestion(text, mentionedSection);
  const nearest = includesAny(text, ['mas cercano','mas cercana','el cercano','la cercana','nearest','closest']);
  const travel = includesAny(text, ['cuanto tard','tiempo de viaje','tardariamos','tardaria','how long','travel time','take to reach']);
  const compare = includesAny(text, ['compara','comparar','compare','diferencia entre','which is','which one','cual es mas','cual esta mas','cual tiene mas','entre esos dos','entre ellos','de los dos','between those two','between them']);
  const ranking = includesAny(text, ['el mas','la mas','mas grande','mas pequeno','mas caliente','mas frio','mas fria','mas lejos','mas cerca','the most','largest','smallest','hottest','coldest','farthest','closest star','closest planet']) && !compare;
  let intent = null;
  if (!text) intent = 'unknown';
  else if (includesAny(text, ['limpia historial','borra historial','clear history'])) intent = 'clear';
  else if (/^(hola|hello|hi|hey|buenas)\b/.test(text)) intent = 'greeting';
  else if (includesAny(text, ['como activo el sonido ambiental','activar sonido ambiental','activar ambientacion','enable ambient sound','turn on ambience'])) intent = 'ambient-enable';
  else if (includesAny(text, ['que sonido esta reproduciendose','que sonido suena','sonido actual','what sound is playing','current ambience'])) intent = 'ambient-current';
  else if (includesAny(text, ['por que jupiter suena asi','por que suena asi','why does it sound like this','why does jupiter sound'])) intent = 'ambient-why';
  else if (includesAny(text, ['es un sonido real del espacio','sonido real del espacio','literal recording','real sound from space'])) intent = 'ambient-real';
  else if (includesAny(text, ['como bajo el volumen ambiental','bajar volumen ambiental','ambient volume','lower the ambience'])) intent = 'ambient-volume';
  else if (includesAny(text, ['solo musica relajante','escuchar solo musica relajante','activar musica relajante','relaxing music only','only relaxing music','enable relaxing music'])) intent = 'ambient-relaxing';
  else if (includesAny(text, ['desactivo los sonidos intensos','reducir sonidos intensos','reduce intense sounds','disable intense sounds'])) intent = 'ambient-intense';
  else if (includesAny(text, ['modo cientifico','perfil cientifico','scientific mode','scientific profile'])) intent = 'ambient-scientific';
  else if (includesAny(text, ['evito que suene durante music space','durante music space','pause ambience during music','ambient sound in music space'])) intent = 'ambient-music';
  else if (includesAny(text, ['perfil sonoro tengo activo','perfil de sonido','sound profile active','current sound profile'])) intent = 'ambient-profile';
  else if (includesAny(text, ['que tema tengo activo','tema activo','current theme','active theme'])) intent = 'appearance-current';
  else if (includesAny(text, ['como cambio el fondo','cambiar el fondo','change the background','change background'])) intent = 'appearance-background';
  else if (includesAny(text, ['como reduzco los efectos','reducir efectos','reduce effects','menos efectos'])) intent = 'appearance-performance';
  else if (includesAny(text, ['consume menos recursos','menos recursos','best performance theme','least resources'])) intent = 'appearance-low-cost';
  else if (includesAny(text, ['como cambio los colores','cambiar colores','change colors','change the colors'])) intent = 'appearance-colors';
  else if (includesAny(text, ['vuelvo al diseno original','volver al diseno original','restaurar original','restore original','original design'])) intent = 'appearance-original';
  else if (includesAny(text, ['tema diferente en gallery','tema diferente por seccion','different theme in gallery','theme by section'])) intent = 'appearance-section-mode';
  else if (includesAny(text, ['perfil rendimiento','performance profile','que hace rendimiento'])) intent = 'appearance-profile';
  else if (sectionHelp) intent = 'section-help';
  else if (includesAny(text, ['que puedes hacer','para que sirves','como me puedes ayudar','what can you do','what are you for','how can you help me','ayuda','help'])) intent = 'assistant-capabilities';
  else if (includesAny(text, ['que estoy viendo','que estoy observando','what am i viewing','current object'])) intent = 'current-object';
  else if (includesAny(text, ['objeto anterior','vi anteriormente','previous object'])) intent = 'previous-object';
  else if (includesAny(text, ['como disparo','how do i fire'])) intent = 'game-controls';
  else if (includesAny(text, ['dificultad','hard mode','modo dificil'])) intent = 'game-difficulty';
  else if (includesAny(text, ['desbloqueo','unlock'])) intent = 'game-unlock';
  else if (includesAny(text, ['puntuacion','score'])) intent = 'game-score';
  else if (includesAny(text, ['minirreproductor','mini player'])) intent = 'mini-player';
  else if (includesAny(text, ['visualizador','visualizer'])) intent = 'visualizer';
  else if (includesAny(text, ['subo canciones','upload songs','music space','cambio de cancion'])) intent = 'music';
  else if (nearest) intent = 'nearest-known';
  else if (travel) intent = 'travel-time';
  else if (compare) intent = 'compare';
  else if (ranking) intent = 'ranking';
  else if (explicitProperty === 'description') intent = 'description';
  else if (explicitProperty === 'formation') intent = 'formation';
  else if (explicitProperty) intent = 'property';
  else if (followUp && context.lastIntent) intent = context.lastIntent;
  else intent = 'unknown';

  let property = explicitProperty;
  if (!property && followUp) property = context.lastComparisonProperty || context.lastProperty || null;
  if (intent === 'nearest-known') property = 'distanceFromEarth';
  if (intent === 'travel-time') property = 'travelTime';
  if (intent === 'description') property = 'description';
  if (intent === 'formation') property = 'formation';
  return { text, intent, property, category: categoryFromWords(text) || context.lastCategory || categoryFromContext(context), section: requestedSectionFor(text, context), followUp, speedProfile: detectSpeedProfile(text, context.lastAnswerContext?.speedProfile) };
}

function generalDescription(record, language) {
  if (!record) return NO_DATA[language] || NO_DATA.en;
  if (record.kind === 'planet') {
    const intro = record.description || record.shortDescription;
    const type = record.type ? tr(language, `Es un ${record.type.toLowerCase()}.`, `It is a ${record.type.toLowerCase()}.`) : '';
    return `${record.name}: ${intro} ${type} ${tr(language, 'Puedes preguntarme por su tamaño, temperatura, atmósfera, composición, gravedad, lunas, distancia o tiempo de viaje.', 'You can ask about its size, temperature, atmosphere, composition, gravity, moons, distance, or travel time.')}`.trim();
  }
  if (record.kind === 'star') {
    return `${record.name}: ${record.description || record.shortDescription} ${record.type ? tr(language, `Es una estrella de tipo ${record.type}.`, `It is a ${record.type} star.`) : ''} ${tr(language, 'Puedes preguntarme por tipo, temperatura, tamaño, luminosidad, edad, evolución o distancia.', 'You can ask about type, temperature, size, luminosity, age, evolution, or distance.')}`.trim();
  }
  if (record.kind === 'gallery') {
    return `${record.name}: ${record.description} ${tr(language, 'Puedes preguntarme cómo se forma, por su energía, duración, peligrosidad, distancia o un ejemplo cercano conocido.', 'You can ask how it forms, about its energy, duration, danger, distance, or a nearby known example.')}`;
  }
  if (record.kind === 'game-level') return tr(language, `El sector ${record.name} de Cosmic Defender tiene enemigos y patrones propios.`, `The ${record.name} sector in Cosmic Defender has its own enemies and patterns.`);
  return NO_DATA[language] || NO_DATA.en;
}

function propertyValue(record, property) {
  const n = record?.numeric || {};
  const map = {
    size: record?.kind === 'star' ? n.radiusSolar : n.diameterKm,
    diameter: record?.kind === 'star' ? n.radiusSolar * 2 * SOLAR_RADIUS_KM : n.diameterKm,
    mass: record?.kind === 'star' ? n.massSolar : n.massKg,
    temperature: record?.kind === 'star' ? n.temperatureK : n.temperatureC,
    gravity: n.gravityMs2, moons: n.moons,
    luminosity: n.luminositySolar, age: n.ageYears,
    distanceFromSun: n.distanceSunKm,
    distanceFromEarth: record?.kind === 'star'
      ? n.distanceLy
      : record?.kind === 'gallery' && record.nearestKnownExample
        ? (record.nearestKnownExample.distanceLightYears ?? ((record.nearestKnownExample.distanceRangeLightYears?.[0] + record.nearestKnownExample.distanceRangeLightYears?.[1]) / 2))
        : null,
    dayLength: n.dayHours, yearLength: n.yearDays,
    energy: n.energy, duration: n.duration, danger: n.danger, scale: n.scale
  };
  return Number.isFinite(map[property]) ? map[property] : null;
}
function propertyUnit(record, property, language) {
  if (property === 'temperature') return record.kind === 'star' ? 'K' : '°C';
  if (property === 'size') return record.kind === 'star' ? tr(language, 'radios solares', 'solar radii') : 'km';
  if (property === 'diameter') return 'km';
  if (property === 'mass') return record.kind === 'star' ? tr(language, 'masas solares', 'solar masses') : 'kg';
  if (property === 'gravity') return 'm/s²';
  if (property === 'moons') return tr(language, 'lunas', 'moons');
  if (property === 'luminosity') return tr(language, 'luminosidades solares', 'solar luminosities');
  if (property === 'age') return tr(language, 'años', 'years');
  if (property === 'distanceFromSun') return 'km';
  if (property === 'distanceFromEarth') return tr(language, 'años luz', 'light-years');
  if (property === 'dayLength') return tr(language, 'horas', 'hours');
  if (property === 'yearLength') return tr(language, 'días', 'days');
  if (['energy','duration','danger','scale'].includes(property)) return tr(language, 'sobre 10', 'out of 10');
  return '';
}
function propertyLabel(property, language) {
  const labels = {
    description:['descripción','description'], temperature:['temperatura','temperature'], size:['tamaño','size'], diameter:['diámetro','diameter'], mass:['masa','mass'], gravity:['gravedad','gravity'], moons:['lunas','moons'], luminosity:['luminosidad','luminosity'], age:['edad','age'], energy:['energía relativa','relative energy'], duration:['duración relativa','relative duration'], danger:['peligrosidad relativa','relative danger'], scale:['escala relativa','relative scale'], distanceFromSun:['distancia media al Sol','average distance from the Sun'], distanceFromEarth:['distancia desde la Tierra','distance from Earth'], dayLength:['duración del día','day length'], yearLength:['duración del año','year length']
  };
  return labels[property]?.[language === 'es' ? 0 : 1] || property;
}
function entityPropertyAnswer(record, property, language) {
  if (property === 'description') return generalDescription(record, language);
  if (property === 'formation') {
    if (record.kind === 'gallery' && record.formation) return `${record.name}: ${record.formation}`;
    if (record.kind === 'star') return `${record.name}: ${record.facts?.stage || record.facts?.evolution || NO_DATA[language]}`;
    return NO_DATA[language] || NO_DATA.en;
  }
  if (property === 'atmosphere') return record.kind === 'planet' ? `${record.name}: ${PLANET_ATMOSPHERES[record.id]?.[language] || NO_DATA[language]}` : NO_DATA[language];
  if (property === 'composition') return record.facts?.composition ? `${record.name}: ${record.facts.composition}` : NO_DATA[language];
  if (property === 'type') return record.type ? `${record.name}: ${record.type}${record.spectralType ? ` · ${record.spectralType}` : ''}.` : NO_DATA[language];
  if (property === 'distanceFromEarth') return distanceFromEarthAnswer(record, language).text;
  const value = propertyValue(record, property);
  if (value === null) return NO_DATA[language] || NO_DATA.en;
  const unit = propertyUnit(record, property, language);
  if (property === 'temperature') return tr(language, `${record.name} tiene una temperatura aproximada de ${formatNumber(value, language)} ${unit}.`, `${record.name} has an approximate temperature of ${formatNumber(value, language)} ${unit}.`);
  if (property === 'moons') return tr(language, `${record.name} tiene ${formatNumber(value, language)} ${plural(value, 'luna', 'lunas')}.`, `${record.name} has ${formatNumber(value, language)} ${plural(value, 'moon')}.`);
  return tr(language, `La ${propertyLabel(property, language)} de ${record.name} es aproximadamente ${formatScientific(value, language)} ${unit}.`, `${record.name}'s ${propertyLabel(property, language)} is approximately ${formatScientific(value, language)} ${unit}.`);
}

function distanceFromEarthAnswer(record, language) {
  if (record.kind === 'planet') {
    if (record.id === 'earth') return { text: tr(language, 'La Tierra es el punto de referencia, por lo que su distancia respecto de sí misma es 0 km.', 'Earth is the reference point, so its distance from itself is 0 km.'), distanceKm: 0 };
    const range = record.numeric.earthRangeKm;
    if (!range) return { text: NO_DATA[language] };
    const middle = (range[0] + range[1]) / 2;
    return {
      text: tr(language,
        `La distancia entre la Tierra y ${record.name} cambia constantemente por sus órbitas. Puede variar aproximadamente entre ${formatNumber(range[0], language)} y ${formatNumber(range[1], language)} km. Para una estimación sencilla usaré un valor medio de ${formatNumber(middle, language)} km.`,
        `The distance between Earth and ${record.name} changes constantly because of their orbits. It can range approximately from ${formatNumber(range[0], language)} to ${formatNumber(range[1], language)} km. For a simple estimate I will use a midpoint of ${formatNumber(middle, language)} km.`),
      distanceKm: middle, distanceRangeKm: range
    };
  }
  if (record.kind === 'star') {
    const ly = record.numeric.distanceLy;
    if (!Number.isFinite(ly)) return { text: NO_DATA[language] };
    if (record.id === 'sun') return { text: tr(language, `El Sol está a una distancia media de unos ${formatNumber(EARTH_SUN_KM, language)} km de la Tierra; su luz tarda aproximadamente 8 minutos y 20 segundos en llegar.`, `The Sun is at an average distance of about ${formatNumber(EARTH_SUN_KM, language)} km from Earth; its light takes about 8 minutes 20 seconds to arrive.`), distanceKm: EARTH_SUN_KM, distanceLy: ly };
    return { text: tr(language, `${record.name} está aproximadamente a ${formatNumber(ly, language)} años luz de la Tierra.`, `${record.name} is approximately ${formatNumber(ly, language)} light-years from Earth.`), distanceLy: ly, distanceKm: ly * KM_PER_LIGHT_YEAR };
  }
  if (record.kind === 'gallery' && record.nearestKnownExample) return nearestKnownAnswer(record, language);
  return { text: NO_DATA[language] || NO_DATA.en };
}

function nearestKnownAnswer(record, language) {
  const data = record?.nearestKnownExample || KIRA_NEAREST_KNOWN[record?.id];
  if (!data) return { text: tr(language, `No tengo un ejemplar cercano fiable para ${record?.name || 'esa categoría'}.`, `I do not have a reliable nearby example for ${record?.name || 'that category'}.`) };
  const displayName = language === 'es' ? data.name : (data.englishName || data.name);
  const distanceText = data.distanceRangeLightYears
    ? tr(language, `entre ${formatNumber(data.distanceRangeLightYears[0], language)} y ${formatNumber(data.distanceRangeLightYears[1], language)} años luz`, `between ${formatNumber(data.distanceRangeLightYears[0], language)} and ${formatNumber(data.distanceRangeLightYears[1], language)} light-years`)
    : tr(language, `${formatNumber(data.distanceLightYears, language)} años luz`, `${formatNumber(data.distanceLightYears, language)} light-years`);
  const nominalLy = data.distanceLightYears ?? ((data.distanceRangeLightYears[0] + data.distanceRangeLightYears[1]) / 2);
  return {
    text: tr(language,
      `${displayName} es ${data.qualifier.es}. Es un ${data.type.es} situado aproximadamente a ${distanceText} de la Tierra. ${data.caveat.es}`,
      `${displayName} is ${data.qualifier.en}. It is a ${data.type.en} located approximately ${distanceText} from Earth. ${data.caveat.en}`),
    distanceLy: nominalLy,
    distanceKm: nominalLy * KM_PER_LIGHT_YEAR,
    targetName: displayName,
    sourceLabel: data.sourceLabel
  };
}

function durationText(hours, language) {
  if (hours < 1 / 60) return tr(language, `${formatNumber(hours * 3600, language, 1)} segundos`, `${formatNumber(hours * 3600, language, 1)} seconds`);
  if (hours < 24) return tr(language, `${formatNumber(hours, language, 1)} horas`, `${formatNumber(hours, language, 1)} hours`);
  const days = hours / 24;
  if (days < 365.25) return tr(language, `${formatNumber(days, language, 1)} días`, `${formatNumber(days, language, 1)} days`);
  const years = days / 365.25;
  return tr(language, `${formatNumber(years, language, years > 1000 ? 0 : 2)} años`, `${formatNumber(years, language, years > 1000 ? 0 : 2)} years`);
}
function travelAnswerFromDistance({ distanceKm, distanceLy, targetName }, speedKey, language) {
  const speed = SPEED_PROFILES[speedKey] || SPEED_PROFILES.spacecraft;
  const km = Number.isFinite(distanceKm) ? distanceKm : Number.isFinite(distanceLy) ? distanceLy * KM_PER_LIGHT_YEAR : null;
  if (!Number.isFinite(km)) return { text: tr(language, 'Necesito conocer una distancia antes de calcular el viaje.', 'I need a distance before calculating the trip.') };
  const hours = km / speed.kmh;
  return {
    text: tr(language,
      `Hasta ${targetName || 'ese destino'}, usando una distancia aproximada de ${formatScientific(km, language)} km y ${speed.es}, el viaje tomaría cerca de ${durationText(hours, language)}. En la realidad, una misión no viaja en línea recta ni mantiene una velocidad constante, así que es solo una estimación.`,
      `To ${targetName || 'that destination'}, using an approximate distance of ${formatScientific(km, language)} km and ${speed.en}, the trip would take about ${durationText(hours, language)}. A real mission does not travel in a straight line or maintain constant speed, so this is only an estimate.`),
    speedProfile: speedKey, distanceKm: km, distanceLy: km / KM_PER_LIGHT_YEAR, targetName
  };
}

function comparisonPair(context, mentioned, language) {
  if (mentioned.length >= 2) return mentioned.slice(0, 2);
  const remembered = (context.lastComparisonPair || []).map((ref) => resolveRecord(ref, language)).filter(Boolean);
  if (mentioned.length === 1) {
    const last = (context.lastMentionedObjectIds || []).map((ref) => resolveRecord(ref, language)).filter(Boolean).at(-1);
    const candidate = remembered.find((r) => r.id !== mentioned[0].id) || (last?.id !== mentioned[0].id ? last : null) || (resolveRecord(context.currentObject, language)?.id !== mentioned[0].id ? resolveRecord(context.currentObject, language) : null);
    return candidate ? [mentioned[0], candidate] : [mentioned[0]];
  }
  if (remembered.length >= 2) return remembered.slice(-2);
  const current = resolveRecord(context.currentObject, language);
  const previous = resolveRecord(context.previousObject, language);
  return [current, previous].filter(Boolean).filter((r, i, a) => a.findIndex((x) => x.id === r.id && x.kind === r.kind) === i).slice(0,2);
}
function compareRecords(first, second, property, language) {
  const a = propertyValue(first, property); const b = propertyValue(second, property);
  if (a === null || b === null) return tr(language, `No tengo el dato de ${propertyLabel(property, language)} para ambos objetos.`, `I do not have ${propertyLabel(property, language)} data for both objects.`);
  const difference = Math.abs(a - b); const unit = propertyUnit(first, property, language);
  const greater = a === b ? null : (a > b ? first : second);
  const conclusion = greater
    ? tr(language, property === 'size' || property === 'diameter' ? `${greater.name} es más grande.` : `${greater.name} tiene el valor mayor.`, property === 'size' || property === 'diameter' ? `${greater.name} is larger.` : `${greater.name} has the greater value.`)
    : tr(language, 'Los dos valores aproximados son iguales.', 'The two approximate values are equal.');
  return tr(language,
    `${first.name}: ${formatScientific(a, language)} ${unit}. ${second.name}: ${formatScientific(b, language)} ${unit}. La diferencia absoluta es aproximadamente ${formatScientific(difference, language)} ${unit}. ${conclusion}`,
    `${first.name}: ${formatScientific(a, language)} ${unit}. ${second.name}: ${formatScientific(b, language)} ${unit}. The absolute difference is approximately ${formatScientific(difference, language)} ${unit}. ${conclusion}`);
}

function recordsForCategory(category, language) {
  return allRecords(language).filter((record) => record.kind === category);
}
function rankingAnswer(category, property, text, language) {
  let records = recordsForCategory(category, language).filter((record) => propertyValue(record, property) !== null);
  if (category === 'star' && property === 'distanceFromEarth' && includesAny(text, ['cerca','closest','nearest'])) records = records.filter((record) => record.id !== 'sun');
  if (!records.length) return NO_DATA[language];
  const wantsMinimum = includesAny(text, ['mas pequeno','mas fria','mas frio','mas cerca','menor','smallest','coldest','closest','least']);
  records.sort((a,b) => propertyValue(a, property) - propertyValue(b, property));
  const winner = wantsMinimum ? records[0] : records.at(-1);
  const value = propertyValue(winner, property);
  return tr(language,
    `${winner.name} es ${wantsMinimum ? 'el valor menor' : 'el valor mayor'} entre ${category === 'planet' ? 'los planetas' : category === 'star' ? 'las estrellas' : 'los fenómenos'} disponibles para ${propertyLabel(property, language)}, con aproximadamente ${formatScientific(value, language)} ${propertyUnit(winner, property, language)}.`,
    `${winner.name} has the ${wantsMinimum ? 'lowest' : 'highest'} ${propertyLabel(property, language)} among the available ${category === 'planet' ? 'planets' : category === 'star' ? 'stars' : 'phenomena'}, at approximately ${formatScientific(value, language)} ${propertyUnit(winner, property, language)}.`);
}

function fixedFeatureAnswer(intent, language) {
  const es = {
    'game-controls': 'En computadora usa Flechas o WASD para moverte, Espacio para disparar y P o Escape para pausar. En celular usa el joystick y el botón de disparo.',
    'game-difficulty': 'Normal está disponible primero. Completar Normal en un planeta desbloquea Difícil, con enemigos más rápidos, formaciones alternativas, élites, ataques extra del jefe y multiplicador ×1.5.',
    'game-unlock': 'Completa el nivel disponible para desbloquear el siguiente planeta. Completar Normal desbloquea Difícil en ese mismo planeta.',
    'game-score': 'La puntuación aumenta al destruir enemigos, mantener combos, completar oleadas, conservar vidas y derrotar al jefe. Normal y Difícil guardan récords separados.',
    music: 'En Music Space puedes reproducir tus canciones, cambiar de pista, pausar, usar el minirreproductor y controlar el volumen.',
    visualizer: 'Puedes cambiar el visualizador desde Music Space; el minirreproductor conserva la selección.',
    'mini-player': 'El minirreproductor puede mostrarse como barra inferior o como widget flotante con canción, pausa y volumen.'
  };
  const en = {
    'game-controls': 'On a computer, use Arrow keys or WASD to move, Space to fire, and P or Escape to pause. On mobile, use the joystick and fire button.',
    'game-difficulty': 'Normal is available first. Completing Normal on a planet unlocks Hard with faster enemies, alternate formations, elites, extra boss attacks, and a ×1.5 multiplier.',
    'game-unlock': 'Complete the available level to unlock the next planet. Completing Normal unlocks Hard on that same planet.',
    'game-score': 'Score increases by destroying enemies, maintaining combos, completing waves, preserving lives, and defeating the boss. Normal and Hard keep separate records.',
    music: 'In Music Space you can play your songs, change tracks, pause, use the mini-player, and control volume.',
    visualizer: 'You can change the visualizer in Music Space; the mini-player keeps the selection.',
    'mini-player': 'The mini-player can appear as a bottom bar or floating widget with track, pause, and volume controls.'
  };
  return (language === 'es' ? es : en)[intent] || null;
}
function sectionHelp(section, language) {
  const canonical = canonicalSection(section) || 'home';
  return SECTION_HELP[canonical]?.[language] || SECTION_HELP[canonical]?.en || SECTION_HELP.home[language] || SECTION_HELP.home.en;
}


export function getKiraObjectName(object, language = 'en') { return resolveRecord(object, language)?.name || String(object?.name || object?.id || ''); }
export function getKiraWelcome(context, language = 'en') {
  const current = resolveRecord(context.currentObject, language);
  if (current) return tr(language, `Estás explorando ${current.name}. Puedes preguntarme qué es, por sus propiedades, distancia o compararlo con otro objeto.`, `You are exploring ${current.name}. You can ask what it is, about its properties, distance, or compare it with another object.`);
  return sectionHelp(context.currentSection, language);
}
export function getKiraSuggestions(context, language = 'en') {
  const current = resolveRecord(context.currentObject, language);
  if (current?.kind === 'planet') return language === 'es' ? ['Información general','Temperatura','Distancia y viaje','Compáralo con el anterior'] : ['General information','Temperature','Distance and travel','Compare with the previous object'];
  if (current?.kind === 'star') return language === 'es' ? ['Información general','Tipo y temperatura','Distancia','Compárala con la anterior'] : ['General information','Type and temperature','Distance','Compare with the previous star'];
  if (current?.kind === 'gallery') return language === 'es' ? ['¿Qué es?','¿Cómo se forma?','¿Cuál es el ejemplo más cercano?','Comparar con otra escena'] : ['What is it?','How does it form?','What is the nearest example?','Compare with another scene'];
  if (context.currentSection === 'cosmic-defender') return language === 'es' ? ['¿Cómo disparo?','¿Cómo desbloqueo Difícil?','¿Cómo funciona la puntuación?','¿Qué enemigos aparecen aquí?'] : ['How do I fire?','How do I unlock Hard?','How does scoring work?','Which enemies appear here?'];
  if (context.currentSection === 'music-space') return language === 'es' ? ['¿Cómo subo canciones?','¿Cómo uso el minirreproductor?','¿Cómo cambio el visualizador?','¿Cómo ajusto el volumen?'] : ['How do I upload songs?','How do I use the mini-player?','How do I change the visualizer?','How do I adjust volume?'];
  return language === 'es' ? ['¿Qué es un púlsar?','¿Cuál es el agujero negro más cercano?','Háblame de la Tierra','¿Qué puedes hacer?'] : ['What is a pulsar?','What is the nearest known black hole?','Tell me about Earth','What can you do?'];
}

function memoryBase(analysis, records = []) {
  return {
    lastIntent: analysis.intent,
    lastProperty: analysis.property,
    lastCategory: analysis.category || records[0]?.kind || null,
    lastMentionedObjectIds: records.map(refFor).filter(Boolean)
  };
}
function answerContextFor(record, analysis, extras = {}) {
  return { intent: analysis.intent, property: analysis.property, targetId: record?.id || null, targetType: record?.kind || null, targetName: record?.name || extras.targetName || null, ...extras };
}

export function getKiraKnowledgeCoverage(language = 'es') {
  const records = allRecords(language);
  return {
    planets: records.filter((x) => x.kind === 'planet').map((x) => ({ id:x.id, hasDescription:Boolean(generalDescription(x, language)) })),
    stars: records.filter((x) => x.kind === 'star').map((x) => ({ id:x.id, hasDescription:Boolean(generalDescription(x, language)) })),
    gallery: records.filter((x) => x.kind === 'gallery').map((x) => ({ id:x.id, hasDescription:Boolean(generalDescription(x, language)), hasNearest:Boolean(x.nearestKnownExample) }))
  };
}


function resolvePronounRecord(text, context, language, lastMentioned, current, previous) {
  if (includesAny(text, ['el anterior','la anterior','previous one'])) return previous || lastMentioned.at(-2) || null;
  const pair = (context.lastComparisonPair || []).map((ref) => resolveRecord(ref, language)).filter(Boolean);
  if (includesAny(text, ['el primero','la primera','the first'])) return pair[0] || null;
  if (includesAny(text, ['el segundo','la segunda','the second'])) return pair[1] || null;
  if (includesAny(text, ['ese','esa','that one','it'])) return lastMentioned.at(-1) || current || null;
  return null;
}

function ambientSummary(language, context = {}) {
  const supplied = context.ambientAudioSummary;
  if (supplied) return supplied;
  if (typeof window !== 'undefined' && window.cosmicExplorerAmbientAudio?.getSummary) return window.cosmicExplorerAmbientAudio.getSummary(language);
  return {
    enabled:true,
    authorized:false,
    profileName:tr(language,'Equilibrado','Balanced'),
    soundName:tr(language,'Umbral de Cosmic Explorer','Cosmic Explorer Threshold'),
    audioType:'artistic-ambience',
    masterPercent:58,
    musicPercent:58,
    activeLayers:[
      tr(language,'Música relajante','Relaxing music'),
      tr(language,'Ambiente espacial','Space ambience'),
      tr(language,'Sonificación','Sonification')
    ],
    musicBehavior:'pause',
    scientificNote:null
  };
}

function ambientAnswer(intent, language, context = {}) {
  const summary = ambientSummary(language, context);
  const artistic = summary.audioType === 'artistic-ambience';
  const layerText = Array.isArray(summary.activeLayers) && summary.activeLayers.length
    ? summary.activeLayers.join(', ')
    : tr(language, 'ninguna capa activa', 'no active layers');
  const answers = {
    'ambient-enable': tr(language, 'Pulsa Activar sonido de Cosmic Explorer en la barra superior o abre Apariencia y entra en Sonido ambiental. El navegador esperará una interacción antes de comenzar.', 'Press Enable Cosmic Explorer sound in the top bar or open Appearance and choose Ambient sound. The browser waits for an interaction before starting audio.'),
    'ambient-current': tr(language, `Ahora suena ${summary.soundName} con el perfil ${summary.profileName}. Capas activas: ${layerText}.`, `${summary.soundName} is now playing with the ${summary.profileName} profile. Active layers: ${layerText}.`),
    'ambient-profile': tr(language, `Tienes activo el perfil sonoro ${summary.profileName}. El volumen general está en ${summary.masterPercent} % y la música relajante en ${summary.musicPercent ?? 0} %.`, `Your active sound profile is ${summary.profileName}. Master volume is ${summary.masterPercent}% and relaxing music is ${summary.musicPercent ?? 0}%.`),
    'ambient-volume': tr(language, 'Abre Apariencia, entra en Sonido ambiental y ajusta por separado Volumen general, Música relajante, Ambiente espacial, Sonificaciones científicas y Efectos ocasionales.', 'Open Appearance, choose Ambient sound, and separately adjust Master volume, Relaxing music, Space ambience, Scientific sonifications, and Occasional effects.'),
    'ambient-relaxing': tr(language, 'En Apariencia, abre Sonido ambiental, activa Música relajante y desactiva Ambiente espacial, Sonificaciones científicas y Efectos ocasionales. Así escucharás únicamente la capa musical.', 'In Appearance, open Ambient sound, enable Relaxing music, and disable Space ambience, Scientific sonifications, and Occasional effects. This leaves only the music layer playing.'),
    'ambient-intense': tr(language, 'Abre Apariencia, entra en Sonido ambiental y activa Reducir sonidos intensos. También puedes limitar el volumen máximo o desactivar los graves profundos.', 'Open Appearance, choose Ambient sound, and enable Reduce intense sounds. You can also limit maximum volume or disable deep bass.'),
    'ambient-scientific': tr(language, 'El modo Científico da prioridad a las sonificaciones procedurales y reduce la ambientación artística. Los sonidos siguen siendo interpretaciones audibles de características astronómicas, no sonido propagándose por el vacío.', 'Scientific mode prioritizes procedural sonification and reduces artistic ambience. The sounds remain audible interpretations of astronomical characteristics, not sound traveling through a vacuum.'),
    'ambient-music': tr(language, 'En Apariencia, dentro de Sonido ambiental, selecciona Pausar durante Music Space. Esa es la opción recomendada para que la canción y el ambiente no compitan.', 'In Appearance, under Ambient sound, select Pause during Music Space. This is the recommended option so the song and ambience do not compete.'),
    'ambient-real': artistic
      ? tr(language, 'No es una grabación literal del espacio. Es una ambientación artística inspirada en el objeto; en el vacío el sonido no se propaga como en una atmósfera.', 'It is not a literal recording from space. It is artistic ambience inspired by the object; sound does not propagate through a vacuum as it does in an atmosphere.')
      : tr(language, 'Es una sonificación procedural inspirada en datos o comportamientos astronómicos, no una grabación literal del objeto en el vacío.', 'It is a procedural sonification inspired by astronomical data or behavior, not a literal recording of the object in a vacuum.'),
    'ambient-why': summary.scientificNote
      ? tr(language, `${summary.soundName} utiliza una combinación relacionada con las características del objeto. ${summary.scientificNote}`, `${summary.soundName} uses a mix related to the object’s characteristics. ${summary.scientificNote}`)
      : tr(language, `${summary.soundName} fue diseñado para representar de forma artística las características visibles y físicas del objeto.`, `${summary.soundName} was designed to artistically represent the object’s visible and physical characteristics.`)
  };
  return answers[intent] || null;
}

function appearanceSummary(language, context = {}) {
  const supplied = context.appearanceSummary;
  if (supplied) return supplied;
  if (typeof window !== 'undefined' && window.cosmicExplorerAppearance?.getSummary) return window.cosmicExplorerAppearance.getSummary(language);
  return { themeName:'Cosmic Explorer Original', profileName:tr(language,'Equilibrado','Balanced'), backgroundName:tr(language,'Galaxia','Galaxy'), mode:'global' };
}

function appearanceAnswer(intent, language, context = {}) {
  const summary = appearanceSummary(language, context);
  const answers = {
    'appearance-current': tr(language, `Tienes activo ${summary.themeName} con el perfil ${summary.profileName} y el fondo ${summary.backgroundName}.`, `You are using ${summary.themeName} with the ${summary.profileName} profile and the ${summary.backgroundName} background.`),
    'appearance-background': tr(language, 'Abre Apariencia y entra en Fondos. Allí puedes previsualizar Sistema Solar, Agujero negro, Nebulosa, Galaxia, Espacio profundo, Supernova, Red cósmica o Interfaz Kira. Pulsa Aplicar para guardar el cambio.', 'Open Appearance and choose Backgrounds. You can preview Solar System, Black hole, Nebula, Galaxy, Deep space, Supernova, Cosmic web, or Kira Interface. Press Apply to save the change.'),
    'appearance-performance': tr(language, 'Abre Apariencia y entra en Efectos. Selecciona Rendimiento o reduce bloom, partículas, movimiento y desenfoque. La vista previa te permite comprobar el resultado antes de aplicarlo.', 'Open Appearance and choose Effects. Select Performance or reduce bloom, particles, motion, and blur. The live preview lets you check the result before applying it.'),
    'appearance-low-cost': tr(language, 'Espacio profundo con el perfil Rendimiento consume menos recursos: usa pocas partículas, movimiento mínimo, bloom reducido y paneles con poco desenfoque.', 'Deep space with the Performance profile uses the fewest resources: it has fewer particles, minimal motion, reduced bloom, and very little panel blur.'),
    'appearance-colors': tr(language, 'Abre Apariencia y entra en Colores. Puedes cambiar el acento, el color secundario y los paneles usando el selector visual, HEX o RGB. El panel te avisará si el contraste puede dificultar la lectura.', 'Open Appearance and choose Colors. You can change the accent, secondary color, and panels with the visual picker, HEX, or RGB. The panel will warn you if contrast may reduce readability.'),
    'appearance-original': tr(language, 'Abre Apariencia y pulsa Volver a Cosmic Explorer Original. También puedes usar Restaurar para recuperar solo el fondo, los colores, los efectos, la interfaz o la accesibilidad.', 'Open Appearance and press Return to Cosmic Explorer Original. You can also use Restore to recover only the background, colors, effects, interface, or accessibility settings.'),
    'appearance-section-mode': tr(language, 'Abre Apariencia, entra en Por sección y selecciona Tema por sección. Después elige Gallery y aplica allí el tema o fondo que prefieras sin cambiar las demás áreas.', 'Open Appearance, choose By section, and select Theme by section. Then choose Gallery and apply the theme or background you prefer without changing the other areas.'),
    'appearance-profile': tr(language, 'El perfil Rendimiento reduce de verdad partículas, bloom, movimiento, desenfoque, capas visuales y resolución de efectos. Es la opción recomendada para equipos o celulares con menos potencia.', 'The Performance profile genuinely reduces particles, bloom, motion, blur, visual layers, and effect resolution. It is recommended for less powerful computers or phones.')
  };
  return answers[intent] || null;
}

export function answerKiraQuestion(question, context = {}, language = 'en') {
  const fallback = FALLBACK[language] || FALLBACK.en;
  try {
    const analysis = detectIntent(question, { ...context, language });
    const text = analysis.text;
    const mentioned = findMentionedRecords(question, language);
    const current = resolveRecord(context.currentObject, language);
    const previous = resolveRecord(context.previousObject, language);
    const lastMentioned = (context.lastMentionedObjectIds || []).map((ref) => resolveRecord(ref, language)).filter(Boolean);

    if (analysis.intent === 'clear') return { text: tr(language, 'Historial temporal eliminado. El contexto actual se conserva.', 'Temporary history cleared. The current context is preserved.'), action:'clear', memoryPatch:{ lastMentionedObjectIds:[], lastComparisonPair:[], lastComparisonProperty:null, lastIntent:null, lastProperty:null, lastCategory:null, lastAnswerContext:null } };
    if (analysis.intent === 'greeting') return { text: tr(language, `¡Hola! Soy Kira. ${sectionHelp(context.currentSection, language)}`, `Hello! I am Kira. ${sectionHelp(context.currentSection, language)}`), memoryPatch:{ lastIntent:'greeting' } };
    if (analysis.intent.startsWith('ambient-')) {
      const answer = ambientAnswer(analysis.intent, language, context);
      return { text: answer || tr(language, 'Abre Apariencia y entra en Sonido ambiental para controlar la experiencia sonora.', 'Open Appearance and choose Ambient sound to control the sound experience.'), memoryPatch:{ lastIntent:analysis.intent, lastSection:'appearance', lastAnswerContext:{ intent:analysis.intent, section:'appearance' } } };
    }
    if (analysis.intent.startsWith('appearance-')) {
      const answer = appearanceAnswer(analysis.intent, language, context);
      return { text: answer || sectionHelp('appearance', language), memoryPatch:{ lastIntent:analysis.intent, lastSection:'appearance', lastAnswerContext:{ intent:analysis.intent, section:'appearance' } } };
    }
    if (analysis.intent === 'section-help') {
      const section = analysis.section || canonicalSection(context.currentSection) || canonicalSection(context.lastSection) || 'home';
      return { text: sectionHelp(section, language), memoryPatch:{ lastIntent:'section-help', lastSection:section, lastAnswerContext:{ intent:'section-help', section } } };
    }
    if (analysis.intent === 'assistant-capabilities') return { text: KIRA_CAPABILITIES[language] || KIRA_CAPABILITIES.en, memoryPatch:{ lastIntent:'assistant-capabilities', lastProperty:null } };
    if (analysis.intent === 'current-object') return { text: current ? tr(language, `Ahora estás observando ${current.name}.`, `You are currently viewing ${current.name}.`) : tr(language, 'Ahora mismo no hay un objeto detallado abierto.', 'There is no detailed object open right now.'), memoryPatch:{ lastIntent:'current-object', lastProperty:null } };
    if (analysis.intent === 'previous-object') return { text: previous ? tr(language, `El objeto anterior fue ${previous.name}.`, `The previous object was ${previous.name}.`) : tr(language, 'Todavía no has visitado otro objeto en esta sesión.', 'You have not visited another object in this session yet.'), memoryPatch:{ lastIntent:'previous-object', lastProperty:null } };

    const fixed = fixedFeatureAnswer(analysis.intent, language);
    if (fixed) return { text: fixed, memoryPatch:{ lastIntent:analysis.intent, lastProperty:null, lastCategory:context.currentSection } };

    if (analysis.intent === 'nearest-known') {
      let record = mentioned.find((x) => x.kind === 'gallery');
      if (!record && analysis.followUp && context.lastAnswerContext?.nearestCategoryId) record = resolveRecord({ id: context.lastAnswerContext.nearestCategoryId, type:'gallery' }, language);
      if (!record && current?.kind === 'gallery') record = current;
      if (!record) {
        const category = analysis.category;
        if (category === 'star') return { text: rankingAnswer('star','distanceFromEarth',text,language), memoryPatch:{...memoryBase(analysis), lastAnswerContext:{intent:'ranking',property:'distanceFromEarth',category:'star'}} };
        if (category === 'planet') return { text: tr(language, 'Las distancias de los planetas a la Tierra cambian. Entre los planetas distintos de la Tierra, Venus puede acercarse más según sus posiciones orbitales.', 'Planet distances from Earth change. Among planets other than Earth, Venus can come closest depending on orbital positions.'), memoryPatch:{...memoryBase(analysis), lastAnswerContext:{intent:'nearest-known',property:'distanceFromEarth',category:'planet'}} };
        return { text: tr(language, '¿Quieres el ejemplar conocido más cercano de qué categoría: agujero negro, púlsar, magnetar, cuásar, estrella Wolf–Rayet u otro fenómeno?', 'Which category do you mean: black hole, pulsar, magnetar, quasar, Wolf–Rayet star, or another phenomenon?'), memoryPatch:{...memoryBase(analysis)} };
      }
      const nearest = nearestKnownAnswer(record, language);
      return {
        text: nearest.text,
        memoryPatch: {
          ...memoryBase({ ...analysis, category:'gallery' }, [record]),
          lastAnswerContext: answerContextFor(record, analysis, { nearestCategoryId:record.id, targetName:nearest.targetName, distanceKm:nearest.distanceKm, distanceLy:nearest.distanceLy, sourceLabel:nearest.sourceLabel })
        }
      };
    }

    if (analysis.intent === 'ranking') {
      const category = categoryFromWords(text) || categoryFromContext(context) || context.lastCategory;
      if (!category || !['planet','star','gallery'].includes(category)) return { text: tr(language, '¿Te refieres a planetas, estrellas o fenómenos de Gallery?', 'Do you mean planets, stars, or Gallery phenomena?'), memoryPatch:{...memoryBase(analysis)} };
      const property = analysis.property || (includesAny(text,['cerca','closest']) ? 'distanceFromEarth' : 'size');
      const answer = rankingAnswer(category, property, text, language);
      return { text:answer, memoryPatch:{...memoryBase({...analysis,property,category}), lastAnswerContext:{intent:'ranking',property,category}} };
    }

    if (analysis.intent === 'compare') {
      const comparisonMentions = analysis.property === 'distanceFromSun' ? mentioned.filter((record) => !(record.kind === 'star' && record.id === 'sun')) : mentioned;
      const pair = comparisonPair(context, comparisonMentions, language);
      if (pair.length < 2) return { text: pair[0] ? tr(language, `¿Con qué otro objeto quieres comparar ${pair[0].name}?`, `Which other object would you like to compare with ${pair[0].name}?`) : tr(language, 'Indica los dos objetos que quieres comparar.', 'Please name the two objects you want to compare.'), memoryPatch:{...memoryBase(analysis,pair)} };
      const property = analysis.property && !['description','travelTime'].includes(analysis.property) ? analysis.property : (context.lastComparisonProperty || context.lastProperty || 'size');
      const response = compareRecords(pair[0], pair[1], property, language);
      return { text:response, memoryPatch:{...memoryBase({...analysis,property},pair), lastComparisonPair:pair.map(refFor), lastComparisonProperty:property, lastAnswerContext:{intent:'compare',property,entityIds:pair.map((x)=>x.id)}} };
    }

    if (analysis.intent === 'travel-time') {
      let targetRecord = mentioned.find((x) => x.id !== 'earth') || (analysis.followUp ? lastMentioned.at(-1) : null) || (current?.id !== 'earth' ? current : null);
      let distance = null;
      let targetName = targetRecord?.name || context.lastAnswerContext?.targetName;
      if (targetRecord) distance = distanceFromEarthAnswer(targetRecord, language);
      if ((!distance || (!distance.distanceKm && !distance.distanceLy)) && context.lastAnswerContext) distance = context.lastAnswerContext;
      if (!distance || (!Number.isFinite(distance.distanceKm) && !Number.isFinite(distance.distanceLy))) return { text: tr(language, 'Primero necesito saber el destino y su distancia. ¿Hasta dónde quieres viajar?', 'I first need a destination and its distance. Where do you want to travel?'), memoryPatch:{...memoryBase(analysis, targetRecord ? [targetRecord] : [])} };
      const travel = travelAnswerFromDistance({ ...distance, targetName }, analysis.speedProfile, language);
      return { text:travel.text, memoryPatch:{...memoryBase(analysis,targetRecord?[targetRecord]:[]), lastAnswerContext:{intent:'travel-time',property:'travelTime',targetId:targetRecord?.id || context.lastAnswerContext?.targetId || null,targetType:targetRecord?.kind || context.lastAnswerContext?.targetType || null,targetName:travel.targetName,distanceKm:travel.distanceKm,distanceLy:travel.distanceLy,speedProfile:travel.speedProfile,nearestCategoryId:context.lastAnswerContext?.nearestCategoryId || null}} };
    }

    if (analysis.intent === 'unknown' && mentioned.length === 0 && !analysis.followUp) {
      return { text:fallback, memoryPatch:{lastIntent:'unknown',lastProperty:null,lastCategory:context.lastCategory || null} };
    }
    const pronounRecord = resolvePronounRecord(text, context, language, lastMentioned, current, previous);
    let record = mentioned[0] || pronounRecord || (analysis.followUp ? lastMentioned.at(-1) : null) || current || lastMentioned.at(-1) || previous;
    if (!record && analysis.intent === 'unknown') return { text:fallback, memoryPatch:{lastIntent:'unknown',lastProperty:null,lastCategory:context.lastCategory || null} };
    if (!record) return { text: tr(language, 'No pude identificar el objeto. Escribe el nombre de un planeta, estrella o fenómeno de Gallery.', 'I could not identify the object. Type the name of a planet, star, or Gallery phenomenon.'), memoryPatch:{...memoryBase(analysis)} };

    if (analysis.intent === 'description') {
      const answer = generalDescription(record, language);
      return { text:answer, memoryPatch:{...memoryBase(analysis,[record]), lastAnswerContext:answerContextFor(record,analysis)} };
    }
    if (analysis.intent === 'formation') {
      const answer = entityPropertyAnswer(record,'formation',language);
      return { text:answer, memoryPatch:{...memoryBase(analysis,[record]), lastAnswerContext:answerContextFor(record,analysis)} };
    }
    if (analysis.intent === 'property') {
      const property = analysis.property || context.lastProperty;
      if (!property) return { text:tr(language, '¿Quieres saber su descripción, tamaño, temperatura, distancia o cómo se forma?', 'Would you like its description, size, temperature, distance, or formation?'), memoryPatch:{...memoryBase(analysis,[record])} };
      if (property === 'distanceFromEarth') {
        const distance = distanceFromEarthAnswer(record, language);
        return { text:distance.text, memoryPatch:{...memoryBase({...analysis,property},[record]), lastAnswerContext:answerContextFor(record,analysis,{distanceKm:distance.distanceKm,distanceLy:distance.distanceLy,distanceRangeKm:distance.distanceRangeKm})} };
      }
      const answer = entityPropertyAnswer(record, property, language);
      return { text:answer, memoryPatch:{...memoryBase({...analysis,property},[record]), lastAnswerContext:answerContextFor(record,analysis)} };
    }

    // A short follow-up such as “¿Y Marte?” inherits the previous property/intent.
    if (analysis.followUp && context.lastProperty) {
      const property = context.lastProperty;
      const answer = property === 'description' ? generalDescription(record,language) : entityPropertyAnswer(record,property,language);
      return { text:answer, memoryPatch:{...memoryBase({ ...analysis, intent:context.lastIntent || 'property', property },[record]), lastAnswerContext:answerContextFor(record,{...analysis,intent:context.lastIntent||'property',property})} };
    }

    return { text: generalDescription(record, language), memoryPatch:{...memoryBase({ ...analysis, intent:'description', property:'description' },[record]), lastAnswerContext:answerContextFor(record,{...analysis,intent:'description',property:'description'})} };
  } catch (error) {
    console.error('Kira could not answer the question:', error);
    return { text:fallback, error:true, memoryPatch:{lastIntent:'error'} };
  }
}
