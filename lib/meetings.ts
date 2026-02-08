import { z } from "zod";
import { query } from "@/lib/db";

export const meetingIdSchema = z.string().uuid();
export const meetingMemoSchema = z.string().trim().min(1).max(20000);

export type MeetingListItem = {
  id: string;
  clientId: string;
  clientName: string;
  heldAt: string | null;
  memo: string;
  createdByEmail: string | null;
  updatedAt: string | null;
};

export type MeetingDetail = MeetingListItem & {
  createdAt: string;
  updatedByEmail: string | null;
};

export type MeetingFilters = {
  clientId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export type MeetingCreateInput = {
  clientId: string;
  heldAt: string | null;
  memo: string;
};

export type MeetingUpdateInput = {
  heldAt?: string | null;
  memo?: string;
};

export function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function listMeetings(
  orgId: string,
  filters: MeetingFilters = {}
): Promise<MeetingListItem[]> {
  const conditions: string[] = ["meetings.org_id = $1"];
  const params: unknown[] = [orgId];
  let index = params.length + 1;

  if (filters.clientId) {
    conditions.push(`meetings.client_id = $${index++}`);
    params.push(filters.clientId);
  }

  if (filters.startDate) {
    conditions.push(`DATE(meetings.held_at) >= $${index++}`);
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    conditions.push(`DATE(meetings.held_at) <= $${index++}`);
    params.push(filters.endDate);
  }

  if (filters.search) {
    conditions.push(`meetings.memo ILIKE $${index++}`);
    params.push(`%${filters.search}%`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  try {
    const result = await query<{
      id: string;
      client_id: string;
      client_name: string;
      held_at: string | null;
      memo: string;
      created_by_email: string | null;
      updated_at: string | null;
    }>(
      `SELECT meetings.id,
              meetings.client_id,
              clients.name AS client_name,
              meetings.held_at,
              meetings.memo,
              created_user.email AS created_by_email,
              COALESCE(meetings.updated_at, meetings.created_at) AS updated_at
       FROM client_meetings AS meetings
       JOIN clients
         ON clients.id = meetings.client_id
        AND clients.org_id = meetings.org_id
       LEFT JOIN users AS created_user
         ON created_user.id = meetings.created_by
       ${whereClause}
       ORDER BY meetings.held_at DESC NULLS LAST, meetings.created_at DESC`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      heldAt: row.held_at,
      memo: row.memo,
      createdByEmail: row.created_by_email,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function getMeeting(
  orgId: string,
  meetingId: string
): Promise<MeetingDetail | null> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      client_name: string;
      held_at: string | null;
      memo: string;
      created_at: string;
      updated_at: string | null;
      created_by_email: string | null;
      updated_by_email: string | null;
    }>(
      `SELECT meetings.id,
              meetings.client_id,
              clients.name AS client_name,
              meetings.held_at,
              meetings.memo,
              meetings.created_at,
              meetings.updated_at,
              created_user.email AS created_by_email,
              updated_user.email AS updated_by_email
       FROM client_meetings AS meetings
       JOIN clients
         ON clients.id = meetings.client_id
        AND clients.org_id = meetings.org_id
       LEFT JOIN users AS created_user
         ON created_user.id = meetings.created_by
       LEFT JOIN users AS updated_user
         ON updated_user.id = meetings.updated_by
       WHERE meetings.org_id = $1 AND meetings.id = $2
       LIMIT 1`,
      [orgId, meetingId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      clientId: row.client_id,
      clientName: row.client_name,
      heldAt: row.held_at,
      memo: row.memo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByEmail: row.created_by_email,
      updatedByEmail: row.updated_by_email
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function createMeeting(
  orgId: string,
  userId: string,
  data: MeetingCreateInput
): Promise<MeetingDetail> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      held_at: string | null;
      memo: string;
      created_at: string;
      updated_at: string | null;
    }>(
      `INSERT INTO client_meetings (
         org_id,
         client_id,
         held_at,
         memo,
         created_by,
         updated_by,
         created_at,
         updated_at
       ) VALUES ($1, $2, COALESCE($3, NOW()), $4, $5, $5, NOW(), NOW())
       RETURNING id, client_id, held_at, memo, created_at, updated_at`,
      [orgId, data.clientId, data.heldAt, data.memo, userId]
    );

    const row = result.rows[0];
    return {
      id: row.id,
      clientId: row.client_id,
      clientName: "",
      heldAt: row.held_at,
      memo: row.memo,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdByEmail: null,
      updatedByEmail: null
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error("MISSING_CLIENT_MEETINGS_TABLE");
    }
    throw error;
  }
}

export async function updateMeeting(
  orgId: string,
  meetingId: string,
  userId: string,
  updates: MeetingUpdateInput
): Promise<{ rowCount: number }> {
  const fields: string[] = ["updated_by = $3", "updated_at = NOW()"];
  const values: unknown[] = [orgId, meetingId, userId];
  let index = values.length + 1;

  if (updates.memo !== undefined) {
    fields.push(`memo = $${index++}`);
    values.push(updates.memo);
  }

  if (updates.heldAt !== undefined) {
    fields.push(`held_at = $${index++}`);
    values.push(updates.heldAt);
  }

  try {
    const result = await query(
      `UPDATE client_meetings
       SET ${fields.join(", ")}
       WHERE org_id = $1 AND id = $2`,
      values
    );

    return { rowCount: result.rowCount ?? 0 };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { rowCount: 0 };
    }
    throw error;
  }
}
