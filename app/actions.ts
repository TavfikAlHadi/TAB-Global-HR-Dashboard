"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/supabase";

export async function signIn() {
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const { data, error } = await db().auth.signInWithOAuth({
    provider: "azure",
    options: { scopes: "email", redirectTo: `${origin}/auth/callback` },
  });
  redirect(error || !data.url ? "/login?error=signin" : data.url);
}

export async function signOut() {
  await db().auth.signOut();
  redirect("/login");
}
