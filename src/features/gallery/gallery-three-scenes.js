import { THREE, createAtmosphereMaterial, createStarfield, disposeThreeObject } from '../three/three-scene-utils.js';

const TAU = Math.PI * 2;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function seededRandom(seed = 1) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeRadialTexture({ inner = '#ffffff', middle = '#8ec5ff', outer = 'rgba(0,0,0,0)', size = 256 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.18, middle);
  gradient.addColorStop(1, outer);
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCloudTexture({ colors = ['rgba(255,255,255,.9)', 'rgba(100,120,255,.45)', 'rgba(0,0,0,0)'], seed = 7 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  const random = seededRandom(seed);
  context.clearRect(0, 0, 256, 256);
  context.globalCompositeOperation = 'screen';
  for (let index = 0; index < 42; index += 1) {
    const x = 48 + random() * 160;
    const y = 48 + random() * 160;
    const radius = 20 + random() * 60;
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, colors[index % Math.max(1, colors.length - 1)]);
    gradient.addColorStop(1, colors.at(-1));
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, TAU);
    context.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeGlowSprite(color = 0x8ab4ff, scale = 2.5, opacity = 0.32, texture = null) {
  const map = texture || makeRadialTexture({ middle: `#${new THREE.Color(color).getHexString()}` });
  const material = new THREE.SpriteMaterial({
    map,
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: true
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.setScalar(scale);
  return sprite;
}

function makePointCloud({
  count = 1200,
  seed = 1,
  positionFor,
  colorFor = () => new THREE.Color(0xffffff),
  sizeFor = () => 0.05,
  opacity = 0.9,
  additive = true,
  twinkle = 0.25
} = {}) {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);
  const color = new THREE.Color();

  for (let index = 0; index < count; index += 1) {
    const point = positionFor(random, index, count) || new THREE.Vector3();
    const offset = index * 3;
    positions[offset] = point.x;
    positions[offset + 1] = point.y;
    positions[offset + 2] = point.z;
    color.copy(colorFor(random, index, count, point));
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
    sizes[index] = sizeFor(random, index, count, point);
    phases[index] = random() * TAU;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uOpacity: { value: opacity },
      uTwinkle: { value: twinkle }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uTwinkle;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float pulse = 1.0 + sin(uTime * 1.4 + aPhase) * uTwinkle;
        gl_PointSize = max(1.0, aSize * pulse * uPixelRatio * (330.0 / max(1.0, -mv.z)));
        gl_Position = projectionMatrix * mv;
        vColor = color;
        vAlpha = pulse;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uOpacity;
      void main() {
        vec2 p = gl_PointCoord - 0.5;
        float d = length(p);
        float core = smoothstep(0.5, 0.0, d);
        float halo = smoothstep(0.5, 0.17, d) * 0.32;
        float alpha = (core + halo) * uOpacity * clamp(vAlpha, 0.45, 1.55);
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * (0.72 + core * 0.9), alpha);
      }
    `,
    transparent: true,
    vertexColors: true,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    toneMapped: true
  });
  return new THREE.Points(geometry, material);
}

function makeStarSurface({
  radius = 0.65,
  deep = 0x7c1606,
  mid = 0xff7a1a,
  hot = 0xfff4b8,
  noiseScale = 5,
  speed = 0.2,
  roughness = 0.35
} = {}) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color(deep) },
      uMid: { value: new THREE.Color(mid) },
      uHot: { value: new THREE.Color(hot) },
      uNoiseScale: { value: noiseScale },
      uSpeed: { value: speed },
      uRoughness: { value: roughness }
    },
    vertexShader: `
      varying vec3 vNormalW;
      varying vec3 vPosition;
      varying vec3 vWorld;
      void main() {
        vPosition = position;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeep;
      uniform vec3 uMid;
      uniform vec3 uHot;
      uniform float uNoiseScale;
      uniform float uSpeed;
      uniform float uRoughness;
      varying vec3 vNormalW;
      varying vec3 vPosition;
      varying vec3 vWorld;
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + vec3(.1,.2,.3));
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f*f*(3.0-2.0*f);
        return mix(mix(mix(hash(i+vec3(0,0,0)), hash(i+vec3(1,0,0)), f.x),
                       mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                       mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
      }
      float fbm(vec3 p) {
        float value = 0.0;
        float amp = 0.55;
        for (int i = 0; i < 5; i++) {
          value += noise(p) * amp;
          p = p * 2.03 + vec3(4.7, 1.9, 7.2);
          amp *= 0.5;
        }
        return value;
      }
      void main() {
        vec3 p = normalize(vPosition) * uNoiseScale;
        float flow = fbm(p + vec3(uTime * uSpeed, -uTime * uSpeed * .55, uTime * uSpeed * .28));
        float cells = fbm(p * 2.7 - vec3(uTime * uSpeed * .38));
        float energy = smoothstep(.18, .92, flow * .78 + cells * .38);
        vec3 color = mix(uDeep, uMid, smoothstep(.08, .78, energy));
        color = mix(color, uHot, smoothstep(.62, 1.0, cells + energy * .34));
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - max(dot(vNormalW, viewDirection), 0.0), 2.5);
        color += uHot * rim * .62;
        color *= 1.0 - uRoughness * (1.0 - energy) * .18;
        gl_FragColor = vec4(color * 0.92, 1.0);
      }
    `,
    toneMapped: true
  });
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 6), material);
  const glow = makeGlowSprite(hot, radius * 2.7, 0.14);
  const outer = makeGlowSprite(mid, radius * 4.1, 0.05);
  mesh.add(glow, outer);
  return mesh;
}

function makeTube(points, { color = 0x8fdcff, radius = 0.012, opacity = 0.65, segments = 128, radialSegments = 6, additive = true } = {}) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    toneMapped: true
  });
  return new THREE.Mesh(geometry, material);
}

function makeRing({ inner = 0.65, outer = 1.65, color = 0xff8b3d, opacity = 0.68, tilt = 0.18 } = {}) {
  const geometry = new THREE.RingGeometry(inner, outer, 192, 4);
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.rotation.x = Math.PI / 2 + tilt;
  return ring;
}

function makeAccretionSystem({ seed = 10, scale = 1, jets = false, jetFacing = false } = {}) {
  const group = new THREE.Group();
  const black = new THREE.Mesh(
    new THREE.SphereGeometry(0.54 * scale, 64, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false })
  );
  black.renderOrder = 8;
  group.add(black);

  // A soft Fresnel shell suggests lensing without drawing an artificial white ring.
  const lensingShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.68 * scale, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffb36d) },
        uOpacity: { value: jets ? 0.075 : 0.1 }
      },
      vertexShader: `
        varying vec3 vNormalW;
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormalW;
        varying vec3 vWorld;
        void main() {
          vec3 viewDirection = normalize(cameraPosition - vWorld);
          float fresnel = pow(1.0 - max(dot(vNormalW, viewDirection), 0.0), 3.2);
          float alpha = fresnel * uOpacity;
          if (alpha < 0.004) discard;
          gl_FragColor = vec4(uColor * (0.45 + fresnel * 0.45), alpha);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: true
    })
  );
  group.add(lensingShell);

  const disk = makePointCloud({
    count: 4700,
    seed,
    positionFor(random) {
      const radius = scale * (0.72 + Math.pow(random(), 0.68) * 1.72);
      const angle = random() * TAU;
      const thickness = (random() - 0.5) * 0.075 * scale * (radius / scale);
      return new THREE.Vector3(Math.cos(angle) * radius, thickness, Math.sin(angle) * radius);
    },
    colorFor(random, index, count, point) {
      const radius = Math.hypot(point.x, point.z) / scale;
      const angle = Math.atan2(point.z, point.x);
      const doppler = 0.5 + Math.cos(angle - 0.3) * 0.5;
      if (radius < 1.03) return new THREE.Color().setHSL(0.11, 0.8, 0.58 + doppler * 0.14);
      if (doppler > 0.58) return new THREE.Color().setHSL(0.07, 0.86, 0.42 + random() * 0.14);
      return new THREE.Color().setHSL(0.75, 0.58, 0.36 + random() * 0.12);
    },
    sizeFor: (random) => scale * (0.018 + random() * 0.052),
    opacity: 0.68,
    twinkle: 0.1
  });
  disk.rotation.x = 0.2;
  group.add(disk);

  const innerDisk = makeRing({ inner: 0.7 * scale, outer: 1.1 * scale, color: 0xffc57d, opacity: 0.1, tilt: 0.2 });
  const outerDisk = makeRing({ inner: 1.15 * scale, outer: 2.35 * scale, color: 0xd84d28, opacity: 0.055, tilt: 0.2 });
  group.add(innerDisk, outerDisk);

  const glow = makeGlowSprite(0xff6c38, 3.6 * scale, 0.055);
  glow.position.z = -0.1;
  group.add(glow);

  let jetGroup = null;
  if (jets) {
    jetGroup = new THREE.Group();
    const axis = jetFacing ? new THREE.Vector3(0.1, 0.06, 1).normalize() : new THREE.Vector3(0, 1, 0);
    const jet = makePointCloud({
      count: 1600,
      seed: seed + 99,
      positionFor(random, index) {
        const side = index % 2 === 0 ? 1 : -1;
        const distance = scale * (0.45 + Math.pow(random(), 0.72) * 4.5) * side;
        const spread = scale * (0.012 + Math.abs(distance) * 0.038) * Math.pow(random(), 1.8);
        const theta = random() * TAU;
        const perpendicularA = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
        if (perpendicularA.lengthSq() < 0.1) perpendicularA.set(0, 0, 1);
        const perpendicularB = axis.clone().cross(perpendicularA).normalize();
        return axis.clone().multiplyScalar(distance)
          .addScaledVector(perpendicularA, Math.cos(theta) * spread)
          .addScaledVector(perpendicularB, Math.sin(theta) * spread);
      },
      colorFor(random, index) {
        const side = index % 2;
        return side ? new THREE.Color(0x64b7d6).lerp(new THREE.Color(0xdbefff), random()) : new THREE.Color(0x8d61be).lerp(new THREE.Color(0xe9ddff), random());
      },
      sizeFor: (random) => scale * (0.018 + random() * 0.055),
      opacity: jetFacing ? 0.56 : 0.62,
      twinkle: 0.22
    });
    jetGroup.add(jet);
    if (jetFacing) {
      const sheath = new THREE.Mesh(
        new THREE.ConeGeometry(0.46 * scale, 4.2 * scale, 42, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x73d8f2, transparent: true, opacity: 0.045, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
      );
      sheath.rotation.x = Math.PI / 2;
      sheath.position.z = 2.2 * scale;
      jetGroup.add(sheath);
      [1.05, 1.8, 2.65, 3.45].forEach((distance, index) => {
        const knot = makeGlowSprite(index % 2 ? 0xdaf8ff : 0x76d8f4, (0.34 + index * 0.13) * scale, 0.045 - index * 0.006);
        knot.position.z = distance * scale;
        jetGroup.add(knot);
      });
    }
    group.add(jetGroup);
  }

  return {
    group,
    update(time, delta) {
      disk.rotation.y += delta * 0.16;
      innerDisk.rotation.z -= delta * 0.08;
      outerDisk.rotation.z += delta * 0.035;
      disk.material.uniforms.uTime.value = time;
      if (jetGroup) {
        jetGroup.children.forEach((child, index) => {
          if (child.material?.uniforms?.uTime) child.material.uniforms.uTime.value = time;
          if (child.geometry?.type === 'TorusGeometry') child.scale.setScalar(1 + Math.sin(time * 1.7 - index * 0.5) * 0.035);
        });
      }
    }
  };
}

function addDefaultSpace(scene, { seed = 1, count = 720, color = 0xaed4ff, radius = 22, fog = 0x020510 } = {}) {
  scene.background = new THREE.Color(0x01030a);
  scene.fog = new THREE.FogExp2(fog, 0.02);
  const stars = createStarfield({ count, radius, color, seed, minSize: 0.012, maxSize: 0.055 });
  scene.add(stars);
  return stars;
}

function makeBaseScene({ seed = 1, camera = [0, 0.3, 7], target = [0, 0, 0], fov = 42, bloom = { strength: 0.42, radius: 0.38, threshold: 0.88 }, previewBloom = null, previewCamera = null, previewTarget = null, previewFov = null, accent = '#8fdcff', exposure = 0.9, previewExposure = 0.82 } = {}) {
  const scene = new THREE.Scene();
  const starfield = addDefaultSpace(scene, { seed });
  const cameraObject = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);
  cameraObject.position.fromArray(camera);
  const targetVector = new THREE.Vector3().fromArray(target);
  cameraObject.lookAt(targetVector);
  const updates = [];
  const cleanup = [];
  const record = {
    scene,
    camera: cameraObject,
    target: targetVector,
    bloom,
    previewBloom: previewBloom || {
      strength: Math.max(0.24, bloom.strength * 0.88),
      radius: Math.max(0.2, bloom.radius * 0.96),
      threshold: Math.min(1, bloom.threshold + 0.01)
    },
    previewCameraPosition: new THREE.Vector3().fromArray(previewCamera || camera),
    previewTarget: new THREE.Vector3().fromArray(previewTarget || target),
    previewFov: previewFov || fov,
    accent,
    exposure,
    previewExposure,
    update(time, delta) {
      if (starfield.material?.uniforms?.uTime) starfield.material.uniforms.uTime.value = time;
      if (!reducedMotion()) updates.forEach((callback) => callback(time, delta));
    },
    onUpdate(callback) { updates.push(callback); },
    onCleanup(callback) { cleanup.push(callback); },
    dispose() {
      cleanup.forEach((callback) => callback());
      disposeThreeObject(scene);
    }
  };
  return record;
}

function buildBlackHole() {
  const record = makeBaseScene({ seed: 11, camera: [0, 1.15, 6.2], previewCamera: [0, 1.2, 6.7], fov: 40, bloom: { strength: 0.76, radius: 0.41, threshold: 0.805 }, previewBloom: { strength: 0.67, radius: 0.39, threshold: 0.815 }, accent: '#ff8a3d', exposure: 1.04, previewExposure: 1.02 });
  const system = makeAccretionSystem({ seed: 31, scale: 1.12 });
  system.group.rotation.z = -0.08;
  record.scene.add(system.group);
  record.onUpdate((time, delta) => { system.update(time, delta); system.group.rotation.y = Math.sin(time * 0.12) * 0.08; });
  return record;
}

function buildQuasar() {
  const record = makeBaseScene({ seed: 21, camera: [4.5, 2.4, 7.3], previewCamera: [4.8, 2.6, 7.8], target: [0, 0.2, 0], fov: 40, bloom: { strength: 0.80, radius: 0.43, threshold: 0.79 }, previewBloom: { strength: 0.69, radius: 0.40, threshold: 0.81 }, accent: '#7ee7ff', exposure: 1.05, previewExposure: 1.03 });
  const system = makeAccretionSystem({ seed: 54, scale: 0.88, jets: true });
  system.group.rotation.z = -0.18;
  record.scene.add(system.group);
  const host = makePointCloud({
    count: 1500,
    seed: 80,
    positionFor(random) {
      const radius = 1.7 + Math.pow(random(), 0.6) * 3.8;
      const theta = random() * TAU;
      const height = (random() - 0.5) * 0.35;
      return new THREE.Vector3(Math.cos(theta) * radius, height, Math.sin(theta) * radius);
    },
    colorFor: (random) => new THREE.Color().setHSL(0.58 + random() * 0.16, 0.55, 0.55 + random() * 0.25),
    sizeFor: (random) => 0.025 + random() * 0.055,
    opacity: 0.32,
    twinkle: 0.16
  });
  host.rotation.x = 0.08;
  record.scene.add(host);
  record.onUpdate((time, delta) => { system.update(time, delta); host.rotation.y += delta * 0.012; host.material.uniforms.uTime.value = time; });
  return record;
}

function buildBlazar() {
  const record = makeBaseScene({ seed: 32, camera: [0.25, 0.16, 6.9], previewCamera: [0.25, 0.16, 7.4], target: [0, 0, 0.45], fov: 38, bloom: { strength: 0.71, radius: 0.37, threshold: 0.82 }, previewBloom: { strength: 0.62, radius: 0.35, threshold: 0.84 }, accent: '#62cfff', exposure: 1.03, previewExposure: 1.01 });
  const system = makeAccretionSystem({ seed: 67, scale: 0.92, jets: true, jetFacing: true });
  system.group.rotation.x = 0.26;
  record.scene.add(system.group);
  const flare = makeGlowSprite(0xb9e9ff, 3.7, 0.065);
  flare.position.z = 2.2;
  record.scene.add(flare);
  record.onUpdate((time, delta) => {
    system.update(time, delta);
    flare.material.opacity = 0.035 + Math.pow(Math.max(0, Math.sin(time * 2.6)), 5) * 0.055;
    flare.scale.setScalar(3.4 + Math.sin(time * 1.8) * 0.22);
  });
  return record;
}

function buildTidalDisruption() {
  const record = makeBaseScene({ seed: 43, camera: [1.8, 1.3, 7.5], previewCamera: [2.0, 1.35, 8.0], target: [0.2, 0, 0], fov: 41, bloom: { strength: 0.74, radius: 0.39, threshold: 0.815 }, previewBloom: { strength: 0.64, radius: 0.37, threshold: 0.825 }, accent: '#ff7648', exposure: 1.04, previewExposure: 1.02 });
  const black = makeAccretionSystem({ seed: 91, scale: 0.76 });
  black.group.position.x = -1.2;
  black.group.rotation.z = 0.12;
  record.scene.add(black.group);

  const star = makeStarSurface({ radius: 0.55, deep: 0x8b1d08, mid: 0xff7a28, hot: 0xfff0ae, noiseScale: 5.7, speed: 0.28 });
  star.position.set(1.15, 0.15, 0.15);
  star.scale.set(1.42, 0.78, 0.72);
  record.scene.add(star);

  const streamPoints = [];
  for (let index = 0; index < 18; index += 1) {
    const t = index / 17;
    streamPoints.push(new THREE.Vector3(0.95 - t * 2.25, 0.15 + Math.sin(t * Math.PI) * 0.52, 0.12 + Math.sin(t * TAU) * 0.18));
  }
  const stream = makeTube(streamPoints, { color: 0xffa95d, radius: 0.055, opacity: 0.34, radialSegments: 8, additive: false });
  const streamCore = makeTube(streamPoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.03, 0))), { color: 0xffd9a6, radius: 0.014, opacity: 0.56, additive: false });
  record.scene.add(stream, streamCore);

  const debris = makePointCloud({
    count: 1450,
    seed: 118,
    positionFor(random) {
      const t = random();
      const base = new THREE.Vector3(0.9 - t * 2.45, 0.14 + Math.sin(t * Math.PI) * 0.5, 0.12 + Math.sin(t * TAU) * 0.18);
      return base.add(new THREE.Vector3((random() - 0.5) * 0.25, (random() - 0.5) * 0.18, (random() - 0.5) * 0.24));
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0xff7027), new THREE.Color(0xfff5c8), random()),
    sizeFor: (random) => 0.025 + random() * 0.07,
    opacity: 0.54,
    additive: false,
    twinkle: 0.22
  });
  record.scene.add(debris);
  record.onUpdate((time, delta) => {
    black.update(time, delta);
    star.rotation.y += delta * 0.22;
    star.material.uniforms.uTime.value = time;
    debris.material.uniforms.uTime.value = time;
    debris.rotation.y = Math.sin(time * 0.18) * 0.08;
    stream.material.opacity = 0.29 + Math.sin(time * 1.2) * 0.045;
  });
  return record;
}

function makeSurfaceCracks({ radius = 0.7, count = 12, seed = 1, colorA = 0xffc77f, colorB = 0x8fdcff } = {}) {
  const group = new THREE.Group();
  const random = seededRandom(seed);
  for (let index = 0; index < count; index += 1) {
    const theta0 = random() * TAU;
    const phi0 = 0.28 + random() * (Math.PI - 0.56);
    const length = 0.2 + random() * 0.38;
    const points = [];
    for (let step = 0; step <= 9; step += 1) {
      const t = step / 9;
      const theta = theta0 + (t - 0.5) * length + Math.sin(t * Math.PI * 2 + index) * 0.025;
      const phi = phi0 + Math.sin(t * Math.PI) * (random() - 0.5) * 0.12;
      const r = radius * 1.006;
      points.push(new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r,
        Math.cos(phi) * r,
        Math.sin(phi) * Math.sin(theta) * r
      ));
    }
    group.add(makeTube(points, {
      color: index % 3 === 0 ? colorB : colorA,
      radius: 0.0045 + random() * 0.0025,
      opacity: 0.22 + random() * 0.22,
      segments: 36,
      radialSegments: 4,
      additive: false
    }));
  }
  return group;
}

function makeDipoleField({ radius = 0.68, count = 8, extent = 1.25, color = 0x7bc7e7, opacity = 0.12, twist = 0 } = {}) {
  const group = new THREE.Group();
  for (let index = 0; index < count; index += 1) {
    const azimuth = index / count * TAU;
    const points = [];
    for (let step = 0; step <= 42; step += 1) {
      const t = step / 42;
      const polar = 0.08 + t * (Math.PI - 0.16);
      const arch = Math.pow(Math.sin(polar), 1.65);
      const r = radius + extent * arch;
      const angle = azimuth + twist * Math.sin(t * Math.PI);
      points.push(new THREE.Vector3(
        Math.sin(polar) * Math.cos(angle) * r,
        Math.cos(polar) * r,
        Math.sin(polar) * Math.sin(angle) * r
      ));
    }
    group.add(makeTube(points, {
      color: new THREE.Color(color).offsetHSL((index % 3 - 1) * 0.035, 0, 0).getHex(),
      radius: 0.0045 + (index % 3) * 0.001,
      opacity: opacity * (0.78 + (index % 4) * 0.08),
      segments: 84,
      radialSegments: 4,
      additive: false
    }));
  }
  return group;
}

function makePolarBeams({ seed = 1, length = 4.5, spread = 0.34, color = 0x91d9ef, opacity = 0.08 } = {}) {
  const group = new THREE.Group();
  const beamTexture = makeRadialTexture({ inner: '#ffffff', middle: `#${new THREE.Color(color).getHexString()}`, outer: 'rgba(0,0,0,0)' });
  for (const side of [-1, 1]) {
    const beam = new THREE.Group();
    beam.position.y = side * 0.42;
    if (side < 0) beam.rotation.z = Math.PI;

    const sheath = new THREE.Mesh(
      new THREE.ConeGeometry(spread, length, 48, 1, true),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: true
      })
    );
    sheath.position.y = length * 0.5;

    const core = new THREE.Mesh(
      new THREE.ConeGeometry(spread * 0.24, length * 0.94, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xe9fbff,
        transparent: true,
        opacity: opacity * 1.6,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: true
      })
    );
    core.position.y = length * 0.47;

    const particles = makePointCloud({
      count: 760,
      seed: seed + (side > 0 ? 1 : 2),
      positionFor(random) {
        const y = 0.12 + Math.pow(random(), 0.82) * length;
        const localSpread = (0.01 + y * 0.035) * Math.pow(random(), 2.2);
        const angle = random() * TAU;
        return new THREE.Vector3(Math.cos(angle) * localSpread, y, Math.sin(angle) * localSpread);
      },
      colorFor: (random) => new THREE.Color(color).lerp(new THREE.Color(0xf5fdff), random() * 0.72),
      sizeFor: (random) => 0.012 + Math.pow(random(), 1.8) * 0.045,
      opacity: 0.62,
      twinkle: 0.12
    });

    for (let index = 0; index < 3; index += 1) {
      const knot = makeGlowSprite(color, spread * (2.1 + index * 1.2), opacity * (1.05 - index * 0.18), beamTexture);
      knot.position.y = length * (0.25 + index * 0.25);
      beam.add(knot);
    }
    beam.add(sheath, core, particles);
    group.add(beam);
  }
  group.userData.beamTexture = beamTexture;
  return group;
}

function buildPulsar() {
  const record = makeBaseScene({ seed: 52, camera: [3.0, 1.55, 7.0], previewCamera: [2.8, 1.4, 7.5], fov: 41, bloom: { strength: 0.70, radius: 0.35, threshold: 0.82 }, previewBloom: { strength: 0.61, radius: 0.33, threshold: 0.84 }, accent: '#7edcff', exposure: 1.04, previewExposure: 1.02 });
  record.scene.fog = new THREE.FogExp2(0x010713, 0.018);

  const spinFrame = new THREE.Group();
  spinFrame.rotation.set(0.18, 0.02, -0.24);
  const star = makeStarSurface({ radius: 0.68, deep: 0x061326, mid: 0x2e7195, hot: 0xe8fbff, noiseScale: 12.4, speed: 0.7, roughness: 0.2 });
  const crust = makeSurfaceCracks({ radius: 0.68, count: 13, seed: 188, colorA: 0x62bcd2, colorB: 0xe8fbff });
  spinFrame.add(star, crust);

  const magneticAxis = new THREE.Group();
  magneticAxis.rotation.z = THREE.MathUtils.degToRad(31);
  const beams = makePolarBeams({ seed: 220, length: 4.45, spread: 0.32, color: 0x80dcf5, opacity: 0.07 });
  const field = makeDipoleField({ radius: 0.7, count: 5, extent: 0.78, color: 0x66b7cf, opacity: 0.045, twist: 0.08 });
  const capMaterial = new THREE.MeshStandardMaterial({ color: 0xeefcff, emissive: 0xa6edff, emissiveIntensity: 1.55, roughness: 0.24 });
  const northCap = new THREE.Mesh(new THREE.SphereGeometry(0.105, 28, 18), capMaterial);
  northCap.position.y = 0.66;
  northCap.scale.y = 0.42;
  const southCap = northCap.clone();
  southCap.material = capMaterial.clone();
  southCap.position.y = -0.66;
  magneticAxis.add(field, beams, northCap, southCap);
  spinFrame.add(magneticAxis);

  const wind = makePointCloud({
    count: 1500,
    seed: 231,
    positionFor(random) {
      const radius = 1.0 + Math.pow(random(), 0.7) * 1.65;
      const angle = random() * TAU;
      const thickness = (random() - 0.5) * (0.055 + radius * 0.045);
      return new THREE.Vector3(Math.cos(angle) * radius, thickness, Math.sin(angle) * radius);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x2e7798), new THREE.Color(0xa8edff), random()),
    sizeFor: (random) => 0.008 + random() * 0.029,
    opacity: 0.31,
    additive: false,
    twinkle: 0.1
  });
  wind.rotation.x = 0.18;
  spinFrame.add(wind);
  record.scene.add(spinFrame);

  const key = new THREE.DirectionalLight(0xbcefff, 2.2);
  key.position.set(-3.5, 2.7, 4.2);
  const coolRim = new THREE.DirectionalLight(0x397ca9, 1.2);
  coolRim.position.set(3.2, -1.4, -2.5);
  record.scene.add(new THREE.AmbientLight(0x10283b, 0.58), key, coolRim);

  record.onUpdate((time, delta) => {
    spinFrame.rotation.y += delta * 1.52;
    star.rotation.y += delta * 0.85;
    star.material.uniforms.uTime.value = time;
    wind.rotation.y -= delta * 0.12;
    wind.material.uniforms.uTime.value = time;
    field.rotation.y = Math.sin(time * 0.35) * 0.045;
    beams.children.forEach((beam, beamIndex) => {
      beam.children.forEach((child) => {
        if (child.material?.uniforms?.uTime) child.material.uniforms.uTime.value = time;
        if (child.geometry?.type === 'ConeGeometry') {
          const sweep = 0.82 + Math.pow(Math.max(0, Math.sin(time * 3.1 + beamIndex * Math.PI)), 4) * 0.34;
          child.material.opacity = (child.geometry.parameters.radius || 0.1) < 0.12 ? 0.105 * sweep : 0.067 * sweep;
        }
      });
    });
  });
  record.onCleanup(() => beams.userData.beamTexture?.dispose?.());
  return record;
}

function buildMagnetar() {
  const record = makeBaseScene({ seed: 61, camera: [3.25, 1.8, 7.1], previewCamera: [3.05, 1.65, 7.7], fov: 41, bloom: { strength: 0.72, radius: 0.37, threshold: 0.81 }, previewBloom: { strength: 0.63, radius: 0.35, threshold: 0.83 }, accent: '#55e0d0', exposure: 1.04, previewExposure: 1.02 });
  record.scene.fog = new THREE.FogExp2(0x03090d, 0.019);
  const system = new THREE.Group();
  system.rotation.set(-0.1, 0.12, -0.22);

  const star = makeStarSurface({ radius: 0.78, deep: 0x071c20, mid: 0x187c78, hot: 0xffe0ad, noiseScale: 13.2, speed: 0.64, roughness: 0.22 });
  const cracks = makeSurfaceCracks({ radius: 0.78, count: 22, seed: 260, colorA: 0xffa85f, colorB: 0x7ff4df });
  const closeField = makeDipoleField({ radius: 0.81, count: 7, extent: 0.58, color: 0x57d5c5, opacity: 0.065, twist: 0.42 });
  closeField.rotation.z = 0.28;

  const activeArcs = new THREE.Group();
  const random = seededRandom(281);
  for (let index = 0; index < 10; index += 1) {
    const azimuth = random() * TAU;
    const latitude = (random() - 0.5) * 0.9;
    const start = new THREE.Vector3(Math.cos(azimuth) * 0.76, latitude, Math.sin(azimuth) * 0.76).normalize().multiplyScalar(0.79);
    const endAngle = azimuth + 0.35 + random() * 0.75;
    const end = new THREE.Vector3(Math.cos(endAngle) * 0.76, latitude * 0.5 + (random() - 0.5) * 0.35, Math.sin(endAngle) * 0.76).normalize().multiplyScalar(0.79);
    const middle = start.clone().add(end).normalize().multiplyScalar(1.0 + random() * 0.48);
    const curve = new THREE.QuadraticBezierCurve3(start, middle, end);
    const points = Array.from({ length: 25 }, (_, step) => curve.getPoint(step / 24));
    activeArcs.add(makeTube(points, {
      color: index % 3 === 0 ? 0xffae62 : 0x6ee5d6,
      radius: 0.006 + random() * 0.006,
      opacity: 0.32 + random() * 0.18,
      segments: 56,
      radialSegments: 5,
      additive: true
    }));
  }

  const flareCloud = makePointCloud({
    count: 900,
    seed: 302,
    positionFor(random) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const radius = 0.86 + Math.pow(random(), 2.6) * 1.5;
      const direction = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      return direction.multiplyScalar(radius);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x46bfb7), new THREE.Color(0xffa05c), random()),
    sizeFor: (random) => 0.01 + random() * 0.038,
    opacity: 0.3,
    additive: false,
    twinkle: 0.2
  });

  const corona = makeGlowSprite(0x66e0cf, 2.45, 0.055);
  system.add(star, cracks, closeField, activeArcs, flareCloud, corona);
  record.scene.add(system);
  const key = new THREE.DirectionalLight(0xc4fff4, 2.0);
  key.position.set(-3, 2.7, 4.2);
  const quakeLight = new THREE.PointLight(0xff9a59, 2.1, 4.8, 2);
  quakeLight.position.set(0.8, 0.4, 1.5);
  record.scene.add(new THREE.AmbientLight(0x102a28, 0.62), key, quakeLight);

  record.onUpdate((time, delta) => {
    system.rotation.y += delta * 0.36;
    star.rotation.y += delta * 0.25;
    star.material.uniforms.uTime.value = time;
    closeField.rotation.y -= delta * 0.075;
    activeArcs.rotation.y += delta * 0.045;
    activeArcs.children.forEach((arc, index) => {
      arc.material.opacity = 0.25 + Math.pow(Math.max(0, Math.sin(time * 1.55 + index * 0.83)), 5) * 0.28;
    });
    flareCloud.material.uniforms.uTime.value = time;
    corona.material.opacity = 0.045 + Math.sin(time * 0.9) * 0.012;
    quakeLight.intensity = 1.75 + Math.pow(Math.max(0, Math.sin(time * 1.4)), 7) * 1.6;
  });
  return record;
}

function buildSupernova() {
  const record = makeBaseScene({ seed: 70, camera: [0.8, 0.35, 7.2], previewCamera: [0.9, 0.4, 7.8], fov: 43, bloom: { strength: 0.87, radius: 0.45, threshold: 0.76 }, previewBloom: { strength: 0.76, radius: 0.43, threshold: 0.78 }, accent: '#ff653b', exposure: 1.05, previewExposure: 1.03 });
  const core = makeStarSurface({ radius: 0.42, deep: 0xcf2206, mid: 0xff8a23, hot: 0xffffff, noiseScale: 6, speed: 0.9, roughness: 0.05 });
  const shock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 5),
    makeNebulaShellMaterial({ color: 0xd5783f, secondary: 0xe4b178, opacity: 0.12, scale: 5.8 })
  );
  shock.scale.set(1.08, 0.94, 1.02);
  const outerShock = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.85, 5),
    makeNebulaShellMaterial({ color: 0x557b91, secondary: 0x795c82, opacity: 0.075, scale: 6.7 })
  );
  outerShock.scale.set(1.08, 0.92, 1.15);
  const ejecta = makePointCloud({
    count: 4000,
    seed: 244,
    positionFor(random) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const lobe = 0.72 + Math.abs(Math.sin(theta * 3 + phi * 2)) * 0.55;
      const radius = (0.48 + Math.pow(random(), 0.42) * 2.8) * lobe;
      return new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(radius);
    },
    colorFor(random, index, count, point) {
      const radius = point.length();
      if (radius < 1.1) return new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0xffb45d), random());
      return new THREE.Color().lerpColors(new THREE.Color(0xff5328), new THREE.Color(0x6dbdff), random() * 0.75);
    },
    sizeFor: (random) => 0.02 + random() * 0.09,
    opacity: 0.56,
    additive: false,
    twinkle: 0.25
  });
  record.scene.add(core, shock, outerShock, ejecta);
  record.onUpdate((time, delta) => {
    core.material.uniforms.uTime.value = time;
    core.rotation.y += delta * 0.28;
    shock.rotation.y += delta * 0.09;
    outerShock.rotation.x -= delta * 0.05;
    const pulse = 1 + Math.sin(time * 0.7) * 0.035;
    shock.scale.setScalar(pulse);
    outerShock.scale.setScalar(1 + Math.sin(time * 0.55 + 1) * 0.025);
    ejecta.rotation.y += delta * 0.035;
    ejecta.material.uniforms.uTime.value = time;
  });
  return record;
}

function buildSupernovaRemnant() {
  const record = makeBaseScene({ seed: 81, camera: [0.8, 0.2, 7.8], previewCamera: [0.7, 0.15, 8.4], fov: 43, bloom: { strength: 0.73, radius: 0.39, threshold: 0.805 }, previewBloom: { strength: 0.63, radius: 0.37, threshold: 0.825 }, accent: '#43d2d4', exposure: 1.04, previewExposure: 1.02 });
  record.scene.fog = new THREE.FogExp2(0x02060b, 0.02);

  const remnant = new THREE.Group();
  const innerGas = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.42, 5),
    makeNebulaShellMaterial({ color: 0x258f94, secondary: 0xc76637, opacity: 0.12, scale: 6.4 })
  );
  innerGas.scale.set(1.12, 0.94, 1.06);
  const outerGas = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.92, 5),
    makeNebulaShellMaterial({ color: 0x2ebfc2, secondary: 0xe98b45, opacity: 0.095, scale: 7.8 })
  );
  outerGas.scale.set(1.08, 1.0, 1.16);
  outerGas.rotation.set(0.22, -0.18, 0.08);

  const shell = makePointCloud({
    count: 6900,
    seed: 277,
    positionFor(random) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const direction = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      const cellular = Math.sin(theta * 4.0 + phi * 2.2) * 0.16 + Math.sin(theta * 9.0 - phi * 5.0) * 0.07;
      const radius = 1.68 + cellular + (random() - 0.5) * 0.34;
      return direction.multiplyScalar(radius * (0.9 + Math.abs(direction.y) * 0.18));
    },
    colorFor(random, index, count, point) {
      const warmSide = point.x + point.z * 0.45 > 0.12;
      if (warmSide) return new THREE.Color().lerpColors(new THREE.Color(0xb83f24), new THREE.Color(0xffb253), Math.pow(random(), 0.72));
      return new THREE.Color().lerpColors(new THREE.Color(0x207f91), new THREE.Color(0x65e0d7), Math.pow(random(), 0.8));
    },
    sizeFor: (random) => 0.014 + Math.pow(random(), 1.7) * 0.065,
    opacity: 0.62,
    additive: false,
    twinkle: 0.1
  });

  const brokenFilaments = new THREE.Group();
  const random = seededRandom(333);
  for (let index = 0; index < 18; index += 1) {
    const theta0 = random() * TAU;
    const phi0 = 0.25 + random() * (Math.PI - 0.5);
    const span = 0.18 + random() * 0.5;
    const points = [];
    for (let step = 0; step <= 22; step += 1) {
      const t = step / 22;
      const theta = theta0 + (t - 0.5) * span;
      const phi = phi0 + Math.sin(t * Math.PI) * (random() - 0.5) * 0.34;
      const radius = 1.72 + Math.sin(t * Math.PI * 2 + index) * 0.06 + (index % 3) * 0.035;
      points.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)).multiplyScalar(radius));
    }
    brokenFilaments.add(makeTube(points, {
      color: index % 4 < 2 ? 0x58d8d1 : 0xff9a4b,
      radius: 0.012 + random() * 0.012,
      opacity: 0.22 + random() * 0.22,
      segments: 58,
      radialSegments: 5,
      additive: true
    }));
  }

  const knots = makePointCloud({
    count: 850,
    seed: 350,
    positionFor(random) {
      const cluster = random() < 0.55 ? new THREE.Vector3(0.9, 0.35, 0.3) : new THREE.Vector3(-0.75, -0.25, -0.2);
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const r = Math.pow(random(), 2.0) * 0.9;
      return cluster.clone().add(new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).multiplyScalar(r));
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0xff7838), new THREE.Color(0x71ded5), random()),
    sizeFor: (random) => 0.018 + random() * 0.07,
    opacity: 0.48,
    additive: false,
    twinkle: 0.14
  });

  const compactObject = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 32, 20),
    new THREE.MeshStandardMaterial({ color: 0xb9e6ea, emissive: 0x4db2ba, emissiveIntensity: 0.8, roughness: 0.4 })
  );
  compactObject.add(makeGlowSprite(0x62d5d1, 0.72, 0.08));

  remnant.add(innerGas, outerGas, shell, brokenFilaments, knots, compactObject);
  record.scene.add(remnant, new THREE.AmbientLight(0x132328, 0.5));
  const warmLight = new THREE.PointLight(0xff8b45, 1.4, 5.5, 2);
  warmLight.position.set(1.7, 0.8, 1.8);
  const coolLight = new THREE.PointLight(0x48cfcb, 1.3, 5.5, 2);
  coolLight.position.set(-1.5, -0.5, 1.2);
  record.scene.add(warmLight, coolLight);

  record.onUpdate((time, delta) => {
    remnant.rotation.y += delta * 0.022;
    innerGas.rotation.y -= delta * 0.015;
    outerGas.rotation.x += delta * 0.008;
    shell.material.uniforms.uTime.value = time;
    knots.material.uniforms.uTime.value = time;
    brokenFilaments.rotation.z = Math.sin(time * 0.08) * 0.035;
  });
  return record;
}

function buildKilonova() {
  const record = makeBaseScene({ seed: 91, camera: [2.8, 1.6, 7.6], previewCamera: [2.9, 1.65, 8.2], fov: 42, bloom: { strength: 0.80, radius: 0.41, threshold: 0.79 }, previewBloom: { strength: 0.69, radius: 0.39, threshold: 0.81 }, accent: '#7fc8ff', exposure: 1.05, previewExposure: 1.03 });
  const binary = new THREE.Group();
  const starA = makeStarSurface({ radius: 0.36, deep: 0x214f9d, mid: 0x82c7ff, hot: 0xffffff, noiseScale: 9, speed: 0.9, roughness: 0.1 });
  const starB = makeStarSurface({ radius: 0.33, deep: 0x58258f, mid: 0xb272ff, hot: 0xffffff, noiseScale: 9, speed: 1.1, roughness: 0.08 });
  starA.position.x = -0.46;
  starB.position.x = 0.46;
  binary.add(starA, starB);
  record.scene.add(binary);
  const ejecta = makePointCloud({
    count: 3800,
    seed: 365,
    positionFor(random) {
      const angle = random() * TAU;
      const radius = 0.55 + Math.pow(random(), 0.55) * 3.2;
      const height = (random() - 0.5) * (0.08 + radius * 0.22);
      return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    },
    colorFor: (random, index, count, point) => {
      const radius = point.length();
      if (radius < 1.3) return new THREE.Color().lerpColors(new THREE.Color(0xffffff), new THREE.Color(0x8dd8ff), random());
      return new THREE.Color().lerpColors(new THREE.Color(0x7d54ff), new THREE.Color(0xff7048), random());
    },
    sizeFor: (random) => 0.018 + random() * 0.07,
    opacity: 0.52,
    additive: false,
    twinkle: 0.26
  });
  record.scene.add(ejecta);
  for (const side of [-1, 1]) {
    const jet = makePointCloud({
      count: 650,
      seed: 401 + side,
      positionFor(random) {
        const y = side * (0.35 + random() * 4.2);
        const spread = Math.abs(y) * 0.035 * Math.pow(random(), 1.6);
        const theta = random() * TAU;
        return new THREE.Vector3(Math.cos(theta) * spread, y, Math.sin(theta) * spread);
      },
      colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x86e9ff), new THREE.Color(0xffffff), random()),
      sizeFor: (random) => 0.018 + random() * 0.055,
      opacity: 0.46,
      additive: false,
      twinkle: 0.28
    });
    record.scene.add(jet);
  }
  const wave = new THREE.Mesh(
    new THREE.TorusGeometry(1.5, 0.016, 8, 160),
    new THREE.MeshBasicMaterial({ color: 0x8fb6c9, transparent: true, opacity: 0.1, blending: THREE.NormalBlending, depthWrite: false, toneMapped: true })
  );
  wave.rotation.x = Math.PI / 2;
  record.scene.add(wave);
  record.onUpdate((time, delta) => {
    binary.rotation.y += delta * 0.72;
    starA.material.uniforms.uTime.value = time;
    starB.material.uniforms.uTime.value = time;
    ejecta.rotation.y += delta * 0.06;
    ejecta.material.uniforms.uTime.value = time;
    record.scene.children.forEach((child) => { if (child.material?.uniforms?.uTime) child.material.uniforms.uTime.value = time; });
    wave.scale.setScalar(1 + Math.sin(time * 1.1) * 0.08);
    wave.material.opacity = 0.075 + Math.sin(time * 1.1) * 0.025;
  });
  return record;
}

function makeCloudVolume({ seed, count = 44, spread = new THREE.Vector3(5, 3, 3), palette = [0x6f466f, 0x315f70, 0x8f5b52], opacity = 0.1, scale = 1 } = {}) {
  const texture = makeCloudTexture({
    colors: ['rgba(255,255,255,.78)', 'rgba(170,190,220,.25)', 'rgba(0,0,0,0)'],
    seed
  });
  const group = new THREE.Group();
  const random = seededRandom(seed);
  for (let index = 0; index < count; index += 1) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: palette[index % palette.length],
      transparent: true,
      opacity: opacity * (0.45 + random() * 0.75),
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
      toneMapped: true,
      rotation: random() * TAU
    });
    const sprite = new THREE.Sprite(material);
    const side = index % 2 ? -1 : 1;
    sprite.position.set(
      (random() - 0.5) * spread.x + side * (0.35 + random() * 0.55),
      (random() - 0.5) * spread.y,
      (random() - 0.5) * spread.z
    );
    const width = scale * (0.75 + random() * 1.7);
    const height = width * (0.55 + random() * 0.7);
    sprite.scale.set(width, height, 1);
    group.add(sprite);
  }
  group.userData.cloudTexture = texture;
  return group;
}

function makeDustPillar({ seed = 1, position = new THREE.Vector3(), height = 2.5, width = 0.45, lean = 0, color = 0x3b2525, emissive = 0x1d0c10, rim = 0xff8b5f } = {}) {
  const random = seededRandom(seed);
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.94,
    metalness: 0,
    emissive,
    emissiveIntensity: 0.34,
    flatShading: true
  });
  const rimMaterial = new THREE.MeshBasicMaterial({
    color: rim,
    transparent: true,
    opacity: 0.045,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: true
  });
  const segments = 8;
  for (let index = 0; index < segments; index += 1) {
    const t = index / (segments - 1);
    const radius = width * (1 - t * 0.42) * (0.76 + random() * 0.46);
    const geometry = new THREE.DodecahedronGeometry(radius, 1);
    const knot = new THREE.Mesh(geometry, material.clone());
    knot.position.set(
      Math.sin(t * 2.8 + seed) * width * 0.22 + t * lean,
      t * height - height * 0.5,
      Math.cos(t * 3.6 + seed) * width * 0.16
    );
    knot.scale.set(1, 1.24 + random() * 0.58, 0.84 + random() * 0.32);
    knot.rotation.set(random() * 0.5, random() * TAU, random() * 0.4);
    const rimShell = new THREE.Mesh(geometry.clone(), rimMaterial.clone());
    rimShell.scale.setScalar(1.055);
    knot.add(rimShell);
    group.add(knot);
  }
  const capGeometry = new THREE.DodecahedronGeometry(width * 0.72, 1);
  const cap = new THREE.Mesh(capGeometry, material.clone());
  cap.position.set(lean, height * 0.53, 0);
  cap.scale.set(1.35, 0.8, 1.1);
  cap.rotation.z = 0.35;
  const capRim = new THREE.Mesh(capGeometry.clone(), rimMaterial.clone());
  capRim.scale.setScalar(1.06);
  cap.add(capRim);
  group.add(cap);
  group.position.copy(position);
  return group;
}

function buildProtostar() {
  const record = makeBaseScene({ seed: 111, camera: [3.5, 2.0, 7.4], previewCamera: [3.7, 2.1, 8.0], fov: 42, bloom: { strength: 0.74, radius: 0.39, threshold: 0.81 }, previewBloom: { strength: 0.64, radius: 0.37, threshold: 0.83 }, accent: '#ffad4f', exposure: 1.04, previewExposure: 1.02 });
  const star = makeStarSurface({ radius: 0.62, deep: 0x8f2305, mid: 0xff8a2c, hot: 0xfff0b5, noiseScale: 4.8, speed: 0.32, roughness: 0.2 });
  record.scene.add(star);
  const disk = makePointCloud({
    count: 5200,
    seed: 600,
    positionFor(random) {
      let radius = 0.82 + Math.pow(random(), 0.72) * 2.8;
      const gap = Math.abs(radius - 1.85) < 0.14 || Math.abs(radius - 2.65) < 0.1;
      if (gap) radius += 0.18;
      const angle = random() * TAU;
      const height = (random() - 0.5) * (0.04 + radius * 0.025);
      return new THREE.Vector3(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    },
    colorFor(random, index, count, point) {
      const radius = Math.hypot(point.x, point.z);
      return radius < 1.35 ? new THREE.Color().lerpColors(new THREE.Color(0xfff1bc), new THREE.Color(0xff8a37), random()) : new THREE.Color().lerpColors(new THREE.Color(0xb46e42), new THREE.Color(0x6f5aa8), random());
    },
    sizeFor: (random) => 0.02 + random() * 0.065,
    opacity: 0.58,
    additive: false,
    twinkle: 0.12
  });
  disk.rotation.x = 0.18;
  record.scene.add(disk);
  const rings = new THREE.Group();
  [1.1, 1.8, 2.55, 3.2].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018 + index * 0.006, 8, 180), new THREE.MeshBasicMaterial({ color: index < 2 ? 0xb87e4e : 0x6f668e, transparent: true, opacity: 0.09, blending: THREE.NormalBlending, depthWrite: false, toneMapped: true }));
    ring.rotation.x = Math.PI / 2 + 0.18;
    rings.add(ring);
  });
  record.scene.add(rings);
  for (const side of [-1, 1]) {
    const jet = makePointCloud({
      count: 460,
      seed: 630 + side,
      positionFor(random) {
        const y = side * (0.45 + random() * 3.8);
        const spread = Math.abs(y) * 0.04 * Math.pow(random(), 2);
        const angle = random() * TAU;
        return new THREE.Vector3(Math.cos(angle) * spread, y, Math.sin(angle) * spread);
      },
      colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x6ed9ff), new THREE.Color(0xe9fbff), random()),
      sizeFor: (random) => 0.018 + random() * 0.055,
      opacity: 0.4,
      additive: false,
      twinkle: 0.22
    });
    record.scene.add(jet);
  }
  record.onUpdate((time, delta) => {
    star.material.uniforms.uTime.value = time;
    star.rotation.y += delta * 0.22;
    disk.rotation.y += delta * 0.11;
    disk.material.uniforms.uTime.value = time;
    rings.rotation.y -= delta * 0.026;
    record.scene.children.forEach((child) => { if (child.material?.uniforms?.uTime) child.material.uniforms.uTime.value = time; });
  });
  return record;
}

function makeNebulaShellMaterial({ color = 0x5fd6c8, secondary = 0x7d6fb0, opacity = 0.18, scale = 3.5 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uSecondary: { value: new THREE.Color(secondary) },
      uOpacity: { value: opacity },
      uScale: { value: scale },
      uTime: { value: 0 }
    },
    vertexShader: `
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      void main() {
        vLocal = position;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uSecondary;
      uniform float uOpacity;
      uniform float uScale;
      uniform float uTime;
      varying vec3 vLocal;
      varying vec3 vNormalW;
      varying vec3 vWorld;
      float hash(vec3 p) {
        p = fract(p * .1031);
        p += dot(p, p.yzx + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorld);
        float rim = pow(1.0 - abs(dot(normalize(vNormalW), viewDirection)), 1.55);
        vec3 drift = vec3(uTime * .047, -uTime * .031, uTime * .023);
        float textureNoise = noise(vLocal * uScale + drift) * .68
          + noise(vLocal * uScale * 2.1 - drift * 1.7) * .32;
        float latitude = smoothstep(.08, .92, abs(normalize(vLocal).y));
        float density = smoothstep(.24, .9, textureNoise + rim * .52);
        vec3 color = mix(uColor, uSecondary, latitude * .62 + textureNoise * .18);
        float alpha = rim * density * uOpacity;
        if (alpha < .008) discard;
        gl_FragColor = vec4(color * (.55 + density * .38), alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: true,
    blending: THREE.NormalBlending,
    toneMapped: true
  });
}

function buildPlanetaryNebula() {
  const record = makeBaseScene({ seed: 121, camera: [0.6, 0.2, 7.6], previewCamera: [0.55, 0.15, 8.1], fov: 42, bloom: { strength: 0.71, radius: 0.39, threshold: 0.81 }, previewBloom: { strength: 0.62, radius: 0.37, threshold: 0.83 }, accent: '#64e5c8', exposure: 1.04, previewExposure: 1.02 });
  record.scene.fog = new THREE.FogExp2(0x02080a, 0.022);
  const nebula = new THREE.Group();
  nebula.rotation.set(0.1, -0.16, -0.2);

  const core = makeStarSurface({ radius: 0.22, deep: 0x275459, mid: 0x78ded3, hot: 0xf2ffff, noiseScale: 9.2, speed: 0.38, roughness: 0.18 });
  core.add(makeGlowSprite(0xb8fff5, 1.15, 0.09));
  const innerShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.24, 72, 48),
    makeNebulaShellMaterial({ color: 0x42c5ad, secondary: 0xff75a4, opacity: 0.27, scale: 4.8 })
  );
  innerShell.scale.set(1.18, 1.58, 0.88);
  const outerShell = new THREE.Mesh(
    new THREE.SphereGeometry(1.62, 68, 46),
    makeNebulaShellMaterial({ color: 0x2b8f95, secondary: 0xd94f88, opacity: 0.16, scale: 6.1 })
  );
  outerShell.scale.set(1.42, 1.1, 0.96);
  outerShell.rotation.z = Math.PI / 2;

  const lobes = makePointCloud({
    count: 4700,
    seed: 690,
    positionFor(random, index) {
      const side = index % 2 === 0 ? 1 : -1;
      const t = Math.pow(random(), 0.72);
      const y = side * (0.14 + t * 2.48);
      const radius = Math.sin(t * Math.PI) * (0.16 + t * 0.76) * (0.62 + random() * 0.44);
      const angle = random() * TAU;
      const corrugation = 1 + Math.sin(angle * 6 + t * 8) * 0.1;
      return new THREE.Vector3(Math.cos(angle) * radius * corrugation, y, Math.sin(angle) * radius * 0.78);
    },
    colorFor: (random, index) => index % 2
      ? new THREE.Color().lerpColors(new THREE.Color(0x31a995), new THREE.Color(0xb8f4df), random())
      : new THREE.Color().lerpColors(new THREE.Color(0xb43972), new THREE.Color(0xff9abd), random()),
    sizeFor: (random) => 0.012 + random() * 0.052,
    opacity: 0.55,
    additive: false,
    twinkle: 0.1
  });

  const equatorialDust = makePointCloud({
    count: 1900,
    seed: 704,
    positionFor(random) {
      const radius = 0.55 + Math.pow(random(), 0.78) * 1.02;
      const angle = random() * TAU;
      return new THREE.Vector3(Math.cos(angle) * radius, (random() - 0.5) * 0.17, Math.sin(angle) * radius);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x211a21), new THREE.Color(0x684039), random()),
    sizeFor: (random) => 0.012 + random() * 0.039,
    opacity: 0.46,
    additive: false,
    twinkle: 0.04
  });
  equatorialDust.rotation.x = 0.2;

  const ionizedKnots = makePointCloud({
    count: 700,
    seed: 708,
    positionFor(random) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const radius = 1.05 + random() * 0.72;
      return new THREE.Vector3(Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta)).multiplyScalar(radius);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x67e5c8), new THREE.Color(0xff86ac), random()),
    sizeFor: (random) => 0.014 + random() * 0.045,
    opacity: 0.42,
    additive: false,
    twinkle: 0.12
  });

  const halo = makeGlowSprite(0x58d6bd, 3.5, 0.065);
  nebula.add(outerShell, innerShell, lobes, equatorialDust, ionizedKnots, core, halo);
  record.scene.add(nebula, new THREE.AmbientLight(0x15322e, 0.62));
  const sideLight = new THREE.DirectionalLight(0xa8fff0, 1.35);
  sideLight.position.set(-2, 3, 4);
  const roseLight = new THREE.DirectionalLight(0xff7fa7, 0.75);
  roseLight.position.set(2.5, -1.4, 2.8);
  record.scene.add(sideLight, roseLight);

  record.onUpdate((time, delta) => {
    core.material.uniforms.uTime.value = time;
    lobes.material.uniforms.uTime.value = time;
    equatorialDust.material.uniforms.uTime.value = time;
    ionizedKnots.material.uniforms.uTime.value = time;
    nebula.rotation.y += delta * 0.032;
    innerShell.rotation.y += delta * 0.018;
    outerShell.rotation.x -= delta * 0.01;
  });
  return record;
}

function makeSpiralGalaxy({ seed = 1, colorInner = 0xffd29a, colorOuter = 0x6689b7, count = 5200, radius = 2.3, arms = 3, armTwist = 2.15 } = {}) {
  const innerColor = new THREE.Color(colorInner);
  const outerColor = new THREE.Color(colorOuter);
  const stars = makePointCloud({
    count,
    seed,
    positionFor(random) {
      const r = Math.pow(random(), 1.38) * radius;
      const armBiased = random() < 0.72;
      let angle;
      if (armBiased) {
        const arm = Math.floor(random() * arms);
        const armSpread = 0.17 + r / radius * 0.34;
        angle = arm / arms * TAU + r * armTwist + (random() + random() + random() - 1.5) * armSpread;
      } else {
        angle = random() * TAU;
      }
      const vertical = (random() + random() - 1) * (0.055 + (1 - r / radius) * 0.24);
      const radialScatter = 1 + (random() - 0.5) * 0.085;
      return new THREE.Vector3(Math.cos(angle) * r * radialScatter, Math.sin(angle) * r * radialScatter, vertical);
    },
    colorFor(random, index, countValue, point) {
      const t = Math.min(1, Math.hypot(point.x, point.y) / radius);
      const base = innerColor.clone().lerp(outerColor, Math.pow(t, 0.78));
      if (random() > 0.87) base.lerp(new THREE.Color(0xf6fbff), 0.58);
      return base.offsetHSL((random() - 0.5) * 0.035, -random() * 0.08, (random() - 0.5) * 0.16);
    },
    sizeFor: (random) => 0.009 + Math.pow(random(), 2.15) * 0.064,
    opacity: 0.86,
    additive: false,
    twinkle: 0.16
  });

  const diffuseDisk = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 1.04, 160),
    new THREE.MeshBasicMaterial({
      map: makeRadialTexture({ inner: `#${innerColor.getHexString()}`, middle: `#${outerColor.getHexString()}`, outer: 'rgba(0,0,0,0)', size: 256 }),
      color: 0xffffff,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: true
    })
  );
  diffuseDisk.scale.y = 0.92;

  const dust = makePointCloud({
    count: Math.round(count * 0.55),
    seed: seed + 77,
    positionFor(random) {
      const r = 0.3 + Math.pow(random(), 1.04) * (radius * 0.98);
      const arm = Math.floor(random() * arms);
      const angle = arm / arms * TAU + r * armTwist + 0.13 + (random() + random() - 1) * (0.1 + r / radius * 0.2);
      return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, (random() - 0.5) * 0.09);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x151014), new THREE.Color(0x6b4237), random()),
    sizeFor: (random) => 0.012 + random() * 0.048,
    opacity: 0.54,
    additive: false,
    twinkle: 0.012
  });

  const clusters = makePointCloud({
    count: Math.round(count * 0.18),
    seed: seed + 131,
    positionFor(random) {
      const r = 0.28 + random() * radius * 0.9;
      const arm = Math.floor(random() * arms);
      const angle = arm / arms * TAU + r * armTwist + (random() - 0.5) * 0.22;
      return new THREE.Vector3(Math.cos(angle) * r, Math.sin(angle) * r, (random() - 0.5) * 0.16);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0xffffff), outerColor, random() * 0.5),
    sizeFor: (random) => 0.022 + random() * 0.085,
    opacity: 0.67,
    additive: false,
    twinkle: 0.24
  });

  const gasKnots = new THREE.Group();
  const random = seededRandom(seed + 201);
  for (let index = 0; index < 24; index += 1) {
    const r = 0.45 + random() * radius * 0.75;
    const arm = index % arms;
    const angle = arm / arms * TAU + r * armTwist + (random() - 0.5) * 0.18;
    const warm = index % 3 === 0;
    const knot = makeGlowSprite(warm ? 0xffa16f : colorOuter, 0.17 + random() * 0.23, 0.035 + random() * 0.025);
    knot.position.set(Math.cos(angle) * r, Math.sin(angle) * r, (random() - 0.5) * 0.16);
    gasKnots.add(knot);
  }

  const bulge = new THREE.Mesh(
    new THREE.SphereGeometry(radius * 0.2, 48, 32),
    new THREE.MeshStandardMaterial({
      color: colorInner,
      emissive: colorInner,
      emissiveIntensity: 0.78,
      roughness: 0.48
    })
  );
  bulge.scale.set(1.15, 1.02, 0.48);
  const coreGlow = makeGlowSprite(colorInner, radius * 0.9, 0.13);
  bulge.add(coreGlow);

  const group = new THREE.Group();
  group.add(diffuseDisk, dust, stars, clusters, gasKnots, bulge);
  return { group, points: stars, stars, dust, clusters, gasKnots, core: bulge, disk: diffuseDisk };
}

function makeTidalTail({ seed = 1, start, control, end, color = 0x6f9fc7, count = 1100 } = {}) {
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  return makePointCloud({
    count,
    seed,
    positionFor(random) {
      const t = Math.pow(random(), 0.82);
      const point = curve.getPoint(t);
      const width = 0.04 + t * 0.28;
      return point.add(new THREE.Vector3((random() - 0.5) * width, (random() - 0.5) * width * 0.72, (random() - 0.5) * width));
    },
    colorFor: (random) => new THREE.Color(color).offsetHSL((random() - 0.5) * 0.035, -random() * 0.1, (random() - 0.5) * 0.14),
    sizeFor: (random) => 0.011 + random() * 0.042,
    opacity: 0.5,
    additive: false,
    twinkle: 0.12
  });
}

function makeLensedArc({
  seed = 1,
  radius = 1.72,
  start = 0,
  length = Math.PI,
  count = 1200,
  color = 0x9ed7eb,
  colorSecondary = 0xe5f8ff,
  thickness = 0.085,
  ellipticity = 0.94,
  depth = -0.34,
  opacity = 0.52,
  additive = true
} = {}) {
  const random = seededRandom(seed);
  return makePointCloud({
    count,
    seed,
    positionFor() {
      const angle = start + random() * length;
      const normalized = (angle - start) / Math.max(0.01, length);
      const clump = 0.5 + 0.5 * Math.sin(normalized * Math.PI * 5.0 + seed * 0.17);
      const radialJitter = (random() - 0.5) * thickness * (0.55 + clump * 0.75);
      const wave = Math.sin(angle * 3.1 + seed) * thickness * 0.18;
      const r = radius + radialJitter + wave;
      const a = angle + (random() - 0.5) * 0.02;
      const depthCurve = Math.sin(normalized * Math.PI) * thickness * 0.45;
      return new THREE.Vector3(
        Math.cos(a) * r,
        Math.sin(a) * r * ellipticity,
        depth + depthCurve + (random() - 0.5) * thickness
      );
    },
    colorFor: () => new THREE.Color(color).lerp(new THREE.Color(colorSecondary), Math.pow(random(), 1.55)),
    sizeFor: () => 0.011 + Math.pow(random(), 1.55) * 0.052,
    opacity,
    additive,
    twinkle: 0.045
  });
}

function makeLensedRibbon({
  seed = 1,
  radius = 1.75,
  start = 0,
  length = Math.PI,
  segments = 220,
  width = 0.11,
  ellipticity = 0.92,
  depth = -0.38,
  color = 0x4daee4,
  colorSecondary = 0xe2f9ff,
  opacity = 0.62,
  additive = false
} = {}) {
  const random = seededRandom(seed);
  const positions = [];
  const colors = [];
  const indices = [];
  const colorA = new THREE.Color(color);
  const colorB = new THREE.Color(colorSecondary);
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const angle = start + length * t;
    const wave = Math.sin(t * Math.PI * 5.0 + seed * 0.11) * 0.026 + Math.sin(t * Math.PI * 11.0) * 0.009;
    const r = radius + wave;
    const variableWidth = width * (0.55 + Math.sin(t * Math.PI) * 0.7) * (0.88 + random() * 0.24);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r * ellipticity;
    const normal = new THREE.Vector2(Math.cos(angle), Math.sin(angle) * ellipticity).normalize();
    const z = depth + Math.sin(t * Math.PI) * 0.04;
    positions.push(x - normal.x * variableWidth, y - normal.y * variableWidth, z - 0.012);
    positions.push(x + normal.x * variableWidth, y + normal.y * variableWidth, z + 0.012);
    const brightness = 0.45 + 0.55 * Math.pow(Math.sin(t * Math.PI), 0.45);
    const c = colorA.clone().lerp(colorB, brightness * (0.62 + random() * 0.3));
    colors.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (index < segments) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      toneMapped: true
    })
  );
}

function makeLensGalaxy() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.88, 72, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0x9b744f,
      transparent: true,
      opacity: 0.38,
      roughness: 0.72,
      metalness: 0,
      clearcoat: 0.08,
      emissive: 0x5a3219,
      emissiveIntensity: 0.38,
      depthWrite: false
    })
  );
  body.scale.set(1.18, 0.76, 0.42);
  body.rotation.z = -0.18;

  const stellarEnvelope = makePointCloud({
    count: 5200,
    seed: 792,
    positionFor(random) {
      const r = Math.pow(random(), 1.72) * 1.38;
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * r * 1.18,
        Math.cos(phi) * r * 0.76,
        Math.sin(phi) * Math.sin(theta) * r * 0.42
      );
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x70472e), new THREE.Color(0xffd9a1), Math.pow(random(), 1.35)),
    sizeFor: (random) => 0.007 + Math.pow(random(), 2.0) * 0.044,
    opacity: 0.72,
    additive: false,
    twinkle: 0.035
  });
  stellarEnvelope.rotation.z = -0.18;

  const innerStars = makePointCloud({
    count: 1800,
    seed: 793,
    positionFor(random) {
      const r = Math.pow(random(), 2.3) * 0.78;
      const theta = random() * TAU;
      return new THREE.Vector3(Math.cos(theta) * r * 1.1, Math.sin(theta) * r * 0.7, (random() - 0.5) * 0.28);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0xffb96e), new THREE.Color(0xfff0c8), random()),
    sizeFor: (random) => 0.011 + random() * 0.052,
    opacity: 0.78,
    additive: false,
    twinkle: 0.05
  });
  innerStars.rotation.z = -0.18;

  const dustPatches = makePointCloud({
    count: 1200,
    seed: 794,
    positionFor(random) {
      const r = 0.25 + random() * 1.05;
      const theta = random() * TAU;
      return new THREE.Vector3(Math.cos(theta) * r * 1.12, Math.sin(theta) * r * 0.7, (random() - 0.5) * 0.18);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x1c120d), new THREE.Color(0x5e3825), random()),
    sizeFor: (random) => 0.012 + random() * 0.038,
    opacity: 0.35,
    additive: false,
    twinkle: 0
  });
  dustPatches.rotation.z = -0.18;

  const core = makeGlowSprite(0xffcb85, 1.34, 0.12);
  core.position.z = 0.25;
  group.add(body, stellarEnvelope, innerStars, dustPatches, core);
  return { group, stars: stellarEnvelope, innerStars, dust: dustPatches, core };
}

function buildCosmicWeb() {
  const record = makeBaseScene({ seed: 151, camera: [5.6, 3.8, 9.8], previewCamera: [6.0, 4.0, 10.5], target: [0, 0, 0], fov: 46, bloom: { strength: 0.68, radius: 0.38, threshold: 0.825 }, previewBloom: { strength: 0.59, radius: 0.36, threshold: 0.84 }, accent: '#738cff', exposure: 1.05, previewExposure: 1.03 });
  record.scene.fog = new THREE.FogExp2(0x01030a, 0.012);
  const random = seededRandom(820);
  const nodes = [];
  for (let index = 0; index < 62; index += 1) {
    nodes.push(new THREE.Vector3((random() - 0.5) * 7.4, (random() - 0.5) * 4.9, (random() - 0.5) * 5.6));
  }

  const linePositions = [];
  nodes.forEach((node, index) => {
    const distances = nodes.map((other, otherIndex) => ({ other, otherIndex, distance: node.distanceTo(other) }))
      .filter((entry) => entry.otherIndex !== index)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 4);
    distances.forEach(({ other, otherIndex, distance }) => {
      if (otherIndex < index || distance > 2.7) return;
      linePositions.push(node.x, node.y, node.z, other.x, other.y, other.z);
    });
  });
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
  const lines = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x657de3, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true }));
  const softLines = new THREE.LineSegments(lineGeometry.clone(), new THREE.LineBasicMaterial({ color: 0xd08767, transparent: true, opacity: 0.12, blending: THREE.NormalBlending, depthWrite: false, toneMapped: true }));
  softLines.scale.setScalar(1.008);

  const nodePoints = makePointCloud({
    count: nodes.length,
    seed: 821,
    positionFor(random, index) { return nodes[index]; },
    colorFor: (random) => random() > 0.62
      ? new THREE.Color().lerpColors(new THREE.Color(0xffa76b), new THREE.Color(0xffe2b1), random())
      : new THREE.Color().lerpColors(new THREE.Color(0x789cff), new THREE.Color(0xbfcfff), random()),
    sizeFor: (random) => 0.11 + random() * 0.22,
    opacity: 0.78,
    additive: false,
    twinkle: 0.16
  });

  const filamentDust = makePointCloud({
    count: 7200,
    seed: 824,
    positionFor(random) {
      const a = nodes[Math.floor(random() * nodes.length)];
      let b = nodes[Math.floor(random() * nodes.length)];
      for (let tries = 0; tries < 7 && a.distanceTo(b) > 2.7; tries += 1) b = nodes[Math.floor(random() * nodes.length)];
      const t = random();
      const point = a.clone().lerp(b, t);
      const width = 0.08 + Math.sin(t * Math.PI) * 0.1;
      return point.add(new THREE.Vector3((random() - 0.5) * width, (random() - 0.5) * width, (random() - 0.5) * width));
    },
    colorFor: (random) => random() > 0.78
      ? new THREE.Color().lerpColors(new THREE.Color(0xc97859), new THREE.Color(0xffc387), random())
      : new THREE.Color().lerpColors(new THREE.Color(0x526bdd), new THREE.Color(0x8fb5ff), random()),
    sizeFor: (random) => 0.01 + random() * 0.04,
    opacity: 0.5,
    twinkle: 0.13
  });

  const clusterHalos = new THREE.Group();
  nodes.slice(0, 14).forEach((node, index) => {
    const warm = index % 4 === 0;
    const halo = makeGlowSprite(warm ? 0xffa56b : 0x789cff, 0.36 + (index % 3) * 0.13, warm ? 0.055 : 0.045);
    halo.position.copy(node);
    clusterHalos.add(halo);
  });

  const web = new THREE.Group();
  web.add(softLines, lines, filamentDust, clusterHalos, nodePoints);
  record.scene.add(web);
  record.onUpdate((time, delta) => {
    web.rotation.y += delta * 0.016;
    web.rotation.x = Math.sin(time * 0.05) * 0.035;
    nodePoints.material.uniforms.uTime.value = time;
    filamentDust.material.uniforms.uTime.value = time;
    clusterHalos.children.forEach((halo, index) => {
      halo.material.opacity = (index % 4 === 0 ? 0.05 : 0.04) + Math.sin(time * 0.45 + index) * 0.009;
    });
  });
  return record;
}

function orientYAxisTo(object, direction) {
  const normalized = direction.clone().normalize();
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized);
  return object;
}

function makeIrregularShellCloud({
  seed = 1,
  count = 2600,
  radius = 2,
  thickness = 0.35,
  stretch = new THREE.Vector3(1, 1, 1),
  colorA = 0x8edfff,
  colorB = 0xff9b61,
  opacity = 0.58,
  size = 0.055
} = {}) {
  return makePointCloud({
    count,
    seed,
    positionFor(random, index) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const wave = 1 + Math.sin(theta * 3 + phi * 5 + seed) * 0.12 + Math.sin(theta * 7 - phi * 2) * 0.055;
      const r = radius * wave + (random() - 0.5) * thickness;
      return new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * stretch.x,
        Math.cos(phi) * stretch.y,
        Math.sin(phi) * Math.sin(theta) * stretch.z
      ).multiplyScalar(r);
    },
    colorFor(random, index) {
      const mix = Math.min(1, Math.max(0, random() * 0.78 + (index % 7 === 0 ? 0.22 : 0)));
      return new THREE.Color().lerpColors(new THREE.Color(colorA), new THREE.Color(colorB), mix);
    },
    sizeFor: (random) => size * (0.55 + random() * 1.25),
    opacity,
    additive: false,
    twinkle: 0.12
  });
}

function makeFilamentCage({ seed = 1, radius = 2.2, count = 18, colorA = 0x86ddff, colorB = 0xff9664 } = {}) {
  const group = new THREE.Group();
  const random = seededRandom(seed);
  for (let index = 0; index < count; index += 1) {
    const points = [];
    const tilt = (random() - 0.5) * 1.3;
    const phase = random() * TAU;
    const ellipse = 0.66 + random() * 0.48;
    for (let step = 0; step <= 46; step += 1) {
      const t = step / 46;
      const angle = t * TAU;
      const ripple = 1 + Math.sin(angle * (2 + index % 4) + phase) * (0.04 + random() * 0.025);
      const point = new THREE.Vector3(
        Math.cos(angle) * radius * ripple,
        Math.sin(angle) * radius * ellipse * ripple,
        Math.sin(angle * 2 + phase) * radius * 0.16
      );
      point.applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt);
      point.applyAxisAngle(new THREE.Vector3(0, 1, 0), phase * 0.5);
      points.push(point);
    }
    const color = new THREE.Color().lerpColors(new THREE.Color(colorA), new THREE.Color(colorB), random()).getHex();
    const filament = makeTube(points, {
      color,
      radius: 0.009 + random() * 0.014,
      opacity: 0.18 + random() * 0.22,
      segments: 96,
      radialSegments: 5,
      additive: true
    });
    group.add(filament);
  }
  return group;
}

function buildWolfRayet() {
  const record = makeBaseScene({
    seed: 171,
    camera: [3.2, 1.45, 8.0],
    previewCamera: [3.35, 1.5, 8.55],
    target: [0, 0.05, 0],
    fov: 42,
    bloom: { strength: 0.82, radius: 0.43, threshold: 0.79 },
    previewBloom: { strength: 0.72, radius: 0.4, threshold: 0.81 },
    accent: '#8fe8ff',
    exposure: 1.06,
    previewExposure: 1.04
  });
  record.scene.background = new THREE.Color(0x02050c);
  record.scene.fog = new THREE.FogExp2(0x071019, 0.014);

  const star = makeStarSurface({ radius: 0.78, deep: 0x265a83, mid: 0x8ee9ff, hot: 0xffffff, noiseScale: 7.6, speed: 0.34, roughness: 0.15 });
  star.add(makeGlowSprite(0xdaf8ff, 3.8, 0.21));

  const innerShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.38, 5),
    makeNebulaShellMaterial({ color: 0x75d9ef, secondary: 0xff9c64, opacity: 0.18, scale: 6.3 })
  );
  innerShell.scale.set(1.18, 0.92, 1.08);
  innerShell.rotation.set(0.15, -0.22, 0.12);

  const outerShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.18, 5),
    makeNebulaShellMaterial({ color: 0xff8f5e, secondary: 0x60c8df, opacity: 0.12, scale: 5.2 })
  );
  outerShell.scale.set(1.2, 0.96, 1.12);
  outerShell.rotation.set(-0.22, 0.16, -0.2);

  const clumpyEjecta = makeIrregularShellCloud({
    seed: 172,
    count: 5200,
    radius: 2.15,
    thickness: 0.75,
    stretch: new THREE.Vector3(1.2, 0.94, 1.08),
    colorA: 0x66cce4,
    colorB: 0xff9a62,
    opacity: 0.66,
    size: 0.06
  });

  const fastWind = makePointCloud({
    count: 2600,
    seed: 173,
    positionFor(random) {
      const theta = random() * TAU;
      const phi = Math.acos(2 * random() - 1);
      const r = 0.92 + Math.pow(random(), 0.72) * 3.1;
      const direction = new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta));
      direction.x *= 1.16;
      return direction.multiplyScalar(r);
    },
    colorFor: (random) => random() > 0.42
      ? new THREE.Color().lerpColors(new THREE.Color(0xa8eeff), new THREE.Color(0xffffff), random())
      : new THREE.Color().lerpColors(new THREE.Color(0xff8a57), new THREE.Color(0xffd39a), random()),
    sizeFor: (random) => 0.012 + random() * 0.045,
    opacity: 0.62,
    twinkle: 0.24
  });

  const filaments = makeFilamentCage({ seed: 174, radius: 2.25, count: 22, colorA: 0x7edcf0, colorB: 0xff9761 });
  const halo = makeGlowSprite(0x77dff5, 6.4, 0.105);
  const warmHalo = makeGlowSprite(0xff9560, 5.1, 0.07);
  warmHalo.position.set(0.35, -0.12, -0.5);

  const windSystem = new THREE.Group();
  windSystem.add(outerShell, innerShell, clumpyEjecta, fastWind, filaments, halo, warmHalo, star);
  record.scene.add(windSystem);

  const key = new THREE.PointLight(0xbcefff, 7.0, 12, 1.6);
  key.position.set(-0.4, 0.5, 2.5);
  const warm = new THREE.DirectionalLight(0xff9865, 2.2);
  warm.position.set(4, -2, 4);
  record.scene.add(new THREE.AmbientLight(0x142b3a, 0.7), key, warm);

  record.onUpdate((time, delta) => {
    star.rotation.y += delta * 0.12;
    star.material.uniforms.uTime.value = time;
    innerShell.material.uniforms.uTime.value = time * 0.82;
    outerShell.material.uniforms.uTime.value = time * 0.58;
    clumpyEjecta.material.uniforms.uTime.value = time;
    fastWind.material.uniforms.uTime.value = time * 1.3;
    innerShell.rotation.y += delta * 0.018;
    outerShell.rotation.y -= delta * 0.009;
    filaments.rotation.y += delta * 0.007;
    filaments.rotation.x = Math.sin(time * 0.08) * 0.04;
    windSystem.rotation.z = Math.sin(time * 0.055) * 0.025;
  });
  return record;
}

function makeAccretionDiskCloud({ seed = 1, radius = 1.15, count = 2800, colorA = 0xffa04f, colorB = 0x87ddff } = {}) {
  return makePointCloud({
    count,
    seed,
    positionFor(random) {
      const r = 0.28 + Math.pow(random(), 0.68) * radius;
      const angle = random() * TAU + r * 2.5;
      return new THREE.Vector3(Math.cos(angle) * r, (random() - 0.5) * (0.05 + r * 0.055), Math.sin(angle) * r);
    },
    colorFor: (random, index, total, point) => {
      const radial = Math.min(1, point.length() / radius);
      return new THREE.Color().lerpColors(new THREE.Color(colorA), new THREE.Color(colorB), radial * 0.72 + random() * 0.18);
    },
    sizeFor: (random) => 0.018 + random() * 0.055,
    opacity: 0.78,
    twinkle: 0.18
  });
}

function buildVampireStar() {
  const record = makeBaseScene({
    seed: 181,
    camera: [0.3, 1.55, 8.55],
    previewCamera: [0.35, 1.55, 9.15],
    target: [0, 0.02, 0],
    fov: 41,
    bloom: { strength: 0.79, radius: 0.41, threshold: 0.8 },
    previewBloom: { strength: 0.69, radius: 0.39, threshold: 0.82 },
    accent: '#ffad6b',
    exposure: 1.055,
    previewExposure: 1.035
  });
  record.scene.fog = new THREE.FogExp2(0x05040c, 0.012);

  const system = new THREE.Group();
  const donor = makeStarSurface({ radius: 0.92, deep: 0x6f1d0a, mid: 0xff6d25, hot: 0xffdc99, noiseScale: 5.4, speed: 0.19, roughness: 0.28 });
  donor.position.set(-1.35, 0, 0);
  donor.scale.set(1.2, 1.0, 0.98);
  donor.rotation.z = -0.08;

  const accretor = makeStarSurface({ radius: 0.5, deep: 0x174b78, mid: 0x72cfff, hot: 0xffffff, noiseScale: 7.8, speed: 0.32, roughness: 0.12 });
  accretor.position.set(1.38, 0.05, 0);
  accretor.add(makeGlowSprite(0xb9efff, 2.45, 0.16));

  const diskGroup = new THREE.Group();
  diskGroup.position.copy(accretor.position);
  diskGroup.rotation.set(0.28, 0.12, -0.26);
  const disk = makeAccretionDiskCloud({ seed: 183, radius: 1.05, count: 3300, colorA: 0xff914c, colorB: 0xa9eaff });
  const hotInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.065, 18, 128),
    new THREE.MeshBasicMaterial({ color: 0xffe5ae, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  hotInner.rotation.x = Math.PI / 2;
  diskGroup.add(disk, hotInner);

  const streamCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.53, 0.05, 0.02),
    new THREE.Vector3(-0.15, 0.2, 0.12),
    new THREE.Vector3(0.35, 0.12, -0.02),
    new THREE.Vector3(0.85, -0.05, -0.15),
    new THREE.Vector3(1.15, -0.11, -0.07)
  ]);
  const streamCore = new THREE.Mesh(
    new THREE.TubeGeometry(streamCurve, 150, 0.06, 9, false),
    new THREE.MeshBasicMaterial({ color: 0xffd2a0, transparent: true, opacity: 0.74, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  const streamSheath = new THREE.Mesh(
    new THREE.TubeGeometry(streamCurve, 150, 0.145, 12, false),
    new THREE.MeshBasicMaterial({ color: 0xff6d58, transparent: true, opacity: 0.095, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  const streamParticles = makePointCloud({
    count: 1500,
    seed: 184,
    positionFor(random) {
      const point = streamCurve.getPointAt(random());
      point.add(new THREE.Vector3((random() - 0.5) * 0.13, (random() - 0.5) * 0.13, (random() - 0.5) * 0.13));
      return point;
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0xff7d4d), new THREE.Color(0xfff0c0), random()),
    sizeFor: (random) => 0.015 + random() * 0.045,
    opacity: 0.82,
    twinkle: 0.3
  });
  const impactGlow = makeGlowSprite(0xbcefff, 0.85, 0.18);
  impactGlow.position.set(1.12, -0.1, -0.08);

  const escapingGas = makePointCloud({
    count: 1100,
    seed: 185,
    positionFor(random) {
      const angle = random() * TAU;
      const r = 1.55 + random() * 1.6;
      return new THREE.Vector3(Math.cos(angle) * r, (random() - 0.5) * 0.38, Math.sin(angle) * r).add(accretor.position);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(0x5bbfe7), new THREE.Color(0xffa066), random()),
    sizeFor: (random) => 0.01 + random() * 0.035,
    opacity: 0.34,
    twinkle: 0.1
  });

  system.add(donor, accretor, diskGroup, streamSheath, streamCore, streamParticles, impactGlow, escapingGas);
  record.scene.add(system);
  const warmLight = new THREE.PointLight(0xff8a4e, 5.2, 8, 1.7);
  warmLight.position.set(-1.1, 0.6, 2.2);
  const blueLight = new THREE.PointLight(0x78d9ff, 5.6, 8, 1.6);
  blueLight.position.set(1.4, 0.5, 2.0);
  record.scene.add(new THREE.AmbientLight(0x23131a, 0.58), warmLight, blueLight);

  record.onUpdate((time, delta) => {
    donor.rotation.y += delta * 0.08;
    accretor.rotation.y -= delta * 0.14;
    donor.material.uniforms.uTime.value = time;
    accretor.material.uniforms.uTime.value = time * 1.15;
    disk.rotation.y += delta * 0.34;
    disk.material.uniforms.uTime.value = time;
    hotInner.rotation.z -= delta * 0.42;
    streamParticles.material.uniforms.uTime.value = time * 1.6;
    escapingGas.material.uniforms.uTime.value = time;
    streamCore.material.opacity = 0.69 + Math.sin(time * 1.9) * 0.08;
    impactGlow.material.opacity = 0.15 + Math.sin(time * 2.15) * 0.035;
    system.rotation.y = Math.sin(time * 0.08) * 0.08;
    system.rotation.x = Math.sin(time * 0.055) * 0.025;
  });
  return record;
}

function makeBowShock({ color = 0xff8b69, radius = 0.72, opacity = 0.22 } = {}) {
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 28, 0, TAU, 0, Math.PI * 0.56),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  shell.scale.set(1.0, 0.72, 1.0);
  return shell;
}

function buildHerbigHaro() {
  const record = makeBaseScene({
    seed: 191,
    camera: [3.25, 1.8, 8.65],
    previewCamera: [3.45, 1.9, 9.25],
    target: [0, 0, 0],
    fov: 43,
    bloom: { strength: 0.78, radius: 0.42, threshold: 0.8 },
    previewBloom: { strength: 0.68, radius: 0.39, threshold: 0.82 },
    accent: '#ff8066',
    exposure: 1.055,
    previewExposure: 1.035
  });
  record.scene.background = new THREE.Color(0x03050b);
  record.scene.fog = new THREE.FogExp2(0x090b12, 0.02);

  const object = new THREE.Group();
  const coreClouds = makeCloudVolume({
    seed: 192,
    count: 70,
    spread: new THREE.Vector3(4.2, 2.8, 3.2),
    palette: [0x3d2422, 0x2c4146, 0x6f352b, 0x1d3138, 0x814235],
    opacity: 0.18,
    scale: 1.18
  });
  const foregroundDust = makeCloudVolume({
    seed: 193,
    count: 36,
    spread: new THREE.Vector3(3.4, 2.3, 1.8),
    palette: [0x211415, 0x18252b, 0x382122],
    opacity: 0.17,
    scale: 0.8
  });
  foregroundDust.position.z = 0.75;

  const protostar = makeStarSurface({ radius: 0.36, deep: 0x722509, mid: 0xff843b, hot: 0xfff0b3, noiseScale: 6.2, speed: 0.28, roughness: 0.2 });
  protostar.add(makeGlowSprite(0xffbd79, 2.2, 0.18));
  const disk = makeAccretionDiskCloud({ seed: 194, radius: 1.05, count: 2300, colorA: 0xff7c47, colorB: 0x6abfc6 });
  const diskGroup = new THREE.Group();
  diskGroup.rotation.set(0.36, 0.08, -0.2);
  diskGroup.add(disk);

  const jetAxis = new THREE.Vector3(0.22, 0.96, 0.18).normalize();
  const jetGroup = new THREE.Group();
  const jetLength = 4.4;
  const positiveCone = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, jetLength, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xff715d, transparent: true, opacity: 0.075, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  positiveCone.position.y = jetLength * 0.5;
  const negativeCone = positiveCone.clone();
  negativeCone.material = positiveCone.material.clone();
  negativeCone.rotation.z = Math.PI;
  negativeCone.position.y = -jetLength * 0.5;
  jetGroup.add(positiveCone, negativeCone);

  const jetParticles = makePointCloud({
    count: 3600,
    seed: 195,
    positionFor(random, index) {
      const sign = index % 2 ? -1 : 1;
      const distance = 0.25 + Math.pow(random(), 0.75) * jetLength;
      const width = 0.035 + distance * 0.055;
      return new THREE.Vector3((random() - 0.5) * width, sign * distance, (random() - 0.5) * width);
    },
    colorFor: (random, index) => index % 2
      ? new THREE.Color().lerpColors(new THREE.Color(0x49bdc7), new THREE.Color(0xd8ffff), random())
      : new THREE.Color().lerpColors(new THREE.Color(0xff614d), new THREE.Color(0xffd2a0), random()),
    sizeFor: (random) => 0.012 + random() * 0.05,
    opacity: 0.76,
    twinkle: 0.28
  });
  jetGroup.add(jetParticles);

  const knots = new THREE.Group();
  [0.9, 1.65, 2.5, 3.35].forEach((distance, index) => {
    const warmKnot = makeGlowSprite(index % 2 ? 0xffb07c : 0xff6a52, 0.42 + index * 0.09, 0.12 - index * 0.008);
    warmKnot.position.y = distance;
    const coolKnot = makeGlowSprite(index % 2 ? 0xbff8ff : 0x5ccbd2, 0.4 + index * 0.085, 0.115 - index * 0.008);
    coolKnot.position.y = -distance;
    knots.add(warmKnot, coolKnot);
  });
  jetGroup.add(knots);

  const bowPositive = makeBowShock({ color: 0xff7a5c, radius: 0.8, opacity: 0.22 });
  bowPositive.position.y = jetLength + 0.05;
  bowPositive.rotation.z = Math.PI;
  const bowPositiveOuter = makeBowShock({ color: 0xffbd88, radius: 1.05, opacity: 0.09 });
  bowPositiveOuter.position.y = jetLength + 0.06;
  bowPositiveOuter.rotation.z = Math.PI;
  const bowNegative = makeBowShock({ color: 0x64d3d7, radius: 0.82, opacity: 0.21 });
  bowNegative.position.y = -jetLength - 0.05;
  const bowNegativeOuter = makeBowShock({ color: 0xc8ffff, radius: 1.08, opacity: 0.085 });
  bowNegativeOuter.position.y = -jetLength - 0.06;
  jetGroup.add(bowPositive, bowPositiveOuter, bowNegative, bowNegativeOuter);
  orientYAxisTo(jetGroup, jetAxis);

  const shockedGas = makeIrregularShellCloud({
    seed: 196,
    count: 1700,
    radius: 2.2,
    thickness: 1.25,
    stretch: new THREE.Vector3(1.05, 1.55, 0.9),
    colorA: 0x4c9fa7,
    colorB: 0xb75a43,
    opacity: 0.35,
    size: 0.045
  });

  object.add(coreClouds, shockedGas, jetGroup, diskGroup, protostar, foregroundDust);
  record.scene.add(object);
  const warmLight = new THREE.PointLight(0xff7952, 4.2, 7, 1.8);
  warmLight.position.set(-1.2, 0.6, 2.6);
  const coolLight = new THREE.PointLight(0x65d4da, 3.7, 7, 1.8);
  coolLight.position.set(1.5, -0.7, 2.2);
  record.scene.add(new THREE.AmbientLight(0x241919, 0.62), warmLight, coolLight);

  record.onUpdate((time, delta) => {
    protostar.rotation.y += delta * 0.11;
    protostar.material.uniforms.uTime.value = time;
    disk.rotation.y += delta * 0.24;
    disk.material.uniforms.uTime.value = time;
    jetParticles.material.uniforms.uTime.value = time * 1.35;
    shockedGas.material.uniforms.uTime.value = time;
    coreClouds.rotation.y += delta * 0.004;
    foregroundDust.rotation.y -= delta * 0.006;
    object.rotation.y = Math.sin(time * 0.08) * 0.025;
    knots.children.forEach((knot, index) => { knot.material.opacity = 0.095 + Math.sin(time * 1.5 - index * 0.45) * 0.022; });
    bowPositive.scale.setScalar(1 + Math.sin(time * 0.72) * 0.035);
    bowNegative.scale.setScalar(1 + Math.sin(time * 0.72 + 1.2) * 0.035);
  });
  return record;
}

function makeGammaJet({ sign = 1, length = 5.6, coreColor = 0xe7f7ff, sheathColor = 0x9c78ff, seed = 1 } = {}) {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, length, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: coreColor, transparent: true, opacity: 0.7, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  const sheath = new THREE.Mesh(
    new THREE.ConeGeometry(0.48, length, 40, 1, true),
    new THREE.MeshBasicMaterial({ color: sheathColor, transparent: true, opacity: 0.075, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  core.position.y = length * 0.5;
  sheath.position.y = length * 0.5;
  if (sign < 0) {
    core.rotation.z = Math.PI;
    sheath.rotation.z = Math.PI;
    core.position.y *= -1;
    sheath.position.y *= -1;
  }
  const particles = makePointCloud({
    count: 2300,
    seed,
    positionFor(random) {
      const distance = 0.15 + Math.pow(random(), 0.72) * length;
      const width = 0.018 + distance * 0.035;
      return new THREE.Vector3((random() - 0.5) * width, sign * distance, (random() - 0.5) * width);
    },
    colorFor: (random) => new THREE.Color().lerpColors(new THREE.Color(sheathColor), new THREE.Color(coreColor), 0.38 + random() * 0.62),
    sizeFor: (random) => 0.012 + random() * 0.05,
    opacity: 0.82,
    twinkle: 0.31
  });
  const shocks = new THREE.Group();
  [0.85, 1.55, 2.4, 3.35, 4.45].forEach((distance, index) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.12 + distance * 0.055, 0.012 + index * 0.003, 10, 52),
      new THREE.MeshBasicMaterial({ color: index % 2 ? sheathColor : coreColor, transparent: true, opacity: 0.34 - index * 0.035, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = sign * distance;
    shocks.add(ring);
  });
  group.add(sheath, core, particles, shocks);
  group.userData.particles = particles;
  group.userData.shocks = shocks;
  return group;
}

function buildGammaRayBurst() {
  const record = makeBaseScene({
    seed: 201,
    camera: [4.7, 2.3, 9.4],
    previewCamera: [4.95, 2.4, 10.0],
    target: [0, 0, 0],
    fov: 45,
    bloom: { strength: 0.86, radius: 0.44, threshold: 0.78 },
    previewBloom: { strength: 0.75, radius: 0.42, threshold: 0.8 },
    accent: '#b98cff',
    exposure: 1.06,
    previewExposure: 1.04
  });
  record.scene.background = new THREE.Color(0x010208);
  record.scene.fog = new THREE.FogExp2(0x05030b, 0.012);

  const burst = new THREE.Group();
  const engine = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 56, 40),
    new THREE.MeshPhysicalMaterial({ color: 0x17101d, emissive: 0xffb548, emissiveIntensity: 1.25, roughness: 0.32, metalness: 0.18 })
  );
  const engineGlow = makeGlowSprite(0xffd77d, 2.6, 0.24);
  const disk = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.13, 22, 150),
    new THREE.MeshBasicMaterial({ color: 0xffa845, transparent: true, opacity: 0.66, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  disk.rotation.x = Math.PI / 2;

  const positiveJet = makeGammaJet({ sign: 1, length: 5.7, coreColor: 0xf2fbff, sheathColor: 0xa071ff, seed: 202 });
  const negativeJet = makeGammaJet({ sign: -1, length: 5.7, coreColor: 0xf9f2ff, sheathColor: 0x6f8cff, seed: 203 });
  const jetAxis = new THREE.Vector3(0.18, 0.96, -0.16).normalize();
  const jets = new THREE.Group();
  jets.add(positiveJet, negativeJet);
  orientYAxisTo(jets, jetAxis);

  const cocoon = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.25, 5),
    makeNebulaShellMaterial({ color: 0xff7c42, secondary: 0x9c6fff, opacity: 0.17, scale: 5.8 })
  );
  cocoon.scale.set(0.9, 1.75, 0.9);
  orientYAxisTo(cocoon, jetAxis);

  const afterglow = new THREE.Mesh(
    new THREE.SphereGeometry(2.15, 64, 40),
    new THREE.MeshBasicMaterial({ color: 0x8e77d8, transparent: true, opacity: 0.045, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: true })
  );
  const ejecta = makeIrregularShellCloud({
    seed: 204,
    count: 2600,
    radius: 1.55,
    thickness: 0.85,
    stretch: new THREE.Vector3(1.05, 1.4, 1.05),
    colorA: 0x8e6bd3,
    colorB: 0xff8b4c,
    opacity: 0.46,
    size: 0.045
  });

  burst.add(afterglow, ejecta, cocoon, disk, engineGlow, engine, jets);
  record.scene.add(burst);
  const coreLight = new THREE.PointLight(0xffc661, 8.2, 11, 1.7);
  coreLight.position.set(0, 0, 1.4);
  const violetLight = new THREE.DirectionalLight(0x9f7bff, 2.6);
  violetLight.position.set(-3, 4, 4);
  record.scene.add(new THREE.AmbientLight(0x1f102a, 0.52), coreLight, violetLight);

  record.onUpdate((time, delta) => {
    engine.rotation.y += delta * 0.22;
    disk.rotation.z += delta * 0.36;
    cocoon.material.uniforms.uTime.value = time * 0.9;
    ejecta.material.uniforms.uTime.value = time;
    positiveJet.userData.particles.material.uniforms.uTime.value = time * 1.7;
    negativeJet.userData.particles.material.uniforms.uTime.value = time * 1.7;
    positiveJet.userData.shocks.children.forEach((shock, index) => { shock.scale.setScalar(1 + Math.sin(time * 2.0 - index * 0.5) * 0.05); });
    negativeJet.userData.shocks.children.forEach((shock, index) => { shock.scale.setScalar(1 + Math.sin(time * 2.0 - index * 0.5 + 1.1) * 0.05); });
    burst.rotation.y = Math.sin(time * 0.09) * 0.018;
    afterglow.scale.setScalar(1 + Math.sin(time * 0.48) * 0.035);
    afterglow.material.opacity = 0.042 + Math.sin(time * 0.48) * 0.01;
    engineGlow.material.opacity = 0.21 + Math.sin(time * 2.4) * 0.045;
  });
  return record;
}


const BUILDERS = {
  'black-hole': buildBlackHole,
  quasar: buildQuasar,
  blazar: buildBlazar,
  'tidal-disruption': buildTidalDisruption,
  pulsar: buildPulsar,
  magnetar: buildMagnetar,
  supernova: buildSupernova,
  'supernova-remnant': buildSupernovaRemnant,
  kilonova: buildKilonova,
  'herbig-haro': buildHerbigHaro,
  protostar: buildProtostar,
  'planetary-nebula': buildPlanetaryNebula,
  'wolf-rayet': buildWolfRayet,
  'vampire-star': buildVampireStar,
  'cosmic-web': buildCosmicWeb,
  'gamma-ray-burst': buildGammaRayBurst
};

export function createGalleryScene(id, { mode = 'viewer' } = {}) {
  const builder = BUILDERS[id];
  if (!builder) throw new Error(`Unknown Gallery scene: ${id}`);
  const record = builder({ mode });
  record.mode = mode;
  return record;
}

export const gallerySceneIds = Object.freeze(Object.keys(BUILDERS));
