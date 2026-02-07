import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }
  if (pathname.startsWith("/api/health")) {
    return true;
  }
  if (pathname.startsWith("/api/auth")) {
    return true;
  }
  if (pathname.startsWith("/_next")) {
    return true;
  }
  if (pathname === "/favicon.ico") {
    return true;
  }
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const session = await verifySessionToken(token);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  } catch (error) {
    if (error instanceof Error && error.message === "Missing AUTH_SECRET") {
      return NextResponse.json({ error: "Missing AUTH_SECRET" }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
