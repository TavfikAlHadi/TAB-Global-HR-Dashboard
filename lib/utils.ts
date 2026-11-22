export { cn } from "cn"

/** "2026-11-22" → "22 Nov 2026" (UTC, so the calendar date never shifts). */
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) =>
  // Newer ICU (Node) writes "Sept", browsers "Sep": normalise so server and client HTML match.
  new Date(iso.slice(0, 10)).toLocaleDateString("en-GB", { ...opts, timeZone: "UTC" }).replace("Sept", "Sep");

/** Mon–Fri of the current week (next week when today is a weekend). */
export function workWeek(today: string) {
  const d = new Date(today);
  const dow = d.getUTCDay();
  const monday = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow;
  return Array.from({ length: 5 }, (_, i) => new Date(d.getTime() + (monday + i) * 864e5).toISOString().slice(0, 10));
}
