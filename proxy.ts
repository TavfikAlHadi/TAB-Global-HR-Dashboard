import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC = ["/login", "/auth/callback"];

// Refreshes the Supabase session cookie and sends signed-out visitors to /login.
// Pages re-check identity server-side (lib/role.ts); this is the first gate, not the only one.
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });
  const cacheHeaders: Record<string, string> = {}; // supplied on the first setAll only; re-applied whenever res is rebuilt
  const supabase = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list, headers) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        Object.assign(cacheHeaders, headers);
        Object.entries(cacheHeaders).forEach(([k, v]) => res.headers.set(k, v));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user && !PUBLIC.includes(req.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  return res;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.svg).*)"] };
