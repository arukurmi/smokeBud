'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompanionManifest } from '@/lib/companions';
import { buildSequence, totalDuration } from '@/lib/sequence';
import CanvasScene from './CanvasScene';
import Subtitles from './Subtitles';
import AmbientAudio from './AmbientAudio';
import PresenceCounter from './PresenceCounter';

export default function BreakPlayer({ manifest, fast = false, onComplete }:
  { manifest: CompanionManifest; fast?: boolean; onComplete: () => void }) {
  const seq = useMemo(() => {
    const s = buildSequence(manifest, 330);
    if (!fast) return s;
    const scale = 6 / totalDuration(s);
    return s.map((i) => ({ ...i, duration: i.duration * scale }));
  }, [manifest, fast]);

  const [idx, setIdx] = useState(0);
  const [videoOk, setVideoOk] = useState(true);
  const [videoOkIdx, setVideoOkIdx] = useState(-1);
  const done = useRef(false);
  const total = useMemo(() => totalDuration(seq), [seq]);
  const [elapsed, setElapsed] = useState(0);

  // Reset the video-ok flag whenever the current clip changes, following the
  // render-time "adjusting state when a prop changes" pattern instead of an
  // effect (avoids a setState-in-effect cascade).
  if (videoOkIdx !== idx) {
    setVideoOkIdx(idx);
    setVideoOk(true);
  }

  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 0.25), 250);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (idx >= seq.length) {
      if (!done.current) { done.current = true; onComplete(); }
      return;
    }
    const t = setTimeout(() => setIdx((i) => i + 1), seq[idx].duration * 1000);
    return () => clearTimeout(t);
  }, [idx, seq, onComplete]);

  if (idx >= seq.length) return null;
  const item = seq[idx];
  const left = Math.max(0, 1 - elapsed / total);

  return (
    <div className="player" data-testid="break-player">
      {videoOk ? (
        <video key={item.src + idx} data-testid="clip-video" src={item.src}
          autoPlay muted={false} playsInline
          onError={() => setVideoOk(false)}
          style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <CanvasScene phase={item.phase} scene={manifest.scene} />
      )}
      <div className="burn" aria-hidden>
        <div className="burn-line" data-testid="burn-progress" style={{ width: `${left * 100}%` }} />
      </div>
      <Subtitles fast={fast} />
      <AmbientAudio />
      <PresenceCounter fast={fast} />
    </div>
  );
}
