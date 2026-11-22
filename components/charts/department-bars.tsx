/** Horizontal bars, largest first. Every value is printed, so the bars are decoration for the numbers. */
export function DepartmentBars({ data }: { data: { id: string; name: string; value: number }[] }) {
  const rows = [...data].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...rows.map((d) => d.value));
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((d) => (
        <li key={d.id} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-foreground/80">{d.name}</span>
          <span className="h-3 rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(d.value / max) * 100}%` }} />
          </span>
          <span className="text-right font-semibold tabular-nums">{d.value}</span>
        </li>
      ))}
    </ul>
  );
}
