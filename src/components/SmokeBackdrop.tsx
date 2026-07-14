'use client';
import { useEffect, useRef } from 'react';
import { SmokePlume, fitCanvas } from '@/lib/smoke';

// Ambient scene behind the landing page: a lone ember resting low in the
// frame, its smoke curling up through the type. Someone else is out here too.
export default function SmokeBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let { w, h } = fitCanvas(canvas, ctx);
    const onResize = () => ({ w, h } = fitCanvas(canvas, ctx));
    addEventListener('resize', onResize);

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const plume = new SmokePlume({ maxParticles: 260, rise: 44, drift: 9, peak: 0.1 });
    let raf = 0;
    let last = performance.now();
    let t = 0;

    const paint = () => {
      // night sky falling into a faint warm horizon
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#05060b');
      sky.addColorStop(0.72, '#090b13');
      sky.addColorStop(1, '#151009');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      // distant city bokeh along the bottom edge
      for (let i = 0; i < 26; i++) {
        const bx = ((i * 149) % w) + 8 * Math.sin(i * 3.7);
        const by = h - 14 - ((i * 37) % 46);
        const warm = i % 3 !== 0;
        const tw = 0.05 + 0.035 * Math.sin(t * 0.8 + i * 1.9);
        ctx.fillStyle = warm ? `rgba(255,190,110,${tw})` : `rgba(150,180,255,${tw * 0.8})`;
        ctx.beginPath();
        ctx.arc(bx, by, i % 4 === 0 ? 2.2 : 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const emberAt = () => ({ x: w * 0.22, y: h * 0.8 });

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      t += dt;
      paint();
      const { x, y } = emberAt();
      // the resting cigarette: paper stub + breathing ember
      const breath = 0.55 + 0.45 * Math.max(0, Math.sin(t * 0.55)) ** 3;
      ctx.strokeStyle = 'rgba(228,220,206,0.4)';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 1);
      ctx.lineTo(x + 34, y + 4);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(214,166,110,0.45)'; // filter band
      ctx.beginPath();
      ctx.moveTo(x + 27, y + 3.2);
      ctx.lineTo(x + 34, y + 4);
      ctx.stroke();
      ctx.fillStyle = `rgba(255,118,46,${0.35 + 0.6 * breath})`;
      ctx.shadowColor = 'rgba(255,118,46,0.9)';
      ctx.shadowBlur = 10 + 22 * breath;
      ctx.beginPath();
      ctx.arc(x, y, 2.4 + breath * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (Math.random() < 0.2 + breath * 0.22) plume.emit(x, y - 5, 1, t);
      plume.step(dt, t);
      ctx.globalCompositeOperation = 'screen';
      plume.draw(ctx);
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(frame);
    };

    if (reduced) {
      // a single still: sky, lights, a soft haze — no motion
      paint();
      const { x, y } = emberAt();
      ctx.fillStyle = 'rgba(255,118,46,0.8)';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      const haze = ctx.createRadialGradient(x, y - h * 0.2, 10, x, y - h * 0.2, h * 0.45);
      haze.addColorStop(0, 'rgba(200,206,218,0.07)');
      haze.addColorStop(1, 'rgba(200,206,218,0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, w, h);
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} className="backdrop" aria-hidden />;
}
