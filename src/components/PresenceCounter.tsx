'use client';
import { useEffect, useState } from 'react';

export default function PresenceCounter({ fast = false }: { fast?: boolean }) {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch('/api/presence');
        if (!r.ok) throw new Error();
        const { count } = await r.json();
        if (alive) setCount(count);
      } catch { if (alive) setCount(null); }
    };
    load();
    const iv = setInterval(load, fast ? 2000 : 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [fast]);
  if (count === null || count < 1) return null;
  return (
    <p className="presence" data-testid="presence">
      {count === 1 ? '1 person is' : `${count} people are`} on a smoke break right now
    </p>
  );
}
