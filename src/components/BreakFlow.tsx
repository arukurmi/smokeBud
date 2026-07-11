'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CompanionManifest } from '@/lib/companions';
import CompanionPicker from './CompanionPicker';
import BreakPlayer from './BreakPlayer';

type Stage = 'pick' | 'smoking' | 'done';

export default function BreakFlow({ companions }: { companions: CompanionManifest[] }) {
  const fast = useSearchParams().get('fast') === '1';
  const [stage, setStage] = useState<Stage>('pick');
  const [current, setCurrent] = useState<CompanionManifest | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  async function begin(id: string) {
    setCurrent(companions.find((c) => c.id === id)!);
    setStage('smoking');
    try {
      const r = await fetch('/api/sessions', { method: 'POST', body: JSON.stringify({ companionId: id }) });
      if (r.ok) setSessionId((await r.json()).id);
    } catch { /* ritual never blocks */ }
  }

  useEffect(() => {
    if (stage !== 'smoking' || !sessionId) return;
    const every = fast ? 3000 : 30000;
    const iv = setInterval(() => {
      fetch(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST' }).catch(() => {});
    }, every);
    return () => clearInterval(iv);
  }, [stage, sessionId, fast]);

  async function finish(note: string) {
    if (sessionId) {
      try {
        await fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST', body: JSON.stringify({ moodNote: note }),
        });
      } catch { /* silent */ }
    }
    setStage('done');
  }

  if (stage === 'pick') return (
    <CompanionPicker companions={companions}
      onPick={begin} />
  );
  if (stage === 'smoking' && current) return (
    <BreakPlayer manifest={current} fast={fast} onComplete={() => finish('')} />
  );
  return (
    <div className="winddown-screen">
      <p className="invite">see you next break.</p>
      <button className="quiet" data-testid="restart" onClick={() => setStage('pick')}>another break</button>
    </div>
  );
}
