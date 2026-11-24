// Reference data shared by the seed script and the UI filters.
export const OFFICES = [
  { id: "SG", name: "Singapore" },
  { id: "BJ", name: "Beijing" },
  { id: "DXB", name: "Dubai" },
  { id: "KL", name: "Kuala Lumpur" },
  { id: "MNL", name: "Manila" },
  { id: "REMOTE", name: "Remote" },
] as const;

export const BRANDS = [
  { id: "tab", name: "The Asian Banker" },
  { id: "tabinsights", name: "TABInsights" },
  { id: "wealth-society", name: "Wealth & Society" },
  { id: "radiofinance", name: "RadioFinance" },
  { id: "bankquality", name: "BankQuality" },
  { id: "banking-academy", name: "The Banking Academy" },
  { id: "skill-store", name: "The Skill Store" },
] as const;

export const DEPARTMENTS = [
  { id: "editorial", name: "Editorial" },
  { id: "research", name: "Research/TABInsights" },
  { id: "events", name: "Events & Forums" },
  { id: "sales", name: "Sales & Marketing" },
  { id: "marketing", name: "Creative" },
  { id: "technology", name: "Technology" },
  { id: "finance-admin", name: "Finance & Admin" },
  { id: "management", name: "Management" },
] as const;

export const ROLES = [
  { id: "employee", name: "Employee" },
  { id: "manager", name: "Manager" },
  { id: "hr_admin", name: "HR Admin" },
  { id: "super_admin", name: "Super Admin" },
] as const;

export type Role = (typeof ROLES)[number]["id"];

export const STALE_DAYS = 90;

// Platforms for the Recent social posts panel. `hosts` validates pasted links; `share` is the platform's
// web share screen (Instagram and TikTok have none, so the panel copies the link instead).
export const SOCIAL_PLATFORMS = [
  { id: "linkedin", name: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"], share: (u: string) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}` },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.com", "fb.watch"], share: (u: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
  { id: "instagram", name: "Instagram", hosts: ["instagram.com"], share: null },
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"], share: null },
] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]["id"];

/** Null if `url` is an https link on one of the platform's hosts, else the reason it isn't. */
export function socialUrlProblem(platform: string, url: string): string | null {
  const p = SOCIAL_PLATFORMS.find((x) => x.id === platform);
  if (!p) return "Pick a platform.";
  let u: URL;
  try { u = new URL(url); } catch { return "That isn't a valid link."; }
  if (u.protocol !== "https:") return "Use the post's https:// link.";
  const host = u.hostname.toLowerCase();
  return p.hosts.some((h) => host === h || host.endsWith(`.${h}`)) ? null : `That isn't a ${p.name} link.`;
}

// Share-tracking parameters platforms add to copied links. LinkedIn's `rcm` and Instagram's `igsh` identify
// the person who copied the link, so they must not ride along on every staff share.
const TRACKING = /^(utm_.+|rcm|igsh|igshid|si|fbclid|_r|_t|mibextid|ref|refsrc)$/i;

/** The link without tracking parameters or fragment. Real post parameters (e.g. Facebook story_fbid) stay. */
export function cleanSocialUrl(url: string): string {
  const u = new URL(url);
  for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
  u.hash = "";
  return u.toString();
}

// Directory status, derived in getDirectory (lib/data.ts).
export const STATUSES = ["Active", "On leave", "Probation", "Starting soon", "Notice period"] as const;
export type Status = (typeof STATUSES)[number];

const byId = <T extends { id: string; name: string }>(list: readonly T[]) =>
  Object.fromEntries(list.map((x) => [x.id, x.name])) as Record<string, string>;
export const OFFICE_NAME = byId(OFFICES);
export const BRAND_NAME = byId(BRANDS);
export const DEPARTMENT_NAME = byId(DEPARTMENTS);
