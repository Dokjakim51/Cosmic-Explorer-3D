export async function loadUniverseScene() {
  // Three.js or another 3D engine will be imported dynamically in Phase 2.
  // Keeping this as a boundary prevents 3D code from entering the initial bundle.
  return {
    supported: 'WebGLRenderingContext' in window,
    mount() {
      throw new Error('The interactive universe scene is scheduled for Phase 2.');
    }
  };
}
