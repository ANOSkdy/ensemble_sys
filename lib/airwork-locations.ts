import { z } from "zod";
import { query } from "@/lib/db";
import { isMissingTableError } from "@/lib/clients";

const workingLocationIdSchema = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => /^[\x21-\x7E]+$/.test(value), {
    message: "VISIBLE_CHARS_ONLY"
  });

const optionalNameSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).max(255).optional()
);

const optionalMemoSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).max(5000).optional()
);

export const locationIdSchema = z.string().uuid();

export const airworkLocationInputSchema = z.object({
  workingLocationId: workingLocationIdSchema,
  nameJa: optionalNameSchema,
  memo: optionalMemoSchema
});

export const airworkLocationUpdateSchema = z.object({
  nameJa: optionalNameSchema,
  memo: optionalMemoSchema
});

export type AirworkLocationInput = z.infer<typeof airworkLocationInputSchema>;
export type AirworkLocationUpdate = z.infer<typeof airworkLocationUpdateSchema>;

export type AirworkLocation = {
  id: string;
  clientId: string;
  workingLocationId: string;
  nameJa: string | null;
  memo: string | null;
  updatedAt: string | null;
};

function mapLocation(row: {
  id: string;
  client_id: string;
  working_location_id: string;
  name_ja: string | null;
  memo: string | null;
  updated_at: string | null;
}): AirworkLocation {
  return {
    id: row.id,
    clientId: row.client_id,
    workingLocationId: row.working_location_id,
    nameJa: row.name_ja,
    memo: row.memo,
    updatedAt: row.updated_at
  };
}

export async function listLocations(
  orgId: string,
  clientId: string
): Promise<AirworkLocation[]> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      working_location_id: string;
      name_ja: string | null;
      memo: string | null;
      updated_at: string | null;
    }>(
      `SELECT al.id, al.client_id, al.working_location_id, al.name_ja, al.memo, al.updated_at
       FROM airwork_locations AS al
       INNER JOIN clients AS c ON c.id = al.client_id
       WHERE c.org_id = $1 AND al.client_id = $2
       ORDER BY al.updated_at DESC NULLS LAST, al.working_location_id ASC`,
      [orgId, clientId]
    );

    return result.rows.map(mapLocation);
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createLocation(
  orgId: string,
  clientId: string,
  data: AirworkLocationInput
): Promise<AirworkLocation | null> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      working_location_id: string;
      name_ja: string | null;
      memo: string | null;
      updated_at: string | null;
    }>(
      `WITH target_client AS (
         SELECT id
         FROM clients
         WHERE org_id = $1 AND id = $2
       )
       INSERT INTO airwork_locations (client_id, working_location_id, name_ja, memo)
       SELECT id, $3, $4, $5
       FROM target_client
       RETURNING id, client_id, working_location_id, name_ja, memo, updated_at`,
      [
        orgId,
        clientId,
        data.workingLocationId,
        data.nameJa ?? null,
        data.memo ?? null
      ]
    );

    const row = result.rows[0];
    return row ? mapLocation(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error("MISSING_AIRWORK_LOCATIONS_TABLE");
    }
    throw error;
  }
}

export async function updateLocation(
  orgId: string,
  clientId: string,
  locationId: string,
  data: AirworkLocationUpdate
): Promise<AirworkLocation | null> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      working_location_id: string;
      name_ja: string | null;
      memo: string | null;
      updated_at: string | null;
    }>(
      `UPDATE airwork_locations AS al
       SET name_ja = $4,
           memo = $5,
           updated_at = NOW()
       FROM clients AS c
       WHERE al.client_id = c.id
         AND c.org_id = $1
         AND al.client_id = $2
         AND al.id = $3
       RETURNING al.id, al.client_id, al.working_location_id, al.name_ja, al.memo, al.updated_at`,
      [orgId, clientId, locationId, data.nameJa ?? null, data.memo ?? null]
    );

    const row = result.rows[0];
    return row ? mapLocation(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function deleteLocation(
  orgId: string,
  clientId: string,
  locationId: string
): Promise<boolean> {
  try {
    const result = await query<{ id: string }>(
      `DELETE FROM airwork_locations AS al
       USING clients AS c
       WHERE al.client_id = c.id
         AND c.org_id = $1
         AND al.client_id = $2
         AND al.id = $3
       RETURNING al.id`,
      [orgId, clientId, locationId]
    );

    return result.rowCount > 0;
  } catch (error) {
    if (isMissingTableError(error)) {
      return false;
    }
    throw error;
  }
}
