import "server-only";

import { z } from "zod";
import { query } from "@/lib/db";

export type Client = {
  id: string;
  org_id: number;
  name: string;
  industry: string | null;
  owner_name: string | null;
  notes: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type ClientInput = {
  name: string;
  industry: string | null;
  ownerName: string | null;
  notes: string | null;
  timezone: string;
};

const clientIdSchema = z.string().uuid();

const clientInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  industry: z.string().trim().optional(),
  ownerName: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  timezone: z.string().trim().optional().default("Asia/Tokyo")
});

function toOptionalString(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseClientFormData(formData: FormData): ClientInput {
  const parsed = clientInputSchema.parse({
    name: toOptionalString(formData.get("name")),
    industry: toOptionalString(formData.get("industry")),
    ownerName: toOptionalString(formData.get("ownerName")),
    notes: toOptionalString(formData.get("notes")),
    timezone: toOptionalString(formData.get("timezone"))
  });

  return {
    name: parsed.name,
    industry: parsed.industry ?? null,
    ownerName: parsed.ownerName ?? null,
    notes: parsed.notes ?? null,
    timezone: parsed.timezone ?? "Asia/Tokyo"
  };
}

export async function listClients(
  orgId: number,
  queryText?: string
): Promise<Client[]> {
  const search = queryText?.trim();
  if (search) {
    const result = await query<Client>(
      `SELECT id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at
       FROM clients
       WHERE org_id = $1 AND name ILIKE $2
       ORDER BY created_at DESC`,
      [orgId, `%${search}%`]
    );
    return result.rows;
  }

  const result = await query<Client>(
    `SELECT id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at
     FROM clients
     WHERE org_id = $1
     ORDER BY created_at DESC`,
    [orgId]
  );

  return result.rows;
}

export async function createClient(
  orgId: number,
  data: ClientInput
): Promise<Client> {
  const result = await query<Client>(
    `INSERT INTO clients (org_id, name, industry, owner_name, notes, timezone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at`,
    [
      orgId,
      data.name,
      data.industry,
      data.ownerName,
      data.notes,
      data.timezone
    ]
  );

  return result.rows[0];
}

export async function getClient(
  orgId: number,
  clientId: string
): Promise<Client | null> {
  const id = clientIdSchema.parse(clientId);
  const result = await query<Client>(
    `SELECT id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at
     FROM clients
     WHERE org_id = $1 AND id = $2
     LIMIT 1`,
    [orgId, id]
  );

  return result.rows[0] ?? null;
}

export async function updateClient(
  orgId: number,
  clientId: string,
  data: ClientInput
): Promise<Client | null> {
  const id = clientIdSchema.parse(clientId);
  const result = await query<Client>(
    `UPDATE clients
     SET name = $1,
         industry = $2,
         owner_name = $3,
         notes = $4,
         timezone = $5,
         updated_at = NOW()
     WHERE org_id = $6 AND id = $7
     RETURNING id, org_id, name, industry, owner_name, notes, timezone, created_at, updated_at`,
    [
      data.name,
      data.industry,
      data.ownerName,
      data.notes,
      data.timezone,
      orgId,
      id
    ]
  );

  return result.rows[0] ?? null;
}

export function isValidClientId(clientId: string): boolean {
  return clientIdSchema.safeParse(clientId).success;
}
