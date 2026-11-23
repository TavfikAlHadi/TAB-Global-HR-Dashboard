"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Soft palette, one fixed colour per department (colour follows the department, never its rank).
// Neighbours alternate light/darker so adjacent slices separate under colour-blindness too.
// Validated in this order (dataviz validate_palette.js, light): worst adjacent CVD ΔE 9.8, wrap pair 14.8.
// Re-validate if you reorder DEPARTMENTS or add one: slice order follows that list.
const COLORS: Record<string, string> = {
  editorial: "#5182C1", research: "#E1A263", events: "#179A8E", sales: "#D496CE",
  marketing: "#6B9C4F", technology: "#9E9BE4", "finance-admin": "#A97E2C", management: "#E69089",
};
const color = (id: string) => COLORS[id] ?? "#9BB8DC";

export function DepartmentPie({ data }: { data: { id: string; name: string; value: number }[] }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-52 w-52 shrink-0" role="img" aria-label={`Headcount by department, ${total} people`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius={64} outerRadius={100} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {rows.map((d) => <Cell key={d.id} fill={color(d.id)} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tabular-nums">{total}</span>
          <span className="text-xs text-muted-foreground">people</span>
        </div>
      </div>
      {/* Legend doubles as the table view: every value is printed, so identity never relies on colour alone. */}
      <div className="w-full min-w-0">
        <ul className="space-y-1.5 text-sm">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="size-3 shrink-0 rounded-full" style={{ background: color(d.id) }} aria-hidden />
              <span className="flex-1 truncate text-foreground">{d.name}</span>
              <span className="tabular-nums text-foreground">{d.value}</span>
              <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{total ? Math.round((d.value / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
