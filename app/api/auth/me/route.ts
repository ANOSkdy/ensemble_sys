import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user: { id: session.sub, email: session.email }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Missing AUTH_SECRET") {
      return NextResponse.json({ error: "Missing AUTH_SECRET" }, { status: 500 });
    }
    return NextResponse.json({ error: "Failed to verify session" }, { status: 500 });
  }
}
