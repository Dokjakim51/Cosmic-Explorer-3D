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

const textureRoot = './public/textures/earth';

function createNightMaterial(nightTexture, lightDirection) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uNightMap: { value: nightTexture },
      uLightDirection: { value: lightDirection.clone().normalize() },
      uIntensity: { value: 1.35 }
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        vUv = uv;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uNightMap;
      uniform vec3 uLightDirection;
      uniform float uIntensity;
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      void main() {
        float lightAmount = dot(normalize(vWorldNormal), normalize(uLightDirection));
        float nightMask = smoothstep(0.22, -0.18, lightAmount);
        vec3 nightColor = texture2D(uNightMap, vUv).rgb;
        float luminance = dot(nightColor, vec3(0.2126, 0.7152, 0.0722));
        float cityMask = smoothstep(0.06, 0.55, luminance);
        vec3 warmLights = mix(nightColor, vec3(1.0, 0.63, 0.18), 0.34);
        gl_FragColor = vec4(warmLights * uIntensity, nightMask * cityMask * 0.72);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
}


function createAlphaMapFromTexture(texture) {
  const image = texture.image;
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const source = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const alphaPixels = new Uint8Array(canvas.width * canvas.height * 4);

  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < source.length; sourceIndex += 4, targetIndex += 4) {
    const alpha = source[sourceIndex + 3];
    alphaPixels[targetIndex] = alpha;
    alphaPixels[targetIndex + 1] = alpha;
    alphaPixels[targetIndex + 2] = alpha;
    alphaPixels[targetIndex + 3] = 255;
  }

  const alphaMap = new THREE.DataTexture(alphaPixels, canvas.width, canvas.height, THREE.RGBAFormat);
  alphaMap.colorSpace = THREE.NoColorSpace;
  alphaMap.wrapS = THREE.RepeatWrapping;
  alphaMap.wrapT = THREE.ClampToEdgeWrapping;
  alphaMap.needsUpdate = true;
  return alphaMap;
}

function createEarthScene(scene, renderer) {
  const loader = new THREE.TextureLoader();
  const maxAnisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());
  const load = (path, options = {}) => new Promise((resolve, reject) => {
    loader.load(path, (texture) => {
      configureTexture(texture, options);
      texture.anisotropy = maxAnisotropy;
      resolve(texture);
    }, undefined, reject);
  });

  return Promise.all([
    load(`${textureRoot}/earth_day_2k.jpg`, { color: true }),
    load(`${textureRoot}/earth_normal_2k.png`),
    load(`${textureRoot}/earth_roughness_2k.png`),
    load(`${textureRoot}/earth_clouds_2k.png`, { color: true }),
    load(`${textureRoot}/earth_night_2k.jpg`, { color: true })
  ]).then(([dayMap, normalMap, roughnessMap, cloudMap, nightMap]) => {
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = THREE.MathUtils.degToRad(-23.4);
    scene.add(earthGroup);

    const sphereGeometry = new THREE.SphereGeometry(1.18, 160, 96);
    const earthMaterial = new THREE.MeshPhysicalMaterial({
      map: dayMap,
      normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughnessMap,
      roughness: 0.82,
      metalness: 0,
      clearcoat: 0.02,
      clearcoatRoughness: 0.86,
      specularIntensity: 0.28,
      envMapIntensity: 0.24
    });
    const earth = new THREE.Mesh(sphereGeometry, earthMaterial);
    earth.castShadow = true;
    earth.receiveShadow = true;
    earthGroup.add(earth);

    const sunDirection = new THREE.Vector3(-2.7, 1.65, 3.2).normalize();
    const night = new THREE.Mesh(
      new THREE.SphereGeometry(1.184, 160, 96),
      createNightMaterial(nightMap, sunDirection)
    );
    earthGroup.add(night);

    const cloudAlphaMap = createAlphaMapFromTexture(cloudMap);

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.198, 160, 96),
      new THREE.MeshPhysicalMaterial({
        map: cloudMap,
        alphaMap: cloudAlphaMap,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        side: THREE.DoubleSide,
        roughness: 1.0,
        metalness: 0,
        clearcoat: 0.0,
        specularIntensity: 0.12,
        alphaTest: 0.035
      })
    );
    earthGroup.add(clouds);

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.31, 128, 80),
      createAtmosphereMaterial({ color: 0x4c9fff, intensity: 0.72, power: 4.1, opacity: 0.48 })
    );
    earthGroup.add(atmosphere);

    const sun = new THREE.DirectionalLight(0xfff7ee, 2.15);
    sun.position.set(-3.3, 2.1, 4.5);
    sun.castShadow = true;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6d87ff, 0.32);
    fill.position.set(3.2, -1.1, -2.2);
    scene.add(fill);

    const hemisphere = new THREE.HemisphereLight(0x8fb8ff, 0x061027, 0.24);
    scene.add(hemisphere);

    return {
      earthGroup,
      earth,
      clouds,
      night,
      atmosphere,
      sunDirection,
      textures: [dayMap, normalMap, roughnessMap, cloudMap, cloudAlphaMap, nightMap]
    };
  });
}

export function createEarthThreeRenderer(canvas, { onInteraction } = {}) {
  const renderer = createRenderer(canvas, { alpha: true, exposure: 0.86 });
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.28;
  scene.fog = new THREE.FogExp2(0x020817, 0.025);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.05, 0.03, 4.55);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.75;
  controls.minDistance = 2.55;
  controls.maxDistance = 6.2;
  controls.target.set(0, 0, 0);
  controls.addEventListener('start', () => {
    automaticRotation = false;
    onInteraction?.();
  });

  const stars = createStarfield({ count: 1500, radius: 34, minSize: 0.02, maxSize: 0.08, seed: 314 });
  scene.add(stars);
  const { composer } = createComposer(renderer, scene, camera, { strength: 0.12, radius: 0.24, threshold: 0.96 });

  let earthScene = null;
  let automaticRotation = true;
  let running = true;
  let animationFrame = 0;
  let previousTime = performance.now();
  let planet = null;
  let visible = document.visibilityState !== 'hidden';

  createEarthScene(scene, renderer).then((value) => {
    if (!running) {
      disposeThreeObject(value.earthGroup);
      value.textures.forEach((texture) => texture.dispose());
      return;
    }
    earthScene = value;
  }).catch((error) => {
    console.error('Unable to load the Earth PBR scene.', error);
    canvas.dataset.renderError = 'true';
  });

  function resize() {
    resizeThreeSurface({ canvas, renderer, composer, camera, maxPixelRatio: 1.7 });
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
      if (earthScene) {
        if (automaticRotation) earthScene.earthGroup.rotation.y += delta * 0.115;
        earthScene.clouds.rotation.y += delta * 0.145;
        earthScene.night.rotation.y = earthScene.earth.rotation.y;
      }
      stars.material.uniforms.uTime.value = time * 0.001;
      stars.rotation.y += delta * 0.006;
      composer.render(delta);
    }
    animationFrame = requestAnimationFrame(animate);
  }
  animationFrame = requestAnimationFrame(animate);

  function reset() {
    camera.position.set(0.05, 0.03, planet?.viewer?.cameraDistance ? planet.viewer.cameraDistance + 1.1 : 4.55);
    controls.target.set(0, 0, 0);
    controls.update();
    if (earthScene) {
      earthScene.earthGroup.rotation.set(0, 0, THREE.MathUtils.degToRad(-23.4));
      earthScene.clouds.rotation.set(0, 0, 0);
    }
    automaticRotation = true;
  }

  const onDoubleClick = () => {
    reset();
    onInteraction?.();
  };
  canvas.addEventListener('dblclick', onDoubleClick);
  const onVisibility = () => {
    visible = document.visibilityState !== 'hidden';
    previousTime = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    setPlanet(nextPlanet) {
      planet = nextPlanet;
      reset();
    },
    zoomIn() {
      camera.position.multiplyScalar(0.88);
      if (camera.position.length() < controls.minDistance) camera.position.setLength(controls.minDistance);
      controls.update();
      onInteraction?.();
    },
    zoomOut() {
      camera.position.multiplyScalar(1.12);
      if (camera.position.length() > controls.maxDistance) camera.position.setLength(controls.maxDistance);
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
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      canvas.removeEventListener('dblclick', onDoubleClick);
      document.removeEventListener('visibilitychange', onVisibility);
      controls.dispose();
      disposeThreeObject(scene);
      environment.dispose();
      disposeComposer(composer);
      renderer.dispose();
    }
  };
}
