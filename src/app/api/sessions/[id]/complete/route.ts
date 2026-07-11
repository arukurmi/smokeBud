import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const note = typeof body.moodNote === 'string' ? body.moodNote.trim().slice(0, 280) : '';
  const found = await db.breakSession.findFirst({ where: { id, userId } });
  if (!found) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await db.breakSession.update({
    where: { id }, data: { completedAt: new Date(), moodNote: note || null },
  });
  await db.preference.upsert({
    where: { userId },
    update: { favoriteCompanionId: found.companionId },
    create: { userId, favoriteCompanionId: found.companionId },
  });
  return NextResponse.json({ ok: true });
}
