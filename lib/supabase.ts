import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Per-request client bound to the signed-in user's session cookies (anon key), so every query runs under RLS.
// The service-role key is used only by scripts/seed.ts.
export const db = cache(() => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY are not set");
  return createServerClient(url, key, {
    cookies: {
      getAll: async () => (await cookies()).getAll(),
      setAll: async (list) => {
        try {
          const jar = await cookies();
          list.forEach(({ name, value, options }) => jar.set(name, value, options));
        } catch {
          // Server Components can't set cookies; proxy.ts refreshes the session on every request.
        }
      },
    },
  });
});
