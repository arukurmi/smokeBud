import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { presenceCutoff } from '@/lib/presence';

export const dynamic = 'force-dynamic';

export async function GET() {
  const count = await db.breakSession.count({
    where: { completedAt: null, lastHeartbeatAt: { gte: presenceCutoff(new Date()) } },
  });
  return NextResponse.json({ count });
}
