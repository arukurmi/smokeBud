'use client';
import { useEffect, useRef, useState } from 'react';

// Night ambience, synthesized so nothing ships as an asset: a low brown-noise
// hum, plus a hiss layer that reads as rain for rainy scenes.
export default function AmbientAudio({ rain = false }: { rain?: boolean }) {
  const [muted, setMuted] = useState(false);
  const gainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.12;
    gainRef.current = master;
    master.connect(ctx.destination);

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
    src.connect(filter).connect(master); src.start();

    let rainSrc: AudioBufferSourceNode | null = null;
    if (rain) {
      const rbuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const rdata = rbuf.getChannelData(0);
      for (let i = 0; i < rdata.length; i++) rdata[i] = Math.random() * 2 - 1;
      rainSrc = ctx.createBufferSource(); rainSrc.buffer = rbuf; rainSrc.loop = true;
      const band = ctx.createBiquadFilter(); band.type = 'bandpass';
      band.frequency.value = 1900; band.Q.value = 0.6;
      const rgain = ctx.createGain(); rgain.gain.value = 0.35;
      rainSrc.connect(band).connect(rgain).connect(master); rainSrc.start();
    }

    const resume = () => ctx.resume();
    document.addEventListener('pointerdown', resume);
    return () => {
      document.removeEventListener('pointerdown', resume);
      src.stop(); rainSrc?.stop(); ctx.close();
    };
  }, [rain]);
  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 0.12; }, [muted]);
  return (
    <button className="quiet audio-toggle" data-testid="audio-toggle"
      onClick={() => setMuted((m) => !m)} aria-label={muted ? 'unmute ambience' : 'mute ambience'}>
      {muted ? '🔇' : '🔉'}
    </button>
  );
}
