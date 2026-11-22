import { NextResponse, type NextRequest } from "next/server";

// Shared demo password (HTTP Basic auth) for the Phase 1 preview. Removed in Phase 2 when real login lands.
// Any username works; only the password is checked. Skipped when DEMO_PASSWORD is unset (local dev).
export function proxy(req: NextRequest) {
  const password = process.env.DEMO_PASSWORD;
  if (!password) return NextResponse.next();
  const header = req.headers.get("authorization") ?? "";
  const [scheme, encoded] = header.split(" ");
  if (scheme === "Basic" && encoded) {
    let decoded = "";
    try { decoded = atob(encoded); } catch {} // malformed base64 → fall through to 401
    if (decoded.includes(":") && decoded.slice(decoded.indexOf(":") + 1) === password) return NextResponse.next();
  }
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="TAB Global HR Dashboard"' },
  });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
