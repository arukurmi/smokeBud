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
  size0: number;
  growth: number;
  angle: number;
  spin: number;
  phase: number;
}

/** Pre-render a textured puff — dozens of overlapping blobs under a soft
 *  falloff mask, so each particle looks like cloud material rather than a
 *  perfect circle. One drawImage per particle at runtime. */
export function makeSmokeSprite(size = 160): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const half = size / 2;
  for (let i = 0; i < 36; i++) {
    const r = size * (0.07 + Math.random() * 0.15);
    const dist = (half - r) * Math.pow(Math.random(), 0.72);
    const ang = Math.random() * Math.PI * 2;
    const x = half + Math.cos(ang) * dist;
    const y = half + Math.sin(ang) * dist;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(219,226,238,0.13)');
    g.addColorStop(0.6, 'rgba(206,214,228,0.05)');
    g.addColorStop(1, 'rgba(200,208,222,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // fade the cloud toward the sprite edge
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(half, half, 0, half, half, half);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.55, 'rgba(0,0,0,0.75)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

// ---- value noise: smooth pseudo-random field for organic drift ----
const hash2 = (ix: number, iy: number): number => {
  const s = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (u: number) => u * u * (3 - 2 * u);

/** 2D value noise in [0,1], two octaves. */
export function vnoise(x: number, y: number): number {
  let out = 0;
  let amp = 0.68;
  for (let o = 0; o < 2; o++) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = smooth(x - ix), fy = smooth(y - iy);
    const a = hash2(ix, iy), b = hash2(ix + 1, iy);
    const c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
    out += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
    x *= 2.1; y *= 2.1; amp *= 0.45;
  }
  return out;
}

/** Horizontal wind at a point: noise-driven drafts that never repeat. */
function windX(y: number, t: number, phase: number): number {
  return (vnoise(phase * 3.7, y * 0.006 - t * 0.09) - 0.5) * 46
    + (vnoise(phase * 1.3 + 9, y * 0.017 + t * 0.05) - 0.5) * 18;
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

  /** Spawn `count` puffs at the source; optional initial velocity for exhales. */
  emit(x: number, y: number, count: number, t: number, vx0 = 0, vy0 = 0): void {
    for (let i = 0; i < count && this.particles.length < this.max; i++) {
      const maxLife = 7 + Math.random() * 5;
      const size = 4 + Math.random() * 6;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 2,
        vx: vx0 + (Math.random() - 0.5) * 4,
        vy: vy0 - (this.rise * (0.75 + Math.random() * 0.5)),
        life: 0,
        maxLife,
        size,
        size0: size,
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
      // quick fade-in, long fade-out, thinning as the puff expands so a
      // spreading cloud never stacks into an opaque blob
      const thin = Math.pow(p.size0 / p.size, 1.1);
      const a = this.peak * Math.min(u * 9, 1) * Math.pow(1 - u, 1.35) * thin * alphaScale;
      if (a <= 0.003) continue;
      // stretch along the direction of travel so the stream reads as a
      // ribbon rather than a row of dots
      const speed = Math.hypot(p.vx, p.vy);
      const stretch = 1 + Math.min(1.1, speed / 110);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.atan2(p.vy, p.vx) + p.angle * 0.06);
      ctx.drawImage(sprite, -p.size * stretch, -p.size, p.size * 2 * stretch, p.size * 2);
      ctx.restore();
    }
  }
}

interface ThreadPt { x: number; y: number; vx: number; age: number }

export interface ThreadOptions {
  /** Upward speed in px/s. */
  rise?: number;
  /** Lateral turbulence strength once the flow goes turbulent. */
  turb?: number;
  /** Peak segment alpha. */
  peak?: number;
  /** Max points kept in the filament. */
  length?: number;
}

/**
 * The laminar filament of cigarette smoke: a connected chain of points
 * anchored at the ember. It rises glassy-smooth for the first stretch,
 * then noise tears it into curls. Draw hands the tail off to a SmokePlume
 * for the dispersed cloud phase.
 */
export class SmokeThread {
  pts: ThreadPt[] = [];
  private readonly rise: number;
  private readonly turb: number;
  private readonly peak: number;
  private readonly maxLen: number;
  private seed = Math.random() * 100;

  constructor(opts: ThreadOptions = {}) {
    this.rise = opts.rise ?? 46;
    this.turb = opts.turb ?? 1;
    this.peak = opts.peak ?? 0.5;
    this.maxLen = opts.length ?? 96;
  }

  /** Advance the filament; returns the tail point (for plume hand-off) or null. */
  update(dt: number, t: number, ax: number, ay: number, intensity = 1): ThreadPt | null {
    this.pts.unshift({ x: ax, y: ay, vx: 0, age: 0 });
    for (let i = 1; i < this.pts.length; i++) {
      const p = this.pts[i];
      p.age += dt;
      const climb = ay - p.y; // px risen so far
      // laminar for the first ~85px, then increasingly turbulent
      const lam = Math.min(1, Math.max(0, (climb - 85) / 130));
      const amp = (0.06 + lam * lam * this.turb) * 62 * intensity;
      const n = vnoise(this.seed + p.x * 0.011, p.y * 0.011 - t * 0.22) - 0.5;
      const n2 = vnoise(this.seed + 40 + p.y * 0.03 - t * 0.1, p.x * 0.005) - 0.5;
      p.vx += ((n * amp + n2 * amp * 0.5) - p.vx) * (1 - Math.exp(-dt * 2.2));
      p.x += p.vx * dt;
      p.y -= this.rise * (0.85 + lam * 0.7) * dt;
    }
    return this.pts.length > this.maxLen ? this.pts.pop()! : null;
  }

  /** Tapered strokes in two passes — a soft wide halo under a bright core —
   *  so the filament has volume instead of reading as a hard line. Call
   *  under 'screen' composite. */
  draw(ctx: CanvasRenderingContext2D, glow = 0): void {
    const n = this.pts.length;
    if (n < 3) return;
    ctx.lineCap = 'round';
    for (const [widthMul, alphaMul] of [[3.1, 0.28], [1, 1]] as const) {
      for (let i = 1; i < n - 1; i++) {
        const p = this.pts[i];
        const u = i / this.maxLen;
        const head = Math.min(1, i / 6); // ease in right at the ember
        const a = this.peak * head * Math.pow(1 - u, 0.85) * alphaMul;
        if (a <= 0.004) continue;
        // bluish side-stream near the source, warming with ember flare
        const r = 168 + u * 42 + glow * (1 - u) * 60;
        const g = 182 + u * 30 + glow * (1 - u) * 24;
        const b = 212 + u * 16;
        ctx.strokeStyle = `rgba(${r | 0},${g | 0},${b | 0},${a})`;
        ctx.lineWidth = (1.5 + u * 8) * widthMul;
        ctx.beginPath();
        const m = this.pts[i - 1];
        ctx.moveTo((m.x + p.x) / 2, (m.y + p.y) / 2);
        const q = this.pts[i + 1];
        ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
        ctx.stroke();
      }
    }
  }
}

/** Scale a canvas for the device pixel ratio; returns CSS-pixel dimensions. */
export function fitCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, maxDpr = 2): { w: number; h: number } {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h };
}
