import { Suspense } from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import { loadCompanions } from '@/lib/companions';
import BreakFlow from '@/components/BreakFlow';
import SignIn from '@/components/SignIn';

export default async function Home() {
  const session = await auth();
  return (
    <main className="landing">
      <h1 className="wordmark">smokebud</h1>
      {session?.user ? (
        <>
          <Suspense><BreakFlow companions={loadCompanions()} /></Suspense>
          <Link href="/history" data-testid="history-link" className="quiet-link">your breaks →</Link>
        </>
      ) : (
        <>
          <p className="invite">take a break.</p>
          <SignIn />
        </>
      )}
    </main>
  );
}
