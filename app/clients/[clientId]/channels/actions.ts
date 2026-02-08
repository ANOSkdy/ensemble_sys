"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { clientIdSchema } from "@/lib/clients";
import {
  channelAccountInputSchema,
  upsertChannelAccount
} from "@/lib/channel-accounts";

export type ChannelAccountFormState = {
  ok: boolean;
  message?: string;
};

export async function upsertChannelAccountAction(
  clientId: string,
  _prevState: ChannelAccountFormState,
  formData: FormData
): Promise<ChannelAccountFormState> {
  const parsedId = clientIdSchema.safeParse(clientId);
  if (!parsedId.success) {
    return { ok: false, message: "不正なクライアントIDです。" };
  }

  const managementUrlValue = formData.get("management_url");
  const loginIdValue = formData.get("login_id");
  const memoValue = formData.get("memo");

  const parsed = channelAccountInputSchema.safeParse({
    managementUrl:
      typeof managementUrlValue === "string" ? managementUrlValue : "",
    loginId: typeof loginIdValue === "string" ? loginIdValue : "",
    memo: typeof memoValue === "string" ? memoValue : ""
  });

  if (!parsed.success) {
    return { ok: false, message: "入力内容を確認してください。" };
  }

  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  try {
    const user = await requireUser();
    if (!user.orgId) {
      return { ok: false, message: "組織情報が見つかりません。" };
    }

    const account = await upsertChannelAccount(
      user.orgId, // UUID string
      parsedId.data,
      parsed.data
    );

    if (!account) {
      return { ok: false, message: "クライアントが見つかりません。" };
    }

    revalidatePath(`/clients/${clientId}/channels`);

    // managementUrl が空 or 無効URLでも保存自体は成功しているので、ここで失敗扱いにしない
    const urlStr = parsed.data.managementUrl?.trim?.() ?? "";
    if (urlStr) {
      try {
        const protocol = new URL(urlStr).protocol;
        if (protocol !== "https:") {
          return { ok: true, message: "保存しました。https の利用が推奨です。" };
        }
      } catch {
        // ここには来ないのが理想だが、万一でも保存は成功しているので握りつぶす
      }
    }

    return { ok: true, message: "保存しました。" };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MISSING_CHANNEL_ACCOUNTS_TABLE"
    ) {
      return {
        ok: false,
        message: "まだ channel_accounts テーブルが作成されていません。"
      };
    }
    return { ok: false, message: "保存に失敗しました。" };
  }
}
