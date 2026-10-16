import { appStore } from '../../store/app-store.js';

export const VISUALIZER_MODES = ['bars', 'orbit', 'wave', 'black-hole', 'constellation'];

function energyAt(data, index, count, fallback) {
  if (!data?.length) return fallback;
  return data[Math.min(data.length - 1, Math.floor(index / count * data.length))] / 255;
}

function drawBars(ctx, w, h, data, playing, time, compact) {
  const count = compact ? 28 : 70;
  const gap = Math.max(2, w / count * .22);
  const barWidth = Math.max(2, (w - gap * (count - 1)) / count);
  for (let i = 0; i < count; i += 1) {
    const idle = .12 + Math.sin(time * .002 + i * .55) * .05;
    const e = playing ? energyAt(data, i, count, idle) : idle * .45;
    const height = Math.max(2, h * (.08 + e * .78));
    const x = i * (barWidth + gap);
    const y = h - height;
    const gradient = ctx.createLinearGradient(0, y, 0, h);
    gradient.addColorStop(0, `hsla(${200 + i / count * 105},95%,72%,.96)`);
    gradient.addColorStop(1, 'rgba(232,121,249,.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, height);
  }
}

function drawOrbit(ctx, w, h, data, playing, time, compact) {
  const cx = w / 2, cy = h / 2;
  const radius = Math.min(w, h) * (compact ? .18 : .22);
  const bars = compact ? 34 : 72;
  for (let i = 0; i < bars; i += 1) {
    const angle = i / bars * Math.PI * 2 - Math.PI / 2;
    const idle = .11 + Math.sin(time * .0016 + i * .42) * .035;
    const e = playing ? energyAt(data, i, bars, idle) : idle * .35;
    const inner = radius;
    const length = radius * (.15 + e * .9);
    ctx.strokeStyle = `hsla(${205 + i / bars * 105},92%,72%,${.3 + e * .7})`;
    ctx.lineWidth = compact ? 1.2 : Math.max(1.2, w / 520);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * (inner + length), cy + Math.sin(angle) * (inner + length));
    ctx.stroke();
  }
  const core = ctx.createRadialGradient(cx - radius * .3, cy - radius * .35, 0, cx, cy, radius);
  core.addColorStop(0, 'rgba(255,255,255,.96)');
  core.addColorStop(.18, 'rgba(232,121,249,.94)');
  core.addColorStop(.55, 'rgba(99,102,241,.84)');
  core.addColorStop(1, 'rgba(15,23,55,.96)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (playing ? 1 + Math.sin(time * .005) * .025 : 1), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,180,254,.5)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * 1.6, radius * .38, -.2, 0, Math.PI * 2);
  ctx.stroke();
}

function drawWave(ctx, w, h, data, playing, time, compact) {
  const lines = compact ? 2 : 4;
  for (let line = 0; line < lines; line += 1) {
    ctx.beginPath();
    const hue = 205 + line * 28;
    ctx.strokeStyle = `hsla(${hue},95%,72%,${.85 - line * .13})`;
    ctx.lineWidth = compact ? 1.5 : 2.2;
    const points = compact ? 48 : 120;
    for (let i = 0; i <= points; i += 1) {
      const x = i / points * w;
      const idle = .11 + Math.sin(time * .002 + i * .32 + line) * .04;
      const e = playing ? energyAt(data, i, points, idle) : idle * .35;
      const y = h / 2 + Math.sin(i * .28 + time * .002 + line * .8) * h * (.07 + e * .26) + (line - (lines - 1) / 2) * h * .07;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawBlackHole(ctx, w, h, data, playing, time, compact) {
  const cx = w / 2;
  const cy = h / 2;
  const bass = playing ? energyAt(data, 2, 20, .18) : .08;
  const mid = playing ? energyAt(data, 8, 20, .14) : .07;
  const radius = Math.min(w, h) * (compact ? .115 : .15) * (1 + bass * .2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-.18 + Math.sin(time * .00022) * .035);

  const halo = ctx.createRadialGradient(0, 0, radius * .75, 0, 0, radius * 3.2);
  halo.addColorStop(0, 'rgba(0,0,0,0)');
  halo.addColorStop(.24, 'rgba(168,85,247,.2)');
  halo.addColorStop(.48, 'rgba(56,189,248,.14)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 3.2, radius * 1.18, 0, 0, Math.PI * 2);
  ctx.fill();

  const rings = compact ? 10 : 22;
  for (let i = rings - 1; i >= 0; i -= 1) {
    const phase = time * (.00026 + i * .000004);
    const e = playing ? energyAt(data, i, rings, .12) : .065;
    const outer = radius * (1.25 + i * .085);
    const thickness = compact ? 1.1 : 1.2 + e * 3.2;
    const hue = 278 - i * 2.5 + Math.sin(phase + i) * 12;
    ctx.strokeStyle = `hsla(${hue},96%,${57 + i * .65}%,${.12 + e * .7})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.ellipse(0, 0, outer, outer * (.24 + i * .004), phase + i * .035, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'lighter';
  for (let side = -1; side <= 1; side += 2) {
    const flare = ctx.createLinearGradient(0, 0, side * radius * 3, 0);
    flare.addColorStop(0, 'rgba(255,255,255,.8)');
    flare.addColorStop(.16, 'rgba(232,121,249,.72)');
    flare.addColorStop(.56, 'rgba(59,130,246,.3)');
    flare.addColorStop(1, 'rgba(59,130,246,0)');
    ctx.strokeStyle = flare;
    ctx.lineWidth = compact ? 2 : 3 + mid * 4;
    ctx.beginPath();
    ctx.moveTo(side * radius * .85, 0);
    ctx.quadraticCurveTo(side * radius * 1.75, side * radius * .18, side * radius * 3.1, 0);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';

  const lens = ctx.createRadialGradient(0, -radius * .1, radius * .15, 0, 0, radius * 1.35);
  lens.addColorStop(0, 'rgba(0,0,0,1)');
  lens.addColorStop(.68, 'rgba(0,0,0,1)');
  lens.addColorStop(.82, 'rgba(17,24,39,.98)');
  lens.addColorStop(.93, 'rgba(216,180,254,.75)');
  lens.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(0, 0, radius * .92, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConstellation(ctx, w, h, data, playing, time, compact) {
  const count = compact ? 22 : 58;
  const points = [];
  const pulse = time * .001;

  for (let i = 0; i < count; i += 1) {
    const e = playing ? energyAt(data, i, count, .16) : .075;
    const seedX = ((i * 137.508 + 17) % 997) / 997;
    const seedY = ((i * 73.331 + 41) % 991) / 991;
    const drift = compact ? 2.5 : 6;
    const x = w * (.06 + seedX * .88) + Math.cos(pulse * .38 + i * 1.7) * drift * (1 + e);
    const y = h * (.08 + seedY * .84) + Math.sin(pulse * .46 + i * 1.23) * drift * (1 + e);
    points.push({ x, y, e, twinkle: .55 + .45 * Math.sin(pulse * 2 + i * 2.1) });
  }

  const maxDistance = Math.min(w, h) * (compact ? .34 : .27);
  ctx.lineWidth = compact ? .8 : 1.25;
  for (let i = 0; i < points.length; i += 1) {
    const distances = [];
    for (let j = i + 1; j < points.length; j += 1) {
      const dx = points[j].x - points[i].x;
      const dy = points[j].y - points[i].y;
      const distance = Math.hypot(dx, dy);
      if (distance < maxDistance) distances.push({ j, distance });
    }
    distances.sort((a, b) => a.distance - b.distance);
    for (const connection of distances.slice(0, compact ? 1 : 2)) {
      const other = points[connection.j];
      const strength = 1 - connection.distance / maxDistance;
      const energy = (points[i].e + other.e) * .5;
      const gradient = ctx.createLinearGradient(points[i].x, points[i].y, other.x, other.y);
      gradient.addColorStop(0, `rgba(125,211,252,${.1 + strength * .42 + energy * .18})`);
      gradient.addColorStop(.5, `rgba(196,181,253,${.14 + strength * .5})`);
      gradient.addColorStop(1, `rgba(232,121,249,${.08 + strength * .34})`);
      ctx.strokeStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(other.x, other.y);
      ctx.stroke();
    }
  }

  for (let i = 0; i < points.length; i += 1) {
    const point = points[i];
    const size = (compact ? 1.15 : 1.65) + point.e * (compact ? 2.1 : 3.8);
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, size * 4.5);
    const hue = i % 5 === 0 ? '232,121,249' : i % 3 === 0 ? '125,211,252' : '255,255,255';
    glow.addColorStop(0, `rgba(${hue},${.92 * point.twinkle})`);
    glow.addColorStop(.22, `rgba(${hue},${.62 * point.twinkle})`);
    glow.addColorStop(1, `rgba(${hue},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size * 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${.72 + point.twinkle * .28})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function createMusicVisualizer(canvas, player, options = {}) {
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let frame = 0;
  let running = true;
  let snapshot = player.getState();
  let frequencyData = null;
  let mode = options.mode || appStore.getState().musicVisualizer || 'orbit';
  const compact = Boolean(options.compact);

  const unsubscribe = player.subscribe((state) => { snapshot = state; });
  const unsubscribeStore = appStore.subscribe((state) => { mode = state.musicVisualizer || 'orbit'; });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.4 : 2);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  }

  function draw(time) {
    if (!running) return;
    resize();
    const w=canvas.width,h=canvas.height;
    context.clearRect(0,0,w,h);
    const analyser=player.getAnalyser();
    if(analyser){ if(!frequencyData||frequencyData.length!==analyser.frequencyBinCount)frequencyData=new Uint8Array(analyser.frequencyBinCount); analyser.getByteFrequencyData(frequencyData); }
    if(mode!=='black-hole' && mode!=='constellation') {
      const glow=context.createRadialGradient(w/2,h/2,0,w/2,h/2,Math.max(w,h)*.7);
      glow.addColorStop(0,'rgba(124,58,237,.12)');glow.addColorStop(1,'rgba(2,5,16,0)');context.fillStyle=glow;context.fillRect(0,0,w,h);
    } else if (mode==='constellation') {
      const sky=context.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,'rgba(3,7,25,.8)');
      sky.addColorStop(1,'rgba(13,7,35,.72)');
      context.fillStyle=sky;context.fillRect(0,0,w,h);
    }
    if(mode==='bars') drawBars(context,w,h,frequencyData,snapshot.isPlaying,time,compact);
    else if(mode==='wave') drawWave(context,w,h,frequencyData,snapshot.isPlaying,time,compact);
    else if(mode==='black-hole') drawBlackHole(context,w,h,frequencyData,snapshot.isPlaying,time,compact);
    else if(mode==='constellation') drawConstellation(context,w,h,frequencyData,snapshot.isPlaying,time,compact);
    else drawOrbit(context,w,h,frequencyData,snapshot.isPlaying,time,compact);
    if(!reducedMotion) frame=requestAnimationFrame(draw);
  }

  const observer=new ResizeObserver(resize);observer.observe(canvas);resize();draw(performance.now());
  return()=>{running=false;cancelAnimationFrame(frame);observer.disconnect();unsubscribe();unsubscribeStore();};
}
