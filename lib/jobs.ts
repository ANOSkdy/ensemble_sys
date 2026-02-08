import { z } from "zod";
import { getPool, query } from "@/lib/db";

export const jobStatusSchema = z.enum(["active", "archived"]);

export const jobInputSchema = z.object({
  internalTitle: z.string().trim().min(1).max(200),
  clientId: z.string().uuid(),
  status: jobStatusSchema.default("active")
});

export type JobInput = z.infer<typeof jobInputSchema>;

export type JobListItem = {
  id: string;
  orgId: string;
  clientId: string;
  clientName: string;
  internalTitle: string;
  status: "active" | "archived";
  jobOfferId: string | null;
  freshnessExpiresAt: string | null;
  isRefreshCandidate: boolean | null;
  updatedAt: string | null;
};

export type JobListFilters = {
  orgId: string;
  clientId?: string;
  search?: string;
  status?: "active" | "archived";
  hasJobOfferId?: "yes" | "no";
  refreshCandidate?: "yes" | "no";
};

function isMissingTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "42P01"
  );
}

export async function listJobs(filters: JobListFilters): Promise<JobListItem[]> {
  const params: unknown[] = [filters.orgId];
  const conditions = ["jobs.org_id = $1"];
  let paramIndex = 2;

  if (filters.clientId) {
    conditions.push(`jobs.client_id = $${paramIndex}`);
    params.push(filters.clientId);
    paramIndex += 1;
  }

  if (filters.status) {
    conditions.push(`jobs.status = $${paramIndex}`);
    params.push(filters.status);
    paramIndex += 1;
  }

  const trimmed = filters.search?.trim();
  if (trimmed) {
    conditions.push(
      `(jobs.internal_title ILIKE $${paramIndex} OR clients.name ILIKE $${paramIndex})`
    );
    params.push(`%${trimmed}%`);
    paramIndex += 1;
  }

  if (filters.hasJobOfferId === "yes") {
    conditions.push("posting.job_offer_id IS NOT NULL");
  } else if (filters.hasJobOfferId === "no") {
    conditions.push("posting.job_offer_id IS NULL");
  }

  if (filters.refreshCandidate === "yes") {
    conditions.push("posting.is_refresh_candidate = true");
  } else if (filters.refreshCandidate === "no") {
    conditions.push(
      "(posting.is_refresh_candidate = false OR posting.is_refresh_candidate IS NULL)"
    );
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  try {
    const result = await query<{
      id: string;
      org_id: string;
      client_id: string;
      client_name: string;
      internal_title: string;
      status: "active" | "archived";
      job_offer_id: string | null;
      freshness_expires_at: string | null;
      is_refresh_candidate: boolean | null;
      updated_at: string | null;
    }>(
      `SELECT jobs.id,
              jobs.org_id,
              jobs.client_id,
              clients.name AS client_name,
              jobs.internal_title,
              jobs.status,
              posting.job_offer_id,
              posting.freshness_expires_at,
              posting.is_refresh_candidate,
              jobs.updated_at
       FROM jobs
       JOIN clients
         ON clients.id = jobs.client_id
        AND clients.org_id = jobs.org_id
       LEFT JOIN LATERAL (
         SELECT job_offer_id, freshness_expires_at, is_refresh_candidate
         FROM job_postings
         WHERE job_postings.job_id = jobs.id
         ORDER BY job_postings.created_at DESC NULLS LAST
         LIMIT 1
       ) AS posting ON true
       ${whereClause}
       ORDER BY jobs.updated_at DESC NULLS LAST, jobs.id DESC`,
      params
    );

    return result.rows.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      clientId: row.client_id,
      clientName: row.client_name,
      internalTitle: row.internal_title,
      status: row.status,
      jobOfferId: row.job_offer_id,
      freshnessExpiresAt: row.freshness_expires_at,
      isRefreshCandidate: row.is_refresh_candidate,
      updatedAt: row.updated_at
    }));
  } catch (error) {
    if (isMissingTableError(error)) {
      return [];
    }
    throw error;
  }
}

export async function createJob(
  orgId: string,
  data: JobInput
): Promise<{ id: string }> {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const jobResult = await client.query<{ id: string }>(
      `INSERT INTO jobs (org_id, client_id, internal_title, status)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [orgId, data.clientId, data.internalTitle, data.status]
    );

    const jobId = jobResult.rows[0]?.id;
    if (!jobId) {
      throw new Error("JOB_INSERT_FAILED");
    }

    await client.query(
      `INSERT INTO job_postings (job_id, channel, job_offer_id)
       VALUES ($1, $2, $3)`,
      [jobId, "airwork", null]
    );

    await client.query("COMMIT");
    return { id: jobId };
  } catch (error) {
    await client.query("ROLLBACK");
    if (isMissingTableError(error)) {
      throw new Error("MISSING_JOBS_TABLE");
    }
    throw error;
  } finally {
    client.release();
  }
}
