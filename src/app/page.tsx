import { Suspense } from 'react';
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
        <Suspense><BreakFlow companions={loadCompanions()} /></Suspense>
      ) : (
        <>
          <p className="invite">take a break.</p>
          <SignIn />
        </>
      )}
    </main>
  );
}
