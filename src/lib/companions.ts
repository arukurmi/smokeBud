import fs from 'node:fs';
import path from 'node:path';

export type ClipPhase = 'lightup' | 'loop' | 'winddown';
export interface Clip { src: string; duration: number }
export interface CompanionManifest {
  id: string; name: string; scene: string; poster: string;
  lightup: Clip; loops: Clip[]; winddown: Clip;
}

function clip(id: string, raw: unknown): Clip {
  const c = raw as { src?: unknown; duration?: unknown };
  if (typeof c?.src !== 'string' || typeof c?.duration !== 'number' || c.duration <= 0)
    throw new Error(`invalid clip in manifest for ${id}`);
  return { src: `/companions/${id}/${c.src}`, duration: c.duration };
}

export function parseManifest(id: string, json: unknown): CompanionManifest {
  const m = json as Record<string, unknown>;
  if (typeof m?.name !== 'string' || typeof m?.scene !== 'string' || typeof m?.poster !== 'string')
    throw new Error(`invalid manifest for ${id}`);
  const loops = Array.isArray(m.loops) ? m.loops.map((l) => clip(id, l)) : [];
  if (loops.length === 0) throw new Error(`manifest for ${id} needs at least one loop clip`);
  return {
    id, name: m.name, scene: m.scene,
    poster: `/companions/${id}/${m.poster}`,
    lightup: clip(id, m.lightup), loops, winddown: clip(id, m.winddown),
  };
}

export function loadCompanions(dir = path.join(process.cwd(), 'public', 'companions')): CompanionManifest[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .flatMap((d) => {
      const file = path.join(dir, d.name, 'manifest.json');
      if (!fs.existsSync(file)) return [];
      try {
        return [parseManifest(d.name, JSON.parse(fs.readFileSync(file, 'utf8')))];
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`skipping companion ${d.name}: ${message}`);
        return [];
      }
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}
