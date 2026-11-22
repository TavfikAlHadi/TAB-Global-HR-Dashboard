import { ArrowDownRight, ArrowUpRight, Minus, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** tone = colour (good/bad); `falling` = arrow direction. They differ when down is good (fewer people out). */
export type Trend = { text: string; tone: "up" | "down" | "flat" | "warn"; falling?: boolean };
const TONE = {
  up: { cls: "text-emerald-700", Icon: ArrowUpRight },
  down: { cls: "text-destructive", Icon: ArrowDownRight },
  flat: { cls: "text-muted-foreground", Icon: Minus },
  warn: { cls: "text-amber-800", Icon: TriangleAlert },
};

/** Signed delta → chip. `goodWhenUp` false flips the colour (e.g. more people out is not "good"). */
export function deltaTrend(delta: number, suffix: string, goodWhenUp = true): Trend {
  if (delta === 0) return { text: `No change ${suffix}`, tone: "flat" };
  const up = delta > 0;
  return { text: `${up ? "+" : ""}${delta} ${suffix}`, tone: up === goodWhenUp ? "up" : "down", falling: !up };
}

export function KpiCard({ label, value, sub, trend }: { label: string; value: number | string; sub?: string; trend?: Trend }) {
  return (
    <Card className="gap-2 [--card-spacing:--spacing(4)] px-4 sm:[--card-spacing:--spacing(5)] sm:px-5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-[26px] leading-tight sm:text-[34px] font-semibold tabular-nums text-foreground">{value}</p>
      {sub && <p className="-mt-1 text-xs text-muted-foreground">{sub}</p>}
      {trend && <TrendLine {...trend} />}
    </Card>
  );
}

function TrendLine({ text, tone, falling }: Trend) {
  const Icon = tone === "up" || tone === "down" ? (falling ? ArrowDownRight : ArrowUpRight) : TONE[tone].Icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-[13px] font-medium", TONE[tone].cls)}>
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}
