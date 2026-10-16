import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  THREE,
  configureTexture,
  createAtmosphereMaterial,
  createComposer,
  createRenderer,
  createStarfield,
  createStudioEnvironment,
  disposeComposer,
  disposeThreeObject,
  resizeThreeSurface
} from '../three/three-scene-utils.js';

const textureRoot = './public/textures/planets';

const PLANET_CONFIG = {
  mercury: {
    radius: 1.16,
    flattenY: 1,
    exposure: 0.82,
    cameraDistance: 4.55,
    keyIntensity: 2.65,
    fillIntensity: 0.18,
    hemisphereIntensity: 0.15,
    bloom: { strength: 0.02, radius: 0.16, threshold: 0.99 },
    material: {
      roughness: 0.94,
      metalness: 0,
      clearcoat: 0,
      specularIntensity: 0.16,
      envMapIntensity: 0.16,
      normalScale: 0.78,
      bumpScale: 0.045
    }
  },
  venus: {
    radius: 1.17,
    flattenY: 0.997,
    exposure: 0.76,
    cameraDistance: 4.62,
    keyIntensity: 2.25,
    fillIntensity: 0.17,
    hemisphereIntensity: 0.16,
    bloom: { strength: 0.035, radius: 0.22, threshold: 0.985 },
    material: {
      roughness: 0.93,
      metalness: 0,
      clearcoat: 0,
      specularIntensity: 0.10,
      envMapIntensity: 0.12,
      normalScale: 0.36,
      bumpScale: 0.022
    },
    cloudLayer: {
      map: 'clouds.jpg',
      alphaMap: 'clouds_alpha.png',
      scale: 1.026,
      opacity: 0.88,
      speed: -0.052,
      roughness: 1
    },
    atmosphere: { color: 0xf7bd64, scale: 1.115, intensity: 0.70, power: 3.75, opacity: 0.54 }
  },
  mars: {
    radius: 1.16,
    flattenY: 0.998,
    exposure: 0.82,
    cameraDistance: 4.55,
    keyIntensity: 2.52,
    fillIntensity: 0.16,
    hemisphereIntensity: 0.14,
    bloom: { strength: 0.02, radius: 0.17, threshold: 0.992 },
    material: {
      roughness: 0.92,
      metalness: 0,
      clearcoat: 0,
      specularIntensity: 0.12,
      envMapIntensity: 0.14,
      normalScale: 0.68,
      bumpScale: 0.038
    },
    atmosphere: { color: 0xdf794f, scale: 1.055, intensity: 0.38, power: 4.1, opacity: 0.22 }
  },
  jupiter: {
    radius: 1.24,
    flattenY: 0.936,
    exposure: 0.80,
    cameraDistance: 4.72,
    keyIntensity: 2.35,
    fillIntensity: 0.20,
    hemisphereIntensity: 0.17,
    bloom: { strength: 0.025, radius: 0.19, threshold: 0.99 },
    material: {
      roughness: 0.88,
      metalness: 0,
      clearcoat: 0,
      specularIntensity: 0.14,
      envMapIntensity: 0.18,
      normalScale: 0.22,
      bumpScale: 0.009
    },
    cloudLayer: {
      map: 'clouds.png',
      scale: 1.008,
      opacity: 0.22,
      speed: 0.22,
      roughness: 1
    },
    atmosphere: { color: 0xe6c6a7, scale: 1.055, intensity: 0.42, power: 4.1, opacity: 0.22 }
  },
  saturn: {
    radius: 1.22,
    flattenY: 0.902,
    exposure: 0.72,
    environmentIntensity: 0.085,
    cameraDistance: 5.72,
    cameraOffset: { x: 0.06, y: 0.08 },
    keyIntensity: 2.42,
    fillIntensity: 0.07,
    hemisphereIntensity: 0.075,
    keyPosition: [-4.8, 2.15, 4.25],
    fillPosition: [3.6, -1.1, -3.2],
    fitRingsInInitialView: true,
    controls: {
      minDistance: 3.15,
      maxDistance: 7.4,
      minPolarAngle: 0.42,
      maxPolarAngle: 2.72
    },
    bloom: { strength: 0.006, radius: 0.10, threshold: 0.998 },
    material: {
      roughness: 0.78,
      metalness: 0,
      clearcoat: 0.01,
      specularIntensity: 0.095,
      specularColor: 0xf4ddb4,
      envMapIntensity: 0.11,
      normalScale: 0.24,
      bumpScale: 0.006,
      sheen: 0.22,
      sheenColor: 0xf0c98c,
      sheenRoughness: 0.94
    },
    cloudLayer: {
      map: 'clouds.png',
      scale: 1.008,
      opacity: 0.12,
      speed: 0.035,
      roughness: 0.98
    },
    atmosphere: { color: 0xf1d09b, scale: 1.052, intensity: 0.18, power: 4.5, opacity: 0.075 },
    ringShadow: {
      latitude: 0.512,
      width: 0.032,
      opacity: 0.22,
      color: 0x3c2515
    },
    rings: {
      inner: 1.34,
      outer: 2.72,
      map: 'rings_color.png',
      alphaMap: 'rings_alpha.png',
      opacity: 0.96,
      color: 0xfff3dc,
      roughness: 0.88,
      thickness: 0.014,
      particleCount: 9000,
      particleSize: 0.011,
      particleOpacity: 0.34,
      tiltOffset: 0
    }
  },
  uranus: {
    radius: 1.18,
    flattenY: 0.978,
    exposure: 0.82,
    cameraDistance: 4.85,
    keyIntensity: 2.20,
    fillIntensity: 0.22,
    hemisphereIntensity: 0.19,
    bloom: { strength: 0.025, radius: 0.22, threshold: 0.989 },
    material: {
      roughness: 0.86,
      metalness: 0,
      clearcoat: 0.01,
      specularIntensity: 0.15,
      envMapIntensity: 0.20,
      normalScale: 0.08,
      bumpScale: 0.002
    },
    atmosphere: { color: 0x75dbe2, scale: 1.070, intensity: 0.52, power: 4.0, opacity: 0.28 },
    rings: {
      inner: 1.46,
      outer: 2.06,
      alphaMap: 'rings_alpha.png',
      opacity: 0.31,
      color: 0x9eeaf0,
      roughness: 0.96,
      tiltOffset: 0
    }
  },
  neptune: {
    radius: 1.18,
    flattenY: 0.982,
    exposure: 0.78,
    cameraDistance: 4.66,
    keyIntensity: 2.34,
    fillIntensity: 0.18,
    hemisphereIntensity: 0.16,
    bloom: { strength: 0.035, radius: 0.24, threshold: 0.987 },
    material: {
      roughness: 0.84,
      metalness: 0,
      clearcoat: 0.01,
      specularIntensity: 0.16,
      envMapIntensity: 0.19,
      normalScale: 0.16,
      bumpScale: 0.004
    },
    cloudLayer: {
      map: 'clouds.png',
      scale: 1.010,
      opacity: 0.26,
      speed: 0.31,
      roughness: 1
    },
    atmosphere: { color: 0x376fe8, scale: 1.073, intensity: 0.62, power: 3.9, opacity: 0.34 },
    rings: {
      inner: 1.48,
      outer: 1.98,
      alphaMap: 'rings_alpha.png',
      opacity: 0.10,
      color: 0x5f7dc9,
      roughness: 1,
      tiltOffset: 0
    }
  }
};

function createRadialRingGeometry(innerRadius, outerRadius, segments = 512) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let segment = 0; segment <= segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    positions.push(
      cosine * innerRadius, 0, sine * innerRadius,
      cosine * outerRadius, 0, sine * outerRadius
    );
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(0, 0.5, 1, 0.5);
  }

  for (let segment = 0; segment < segments; segment += 1) {
    const base = segment * 2;
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}


function createSeededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createSaturnRingParticles(config) {
  const random = createSeededRandom(60591);
  const count = config.particleCount || 9000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = config.inner;
  const outer = config.outer;
  const span = outer - inner;

  const bandCenters = [
    inner + span * 0.08,
    inner + span * 0.20,
    inner + span * 0.36,
    inner + span * 0.53,
    inner + span * 0.71,
    inner + span * 0.88
  ];

  for (let index = 0; index < count; index += 1) {
    const bandIndex = Math.min(bandCenters.length - 1, Math.floor(random() * bandCenters.length));
    const center = bandCenters[bandIndex];
    const spread = span * (0.025 + random() * 0.045);
    let radius = center + (random() - 0.5) * spread * 2;
    radius = THREE.MathUtils.clamp(radius, inner, outer);
    const angle = random() * Math.PI * 2;
    const height = (random() - 0.5) * (config.thickness || 0.014) * 2.2;
    const offset = index * 3;

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = height;
    positions[offset + 2] = Math.sin(angle) * radius;

    const warmth = 0.72 + random() * 0.28;
    colors[offset] = warmth;
    colors[offset + 1] = 0.66 + random() * 0.24;
    colors[offset + 2] = 0.50 + random() * 0.20;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    size: config.particleSize || 0.011,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: config.particleOpacity || 0.34,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    toneMapped: true
  });

  const particles = new THREE.Points(geometry, material);
  particles.frustumCulled = false;
  particles.renderOrder = 2;
  return particles;
}

function createSaturnRingShadow(config) {
  const geometry = new THREE.SphereGeometry(config.radius * 1.0025, 192, 128);
  geometry.scale(1, config.flattenY, 1);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(config.ringShadow.color) },
      uLatitude: { value: config.ringShadow.latitude },
      uWidth: { value: config.ringShadow.width },
      uOpacity: { value: config.ringShadow.opacity }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uLatitude;
      uniform float uWidth;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        float latitudeDistance = abs(vUv.y - uLatitude);
        float band = exp(-pow(latitudeDistance / max(uWidth, 0.0001), 2.0));
        vec3 lightDirection = normalize(vec3(-0.64, 0.28, 0.72));
        float litSide = smoothstep(-0.35, 0.75, dot(normalize(vWorldNormal), lightDirection));
        float viewFacing = smoothstep(0.0, 0.55, dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPosition)));
        float alpha = band * uOpacity * mix(0.45, 1.0, litSide) * viewFacing;
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    blending: THREE.NormalBlending,
    toneMapped: true
  });

  const shadow = new THREE.Mesh(geometry, material);
  shadow.renderOrder = 4;
  return shadow;
}

function createSaturnRingSystem({ geometry, colorMap, alphaMap, config }) {
  const ringGroup = new THREE.Group();
  const topColor = new THREE.Color(config.color).multiplyScalar(1.03);
  const bottomColor = new THREE.Color(config.color).multiplyScalar(0.94);
  const common = {
    map: colorMap,
    alphaMap,
    color: config.color,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
    depthTest: true,
    roughness: config.roughness,
    metalness: 0,
    clearcoat: 0,
    specularIntensity: 0.055,
    envMapIntensity: 0.14,
    alphaTest: 0.022,
    alphaToCoverage: true,
    toneMapped: true
  };

  const topMaterial = new THREE.MeshPhysicalMaterial({
    ...common,
    side: THREE.FrontSide,
    color: topColor,
    emissive: topColor.clone().multiplyScalar(0.045),
    emissiveIntensity: 1
  });
  const bottomMaterial = new THREE.MeshPhysicalMaterial({
    ...common,
    side: THREE.BackSide,
    color: bottomColor,
    emissive: bottomColor.clone().multiplyScalar(0.035),
    emissiveIntensity: 1,
    roughness: Math.min(1, config.roughness + 0.04),
    specularIntensity: 0.04,
    envMapIntensity: 0.12
  });

  const offset = (config.thickness || 0.014) * 0.5;
  const top = new THREE.Mesh(geometry, topMaterial);
  const bottom = new THREE.Mesh(geometry.clone(), bottomMaterial);
  top.position.y = offset;
  bottom.position.y = -offset;
  top.receiveShadow = true;
  bottom.receiveShadow = true;
  top.castShadow = true;
  bottom.castShadow = true;
  top.renderOrder = 1;
  bottom.renderOrder = 1;

  const depthMaterial = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    alphaMap,
    alphaTest: 0.06,
    side: THREE.DoubleSide
  });
  top.customDepthMaterial = depthMaterial;
  bottom.customDepthMaterial = depthMaterial.clone();

  ringGroup.add(top, bottom, createSaturnRingParticles(config));
  ringGroup.rotation.x = config.tiltOffset || 0;
  ringGroup.userData.isSaturnRingSystem = true;
  return ringGroup;
}

function createLoadingPlanet(accentColor) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.12, 96, 64),
    new THREE.MeshPhysicalMaterial({
      color: accentColor,
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0,
      specularIntensity: 0.12,
      opacity: 0.42,
      transparent: true
    })
  );
}

export function createPlanetThreeRenderer(canvas, { onInteraction } = {}) {
  const renderer = createRenderer(canvas, { alpha: true, exposure: 0.82 });
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.18;
  scene.fog = new THREE.FogExp2(0x020817, 0.022);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.05, 0.02, 4.6);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.78;
  controls.minDistance = 2.55;
  controls.maxDistance = 7.0;
  controls.target.set(0, 0, 0);

  const stars = createStarfield({ count: 1450, radius: 34, minSize: 0.018, maxSize: 0.075, seed: 819 });
  scene.add(stars);

  const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.4);
  keyLight.position.set(-3.4, 2.3, 4.6);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(2048, 2048);
  keyLight.shadow.camera.near = 0.1;
  keyLight.shadow.camera.far = 18;
  keyLight.shadow.camera.left = -4;
  keyLight.shadow.camera.right = 4;
  keyLight.shadow.camera.top = 4;
  keyLight.shadow.camera.bottom = -4;
  keyLight.shadow.bias = -0.00045;
  keyLight.shadow.normalBias = 0.018;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6d8cff, 0.18);
  fillLight.position.set(3.3, -1.2, -2.4);
  scene.add(fillLight);

  const hemisphere = new THREE.HemisphereLight(0xa9c4ff, 0x050813, 0.16);
  scene.add(hemisphere);

  const { composer, bloom } = createComposer(renderer, scene, camera, {
    strength: 0.025,
    radius: 0.18,
    threshold: 0.99
  });

  const textureLoader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  const planetRoot = new THREE.Group();
  const spinRoot = new THREE.Group();
  planetRoot.add(spinRoot);
  scene.add(planetRoot);

  let currentPlanet = null;
  let currentConfig = PLANET_CONFIG.mercury;
  let currentObject = null;
  let currentCloudLayer = null;
  let currentTextures = [];
  let loadingObject = null;
  let automaticRotation = true;
  let running = true;
  let visible = document.visibilityState !== 'hidden';
  let animationFrame = 0;
  let previousTime = performance.now();
  let loadToken = 0;

  function configureLoadedTexture(texture, { color = false, repeat = true } = {}) {
    configureTexture(texture, { color, repeat });
    texture.anisotropy = maxAnisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }

  function loadTexture(relativePath, options = {}) {
    return new Promise((resolve, reject) => {
      textureLoader.load(`${textureRoot}/${currentPlanet.id}/${relativePath}`, (texture) => {
        resolve(configureLoadedTexture(texture, options));
      }, undefined, reject);
    });
  }

  function clearCurrentObject() {
    if (currentObject) {
      planetRoot.remove(currentObject);
      disposeThreeObject(currentObject);
      currentObject = null;
    }
    if (loadingObject) {
      spinRoot.remove(loadingObject);
      disposeThreeObject(loadingObject);
      loadingObject = null;
    }
    currentTextures.forEach((texture) => texture.dispose?.());
    currentTextures = [];
    currentCloudLayer = null;
  }

  async function buildPlanetScene(planet, config, token) {
    const colorMapPromise = loadTexture('color.jpg', { color: true });
    const normalMapPromise = loadTexture('normal.png');
    const roughnessMapPromise = loadTexture('roughness.png');
    const bumpMapPromise = loadTexture('bump.png');
    const optionalCloudMapPromise = config.cloudLayer?.map
      ? loadTexture(config.cloudLayer.map, { color: true })
      : Promise.resolve(null);
    const optionalCloudAlphaPromise = config.cloudLayer?.alphaMap
      ? loadTexture(config.cloudLayer.alphaMap)
      : Promise.resolve(null);
    const ringMapPromise = config.rings?.map
      ? loadTexture(config.rings.map, { color: true, repeat: false })
      : Promise.resolve(null);
    const ringAlphaPromise = config.rings?.alphaMap
      ? loadTexture(config.rings.alphaMap, { repeat: false })
      : config.rings?.map
        ? loadTexture(config.rings.map, { repeat: false })
        : Promise.resolve(null);

    const [colorMap, normalMap, roughnessMap, bumpMap, cloudMap, cloudAlphaMap, ringMap, ringAlphaMap] = await Promise.all([
      colorMapPromise,
      normalMapPromise,
      roughnessMapPromise,
      bumpMapPromise,
      optionalCloudMapPromise,
      optionalCloudAlphaPromise,
      ringMapPromise,
      ringAlphaPromise
    ]);

    if (!running || token !== loadToken) {
      [colorMap, normalMap, roughnessMap, bumpMap, cloudMap, cloudAlphaMap, ringMap, ringAlphaMap]
        .filter(Boolean)
        .forEach((texture) => texture.dispose());
      return null;
    }

    currentTextures = [colorMap, normalMap, roughnessMap, bumpMap, cloudMap, cloudAlphaMap, ringMap, ringAlphaMap].filter(Boolean);

    const system = new THREE.Group();
    const planetSpin = new THREE.Group();
    system.add(planetSpin);

    const geometry = new THREE.SphereGeometry(config.radius, 192, 128);
    geometry.scale(1, config.flattenY, 1);
    const material = new THREE.MeshPhysicalMaterial({
      map: colorMap,
      normalMap,
      normalScale: new THREE.Vector2(config.material.normalScale, config.material.normalScale),
      roughnessMap,
      roughness: config.material.roughness,
      bumpMap,
      bumpScale: config.material.bumpScale,
      metalness: config.material.metalness,
      clearcoat: config.material.clearcoat,
      clearcoatRoughness: 0.92,
      specularIntensity: config.material.specularIntensity,
      specularColor: config.material.specularColor ?? 0xffffff,
      envMapIntensity: config.material.envMapIntensity,
      sheen: config.material.sheen ?? 0,
      sheenColor: config.material.sheenColor ?? 0x000000,
      sheenRoughness: config.material.sheenRoughness ?? 1
    });
    const surface = new THREE.Mesh(geometry, material);
    surface.castShadow = true;
    surface.receiveShadow = true;
    planetSpin.add(surface);

    if (config.cloudLayer && cloudMap) {
      const cloudGeometry = new THREE.SphereGeometry(config.radius * config.cloudLayer.scale, 176, 112);
      cloudGeometry.scale(1, config.flattenY, 1);
      const cloudMaterial = new THREE.MeshPhysicalMaterial({
        map: cloudMap,
        alphaMap: cloudAlphaMap,
        transparent: true,
        opacity: config.cloudLayer.opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: config.cloudLayer.roughness,
        metalness: 0,
        clearcoat: 0,
        specularIntensity: 0.08,
        alphaTest: cloudAlphaMap ? 0.018 : 0.005
      });
      currentCloudLayer = new THREE.Mesh(cloudGeometry, cloudMaterial);
      system.add(currentCloudLayer);
    }

    if (config.atmosphere) {
      const atmosphereGeometry = new THREE.SphereGeometry(config.radius * config.atmosphere.scale, 144, 96);
      atmosphereGeometry.scale(1, config.flattenY, 1);
      const atmosphere = new THREE.Mesh(
        atmosphereGeometry,
        createAtmosphereMaterial({
          color: config.atmosphere.color,
          intensity: config.atmosphere.intensity,
          power: config.atmosphere.power,
          opacity: config.atmosphere.opacity
        })
      );
      system.add(atmosphere);
    }

    if (config.rings) {
      const ringGeometry = createRadialRingGeometry(
        config.rings.inner,
        config.rings.outer,
        planet.id === 'saturn' ? 1024 : 512
      );

      if (planet.id === 'saturn') {
        const ringSystem = createSaturnRingSystem({
          geometry: ringGeometry,
          colorMap: ringMap,
          alphaMap: ringAlphaMap,
          config: config.rings
        });
        system.add(ringSystem);
      } else {
        const ringMaterial = new THREE.MeshPhysicalMaterial({
          map: ringMap,
          alphaMap: ringAlphaMap,
          color: config.rings.color,
          transparent: true,
          opacity: config.rings.opacity,
          side: THREE.DoubleSide,
          depthWrite: false,
          depthTest: true,
          roughness: config.rings.roughness,
          metalness: 0,
          clearcoat: 0,
          specularIntensity: 0.08,
          envMapIntensity: 0.10,
          alphaTest: 0.015,
          alphaToCoverage: true
        });
        const rings = new THREE.Mesh(ringGeometry, ringMaterial);
        rings.rotation.x = config.rings.tiltOffset || 0;
        rings.receiveShadow = true;
        system.add(rings);
      }
    }

    if (planet.id === 'saturn' && config.ringShadow) {
      system.add(createSaturnRingShadow(config));
    }

    system.userData.spinRoot = planetSpin;
    system.userData.surface = surface;
    return system;
  }

  function getPresentationCameraDistance(planet, config) {
    if (planet.id !== 'saturn' || !config.fitRingsInInitialView || !config.rings) {
      return config.cameraDistance;
    }

    const halfVerticalFov = THREE.MathUtils.degToRad(camera.fov * 0.5);
    const tangent = Math.max(0.001, Math.tan(halfVerticalFov));
    const safeAspect = Math.max(0.62, camera.aspect || 1);
    const ringDiameterPadding = config.rings.outer * 1.09;
    const horizontalFit = ringDiameterPadding / (tangent * safeAspect);
    const verticalFit = (config.rings.outer * 0.62) / tangent;
    return Math.max(config.cameraDistance, horizontalFit, verticalFit);
  }

  function applyVisualSettings(planet, config) {
    renderer.toneMappingExposure = config.exposure;
    scene.environmentIntensity = config.environmentIntensity ?? 0.18;
    keyLight.intensity = config.keyIntensity;
    fillLight.intensity = config.fillIntensity;
    hemisphere.intensity = config.hemisphereIntensity;
    bloom.strength = config.bloom.strength;
    bloom.radius = config.bloom.radius;
    bloom.threshold = config.bloom.threshold;

    const keyPosition = config.keyPosition || [-3.4, 2.3, 4.6];
    const fillPosition = config.fillPosition || [3.3, -1.2, -2.4];
    keyLight.position.set(...keyPosition);
    fillLight.position.set(...fillPosition);

    const presentationDistance = getPresentationCameraDistance(planet, config);
    controls.minDistance = config.controls?.minDistance ?? 2.55;
    controls.maxDistance = Math.max(config.controls?.maxDistance ?? 7.0, presentationDistance + 0.8);
    controls.minPolarAngle = config.controls?.minPolarAngle ?? 0;
    controls.maxPolarAngle = config.controls?.maxPolarAngle ?? Math.PI;

    planetRoot.rotation.set(
      planet.viewer?.initialPitch ?? -0.15,
      planet.viewer?.initialYaw ?? 0.34,
      (planet.viewer?.axialTilt ?? 0) + (planet.viewer?.initialRoll ?? 0)
    );
    spinRoot.rotation.set(0, 0, 0);
    camera.position.set(config.cameraOffset?.x ?? 0.05, config.cameraOffset?.y ?? 0.02, presentationDistance);
    controls.target.set(0, 0, 0);
    controls.update();
  }

  async function setPlanet(nextPlanet) {
    currentPlanet = nextPlanet;
    currentConfig = PLANET_CONFIG[nextPlanet.id] || PLANET_CONFIG.mercury;
    loadToken += 1;
    const token = loadToken;
    automaticRotation = true;
    canvas.dataset.loading = 'true';
    canvas.style.setProperty('--planet-accent', nextPlanet.accentColor);

    clearCurrentObject();
    applyVisualSettings(nextPlanet, currentConfig);

    loadingObject = createLoadingPlanet(nextPlanet.accentColor);
    spinRoot.add(loadingObject);

    try {
      const nextObject = await buildPlanetScene(nextPlanet, currentConfig, token);
      if (!nextObject || token !== loadToken || !running) return;
      if (loadingObject) {
        spinRoot.remove(loadingObject);
        disposeThreeObject(loadingObject);
        loadingObject = null;
      }
      currentObject = nextObject;
      planetRoot.add(currentObject);
      canvas.dataset.loading = 'false';
      canvas.dataset.planetReady = nextPlanet.id;
    } catch (error) {
      console.error(`Unable to load the ${nextPlanet.name} PBR scene.`, error);
      canvas.dataset.loading = 'false';
      canvas.dataset.renderError = 'true';
    }
  }

  controls.addEventListener('start', () => {
    automaticRotation = false;
    onInteraction?.();
  });

  function resize() {
    resizeThreeSurface({ canvas, renderer, composer, camera, maxPixelRatio: 1.8 });
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  function animate(time) {
    if (!running) return;
    const delta = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    if (visible) {
      controls.update();
      if (currentObject) {
        const objectSpinRoot = currentObject.userData.spinRoot;
        if (automaticRotation && objectSpinRoot) {
          objectSpinRoot.rotation.y += delta * (Math.abs(currentPlanet?.viewer?.rotationSpeed ?? 0.12) * 0.72 + 0.035);
        }
        if (currentCloudLayer && currentConfig.cloudLayer) {
          currentCloudLayer.rotation.y += delta * currentConfig.cloudLayer.speed;
        }
      }
      if (loadingObject) loadingObject.rotation.y += delta * 0.18;
      stars.material.uniforms.uTime.value = time * 0.001;
      stars.rotation.y += delta * 0.005;
      composer.render(delta);
    }
    animationFrame = requestAnimationFrame(animate);
  }
  animationFrame = requestAnimationFrame(animate);

  function reset() {
    if (!currentPlanet) return;
    applyVisualSettings(currentPlanet, currentConfig);
    automaticRotation = true;
    if (currentObject?.userData?.spinRoot) currentObject.userData.spinRoot.rotation.set(0, 0, 0);
    if (currentCloudLayer) currentCloudLayer.rotation.set(0, 0, 0);
  }

  function onVisibilityChange() {
    visible = document.visibilityState !== 'hidden';
    previousTime = performance.now();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setPlanet,
    zoomIn() {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, 0.32);
      controls.update();
      onInteraction?.();
    },
    zoomOut() {
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, -0.32);
      controls.update();
      onInteraction?.();
    },
    reset,
    setAutoRotation(enabled) {
      automaticRotation = Boolean(enabled);
    },
    toggleAutoRotation() {
      automaticRotation = !automaticRotation;
      return automaticRotation;
    },
    getAutoRotation() {
      return automaticRotation;
    },
    dispose() {
      running = false;
      loadToken += 1;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controls.dispose();
      clearCurrentObject();
      disposeThreeObject(stars);
      environment.dispose();
      disposeComposer(composer);
      renderer.dispose();
    }
  };
}
