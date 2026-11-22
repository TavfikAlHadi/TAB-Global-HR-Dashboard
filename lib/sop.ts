import { STALE_DAYS } from "./constants";

/** Days between two ISO dates (YYYY-MM-DD), UTC-based so time zones don't shift the count. */
export function daysSince(lastUpdated: string, today: string): number {
  return Math.round((Date.parse(today) - Date.parse(lastUpdated)) / 864e5);
}

/** An SOP is stale when it has not been updated for more than STALE_DAYS (90) days. */
export function isStale(lastUpdated: string, today: string): boolean {
  return daysSince(lastUpdated, today) > STALE_DAYS;
}
