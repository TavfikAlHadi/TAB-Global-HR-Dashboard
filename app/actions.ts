"use server";
import { cookies } from "next/headers";
import { ROLES } from "@/lib/constants";
import { ROLE_COOKIE } from "@/lib/role";

export async function setRole(role: string) {
  if (!ROLES.some((r) => r.id === role)) return;
  (await cookies()).set(ROLE_COOKIE, role, { path: "/", sameSite: "lax", httpOnly: true });
}
