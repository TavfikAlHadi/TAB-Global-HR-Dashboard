"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

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
