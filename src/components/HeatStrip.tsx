export default function HeatStrip({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="heat" data-testid="heat-strip">
      {data.map((d) => (
        <span key={d.date} title={`${d.date} — ${d.count} break${d.count === 1 ? '' : 's'}`}
          className={`heat-cell${d.count > 0 ? ' lit' : ''}`}
          style={{ background: d.count === 0 ? 'transparent' : `rgba(255,122,51,${Math.min(1, 0.3 + d.count * 0.28)})` }} />
      ))}
    </div>
  );
}
