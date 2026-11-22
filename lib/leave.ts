import { fmtDate } from "./utils";
import type { Absence } from "./data";

export type Span = Pick<Absence, "kind" | "leave_type" | "start_date" | "end_date">;
export const what = (a: Span) => (a.kind === "wfh" ? "WFH" : `${a.leave_type?.replace(/^\w/, (c) => c.toUpperCase()) ?? "Other"} leave`);
/** Calendar days, inclusive. */
export const dayCount = (a: Span) => Math.round((Date.parse(a.end_date) - Date.parse(a.start_date)) / 864e5) + 1;
export const dateRange = (a: Span) => {
  const d = (iso: string) => fmtDate(iso, { day: "numeric", month: "short" });
  return a.start_date === a.end_date ? d(a.start_date) : `${d(a.start_date)} – ${d(a.end_date)}`;
};
