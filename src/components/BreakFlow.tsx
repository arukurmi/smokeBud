'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { CompanionManifest } from '@/lib/companions';
import CompanionPicker from './CompanionPicker';
import BreakPlayer from './BreakPlayer';

type Stage = 'pick' | 'smoking' | 'done';

export default function BreakFlow({ companions }: { companions: CompanionManifest[] }) {
  const fast = useSearchParams().get('fast') === '1';
  const [stage, setStage] = useState<Stage>('pick');
  const [current, setCurrent] = useState<CompanionManifest | null>(null);

  if (stage === 'pick') return (
    <CompanionPicker companions={companions}
      onPick={(id) => { setCurrent(companions.find((c) => c.id === id)!); setStage('smoking'); }} />
  );
  if (stage === 'smoking' && current) return (
    <BreakPlayer manifest={current} fast={fast} onComplete={() => setStage('done')} />
  );
  return (
    <div className="winddown-screen">
      <p className="invite">see you next break.</p>
      <button className="quiet" data-testid="restart" onClick={() => setStage('pick')}>another break</button>
    </div>
  );
}
