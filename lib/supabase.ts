import "server-only";
import { createClient } from "@supabase/supabase-js";

// Phase 1: server-only client with the service-role key (bypasses RLS).
// Phase 2 replaces this with a per-request client bound to the signed-in user's session.
export function db() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set");
  return createClient(url, key, { auth: { persistSession: false } });
}
