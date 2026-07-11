import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { db } from '@/lib/db';
import { breaksThisWeek, dayStreak, heatStrip } from '@/lib/streaks';
import HeatStrip from '@/components/HeatStrip';

export const dynamic = 'force-dynamic';

export default async function History() {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/');
  const rows = await db.breakSession.findMany({
    where: { userId, completedAt: { not: null } },
    orderBy: { completedAt: 'desc' },
  });
  const dates = rows.map((r) => r.completedAt!) ;
  const now = new Date();
  const week = breaksThisWeek(dates, now);
  const streak = dayStreak(dates, now);
  return (
    <main className="landing history">
      <h1 className="wordmark">your breaks</h1>
      <p className="invite" data-testid="week-count">
        {week === 0 ? 'no breaks yet this week.' : `${week} break${week === 1 ? '' : 's'} this week.`}
      </p>
      <p data-testid="day-streak" className="streak">
        {streak === 0 ? 'no streak yet — start one tonight.' : `${streak}-day streak.`}
      </p>
      <HeatStrip data={heatStrip(dates, now)} />
      <Link href="/" className="quiet-link">back outside</Link>
    </main>
  );
}
