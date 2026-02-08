import { z } from "zod";
import { query } from "@/lib/db";

const optionalTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).max(500).optional()
);

export const clientIdSchema = z.string().uuid();

export const clientInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  industry: optionalTextSchema,
  ownerName: optionalTextSchema,
  notes: optionalTextSchema,
  timezone: z.string().trim().min(1).max(100).default("Asia/Tokyo")
});

export type ClientInput = z.infer<typeof clientInputSchema>;

export type Client = {
  id: string;
  orgId: string; // UUID
  name: string;
  industry: string | null;
  ownerName: string | null;
  notes: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string | null;
};

export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

function mapClient(row: {
  id: string;
  org_id: string;
  name: string;
  industry: string | null;
  owner_name: string | null;
  notes: string | null;
  timezone: string;
  created_at: string;
  updated_at: string | null;
}): Client {
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    industry: row.industry,
    ownerName: row.owner_name,
    notes: row.notes,
    timezone: row.timezone,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listClients(
  orgId: string,
  search?: string
): Promise<Client[]> {
  const trimmed = search?.trim();
  const params: unknown[] = [orgId];
  let filter = "";

  if (trimmed) {
    params.push(`%${trimmed}%`);
    filter = "AND name ILIKE $2";
  }

  try {
    const result = await query<{
      id: string;
      org_id: string;
      name: string;
      industry: string | null;
      owner_name: string | null;
      notes: string | null;
      timezone: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `SELECT id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at
       FROM clients
       WHERE org_id = $1 ${filter}
       ORDER BY created_at DESC`,
      params
    );

    return result.rows.map(mapClient);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createClient(
  orgId: string,
  data: ClientInput
): Promise<Client> {
  try {
    const result = await query<{
      id: string;
      org_id: string;
      name: string;
      industry: string | null;
      owner_name: string | null;
      notes: string | null;
      timezone: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `INSERT INTO clients (org_id, name, industry, owner_name, notes, timezone)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at`,
      [
        orgId,
        data.name,
        data.industry ?? null,
        data.ownerName ?? null,
        data.notes ?? null,
        data.timezone
      ]
    );

    return mapClient(result.rows[0]);
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error("MISSING_CLIENTS_TABLE");
    }
    throw error;
  }
}

export async function getClient(
  orgId: string,
  clientId: string
): Promise<Client | null> {
  try {
    const result = await query<{
      id: string;
      org_id: string;
      name: string;
      industry: string | null;
      owner_name: string | null;
      notes: string | null;
      timezone: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `SELECT id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at
       FROM clients
       WHERE org_id = $1 AND id = $2
       LIMIT 1`,
      [orgId, clientId]
    );

    const row = result.rows[0];
    return row ? mapClient(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function updateClient(
  orgId: string,
  clientId: string,
  data: ClientInput
): Promise<Client | null> {
  try {
    const result = await query<{
      id: string;
      org_id: string;
      name: string;
      industry: string | null;
      owner_name: string | null;
      notes: string | null;
      timezone: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `UPDATE clients
       SET name = $1,
           industry = $2,
           owner_name = $3,
           notes = $4,
           timezone = $5
       WHERE org_id = $6 AND id = $7
       RETURNING id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at`,
      [
        data.name,
        data.industry ?? null,
        data.ownerName ?? null,
        data.notes ?? null,
        data.timezone,
        orgId,
        clientId
      ]
    );

    const row = result.rows[0];
    return row ? mapClient(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}
