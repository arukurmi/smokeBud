'use client';
import { useEffect, useRef } from 'react';
import type { ClipPhase } from '@/lib/companions';

interface P { x: number; y: number; vx: number; vy: number; r: number; a: number }

export default function CanvasScene({ phase, scene }: { phase: ClipPhase; scene: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0; let t = 0;
    const parts: P[] = [];
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; };
    resize(); addEventListener('resize', resize);

    const draw = () => {
      const { width: w, height: h } = canvas;
      t += 1 / 60;
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#06070c'); g.addColorStop(1, '#141008');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // city lights
      for (let i = 0; i < 24; i++) {
        ctx.fillStyle = `rgba(230,190,120,${0.06 + 0.04 * Math.sin(t + i)})`;
        ctx.fillRect((i * 137) % w, h * 0.55 + ((i * 53) % (h * 0.2)), 3, 3);
      }
      // silhouette: seated figure, right of center
      const cx = w * 0.62, cy = h * 0.72;
      ctx.fillStyle = '#020203';
      ctx.beginPath(); ctx.ellipse(cx, cy - 120, 26, 32, 0, 0, Math.PI * 2); ctx.fill(); // head
      ctx.beginPath(); ctx.roundRect(cx - 55, cy - 95, 110, 130, 30); ctx.fill(); // torso
      // arm + cigarette: hand near mouth
      const hx = cx - 30, hy = cy - 118;
      ctx.strokeStyle = '#020203'; ctx.lineWidth = 16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx - 45, cy - 40); ctx.quadraticCurveTo(cx - 70, cy - 90, hx, hy); ctx.stroke();
      // ember
      const ph = phaseRef.current;
      const base = ph === 'lightup' ? 0.9 + 0.6 * Math.abs(Math.sin(t * 6))
        : ph === 'winddown' ? Math.max(0, 0.7 - t * 0.02)
        : 0.55 + 0.35 * Math.max(0, Math.sin(t * 0.7)); // slow drag rhythm
      ctx.fillStyle = `rgba(255,120,40,${Math.min(1, base)})`;
      ctx.shadowColor = '#ff7828'; ctx.shadowBlur = 18 * base;
      ctx.beginPath(); ctx.arc(hx - 18, hy - 2, 4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // smoke particles
      if (Math.random() < (ph === 'winddown' ? 0.05 : 0.18))
        parts.push({ x: hx - 18, y: hy - 6, vx: (Math.random() - 0.3) * 0.4, vy: -0.5 - Math.random() * 0.4, r: 4 + Math.random() * 6, a: 0.16 });
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx + Math.sin(t + p.y * 0.02) * 0.25; p.y += p.vy; p.r += 0.09; p.a -= 0.0009;
        if (p.a <= 0) { parts.splice(i, 1); continue; }
        ctx.fillStyle = `rgba(200,200,210,${p.a})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); };
  }, []);

  return <canvas ref={ref} data-testid="canvas-scene" aria-label={scene}
    style={{ position: 'fixed', inset: 0, width: '100%', height: '100%' }} />;
}
