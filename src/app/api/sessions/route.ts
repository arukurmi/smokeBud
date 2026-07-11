import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const { companionId } = await req.json().catch(() => ({}));
  if (typeof companionId !== 'string' || !companionId)
    return NextResponse.json({ error: 'companionId required' }, { status: 400 });
  const created = await db.breakSession.create({ data: { userId, companionId } });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
