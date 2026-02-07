import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const options = getSessionCookieOptions();
  cookies().set(SESSION_COOKIE_NAME, "", { ...options, maxAge: 0 });
  return NextResponse.json({ ok: true });
}
