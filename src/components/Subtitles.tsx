'use client';
import { useEffect, useRef, useState } from 'react';
import { pickLine } from '@/lib/lines';

export default function Subtitles({ fast = false }: { fast?: boolean }) {
  const [line, setLine] = useState<string | null>(null);
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    const every = fast ? 2000 : 60000, showFor = fast ? 1000 : 6000;
    const show = () => {
      const l = pickLine(Math.random, last.current);
      last.current = l; setLine(l);
      setTimeout(() => setLine(null), showFor);
    };
    const first = setTimeout(show, fast ? 500 : 20000);
    const iv = setInterval(show, every);
    return () => { clearTimeout(first); clearInterval(iv); };
  }, [fast]);
  if (!line) return null;
  return <p className="subtitle" data-testid="subtitle">{line}</p>;
}
