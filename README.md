# Cosmic Explorer · Interactive 3D Universe

**Cosmic Explorer** es una experiencia web interactiva y bilingüe para explorar el universo. Incluye ocho planetas, ocho estrellas, una galería de dieciséis fenómenos cósmicos, modelos y escenas 3D con Three.js, un asistente local de astronomía (**Kira**), un reproductor de música del usuario y el minijuego **Cosmic Defender**.

> **Estado:** la compilación de producción y las pruebas automatizadas están verificadas localmente. La revisión visual completa en dispositivos físicos y el despliegue público permanecen pendientes. Kira es un **asistente contextual local**, no un chatbot que utiliza una API de IA generativa.

## Tecnologías

- HTML5, CSS3, JavaScript ES Modules
- Three.js `0.185.1` / WebGL para visualización 3D
- Web Audio API, IndexedDB y LocalStorage para funciones locales
- Node.js 20+ y npm para desarrollo y compilación
- Sitio estático multilenguaje (español e inglés)

## Funcionalidades

- **Universo 3D:** planetas y estrellas con rotación, zoom, comparaciones y datos astronómicos.
- **Galería:** 16 fenómenos espaciales con visualizaciones interactivas.
- **Kira:** ayuda contextual y respuestas locales basadas en el contenido de la aplicación.
- **Music Space:** biblioteca de canciones que el usuario importa desde su dispositivo; no incluye música comercial de terceros.
- **Cosmic Defender:** minijuego espacial con niveles, puntuación y controles para distintas pantallas.
- **Personalización:** temas, colores, ambientación sonora, favoritos y ajustes de rendimiento.

## Instalación y ejecución

Necesitas **Node.js 20 o superior** y un navegador moderno compatible con WebGL.

```bash
npm ci
npm run dev
```

Abre el enlace mostrado en la terminal (normalmente `http://127.0.0.1:5173/#/home`). No abras `index.html` directamente con `file://`: la aplicación utiliza módulos JavaScript.

## Comprobaciones y versión de producción

```bash
npm run check       # Sintaxis JS y JSON
npm test            # Pruebas automatizadas
npm run build       # Genera dist/
npm run validate:dist
npm run preview     # Vista local del paquete generado
```

Para ejecutar las verificaciones principales conjuntamente:

```bash
npm run verify
```

El directorio `dist/` se genera localmente y **no** debe subirse como código fuente al repositorio. Tampoco se incluyen `node_modules/`, preferencias del navegador o archivos `.env` reales.

## Publicación en Netlify

1. Crea un repositorio GitHub y sube los archivos de este proyecto (no el ZIP entero ni `node_modules`).
2. En Netlify, conecta el repositorio y selecciona la rama principal.
3. La configuración `netlify.toml` establece `npm run build` como compilación y `dist` como carpeta publicada.
4. Comprueba después del despliegue las rutas `#/home`, `#/universe`, `#/gallery`, `#/music-space` y `#/cosmic-defender`.
5. Verifica los modelos 3D, el audio (requiere interacción por las restricciones del navegador) y la experiencia móvil.

**No se ha realizado ningún despliegue ni configurado una cuenta de Netlify desde este paquete.** Consulta [la lista de comprobación](DEPLOYMENT_CHECKLIST.md).

## Estructura del proyecto

```text
Cosmic_Explorer_GitHub/
├── index.html
├── src/                 # Interfaz, rutas, componentes, Kira y funciones 3D
├── public/              # Texturas, imágenes y sonidos del proyecto
├── scripts/             # Servidor local, compilación y verificaciones
├── tests/               # Pruebas automatizadas
├── deployment/          # Cabeceras HTTP de producción
├── netlify.toml
├── package.json
├── package-lock.json
└── README.md
```

## Almacenamiento y privacidad

Las preferencias, favoritos, biblioteca musical y el progreso del juego se almacenan localmente en el navegador. **La aplicación no necesita claves API ni un backend propio.** La nueva marca utiliza nuevas claves locales; los datos guardados en la aplicación original con otro nombre no se migran automáticamente.

## Recursos, créditos y permisos

- Three.js: licencia MIT (incluida durante la compilación).
- Algunas texturas e imágenes astronómicas usan fuentes externas, incluidas NASA y Solar System Scope; se mantienen sus atribuciones en [CREDITS.md](CREDITS.md), [ASSET_CREDITS.md](ASSET_CREDITS.md), [ASSET_CREDITS_5_10.md](ASSET_CREDITS_5_10.md) y [ASSET_CREDITS_5_11.md](ASSET_CREDITS_5_11.md).
- Los sonidos ambientales incorporados se describen en [AUDIO_CREDITS.md](AUDIO_CREDITS.md).
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) contiene avisos adicionales.

**Antes de publicar públicamente**, revisa de forma independiente que todas las imágenes, texturas y sonidos se puedan redistribuir bajo sus respectivas condiciones de uso. El código fuente se presenta para evaluación de portafolio: no se concede una licencia general de reutilización (ver `package.json`).

## Limitaciones conocidas

Algunas experiencias requieren WebGL 2, una GPU compatible y un navegador moderno. El audio puede necesitar una interacción explícita del usuario para comenzar. La evaluación automatizada no reemplaza probar la aplicación compilada en dispositivos móviles y navegadores reales. Ver [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Autoría

Proyecto de desarrollo web y exploración espacial 3D preparado como parte de un portafolio técnico.
