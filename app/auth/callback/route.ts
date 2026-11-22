import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const ok = code ? !(await db().auth.exchangeCodeForSession(code)).error : false;
  return NextResponse.redirect(new URL(ok ? "/" : "/login?error=signin", req.url));
}
