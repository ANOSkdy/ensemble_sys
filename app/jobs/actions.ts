"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { getClient } from "@/lib/clients";
import { createJob, jobInputSchema } from "@/lib/jobs";

export type JobFormState = {
  ok: boolean;
  message?: string;
};

export async function createJobAction(
  _prevState: JobFormState,
  formData: FormData
): Promise<JobFormState> {
  const internalTitleValue = formData.get("internal_title");
  const clientIdValue = formData.get("client_id");
  const statusValue = formData.get("status");

  const parsed = jobInputSchema.safeParse({
    internalTitle:
      typeof internalTitleValue === "string" ? internalTitleValue : "",
    clientId: typeof clientIdValue === "string" ? clientIdValue : "",
    status: typeof statusValue === "string" ? statusValue : "active"
  });

  if (!parsed.success) {
    return { ok: false, message: "必須項目を入力してください。" };
  }

  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  try {
    const user = await requireUser();
    if (user.orgId === null) {
      return { ok: false, message: "組織情報が見つかりません。" };
    }

    const client = await getClient(user.orgId, parsed.data.clientId);
    if (!client) {
      return { ok: false, message: "クライアントが見つかりません。" };
    }

    await createJob(user.orgId, parsed.data);
    revalidatePath("/jobs");
    revalidatePath(`/clients/${parsed.data.clientId}/jobs`);
    redirect("/jobs");
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_JOBS_TABLE") {
      return {
        ok: false,
        message: "まだ jobs テーブルが作成されていません。"
      };
    }
    return { ok: false, message: "作成に失敗しました。" };
  }
}
