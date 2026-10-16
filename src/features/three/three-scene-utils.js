import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export { THREE };

export function createRenderer(canvas, { alpha = true, exposure = 1.1 } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha,
    antialias: true,
    powerPreference: 'high-performance',
    premultipliedAlpha: false
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, alpha ? 0 : 1);
  return renderer;
}


export function createStudioEnvironment(renderer) {
  const generator = new THREE.PMREMGenerator(renderer);
  const environmentScene = new RoomEnvironment();
  const renderTarget = generator.fromScene(environmentScene, 0.035);
  environmentScene.dispose?.();
  generator.dispose();
  return renderTarget.texture;
}

export function createComposer(renderer, scene, camera, {
  strength = 0.9,
  radius = 0.48,
  threshold = 0.72
} = {}) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), strength, radius, threshold);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  return { composer, bloom };
}

export function resizeThreeSurface({ canvas, renderer, composer, camera, maxPixelRatio = 1.8 }) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pixelRatio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
  const targetWidth = Math.round(width * pixelRatio);
  const targetHeight = Math.round(height * pixelRatio);
  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    composer?.setSize(width, height);
    camera.aspect = width / Math.max(1, height);
    camera.updateProjectionMatrix();
  }
}

export function configureTexture(texture, { color = false, repeat = true } = {}) {
  if (color) texture.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

export function createAtmosphereMaterial({
  color = 0x4da6ff,
  intensity = 1.35,
  power = 3.8,
  opacity = 0.85
} = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uPower: { value: power },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uPower;
      uniform float uOpacity;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(normalize(vWorldNormal), viewDirection), 0.0), uPower);
        float alpha = fresnel * uIntensity * uOpacity;
        gl_FragColor = vec4(uColor * (0.55 + fresnel * 1.75), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false
  });
}

export function createStarfield({
  count = 1200,
  radius = 24,
  minSize = 0.015,
  maxSize = 0.06,
  color = 0xbdd9ff,
  seed = 17
} = {}) {
  let state = seed >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    const theta = random() * Math.PI * 2;
    const phi = Math.acos(2 * random() - 1);
    const distance = radius * (0.55 + random() * 0.45);
    positions[index * 3] = Math.sin(phi) * Math.cos(theta) * distance;
    positions[index * 3 + 1] = Math.cos(phi) * distance;
    positions[index * 3 + 2] = Math.sin(phi) * Math.sin(theta) * distance;
    sizes[index] = minSize + (maxSize - minSize) * Math.pow(random(), 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      uTime: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      uniform float uPixelRatio;
      uniform float uTime;
      varying float vTwinkle;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        float phase = position.x * 1.91 + position.y * 2.73 + position.z * 1.37;
        vTwinkle = 0.62 + 0.38 * sin(uTime * 0.9 + phase);
        gl_PointSize = aSize * uPixelRatio * (320.0 / max(1.0, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vTwinkle;
      void main() {
        vec2 centered = gl_PointCoord - 0.5;
        float distanceToCenter = length(centered);
        float alpha = smoothstep(0.5, 0.05, distanceToCenter) * vTwinkle;
        gl_FragColor = vec4(uColor * (1.2 + vTwinkle), alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false
  });
  return new THREE.Points(geometry, material);
}

export function disposeThreeObject(root) {
  root.traverse?.((object) => {
    object.geometry?.dispose?.();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose?.();
    });
  });
}

export function disposeComposer(composer) {
  composer?.passes?.forEach((pass) => pass.dispose?.());
  composer?.renderTarget1?.dispose?.();
  composer?.renderTarget2?.dispose?.();
}
