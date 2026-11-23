"use client";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Fixed colour per department (validated for CVD separation); colour follows the department, never its rank.
const COLORS: Record<string, string> = {
  editorial: "#004EA8", research: "#0096A8", events: "#B8902F", sales: "#3A7BC8",
  marketing: "#2E8B57", technology: "#7A4FA0", "finance-admin": "#C8642A", management: "#5A6472",
};
const color = (id: string) => COLORS[id] ?? "#9BB8DC";

export function DepartmentPie({ data }: { data: { id: string; name: string; value: number }[] }) {
  const rows = data.filter((d) => d.value > 0);
  const total = rows.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="h-52 w-52 shrink-0" role="img" aria-label={`Headcount by department, ${total} people`}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" outerRadius={100} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
              {rows.map((d) => <Cell key={d.id} fill={color(d.id)} />)}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend doubles as the table view: every value is printed, so identity never relies on colour alone. */}
      <div className="w-full min-w-0">
        <p className="mb-2 text-sm text-muted-foreground"><span className="text-lg font-semibold text-foreground tabular-nums">{total}</span> people</p>
        <ul className="space-y-1.5 text-sm">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: color(d.id) }} aria-hidden />
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
