const group = (type, count, options = {}) => ({ type, count, ...options });
const wave = (name, formation, groups, options = {}) => ({ name, formation, groups, ...options });

export const DIFFICULTIES = Object.freeze({
  normal: Object.freeze({
    id: 'normal', label: 'Normal', speed: 1, hp: 1, fireRate: 1, bulletSpeed: 1,
    extraEnemies: 0, scoreMultiplier: 1, eliteChance: 0, bossPhaseBonus: false
  }),
  hard: Object.freeze({
    id: 'hard', label: 'Hard', speed: 1.2, hp: 1.35, fireRate: 0.7, bulletSpeed: 1.23,
    extraEnemies: 2, scoreMultiplier: 1.5, eliteChance: 0.28, bossPhaseBonus: true
  })
});

export const LEVEL_DEFINITIONS = Object.freeze({
  mercury: {
    id: 'mercury', name: 'Mercury', world: 'Iron Furnace', order: 1,
    identity: 'Iron swarm', accent: '#cbd5e1', colors: ['#07080d','#3f4654','#f59e0b','#e2e8f0'],
    description: 'Compact heat-proof drones and metallic fragments attack with direct, readable patterns.',
    event: 'meteor',
    enemies: {
      basic: { name:'Cinder Drone', role:'basic', shape:'mercury-drone', hp:1, speed:1, size:[34,28], movement:'direct', weapon:'straight', fireRate:2.5, score:110 },
      fast: { name:'Falling Shard', role:'fast', shape:'mercury-shard', hp:1, speed:1.55, size:[22,34], movement:'dive', weapon:'none', fireRate:9, score:140 },
      tank: { name:'Iron Bulwark', role:'tank', shape:'mercury-bulwark', hp:4, speed:.65, size:[48,38], movement:'stagger', weapon:'burst', fireRate:3.1, score:260 },
      shooter: { name:'Solar Riveter', role:'shooter', shape:'mercury-riveter', hp:2, speed:.85, size:[38,30], movement:'strafe', weapon:'aimed', fireRate:2.1, score:190 },
      special: { name:'Magma Ram', role:'special', shape:'mercury-ram', hp:3, speed:1.1, size:[42,38], movement:'charge', weapon:'fan', fireRate:3.5, special:'armor', score:310 }
    },
    waves: [
      wave('First Contact','line',[group('basic',6)]),
      wave('Falling Metal','stagger',[group('basic',5),group('fast',4)],{ hardFormation:'split-flanks' }),
      wave('Foundry Crossfire','v',[group('shooter',3),group('basic',5)]),
      wave('Meteor Corridor','columns',[group('tank',2),group('fast',5)],{ event:'meteor' }),
      wave('Heat Vanguard','wedge',[group('special',2),group('shooter',3),group('basic',4)],{ miniboss:'special' })
    ],
    boss: { name:'Solar Sentinel', shape:'boss-mercury', hp:58, size:[170,105], movement:'boss-fortress', phases:[
      { threshold:1, weapons:['fan'] }, { threshold:.62, weapons:['burst','aimed'] }, { threshold:.28, weapons:['ring','meteor'] }
    ], hardWeapon:'split', weakPoint:'core' }
  },

  venus: {
    id: 'venus', name: 'Venus', world: 'Corrosive Veil', order: 2,
    identity: 'Atmospheric predators', accent: '#fbbf24', colors: ['#160904','#843d13','#fde68a','#fb923c'],
    description: 'Rounded gas creatures weave through clouds, cloak themselves, and leave corrosive zones.',
    event: 'cloud',
    enemies: {
      basic: { name:'Vapor Mite', role:'basic', shape:'venus-mite', hp:2, speed:.9, size:[38,30], movement:'sine', weapon:'straight', fireRate:2.8, score:130 },
      fast: { name:'Pressure Skimmer', role:'fast', shape:'venus-skimmer', hp:1, speed:1.5, size:[42,24], movement:'wave', weapon:'aimed', fireRate:3.4, score:170 },
      tank: { name:'Acid Bladder', role:'tank', shape:'venus-bladder', hp:6, speed:.55, size:[54,46], movement:'float', weapon:'corrosive', fireRate:3.6, score:310 },
      shooter: { name:'Cloud Spitter', role:'shooter', shape:'venus-spitter', hp:3, speed:.72, size:[44,34], movement:'hover', weapon:'fan', fireRate:2.4, score:230 },
      special: { name:'Veil Phantom', role:'special', shape:'venus-phantom', hp:3, speed:1.05, size:[46,32], movement:'cloak', weapon:'mine', fireRate:4, special:'cloak', score:350 }
    },
    waves: [
      wave('Into the Veil','sine-row',[group('basic',7)]),
      wave('Pressure Front','waves',[group('fast',6),group('basic',4)]),
      wave('Hidden Shapes','scatter',[group('special',4),group('shooter',3)],{ event:'cloud' }),
      wave('Corrosive Rain','circle',[group('tank',2),group('basic',6)],{ event:'acid-rain' }),
      wave('Crushing Atmosphere','escort',[group('tank',2),group('shooter',4),group('fast',4)]),
      wave('Eye of the Clouds','spiral',[group('special',3),group('shooter',4)],{ miniboss:'tank' })
    ],
    boss: { name:'Cloud Empress', shape:'boss-venus', hp:72, size:[176,118], movement:'boss-cloud', phases:[
      { threshold:1, weapons:['corrosive'] }, { threshold:.66, weapons:['fan','mine'] }, { threshold:.32, weapons:['ring','cloak-burst'] }
    ], hardWeapon:'split', weakPoint:'eye' }
  },

  earth: {
    id: 'earth', name: 'Earth', world: 'Orbital Shield', order: 3,
    identity: 'Orbital defense network', accent: '#67e8f9', colors: ['#02111f','#075985','#67e8f9','#22c55e'],
    description: 'Disciplined orbital machines coordinate shields, tracking fire, and satellite formations.',
    event: 'satellite',
    enemies: {
      basic: { name:'Patrol Cube', role:'basic', shape:'earth-cube', hp:2, speed:1, size:[32,32], movement:'grid', weapon:'straight', fireRate:2.4, score:140 },
      fast: { name:'Interceptor Wing', role:'fast', shape:'earth-wing', hp:1, speed:1.65, size:[42,24], movement:'intercept', weapon:'burst', fireRate:3.6, score:180 },
      tank: { name:'Shield Satellite', role:'tank', shape:'earth-satellite', hp:6, speed:.6, size:[52,44], movement:'orbit', weapon:'aimed', fireRate:3.2, special:'shield', score:330 },
      shooter: { name:'Rail Platform', role:'shooter', shape:'earth-rail', hp:3, speed:.7, size:[48,30], movement:'waypoints', weapon:'laser', fireRate:3.8, score:260 },
      special: { name:'Repair Node', role:'special', shape:'earth-repair', hp:3, speed:.8, size:[38,38], movement:'escort', weapon:'none', fireRate:9, special:'healer', score:360 }
    },
    waves: [
      wave('Orbital Patrol','grid',[group('basic',8)]),
      wave('Interceptor Pass','split-flanks',[group('fast',8)]),
      wave('Shield Lattice','diamond',[group('tank',2),group('basic',6)]),
      wave('Tracking Grid','cross',[group('shooter',4),group('basic',5)]),
      wave('Repair Protocol','escort',[group('special',2),group('tank',2),group('fast',5)]),
      wave('Defense Network','orbit-pairs',[group('shooter',4),group('tank',3)],{ event:'satellite' })
    ],
    boss: { name:'Orbital Warden', shape:'boss-earth', hp:82, size:[184,112], movement:'boss-orbit', phases:[
      { threshold:1, weapons:['aimed','straight'] }, { threshold:.68, weapons:['laser','burst'] }, { threshold:.35, weapons:['ring','satellite'] }
    ], hardWeapon:'fan', weakPoint:'reactor' }
  },

  mars: {
    id: 'mars', name: 'Mars', world: 'Red Assault', order: 4,
    identity: 'Military assault units', accent: '#fb7185', colors: ['#170503','#7f1d1d','#fb7185','#f97316'],
    description: 'Aggressive military machines attack in wedges, side raids, coordinated bursts, and pursuits.',
    event: 'dust',
    enemies: {
      basic: { name:'Red Trooper', role:'basic', shape:'mars-trooper', hp:2, speed:1.05, size:[36,30], movement:'march', weapon:'burst', fireRate:2.7, score:150 },
      fast: { name:'Flank Raider', role:'fast', shape:'mars-raider', hp:1, speed:1.75, size:[46,24], movement:'flank', weapon:'aimed', fireRate:3, score:200 },
      tank: { name:'Siege Walker', role:'tank', shape:'mars-walker', hp:7, speed:.56, size:[58,46], movement:'advance', weapon:'spread', fireRate:3.2, score:360 },
      shooter: { name:'Mobile Turret', role:'shooter', shape:'mars-turret', hp:4, speed:.72, size:[46,40], movement:'chase-x', weapon:'burst', fireRate:1.7, score:280 },
      special: { name:'Hunter Falcon', role:'special', shape:'mars-falcon', hp:3, speed:1.28, size:[50,28], movement:'hunt', weapon:'aimed', fireRate:2.3, special:'tracker', score:390 }
    },
    waves: [
      wave('Red Formation','v',[group('basic',8)]),
      wave('Side Raid','split-flanks',[group('fast',8),group('basic',3)]),
      wave('Suppressing Fire','wedge',[group('shooter',4),group('basic',6)]),
      wave('Armored Advance','columns',[group('tank',3),group('shooter',3)]),
      wave('Dust Ambush','ambush',[group('special',4),group('fast',6)],{ event:'dust' }),
      wave('Combined Arms','spearhead',[group('tank',2),group('special',3),group('shooter',4),group('basic',5)],{ miniboss:'tank' })
    ],
    boss: { name:'Dust Colossus', shape:'boss-mars', hp:94, size:[194,124], movement:'boss-tank', phases:[
      { threshold:1, weapons:['burst','spread'] }, { threshold:.67, weapons:['aimed','mine'] }, { threshold:.34, weapons:['laser','fan'] }
    ], hardWeapon:'ring', weakPoint:'turrets' }
  },

  jupiter: {
    id: 'jupiter', name: 'Jupiter', world: 'Great Storm', order: 5,
    identity: 'Storm creatures', accent: '#fdba74', colors: ['#130907','#7c3f2a','#fdba74','#ef4444'],
    description: 'Heavy storm organisms drift turbulently, curve electric shots, and bend the battlefield.',
    event: 'vortex',
    enemies: {
      basic: { name:'Storm Cell', role:'basic', shape:'jupiter-cell', hp:3, speed:.88, size:[40,36], movement:'turbulent', weapon:'arc', fireRate:2.7, score:170 },
      fast: { name:'Lightning Wisp', role:'fast', shape:'jupiter-wisp', hp:1, speed:1.8, size:[28,38], movement:'zigzag', weapon:'electric', fireRate:3.2, score:220 },
      tank: { name:'Gas Titan', role:'tank', shape:'jupiter-titan', hp:9, speed:.48, size:[68,58], movement:'float', weapon:'ring', fireRate:4.1, score:430 },
      shooter: { name:'Thunder Core', role:'shooter', shape:'jupiter-core', hp:4, speed:.66, size:[48,48], movement:'orbit', weapon:'arc', fireRate:2.1, score:310 },
      special: { name:'Vortex Maw', role:'special', shape:'jupiter-maw', hp:5, speed:.72, size:[58,50], movement:'vortex', weapon:'gust', fireRate:3.5, special:'gravity', score:460 }
    },
    waves: [
      wave('Storm Cells','turbulence',[group('basic',8)]),
      wave('Lightning Fork','zigzag',[group('fast',8),group('basic',4)]),
      wave('Curved Voltage','circle',[group('shooter',5),group('fast',4)]),
      wave('Heavy Pressure','scatter',[group('tank',3),group('basic',5)]),
      wave('Great Vortex','spiral',[group('special',3),group('shooter',4)],{ event:'vortex' }),
      wave('Red Eye Guard','orbit-pairs',[group('tank',2),group('special',2),group('fast',6)],{ miniboss:'special' })
    ],
    boss: { name:'Red Eye Titan', shape:'boss-jupiter', hp:112, size:[210,146], movement:'boss-storm', phases:[
      { threshold:1, weapons:['arc','electric'] }, { threshold:.7, weapons:['ring','gust'] }, { threshold:.38, weapons:['spiral','lightning-wall'] }
    ], hardWeapon:'split', weakPoint:'eye' }
  },

  saturn: {
    id: 'saturn', name: 'Saturn', world: 'Ring Dominion', order: 6,
    identity: 'Orbital guardians', accent: '#fde68a', colors: ['#0f0c07','#806a3b','#fde68a','#c4b5fd'],
    description: 'Elegant ring machines orbit one another, rotate formations, and turn fragments into hazards.',
    event: 'ring-debris',
    enemies: {
      basic: { name:'Ring Sentry', role:'basic', shape:'saturn-sentry', hp:3, speed:.95, size:[42,30], movement:'orbit', weapon:'straight', fireRate:2.6, score:180 },
      fast: { name:'Arc Skater', role:'fast', shape:'saturn-skater', hp:1, speed:1.7, size:[48,22], movement:'boomerang', weapon:'orbit-shot', fireRate:3.3, score:230 },
      tank: { name:'Fragment Bastion', role:'tank', shape:'saturn-bastion', hp:9, speed:.5, size:[64,50], movement:'ring-lock', weapon:'mine', fireRate:3.7, score:450 },
      shooter: { name:'Orbital Lancer', role:'shooter', shape:'saturn-lancer', hp:4, speed:.7, size:[50,34], movement:'circle', weapon:'orbit-shot', fireRate:2.2, score:330 },
      special: { name:'Moon Shepherd', role:'special', shape:'saturn-shepherd', hp:5, speed:.75, size:[52,44], movement:'escort', weapon:'ring', fireRate:3.4, special:'satellites', score:480 }
    },
    waves: [
      wave('Ring Patrol','ring',[group('basic',8)]),
      wave('Arc Return','boomerang',[group('fast',8)]),
      wave('Orbital Pairs','orbit-pairs',[group('shooter',4),group('basic',4)]),
      wave('Fragment Field','circle',[group('tank',3),group('fast',5)],{ event:'ring-debris' }),
      wave('Moon Escort','escort',[group('special',3),group('shooter',4)]),
      wave('Changing Orbits','double-ring',[group('special',2),group('tank',2),group('fast',6)],{ miniboss:'special' })
    ],
    boss: { name:'Ring Sovereign', shape:'boss-saturn', hp:124, size:[224,132], movement:'boss-ring', phases:[
      { threshold:1, weapons:['orbit-shot'] }, { threshold:.68, weapons:['ring','mine'] }, { threshold:.33, weapons:['rotating-wall','fan'] }
    ], hardWeapon:'split', weakPoint:'hub' }
  },

  uranus: {
    id: 'uranus', name: 'Uranus', world: 'Axial Frost', order: 7,
    identity: 'Cryogenic crystal units', accent: '#a5f3fc', colors: ['#011416','#0f6670','#a5f3fc','#5eead4'],
    description: 'Tilted crystal machines split shots, teleport laterally, and freeze the player temporarily.',
    event: 'freeze-zone',
    enemies: {
      basic: { name:'Frost Prism', role:'basic', shape:'uranus-prism', hp:3, speed:1, size:[34,42], movement:'tilted', weapon:'straight', fireRate:2.5, score:190 },
      fast: { name:'Axis Needle', role:'fast', shape:'uranus-needle', hp:1, speed:1.85, size:[22,48], movement:'lateral-random', weapon:'freeze', fireRate:3.2, score:250 },
      tank: { name:'Glacier Hex', role:'tank', shape:'uranus-hex', hp:10, speed:.48, size:[62,56], movement:'rotate-axis', weapon:'split', fireRate:3.8, score:470 },
      shooter: { name:'Cryo Fork', role:'shooter', shape:'uranus-fork', hp:4, speed:.68, size:[46,42], movement:'tilted-wave', weapon:'split', fireRate:2.3, score:350 },
      special: { name:'Phase Crystal', role:'special', shape:'uranus-phase', hp:5, speed:.82, size:[48,52], movement:'teleport', weapon:'freeze', fireRate:3.1, special:'teleport', score:510 }
    },
    waves: [
      wave('Tilted Formation','diagonal',[group('basic',8)]),
      wave('Axis Shift','inclined-v',[group('fast',7),group('basic',4)]),
      wave('Splinter Fire','cross',[group('shooter',5),group('basic',4)]),
      wave('Frozen Blocks','diamond',[group('tank',3),group('fast',5)],{ event:'freeze-zone' }),
      wave('Phase Displacement','scatter',[group('special',4),group('shooter',4)]),
      wave('Cryogenic Array','tilted-ring',[group('special',2),group('tank',2),group('shooter',4)],{ miniboss:'tank' })
    ],
    boss: { name:'Axial Phantom', shape:'boss-uranus', hp:132, size:[188,166], movement:'boss-axis', phases:[
      { threshold:1, weapons:['split','freeze'] }, { threshold:.68, weapons:['teleport-burst','fan'] }, { threshold:.34, weapons:['ice-wall','ring'] }
    ], hardWeapon:'spiral', weakPoint:'crystal-core' }
  },

  neptune: {
    id: 'neptune', name: 'Neptune', world: 'Dark Wind', order: 8,
    identity: 'Storm hunters', accent: '#60a5fa', colors: ['#010615','#142d78','#60a5fa','#818cf8'],
    description: 'Fast aerodynamic hunters cross the arena, return from unexpected angles, and weaponize dark wind.',
    event: 'dark-wind',
    enemies: {
      basic: { name:'Wind Blade', role:'basic', shape:'neptune-blade', hp:3, speed:1.15, size:[46,24], movement:'diagonal', weapon:'straight-fast', fireRate:2.4, score:210 },
      fast: { name:'Tempest Dart', role:'fast', shape:'neptune-dart', hp:1, speed:2.05, size:[24,46], movement:'pass-return', weapon:'aimed-fast', fireRate:3.1, score:280 },
      tank: { name:'Abyss Cruiser', role:'tank', shape:'neptune-cruiser', hp:11, speed:.56, size:[70,46], movement:'sweep', weapon:'spread-fast', fireRate:3, score:520 },
      shooter: { name:'Gale Sniper', role:'shooter', shape:'neptune-sniper', hp:4, speed:.82, size:[50,28], movement:'edge-strafe', weapon:'laser', fireRate:3.2, score:390 },
      special: { name:'Storm Hunter', role:'special', shape:'neptune-hunter', hp:6, speed:1.25, size:[56,32], movement:'ambush-return', weapon:'gust', fireRate:2.7, special:'afterimage', score:560 }
    },
    waves: [
      wave('Dark Wind','diagonal',[group('basic',9)]),
      wave('Sudden Crossing','split-flanks',[group('fast',10)]),
      wave('Diagonal Barrage','x-strike',[group('shooter',4),group('basic',6)]),
      wave('Return Pass','boomerang',[group('special',4),group('fast',7)]),
      wave('Abyss Line','columns',[group('tank',3),group('shooter',4)]),
      wave('Black Tempest','spiral',[group('special',3),group('fast',8)],{ event:'dark-wind' }),
      wave('Hunter Convergence','ambush',[group('tank',2),group('special',3),group('shooter',4),group('fast',6)],{ miniboss:'special' })
    ],
    boss: { name:'Dark Wind', shape:'boss-neptune', hp:148, size:[214,120], movement:'boss-hunter', phases:[
      { threshold:1, weapons:['aimed-fast','spread-fast'] }, { threshold:.72, weapons:['laser','gust'] }, { threshold:.42, weapons:['dash-barrage','fan'] }, { threshold:.18, weapons:['spiral','ring'] }
    ], hardWeapon:'lightning-wall', weakPoint:'wind-core' }
  }
});

export function getLevelDefinition(levelId) {
  return LEVEL_DEFINITIONS[levelId] || LEVEL_DEFINITIONS.mercury;
}

export function getDifficultyDefinition(difficulty) {
  return DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
}

export function getEnemyRoster(levelId) {
  const level = getLevelDefinition(levelId);
  return Object.values(level.enemies).map((enemy) => enemy.name);
}

export const cosmicDefenderThemes = Object.freeze(Object.fromEntries(
  Object.values(LEVEL_DEFINITIONS).map((level) => [level.id, {
    name: level.name,
    world: level.world,
    colors: level.colors,
    waves: level.waves.length,
    boss: level.boss.name,
    enemy: level.identity,
    description: level.description,
    roster: getEnemyRoster(level.id)
  }])
));
