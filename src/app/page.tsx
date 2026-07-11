import { Suspense } from 'react';
import { loadCompanions } from '@/lib/companions';
import BreakFlow from '@/components/BreakFlow';

export default function Home() {
  const companions = loadCompanions();
  return (
    <main className="landing">
      <h1 className="wordmark">smokebud</h1>
      <Suspense><BreakFlow companions={companions} /></Suspense>
    </main>
  );
}
