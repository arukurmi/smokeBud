export default function HeatStrip({ data }: { data: { date: string; count: number }[] }) {
  return (
    <div className="heat" data-testid="heat-strip">
      {data.map((d) => (
        <span key={d.date} title={`${d.date} — ${d.count} break${d.count === 1 ? '' : 's'}`}
          className="heat-cell"
          style={{ background: d.count === 0 ? 'transparent' : `rgba(217,108,63,${Math.min(1, 0.35 + d.count * 0.3)})` }} />
      ))}
    </div>
  );
}
