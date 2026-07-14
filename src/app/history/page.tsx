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
  const notes = rows.filter((r) => r.moodNote).slice(0, 20);
  return (
    <>
      <header className="hud-top">
        <Link href="/" className="wordmark wordmark-link">smokebud</Link>
        <Link href="/" className="quiet-link">back outside</Link>
      </header>
      <main className="landing history">
        <p className="eyebrow">the ashtray remembers</p>
        <p className="invite" data-testid="week-count">
          {week === 0 ? 'no breaks yet this week.' : `${week} break${week === 1 ? '' : 's'} this week.`}
        </p>
        <p data-testid="day-streak" className="streak">
          {streak === 0 ? 'no streak yet — start one tonight.' : `${streak}-day streak.`}
        </p>
        <div className="heat-wrap">
          <HeatStrip data={heatStrip(dates, now)} />
          <p className="heat-caption">the last four weeks, one cell a night</p>
        </div>
        <section className="notes" data-testid="mood-timeline">
          {notes.length === 0 ? (
            <p className="empty">no notes yet — your thoughts stay here, just for you.</p>
          ) : notes.map((n) => (
            <p key={n.id} className="note">
              <span className="note-meta">
                <span className="note-date">{n.completedAt!.toISOString().slice(0, 10)}</span>
                <span className="note-companion"> · with {n.companionId}</span>
              </span>
              {n.moodNote}
            </p>
          ))}
        </section>
      </main>
    </>
  );
}
