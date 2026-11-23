import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { db } from "./supabase";
import type { Role } from "./constants";

export type Me = { id: string; full_name: string; title: string; office_id: string; department_id: string; role: Role };

/** The signed-in, active employee. Matching rules live in SQL (current_employee_id). Unmatched → /no-access. */
export const currentEmployee = cache(async (): Promise<Me> => {
  await connection(); // identity is per request: never prerender, and don't build a client at build time
  const { data: id } = await db().rpc("current_employee_id");
  if (!id) redirect("/no-access");
  const { data, error } = await db()
    .from("employees")
    .select("id, full_name, title, office_id, department_id, role")
    .eq("id", id)
    .single();
  if (error || !data) redirect("/no-access");
  return data as Me;
});

export const currentRole = async (): Promise<Role> => (await currentEmployee()).role;

export const canViewAll = (r: Role) => r !== "employee";
export const canEditSops = (r: Role) => r === "hr_admin" || r === "super_admin";
