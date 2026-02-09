import { NextResponse } from "next/server";
import { runFreshnessCron } from "@/lib/server/freshness";

export const runtime = "nodejs";

function isAuthorized(request: Request): boolean {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (!userAgent.includes("vercel-cron/1.0")) {
    return false;
  }
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const summary = await runFreshnessCron();
  return NextResponse.json({ ok: true, ...summary });
}
