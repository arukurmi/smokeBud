function dayKey(dt: Date): string {
  const y = dt.getFullYear(), m = String(dt.getMonth() + 1).padStart(2, '0'), d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function startOfWeek(now: Date): Date {
  const s = new Date(now); s.setHours(0, 0, 0, 0);
  const day = (s.getDay() + 6) % 7; // Monday = 0
  s.setDate(s.getDate() - day);
  return s;
}

export function breaksThisWeek(completedDates: Date[], now: Date): number {
  const start = startOfWeek(now).getTime();
  return completedDates.filter((d) => d.getTime() >= start && d.getTime() <= now.getTime()).length;
}

export function dayStreak(completedDates: Date[], now: Date): number {
  const days = new Set(completedDates.map(dayKey));
  const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1); // allow streak ending yesterday
  let streak = 0;
  while (days.has(dayKey(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

export function heatStrip(completedDates: Date[], now: Date, days = 84): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const d of completedDates) counts.set(dayKey(d), (counts.get(dayKey(d)) ?? 0) + 1);
  const out: { date: string; count: number }[] = [];
  const cursor = new Date(now); cursor.setHours(12, 0, 0, 0);
  cursor.setDate(cursor.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const key = dayKey(cursor);
    out.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}
