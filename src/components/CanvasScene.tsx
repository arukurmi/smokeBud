'use client';
import { useEffect, useRef } from 'react';
import type { ClipPhase } from '@/lib/companions';
import { SmokePlume, fitCanvas } from '@/lib/smoke';

// The built-in scene: one big cigarette burning down in real time — the
// cigarette IS the session progress. It can lie flat or stand upright, a
// quiet bud can smoke along off to the side, and a double-tap taps the ash.

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

interface Flake { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; a: number }
interface Spark { x: number; y: number; vx: number; vy: number; life: number }

function buildSkyline(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#04050b');
  sky.addColorStop(0.6, '#090b14');
  sky.addColorStop(0.85, '#100d0b');
  sky.addColorStop(1, '#040407');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const horizon = h * 0.93;
  const haze = ctx.createLinearGradient(0, horizon - h * 0.08, 0, horizon);
  haze.addColorStop(0, 'rgba(255,160,80,0)');
  haze.addColorStop(1, 'rgba(255,160,80,0.045)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - h * 0.08, w, h * 0.08);

  ctx.fillStyle = '#040510';
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 46 + rnd(i) * 80;
    const bh = h * (0.015 + rnd(i + 40) * 0.045);
    ctx.fillRect(x, horizon - bh, bw + 4, bh + h * 0.07);
    for (let k = 0; k < 3; k++) {
      const seed = i * 17.3 + k * 5.1;
      if (rnd(seed) > 0.78) {
        ctx.fillStyle = `rgba(255,196,120,${0.05 + rnd(seed + 1) * 0.08})`;
        ctx.fillRect(x + 6 + rnd(seed + 2) * (bw - 12), horizon - bh + 4 + rnd(seed + 3) * Math.max(2, bh - 8), 2.5, 3.5);
        ctx.fillStyle = '#040510';
      }
    }
    x += bw + 6;
    i++;
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

  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseStartTRef.current = tRef.current;
    }
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => { progressRef.current = progress; }, [progress]);

  const rainy = /rain/i.test(scene);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let { w, h } = fitCanvas(canvas, ctx);
    let skyline = buildSkyline(w, h);
    const onResize = () => {
      ({ w, h } = fitCanvas(canvas, ctx));
      skyline = buildSkyline(w, h);
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

    const plume = new SmokePlume({ maxParticles: 460, rise: 50, drift: 8, peak: 0.085 });
    const budPlume = bud ? new SmokePlume({ maxParticles: 130, rise: 30, drift: 26, peak: 0.08 }) : null;
    const flakes: Flake[] = [];
    const sparks: Spark[] = [];
    let ashLen = 6;
    let raf = 0;
    let last = performance.now();

    // ---- double-tap anywhere near the cigarette to tap the ash off ----
    const geom = { x0: 0, y0: 0, x1: 0, y1: 0, thick: 30 }; // world-space axis segment
    let dropAsh = false;
    let lastTapT = 0, lastTapX = 0, lastTapY = 0;
    const onPointerDown = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastTapT < 400 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 90) {
        // distance from tap to the cigarette's axis segment
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

      ctx.drawImage(skyline, 0, 0);

      if (!rainy) {
        for (let i = 0; i < 42; i++) {
          const sx = rnd(i * 3) * w;
          const sy = rnd(i * 3 + 1) * h * 0.45;
          const tw = 0.05 + 0.14 * Math.abs(Math.sin(t * (0.3 + rnd(i) * 0.5) + i));
          ctx.fillStyle = `rgba(210,220,240,${tw})`;
          ctx.fillRect(sx, sy, 1.4, 1.4);
        }
        const mx = w * 0.84, my = h * 0.14;
        ctx.save();
        ctx.fillStyle = 'rgba(222,229,244,0.85)';
        ctx.shadowColor = 'rgba(200,215,245,0.55)';
        ctx.shadowBlur = 46;
        ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(9,11,20,0.92)';
        ctx.beginPath(); ctx.arc(mx - 11, my - 6, 19, 0, Math.PI * 2); ctx.fill();
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
      const vertical = orient === 'v';
      const L = vertical ? Math.min(h * 0.62, 560) : Math.min(w * 0.72, 920);
      const cigH = Math.max(24, Math.min(36, (vertical ? h : w) * 0.026));
      const originX = vertical ? w * 0.5 : (w - L) / 2;
      const originY = vertical ? h * 0.5 - L / 2 : h * 0.54;
      // local (lx,ly) → world
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
      ashLen += dt * (dragging ? 6 : 2.4);
      const maxAsh = cigH * (1.6 + rnd(Math.floor(t / 7)) * 1.2);
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
      if (vertical) {
        ctx.translate(originX, originY);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(originX, originY);
      }
      const yT = -cigH / 2;

      // ash: ragged gray tail clinging behind the ember, smooth crinkle
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
        // faint inner glow where ash meets the ember
        const ashGlow = ctx.createLinearGradient(emberL - cigH * 0.7, 0, emberL, 0);
        ashGlow.addColorStop(0, 'rgba(255,90,25,0)');
        ashGlow.addColorStop(1, `rgba(255,90,25,${0.3 * emberGlow})`);
        ctx.fillStyle = ashGlow;
        ctx.fillRect(emberL - cigH * 0.7, yT + cigH * 0.1, cigH * 0.7, cigH * 0.8);
      }

      // paper with cylinder shading
      const paperGrad = ctx.createLinearGradient(0, yT, 0, yT + cigH);
      paperGrad.addColorStop(0, '#b9b2a4');
      paperGrad.addColorStop(0.28, '#f4ecdc');
      paperGrad.addColorStop(0.6, '#e8e0cf');
      paperGrad.addColorStop(1, '#948d7f');
      ctx.fillStyle = paperGrad;
      ctx.fillRect(emberL, yT, filterX - bandW - emberL, cigH);
      // singe creeping ahead of the ember
      const singe = ctx.createLinearGradient(emberL, 0, emberL + cigH * 1.1, 0);
      singe.addColorStop(0, 'rgba(55,28,14,0.9)');
      singe.addColorStop(0.35, 'rgba(115,70,32,0.4)');
      singe.addColorStop(1, 'rgba(115,70,32,0)');
      ctx.fillStyle = singe;
      ctx.fillRect(emberL, yT, cigH * 1.1, cigH);

      // gold band + cork filter
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

      // ---- the burn front, rebuilt: char ring, molten core, glow blobs ----
      // charred ring right at the ash boundary
      ctx.fillStyle = 'rgba(22,12,8,0.85)';
      ctx.fillRect(emberL - 2.5, yT + 1, 4, cigH - 2);
      // soft outer glow behind the front
      ctx.save();
      ctx.shadowColor = 'rgba(255,110,35,0.9)';
      ctx.shadowBlur = 16 + 38 * emberGlow;
      ctx.fillStyle = `rgba(150,35,8,${0.75 * emberGlow + 0.1})`;
      ctx.beginPath();
      ctx.roundRect(emberL - cigH * 0.34, yT + 1.5, cigH * 0.5, cigH - 3, 3);
      ctx.fill();
      ctx.restore();
      // molten blobs breathing across the thickness, additive
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

      // the bud: someone smoking along, angled away like in a smoke room
      if (bud && budPlume) {
        const gy = h * 0.94;
        const H = Math.min(h * 0.46, 420);
        const bx = w * 0.84;
        const hipY = gy - H * 0.5, shY = gy - H * 0.78, headY = gy - H * 0.868, headR = H * 0.058;
        const bcyc = ((t + 4) % 11) / 11;
        const mouth = { x: bx + H * 0.075, y: headY + headR * 0.4 };
        const rest = { x: bx + H * 0.115, y: hipY - H * 0.04 };
        let hand = { ...rest };
        let budGlow = 0.4 + 0.1 * Math.sin(t * 0.8 + 2);
        if (bcyc < 0.09) {
          const u = bcyc / 0.09;
          hand = { x: ease(rest.x, mouth.x, u), y: ease(rest.y, mouth.y, u) };
        } else if (bcyc < 0.24) {
          hand = mouth;
          budGlow = 0.5 + 0.5 * Math.sin(((bcyc - 0.09) / 0.15) * Math.PI);
        } else if (bcyc < 0.33) {
          const u = (bcyc - 0.24) / 0.09;
          hand = { x: ease(mouth.x, rest.x, u), y: ease(mouth.y, rest.y, u) };
        } else if (bcyc < 0.5 && Math.random() < 0.5) {
          // exhale, blown away from you
          budPlume.emit(mouth.x + 6, mouth.y, 1, t, 46, 8);
        }
        for (const [fill, dx] of [['rgba(140,170,230,0.08)', 3], ['#040409', 0]] as const) {
          ctx.fillStyle = fill;
          ctx.strokeStyle = fill;
          ctx.lineCap = 'round';
          ctx.lineWidth = H * 0.082;
          ctx.beginPath(); ctx.moveTo(bx + dx - H * 0.018, hipY); ctx.lineTo(bx + dx - H * 0.05, gy - 3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx + dx + H * 0.032, hipY); ctx.lineTo(bx + dx + H * 0.078, gy - 3); ctx.stroke();
          ctx.beginPath(); // torso, back bowed toward us — he faces away
          ctx.moveTo(bx + dx - H * 0.085, hipY + H * 0.04);
          ctx.bezierCurveTo(bx + dx - H * 0.125, shY + H * 0.06, bx + dx - H * 0.1, shY - H * 0.005, bx + dx - H * 0.015, shY - H * 0.03);
          ctx.bezierCurveTo(bx + dx + H * 0.065, shY - H * 0.045, bx + dx + H * 0.105, shY + H * 0.03, bx + dx + H * 0.098, hipY + H * 0.02);
          ctx.closePath(); ctx.fill();
          // neck, then the head turned ~20° away
          ctx.beginPath();
          ctx.roundRect(bx + dx - headR * 0.35, headY + headR * 0.4, headR * 0.95, H * 0.075, headR * 0.3);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(bx + dx + H * 0.02, headY, headR * 0.86, headR, 0.34, 0, Math.PI * 2);
          ctx.fill();
          // smoking arm: shoulder → elbow out to the side → hand
          const elbow = { x: bx + dx + H * 0.135, y: (shY + hand.y) / 2 + H * 0.05 };
          ctx.lineWidth = H * 0.05;
          ctx.beginPath();
          ctx.moveTo(bx + dx + H * 0.055, shY + H * 0.015);
          ctx.quadraticCurveTo(elbow.x, elbow.y, hand.x + dx, hand.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hand.x + dx, hand.y, H * 0.028, 0, Math.PI * 2);
          ctx.fill();
        }
        // his cigarette + ember
        const btip = { x: hand.x + H * 0.045, y: hand.y - H * 0.008 };
        ctx.strokeStyle = 'rgba(228,220,206,0.75)';
        ctx.lineWidth = 2.2;
        ctx.beginPath(); ctx.moveTo(hand.x, hand.y); ctx.lineTo(btip.x, btip.y); ctx.stroke();
        ctx.fillStyle = `rgba(255,118,44,${Math.min(1, budGlow + 0.2)})`;
        ctx.shadowColor = '#ff7628';
        ctx.shadowBlur = 6 + 16 * budGlow;
        ctx.beginPath(); ctx.arc(btip.x, btip.y, 1.9 + budGlow, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        if (Math.random() < 0.12) budPlume.emit(btip.x, btip.y - 3, 1, t);
        budPlume.step(dt, t);
      }

      // smoke off the ember, rising through the frame
      const rate = ph === 'winddown'
        ? Math.max(0.05, 0.4 - sincePhase * 0.025)
        : dragging ? 1 : 0.55;
      if (Math.random() < rate) plume.emit(emberWX, emberWY - cigH * 0.5 - 4, 1, t);
      plume.step(dt, t);
      ctx.globalCompositeOperation = 'screen';
      plume.draw(ctx);
      if (bud && budPlume) budPlume.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

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
  }, [rainy, orient, bud]);

  return <canvas ref={ref} data-testid="canvas-scene" aria-label={scene}
    style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />;
}
