import { Suspense } from 'react';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { loadCompanions } from '@/lib/companions';
import BreakFlow from '@/components/BreakFlow';
import SignIn from '@/components/SignIn';
import SmokeBackdrop from '@/components/SmokeBackdrop';
import PresenceCounter from '@/components/PresenceCounter';

export default async function Home() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const pref = userId ? await db.preference.findUnique({ where: { userId } }) : null;
  return (
    <>
      <SmokeBackdrop />
      <header className="hud-top">
        <span className="wordmark">smokebud</span>
        {session?.user && (
          <Link href="/history" data-testid="history-link" className="quiet-link">your breaks</Link>
        )}
      </header>
      <main className="landing">
        {session?.user ? (
          <Suspense><BreakFlow companions={loadCompanions()} favoriteId={pref?.favoriteCompanionId} /></Suspense>
        ) : (
          <section className="hero">
            <p className="eyebrow">open all night · no feed · no likes</p>
            <h1 className="invite">take a break.</h1>
            <p className="sub">
              five quiet minutes with a companion who doesn&apos;t need you to talk.
              watch the smoke curl, hear the night hum, then go back inside.
            </p>
            <SignIn />
            <PresenceCounter inline />
          </section>
        )}
      </main>
    </>
  );
}
