"use client";
import { useState } from "react";
import { ExternalLink, Search, TriangleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DEPARTMENT_NAME, STALE_DAYS } from "@/lib/constants";
import { cn, fmtDate } from "@/lib/utils";
import type { Sop } from "@/lib/data";

export function SopPanel({ sops }: { sops: Sop[] }) {
  const [q, setQ] = useState("");
  const [staleOnly, setStaleOnly] = useState(false);
  const staleCount = sops.filter((s) => s.stale).length;
  const needle = q.trim().toLowerCase();
  const shown = sops.filter(
    (s) =>
      (!staleOnly || s.stale) &&
      (!needle || [s.title, s.owner, DEPARTMENT_NAME[s.department_id], ...s.tags].some((t) => t.toLowerCase().includes(needle))),
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search SOPs, owners, tags" className="pl-8" aria-label="Search SOPs" />
        </div>
        {staleCount > 0 && (
          <button
            type="button"
            aria-pressed={staleOnly}
            onClick={() => setStaleOnly((v) => !v)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
              staleOnly ? "border-destructive bg-destructive/10 text-destructive" : "text-destructive hover:bg-destructive/5",
            )}
          >
            <TriangleAlert className="size-3.5" aria-hidden />
            {staleCount} stale (&gt;{STALE_DAYS} days)
          </button>
        )}
      </div>
      <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border">
        {shown.map((s) => (
          <li key={s.id} className="flex items-start gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{s.title}</p>
                {s.stale && (
                  <Badge variant="destructive" className="shrink-0">
                    <TriangleAlert aria-hidden /> Stale
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground">{DEPARTMENT_NAME[s.department_id]}</span>
                <span className="ml-2">{s.owner}</span>
                <span className="ml-2">Updated {fmtDate(s.last_updated)}</span>
              </p>
            </div>
            {s.sharepoint_url && (
              <a href={s.sharepoint_url} target="_blank" rel="noreferrer" className="mt-0.5 text-muted-foreground hover:text-primary" aria-label={`Open ${s.title} in SharePoint`}>
                <ExternalLink className="size-4" />
              </a>
            )}
          </li>
        ))}
        {shown.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No SOPs match.</li>}
      </ul>
    </div>
  );
}
