'use client';
import { useEffect, useRef, useState } from 'react';

// Warm lo-fi pad, synthesized so nothing ships as an asset: a slowly
// breathing Fmaj7 chord of detuned sines behind a gentle lowpass, with a
// soft rain hiss layered in for rainy scenes.
export default function AmbientAudio({ rain = false }: { rain?: boolean }) {
  const [muted, setMuted] = useState(false);
  const gainRef = useRef<GainNode | null>(null);
  useEffect(() => {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.05;
    gainRef.current = master;
    master.connect(ctx.destination);

    // the pad: each chord tone is a pair of slightly detuned sines
    const chord = [87.31, 130.81, 164.81, 220.0, 349.23]; // F2 C3 E3 A3 F4
    const pad = ctx.createGain();
    pad.gain.value = 0.9;
    const warmth = ctx.createBiquadFilter();
    warmth.type = 'lowpass';
    warmth.frequency.value = 620;
    warmth.Q.value = 0.4;
    pad.connect(warmth).connect(master);
    const oscs: OscillatorNode[] = [];
    chord.forEach((f, i) => {
      const level = ctx.createGain();
      level.gain.value = i === chord.length - 1 ? 0.05 : 0.16; // top note as a whisper
      level.connect(pad);
      for (const det of [-1.6, 1.6]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.detune.value = det;
        o.connect(level);
        o.start();
        oscs.push(o);
      }
    });

    // breathing: a very slow LFO swelling the pad in and out
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.3;
    lfo.connect(lfoDepth).connect(pad.gain);
    lfo.start();
    // and a slower drift of the filter for movement
    const drift = ctx.createOscillator();
    drift.frequency.value = 0.017;
    const driftDepth = ctx.createGain();
    driftDepth.gain.value = 180;
    drift.connect(driftDepth).connect(warmth.frequency);
    drift.start();

    let rainSrc: AudioBufferSourceNode | null = null;
    if (rain) {
      const rbuf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
      const rdata = rbuf.getChannelData(0);
      for (let i = 0; i < rdata.length; i++) rdata[i] = Math.random() * 2 - 1;
      rainSrc = ctx.createBufferSource(); rainSrc.buffer = rbuf; rainSrc.loop = true;
      const band = ctx.createBiquadFilter(); band.type = 'bandpass';
      band.frequency.value = 1900; band.Q.value = 0.6;
      const rgain = ctx.createGain(); rgain.gain.value = 0.22;
      rainSrc.connect(band).connect(rgain).connect(master); rainSrc.start();
    }

    const resume = () => ctx.resume();
    document.addEventListener('pointerdown', resume);
    return () => {
      document.removeEventListener('pointerdown', resume);
      oscs.forEach((o) => o.stop());
      lfo.stop(); drift.stop(); rainSrc?.stop();
      ctx.close();
    };
  }, [rain]);
  useEffect(() => { if (gainRef.current) gainRef.current.gain.value = muted ? 0 : 0.05; }, [muted]);
  return (
    <button className="quiet audio-toggle" data-testid="audio-toggle"
      onClick={() => setMuted((m) => !m)} aria-label={muted ? 'unmute ambience' : 'mute ambience'}>
      {muted ? '🔇' : '🔉'}
    </button>
  );
}
