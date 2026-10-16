import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  THREE,
  createAtmosphereMaterial,
  createComposer,
  createRenderer,
  createStarfield,
  createStudioEnvironment,
  disposeComposer,
  disposeThreeObject,
  resizeThreeSurface
} from '../three/three-scene-utils.js';

function seededNoise(seed = 17) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createExoplanetTextures(renderer) {
  const width = 2048;
  const height = 1024;
  const random = seededNoise(1407);

  const surface = document.createElement('canvas');
  surface.width = width;
  surface.height = height;
  const context = surface.getContext('2d');

  const base = context.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#d7d4cf');
  base.addColorStop(0.18, '#c4b9aa');
  base.addColorStop(0.34, '#9f9484');
  base.addColorStop(0.52, '#7f7880');
  base.addColorStop(0.68, '#61718d');
  base.addColorStop(0.84, '#65574f');
  base.addColorStop(1, '#342f35');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  for (let band = 0; band < 58; band += 1) {
    const y = (band / 58) * height;
    const thickness = 7 + random() * 24;
    const alpha = 0.10 + random() * 0.16;
    const hue = band % 4 === 0 ? 36 : band % 4 === 1 ? 215 : band % 4 === 2 ? 24 : 255;
    const sat = band % 4 === 1 ? 24 + random() * 16 : 22 + random() * 20;
    const light = band % 4 === 0 ? 58 + random() * 12 : 42 + random() * 17;

    context.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    context.beginPath();
    context.moveTo(0, y);
    for (let x = 0; x <= width; x += 18) {
      const wave = Math.sin(x * 0.008 + band * 0.9) * (5 + random() * 10)
        + Math.sin(x * 0.003 + band * 0.35) * 8
        + Math.cos(x * 0.014 + band * 0.22) * 3;
      context.lineTo(x, y + wave);
    }
    context.lineTo(width, y + thickness);
    context.lineTo(0, y + thickness);
    context.closePath();
    context.fill();
  }

  context.globalCompositeOperation = 'screen';
  for (let cloud = 0; cloud < 18; cloud += 1) {
    const x = random() * width;
    const y = random() * height;
    const rx = 100 + random() * 240;
    const ry = 18 + random() * 52;
    const cloudGradient = context.createRadialGradient(x - rx * 0.22, y - ry * 0.16, 2, x, y, rx);
    cloudGradient.addColorStop(0, `hsla(${215 + random() * 20}, 60%, 92%, ${0.12 + random() * 0.1})`);
    cloudGradient.addColorStop(0.35, `hsla(${36 + random() * 12}, 65%, 88%, ${0.06 + random() * 0.08})`);
    cloudGradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = cloudGradient;
    context.beginPath();
    context.ellipse(x, y, rx, ry, random() * 0.3 - 0.15, 0, Math.PI * 2);
    context.fill();
  }
  context.globalCompositeOperation = 'source-over';

  const surfaceTexture = new THREE.CanvasTexture(surface);
  surfaceTexture.colorSpace = THREE.SRGBColorSpace;
  surfaceTexture.wrapS = THREE.RepeatWrapping;
  surfaceTexture.wrapT = THREE.ClampToEdgeWrapping;
  surfaceTexture.anisotropy = Math.min(12, renderer.capabilities.getMaxAnisotropy());

  const normalCanvas = document.createElement('canvas');
  normalCanvas.width = width;
  normalCanvas.height = height;
  const normalContext = normalCanvas.getContext('2d');
  const image = normalContext.createImageData(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const latBands = Math.sin(y * 0.067 + Math.sin(x * 0.006) * 2.4);
      const turbulence = Math.cos(x * 0.018 + y * 0.02) * 0.45;
      image.data[index] = 128 + Math.round(turbulence * 26);
      image.data[index + 1] = 128 + Math.round(latBands * 28);
      image.data[index + 2] = 238;
      image.data[index + 3] = 255;
    }
  }
  normalContext.putImageData(image, 0, 0);
  const normalTexture = new THREE.CanvasTexture(normalCanvas);
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessCanvas = document.createElement('canvas');
  roughnessCanvas.width = width;
  roughnessCanvas.height = height;
  const roughnessContext = roughnessCanvas.getContext('2d');
  const roughnessGradient = roughnessContext.createLinearGradient(0, 0, 0, height);
  roughnessGradient.addColorStop(0, '#939393');
  roughnessGradient.addColorStop(0.5, '#727272');
  roughnessGradient.addColorStop(1, '#8b8b8b');
  roughnessContext.fillStyle = roughnessGradient;
  roughnessContext.fillRect(0, 0, width, height);
  const roughnessTexture = new THREE.CanvasTexture(roughnessCanvas);
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.ClampToEdgeWrapping;

  return { surfaceTexture, normalTexture, roughnessTexture };
}

function createRingTexture(renderer) {
  const width = 2048;
  const height = 256;
  const random = seededNoise(9127);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  context.clearRect(0, 0, width, height);
  for (let x = 0; x < width; x += 1) {
    const u = x / (width - 1);
    const band = Math.sin(u * 82) * 0.5 + 0.5;
    const fine = Math.sin(u * 210 + Math.sin(u * 13) * 2.2) * 0.5 + 0.5;
    const gaps = Math.sin(u * 29 - 1.4) * 0.5 + 0.5;
    const dust = 0.42 + random() * 0.58;
    const cassini = 1 - Math.exp(-Math.pow((u - 0.58) / 0.032, 2));
    const alpha = Math.max(0, (0.18 + band * 0.28 + fine * 0.24) * dust * (0.55 + gaps * 0.45) * cassini);
    const hue = 42 + Math.sin(u * 9) * 8;
    const sat = 28 + fine * 18;
    const light = 48 + band * 28;
    context.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    context.fillRect(x, 0, 1, height);
  }

  context.globalCompositeOperation = 'destination-in';
  const fade = context.createLinearGradient(0, 0, 0, height);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.18, 'rgba(0,0,0,0.82)');
  fade.addColorStop(0.5, 'rgba(0,0,0,1)');
  fade.addColorStop(0.82, 'rgba(0,0,0,0.82)');
  fade.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fade;
  context.fillRect(0, 0, width, height);

  context.globalCompositeOperation = 'screen';
  for (let streak = 0; streak < 48; streak += 1) {
    const x = random() * width;
    const streakWidth = 12 + random() * 28;
    const glow = context.createLinearGradient(x - streakWidth, 0, x + streakWidth, 0);
    glow.addColorStop(0, 'rgba(255,255,255,0)');
    glow.addColorStop(0.5, `rgba(255,245,224,${0.06 + random() * 0.08})`);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = glow;
    context.fillRect(x - streakWidth, 0, streakWidth * 2, height);
  }
  context.globalCompositeOperation = 'source-over';

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

function createRingParticleField() {
  const random = seededNoise(7713);
  const count = 5200;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = 1.76;
  const outer = 3.32;
  const bandCenters = [1.88, 2.08, 2.32, 2.62, 2.94, 3.18];

  for (let index = 0; index < count; index += 1) {
    const center = bandCenters[Math.floor(random() * bandCenters.length)];
    const spread = 0.026 + random() * 0.09;
    const radius = THREE.MathUtils.clamp(center + (random() - 0.5) * spread * 2.8, inner, outer);
    const angle = random() * Math.PI * 2;
    const verticalJitter = (random() - 0.5) * 0.018;
    const offset = index * 3;
    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = verticalJitter;
    positions[offset + 2] = Math.sin(angle) * radius;

    const tone = 0.76 + random() * 0.24;
    colors[offset] = tone;
    colors[offset + 1] = 0.78 + random() * 0.18;
    colors[offset + 2] = 0.64 + random() * 0.12;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.02,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity: 0.58,
    depthWrite: false,
    blending: THREE.NormalBlending
  });
  const points = new THREE.Points(geometry, material);
  points.rotation.x = THREE.MathUtils.degToRad(53);
  points.rotation.z = THREE.MathUtils.degToRad(-10.5);
  return points;
}

function createMoon({ radius, color, position, roughness = 0.92 }) {
  const material = new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: 0,
    clearcoat: 0.02,
    clearcoatRoughness: 0.9
  });
  const moon = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 40), material);
  moon.position.copy(position);
  moon.castShadow = true;
  moon.receiveShadow = true;
  return moon;
}

export function createHeroThreeScene(canvas) {
  const renderer = createRenderer(canvas, { alpha: true, exposure: 0.88 });
  const scene = new THREE.Scene();
  const environment = createStudioEnvironment(renderer);
  scene.environment = environment;
  scene.environmentIntensity = 0.42;
  scene.fog = new THREE.FogExp2(0x020612, 0.018);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  camera.position.set(0.15, 0.08, 6.65);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.045;
  controls.rotateSpeed = 0.24;
  controls.minPolarAngle = Math.PI * 0.34;
  controls.maxPolarAngle = Math.PI * 0.66;
  controls.target.set(0.62, -0.03, 0);

  const stars = createStarfield({ count: 1800, radius: 40, minSize: 0.018, maxSize: 0.08, color: 0xd7e4ff, seed: 1417 });
  scene.add(stars);

  const planetSystem = new THREE.Group();
  planetSystem.position.set(0.72, -0.02, 0);
  planetSystem.rotation.z = THREE.MathUtils.degToRad(-11);
  scene.add(planetSystem);

  const { surfaceTexture, normalTexture, roughnessTexture } = createExoplanetTextures(renderer);
  const planet = new THREE.Mesh(
    new THREE.SphereGeometry(1.48, 200, 128),
    new THREE.MeshPhysicalMaterial({
      map: surfaceTexture,
      normalMap: normalTexture,
      normalScale: new THREE.Vector2(0.22, 0.22),
      roughnessMap: roughnessTexture,
      roughness: 0.78,
      metalness: 0.0,
      clearcoat: 0.08,
      clearcoatRoughness: 0.7,
      iridescence: 0.02,
      envMapIntensity: 0.32
    })
  );
  planet.castShadow = true;
  planet.receiveShadow = true;
  planetSystem.add(planet);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.58, 144, 92),
    createAtmosphereMaterial({ color: 0x88a9e8, intensity: 0.42, power: 4.35, opacity: 0.28 })
  );
  planetSystem.add(atmosphere);

  const ringTexture = createRingTexture(renderer);
  const ringConfig = [
    { inner: 1.72, outer: 1.96, opacity: 0.88, tilt: -2.2 },
    { inner: 1.99, outer: 2.18, opacity: 0.96, tilt: -0.6 },
    { inner: 2.22, outer: 2.46, opacity: 0.78, tilt: 1.2 },
    { inner: 2.52, outer: 2.76, opacity: 0.68, tilt: 2.4 },
    { inner: 2.82, outer: 3.08, opacity: 0.56, tilt: 3.3 },
    { inner: 3.12, outer: 3.34, opacity: 0.34, tilt: 4.1 }
  ];
  const ringGroup = new THREE.Group();
  ringConfig.forEach(({ inner, outer, opacity, tilt }) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(inner, outer, 360, 1),
      new THREE.MeshPhysicalMaterial({
        map: ringTexture,
        alphaMap: ringTexture,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.95,
        metalness: 0,
        color: 0xe8dbc1,
        emissive: 0x261d12,
        emissiveIntensity: 0.06
      })
    );
    ring.rotation.x = THREE.MathUtils.degToRad(53);
    ring.rotation.z = THREE.MathUtils.degToRad(tilt - 9.5);
    ringGroup.add(ring);
  });
  ringGroup.rotation.x = THREE.MathUtils.degToRad(-1.5);
  ringGroup.rotation.y = THREE.MathUtils.degToRad(1.5);
  ringGroup.add(createRingParticleField());
  planetSystem.add(ringGroup);

  const moonOne = createMoon({
    radius: 0.18,
    color: 0x6a7ba2,
    position: new THREE.Vector3(-2.65, 1.05, 0.72)
  });
  scene.add(moonOne);

  const moonTwo = createMoon({
    radius: 0.24,
    color: 0xa9b7d9,
    position: new THREE.Vector3(2.65, -1.0, 0.96),
    roughness: 0.88
  });
  scene.add(moonTwo);

  const keyLight = new THREE.DirectionalLight(0xffead3, 1.58);
  keyLight.position.set(-4.8, 2.8, 5.5);
  keyLight.castShadow = true;
  scene.add(keyLight);

  const coolFill = new THREE.PointLight(0x648fe0, 1.18, 12, 1.8);
  coolFill.position.set(3.1, 0.2, 2.0);
  scene.add(coolFill);

  const warmRim = new THREE.PointLight(0xd6aa78, 0.92, 12, 1.9);
  warmRim.position.set(-3.1, -1.8, 1.7);
  scene.add(warmRim);
  scene.add(new THREE.HemisphereLight(0xb9cef0, 0x04060e, 0.26));

  const { composer } = createComposer(renderer, scene, camera, { strength: 0.08, radius: 0.22, threshold: 0.96 });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let running = true;
  let animationFrame = 0;
  let previousTime = performance.now();
  let visible = document.visibilityState !== 'hidden';

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
      if (!reducedMotion) {
        planet.rotation.y += delta * 0.05;
        ringGroup.rotation.z += delta * 0.008;
        moonOne.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.09);
        moonTwo.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), -delta * 0.06);
        stars.rotation.y += delta * 0.0024;
      }
      stars.material.uniforms.uTime.value = time * 0.001;
      composer.render(delta);
    }
    animationFrame = requestAnimationFrame(animate);
  }
  animationFrame = requestAnimationFrame(animate);

  const onVisibility = () => {
    visible = document.visibilityState !== 'hidden';
    previousTime = performance.now();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    running = false;
    cancelAnimationFrame(animationFrame);
    resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', onVisibility);
    controls.dispose();
    disposeThreeObject(scene);
    environment.dispose();
    disposeComposer(composer);
    renderer.dispose();
  };
}
