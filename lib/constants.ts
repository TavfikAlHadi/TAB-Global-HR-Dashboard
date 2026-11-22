// Reference data shared by the seed script and the UI filters.
export const OFFICES = [
  { id: "SG", name: "Singapore" },
  { id: "BJ", name: "Beijing" },
  { id: "DXB", name: "Dubai" },
  { id: "KL", name: "Kuala Lumpur" },
  { id: "MNL", name: "Manila" },
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
  { id: "sales", name: "Sales" },
  { id: "marketing", name: "Marketing" },
  { id: "technology", name: "Technology" },
  { id: "finance-admin", name: "Finance & Admin" },
] as const;

export const ROLES = [
  { id: "employee", name: "Employee" },
  { id: "manager", name: "Manager" },
  { id: "hr_admin", name: "HR Admin" },
  { id: "super_admin", name: "Super Admin" },
] as const;

export type Role = (typeof ROLES)[number]["id"];

export const STALE_DAYS = 90;

// Directory status, derived in getDirectory (lib/data.ts).
export const STATUSES = ["Active", "On leave", "Probation", "Starting soon", "Notice period"] as const;
export type Status = (typeof STATUSES)[number];

// Seeded employee the Employee view pretends to be until real login (Phase 2).
export const DEMO_EMPLOYEE_EMAIL = "mei.ling.tan@tabglobal.example";

const byId = <T extends { id: string; name: string }>(list: readonly T[]) =>
  Object.fromEntries(list.map((x) => [x.id, x.name])) as Record<string, string>;
export const OFFICE_NAME = byId(OFFICES);
export const BRAND_NAME = byId(BRANDS);
export const DEPARTMENT_NAME = byId(DEPARTMENTS);
