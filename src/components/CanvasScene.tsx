'use client';
import { useEffect, useRef } from 'react';
import type { ClipPhase } from '@/lib/companions';
import { SmokePlume, fitCanvas } from '@/lib/smoke';

// The built-in scene: one big cigarette across the middle of the screen,
// burning down in real time — the cigarette IS the session progress.
// Ash grows and flakes off, the ember breathes, smoke curls up the frame.

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

interface Flake { x: number; y: number; vx: number; vy: number; rot: number; vr: number; size: number; a: number }

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

  // warm haze where the far city meets the sky
  const horizon = h * 0.93;
  const haze = ctx.createLinearGradient(0, horizon - h * 0.08, 0, horizon);
  haze.addColorStop(0, 'rgba(255,160,80,0)');
  haze.addColorStop(1, 'rgba(255,160,80,0.045)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - h * 0.08, w, h * 0.08);

  // a distant skyline: a low, near-black strip so the cigarette owns the frame
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

export default function CanvasScene({ phase, scene, progress = 0 }:
  { phase: ClipPhase; scene: string; progress?: number }) {
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

    const plume = new SmokePlume({ maxParticles: 320, rise: 52, drift: 8, peak: 0.11 });
    const flakes: Flake[] = [];
    let ashLen = 6; // px of ash currently clinging past the ember
    let raf = 0;
    let last = performance.now();

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

      // ---- the cigarette ----
      const cigW = Math.min(w * 0.72, 920);
      const cigH = Math.max(24, Math.min(36, w * 0.024));
      const x0 = (w - cigW) / 2;
      const yMid = h * 0.54;
      const yTop = yMid - cigH / 2;
      const filterLen = cigW * 0.22;
      const bandW = Math.max(6, cigH * 0.28);
      const filterX = x0 + cigW - filterLen;
      const burnable = cigW - filterLen - bandW - 4;
      const emberX = x0 + p * burnable;

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
      const pool = ctx.createRadialGradient(emberX, yMid, 4, emberX, yMid, cigH * 9);
      pool.addColorStop(0, `rgba(255,120,45,${0.15 * emberGlow + 0.04})`);
      pool.addColorStop(1, 'rgba(255,120,45,0)');
      ctx.fillStyle = pool;
      ctx.fillRect(emberX - cigH * 9, yMid - cigH * 9, cigH * 18, cigH * 18);

      // ash: a ragged gray tail clinging to the left of the ember
      ashLen += dt * (dragging ? 6 : 2.4);
      const maxAsh = cigH * (1.6 + rnd(Math.floor(t / 7)) * 1.2);
      if (ashLen > maxAsh) {
        // the ash breaks off and falls
        for (let i = 0; i < 5; i++) {
          flakes.push({
            x: emberX - ashLen * (0.2 + Math.random() * 0.7),
            y: yMid + (Math.random() - 0.5) * cigH * 0.4,
            vx: (Math.random() - 0.5) * 14,
            vy: 26 + Math.random() * 30,
            rot: Math.random() * Math.PI,
            vr: (Math.random() - 0.5) * 3,
            size: 2.5 + Math.random() * (cigH * 0.22),
            a: 0.75,
          });
        }
        ashLen = 4 + Math.random() * 6;
      }
      const ashStart = Math.max(x0 - cigH * 2, emberX - ashLen);
      if (emberX > ashStart) {
        ctx.beginPath();
        for (let ax = ashStart; ax <= emberX; ax += 3) {
          const j = Math.floor(ax);
          const topJit = (rnd(j * 1.3) - 0.5) * cigH * 0.22;
          if (ax === ashStart) ctx.moveTo(ax, yTop + cigH * 0.18 + topJit);
          else ctx.lineTo(ax, yTop + topJit + cigH * 0.06);
        }
        for (let ax = emberX; ax >= ashStart; ax -= 3) {
          const j = Math.floor(ax);
          const botJit = (rnd(j * 2.7) - 0.5) * cigH * 0.22;
          ctx.lineTo(ax, yTop + cigH - cigH * 0.06 + botJit);
        }
        ctx.closePath();
        const ashGrad = ctx.createLinearGradient(0, yTop, 0, yTop + cigH);
        ashGrad.addColorStop(0, '#9a978f');
        ashGrad.addColorStop(0.45, '#c9c5bb');
        ashGrad.addColorStop(1, '#6e6b64');
        ctx.fillStyle = ashGrad;
        ctx.fill();
        // charred striations
        ctx.strokeStyle = 'rgba(40,38,36,0.5)';
        ctx.lineWidth = 1;
        for (let ax = ashStart + 4; ax < emberX - 2; ax += 7) {
          const j = Math.floor(ax);
          ctx.beginPath();
          ctx.moveTo(ax, yTop + cigH * (0.15 + rnd(j) * 0.2));
          ctx.lineTo(ax + 2, yTop + cigH * (0.65 + rnd(j + 9) * 0.2));
          ctx.stroke();
        }
      }

      // paper: cylinder-shaded white from the ember to the filter band
      const paperStart = emberX;
      const paperGrad = ctx.createLinearGradient(0, yTop, 0, yTop + cigH);
      paperGrad.addColorStop(0, '#b9b2a4');
      paperGrad.addColorStop(0.28, '#f4ecdc');
      paperGrad.addColorStop(0.6, '#e8e0cf');
      paperGrad.addColorStop(1, '#948d7f');
      ctx.fillStyle = paperGrad;
      ctx.fillRect(paperStart, yTop, filterX - bandW - paperStart, cigH);
      // singe just ahead of the ember
      const singe = ctx.createLinearGradient(paperStart, 0, paperStart + cigH * 0.9, 0);
      singe.addColorStop(0, 'rgba(70,40,20,0.8)');
      singe.addColorStop(0.4, 'rgba(120,80,40,0.35)');
      singe.addColorStop(1, 'rgba(120,80,40,0)');
      ctx.fillStyle = singe;
      ctx.fillRect(paperStart, yTop, cigH * 0.9, cigH);

      // gold band, then the cork filter with a rounded end
      ctx.fillStyle = '#b8913f';
      ctx.fillRect(filterX - bandW, yTop, bandW, cigH);
      ctx.fillStyle = 'rgba(255,235,180,0.35)';
      ctx.fillRect(filterX - bandW, yTop + cigH * 0.26, bandW, 1.5);
      const filtGrad = ctx.createLinearGradient(0, yTop, 0, yTop + cigH);
      filtGrad.addColorStop(0, '#a97b46');
      filtGrad.addColorStop(0.3, '#d9a86a');
      filtGrad.addColorStop(0.62, '#c99a5e');
      filtGrad.addColorStop(1, '#7e5a33');
      ctx.fillStyle = filtGrad;
      ctx.beginPath();
      ctx.roundRect(filterX, yTop, filterLen, cigH, [0, cigH / 2, cigH / 2, 0]);
      ctx.fill();
      // cork speckle
      ctx.fillStyle = 'rgba(90,60,30,0.35)';
      for (let i = 0; i < 60; i++) {
        const fx = filterX + rnd(i * 11) * (filterLen - 8) + 3;
        const fy = yTop + 2 + rnd(i * 11 + 5) * (cigH - 5);
        ctx.fillRect(fx, fy, 1.6, 1.2);
      }

      // the ember itself: a glowing, flickering front
      const emberW = cigH * (0.5 + 0.22 * emberGlow);
      const emberGrad = ctx.createLinearGradient(emberX - emberW, 0, emberX + emberW * 0.6, 0);
      emberGrad.addColorStop(0, `rgba(120,20,5,${0.85 * emberGlow})`);
      emberGrad.addColorStop(0.5, `rgba(255,110,30,${Math.min(1, 1.1 * emberGlow)})`);
      emberGrad.addColorStop(1, `rgba(255,190,80,${0.9 * emberGlow})`);
      ctx.save();
      ctx.shadowColor = 'rgba(255,110,35,0.95)';
      ctx.shadowBlur = 20 + 44 * emberGlow;
      ctx.fillStyle = emberGrad;
      ctx.beginPath();
      for (let ax = emberX - emberW; ax <= emberX + emberW * 0.6; ax += 2.5) {
        const j = Math.floor(ax * 1.7);
        const jit = (rnd(j + Math.floor(t * 9)) - 0.5) * cigH * 0.16;
        if (ax === emberX - emberW) ctx.moveTo(ax, yTop + cigH * 0.1 + jit);
        else ctx.lineTo(ax, yTop + cigH * 0.04 + jit);
      }
      for (let ax = emberX + emberW * 0.6; ax >= emberX - emberW; ax -= 2.5) {
        const j = Math.floor(ax * 2.3);
        const jit = (rnd(j + Math.floor(t * 9) + 40) - 0.5) * cigH * 0.16;
        ctx.lineTo(ax, yTop + cigH - cigH * 0.04 + jit);
      }
      ctx.closePath();
      ctx.fill();
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

      // smoke from the ember, up through the whole frame
      const rate = ph === 'winddown'
        ? Math.max(0.04, 0.3 - sincePhase * 0.02)
        : dragging ? 0.85 : 0.38;
      if (Math.random() < rate) plume.emit(emberX, yTop - 4, 1, t);
      plume.step(dt, t);
      ctx.globalCompositeOperation = 'screen';
      plume.draw(ctx);
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
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); };
  }, [rainy]);

  return <canvas ref={ref} data-testid="canvas-scene" aria-label={scene}
    style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />;
}
