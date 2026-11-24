"use server";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { db } from "@/lib/supabase";
import { currentEmployee, canEditSops } from "@/lib/role";
import { cleanSocialUrl, socialUrlProblem } from "@/lib/constants";

// Interim email + password sign-in. Microsoft 365 comes back later via signInWithOAuth({ provider: "azure" })
// (see git history); /auth/callback is kept for it.
export async function signIn(form: FormData) {
  const { error } = await db().auth.signInWithPassword({
    email: String(form.get("email") ?? "").trim(),
    password: String(form.get("password") ?? ""),
  });
  redirect(error ? "/login?error=signin" : "/");
}

export async function signOut() {
  await db().auth.signOut();
  redirect("/login");
}

export type FormState = { error?: string; ok?: number };

/** HR only (RLS enforces it too). Returns an error message for the form, or bumps `ok` so it can reset. */
export async function addSocialPost(prev: FormState, form: FormData): Promise<FormState> {
  const me = await currentEmployee();
  if (!canEditSops(me.role)) return { error: "Only HR can add posts." };
  const platform = String(form.get("platform") ?? "");
  const url = String(form.get("url") ?? "").trim();
  const caption = String(form.get("caption") ?? "").trim();
  const problem = socialUrlProblem(platform, url) ?? (!caption ? "Add a short caption." : caption.length > 280 ? "Keep the caption under 280 characters." : null);
  if (problem) return { error: problem };
  const { error } = await db().from("social_posts").insert({ platform, url: cleanSocialUrl(url), caption, created_by: me.id });
  if (error) return { error: "Couldn't save the post. Try again." };
  refresh();
  return { ok: (prev.ok ?? 0) + 1 };
}

export async function removeSocialPost(id: string) {
  const me = await currentEmployee();
  if (!canEditSops(me.role)) return;
  await db().from("social_posts").delete().eq("id", id);
  refresh();
}
