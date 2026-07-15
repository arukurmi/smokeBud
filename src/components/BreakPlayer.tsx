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
  // scene preferences (canvas mode only), remembered between breaks
  const [orient, setOrient] = useState<'h' | 'v'>(() =>
    typeof window !== 'undefined' && localStorage.getItem('sb-orient') === 'v' ? 'v' : 'h');
  const [bud, setBud] = useState(() =>
    typeof window !== 'undefined' && localStorage.getItem('sb-bud') === '1');
  const [showHint, setShowHint] = useState(true);
  const [videoOkIdx, setVideoOkIdx] = useState(-1);
  const [preloadNext, setPreloadNext] = useState(false);
  const [fadeIn, setFadeIn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const nextVideoRef = useRef<HTMLVideoElement>(null);
  const done = useRef(false);
  const total = useMemo(() => totalDuration(seq), [seq]);
  const [elapsed, setElapsed] = useState(0);

  // Reset the video-ok/preload/fade state whenever the current clip changes,
  // following the render-time "adjusting state when a prop changes" pattern
  // instead of an effect (avoids a setState-in-effect cascade).
  if (videoOkIdx !== idx) {
    setVideoOkIdx(idx);
    setVideoOk(true);
    setPreloadNext(false);
    setFadeIn(false);
  }

  useEffect(() => {
    const tick = setInterval(() => setElapsed((e) => e + 0.25), 250);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), 9000);
    return () => clearTimeout(t);
  }, []);

  function flip() {
    const next = orient === 'h' ? 'v' : 'h';
    setOrient(next);
    localStorage.setItem('sb-orient', next);
  }
  function toggleBud() {
    const next = !bud;
    setBud(next);
    localStorage.setItem('sb-bud', next ? '1' : '0');
  }

  useEffect(() => {
    if (idx >= seq.length) {
      if (!done.current) { done.current = true; onComplete(); }
      return;
    }
    const durationMs = seq[idx].duration * 1000;
    const t = setTimeout(() => setIdx((i) => i + 1), durationMs);
    // Mount the next clip invisibly ~1.5s before this one ends, so it's
    // ready to fade in the moment we advance.
    const preloadDelay = Math.max(0, durationMs - 1500);
    const p = setTimeout(() => setPreloadNext(true), preloadDelay);
    return () => { clearTimeout(t); clearTimeout(p); };
  }, [idx, seq, onComplete]);

  // Unmuted autoplay can be silently rejected by the browser (esp. Safari)
  // on later clip mounts; a rejection does not fire onError, so kick off
  // playback explicitly and fall back to the canvas scene if it's blocked.
  useEffect(() => {
    if (idx >= seq.length || !videoOk) return;
    const el = videoRef.current;
    if (!el) return;
    el.play()?.catch(() => setVideoOk(false));
    // Trigger the CSS opacity transition on the next frame so the browser
    // registers the initial (0) opacity before animating to 1.
    const raf = requestAnimationFrame(() => setFadeIn(true));
    return () => cancelAnimationFrame(raf);
  }, [idx, seq.length, videoOk]);

  if (idx >= seq.length) return null;
  const item = seq[idx];
  const nextItem = idx + 1 < seq.length ? seq[idx + 1] : null;
  const left = Math.max(0, 1 - elapsed / total);

  return (
    <div className="player" data-testid="break-player">
      {videoOk ? (
        <>
          <video ref={videoRef} key={item.src + idx} data-testid="clip-video" src={item.src}
            autoPlay muted={false} playsInline
            onError={() => setVideoOk(false)}
            className="clip"
            style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: fadeIn ? 1 : 0 }} />
          {preloadNext && nextItem && (
            <video ref={nextVideoRef} key={nextItem.src + (idx + 1)} src={nextItem.src}
              muted preload="auto" playsInline
              className="clip"
              style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0 }} />
          )}
        </>
      ) : (
        <>
          <CanvasScene phase={item.phase} scene={manifest.scene} progress={1 - left}
            orient={orient} bud={bud} />
          <div className="scene-controls">
            <button className="quiet" data-testid="orient-toggle" onClick={flip}>
              {orient === 'h' ? 'vertical' : 'horizontal'}
            </button>
            <button className="quiet" data-testid="bud-toggle" onClick={toggleBud}>
              {bud ? 'remove companion' : 'add a companion'}
            </button>
          </div>
          {showHint && <p className="ash-hint">double-tap the cigarette to ash it</p>}
        </>
      )}
      {/* the canvas cigarette shows its own burn; keep the bar for video mode */}
      {videoOk && (
        <div className="burn" aria-hidden>
          <div className="burn-line" data-testid="burn-progress" style={{ width: `${left * 100}%` }}>
            <span className="burn-tip" />
          </div>
        </div>
      )}
      <Subtitles fast={fast} />
      <AmbientAudio rain={/rain/i.test(manifest.scene)} />
      <PresenceCounter fast={fast} />
    </div>
  );
}
