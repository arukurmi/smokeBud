// Shared canvas smoke engine: soft-sprite particles pushed through a cheap
// curl-ish wind field. Used by the landing backdrop and the break scene.

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  growth: number;
  angle: number;
  spin: number;
  phase: number;
}

/** Pre-render a soft radial puff so per-frame draws are one drawImage call. */
export function makeSmokeSprite(size = 128, core = 'rgba(226,231,240,0.5)'): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  const g = ctx.createRadialGradient(half, half, 0, half, half, half);
  g.addColorStop(0, core);
  g.addColorStop(0.4, 'rgba(206,212,224,0.2)');
  g.addColorStop(0.75, 'rgba(188,195,208,0.06)');
  g.addColorStop(1, 'rgba(180,188,202,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(half, half, half, 0, Math.PI * 2);
  ctx.fill();
  return c;
}

/** Horizontal wind at a point: layered sines approximate curling drafts. */
function windX(y: number, t: number, phase: number): number {
  return (
    16 * Math.sin(y * 0.0042 + t * 0.33 + phase) +
    9 * Math.sin(y * 0.011 - t * 0.21 + phase * 1.7) +
    4 * Math.sin(y * 0.027 + t * 0.57)
  );
}

export interface PlumeOptions {
  maxParticles?: number;
  /** Upward speed in px/s (positive number; applied as -y). */
  rise?: number;
  /** Extra sideways drift bias in px/s. */
  drift?: number;
  /** Peak sprite alpha. */
  peak?: number;
}

export class SmokePlume {
  particles: SmokeParticle[] = [];
  private sprite: HTMLCanvasElement | null = null;
  private readonly max: number;
  private readonly rise: number;
  private readonly drift: number;
  private readonly peak: number;

  constructor(opts: PlumeOptions = {}) {
    this.max = opts.maxParticles ?? 200;
    this.rise = opts.rise ?? 42;
    this.drift = opts.drift ?? 0;
    this.peak = opts.peak ?? 0.11;
  }

  /** Spawn `count` puffs at the source; call every frame with a small count. */
  emit(x: number, y: number, count: number, t: number): void {
    for (let i = 0; i < count && this.particles.length < this.max; i++) {
      const maxLife = 9 + Math.random() * 7;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 4,
        vy: -(this.rise * (0.75 + Math.random() * 0.5)),
        life: 0,
        maxLife,
        size: 5 + Math.random() * 7,
        growth: 7 + Math.random() * 6,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.3,
        phase: t * 0.13 + Math.random() * 0.5,
      });
    }
  }

  step(dt: number, t: number): void {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        ps.splice(i, 1);
        continue;
      }
      // straight ribbon near the source, widening curls as it ages
      const u = p.life / p.maxLife;
      const target = windX(p.y, t, p.phase) * (0.25 + u * 1.6) + this.drift * u;
      p.vx += (target - p.vx) * (1 - Math.exp(-dt * 1.6));
      p.vy -= 4.5 * dt; // buoyancy: smoke accelerates as it thins
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.size += p.growth * dt;
      p.angle += p.spin * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D, alphaScale = 1): void {
    if (!this.sprite) this.sprite = makeSmokeSprite();
    const sprite = this.sprite;
    for (const p of this.particles) {
      const u = p.life / p.maxLife;
      // quick fade-in, long fade-out
      const a = this.peak * Math.min(u * 9, 1) * Math.pow(1 - u, 1.7) * alphaScale;
      if (a <= 0.003) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.drawImage(sprite, -p.size, -p.size, p.size * 2, p.size * 2);
      ctx.restore();
    }
  }
}

/** Scale a canvas for the device pixel ratio; returns CSS-pixel dimensions. */
export function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
