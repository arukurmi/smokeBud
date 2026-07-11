'use client';
import { useEffect, useRef, useState } from 'react';

export default function AmbientAudio() {
  const [muted, setMuted] = useState(false);
  const gainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    const ctx = new AudioContext();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) { // brown noise
      const white = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 420;
    const gain = ctx.createGain(); gain.gain.value = 0.12; gainRef.current = gain;
    src.connect(filter).connect(gain).connect(ctx.destination); src.start();
    const resume = () => ctx.resume();
    document.addEventListener('pointerdown', resume);
    return () => { document.removeEventListener('pointerdown', resume); src.stop(); ctx.close(); };
  }, []);
  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 0.12; }, [muted]);
  return (
    <button className="quiet audio-toggle" data-testid="audio-toggle"
      onClick={() => setMuted((m) => !m)} aria-label={muted ? 'unmute ambience' : 'mute ambience'}>
      {muted ? '🔇' : '🔉'}
    </button>
  );
}
