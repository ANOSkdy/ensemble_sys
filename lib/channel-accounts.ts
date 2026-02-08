import { z } from "zod";
import { query } from "@/lib/db";
import { isMissingTableError } from "@/lib/clients";

const optionalShortTextSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  },
  z.string().min(1).max(200).optional()
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

export const channelAccountInputSchema = z.object({
  managementUrl: z.string().trim().url().max(2000),
  loginId: optionalShortTextSchema,
  memo: optionalMemoSchema
});

export type ChannelAccountInput = z.infer<typeof channelAccountInputSchema>;

export type ChannelAccount = {
  id: string;
  clientId: string;
  channel: string;
  managementUrl: string;
  loginId: string | null;
  memo: string | null;
  updatedAt: string | null;
};

const CHANNEL = "airwork" as const;

function mapChannelAccount(row: {
  id: string;
  client_id: string;
  channel: string;
  management_url: string;
  login_id: string | null;
  memo: string | null;
  updated_at: string | null;
}): ChannelAccount {
  return {
    id: row.id,
    clientId: row.client_id,
    channel: row.channel,
    managementUrl: row.management_url,
    loginId: row.login_id,
    memo: row.memo,
    updatedAt: row.updated_at
  };
}

export async function getChannelAccount(
  orgId: string,
  clientId: string
): Promise<ChannelAccount | null> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      channel: string;
      management_url: string;
      login_id: string | null;
      memo: string | null;
      updated_at: string | null;
    }>(
      `SELECT ca.id, ca.client_id, ca.channel, ca.management_url, ca.login_id, ca.memo, ca.updated_at
       FROM channel_accounts AS ca
       INNER JOIN clients AS c ON c.id = ca.client_id
       WHERE c.org_id = $1 AND ca.client_id = $2 AND ca.channel = $3
       LIMIT 1`,
      [orgId, clientId, CHANNEL]
    );

    const row = result.rows[0];
    return row ? mapChannelAccount(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function upsertChannelAccount(
  orgId: string,
  clientId: string,
  data: ChannelAccountInput
): Promise<ChannelAccount | null> {
  try {
    const result = await query<{
      id: string;
      client_id: string;
      channel: string;
      management_url: string;
      login_id: string | null;
      memo: string | null;
      updated_at: string | null;
    }>(
      `WITH target_client AS (
         SELECT id
         FROM clients
         WHERE org_id = $1 AND id = $2
       )
       INSERT INTO channel_accounts (client_id, channel, management_url, login_id, memo)
       SELECT id, $3, $4, $5, $6
       FROM target_client
       ON CONFLICT (client_id, channel)
       DO UPDATE SET
         management_url = EXCLUDED.management_url,
         login_id = EXCLUDED.login_id,
         memo = EXCLUDED.memo,
         updated_at = NOW()
       RETURNING id, client_id, channel, management_url, login_id, memo, updated_at`,
      [
        orgId,
        clientId,
        CHANNEL,
        data.managementUrl,
        data.loginId ?? null,
        data.memo ?? null
      ]
    );

    const row = result.rows[0];
    return row ? mapChannelAccount(row) : null;
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new Error("MISSING_CHANNEL_ACCOUNTS_TABLE");
    }
    throw error;
  }
}
