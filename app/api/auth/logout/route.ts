import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, getSessionCookieOptions } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const secure = forwardedProto ? forwardedProto === "https" : undefined;
  const options = getSessionCookieOptions({ secure });
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...options, maxAge: 0 });
  return response;
}
