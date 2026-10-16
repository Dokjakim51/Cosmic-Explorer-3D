import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  THREE,
  createComposer,
  createRenderer,
  disposeComposer,
  resizeThreeSurface
} from '../three/three-scene-utils.js';
import { createGalleryScene } from './gallery-three-scenes.js';

const PREVIEW_WIDTH = 640;
const PREVIEW_DEFAULT_HEIGHT = 400;
const PREVIEW_MIN_HEIGHT = 340;
const PREVIEW_MAX_HEIGHT = 780;
const PREVIEW_MAX_PIXEL_RATIO = 1;
const VIEWER_MAX_PIXEL_RATIO = 1.45;
const PREVIEWS_PER_FRAME = 2;

function nowSeconds() {
  return performance.now() * 0.001;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function disposeEntry(entry) {
  entry?.record?.dispose?.();
  entry.record = null;
}

function buildSceneSafely(id, host, mode = 'viewer') {
  try {
    const record = createGalleryScene(id, { mode });
    host?.classList.remove('has-scene-error');
    return record;
  } catch (error) {
    console.error(`[Gallery 3D] Could not create scene "${id}".`, error);
    host?.classList.add('has-scene-error');
    return null;
  }
}

/**
 * Renders all card thumbnails through one hidden WebGL renderer, then copies each
 * finished frame into the card's own 2D canvas. This avoids sixteen WebGL contexts
 * while ensuring every preview is clipped by and permanently attached to its card.
 */
export function createGalleryPreviewRenderer({ page, grid }) {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.className = 'gallery-preview-source-canvas';
  sourceCanvas.width = PREVIEW_WIDTH;
  sourceCanvas.height = PREVIEW_DEFAULT_HEIGHT;

  let renderer;
  try {
    // The thumbnail renderer is Gallery-only and keeps its drawing buffer long
    // enough to copy the rendered frame into each card's 2D canvas reliably.
    renderer = new THREE.WebGLRenderer({
      canvas: sourceCanvas,
      alpha: false,
      antialias: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      preserveDrawingBuffer: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.82;
  } catch (error) {
    console.error('[Gallery 3D] WebGL preview renderer could not start.', error);
    page.classList.add('gallery-webgl-unavailable');
    return {
      sync() {},
      pause() {},
      resume() {},
      destroy() {}
    };
  }

  renderer.setPixelRatio(PREVIEW_MAX_PIXEL_RATIO);
  renderer.setSize(PREVIEW_WIDTH, PREVIEW_DEFAULT_HEIGHT, false);
  renderer.setClearColor(0x01030a, 1);
  renderer.shadowMap.enabled = false;

  // The previous correction copied a raw render into each thumbnail, so every
  // card lost the bloom that made the full viewer feel alive. A single shared
  // composer restores calibrated bloom without creating sixteen WebGL contexts.
  const previewFallbackScene = new THREE.Scene();
  const previewFallbackCamera = new THREE.PerspectiveCamera(42, PREVIEW_WIDTH / PREVIEW_DEFAULT_HEIGHT, 0.05, 100);
  const { composer: previewComposer, bloom: previewBloom } = createComposer(
    renderer,
    previewFallbackScene,
    previewFallbackCamera,
    { strength: 0.46, radius: 0.32, threshold: 0.88 }
  );
  const previewRenderPass = previewComposer.passes[0];
  previewComposer.setSize(PREVIEW_WIDTH, PREVIEW_DEFAULT_HEIGHT);
  let previewSurfaceHeight = PREVIEW_DEFAULT_HEIGHT;

  const entries = new Map();
  let paused = false;
  let stopped = false;
  let frameId = 0;
  let cursor = 0;
  let lastTime = nowSeconds();

  const preparePreviewRecord = (entry) => {
    if (!entry || entry.record || !entry.host.isConnected) return;
    entry.record = buildSceneSafely(entry.id, entry.host, 'preview');
    entry.basePosition = entry.record?.previewCameraPosition?.clone() || entry.record?.camera.position.clone() || null;
    entry.baseTarget = entry.record?.previewTarget?.clone() || entry.record?.target.clone() || null;
    entry.baseFov = entry.record?.previewFov || entry.record?.camera.fov || 42;
    entry.lastRender = nowSeconds();
  };

  const observer = new IntersectionObserver((observed) => {
    observed.forEach((item) => {
      const host = item.target;
      const entry = entries.get(host.dataset.galleryScene);
      if (!entry || entry.host !== host) return;
      entry.visible = item.isIntersecting;
      if (entry.visible && !entry.record && !entry.failed) preparePreviewRecord(entry);
    });
  }, { rootMargin: '420px 0px', threshold: 0.01 });

  const failPreviewEntry = (entry, error) => {
    console.error(`[Gallery 3D] Preview scene "${entry.id}" stopped safely.`, error);
    entry.failed = true;
    entry.host.classList.add('has-scene-error');
    entry.host.classList.remove('has-rendered-thumbnail');
    entry.context?.clearRect(0, 0, entry.thumbnail?.width || PREVIEW_WIDTH, entry.thumbnail?.height || PREVIEW_DEFAULT_HEIGHT);
    disposeEntry(entry);
  };

  const paintEntry = (entry, time) => {
    if (!entry.visible || !entry.record || !entry.host.isConnected || !entry.context) return;
    try {
      const rect = entry.host.getBoundingClientRect();
      if (rect.width < 8 || rect.height < 8) return;

      const delta = Math.min(0.08, Math.max(0, time - (entry.lastRender || time)));
      entry.lastRender = time;
      const { record } = entry;
      const hostAspect = clamp(rect.width / rect.height, 1.02, 2.15);
      const targetHeight = Math.round(clamp(PREVIEW_WIDTH / hostAspect, PREVIEW_MIN_HEIGHT, PREVIEW_MAX_HEIGHT));
      if (previewSurfaceHeight !== targetHeight) {
        previewSurfaceHeight = targetHeight;
        renderer.setSize(PREVIEW_WIDTH, targetHeight, false);
        previewComposer.setSize(PREVIEW_WIDTH, targetHeight);
      }
      if (entry.thumbnail.width !== PREVIEW_WIDTH || entry.thumbnail.height !== targetHeight) {
        entry.thumbnail.width = PREVIEW_WIDTH;
        entry.thumbnail.height = targetHeight;
      }
      record.camera.aspect = PREVIEW_WIDTH / targetHeight;
      record.camera.fov = entry.baseFov || record.camera.fov;
      record.camera.updateProjectionMatrix();
      if (entry.basePosition) record.camera.position.copy(entry.basePosition);
      const previewTarget = entry.baseTarget || record.target;
      record.camera.lookAt(previewTarget);
      record.update(time, delta);

      renderer.toneMappingExposure = record.previewExposure ?? Math.min(0.98, record.exposure ?? 0.94);
      const bloomSettings = record.previewBloom || record.bloom || {};
      previewRenderPass.scene = record.scene;
      previewRenderPass.camera = record.camera;
      previewBloom.strength = bloomSettings.strength ?? 0.46;
      previewBloom.radius = bloomSettings.radius ?? 0.32;
      previewBloom.threshold = bloomSettings.threshold ?? 0.88;
      renderer.clear(true, true, true);
      previewComposer.render(delta);
      entry.context.clearRect(0, 0, PREVIEW_WIDTH, previewSurfaceHeight);
      entry.context.drawImage(sourceCanvas, 0, 0, PREVIEW_WIDTH, previewSurfaceHeight);
      entry.host.classList.remove('has-scene-error');
      entry.host.classList.add('has-rendered-thumbnail');
    } catch (error) {
      failPreviewEntry(entry, error);
    }
  };

  const renderFrame = () => {
    if (stopped) return;
    frameId = requestAnimationFrame(renderFrame);
    if (paused || document.hidden) return;

    const visible = [...entries.values()].filter((entry) => entry.visible && entry.record && entry.host.isConnected && !entry.failed);
    if (!visible.length) return;
    const time = nowSeconds();
    lastTime = time;
    for (let index = 0; index < Math.min(PREVIEWS_PER_FRAME, visible.length); index += 1) {
      paintEntry(visible[(cursor + index) % visible.length], time);
    }
    cursor = (cursor + PREVIEWS_PER_FRAME) % visible.length;
  };

  frameId = requestAnimationFrame(renderFrame);

  return {
    sync(items) {
      const desired = new Set(items.map((item) => item.scene));
      entries.forEach((entry, id) => {
        if (desired.has(id) && entry.host.isConnected) return;
        observer.unobserve(entry.host);
        disposeEntry(entry);
        entries.delete(id);
      });

      items.forEach((item) => {
        const host = grid.querySelector(`[data-gallery-scene="${CSS.escape(item.scene)}"]`);
        if (!host) return;
        const thumbnail = host.querySelector('[data-gallery-thumbnail]');
        const existing = entries.get(item.scene);
        if (existing?.host === host && existing.thumbnail === thumbnail) return;
        if (existing) {
          observer.unobserve(existing.host);
          disposeEntry(existing);
        }
        if (thumbnail) {
          thumbnail.width = PREVIEW_WIDTH;
          thumbnail.height = PREVIEW_DEFAULT_HEIGHT;
        }
        const entry = {
          id: item.scene,
          host,
          thumbnail,
          context: thumbnail?.getContext('2d', { alpha: false }) || null,
          record: null,
          visible: false,
          basePosition: null,
          baseTarget: null,
          baseFov: 42,
          lastRender: 0,
          failed: false
        };
        entries.set(item.scene, entry);
        observer.observe(host);
      });
    },
    pause() {
      paused = true;
      page.classList.add('gallery-previews-paused');
    },
    resume() {
      paused = false;
      lastTime = nowSeconds();
      entries.forEach((entry) => { entry.lastRender = lastTime; });
      page.classList.remove('gallery-previews-paused');
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(frameId);
      observer.disconnect();
      entries.forEach(disposeEntry);
      entries.clear();
      disposeComposer(previewComposer);
      renderer.dispose();
    }
  };
}

export function createGalleryViewerRenderer(canvas) {
  let renderer;
  try {
    renderer = createRenderer(canvas, { alpha: false, exposure: 0.92 });
  } catch (error) {
    console.error('[Gallery 3D] WebGL viewer renderer could not start.', error);
    canvas.closest('.gallery-viewer-stage')?.classList.add('has-scene-error');
    return {
      setScene() {}, setActive() {}, zoomBy() {}, resetView() {}, destroy() {}
    };
  }

  const fallbackScene = new THREE.Scene();
  const fallbackCamera = new THREE.PerspectiveCamera(42, 1, 0.05, 100);
  const { composer, bloom } = createComposer(renderer, fallbackScene, fallbackCamera, {
    strength: 0.42,
    radius: 0.38,
    threshold: 0.88
  });
  const renderPass = composer.passes[0];
  const controls = new OrbitControls(fallbackCamera, canvas);
  const stage = canvas.closest('.gallery-viewer-stage');
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 2.1;
  controls.maxDistance = 16;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.75;
  controls.enabled = false;

  let active = false;
  let stopped = false;
  let frameId = 0;
  let record = null;
  let initialPosition = new THREE.Vector3();
  let initialTarget = new THREE.Vector3();
  let lastTime = nowSeconds();
  let sceneToken = 0;
  let lastFailedScene = null;

  const clearViewerFrame = () => {
    renderer.setRenderTarget(null);
    renderer.setClearColor(0x01030a, 1);
    renderer.clear(true, true, true);
  };

  const releaseCurrentRecord = () => {
    record?.dispose?.();
    record = null;
    renderPass.scene = fallbackScene;
    renderPass.camera = fallbackCamera;
    controls.object = fallbackCamera;
    controls.target.set(0, 0, 0);
    controls.update();
  };

  const resize = () => {
    if (!record) return;
    resizeThreeSurface({
      canvas,
      renderer,
      composer,
      camera: record.camera,
      maxPixelRatio: VIEWER_MAX_PIXEL_RATIO
    });
  };

  const handleViewerFailure = (error, sceneId = lastFailedScene || 'unknown') => {
    console.error(`[Gallery 3D] Viewer scene "${sceneId}" stopped safely.`, error);
    stage?.classList.add('has-scene-error');
    releaseCurrentRecord();
    clearViewerFrame();
  };

  const renderCurrentFrame = (time, delta) => {
    if (!record) return false;
    try {
      resize();
      record.update(time, delta);
      controls.update();
      composer.render(delta);
      stage?.classList.remove('has-scene-error');
      return true;
    } catch (error) {
      handleViewerFailure(error, lastFailedScene);
      return false;
    }
  };

  const renderFrame = () => {
    if (stopped) return;
    frameId = requestAnimationFrame(renderFrame);
    if (!active || !record || document.hidden) return;
    const time = nowSeconds();
    const delta = Math.min(0.05, Math.max(0, time - lastTime));
    lastTime = time;
    renderCurrentFrame(time, delta);
  };
  frameId = requestAnimationFrame(renderFrame);

  const applyRecord = (nextRecord, sceneId) => {
    releaseCurrentRecord();
    clearViewerFrame();
    record = nextRecord;
    lastFailedScene = sceneId;
    if (!record) {
      stage?.classList.add('has-scene-error');
      return false;
    }
    renderPass.scene = record.scene;
    renderPass.camera = record.camera;
    bloom.strength = record.bloom?.strength ?? 0.42;
    bloom.radius = record.bloom?.radius ?? 0.38;
    bloom.threshold = record.bloom?.threshold ?? 0.88;
    renderer.toneMappingExposure = record.exposure ?? 0.92;
    controls.object = record.camera;
    controls.target.copy(record.target);
    controls.update();
    initialPosition.copy(record.camera.position);
    initialTarget.copy(record.target);
    stage?.style.setProperty('--gallery-scene-accent', record.accent || '#8fdcff');
    stage?.classList.remove('has-scene-error');
    resize();
    return true;
  };

  return {
    setScene(id) {
      const token = ++sceneToken;
      lastFailedScene = id;
      stage?.classList.remove('has-scene-error');
      releaseCurrentRecord();
      clearViewerFrame();
      const next = buildSceneSafely(id, stage, 'viewer');
      if (token !== sceneToken) {
        next?.dispose?.();
        return;
      }
      if (!applyRecord(next, id)) return;
      lastTime = nowSeconds();
      // Render immediately so a newly selected scene can never display the
      // previous scene's last framebuffer while waiting for the next RAF tick.
      renderCurrentFrame(lastTime, 0);
    },
    setActive(value) {
      active = Boolean(value);
      controls.enabled = active;
      if (active) {
        lastTime = nowSeconds();
        resize();
        renderCurrentFrame(lastTime, 0);
      }
    },
    zoomBy(factor) {
      if (!record) return;
      const direction = record.camera.position.clone().sub(controls.target);
      const distance = clamp(direction.length() * factor, controls.minDistance, controls.maxDistance);
      direction.setLength(distance);
      record.camera.position.copy(controls.target).add(direction);
      controls.update();
    },
    resetView() {
      if (!record) return;
      record.camera.position.copy(initialPosition);
      controls.target.copy(initialTarget);
      record.target.copy(initialTarget);
      record.camera.lookAt(initialTarget);
      controls.update();
      renderCurrentFrame(nowSeconds(), 0);
    },
    destroy() {
      stopped = true;
      sceneToken += 1;
      cancelAnimationFrame(frameId);
      controls.dispose();
      releaseCurrentRecord();
      disposeComposer(composer);
      renderer.dispose();
    }
  };
}
