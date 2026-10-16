export const catalogEs = {
  planets: {
    mercury: {
      name: 'Mercurio',
      type: 'Planeta terrestre',
      shortDescription: 'El veloz mundo cubierto de cráteres más cercano al Sol.',
      facts: {
        distanceFromSun: '57.9 millones de km',
        diameter: '4,880 km',
        mass: '3.30 × 10²³ kg',
        gravity: '3.7 m/s²',
        temperature: 'Temperatura media aproximada de 167 °C; entre −180 y 430 °C',
        dayLength: '58.6 días terrestres por rotación',
        yearLength: '88 días terrestres',
        composition: 'Un gran núcleo rico en hierro debajo de un manto y una corteza rocosa de silicatos.',
        features: [
          'Es el planeta más pequeño del Sistema Solar.',
          'Su superficie conserva cráteres de impacto, escarpes y antiguas llanuras volcánicas.',
          'Existe hielo de agua dentro de cráteres polares que permanecen siempre en sombra.'
        ],
        curiosities: [
          'Un día solar en Mercurio dura aproximadamente 176 días terrestres.',
          'Aunque es el planeta más cercano al Sol, no es el más caliente.',
          'Mercurio tiene una exosfera extremadamente delgada en lugar de una atmósfera considerable.'
        ],
        discovery: 'Se conoce desde la antigüedad porque puede observarse sin telescopio.',
        earthComparison: 'Mercurio tiene cerca del 38 % del diámetro de la Tierra y alrededor del 38 % de su gravedad superficial.'
      }
    },
    venus: {
      name: 'Venus',
      type: 'Planeta terrestre',
      shortDescription: 'Un mundo brillante, cubierto de nubes y con una superficie abrasadora.',
      facts: {
        distanceFromSun: '108.2 millones de km',
        diameter: '12,104 km',
        mass: '4.87 × 10²⁴ kg',
        gravity: '8.87 m/s²',
        temperature: 'Temperatura superficial media aproximada de 464 °C',
        dayLength: '243 días terrestres por rotación, en sentido retrógrado',
        yearLength: '224.7 días terrestres',
        composition: 'Un interior rocoso bajo una atmósfera espesa de dióxido de carbono y nubes de ácido sulfúrico.',
        features: [
          'Tiene la superficie planetaria más caliente del Sistema Solar.',
          'Su atmósfera produce un efecto invernadero descontrolado.',
          'Gran parte de su superficie está formada por llanuras volcánicas y tierras altas deformadas.'
        ],
        curiosities: [
          'Venus gira en dirección opuesta a la mayoría de los planetas.',
          'Un día en Venus dura más que su año.',
          'A menudo es el planeta más brillante visible desde la Tierra.'
        ],
        discovery: 'Se conoce desde la antigüedad y fue llamado históricamente estrella de la mañana o estrella de la tarde.',
        earthComparison: 'Venus tiene aproximadamente el 95 % del diámetro de la Tierra y cerca del 90 % de su gravedad superficial.'
      }
    },
    earth: {
      name: 'Tierra',
      type: 'Planeta terrestre',
      shortDescription: 'Nuestro mundo oceánico y el único hogar conocido de la vida.',
      facts: {
        distanceFromSun: '149.6 millones de km (1 UA)',
        diameter: '12,756 km en el ecuador',
        mass: '5.97 × 10²⁴ kg',
        gravity: '9.81 m/s²',
        temperature: 'Temperatura superficial media aproximada de 15 °C',
        dayLength: '23.9 horas',
        yearLength: '365.25 días',
        composition: 'Un núcleo de hierro y níquel, manto y corteza rocosa, océanos de agua líquida y una atmósfera de nitrógeno y oxígeno.',
        features: [
          'Cerca del 71 % de la superficie está cubierta por agua.',
          'La tectónica de placas activa transforma continuamente la corteza.',
          'Su atmósfera y su campo magnético ayudan a proteger la vida.'
        ],
        curiosities: [
          'La Tierra es el planeta terrestre más grande.',
          'Es el único mundo donde actualmente sabemos que existe vida.',
          'La Luna ayuda a estabilizar la inclinación del eje terrestre.'
        ],
        discovery: 'La Tierra no fue descubierta como planeta en el sentido moderno; su naturaleza planetaria se comprendió a través de siglos de astronomía.',
        earthComparison: 'La Tierra es la referencia utilizada para las comparaciones de este catálogo.'
      }
    },
    mars: {
      name: 'Marte',
      type: 'Planeta terrestre',
      shortDescription: 'La frontera roja, modelada por agua antigua, volcanes y polvo.',
      facts: {
        distanceFromSun: '228 millones de km',
        diameter: '6,779 km',
        mass: '6.42 × 10²³ kg',
        gravity: '3.71 m/s²',
        temperature: 'Temperatura superficial media aproximada de −65 °C',
        dayLength: '24.6 horas (un sol)',
        yearLength: '687 días terrestres',
        composition: 'Un planeta rocoso rico en minerales de hierro, con una atmósfera delgada compuesta principalmente por dióxido de carbono.',
        features: [
          'Alberga el Monte Olimpo, el volcán más grande del Sistema Solar.',
          'Valles Marineris forma un sistema de cañones de miles de kilómetros de longitud.',
          'Las evidencias indican que en el pasado fluyó agua líquida por su superficie.'
        ],
        curiosities: [
          'Marte tiene estaciones, casquetes polares, tormentas de polvo y fenómenos meteorológicos.',
          'Sus dos pequeñas lunas son Fobos y Deimos.',
          'Las misiones robóticas han explorado Marte más que cualquier otro planeta fuera de la Tierra.'
        ],
        discovery: 'Se conoce desde la antigüedad; su color rojizo hizo que muchas culturas lo relacionaran con la guerra.',
        earthComparison: 'Marte tiene cerca de la mitad del diámetro de la Tierra y aproximadamente el 38 % de su gravedad superficial.'
      }
    },
    jupiter: {
      name: 'Júpiter',
      type: 'Gigante gaseoso',
      shortDescription: 'El enorme mundo de tormentas que domina el Sistema Solar exterior.',
      facts: {
        distanceFromSun: '778 millones de km',
        diameter: '139,822 km',
        mass: '1.90 × 10²⁷ kg',
        gravity: '24.79 m/s² en la parte superior de las nubes',
        temperature: 'Aproximadamente −110 °C cerca de la parte superior de las nubes',
        dayLength: '9.9 horas',
        yearLength: 'Aproximadamente 11.86 años terrestres',
        composition: 'Principalmente hidrógeno y helio, con capas profundas de hidrógeno líquido y metálico y un núcleo difuso de elementos pesados.',
        features: [
          'Es el planeta más grande del Sistema Solar.',
          'La Gran Mancha Roja es una tormenta gigantesca y de larga duración.',
          'Su poderoso campo magnético crea una magnetosfera enorme.'
        ],
        curiosities: [
          'Júpiter tiene el día más corto de todos los planetas.',
          'Sus cuatro lunas más grandes son Ío, Europa, Ganímedes y Calisto.',
          'Júpiter concentra más del doble de la masa de todos los demás planetas juntos.'
        ],
        discovery: 'Se conoce desde la antigüedad; Galileo observó sus cuatro grandes lunas en 1610.',
        earthComparison: 'Júpiter es aproximadamente 11 veces más ancho y 318 veces más masivo que la Tierra.'
      }
    },
    saturn: {
      name: 'Saturno',
      type: 'Gigante gaseoso',
      shortDescription: 'Un gigante pálido rodeado por los anillos más espectaculares del Sistema Solar.',
      facts: {
        distanceFromSun: '1.4 mil millones de km',
        diameter: 'Aproximadamente 120,500 km en el ecuador',
        mass: '5.68 × 10²⁶ kg',
        gravity: '10.44 m/s² en la parte superior de las nubes',
        temperature: 'Aproximadamente −140 °C cerca de la parte superior de las nubes',
        dayLength: '10.7 horas',
        yearLength: 'Aproximadamente 29.4 años terrestres',
        composition: 'Principalmente hidrógeno y helio alrededor de capas líquidas más profundas y un núcleo denso.',
        features: [
          'Sus anillos están formados por incontables fragmentos de hielo, roca y polvo.',
          'Los anillos principales se extienden cientos de miles de kilómetros, pero son sorprendentemente delgados.',
          'Titán y Encélado se encuentran entre sus lunas de mayor importancia científica.'
        ],
        curiosities: [
          'Saturno es el planeta menos denso y su densidad media es menor que la del agua.',
          'En marzo de 2025, NASA registraba 274 lunas confirmadas.',
          'Una corriente de aire con forma hexagonal rodea el polo norte de Saturno.'
        ],
        discovery: 'Se conoce desde la antigüedad; Galileo observó por primera vez su apariencia inusual con un telescopio en 1610.',
        earthComparison: 'Saturno es aproximadamente nueve veces más ancho y unas 95 veces más masivo que la Tierra.'
      }
    },
    uranus: {
      name: 'Urano',
      type: 'Gigante de hielo',
      shortDescription: 'Un gigante de hielo azul verdoso que gira alrededor del Sol acostado de lado.',
      facts: {
        distanceFromSun: '2.9 mil millones de km',
        diameter: '51,118 km',
        mass: '8.68 × 10²⁵ kg',
        gravity: '8.69 m/s²',
        temperature: 'Media aproximada de −195 °C; mínimas cercanas a −224 °C',
        dayLength: 'Aproximadamente 17 horas, en sentido retrógrado',
        yearLength: 'Aproximadamente 84 años terrestres',
        composition: 'Un fluido caliente y denso de agua, metano y amoníaco sobre un núcleo rocoso, debajo de una atmósfera de hidrógeno, helio y metano.',
        features: [
          'Su eje está inclinado unos 98 grados, lo que produce estaciones extremas.',
          'El metano de su atmósfera le da su color azul verdoso.',
          'Tiene 13 anillos tenues conocidos.'
        ],
        curiosities: [
          'Cada polo pasa aproximadamente 21 años en oscuridad continua durante parte de su órbita.',
          'Urano fue el primer planeta descubierto con un telescopio.',
          'Su campo magnético está muy inclinado y desplazado del centro del planeta.'
        ],
        discovery: 'William Herschel descubrió Urano en 1781, aunque anteriormente se había confundido con una estrella.',
        earthComparison: 'Urano es aproximadamente cuatro veces más ancho y 14.5 veces más masivo que la Tierra.'
      }
    },
    neptune: {
      name: 'Neptuno',
      type: 'Gigante de hielo',
      shortDescription: 'Un distante mundo color cobalto azotado por los vientos planetarios más rápidos.',
      facts: {
        distanceFromSun: '4.5 mil millones de km',
        diameter: '49,528 km',
        mass: '1.02 × 10²⁶ kg',
        gravity: '11.15 m/s²',
        temperature: 'Media aproximada de −200 °C cerca de la parte superior de las nubes',
        dayLength: 'Aproximadamente 16 horas',
        yearLength: 'Aproximadamente 165 años terrestres',
        composition: 'Un interior caliente y denso rico en agua, metano y amoníaco bajo una atmósfera de hidrógeno, helio y metano.',
        features: [
          'Es el planeta principal más distante del Sol.',
          'Sus vientos pueden superar los 2,000 km/h.',
          'Tiene anillos tenues y sistemas de tormentas oscuras que aparecen y desaparecen.'
        ],
        curiosities: [
          'Neptuno fue el primer planeta encontrado mediante una predicción matemática.',
          'Completó su primera órbita desde su descubrimiento en 2011.',
          'Tritón, su luna más grande, viaja en una órbita retrógrada.'
        ],
        discovery: 'Johann Gottfried Galle observó Neptuno en 1846 cerca de la posición predicha por Urbain Le Verrier.',
        earthComparison: 'Neptuno es aproximadamente cuatro veces más ancho y 17 veces más masivo que la Tierra.'
      }
    }
  },
  stars: {
    sun: {
      name: 'Sol',
      type: 'Enana amarilla · Estrella de secuencia principal',
      constellation: 'Centro del Sistema Solar',
      shortDescription: 'Nuestra estrella, fuente de casi toda la energía que sostiene la vida en la Tierra.',
      facts: {
        distance: 'Aproximadamente 149.6 millones de km de la Tierra · 8 minutos luz y 20 segundos',
        mass: '1 masa solar · 1.989 × 10³⁰ kg',
        radius: 'Aproximadamente 700,000 km · 1 radio solar',
        temperature: 'Aproximadamente 5,500 °C en la fotosfera · 5,778 K',
        luminosity: '1 luminosidad solar · aproximadamente 3.83 × 10²⁶ W',
        color: 'Blanco visto desde el espacio; suele verse amarillo desde la Tierra',
        age: 'Aproximadamente 4.6 mil millones de años',
        stage: 'Secuencia principal · fusiona hidrógeno para formar helio',
        composition: 'Una esfera de plasma compuesta principalmente por hidrógeno y helio, con cantidades menores de elementos más pesados.',
        features: [
          'Su gravedad mantiene unido el Sistema Solar.',
          'La actividad magnética produce manchas solares, llamaradas y eyecciones de masa coronal.',
          'La fotosfera visible se encuentra debajo de la cromosfera y de la corona extremadamente caliente.'
        ],
        curiosities: [
          'El Sol contiene más del 99.8 % de la masa del Sistema Solar.',
          'Su núcleo alcanza aproximadamente 15 millones de °C.',
          'Se encuentra cerca de la mitad de su vida en la secuencia principal.'
        ],
        sunComparison: 'Esta es la estrella de referencia: las masas, radios y luminosidades estelares suelen medirse en unidades solares.',
        systemNote: 'Ocho planetas, planetas enanos, lunas, asteroides, cometas y otros objetos orbitan alrededor del Sol.'
      }
    },
    sirius: {
      name: 'Sirio',
      type: 'Estrella azul-blanca de secuencia principal',
      constellation: 'Can Mayor',
      shortDescription: 'La estrella más brillante del cielo nocturno terrestre y el componente principal de un sistema binario.',
      facts: {
        distance: 'Aproximadamente 8.6 años luz',
        mass: 'Cerca de 2.0 veces la masa del Sol',
        radius: 'Cerca de 1.7 veces el radio del Sol',
        temperature: 'Aproximadamente 10,000 K',
        luminosity: 'Cerca de 25 veces la luminosidad del Sol',
        color: 'Azul-blanco',
        age: 'Aproximadamente entre 200 y 300 millones de años',
        stage: 'Secuencia principal',
        composition: 'Plasma caliente rico en hidrógeno, cuya energía se produce mediante fusión de hidrógeno en el núcleo.',
        features: [
          'Es la estrella más brillante visible en el cielo nocturno de la Tierra.',
          'Sirio A es orbitada por Sirio B, una enana blanca compacta.',
          'El sistema completa una órbita en aproximadamente medio siglo.'
        ],
        curiosities: [
          'Sirio también es conocida como la Estrella del Perro.',
          'Su brillo se debe tanto a su potencia propia como a su cercanía a la Tierra.',
          'Sirio B concentra casi la masa del Sol en un cuerpo del tamaño de la Tierra.'
        ],
        sunComparison: 'Sirio A tiene aproximadamente el doble de masa, casi el doble de tamaño y unas 25 veces la luminosidad del Sol.',
        systemNote: 'Sirio es un sistema binario formado por Sirio A y la enana blanca Sirio B.'
      }
    },
    vega: {
      name: 'Vega',
      type: 'Estrella azul-blanca de secuencia principal',
      constellation: 'Lira',
      shortDescription: 'Una estrella cercana de rotación rápida y uno de los vértices del Triángulo de Verano.',
      facts: {
        distance: 'Aproximadamente 25 años luz',
        mass: 'Cerca de 2.1 veces la masa del Sol',
        radius: 'Cerca de 2.4 veces el radio medio del Sol',
        temperature: 'Aproximadamente entre 9,600 y 10,000 K',
        luminosity: 'Cerca de 40 veces la luminosidad del Sol',
        color: 'Azul-blanco',
        age: 'Aproximadamente 450 millones de años',
        stage: 'Secuencia principal',
        composition: 'Plasma rico en hidrógeno con fusión en el núcleo, rodeado por un amplio disco de escombros.',
        features: [
          'Vega gira tan rápido que es más ancha en el ecuador que en los polos.',
          'Sus polos son más calientes y brillantes que su región ecuatorial.',
          'Las observaciones infrarrojas muestran un gran disco de polvo a su alrededor.'
        ],
        curiosities: [
          'Vega fue la estrella polar norte de la Tierra y volverá a serlo debido a la lenta precesión del eje terrestre.',
          'Ayudó a definir las escalas históricas de brillo astronómico.',
          'Forma el Triángulo de Verano junto con Altair y Deneb.'
        ],
        sunComparison: 'Vega tiene aproximadamente el doble de masa del Sol, más del doble de su radio y unas 40 veces su luminosidad.',
        systemNote: 'No se conocen planetas confirmados, pero su disco de escombros es importante para estudiar la formación de sistemas planetarios.'
      }
    },
    betelgeuse: {
      name: 'Betelgeuse',
      type: 'Supergigante roja',
      constellation: 'Orión',
      shortDescription: 'Una enorme supergigante roja variable que marca el hombro de Orión.',
      facts: {
        distance: 'Aproximadamente 650 años luz; las estimaciones siguen siendo inciertas',
        mass: 'Aproximadamente entre 15 y 20 veces la masa del Sol',
        radius: 'Cientos de veces el radio del Sol; se estima comúnmente cerca de 700 radios solares',
        temperature: 'Aproximadamente 3,500 K',
        luminosity: 'Cerca de 100,000 veces la luminosidad del Sol, con variaciones a lo largo del tiempo',
        color: 'Rojo anaranjado',
        age: 'Aproximadamente 10 millones de años',
        stage: 'Supergigante roja · evolución estelar avanzada',
        composition: 'Una estrella masiva evolucionada con un núcleo caliente y enormes capas exteriores frías e inestables que expulsan gas y polvo.',
        features: [
          'Es una de las pocas estrellas cuya superficie y atmósfera extendida pueden estudiarse directamente.',
          'Su brillo cambia mientras la estrella pulsa y su superficie evoluciona.',
          'Una gran eyección de masa superficial contribuyó a su notable oscurecimiento de 2019–2020.'
        ],
        curiosities: [
          'Si estuviera en el centro de nuestro Sistema Solar, muchas estimaciones indican que se extendería más allá de la órbita de Marte.',
          'Su futura supernova sería espectacular, pero no se espera que represente una amenaza para la Tierra.',
          'A pesar de su tamaño, su superficie es más fría que la del Sol.'
        ],
        sunComparison: 'Betelgeuse es mucho más joven que el Sol, pero enormemente más grande y luminosa porque nació con mucha más masa.',
        systemNote: 'Observaciones recientes indican que Betelgeuse podría tener una compañera estelar cercana, mientras su enorme atmósfera pierde material continuamente.'
      }
    },
    rigel: {
      name: 'Rigel',
      type: 'Supergigante azul',
      constellation: 'Orión',
      shortDescription: 'Una brillante supergigante azul que resplandece en el pie de Orión.',
      facts: {
        distance: 'Aproximadamente 860 años luz',
        mass: 'Cerca de 20 veces la masa del Sol',
        radius: 'Al menos 70 veces el radio del Sol',
        temperature: 'Aproximadamente 12,000 K',
        luminosity: 'Cerca de 120,000 veces la luminosidad del Sol',
        color: 'Azul-blanco',
        age: 'Aproximadamente 8 millones de años',
        stage: 'Supergigante azul',
        composition: 'Una estrella masiva, muy caliente y evolucionada, dominada por plasma de hidrógeno y helio.',
        features: [
          'Rigel suele ser la estrella más brillante de Orión.',
          'Emite gran parte de su energía en longitudes de onda ultravioleta.',
          'Su aparente punto de luz individual pertenece a un sistema estelar múltiple.'
        ],
        curiosities: [
          'La luz que vemos hoy comenzó su viaje hacia la Tierra hace siglos.',
          'La corta vida de Rigel se debe a que consume su combustible nuclear con extrema rapidez.',
          'Finalmente terminará como una supernova por colapso del núcleo.'
        ],
        sunComparison: 'Rigel tiene alrededor de 20 veces la masa, al menos 70 veces el tamaño y unas 120,000 veces la luminosidad del Sol.',
        systemNote: 'Rigel es el componente dominante de un sistema estelar múltiple con compañeras mucho más tenues.'
      }
    },
    polaris: {
      name: 'Polaris',
      type: 'Supergigante amarillo-blanca · Variable cefeida',
      constellation: 'Osa Menor',
      shortDescription: 'La actual Estrella Polar y un faro pulsante dentro de un sistema estelar triple.',
      facts: {
        distance: 'Aproximadamente 430 años luz',
        mass: 'Cerca de 5 veces la masa del Sol',
        radius: 'Aproximadamente entre 45 y 50 veces el radio del Sol',
        temperature: 'Aproximadamente 6,000 K',
        luminosity: 'Aproximadamente entre 2,000 y 2,500 veces la luminosidad del Sol',
        color: 'Amarillo-blanco',
        age: 'Decenas de millones de años',
        stage: 'Supergigante evolucionada · variable cefeida clásica',
        composition: 'Una estrella evolucionada de hidrógeno y helio cuyas capas exteriores se expanden y contraen rítmicamente.',
        features: [
          'Está cerca de la dirección del eje de rotación norte de la Tierra.',
          'Sus pulsaciones causan cambios predecibles en su brillo.',
          'El sistema Polaris contiene al menos tres estrellas.'
        ],
        curiosities: [
          'Polaris es útil para la navegación porque parece casi fija mientras el cielo del norte gira a su alrededor.',
          'No siempre ha sido ni siempre será la Estrella Polar.',
          'Las estrellas cefeidas ayudan a los astrónomos a medir distancias cósmicas.'
        ],
        sunComparison: 'Polaris A tiene varias veces la masa del Sol, decenas de veces su tamaño y miles de veces su luminosidad.',
        systemNote: 'Polaris A está acompañada por una estrella cercana, Polaris Ab, y una compañera más distante, Polaris B.'
      }
    },
    'proxima-centauri': {
      name: 'Próxima Centauri',
      type: 'Enana roja · Estrella fulgurante',
      constellation: 'Centauro',
      shortDescription: 'La estrella conocida más cercana al Sol: una pequeña, tenue y activa enana roja.',
      facts: {
        distance: 'Aproximadamente 4.24 años luz',
        mass: 'Cerca de 0.12 veces la masa del Sol',
        radius: 'Cerca de 0.15 veces el radio del Sol',
        temperature: 'Aproximadamente 3,050 K',
        luminosity: 'Aproximadamente 0.0017 veces la luminosidad del Sol',
        color: 'Rojo anaranjado intenso',
        age: 'Aproximadamente 4.8 mil millones de años',
        stage: 'Enana roja de baja masa en la secuencia principal',
        composition: 'Una estrella fría, completamente convectiva y rica en hidrógeno, con intensa actividad magnética.',
        features: [
          'Es la estrella conocida más cercana después del Sol.',
          'Sus potentes llamaradas pueden hacer que aumente mucho su brillo.',
          'Está unida gravitacionalmente al sistema estelar Alfa Centauri.'
        ],
        curiosities: [
          'Es demasiado tenue para verla a simple vista.',
          'Al menos dos planetas confirmados la orbitan, entre ellos Próxima Centauri b.',
          'Las enanas rojas pueden permanecer en la secuencia principal mucho más tiempo que las estrellas similares al Sol.'
        ],
        sunComparison: 'Próxima tiene aproximadamente una octava parte de la masa del Sol y emite cerca de una milésima parte de su luz.',
        systemNote: 'Próxima es el tercer componente distante del sistema Alfa Centauri y alberga un sistema planetario compacto.'
      }
    },
    antares: {
      name: 'Antares',
      type: 'Supergigante roja',
      constellation: 'Escorpio',
      shortDescription: 'El corazón rojizo de Escorpio y una de las supergigantes más reconocibles del cielo.',
      facts: {
        distance: 'Aproximadamente 550 años luz',
        mass: 'Cerca de 12 veces la masa del Sol',
        radius: 'Aproximadamente entre 600 y 700 veces el radio del Sol',
        temperature: 'Aproximadamente 3,500 K',
        luminosity: 'Decenas de miles de veces la luminosidad del Sol',
        color: 'Rojo anaranjado',
        age: 'Aproximadamente entre 10 y 15 millones de años',
        stage: 'Supergigante roja · etapa avanzada de evolución estelar',
        composition: 'Una estrella masiva evolucionada con una atmósfera fría y extendida, fuertes vientos estelares y un interior caliente impulsado por fusión.',
        features: [
          'Su color rojizo inspiró un nombre que significa rival de Marte.',
          'Marca el corazón de la constelación de Escorpio.',
          'Antares tiene una estrella compañera azul-blanca mucho más caliente.'
        ],
        curiosities: [
          'En muchas comparaciones de escala, su diámetro se extendería más allá de la órbita de Marte.',
          'La nave Cassini de NASA utilizó Antares en estudios de ocultación estelar de los anillos de Saturno.',
          'Al igual que Betelgeuse, se espera que Antares termine su vida como una supernova.'
        ],
        sunComparison: 'Antares tiene solo varias veces la masa del Sol, pero es cientos de veces más ancha y decenas de miles de veces más luminosa.',
        systemNote: 'Antares A y su compañera más pequeña y caliente, Antares B, forman un sistema binario.'
      }
    }
  }
};
