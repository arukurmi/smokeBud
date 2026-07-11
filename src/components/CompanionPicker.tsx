'use client';
import type { CompanionManifest } from '@/lib/companions';
import { useState } from 'react';

export default function CompanionPicker({ companions, onPick, initialId }:
  { companions: CompanionManifest[]; onPick: (id: string) => void; initialId?: string }) {
  return (
    <div className="picker">
      <p className="invite">who are you smoking with tonight?</p>
      <div className="cards">
        {companions.map((c) => (
          <button key={c.id} className={`card${c.id === initialId ? ' fav' : ''}`}
            data-testid={`companion-card-${c.id}`} onClick={() => onPick(c.id)}>
            <Poster src={c.poster} alt={c.name} />
            <span className="card-name">{c.name}</span>
            <span className="card-scene">{c.scene}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Poster({ src, alt }: { src: string; alt: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return <div className="poster-fallback" aria-hidden />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="poster" onError={() => setOk(false)} />;
}
