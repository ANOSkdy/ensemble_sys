import "server-only";

import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { query } from "@/lib/db";

export type AuthenticatedUser = {
  userId: string; // UUID
  orgId: string | null; // UUID or null
  email: string;
};

export async function requireUser(): Promise<AuthenticatedUser> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const session = await verifySessionToken(token);
  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  const userId = session.sub; // UUID string
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }

  const result = await query<{
    id: string;
    email: string;
    org_id: string | null;
  }>("SELECT id, email, org_id FROM users WHERE id = $1 LIMIT 1", [userId]);

  const user = result.rows[0];
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }

  return {
    userId: user.id,
    orgId: user.org_id ?? null,
    email: user.email
  };
}
