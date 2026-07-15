'use client';
import { useEffect, useRef } from 'react';
import type { ClipPhase } from '@/lib/companions';
import { SmokePlume, SmokeThread, fitCanvas, vnoise } from '@/lib/smoke';

// The built-in scene: one big cigarette burning down in real time — the
// cigarette IS the session progress. It can lie flat or stand upright, a
// companion can smoke along off to the side, and a double-tap taps the ash.

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

interface Flake { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; a: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number }

// Night backdrop: gradient sky falling into two soft noise ridges of a far
// city, its lights scattered as bokeh dots rather than traced buildings.
function buildBackdrop(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#04050b');
  sky.addColorStop(0.55, '#080a13');
  sky.addColorStop(0.8, '#0d0c10');
  sky.addColorStop(1, '#030304');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // warm haze where the far city glows against the sky
  const horizon = h * 0.85;
  const haze = ctx.createLinearGradient(0, horizon - h * 0.09, 0, horizon + h * 0.03);
  haze.addColorStop(0, 'rgba(255,150,70,0)');
  haze.addColorStop(0.75, 'rgba(255,150,70,0.05)');
  haze.addColorStop(1, 'rgba(255,150,70,0.02)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - h * 0.09, w, h * 0.12);

  // two ridges with smooth noise tops, low contrast against the sky
  const ridges: Array<[number, number, string, string, number]> = [
    [h * 0.855, h * 0.028, 'rgba(11,13,22,0.9)', 'rgba(5,6,11,0.9)', 3.1],
    [h * 0.895, h * 0.04, '#050610', '#020205', 7.7],
  ];
  for (const [base, amp, top, bottom, seed] of ridges) {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) {
      ctx.lineTo(x, base - vnoise(x * 0.0038 + seed * 10, seed) * amp);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fill();
  }

  // the city as scattered lights, warm with a few cool ones
  for (let i = 0; i < 64; i++) {
    const lx = rnd(i * 13) * w;
    const ly = h * (0.862 + rnd(i * 13 + 5) * 0.085);
    const warm = rnd(i * 13 + 9) > 0.22;
    const a = 0.04 + rnd(i * 13 + 2) * 0.16;
    const r = 0.6 + rnd(i * 13 + 7) * 1.3;
    ctx.fillStyle = warm ? `rgba(255,190,115,${a})` : `rgba(150,180,250,${a * 0.8})`;
    ctx.beginPath();
    ctx.arc(lx, ly, r, 0, Math.PI * 2);
    ctx.fill();
    if (rnd(i * 13 + 3) > 0.86) { // a few lights bloom softly
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 7);
      g.addColorStop(0, `rgba(255,190,115,${a * 0.5})`);
      g.addColorStop(1, 'rgba(255,190,115,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(lx, ly, r * 7, 0, Math.PI * 2); ctx.fill();
    }
  }
  return c;
}

const ease = (a: number, b: number, u: number) => {
  const k = u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
  return a + (b - a) * k;
};

export default function CanvasScene({ phase, scene, progress = 0, orient = 'h', bud = false }:
  { phase: ClipPhase; scene: string; progress?: number; orient?: 'h' | 'v'; bud?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const phaseStartTRef = useRef(0);
  const tRef = useRef(0);
  const progressRef = useRef(progress);
  // orientation/companion live in refs so toggling them never restarts the
  // scene (a full re-init used to flash the whole canvas)
  const orientRef = useRef(orient);
  const budRef = useRef(bud);

  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseStartTRef.current = tRef.current;
    }
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { orientRef.current = orient; }, [orient]);
  useEffect(() => { budRef.current = bud; }, [bud]);

  const rainy = /rain/i.test(scene);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    // cap DPR at 1.5: a full-retina buffer makes heavy smoke frames stutter
    let { w, h } = fitCanvas(canvas, ctx, 1.5);
    let backdrop = buildBackdrop(w, h);
    // smoke renders at half resolution — it's all soft gradients, so the
    // upscale is invisible but the fill cost drops ~4x
    const smokeCv = document.createElement('canvas');
    const sctx = smokeCv.getContext('2d')!;
    const fitSmoke = () => {
      smokeCv.width = Math.ceil(w / 2);
      smokeCv.height = Math.ceil(h / 2);
    };
    fitSmoke();
    const onResize = () => {
      ({ w, h } = fitCanvas(canvas, ctx, 1.5));
      backdrop = buildBackdrop(w, h);
      fitSmoke();
    };
    addEventListener('resize', onResize);

    const drops = rainy
      ? Array.from({ length: 110 }, (_, i) => ({
          x: rnd(i * 7) * 1.1,
          y: rnd(i * 7 + 3),
          len: 9 + rnd(i * 7 + 5) * 13,
          speed: 0.55 + rnd(i * 7 + 9) * 0.5,
        }))
      : [];

    const plume = new SmokePlume({ maxParticles: 240, rise: 30, drift: 10, peak: 0.18 });
    const thread = new SmokeThread({ rise: 50, turb: 1, peak: 0.4, length: 96 });
    const budPlume = new SmokePlume({ maxParticles: 90, rise: 26, drift: -16, peak: 0.12 });
    const flakes: Flake[] = [];
    const sparks: Spark[] = [];
    let ashLen = 6;
    let raf = 0;
    let last = performance.now();

    // ---- double-tap anywhere near the cigarette to tap the ash off ----
    const geom = { x0: 0, y0: 0, x1: 0, y1: 0, thick: 30 };
    let dropAsh = false;
    let lastTapT = 0, lastTapX = 0, lastTapY = 0;
    const onPointerDown = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastTapT < 400 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 90) {
        const { x0, y0, x1, y1, thick } = geom;
        const dx = x1 - x0, dy = y1 - y0;
        const len2 = dx * dx + dy * dy || 1;
        const u = Math.max(0, Math.min(1, ((e.clientX - x0) * dx + (e.clientY - y0) * dy) / len2));
        const px = x0 + u * dx, py = y0 + u * dy;
        if (Math.hypot(e.clientX - px, e.clientY - py) < Math.max(90, thick * 3)) dropAsh = true;
        lastTapT = 0;
        return;
      }
      lastTapT = now; lastTapX = e.clientX; lastTapY = e.clientY;
    };
    canvas.addEventListener('pointerdown', onPointerDown);

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      tRef.current += dt;
      const t = tRef.current;
      const ph = phaseRef.current;
      const sincePhase = t - phaseStartTRef.current;
      const p = Math.min(1, Math.max(0, progressRef.current));

      ctx.drawImage(backdrop, 0, 0);

      // cinematic grade: cool wash from above, warm backlight behind center
      const cool = ctx.createLinearGradient(0, 0, 0, h * 0.5);
      cool.addColorStop(0, 'rgba(88,118,190,0.05)');
      cool.addColorStop(1, 'rgba(88,118,190,0)');
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, w, h * 0.5);
      const back = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, Math.min(w, h) * 0.6);
      back.addColorStop(0, 'rgba(255,132,60,0.05)');
      back.addColorStop(0.6, 'rgba(255,132,60,0.018)');
      back.addColorStop(1, 'rgba(255,132,60,0)');
      ctx.fillStyle = back;
      ctx.fillRect(0, 0, w, h);

      if (!rainy) {
        // sparse stars, three sizes
        for (let i = 0; i < 30; i++) {
          const sx = rnd(i * 3) * w;
          const sy = rnd(i * 3 + 1) * h * 0.42;
          const tw = 0.04 + 0.1 * Math.abs(Math.sin(t * (0.25 + rnd(i) * 0.4) + i));
          const sr = rnd(i * 3 + 2) > 0.85 ? 1.1 : 0.7;
          ctx.fillStyle = `rgba(212,222,242,${tw})`;
          ctx.beginPath(); ctx.arc(sx, sy, sr, 0, Math.PI * 2); ctx.fill();
        }
        // a clean full moon with a layered halo
        const mx = w * 0.79, my = h * 0.15, mr = 15;
        let g = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 8);
        g.addColorStop(0, 'rgba(200,216,248,0.06)');
        g.addColorStop(1, 'rgba(200,216,248,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mx, my, mr * 8, 0, Math.PI * 2); ctx.fill();
        g = ctx.createRadialGradient(mx, my, 0, mx, my, mr * 2.4);
        g.addColorStop(0, 'rgba(214,226,250,0.18)');
        g.addColorStop(1, 'rgba(214,226,250,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(mx, my, mr * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#dfe7f6';
        ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(176,190,216,0.5)'; // maria, barely
        ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.15, mr * 0.32, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(mx + mr * 0.28, my + mr * 0.3, mr * 0.2, 0, Math.PI * 2); ctx.fill();
      } else {
        const cloud = ctx.createLinearGradient(0, 0, 0, h * 0.42);
        const ca = 0.5 + 0.06 * Math.sin(t * 0.2);
        cloud.addColorStop(0, `rgba(16,19,30,${ca})`);
        cloud.addColorStop(0.65, `rgba(16,19,30,${ca * 0.4})`);
        cloud.addColorStop(1, 'rgba(16,19,30,0)');
        ctx.fillStyle = cloud;
        ctx.fillRect(0, 0, w, h * 0.42);
      }

      // ---- cigarette geometry (local coords: tip at 0, filter at L) ----
      const vertical = orientRef.current === 'v';
      const L = vertical ? Math.min(h * 0.62, 560) : Math.min(w * 0.72, 920);
      const cigH = Math.max(24, Math.min(36, (vertical ? h : w) * 0.026));
      const originX = vertical ? w * 0.5 : (w - L) / 2;
      const originY = vertical ? h * 0.5 - L / 2 : h * 0.54;
      const toWorld = (lx: number, ly: number): [number, number] =>
        vertical ? [originX - ly, originY + lx] : [originX + lx, originY + ly];

      const filterLen = L * 0.22;
      const bandW = Math.max(6, cigH * 0.28);
      const filterX = L - filterLen;
      const burnable = L - filterLen - bandW - 4;
      const emberL = p * burnable;
      const [emberWX, emberWY] = toWorld(emberL, 0);
      [geom.x0, geom.y0] = toWorld(0, 0);
      [geom.x1, geom.y1] = toWorld(L, 0);
      geom.thick = cigH;

      // ember behaviour per phase (an unseen drag every ~9s while looping)
      const cyc = (t % 9) / 9;
      let emberGlow = 0.5 + 0.12 * Math.sin(t * 1.1) + 0.05 * Math.sin(t * 6.3);
      let dragging = false;
      if (ph === 'lightup') {
        const flick = Math.abs(Math.sin(t * 7)) * Math.abs(Math.sin(t * 3.1));
        emberGlow = Math.min(1, sincePhase * 0.3) * (0.6 + 0.4 * flick);
        dragging = true;
      } else if (ph === 'winddown') {
        emberGlow = Math.max(0.08, 0.5 - sincePhase * 0.03);
      } else if (cyc < 0.18) {
        const u = cyc / 0.18;
        emberGlow = 0.55 + 0.45 * Math.sin(u * Math.PI);
        dragging = u > 0.15 && u < 0.9;
      }

      // pool of ember light around the burn front
      const pool = ctx.createRadialGradient(emberWX, emberWY, 4, emberWX, emberWY, cigH * 9);
      pool.addColorStop(0, `rgba(255,120,45,${0.15 * emberGlow + 0.04})`);
      pool.addColorStop(1, 'rgba(255,120,45,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(emberWX - cigH * 9, emberWY - cigH * 9, cigH * 18, cigH * 18);

      // ash growth; a tap (or its own weight) breaks it off
      ashLen += dt * (dragging ? 3.6 : 1.6);
      const maxAsh = cigH * (0.85 + rnd(Math.floor(t / 7)) * 0.65);
      if (ashLen > maxAsh || dropAsh) {
        const n = Math.min(18, 4 + Math.floor(ashLen / 4));
        for (let i = 0; i < n; i++) {
          const alx = emberL - ashLen * (0.15 + Math.random() * 0.75);
          const [fx, fy] = toWorld(alx, (Math.random() - 0.5) * cigH * 0.4);
          flakes.push({
            x: fx, y: fy,
            vx: (Math.random() - 0.5) * (vertical ? 34 : 16),
            vy: 26 + Math.random() * 30,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 3,
            size: 2.5 + Math.random() * (cigH * 0.22),
            a: 0.75,
          });
        }
        ashLen = 3 + Math.random() * 4;
        dropAsh = false;
      }

      // ---- draw the cigarette in local space ----
      ctx.save();
      ctx.translate(originX, originY);
      if (vertical) ctx.rotate(Math.PI / 2);
      const yT = -cigH / 2;

      const ashStart = Math.max(-cigH * 2, emberL - ashLen);
      if (emberL > ashStart) {
        const jit = (ax: number, seed: number) =>
          (Math.sin(ax * 0.55 + seed) * 0.55 + Math.sin(ax * 1.7 + seed * 2.1) * 0.3) * cigH * 0.14;
        ctx.beginPath();
        ctx.moveTo(ashStart, yT + cigH * 0.22 + jit(ashStart, 1));
        for (let ax = ashStart; ax <= emberL; ax += 3) ctx.lineTo(ax, yT + cigH * 0.08 + jit(ax, 1));
        for (let ax = emberL; ax >= ashStart; ax -= 3) ctx.lineTo(ax, yT + cigH * 0.92 + jit(ax, 4.7));
        ctx.closePath();
        const ashGrad = ctx.createLinearGradient(0, yT, 0, yT + cigH);
        ashGrad.addColorStop(0, '#98958d');
        ashGrad.addColorStop(0.45, '#cbc7bd');
        ashGrad.addColorStop(1, '#6e6b64');
        ctx.fillStyle = ashGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(45,42,40,0.45)';
        ctx.lineWidth = 1;
        for (let ax = ashStart + 4; ax < emberL - 2; ax += 6) {
          ctx.beginPath();
          ctx.moveTo(ax, yT + cigH * (0.18 + rnd(Math.floor(ax)) * 0.18));
          ctx.lineTo(ax + 1.5, yT + cigH * (0.66 + rnd(Math.floor(ax) + 9) * 0.18));
          ctx.stroke();
        }
        const ashGlow = ctx.createLinearGradient(emberL - cigH * 0.7, 0, emberL, 0);
        ashGlow.addColorStop(0, 'rgba(255,90,25,0)');
        ashGlow.addColorStop(1, `rgba(255,90,25,${0.3 * emberGlow})`);
        ctx.fillStyle = ashGlow;
        ctx.fillRect(emberL - cigH * 0.7, yT + cigH * 0.1, cigH * 0.7, cigH * 0.8);
      }

      const paperGrad = ctx.createLinearGradient(0, yT, 0, yT + cigH);
      paperGrad.addColorStop(0, '#b9b2a4');
      paperGrad.addColorStop(0.28, '#f4ecdc');
      paperGrad.addColorStop(0.6, '#e8e0cf');
      paperGrad.addColorStop(1, '#948d7f');
      ctx.fillStyle = paperGrad;
      ctx.fillRect(emberL, yT, filterX - bandW - emberL, cigH);
      ctx.strokeStyle = 'rgba(140,130,112,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(emberL + cigH * 0.8, yT + cigH * 0.24);
      ctx.lineTo(filterX - bandW, yT + cigH * 0.24);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(150,118,66,0.5)';
      ctx.lineWidth = 1.4;
      for (const off of [cigH * 0.55, cigH * 0.55 + 4.5]) {
        ctx.beginPath();
        ctx.moveTo(filterX - bandW - off, yT + 1.5);
        ctx.lineTo(filterX - bandW - off, yT + cigH - 1.5);
        ctx.stroke();
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const spill = ctx.createLinearGradient(emberL, 0, emberL + cigH * 2.4, 0);
      spill.addColorStop(0, `rgba(255,110,40,${0.3 * emberGlow})`);
      spill.addColorStop(1, 'rgba(255,110,40,0)');
      ctx.fillStyle = spill;
      ctx.fillRect(emberL, yT + 1.5, cigH * 2.4, cigH - 3);
      ctx.restore();
      const singe = ctx.createLinearGradient(emberL, 0, emberL + cigH * 1.1, 0);
      singe.addColorStop(0, 'rgba(55,28,14,0.9)');
      singe.addColorStop(0.35, 'rgba(115,70,32,0.4)');
      singe.addColorStop(1, 'rgba(115,70,32,0)');
      ctx.fillStyle = singe;
      ctx.fillRect(emberL, yT, cigH * 1.1, cigH);

      ctx.fillStyle = '#b8913f';
      ctx.fillRect(filterX - bandW, yT, bandW, cigH);
      ctx.fillStyle = 'rgba(255,235,180,0.35)';
      ctx.fillRect(filterX - bandW, yT + cigH * 0.26, bandW, 1.5);
      const filtGrad = ctx.createLinearGradient(0, yT, 0, yT + cigH);
      filtGrad.addColorStop(0, '#a97b46');
      filtGrad.addColorStop(0.3, '#d9a86a');
      filtGrad.addColorStop(0.62, '#c99a5e');
      filtGrad.addColorStop(1, '#7e5a33');
      ctx.fillStyle = filtGrad;
      ctx.beginPath();
      ctx.roundRect(filterX, yT, filterLen, cigH, [0, cigH / 2, cigH / 2, 0]);
      ctx.fill();
      ctx.fillStyle = 'rgba(90,60,30,0.35)';
      for (let i = 0; i < 60; i++) {
        const fx = filterX + rnd(i * 11) * (filterLen - 8) + 3;
        const fy = yT + 2 + rnd(i * 11 + 5) * (cigH - 5);
        ctx.fillRect(fx, fy, 1.6, 1.2);
      }

      // burn front: char ring, molten core, breathing glow blobs
      ctx.fillStyle = 'rgba(22,12,8,0.85)';
      ctx.fillRect(emberL - 2.5, yT + 1, 4, cigH - 2);
      ctx.save();
      ctx.shadowColor = 'rgba(255,110,35,0.9)';
      ctx.shadowBlur = 12 + 22 * emberGlow;
      ctx.fillStyle = `rgba(150,35,8,${0.75 * emberGlow + 0.1})`;
      ctx.beginPath();
      ctx.roundRect(emberL - cigH * 0.34, yT + 1.5, cigH * 0.5, cigH - 3, 3);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 4; k++) {
        const by = yT + cigH * (0.18 + 0.21 * k) + Math.sin(t * 4.6 + k * 2.4) * cigH * 0.05;
        const bx = emberL - cigH * 0.12 + Math.sin(t * 6.8 + k * 1.7) * cigH * 0.07;
        const br = cigH * (0.2 + 0.1 * Math.abs(Math.sin(t * 5.2 + k * 3.1)));
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, `rgba(255,205,120,${0.5 * emberGlow})`);
        g.addColorStop(0.45, `rgba(255,120,35,${0.4 * emberGlow})`);
        g.addColorStop(1, 'rgba(255,60,10,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      ctx.restore(); // back to world space

      // sparks lift off the ember while dragging
      if (dragging && Math.random() < 0.3) {
        sparks.push({
          x: emberWX + (Math.random() - 0.5) * cigH * 0.5,
          y: emberWY + (Math.random() - 0.5) * cigH * 0.5,
          vx: (Math.random() - 0.5) * 26,
          vy: -22 - Math.random() * 30,
          life: 0.5 + Math.random() * 0.5,
        });
      }
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 30 * dt;
        ctx.fillStyle = `rgba(255,170,70,${Math.min(0.8, s.life * 1.4)})`;
        ctx.fillRect(s.x, s.y, 1.6, 1.6);
      }
      ctx.restore();

      // falling ash flakes
      for (let i = flakes.length - 1; i >= 0; i--) {
        const f = flakes[i];
        f.vy += 60 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.rot += f.vr * dt;
        f.a -= dt * 0.55;
        if (f.a <= 0 || f.y > h) { flakes.splice(i, 1); continue; }
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.fillStyle = `rgba(160,156,148,${f.a})`;
        ctx.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2);
        ctx.restore();
      }

      // the companion: a cozy little mascot with an actual face, drawn like
      // a friendly brand illustration — big head, beanie, blush, dot eyes
      if (budRef.current) {
        const gy = h * 0.93;
        const H = Math.min(h * 0.4, 380);
        const bx = w * 0.875;
        const bodyW = H * 0.36, bodyH = H * 0.46;
        const bodyTop = gy - H * 0.04 - bodyH;
        const bodyCX = bx, bodyCY = bodyTop + bodyH * 0.55;
        const headR = H * 0.16;
        const hy = bodyTop - headR * 0.62;
        const outline = '#0f0e13';
        const lw = Math.max(2, H * 0.013);
        // he faces left, toward you and the big cigarette
        const mouth = { x: bx - headR * 0.55, y: hy + headR * 0.3 };
        const rest = { x: bx - bodyW * 0.6, y: bodyCY + bodyH * 0.1 };
        let hand = { ...rest };
        let budGlow = 0.4 + 0.1 * Math.sin(t * 0.8 + 2);
        const bcyc = ((t + 4) % 11) / 11;
        const puffing = bcyc >= 0.09 && bcyc < 0.24;
        const exhaling = bcyc >= 0.33 && bcyc < 0.5;
        if (bcyc < 0.09) {
          const u = bcyc / 0.09;
          hand = { x: ease(rest.x, mouth.x, u), y: ease(rest.y, mouth.y, u) };
        } else if (puffing) {
          hand = mouth;
          budGlow = 0.5 + 0.5 * Math.sin(((bcyc - 0.09) / 0.15) * Math.PI);
        } else if (bcyc < 0.33) {
          const u = (bcyc - 0.24) / 0.09;
          hand = { x: ease(mouth.x, rest.x, u), y: ease(mouth.y, rest.y, u) };
        } else if (exhaling && Math.random() < 0.5) {
          budPlume.emit(mouth.x - 6, mouth.y - 2, 1, t, -38, -4);
        }

        // ground shadow
        const shadow = ctx.createRadialGradient(bx, gy + 4, 0, bx, gy + 4, H * 0.24);
        shadow.addColorStop(0, 'rgba(0,0,0,0.45)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.ellipse(bx, gy + 4, H * 0.24, H * 0.035, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = lw;
        ctx.strokeStyle = outline;
        ctx.lineCap = 'round';

        // little legs + cream sneakers
        ctx.fillStyle = '#23222b';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.roundRect(bx + s * bodyW * 0.16 - H * 0.038, gy - H * 0.1, H * 0.076, H * 0.09, H * 0.02);
          ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = '#ddd3c2';
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(bx + s * bodyW * 0.16 - H * 0.006, gy - H * 0.012, H * 0.055, H * 0.024, 0, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }

        // round cozy sweater body
        const sweater = ctx.createLinearGradient(bx - bodyW * 0.5, 0, bx + bodyW * 0.5, 0);
        sweater.addColorStop(0, '#c08a52');
        sweater.addColorStop(1, '#8f6337');
        ctx.fillStyle = sweater;
        ctx.beginPath();
        ctx.ellipse(bodyCX, bodyCY, bodyW * 0.5, bodyH * 0.52, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
        // ribbed hem
        ctx.strokeStyle = 'rgba(15,14,19,0.35)';
        ctx.beginPath();
        ctx.moveTo(bx - bodyW * 0.34, bodyCY + bodyH * 0.34);
        ctx.quadraticCurveTo(bx, bodyCY + bodyH * 0.46, bx + bodyW * 0.34, bodyCY + bodyH * 0.34);
        ctx.stroke();
        ctx.strokeStyle = outline;

        // head
        const face = ctx.createLinearGradient(bx - headR, 0, bx + headR, 0);
        face.addColorStop(0, '#f0d6b2');
        face.addColorStop(1, '#d9b98f');
        ctx.fillStyle = face;
        ctx.beginPath();
        ctx.arc(bx, hy, headR, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // rust beanie with a pom, sitting low
        ctx.fillStyle = '#b85c38';
        ctx.beginPath();
        ctx.arc(bx, hy - headR * 0.02, headR * 1.04, Math.PI * 1.02, Math.PI * 1.98);
        ctx.quadraticCurveTo(bx + headR * 1.05, hy - headR * 0.5, bx + headR * 0.98, hy - headR * 0.28);
        ctx.lineTo(bx - headR * 0.98, hy - headR * 0.28);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#c96f47'; // band
        ctx.beginPath();
        ctx.roundRect(bx - headR * 1.02, hy - headR * 0.42, headR * 2.04, headR * 0.22, headR * 0.1);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#e8e1d3'; // pom
        ctx.beginPath();
        ctx.arc(bx + headR * 0.1, hy - headR * 1.12, headR * 0.22, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // face: blink every few seconds, eyes closed while puffing
        const blinking = (t % 4.3) < 0.12 || puffing;
        ctx.fillStyle = outline;
        ctx.lineWidth = Math.max(1.6, lw * 0.9);
        for (const ex of [bx - headR * 0.52, bx - headR * 0.05]) {
          if (blinking) {
            ctx.beginPath();
            ctx.arc(ex, hy + headR * 0.06, headR * 0.1, Math.PI * 0.15, Math.PI * 0.85);
            ctx.stroke();
          } else {
            ctx.beginPath();
            ctx.arc(ex, hy + headR * 0.04, headR * 0.075, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        // blush
        ctx.fillStyle = 'rgba(226,110,80,0.3)';
        ctx.beginPath();
        ctx.ellipse(bx - headR * 0.62, hy + headR * 0.36, headR * 0.14, headR * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(bx + headR * 0.28, hy + headR * 0.36, headR * 0.14, headR * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
        // mouth: little 'o' while exhaling, soft smile otherwise
        ctx.strokeStyle = outline;
        if (exhaling) {
          ctx.beginPath();
          ctx.arc(mouth.x + headR * 0.12, mouth.y, headR * 0.09, 0, Math.PI * 2);
          ctx.stroke();
        } else if (!puffing) {
          ctx.beginPath();
          ctx.arc(mouth.x + headR * 0.16, mouth.y - headR * 0.06, headR * 0.14, Math.PI * 0.2, Math.PI * 0.8);
          ctx.stroke();
        }

        // smoking arm: sweater sleeve out to a little mitt of a hand
        ctx.strokeStyle = '#a5713f';
        ctx.lineWidth = H * 0.055;
        ctx.beginPath();
        ctx.moveTo(bx - bodyW * 0.3, bodyCY - bodyH * 0.18);
        ctx.quadraticCurveTo(bx - bodyW * 0.62, (bodyCY + hand.y) / 2, hand.x, hand.y);
        ctx.stroke();
        ctx.fillStyle = '#f0d6b2';
        ctx.strokeStyle = outline;
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.arc(hand.x, hand.y, H * 0.03, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // his little cigarette + ember
        const btip = { x: hand.x - H * 0.055, y: hand.y - H * 0.01 };
        ctx.strokeStyle = 'rgba(238,231,217,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(hand.x - H * 0.018, hand.y - H * 0.004); ctx.lineTo(btip.x, btip.y); ctx.stroke();
        ctx.fillStyle = `rgba(255,118,44,${Math.min(1, budGlow + 0.2)})`;
        ctx.shadowColor = '#ff7628';
        ctx.shadowBlur = 6 + 14 * budGlow;
        ctx.beginPath(); ctx.arc(btip.x, btip.y, 2.2 + budGlow, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (Math.random() < 0.12) budPlume.emit(btip.x, btip.y - 3, 1, t);
      }
      budPlume.step(dt, t);

      // smoke: laminar thread off the ember, torn by noise, handed to the
      // sprite plume — two puffs per hand-off for a fuller billow
      const intensity = ph === 'winddown'
        ? Math.max(0.25, 1 - sincePhase * 0.06)
        : dragging ? 1.4 : 1;
      const tail = thread.update(dt, t, emberWX, emberWY - cigH * 0.5 - 2, intensity);
      if (tail) {
        plume.emit(tail.x, tail.y, 1, t, tail.vx * 0.6, -12);
        if (Math.random() < 0.5 * intensity) {
          plume.emit(tail.x + (Math.random() - 0.5) * 14, tail.y - 6, 1, t, tail.vx * 0.4, -8);
        }
      }
      plume.step(dt, t);
      sctx.setTransform(1, 0, 0, 1, 0, 0);
      sctx.clearRect(0, 0, smokeCv.width, smokeCv.height);
      sctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
      thread.draw(sctx, dragging ? emberGlow : emberGlow * 0.3);
      plume.draw(sctx);
      budPlume.draw(sctx);
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(smokeCv, 0, 0, w, h);
      ctx.globalCompositeOperation = 'source-over';

      // drifting foreground bokeh, almost subliminal
      for (let i = 0; i < 4; i++) {
        const ox = ((rnd(i * 31) * w) + Math.sin(t * 0.05 + rnd(i * 31 + 5) * 6) * 40 + w) % w;
        const oy = (0.25 + rnd(i * 31 + 7) * 0.6) * h + Math.cos(t * 0.04 + i * 2) * 26;
        const or = 46 + rnd(i * 31 + 3) * 90;
        const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
        const col = i % 2 === 0 ? '255,170,90' : '140,170,240';
        g.addColorStop(0, `rgba(${col},0.028)`);
        g.addColorStop(1, `rgba(${col},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(ox, oy, or, 0, Math.PI * 2); ctx.fill();
      }

      if (rainy) {
        ctx.strokeStyle = 'rgba(168,188,222,0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (const d of drops) {
          d.y += d.speed * dt;
          if (d.y > 0.9) { d.y = -0.05; d.x = Math.random() * 1.1; }
          const dx = d.x * w, dy = d.y * h;
          ctx.moveTo(dx, dy);
          ctx.lineTo(dx - 3, dy + d.len);
        }
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
    };
  }, [rainy]);

  return <canvas ref={ref} data-testid="canvas-scene" aria-label={scene}
    style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', touchAction: 'manipulation' }} />;
}
