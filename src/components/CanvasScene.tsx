'use client';
import { useEffect, useRef } from 'react';
import type { ClipPhase } from '@/lib/companions';
import { SmokePlume, fitCanvas } from '@/lib/smoke';

// The built-in scene: a companion on a balcony over a sleeping city.
// They actually smoke — raise, drag (ember flares), lower, exhale —
// on a slow cycle, so five minutes of watching never freezes.

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// drag cycle timing (fractions of one ~9.5s cycle)
const RAISE_END = 0.1;
const DRAG_END = 0.26;
const LOWER_END = 0.38;
const EXHALE_END = 0.55;

const ease = (a: number, b: number, u: number) => {
  const k = u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u);
  return a + (b - a) * k;
};

function buildSkyline(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#04050b');
  sky.addColorStop(0.6, '#090b14');
  sky.addColorStop(0.82, '#120e0c');
  sky.addColorStop(1, '#040407');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // warm haze where the city meets the sky
  const horizon = h * 0.78;
  const haze = ctx.createLinearGradient(0, horizon - h * 0.12, 0, horizon);
  haze.addColorStop(0, 'rgba(255,160,80,0)');
  haze.addColorStop(1, 'rgba(255,160,80,0.07)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, horizon - h * 0.12, w, h * 0.12);

  // far ridge of buildings
  ctx.fillStyle = '#070810';
  let x = 0;
  let i = 0;
  while (x < w) {
    const bw = 40 + rnd(i) * 80;
    const bh = h * (0.06 + rnd(i + 40) * 0.1);
    ctx.fillRect(x, horizon - bh, bw + 1, bh + h * 0.1);
    x += bw;
    i++;
  }
  // near ridge, darker and taller, with a few lit windows
  ctx.fillStyle = '#04040b';
  x = -20;
  i = 100;
  while (x < w) {
    const bw = 70 + rnd(i) * 110;
    const bh = h * (0.1 + rnd(i + 7) * 0.14);
    const top = horizon - bh + h * 0.045;
    ctx.fillRect(x, top, bw + 2, bh + h * 0.1);
    const cols = Math.floor(bw / 18);
    const rows = Math.floor(bh / 26);
    for (let cxi = 0; cxi < cols; cxi++) {
      for (let ryi = 0; ryi < rows; ryi++) {
        const seed = i * 13.7 + cxi * 3.1 + ryi * 7.9;
        if (rnd(seed) > 0.86) {
          ctx.fillStyle = `rgba(255,196,120,${0.08 + rnd(seed + 1) * 0.16})`;
          ctx.fillRect(x + 8 + cxi * 18, top + 10 + ryi * 26, 4, 6);
        }
      }
    }
    ctx.fillStyle = '#04040b';
    x += bw + 14;
    i++;
  }
  // balcony floor
  ctx.fillStyle = '#030309';
  ctx.fillRect(0, h * 0.87, w, h * 0.13);
  return c;
}

export default function CanvasScene({ phase, scene }: { phase: ClipPhase; scene: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  const phaseStartTRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    if (phaseRef.current !== phase) {
      phaseStartTRef.current = tRef.current;
    }
    phaseRef.current = phase;
  }, [phase]);

  const rainy = /rain/i.test(scene);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let { w, h } = fitCanvas(canvas, ctx);
    let skyline = buildSkyline(w, h);
    const drops = rainy
      ? Array.from({ length: 110 }, (_, i) => ({
          x: rnd(i * 7) * 1.1, // fraction of width; can start offscreen
          y: rnd(i * 7 + 3),
          len: 9 + rnd(i * 7 + 5) * 13,
          speed: 0.55 + rnd(i * 7 + 9) * 0.5, // screens per second
        }))
      : [];
    const onResize = () => {
      ({ w, h } = fitCanvas(canvas, ctx));
      skyline = buildSkyline(w, h);
    };
    addEventListener('resize', onResize);

    const smolder = new SmokePlume({ maxParticles: 150, rise: 34, drift: 6, peak: 0.09 });
    const exhale = new SmokePlume({ maxParticles: 120, rise: 14, drift: -14, peak: 0.12 });
    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      tRef.current += dt;
      const t = tRef.current;
      const ph = phaseRef.current;
      const sincePhase = t - phaseStartTRef.current;

      ctx.drawImage(skyline, 0, 0);

      if (!rainy) {
        // stars
        for (let i = 0; i < 42; i++) {
          const sx = rnd(i * 3) * w;
          const sy = rnd(i * 3 + 1) * h * 0.45;
          const tw = 0.05 + 0.14 * Math.abs(Math.sin(t * (0.3 + rnd(i) * 0.5) + i));
          ctx.fillStyle = `rgba(210,220,240,${tw})`;
          ctx.fillRect(sx, sy, 1.4, 1.4);
        }
        // moon, waning, with haze
        const mx = w * 0.82, my = h * 0.15;
        ctx.save();
        ctx.fillStyle = 'rgba(222,229,244,0.85)';
        ctx.shadowColor = 'rgba(200,215,245,0.55)';
        ctx.shadowBlur = 46;
        ctx.beginPath(); ctx.arc(mx, my, 24, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(9,11,20,0.92)';
        ctx.beginPath(); ctx.arc(mx - 12, my - 7, 21, 0, Math.PI * 2); ctx.fill();
      } else {
        // low cloud sheet instead of stars, fading into the sky
        const cloud = ctx.createLinearGradient(0, 0, 0, h * 0.42);
        const ca = 0.5 + 0.06 * Math.sin(t * 0.2);
        cloud.addColorStop(0, `rgba(16,19,30,${ca})`);
        cloud.addColorStop(0.65, `rgba(16,19,30,${ca * 0.4})`);
        cloud.addColorStop(1, 'rgba(16,19,30,0)');
        ctx.fillStyle = cloud;
        ctx.fillRect(0, 0, w, h * 0.42);
      }

      // railing between companion and city
      ctx.strokeStyle = '#0b0c15';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(0, h * 0.68); ctx.lineTo(w, h * 0.68); ctx.stroke();
      ctx.lineWidth = 3;
      for (let bx = (w % 90) / 2; bx < w; bx += 90) {
        ctx.beginPath(); ctx.moveTo(bx, h * 0.68); ctx.lineTo(bx, h * 0.88); ctx.stroke();
      }

      // ---- companion ----
      const cx = w * 0.63, cy = h * 0.78;
      const mouth = { x: cx - 34, y: cy - 128 };
      const rest = { x: cx - 78, y: cy - 12 };

      // drag cycle; frozen at rest during winddown, at mouth while lighting up
      const cyc = (t % 9.5) / 9.5;
      let hand = { ...rest };
      let emberGlow = 0.45 + 0.15 * Math.sin(t * 0.9); // smolder baseline
      if (ph === 'lightup') {
        hand = mouth;
        const flick = Math.abs(Math.sin(t * 7)) * Math.abs(Math.sin(t * 3.1));
        emberGlow = Math.min(1, sincePhase * 0.25) * (0.55 + 0.45 * flick);
      } else if (ph === 'winddown') {
        emberGlow = Math.max(0.05, 0.5 - sincePhase * 0.03);
      } else if (cyc < RAISE_END) {
        const u = cyc / RAISE_END;
        hand = { x: ease(rest.x, mouth.x, u), y: ease(rest.y, mouth.y, u) };
        emberGlow = 0.5;
      } else if (cyc < DRAG_END) {
        hand = mouth;
        const u = (cyc - RAISE_END) / (DRAG_END - RAISE_END);
        emberGlow = 0.6 + 0.4 * Math.sin(u * Math.PI); // flare mid-drag
      } else if (cyc < LOWER_END) {
        const u = (cyc - DRAG_END) / (LOWER_END - DRAG_END);
        hand = { x: ease(mouth.x, rest.x, u), y: ease(mouth.y, rest.y, u) };
        emberGlow = 0.55;
      }

      // warm spill from a window behind them, so the silhouette separates
      const spill = ctx.createRadialGradient(cx + 60, cy - 40, 20, cx + 60, cy - 40, 260);
      spill.addColorStop(0, 'rgba(255,176,96,0.075)');
      spill.addColorStop(1, 'rgba(255,176,96,0)');
      ctx.fillStyle = spill;
      ctx.fillRect(cx - 220, cy - 320, 560, 420);

      // silhouette with a whisper of cool rim light
      const body = (fill: string, dx: number) => {
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.ellipse(cx + dx - 8, cy - 142, 20, 25, -0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); // sloped shoulders → seated torso
        ctx.moveTo(cx + dx - 46, cy + 14);
        ctx.quadraticCurveTo(cx + dx - 52, cy - 60, cx + dx - 38, cy - 96);
        ctx.quadraticCurveTo(cx + dx - 26, cy - 118, cx + dx - 4, cy - 116);
        ctx.quadraticCurveTo(cx + dx + 34, cy - 112, cx + dx + 44, cy - 70);
        ctx.quadraticCurveTo(cx + dx + 52, cy - 30, cx + dx + 50, cy + 14);
        ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.roundRect(cx + dx - 98, cy - 14, 104, 32, 15); ctx.fill(); // thigh
      };
      body('rgba(140,170,230,0.09)', 3);
      body('#020204', 0);
      // arm: shoulder → hand
      const sh = { x: cx - 28, y: cy - 92 };
      ctx.strokeStyle = '#020204';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.quadraticCurveTo((sh.x + hand.x) / 2 - 22, (sh.y + hand.y) / 2 + 14, hand.x, hand.y);
      ctx.stroke();

      // cigarette + ember
      const tip = { x: hand.x - 15, y: hand.y - 3 };
      ctx.strokeStyle = 'rgba(228,220,206,0.8)';
      ctx.lineWidth = 2.6;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y - 1); ctx.lineTo(tip.x + 3, tip.y); ctx.stroke();
      ctx.fillStyle = `rgba(255,118,44,${Math.min(1, emberGlow)})`;
      ctx.shadowColor = '#ff7628';
      ctx.shadowBlur = 8 + 26 * emberGlow;
      ctx.beginPath(); ctx.arc(tip.x, tip.y, 2.6 + emberGlow * 1.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // smoke: constant smolder from the tip…
      const smolderRate = ph === 'winddown' ? Math.max(0.02, 0.14 - sincePhase * 0.01) : 0.22;
      if (Math.random() < smolderRate) smolder.emit(tip.x, tip.y - 4, 1, t);
      // …plus an exhale stream after each drag
      if (ph === 'loop' && cyc >= LOWER_END && cyc < EXHALE_END) {
        const u = (cyc - LOWER_END) / (EXHALE_END - LOWER_END);
        if (Math.random() < 0.75 * (1 - u * 0.6)) {
          exhale.emit(mouth.x - 4, mouth.y + 2, 1, t, -60 * (1 - u * 0.5), 6);
        }
      }
      smolder.step(dt, t);
      exhale.step(dt, t);
      ctx.globalCompositeOperation = 'screen';
      smolder.draw(ctx);
      exhale.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';

      // rain in front of everything, sheltered from the awning above the frame
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
