import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  THREE,
  createRenderer,
  createStarfield,
  disposeComposer,
  disposeThreeObject
} from '../three/three-scene-utils.js';

const REDUCED_MOTION = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const STAR_CONFIG = {
  sun: {
    radius: 1.12,
    scaleY: 1,
    cameraDistance: 4.35,
    exposure: 0.82,
    deepColor: 0x6b1700,
    midColor: 0xf59e0b,
    hotColor: 0xfff3a3,
    spotColor: 0x361000,
    coronaColor: 0xffc857,
    bloomColor: 0xffd76b,
    noiseScale: 3.9,
    detailScale: 12.0,
    flowSpeed: 0.13,
    displacement: 0.022,
    spotStrength: 0.38,
    spotThreshold: 0.72,
    limbPower: 0.72,
    coronaStrength: 0.62,
    flareCount: 4,
    flareHeight: 0.38,
    flareSpeed: 0.75,
    pulseAmplitude: 0.018,
    pulseSpeed: 1.3,
    bloom: { strength: 0.72, radius: 0.46, threshold: 0.84 }
  },
  sirius: {
    radius: 1.10,
    scaleY: 0.985,
    cameraDistance: 4.42,
    exposure: 0.74,
    deepColor: 0x365eaa,
    midColor: 0xb8d4ff,
    hotColor: 0xffffff,
    spotColor: 0x4f6594,
    coronaColor: 0xa9d8ff,
    bloomColor: 0xd6ebff,
    noiseScale: 4.8,
    detailScale: 15.5,
    flowSpeed: 0.18,
    displacement: 0.014,
    spotStrength: 0.16,
    spotThreshold: 0.82,
    limbPower: 0.58,
    coronaStrength: 0.82,
    flareCount: 3,
    flareHeight: 0.34,
    flareSpeed: 0.95,
    pulseAmplitude: 0.012,
    pulseSpeed: 1.65,
    bloom: { strength: 0.82, radius: 0.42, threshold: 0.88 },
    companion: { color: 0xe8f2ff, radius: 0.075, orbit: 1.92, speed: 0.16 }
  },
  vega: {
    radius: 1.12,
    scaleY: 0.91,
    cameraDistance: 4.45,
    exposure: 0.76,
    deepColor: 0x4266a1,
    midColor: 0xc7e3ff,
    hotColor: 0xffffff,
    spotColor: 0x627295,
    coronaColor: 0xcdeaff,
    bloomColor: 0xe4f4ff,
    noiseScale: 5.2,
    detailScale: 17.0,
    flowSpeed: 0.16,
    displacement: 0.012,
    spotStrength: 0.11,
    spotThreshold: 0.86,
    limbPower: 0.52,
    coronaStrength: 0.74,
    flareCount: 2,
    flareHeight: 0.28,
    flareSpeed: 0.88,
    pulseAmplitude: 0.009,
    pulseSpeed: 1.48,
    polarBrightness: 0.32,
    bloom: { strength: 0.76, radius: 0.40, threshold: 0.89 }
  },
  betelgeuse: {
    radius: 1.24,
    scaleY: 0.97,
    cameraDistance: 4.82,
    exposure: 0.78,
    deepColor: 0x3b0501,
    midColor: 0xc52d0b,
    hotColor: 0xff9b47,
    spotColor: 0x160100,
    coronaColor: 0xff5d2b,
    bloomColor: 0xff7a3d,
    noiseScale: 2.4,
    detailScale: 7.5,
    flowSpeed: 0.075,
    displacement: 0.064,
    spotStrength: 0.56,
    spotThreshold: 0.62,
    limbPower: 0.93,
    coronaStrength: 0.48,
    flareCount: 4,
    flareHeight: 0.48,
    flareSpeed: 0.44,
    pulseAmplitude: 0.042,
    pulseSpeed: 0.82,
    bloom: { strength: 0.52, radius: 0.55, threshold: 0.86 }
  },
  rigel: {
    radius: 1.18,
    scaleY: 0.96,
    cameraDistance: 4.62,
    exposure: 0.73,
    deepColor: 0x244b92,
    midColor: 0xa9ccff,
    hotColor: 0xffffff,
    spotColor: 0x3d5680,
    coronaColor: 0x86bdff,
    bloomColor: 0xc5e0ff,
    noiseScale: 4.6,
    detailScale: 14.0,
    flowSpeed: 0.15,
    displacement: 0.019,
    spotStrength: 0.13,
    spotThreshold: 0.84,
    limbPower: 0.60,
    coronaStrength: 0.86,
    flareCount: 3,
    flareHeight: 0.36,
    flareSpeed: 0.85,
    pulseAmplitude: 0.014,
    pulseSpeed: 1.35,
    bloom: { strength: 0.80, radius: 0.44, threshold: 0.89 }
  },
  polaris: {
    radius: 1.16,
    scaleY: 0.97,
    cameraDistance: 4.56,
    exposure: 0.78,
    deepColor: 0x9a671d,
    midColor: 0xf5cf72,
    hotColor: 0xfff8ce,
    spotColor: 0x634112,
    coronaColor: 0xffe5a8,
    bloomColor: 0xfff0bb,
    noiseScale: 3.6,
    detailScale: 10.5,
    flowSpeed: 0.10,
    displacement: 0.026,
    spotStrength: 0.25,
    spotThreshold: 0.76,
    limbPower: 0.70,
    coronaStrength: 0.66,
    flareCount: 3,
    flareHeight: 0.34,
    flareSpeed: 0.62,
    pulseAmplitude: 0.054,
    pulseSpeed: 1.58,
    bloom: { strength: 0.66, radius: 0.46, threshold: 0.87 }
  },
  'proxima-centauri': {
    radius: 0.94,
    scaleY: 0.99,
    cameraDistance: 3.96,
    exposure: 0.80,
    deepColor: 0x220103,
    midColor: 0xa70d18,
    hotColor: 0xff674f,
    spotColor: 0x080001,
    coronaColor: 0xff382c,
    bloomColor: 0xff5d43,
    noiseScale: 2.9,
    detailScale: 9.0,
    flowSpeed: 0.19,
    displacement: 0.034,
    spotStrength: 0.62,
    spotThreshold: 0.60,
    limbPower: 0.96,
    coronaStrength: 0.44,
    flareCount: 6,
    flareHeight: 0.52,
    flareSpeed: 1.42,
    pulseAmplitude: 0.026,
    pulseSpeed: 2.15,
    bloom: { strength: 0.54, radius: 0.48, threshold: 0.85 }
  },
  antares: {
    radius: 1.23,
    scaleY: 0.96,
    cameraDistance: 4.82,
    exposure: 0.76,
    deepColor: 0x2d0201,
    midColor: 0xa8170b,
    hotColor: 0xff7435,
    spotColor: 0x0f0000,
    coronaColor: 0xf04428,
    bloomColor: 0xff6840,
    noiseScale: 2.2,
    detailScale: 6.8,
    flowSpeed: 0.065,
    displacement: 0.070,
    spotStrength: 0.59,
    spotThreshold: 0.58,
    limbPower: 1.02,
    coronaStrength: 0.43,
    flareCount: 5,
    flareHeight: 0.50,
    flareSpeed: 0.42,
    pulseAmplitude: 0.038,
    pulseSpeed: 0.72,
    bloom: { strength: 0.48, radius: 0.56, threshold: 0.84 },
    companion: { color: 0xbad8ff, radius: 0.055, orbit: 2.08, speed: 0.11 }
  }
};

// 3D simplex-noise helpers adapted from Ashima Arts / Stefan Gustavson's MIT-licensed webgl-noise project.
const SIMPLEX_NOISE_GLSL = `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
    i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
    i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m *= m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float fbm3(vec3 p) {
  float result = 0.0;
  float amplitude = 0.52;
  mat3 rotation = mat3(
    0.00, 0.80, 0.60,
   -0.80, 0.36,-0.48,
   -0.60,-0.48, 0.64
  );
  for (int octave = 0; octave < 5; octave++) {
    result += amplitude * snoise(p);
    p = rotation * p * 2.03 + vec3(7.1, 3.7, 5.3);
    amplitude *= 0.5;
  }
  return result * 0.5 + 0.5;
}
`;

function createSeededRandom(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function color(value) {
  return new THREE.Color(value);
}

function createSurfaceMaterial(config) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: color(config.deepColor) },
      uMidColor: { value: color(config.midColor) },
      uHotColor: { value: color(config.hotColor) },
      uSpotColor: { value: color(config.spotColor) },
      uNoiseScale: { value: config.noiseScale },
      uDetailScale: { value: config.detailScale },
      uFlowSpeed: { value: config.flowSpeed },
      uDisplacement: { value: config.displacement },
      uSpotStrength: { value: config.spotStrength },
      uSpotThreshold: { value: config.spotThreshold },
      uLimbPower: { value: config.limbPower },
      uPolarBrightness: { value: config.polarBrightness ?? 0 }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uNoiseScale;
      uniform float uFlowSpeed;
      uniform float uDisplacement;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      ${SIMPLEX_NOISE_GLSL}
      void main() {
        vec3 direction = normalize(position);
        float largeFlow = fbm3(direction * uNoiseScale + vec3(0.0, uTime * uFlowSpeed * 0.25, uTime * uFlowSpeed * 0.12));
        float smallFlow = snoise(direction * (uNoiseScale * 2.7) - vec3(uTime * uFlowSpeed * 0.08, 0.0, uTime * uFlowSpeed * 0.18));
        float displacement = ((largeFlow - 0.5) * 1.25 + smallFlow * 0.18) * uDisplacement;
        vec3 displaced = position + normal * displacement;
        vObjectPosition = normalize(displaced);
        vec4 worldPosition = modelMatrix * vec4(displaced, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uHotColor;
      uniform vec3 uSpotColor;
      uniform float uNoiseScale;
      uniform float uDetailScale;
      uniform float uFlowSpeed;
      uniform float uSpotStrength;
      uniform float uSpotThreshold;
      uniform float uLimbPower;
      uniform float uPolarBrightness;
      varying vec3 vObjectPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      ${SIMPLEX_NOISE_GLSL}
      void main() {
        vec3 p = normalize(vObjectPosition);
        float time = uTime * uFlowSpeed;
        float convection = fbm3(p * uNoiseScale + vec3(time * 0.19, -time * 0.13, time * 0.09));
        float granules = fbm3(p * uDetailScale - vec3(time * 0.32, time * 0.16, -time * 0.21));
        float filaments = abs(snoise(p * (uDetailScale * 1.55) + vec3(-time * 0.11, time * 0.26, time * 0.07)));
        float plasma = clamp(convection * 0.58 + granules * 0.34 + filaments * 0.12, 0.0, 1.0);
        float cellEdges = smoothstep(0.22, 0.62, abs(granules - convection));
        plasma = clamp(plasma + cellEdges * 0.12, 0.0, 1.0);

        float spotNoise = fbm3(p * (uNoiseScale * 0.58) + vec3(13.2, 7.4, 3.8) - time * 0.025);
        float spotDetail = fbm3(p * (uNoiseScale * 1.9) + vec3(2.6, 17.1, 9.4));
        float spots = smoothstep(uSpotThreshold, 0.98, spotNoise * 0.72 + spotDetail * 0.28) * uSpotStrength;

        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float facing = clamp(dot(normalize(vWorldNormal), viewDirection), 0.0, 1.0);
        float limb = pow(facing, uLimbPower);
        float edgeHeat = pow(1.0 - facing, 2.2) * 0.12;
        float polar = pow(abs(p.y), 2.8) * uPolarBrightness;

        vec3 base = mix(uDeepColor, uMidColor, smoothstep(0.18, 0.68, plasma));
        base = mix(base, uHotColor, smoothstep(0.62, 0.96, plasma + polar));
        base = mix(base, uSpotColor, spots);
        base *= 0.58 + limb * 0.52;
        base += uHotColor * edgeHeat;
        gl_FragColor = vec4(base, 1.0);
      }
    `,
    toneMapped: true
  });
}

function createHotspotMaterial(config) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBloomColor: { value: color(config.bloomColor) },
      uNoiseScale: { value: config.noiseScale },
      uDetailScale: { value: config.detailScale },
      uFlowSpeed: { value: config.flowSpeed },
      uIntensity: { value: 2.2 + config.coronaStrength * 1.4 }
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uBloomColor;
      uniform float uNoiseScale;
      uniform float uDetailScale;
      uniform float uFlowSpeed;
      uniform float uIntensity;
      varying vec3 vPosition;
      ${SIMPLEX_NOISE_GLSL}
      void main() {
        vec3 p = normalize(vPosition);
        float t = uTime * uFlowSpeed;
        float broad = fbm3(p * uNoiseScale + vec3(t * 0.17, -t * 0.11, t * 0.08));
        float detail = fbm3(p * uDetailScale - vec3(t * 0.23, t * 0.18, -t * 0.14));
        float mask = smoothstep(0.72, 0.95, broad * 0.56 + detail * 0.44);
        gl_FragColor = vec4(uBloomColor * uIntensity * mask, mask);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  });
}

function createCoronaMaterial(config, { bloom = false, layer = 0 } = {}) {
  const intensity = bloom ? 3.0 + config.coronaStrength * 2.8 : 0.44 + config.coronaStrength * 0.32;
  const opacity = bloom ? 0.78 : 0.26;
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: color(config.coronaColor) },
      uIntensity: { value: intensity },
      uOpacity: { value: opacity },
      uNoiseScale: { value: 2.8 + layer * 1.6 },
      uSpeed: { value: config.flowSpeed * (0.34 + layer * 0.18) },
      uPower: { value: 2.35 + layer * 0.65 }
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vObjectPosition;
      void main() {
        vObjectPosition = normalize(position);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uOpacity;
      uniform float uNoiseScale;
      uniform float uSpeed;
      uniform float uPower;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      varying vec3 vObjectPosition;
      ${SIMPLEX_NOISE_GLSL}
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), uPower);
        float turbulence = fbm3(normalize(vObjectPosition) * uNoiseScale + vec3(uTime * uSpeed, -uTime * uSpeed * 0.63, uTime * uSpeed * 0.27));
        float strands = smoothstep(0.30, 0.92, turbulence) * (0.54 + 0.46 * fresnel);
        float alpha = fresnel * strands * uOpacity;
        gl_FragColor = vec4(uColor * uIntensity * (0.42 + strands * 0.86), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: true,
    toneMapped: !bloom
  });
}

function createCoronaParticles(config, seed) {
  const reduced = REDUCED_MOTION();
  const random = createSeededRandom(seed);
  const count = reduced ? 420 : 920;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const baseColor = color(config.coronaColor);
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const distance = config.radius * (1.08 + Math.pow(random(), 2.2) * 0.33);
    const offset = index * 3;
    positions[offset] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[offset + 1] = Math.cos(phi) * distance;
    positions[offset + 2] = Math.sin(phi) * Math.sin(theta) * distance;
    const variation = 0.65 + random() * 0.65;
    colors[offset] = baseColor.r * variation;
    colors[offset + 1] = baseColor.g * variation;
    colors[offset + 2] = baseColor.b * variation;
    sizes[index] = 0.008 + random() * 0.026;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.8) },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      uniform float uPixelRatio;
      uniform float uTime;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        float phase = position.x * 2.1 + position.y * 1.7 + position.z * 2.8;
        vAlpha = 0.38 + 0.36 * sin(uTime * 0.7 + phase);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (380.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 centered = gl_PointCoord - 0.5;
        float distanceToCenter = length(centered);
        float alpha = smoothstep(0.5, 0.08, distanceToCenter) * vAlpha;
        gl_FragColor = vec4(vColor * 2.4, alpha);
      }
    `,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: true,
    toneMapped: false
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function makePerpendicular(normal) {
  const reference = Math.abs(normal.y) > 0.78 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(normal, reference).normalize();
}

function createFlarePair(config, seed, index) {
  const random = createSeededRandom(seed + index * 97);
  const theta = random() * Math.PI * 2;
  const phi = Math.acos(2 * random() - 1);
  const centerNormal = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  ).normalize();
  const tangent = makePerpendicular(centerNormal).applyAxisAngle(centerNormal, random() * Math.PI * 2);
  const spread = 0.18 + random() * 0.30;
  const start = centerNormal.clone().addScaledVector(tangent, -spread).normalize().multiplyScalar(config.radius * 1.012);
  const end = centerNormal.clone().addScaledVector(tangent, spread).normalize().multiplyScalar(config.radius * 1.012);
  const height = config.radius * (config.flareHeight * (0.62 + random() * 0.68));
  const control = centerNormal.clone().multiplyScalar(config.radius + height);
  const curve = new THREE.QuadraticBezierCurve3(start, control, end);
  const tubularSegments = REDUCED_MOTION() ? 30 : 52;
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, config.radius * (0.009 + random() * 0.006), 7, false);
  const baseMaterial = new THREE.MeshBasicMaterial({
    color: config.coronaColor,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: true
  });
  const bloomMaterial = new THREE.MeshBasicMaterial({
    color: color(config.bloomColor).multiplyScalar(3.2),
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthTest: true,
    depthWrite: false,
    toneMapped: false
  });
  const baseMesh = new THREE.Mesh(geometry, baseMaterial);
  const bloomMesh = new THREE.Mesh(geometry.clone(), bloomMaterial);
  const metadata = {
    phase: random() * Math.PI * 2,
    speed: config.flareSpeed * (0.56 + random() * 0.72),
    scaleAmplitude: 0.06 + random() * 0.07
  };
  baseMesh.userData.flare = { ...metadata, opacity: baseMaterial.opacity };
  bloomMesh.userData.flare = { ...metadata, opacity: bloomMaterial.opacity };
  return { baseMesh, bloomMesh };
}

function createCompanion(config) {
  if (!config.companion) return null;
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(config.companion.radius, 32, 20);
  const material = new THREE.MeshBasicMaterial({ color: config.companion.color, toneMapped: false });
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.x = config.companion.orbit;
  group.add(sphere);
  group.userData.orbitSpeed = config.companion.speed;
  return group;
}

function createStarSystem(config, seed) {
  const baseGroup = new THREE.Group();
  const bloomGroup = new THREE.Group();
  const surfaceGeometry = new THREE.SphereGeometry(config.radius, REDUCED_MOTION() ? 112 : 164, REDUCED_MOTION() ? 76 : 112);
  surfaceGeometry.scale(1, config.scaleY, 1);

  const surfaceMaterial = createSurfaceMaterial(config);
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  baseGroup.add(surface);

  const occluderMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide, depthWrite: true, toneMapped: false });
  const occluder = new THREE.Mesh(surfaceGeometry.clone(), occluderMaterial);
  bloomGroup.add(occluder);

  const hotspotGeometry = surfaceGeometry.clone();
  hotspotGeometry.scale(1.003, 1.003, 1.003);
  const hotspotMaterial = createHotspotMaterial(config);
  const hotspots = new THREE.Mesh(hotspotGeometry, hotspotMaterial);
  bloomGroup.add(hotspots);

  const coronaMaterials = [];
  for (let layer = 0; layer < 3; layer += 1) {
    const scale = 1.055 + layer * 0.055;
    const geometry = new THREE.SphereGeometry(config.radius * scale, REDUCED_MOTION() ? 84 : 124, REDUCED_MOTION() ? 54 : 84);
    geometry.scale(1, config.scaleY, 1);
    const baseMaterial = createCoronaMaterial(config, { bloom: false, layer });
    const bloomMaterial = createCoronaMaterial(config, { bloom: true, layer });
    coronaMaterials.push(baseMaterial, bloomMaterial);
    baseGroup.add(new THREE.Mesh(geometry, baseMaterial));
    bloomGroup.add(new THREE.Mesh(geometry.clone(), bloomMaterial));
  }

  const coronaParticles = createCoronaParticles(config, seed + 404);
  bloomGroup.add(coronaParticles);

  const flares = [];
  const flareCount = REDUCED_MOTION() ? Math.min(2, config.flareCount) : config.flareCount;
  for (let index = 0; index < flareCount; index += 1) {
    const pair = createFlarePair(config, seed, index);
    baseGroup.add(pair.baseMesh);
    bloomGroup.add(pair.bloomMesh);
    flares.push(pair);
  }

  const baseCompanion = createCompanion(config);
  const bloomCompanion = createCompanion(config);
  if (baseCompanion && bloomCompanion) {
    baseCompanion.children[0].material = new THREE.MeshBasicMaterial({ color: config.companion.color, toneMapped: true });
    bloomCompanion.children[0].material = new THREE.MeshBasicMaterial({ color: color(config.companion.color).multiplyScalar(3.0), toneMapped: false });
    baseGroup.add(baseCompanion);
    bloomGroup.add(bloomCompanion);
  }

  baseGroup.userData = {
    surfaceMaterial,
    coronaMaterials: coronaMaterials.filter((_, index) => index % 2 === 0),
    flares: flares.map((pair) => pair.baseMesh),
    companion: baseCompanion
  };
  bloomGroup.userData = {
    hotspotMaterial,
    coronaMaterials: coronaMaterials.filter((_, index) => index % 2 === 1),
    coronaParticles,
    flares: flares.map((pair) => pair.bloomMesh),
    companion: bloomCompanion
  };
  return { baseGroup, bloomGroup };
}

function createSelectiveBloomPipeline(renderer, baseScene, bloomScene, camera) {
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    depthBuffer: true,
    stencilBuffer: false
  });
  renderTarget.texture.colorSpace = THREE.LinearSRGBColorSpace;

  const bloomComposer = new EffectComposer(renderer, renderTarget);
  bloomComposer.renderToScreen = false;
  bloomComposer.addPass(new RenderPass(bloomScene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.72, 0.46, 0.84);
  bloomComposer.addPass(bloom);

  const finalComposer = new EffectComposer(renderer);
  finalComposer.addPass(new RenderPass(baseScene, camera));
  const compositePass = new ShaderPass(new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D baseTexture;
      uniform sampler2D bloomTexture;
      varying vec2 vUv;
      void main() {
        vec4 base = texture2D(baseTexture, vUv);
        vec4 bloom = texture2D(bloomTexture, vUv);
        gl_FragColor = vec4(base.rgb + bloom.rgb, max(base.a, bloom.a));
      }
    `,
    transparent: true,
    toneMapped: false
  }), 'baseTexture');
  finalComposer.addPass(compositePass);
  finalComposer.addPass(new OutputPass());

  return { bloomComposer, finalComposer, bloom };
}

export function createStarThreeRenderer(canvas, { onInteraction, onError } = {}) {
  let renderer;
  try {
    renderer = createRenderer(canvas, { alpha: true, exposure: 0.80 });
  } catch (error) {
    onError?.(error);
    throw error;
  }

  renderer.setClearColor(0x000000, 0);
  const baseScene = new THREE.Scene();
  const bloomScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0.06, 0.03, 4.4);

  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.58;
  controls.zoomSpeed = 0.78;
  controls.minDistance = 2.55;
  controls.maxDistance = 7.2;
  controls.target.set(0, 0, 0);

  const stars = createStarfield({ count: REDUCED_MOTION() ? 620 : 1180, radius: 30, minSize: 0.015, maxSize: 0.06, seed: 510 });
  baseScene.add(stars);

  const baseRoot = new THREE.Group();
  const bloomRoot = new THREE.Group();
  baseScene.add(baseRoot);
  bloomScene.add(bloomRoot);

  const { bloomComposer, finalComposer, bloom } = createSelectiveBloomPipeline(renderer, baseScene, bloomScene, camera);

  let currentStar = null;
  let currentConfig = STAR_CONFIG.sun;
  let baseSystem = null;
  let bloomSystem = null;
  let running = true;
  let visible = document.visibilityState !== 'hidden';
  let active = true;
  let automaticRotation = true;
  let animationFrame = 0;
  let previousTime = performance.now();

  function clearSystems() {
    if (baseSystem) {
      baseRoot.remove(baseSystem);
      disposeThreeObject(baseSystem);
      baseSystem = null;
    }
    if (bloomSystem) {
      bloomRoot.remove(bloomSystem);
      disposeThreeObject(bloomSystem);
      bloomSystem = null;
    }
  }

  function updateUniforms(system, elapsed) {
    if (!system) return;
    const surfaceMaterial = system.userData.surfaceMaterial;
    const hotspotMaterial = system.userData.hotspotMaterial;
    if (surfaceMaterial?.uniforms?.uTime) surfaceMaterial.uniforms.uTime.value = elapsed;
    if (hotspotMaterial?.uniforms?.uTime) hotspotMaterial.uniforms.uTime.value = elapsed;
    system.userData.coronaMaterials?.forEach((material) => {
      if (material.uniforms?.uTime) material.uniforms.uTime.value = elapsed;
    });
    if (system.userData.coronaParticles?.material?.uniforms?.uTime) {
      system.userData.coronaParticles.material.uniforms.uTime.value = elapsed;
    }
  }

  function animateFlares(system, elapsed) {
    system?.userData?.flares?.forEach((flare) => {
      const metadata = flare.userData.flare;
      if (!metadata) return;
      const wave = Math.max(0, Math.sin(elapsed * metadata.speed + metadata.phase));
      const pulse = Math.pow(wave, 2.4);
      flare.material.opacity = (metadata.opacity ?? 0.5) * (0.15 + pulse * 0.85);
      const scale = 0.96 + pulse * metadata.scaleAmplitude;
      flare.scale.setScalar(scale);
    });
  }

  function updateCompanion(system, delta) {
    const companion = system?.userData?.companion;
    if (companion) companion.rotation.y += delta * companion.userData.orbitSpeed;
  }

  function applyPresentation(star, config) {
    renderer.toneMappingExposure = config.exposure;
    bloom.strength = config.bloom.strength;
    bloom.radius = config.bloom.radius;
    bloom.threshold = config.bloom.threshold;
    camera.position.set(0.06, 0.03, config.cameraDistance);
    controls.minDistance = Math.max(2.25, config.cameraDistance - 1.65);
    controls.maxDistance = config.cameraDistance + 2.3;
    controls.target.set(0, 0, 0);
    controls.update();
    const pitch = star.viewer?.initialPitch ?? -0.10;
    const yaw = star.viewer?.initialYaw ?? 0.28;
    const roll = star.viewer?.initialRoll ?? 0.04;
    baseRoot.rotation.set(pitch, yaw, roll);
    bloomRoot.rotation.copy(baseRoot.rotation);
  }

  function setStar(star) {
    currentStar = star;
    currentConfig = STAR_CONFIG[star.id] || STAR_CONFIG.sun;
    clearSystems();
    const seed = [...star.id].reduce((sum, character) => sum + character.charCodeAt(0), 0) * 17;
    const systems = createStarSystem(currentConfig, seed);
    baseSystem = systems.baseGroup;
    bloomSystem = systems.bloomGroup;
    baseRoot.add(baseSystem);
    bloomRoot.add(bloomSystem);
    applyPresentation(star, currentConfig);
    automaticRotation = true;
    active = true;
    canvas.dataset.starReady = star.id;
    canvas.removeAttribute('data-render-error');
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(window.devicePixelRatio || 1, REDUCED_MOTION() ? 1.25 : 1.65);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    bloomComposer.setSize(width, height);
    finalComposer.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  controls.addEventListener('start', () => {
    automaticRotation = false;
    onInteraction?.();
  });

  function animate(time) {
    if (!running) return;
    const delta = Math.min(0.05, Math.max(0, (time - previousTime) / 1000));
    previousTime = time;
    if (visible && active) {
      const elapsed = time * 0.001;
      controls.update();
      if (baseSystem && bloomSystem) {
        if (automaticRotation) {
          const speed = Math.abs(currentStar?.viewer?.rotationSpeed ?? 0.08) + 0.035;
          baseSystem.rotation.y += delta * speed;
          bloomSystem.rotation.y = baseSystem.rotation.y;
        } else {
          bloomSystem.quaternion.copy(baseSystem.quaternion);
        }
        const pulse = 1 + Math.sin(elapsed * currentConfig.pulseSpeed) * currentConfig.pulseAmplitude;
        baseSystem.scale.setScalar(pulse);
        bloomSystem.scale.setScalar(pulse);
        updateUniforms(baseSystem, elapsed);
        updateUniforms(bloomSystem, elapsed);
        animateFlares(baseSystem, elapsed);
        animateFlares(bloomSystem, elapsed);
        updateCompanion(baseSystem, delta);
        updateCompanion(bloomSystem, delta);
      }
      stars.material.uniforms.uTime.value = elapsed;
      stars.rotation.y += delta * 0.003;
      bloomComposer.render(delta);
      finalComposer.render(delta);
    }
    animationFrame = requestAnimationFrame(animate);
  }
  animationFrame = requestAnimationFrame(animate);

  function reset() {
    if (!currentStar) return;
    if (baseSystem) baseSystem.rotation.set(0, 0, 0);
    if (bloomSystem) bloomSystem.rotation.set(0, 0, 0);
    applyPresentation(currentStar, currentConfig);
    automaticRotation = true;
    active = true;
  }

  function zoom(amount) {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, amount);
    controls.update();
    onInteraction?.();
  }

  function onVisibilityChange() {
    visible = document.visibilityState !== 'hidden';
    previousTime = performance.now();
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    setStar,
    zoomIn() { zoom(0.34); },
    zoomOut() { zoom(-0.34); },
    reset,
    setActive(value) { active = Boolean(value); },
    toggleAnimation() {
      active = !active;
      return active;
    },
    setAutoRotation(value) { automaticRotation = Boolean(value); },
    destroy() {
      running = false;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      controls.dispose();
      clearSystems();
      disposeThreeObject(stars);
      baseScene.remove(stars, baseRoot);
      bloomScene.remove(bloomRoot);
      disposeComposer(bloomComposer);
      disposeComposer(finalComposer);
      renderer.dispose();
    }
  };
}
