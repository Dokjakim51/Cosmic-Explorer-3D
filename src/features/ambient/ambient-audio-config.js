const freeze = (value) => Object.freeze(value);

export const AMBIENT_AUDIO_STORAGE_KEY = 'cosmic-explorer-ambient-audio-v2';
export const LEGACY_AMBIENT_AUDIO_STORAGE_KEY = 'cosmic-explorer-ambient-audio-v1';
export const AMBIENT_AUDIO_VERSION = 2;

export const AMBIENT_SOUND_MODES = freeze({
  silent: freeze({ id:'silent', name:{ es:'Silencioso', en:'Silent' }, master:0, music:0, ambience:0, sonification:0, effects:0, density:0, transition:2.8 }),
  soft: freeze({ id:'soft', name:{ es:'Suave', en:'Soft' }, master:0.44, music:0.42, ambience:0.34, sonification:0.18, effects:0.16, density:0.45, transition:3.6 }),
  balanced: freeze({ id:'balanced', name:{ es:'Equilibrado', en:'Balanced' }, master:0.58, music:0.58, ambience:0.52, sonification:0.36, effects:0.30, density:0.74, transition:2.5 }),
  immersive: freeze({ id:'immersive', name:{ es:'Inmersivo', en:'Immersive' }, master:0.68, music:0.62, ambience:0.70, sonification:0.54, effects:0.46, density:1, transition:2.0 }),
  scientific: freeze({ id:'scientific', name:{ es:'Científico', en:'Scientific' }, master:0.60, music:0.20, ambience:0.34, sonification:0.76, effects:0.36, density:0.88, transition:2.6 }),
  relaxation: freeze({ id:'relaxation', name:{ es:'Relajación', en:'Relaxation' }, master:0.56, music:0.78, ambience:0.36, sonification:0.12, effects:0.08, density:0.38, transition:4.4 })
});

export const THEME_AUDIO_RECOMMENDATIONS = freeze({
  'cosmic-explorer-original':'balanced',
  'cosmic-violet':'relaxation',
  'solar-gold':'balanced',
  'event-horizon':'scientific',
  'frozen-neptune':'soft',
  'saturnian-elegance':'relaxation',
  'kira-interface':'soft'
});

export const DEFAULT_AMBIENT_AUDIO_SETTINGS = freeze({
  version: AMBIENT_AUDIO_VERSION,
  enabled: true,
  profile: 'balanced',
  masterVolume: 0.58,
  relaxingMusicVolume: 0.58,
  ambienceVolume: 0.52,
  sonificationVolume: 0.36,
  effectsVolume: 0.30,
  relaxingMusicEnabled: true,
  ambienceEnabled: true,
  sonificationEnabled: true,
  effectsEnabled: true,
  transitionDuration: 2.5,
  spatialAudio: true,
  reduceIntenseSounds: false,
  disableDeepBass: false,
  vibrationEnabled: false,
  maxVolume: 0.80,
  soundByObject: true,
  soundBySection: true,
  musicBehavior: 'pause',
  gameBehavior: 'reduce',
  perSectionProfiles: {},
  objectOverrides: {},
  applyThemeRecommendation: false,
  diagnosticsEnabled: false
});

const layer = (type, options = {}) => freeze({ type, channel:'ambience', gain:0.12, ...options });
const stemSources = (id, stem) => freeze([
  `/audio/ambient/${id}/${stem}.ogg`,
  `/audio/ambient/${id}/${stem}.mp3`
]);
const profile = (id, category, names, description, layers, options = {}) => freeze({
  id,
  category,
  names: freeze(names),
  description: freeze(description),
  audioType: options.audioType || 'artistic-ambience',
  scientificNote: options.scientificNote || null,
  intensity: options.intensity ?? 0.5,
  layers: freeze(layers),
  assets: freeze({
    music: freeze({ id:`${id}-music`, label:{ es:'Música relajante', en:'Relaxing music' }, sources:stemSources(id,'music'), loop:true, channel:'music' }),
    ambience: freeze({ id:`${id}-ambience`, label:{ es:'Ambiente artístico', en:'Artistic ambience' }, sources:stemSources(id,'ambience'), loop:true, channel:'ambience' }),
    sonification: freeze({ id:`${id}-sonification`, label:{ es:'Sonificación', en:'Sonification' }, sources:stemSources(id,'sonification'), loop:true, channel:'sonification' })
  }),
  mix: freeze({ music:1, ambience:1, sonification:1, effects:1, ...(options.mix || {}) }),
  ...options
});

const SECTION_PROFILES = {
  home: profile('section-home','section',{ es:'Umbral de Cosmic Explorer', en:'Cosmic Explorer Threshold' },{
    es:'Ambiente artístico tranquilo para comenzar el viaje.', en:'Calm artistic ambience for the beginning of the journey.'
  },[
    layer('drone',{ frequency:92, waveform:'sine', gain:0.10, filter:900, lfoRate:0.055, lfoDepth:0.18 }),
    layer('chime',{ channel:'effects', frequencies:[392,523.25,659.25], gain:0.055, interval:[9,16], duration:2.8, pan:0.35 }),
    layer('noise',{ gain:0.026, color:'pink', filter:1450, modulationRate:0.035 })
  ],{ intensity:0.24 }),
  universe: profile('section-universe','section',{ es:'Horizonte profundo', en:'Deep Horizon' },{
    es:'Ambiente artístico amplio y misterioso para explorar planetas y estrellas.', en:'Wide mysterious artistic ambience for exploring planets and stars.'
  },[
    layer('drone',{ frequency:54, waveform:'sine', gain:0.11, filter:700, lfoRate:0.025, lfoDepth:0.22 }),
    layer('orbit',{ channel:'sonification', frequency:168, secondFrequency:252, gain:0.035, orbitRate:0.035, filter:1800 }),
    layer('pulse',{ channel:'effects', frequency:330, waveform:'triangle', gain:0.035, interval:[7,13], duration:1.6 })
  ],{ intensity:0.32, audioType:'hybrid-data-inspired', scientificNote:'The pulse spacing is inspired by orbital periodicity, but this is not a literal recording.' }),
  gallery: profile('section-gallery','section',{ es:'Archivo de fenómenos', en:'Phenomena Archive' },{
    es:'Ambiente artístico científico para la galería cósmica.', en:'Scientific-styled artistic ambience for the cosmic gallery.'
  },[
    layer('drone',{ frequency:47, waveform:'triangle', gain:0.095, filter:820, lfoRate:0.04, lfoDepth:0.16 }),
    layer('noise',{ channel:'sonification', gain:0.03, color:'brown', filter:1050, modulationRate:0.06 }),
    layer('chime',{ channel:'effects', frequencies:[220,277.18,329.63], gain:0.035, interval:[10,18], duration:2.2 })
  ],{ intensity:0.35 }),
  favorites: profile('section-favorites','section',{ es:'Colección estelar', en:'Stellar Collection' },{
    es:'Ambiente artístico suave para revisar objetos guardados.', en:'Soft artistic ambience for browsing saved objects.'
  },[
    layer('drone',{ frequency:110, waveform:'sine', gain:0.075, filter:1100, lfoRate:0.045, lfoDepth:0.12 }),
    layer('chime',{ channel:'effects', frequencies:[440,554.37,659.25], gain:0.04, interval:[12,20], duration:2.4 })
  ],{ intensity:0.2 }),
  'music-space': profile('section-music-space','section',{ es:'Antesala musical', en:'Music Antechamber' },{
    es:'Textura mínima que se pausa de forma predeterminada cuando una canción está activa.', en:'Minimal texture that pauses by default while a song is playing.'
  },[
    layer('drone',{ frequency:130.81, waveform:'sine', gain:0.045, filter:1350, lfoRate:0.07, lfoDepth:0.08 })
  ],{ intensity:0.12 }),
  'cosmic-defender': profile('section-cosmic-defender','section',{ es:'Sala de lanzamiento', en:'Launch Bay' },{
    es:'Ambiente suave para el selector; durante la partida el audio del juego tiene prioridad.', en:'Soft selector ambience; game audio takes priority during play.'
  },[
    layer('drone',{ frequency:65.41, waveform:'sawtooth', gain:0.055, filter:650, lfoRate:0.08, lfoDepth:0.1 }),
    layer('pulse',{ channel:'effects', frequency:261.63, waveform:'square', gain:0.026, interval:[5.5,8.5], duration:0.16 })
  ],{ intensity:0.18 }),
  appearance: profile('section-appearance','section',{ es:'Laboratorio visual', en:'Visual Laboratory' },{
    es:'Ambiente futurista ligero para previsualizar configuraciones.', en:'Light futuristic ambience for previewing settings.'
  },[
    layer('drone',{ frequency:146.83, waveform:'triangle', gain:0.052, filter:1600, lfoRate:0.09, lfoDepth:0.1 }),
    layer('pulse',{ channel:'sonification', frequency:587.33, waveform:'sine', gain:0.018, interval:[6,10], duration:0.4, pan:0.4 })
  ],{ intensity:0.16 })
};

const PLANET_PROFILES = {
  mercury: profile('planet-mercury','planet',{ es:'Mercurio · Hierro solar', en:'Mercury · Solar Iron' },{
    es:'Ambientación artística seca, metálica y cercana al Sol.', en:'Dry metallic artistic ambience close to the Sun.'
  },[
    layer('drone',{ frequency:72, waveform:'triangle', gain:0.07, filter:760, lfoRate:0.11, lfoDepth:0.1 }),
    layer('pulse',{ channel:'sonification', frequency:440, waveform:'square', gain:0.034, interval:[3.8,6.5], duration:0.09, pan:0.18 }),
    layer('noise',{ channel:'effects', gain:0.026, color:'brown', filter:2400, modulationRate:0.15 })
  ],{ intensity:0.34, audioType:'hybrid-data-inspired', scientificNote:'Pulse rate is mapped from Mercury’s short orbital period; the texture is artistic.' }),
  venus: profile('planet-venus','planet',{ es:'Venus · Velo de presión', en:'Venus · Pressure Veil' },{
    es:'Ambientación artística grave y densa inspirada en su atmósfera y presión.', en:'Dense low artistic ambience inspired by its atmosphere and pressure.'
  },[
    layer('drone',{ frequency:48, waveform:'sawtooth', gain:0.09, filter:430, lfoRate:0.035, lfoDepth:0.2 }),
    layer('noise',{ gain:0.045, color:'brown', filter:620, modulationRate:0.05 }),
    layer('pulse',{ channel:'effects', frequency:185, waveform:'triangle', gain:0.026, interval:[7,12], duration:1.1 })
  ],{ intensity:0.42 }),
  earth: profile('planet-earth','planet',{ es:'Tierra · Mundo vivo', en:'Earth · Living World' },{
    es:'Ambientación artística equilibrada con viento y océano sintetizados.', en:'Balanced artistic ambience with synthesized wind and ocean textures.'
  },[
    layer('noise',{ gain:0.038, color:'pink', filter:1250, modulationRate:0.025 }),
    layer('drone',{ frequency:98, waveform:'sine', gain:0.055, filter:1500, lfoRate:0.06, lfoDepth:0.12 }),
    layer('chime',{ channel:'effects', frequencies:[329.63,440,493.88], gain:0.026, interval:[11,18], duration:2.1, pan:0.2 })
  ],{ intensity:0.26 }),
  mars: profile('planet-mars','planet',{ es:'Marte · Viento rojo', en:'Mars · Red Wind' },{
    es:'Ambientación artística inspirada en viento marciano, arena y aislamiento.', en:'Artistic ambience inspired by Martian wind, dust, and isolation.'
  },[
    layer('noise',{ gain:0.046, color:'pink', filter:870, modulationRate:0.075, panRate:0.025 }),
    layer('drone',{ frequency:58, waveform:'sine', gain:0.065, filter:720, lfoRate:0.045, lfoDepth:0.18 }),
    layer('pulse',{ channel:'sonification', frequency:146.83, waveform:'triangle', gain:0.024, interval:[8,14], duration:0.7 })
  ],{ intensity:0.34, audioType:'hybrid-data-inspired', scientificNote:'The wind-like layer is synthesized and inspired by Mars atmospheric measurements, not a literal outdoor recording.' }),
  jupiter: profile('planet-jupiter','planet',{ es:'Júpiter · Núcleo de tormenta', en:'Jupiter · Storm Core' },{
    es:'Mezcla procedural inspirada en tormentas, radioemisiones y magnetosfera.', en:'Procedural mix inspired by storms, radio emissions, and the magnetosphere.'
  },[
    layer('drone',{ frequency:36, waveform:'sawtooth', gain:0.09, filter:390, lfoRate:0.023, lfoDepth:0.25 }),
    layer('orbit',{ channel:'sonification', frequency:116, secondFrequency:174, gain:0.052, orbitRate:0.14, filter:1450 }),
    layer('burst',{ channel:'effects', frequency:92, gain:0.045, interval:[8,15], duration:1.4, noise:true, pan:0.55 })
  ],{ intensity:0.55, audioType:'data-inspired-sonification', scientificNote:'Parameters evoke radio and plasma-wave behavior; no direct NASA/ESA recording is embedded.' }),
  saturn: profile('planet-saturn','planet',{ es:'Saturno · Resonancia orbital', en:'Saturn · Orbital Resonance' },{
    es:'Ambientación artística elegante con paneo circular y resonancias suaves.', en:'Elegant artistic ambience with circular panning and soft resonances.'
  },[
    layer('orbit',{ frequency:130.81, secondFrequency:196, gain:0.055, orbitRate:0.055, filter:1850 }),
    layer('drone',{ frequency:65.41, waveform:'sine', gain:0.052, filter:920, lfoRate:0.035, lfoDepth:0.16 }),
    layer('chime',{ channel:'effects', frequencies:[261.63,392,523.25], gain:0.03, interval:[9,15], duration:2.8, pan:0.6 })
  ],{ intensity:0.34 }),
  uranus: profile('planet-uranus','planet',{ es:'Urano · Cristal inclinado', en:'Uranus · Tilted Crystal' },{
    es:'Ambientación artística fría, cristalina y asimétrica.', en:'Cold crystalline and asymmetric artistic ambience.'
  },[
    layer('drone',{ frequency:104, waveform:'sine', gain:0.048, filter:2100, lfoRate:0.08, lfoDepth:0.12 }),
    layer('chime',{ channel:'sonification', frequencies:[415.3,622.25,830.61], gain:0.034, interval:[7,13], duration:2.2, pan:0.7 }),
    layer('noise',{ gain:0.018, color:'white', filter:3200, modulationRate:0.04 })
  ],{ intensity:0.28 }),
  neptune: profile('planet-neptune','planet',{ es:'Neptuno · Viento oscuro', en:'Neptune · Dark Wind' },{
    es:'Ambientación artística fría y dinámica inspirada en vientos extremos.', en:'Cold dynamic artistic ambience inspired by extreme winds.'
  },[
    layer('noise',{ gain:0.052, color:'pink', filter:1150, modulationRate:0.16, panRate:0.08 }),
    layer('drone',{ frequency:41, waveform:'triangle', gain:0.072, filter:540, lfoRate:0.06, lfoDepth:0.22 }),
    layer('pulse',{ channel:'effects', frequency:220, waveform:'sawtooth', gain:0.028, interval:[4.5,8], duration:0.28, pan:0.45 })
  ],{ intensity:0.46 })
};

const STAR_PROFILE_DATA = {
  sun:[82.41,0.09,0.12,'warm'], sirius:[220,0.14,0.2,'blue'], vega:[196,0.12,0.17,'blue'], betelgeuse:[49,0.045,0.28,'red'], rigel:[174.61,0.13,0.22,'blue'], polaris:[110,0.075,0.15,'variable'], 'proxima-centauri':[61.74,0.055,0.18,'red'], antares:[43.65,0.04,0.3,'red']
};
const STAR_NAMES = {
  sun:{ es:'Sol', en:'Sun' }, sirius:{ es:'Sirio', en:'Sirius' }, vega:{ es:'Vega', en:'Vega' }, betelgeuse:{ es:'Betelgeuse', en:'Betelgeuse' }, rigel:{ es:'Rigel', en:'Rigel' }, polaris:{ es:'Polaris', en:'Polaris' }, 'proxima-centauri':{ es:'Próxima Centauri', en:'Proxima Centauri' }, antares:{ es:'Antares', en:'Antares' }
};
const STAR_PROFILES = Object.fromEntries(Object.entries(STAR_PROFILE_DATA).map(([id,[frequency,pulseRate,depth,kind]]) => [id, profile(`star-${id}`,'star',{
  es:`${STAR_NAMES[id].es} · Firma estelar`, en:`${STAR_NAMES[id].en} · Stellar Signature`
},{
  es:`Sonificación procedural inspirada en la temperatura, el color y la etapa de ${STAR_NAMES[id].es}.`, en:`Procedural sonification inspired by the temperature, color, and life stage of ${STAR_NAMES[id].en}.`
},[
  layer('drone',{ channel:'sonification', frequency, waveform:kind === 'blue' ? 'sawtooth' : kind === 'red' ? 'sine' : 'triangle', gain:0.062, filter:kind === 'blue' ? 2600 : kind === 'red' ? 720 : 1500, lfoRate:pulseRate, lfoDepth:depth }),
  layer('pulse',{ channel:'sonification', frequency:frequency * (kind === 'blue' ? 4 : 2), waveform:'sine', gain:0.025, interval:kind === 'variable' ? [2.8,4.2] : kind === 'blue' ? [4,7] : [7,12], duration:kind === 'blue' ? 0.22 : 0.75, pan:0.35 }),
  layer('noise',{ channel:'ambience', gain:kind === 'blue' ? 0.026 : 0.018, color:kind === 'red' ? 'brown':'pink', filter:kind === 'blue' ? 3400:1100, modulationRate:pulseRate/2 })
],{ intensity:kind === 'blue' ? 0.5 : kind === 'red' ? 0.34 : 0.4, audioType:'data-inspired-sonification', scientificNote:'Pitch and pulse parameters are mapped from locally stored stellar properties; this is not a telescope recording.' })]));

const GALLERY_PROFILES = {
  'black-hole-accretion-disk': profile('gallery-black-hole-accretion-disk','gallery',{ es:'Agujero negro · Disco de acreción', en:'Black Hole · Accretion Disk' },{ es:'Graves, rotación y distorsión procedural.', en:'Procedural low frequencies, rotation, and distortion.' },[
    layer('drone',{ frequency:31, waveform:'sawtooth', gain:0.085, filter:360, lfoRate:0.018, lfoDepth:0.3 }), layer('orbit',{ channel:'sonification', frequency:88, secondFrequency:132, gain:0.045, orbitRate:0.11, filter:1200 }), layer('noise',{ channel:'effects', gain:0.022, color:'brown', filter:520, modulationRate:0.05 })
  ],{ intensity:0.52, audioType:'data-inspired-sonification', scientificNote:'Inspired by black-hole data sonification practices; no external recording is embedded.' }),
  quasar: profile('gallery-quasar','gallery',{ es:'Cuásar · Faro energético', en:'Quasar · Energetic Beacon' },{ es:'Ambiente intenso con zumbido, pulsos y chorros sintetizados.', en:'Energetic ambience with synthesized hum, pulses, and jets.' },[
    layer('drone',{ frequency:55, waveform:'sawtooth', gain:0.075, filter:980, lfoRate:0.07, lfoDepth:0.22 }), layer('pulse',{ channel:'sonification', frequency:440, waveform:'square', gain:0.038, interval:[2.7,4.8], duration:0.15, pan:0.45 }), layer('burst',{ channel:'effects', frequency:180, gain:0.035, interval:[8,13], duration:1.1, noise:true })
  ],{ intensity:0.57 }),
  blazar: profile('gallery-blazar','gallery',{ es:'Blázar · Chorro frontal', en:'Blazar · Forward Jet' },{ es:'Pulsos rápidos y paneo direccional.', en:'Rapid pulses and directional panning.' },[
    layer('drone',{ frequency:74, waveform:'triangle', gain:0.06, filter:1450, lfoRate:0.12, lfoDepth:0.18 }), layer('pulse',{ channel:'sonification', frequency:660, waveform:'square', gain:0.04, interval:[1.8,3.2], duration:0.09, pan:0.85 }), layer('burst',{ channel:'effects', frequency:260, gain:0.026, interval:[6,10], duration:0.6, pan:0.75 })
  ],{ intensity:0.62 }),
  'tidal-disruption-event': profile('gallery-tidal-disruption-event','gallery',{ es:'Disrupción de marea', en:'Tidal Disruption Event' },{ es:'Tensión creciente, ruptura y materia arrastrada.', en:'Rising tension, rupture, and stretched matter.' },[
    layer('drone',{ frequency:46, waveform:'sawtooth', gain:0.07, filter:680, lfoRate:0.045, lfoDepth:0.3 }), layer('orbit',{ frequency:120, secondFrequency:181, gain:0.038, orbitRate:0.2, filter:1500 }), layer('burst',{ channel:'effects', frequency:95, gain:0.043, interval:[9,15], duration:1.5, noise:true })
  ],{ intensity:0.58 }),
  pulsar: profile('gallery-pulsar','gallery',{ es:'Púlsar · Faro regular', en:'Pulsar · Regular Beacon' },{ es:'Pulsos regulares inspirados en una estrella de neutrones giratoria.', en:'Regular pulses inspired by a rotating neutron star.' },[
    layer('drone',{ frequency:70, waveform:'sine', gain:0.036, filter:900, lfoRate:0.14, lfoDepth:0.12 }), layer('pulse',{ channel:'sonification', frequency:880, waveform:'square', gain:0.052, interval:[0.9,1.05], duration:0.045, pan:0.5 })
  ],{ intensity:0.45, audioType:'data-inspired-sonification', scientificNote:'Regular timing illustrates pulsar periodicity but is not a recording of one specific pulsar.' }),
  magnetar: profile('gallery-magnetar','gallery',{ es:'Magnetar · Pulso magnético', en:'Magnetar · Magnetic Pulse' },{ es:'Vibraciones tensas y descargas profundas controladas.', en:'Tense vibrations and controlled deep discharges.' },[
    layer('drone',{ frequency:39, waveform:'square', gain:0.064, filter:480, lfoRate:0.09, lfoDepth:0.24 }), layer('pulse',{ channel:'sonification', frequency:330, waveform:'sawtooth', gain:0.038, interval:[2.4,4.1], duration:0.18, pan:0.35 }), layer('burst',{ channel:'effects', frequency:72, gain:0.04, interval:[10,18], duration:0.8, noise:true })
  ],{ intensity:0.6 }),
  supernova: profile('gallery-supernova','gallery',{ es:'Supernova · Expansión', en:'Supernova · Expansion' },{ es:'Acumulación suave, expansión y resonancia final sin picos molestos.', en:'Gentle buildup, expansion, and after-resonance without harsh peaks.' },[
    layer('drone',{ frequency:52, waveform:'triangle', gain:0.065, filter:900, lfoRate:0.035, lfoDepth:0.28 }), layer('burst',{ channel:'effects', frequency:110, gain:0.055, interval:[12,20], duration:2.6, noise:true, pan:0.25 }), layer('chime',{ channel:'sonification', frequencies:[220,330,440,660], gain:0.025, interval:[8,14], duration:2.2 })
  ],{ intensity:0.63 }),
  'supernova-remnant': profile('gallery-supernova-remnant','gallery',{ es:'Remanente · Eco expansivo', en:'Remnant · Expanding Echo' },{ es:'Ecos lentos, polvo y resonancia distante.', en:'Slow echoes, dust, and distant resonance.' },[
    layer('drone',{ frequency:63, waveform:'sine', gain:0.055, filter:760, lfoRate:0.025, lfoDepth:0.18 }), layer('noise',{ gain:0.032, color:'pink', filter:980, modulationRate:0.03 }), layer('chime',{ channel:'effects', frequencies:[174.61,261.63,349.23], gain:0.026, interval:[10,17], duration:3.1, pan:0.55 })
  ],{ intensity:0.36 }),
  'neutron-star-merger-kilonova': profile('gallery-neutron-star-merger-kilonova','gallery',{ es:'Kilonova · Choque denso', en:'Kilonova · Dense Collision' },{ es:'Dos patrones convergen en un pulso breve y pesado.', en:'Two patterns converge into a brief dense pulse.' },[
    layer('orbit',{ frequency:93, secondFrequency:139.5, gain:0.05, orbitRate:0.24, filter:980 }), layer('pulse',{ channel:'sonification', frequency:523.25, waveform:'triangle', gain:0.035, interval:[2.1,3.8], duration:0.15 }), layer('burst',{ channel:'effects', frequency:80, gain:0.05, interval:[10,16], duration:1.2, noise:true })
  ],{ intensity:0.66 }),
  'protostar-protoplanetary-disk': profile('gallery-protostar-protoplanetary-disk','gallery',{ es:'Protoestrella · Nacimiento orbital', en:'Protostar · Orbital Birth' },{ es:'Partículas suaves, órbita y sensación de formación.', en:'Soft particles, orbit, and a sense of formation.' },[
    layer('orbit',{ frequency:146.83, secondFrequency:220, gain:0.042, orbitRate:0.045, filter:1700 }), layer('noise',{ gain:0.025, color:'pink', filter:1550, modulationRate:0.035 }), layer('chime',{ channel:'effects', frequencies:[293.66,440,587.33], gain:0.025, interval:[9,16], duration:2.5 })
  ],{ intensity:0.3 }),
  'planetary-nebula': profile('gallery-planetary-nebula','gallery',{ es:'Nebulosa planetaria · Capas etéreas', en:'Planetary Nebula · Ethereal Layers' },{ es:'Capas suaves y expansión luminosa.', en:'Soft layers and luminous expansion.' },[
    layer('drone',{ frequency:123.47, waveform:'sine', gain:0.052, filter:1900, lfoRate:0.033, lfoDepth:0.14 }), layer('chime',{ channel:'sonification', frequencies:[369.99,493.88,739.99], gain:0.032, interval:[7,13], duration:3.2, pan:0.65 }), layer('noise',{ gain:0.015, color:'white', filter:3600, modulationRate:0.025 })
  ],{ intensity:0.27 }),
  'cosmic-web': profile('gallery-cosmic-web','gallery',{ es:'Red cósmica · Nodos lentos', en:'Cosmic Web · Slow Nodes' },{ es:'Pulsos muy lentos conectan nodos a gran escala.', en:'Very slow pulses connect immense-scale nodes.' },[
    layer('drone',{ frequency:34, waveform:'sine', gain:0.07, filter:500, lfoRate:0.012, lfoDepth:0.25 }), layer('orbit',{ channel:'sonification', frequency:102, secondFrequency:153, gain:0.028, orbitRate:0.018, filter:1000 }), layer('pulse',{ channel:'effects', frequency:204, waveform:'sine', gain:0.02, interval:[12,21], duration:2.2 })
  ],{ intensity:0.31 }),
  'wolf-rayet-star': profile('gallery-wolf-rayet-star','gallery',{ es:'Wolf–Rayet · Viento estelar', en:'Wolf–Rayet · Stellar Wind' },{ es:'Viento fuerte, pérdida de masa y energía continua.', en:'Strong wind, mass loss, and continuous energy.' },[
    layer('noise',{ gain:0.05, color:'white', filter:2200, modulationRate:0.12, panRate:0.045 }), layer('drone',{ frequency:82.41, waveform:'sawtooth', gain:0.058, filter:1600, lfoRate:0.1, lfoDepth:0.2 }), layer('pulse',{ channel:'sonification', frequency:659.25, waveform:'triangle', gain:0.027, interval:[3.5,6], duration:0.22 })
  ],{ intensity:0.55 }),
  'vampire-star-system': profile('gallery-vampire-star-system','gallery',{ es:'Sistema vampiro · Transferencia dual', en:'Vampire System · Dual Transfer' },{ es:'Dos patrones orbitales representan transferencia de materia.', en:'Two orbital patterns represent matter transfer.' },[
    layer('orbit',{ frequency:110, secondFrequency:164.81, gain:0.052, orbitRate:0.09, filter:1600 }), layer('pulse',{ channel:'sonification', frequency:329.63, waveform:'sine', gain:0.026, interval:[3,5], duration:0.3, pan:0.7 }), layer('noise',{ gain:0.018, color:'pink', filter:1800, modulationRate:0.08 })
  ],{ intensity:0.42 }),
  'herbig-haro-stellar-jet': profile('gallery-herbig-haro-stellar-jet','gallery',{ es:'Herbig–Haro · Chorro joven', en:'Herbig–Haro · Young Jet' },{ es:'Flujo rápido y pulsos de materia sintetizados.', en:'Synthesized rapid flow and matter pulses.' },[
    layer('noise',{ gain:0.038, color:'pink', filter:2400, modulationRate:0.18, panRate:0.12 }), layer('pulse',{ channel:'sonification', frequency:392, waveform:'sawtooth', gain:0.032, interval:[2.2,4], duration:0.2, pan:0.75 }), layer('drone',{ frequency:73.42, waveform:'triangle', gain:0.045, filter:1050, lfoRate:0.08, lfoDepth:0.15 })
  ],{ intensity:0.48 }),
  'gamma-ray-burst': profile('gallery-gamma-ray-burst','gallery',{ es:'Estallido gamma · Pulso breve', en:'Gamma-Ray Burst · Brief Pulse' },{ es:'Acumulación breve, pulso rápido y resonancia posterior controlada.', en:'Brief buildup, rapid pulse, and controlled after-resonance.' },[
    layer('drone',{ frequency:68, waveform:'sine', gain:0.045, filter:1000, lfoRate:0.055, lfoDepth:0.2 }), layer('pulse',{ channel:'sonification', frequency:1046.5, waveform:'square', gain:0.045, interval:[4.2,7.5], duration:0.055, pan:0.4 }), layer('burst',{ channel:'effects', frequency:145, gain:0.052, interval:[13,22], duration:1.8, noise:true, pan:0.3 })
  ],{ intensity:0.7 })
};

export const AMBIENT_AUDIO_PROFILES = freeze({
  sections: freeze(SECTION_PROFILES),
  planets: freeze(PLANET_PROFILES),
  stars: freeze(STAR_PROFILES),
  gallery: freeze(GALLERY_PROFILES)
});

export const ALL_AMBIENT_PROFILES = freeze(Object.fromEntries(
  [...Object.values(SECTION_PROFILES), ...Object.values(PLANET_PROFILES), ...Object.values(STAR_PROFILES), ...Object.values(GALLERY_PROFILES)]
    .map((item) => [item.id, item])
));

export function resolveAmbientProfile({ section = 'home', objectId = null, objectType = null, settings = DEFAULT_AMBIENT_AUDIO_SETTINGS } = {}) {
  const override = objectId && settings.objectOverrides?.[objectId];
  if (override && ALL_AMBIENT_PROFILES[override]) return ALL_AMBIENT_PROFILES[override];
  if (settings.soundByObject && objectId) {
    if (objectType === 'planet' && PLANET_PROFILES[objectId]) return PLANET_PROFILES[objectId];
    if (objectType === 'star' && STAR_PROFILES[objectId]) return STAR_PROFILES[objectId];
    if (['gallery','gallery-object'].includes(objectType) && GALLERY_PROFILES[objectId]) return GALLERY_PROFILES[objectId];
  }
  const sectionId = settings.soundBySection ? section : 'home';
  return SECTION_PROFILES[sectionId] || SECTION_PROFILES.home;
}

export function sanitizeAmbientSettings(candidate = {}) {
  const validMode = AMBIENT_SOUND_MODES[candidate.profile] ? candidate.profile : 'balanced';
  const mode = AMBIENT_SOUND_MODES[validMode];
  const clamp = (value, fallback, max = 1) => Math.min(max, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : fallback));
  const validBehavior = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  const perSectionProfiles = {};
  for (const [key,value] of Object.entries(candidate.perSectionProfiles || {})) if (AMBIENT_SOUND_MODES[value]) perSectionProfiles[key] = value;
  const objectOverrides = {};
  for (const [key,value] of Object.entries(candidate.objectOverrides || {})) if (ALL_AMBIENT_PROFILES[value]) objectOverrides[key] = value;
  const intentionallySilent = candidate.profile === 'silent' || candidate.enabled === false;
  const migratedMaster = !intentionallySilent && Number(candidate.version || 1) < 2 && Number(candidate.masterVolume) <= 0.08 ? mode.master : candidate.masterVolume;
  const migratedAmbience = !intentionallySilent && Number(candidate.version || 1) < 2 && Number(candidate.ambienceVolume) <= 0.08 ? mode.ambience : candidate.ambienceVolume;
  return {
    version: AMBIENT_AUDIO_VERSION,
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
    profile: validMode,
    masterVolume: clamp(migratedMaster, mode.master),
    relaxingMusicVolume: clamp(candidate.relaxingMusicVolume, mode.music),
    ambienceVolume: clamp(migratedAmbience, mode.ambience),
    sonificationVolume: clamp(candidate.sonificationVolume, mode.sonification),
    effectsVolume: clamp(candidate.effectsVolume, mode.effects),
    relaxingMusicEnabled: typeof candidate.relaxingMusicEnabled === 'boolean' ? candidate.relaxingMusicEnabled : true,
    ambienceEnabled: typeof candidate.ambienceEnabled === 'boolean' ? candidate.ambienceEnabled : true,
    sonificationEnabled: typeof candidate.sonificationEnabled === 'boolean' ? candidate.sonificationEnabled : true,
    effectsEnabled: typeof candidate.effectsEnabled === 'boolean' ? candidate.effectsEnabled : true,
    transitionDuration: clamp(candidate.transitionDuration, mode.transition, 8),
    spatialAudio: typeof candidate.spatialAudio === 'boolean' ? candidate.spatialAudio : true,
    reduceIntenseSounds: Boolean(candidate.reduceIntenseSounds),
    disableDeepBass: Boolean(candidate.disableDeepBass),
    vibrationEnabled: Boolean(candidate.vibrationEnabled),
    maxVolume: clamp(candidate.maxVolume, 0.80),
    soundByObject: typeof candidate.soundByObject === 'boolean' ? candidate.soundByObject : true,
    soundBySection: typeof candidate.soundBySection === 'boolean' ? candidate.soundBySection : true,
    musicBehavior: validBehavior(candidate.musicBehavior, ['pause','reduce','mix','off'], 'pause'),
    gameBehavior: validBehavior(candidate.gameBehavior, ['pause','reduce','mix'], 'reduce'),
    perSectionProfiles,
    objectOverrides,
    applyThemeRecommendation: Boolean(candidate.applyThemeRecommendation),
    diagnosticsEnabled: Boolean(candidate.diagnosticsEnabled)
  };
}

export function settingsForMode(modeId, existing = DEFAULT_AMBIENT_AUDIO_SETTINGS) {
  const mode = AMBIENT_SOUND_MODES[modeId] || AMBIENT_SOUND_MODES.balanced;
  return sanitizeAmbientSettings({
    ...existing,
    profile: mode.id,
    masterVolume: mode.master,
    relaxingMusicVolume: mode.music,
    ambienceVolume: mode.ambience,
    sonificationVolume: mode.sonification,
    effectsVolume: mode.effects,
    transitionDuration: mode.transition,
    enabled: mode.id !== 'silent'
  });
}
