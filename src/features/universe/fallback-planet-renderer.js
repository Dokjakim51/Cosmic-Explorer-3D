const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

export function createFallbackPlanetRenderer(container, { onInteraction } = {}) {
  const orb = container.querySelector('.planet-thumbnail');
  const pointers = new Map();
  let planet = null;
  let pitch = -12;
  let yaw = 22;
  let roll = 0;
  let zoom = 1;
  let automaticRotation = true;
  let activePointer = null;
  let lastPoint = null;
  let previousPinchDistance = 0;
  let frame = 0;
  let lastTime = performance.now();
  let disposed = false;

  function notify() {
    if (typeof onInteraction === 'function') onInteraction();
  }

  function applyTransform() {
    orb.style.transform = `perspective(900px) rotateX(${pitch}deg) rotateY(${yaw}deg) rotateZ(${roll}deg) scale(${zoom})`;
  }

  function render(time) {
    if (disposed) return;
    const delta = Math.min(.05, Math.max(0, (time - lastTime) / 1000));
    lastTime = time;
    if (automaticRotation && document.visibilityState !== 'hidden') {
      yaw += (planet?.viewer?.rotationSpeed ?? .12) * 34 * delta;
      applyTransform();
    }
    frame = requestAnimationFrame(render);
  }

  function updatePinch() {
    if (pointers.size !== 2) {
      previousPinchDistance = 0;
      return;
    }
    const [first, second] = [...pointers.values()];
    const distance = Math.hypot(first.x - second.x, first.y - second.y);
    if (previousPinchDistance) {
      zoom = clamp(zoom + (distance - previousPinchDistance) * .0035, .72, 1.55);
      applyTransform();
      notify();
    }
    previousPinchDistance = distance;
  }

  function onPointerDown(event) {
    container.setPointerCapture?.(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size === 1) {
      activePointer = event.pointerId;
      lastPoint = { x: event.clientX, y: event.clientY };
    }
    automaticRotation = false;
    container.classList.add('is-dragging');
    notify();
  }

  function onPointerMove(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    updatePinch();
    if (pointers.size !== 1 || event.pointerId !== activePointer || !lastPoint) return;
    const deltaX = event.clientX - lastPoint.x;
    const deltaY = event.clientY - lastPoint.y;
    if (event.shiftKey) roll += deltaX * .45;
    else {
      yaw += deltaX * .52;
      pitch = clamp(pitch - deltaY * .45, -85, 85);
    }
    lastPoint = { x: event.clientX, y: event.clientY };
    applyTransform();
    notify();
  }

  function releasePointer(event) {
    pointers.delete(event.pointerId);
    if (event.pointerId === activePointer) {
      activePointer = null;
      lastPoint = null;
    }
    if (!pointers.size) container.classList.remove('is-dragging');
    updatePinch();
  }

  function onDoubleClick(event) {
    event.preventDefault();
    resetView();
    notify();
  }

  function onWheel(event) {
    event.preventDefault();
    zoom = clamp(zoom - event.deltaY * .0012, .72, 1.55);
    applyTransform();
    notify();
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', releasePointer);
  container.addEventListener('pointercancel', releasePointer);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('dblclick', onDoubleClick);
  frame = requestAnimationFrame(render);

  function resetView() {
    pitch = planet?.viewer?.fallbackPitch ?? -12;
    yaw = planet?.viewer?.fallbackYaw ?? 22;
    roll = planet?.viewer?.fallbackRoll ?? 0;
    zoom = 1;
    automaticRotation = true;
    applyTransform();
  }

  return {
    setPlanet(nextPlanet) {
      planet = nextPlanet;
      orb.className = `planet-thumbnail planet-thumbnail--${nextPlanet.id}`;
      orb.innerHTML = '<span class="planet-thumbnail-ring"></span>';
      resetView();
    },
    zoomIn() {
      zoom = clamp(zoom + .12, .72, 1.55);
      applyTransform();
      notify();
    },
    zoomOut() {
      zoom = clamp(zoom - .12, .72, 1.55);
      applyTransform();
      notify();
    },
    reset: resetView,
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
      disposed = true;
      cancelAnimationFrame(frame);
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', releasePointer);
      container.removeEventListener('pointercancel', releasePointer);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('dblclick', onDoubleClick);
    }
  };
}
