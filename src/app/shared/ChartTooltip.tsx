function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1">{label}요일</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="leading-relaxed">
          {p.dataKey}: {p.value}명
        </p>
      ))}
    </div>
  );
}

export default ChartTooltip;