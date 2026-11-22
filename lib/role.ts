import "server-only";
import { cookies } from "next/headers";
import { ROLES, type Role } from "./constants";

export const ROLE_COOKIE = "demo_role";

// Phase 1: role comes from the demo switcher cookie. Phase 2: from the signed-in user's employees.role.
export async function currentRole(): Promise<Role> {
  const v = (await cookies()).get(ROLE_COOKIE)?.value;
  return ROLES.some((r) => r.id === v) ? (v as Role) : "hr_admin";
}

export const canViewAll = (r: Role) => r !== "employee";
export const canEditSops = (r: Role) => r === "hr_admin" || r === "super_admin";
