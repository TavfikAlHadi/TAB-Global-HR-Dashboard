import { Suspense } from "react";
import { connection } from "next/server";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/supabase";
import { signOut } from "@/app/actions";

async function Who() {
  await connection(); // per-request session: don't prerender
  const { data } = await db().auth.getUser();
  return data.user?.email ? ` (${data.user.email})` : "";
}

export default function NoAccessPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">
          Your Microsoft account<Suspense><Who /></Suspense> isn&apos;t linked to an active
          employee record. Ask HR to add you.
        </p>
        <form action={signOut}>
          <Button type="submit" variant="outline" size="lg" className="w-full">Sign out</Button>
        </form>
      </div>
    </main>
  );
}
