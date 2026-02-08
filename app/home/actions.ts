"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import {
  clientIdSchema,
  clientInputSchema,
  createClient,
  updateClient
} from "@/lib/clients";

export type ClientFormState = {
  ok: boolean;
  message?: string;
};

export async function createClientAction(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const nameValue = formData.get("name");
  const industryValue = formData.get("industry");
  const ownerNameValue = formData.get("owner_name");
  const notesValue = formData.get("notes");
  const timezoneValue = formData.get("timezone");

  const parsed = clientInputSchema.safeParse({
    name: typeof nameValue === "string" ? nameValue : "",
    industry: typeof industryValue === "string" ? industryValue : "",
    ownerName: typeof ownerNameValue === "string" ? ownerNameValue : "",
    notes: typeof notesValue === "string" ? notesValue : "",
    timezone:
      typeof timezoneValue === "string" && timezoneValue.trim().length > 0
        ? timezoneValue
        : undefined
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
    const client = await createClient(user.orgId, parsed.data);
    revalidatePath("/home");
    redirect(`/home/${client.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_CLIENTS_TABLE") {
      return {
        ok: false,
        message: "まだ clients テーブルが作成されていません。"
      };
    }
    return { ok: false, message: "作成に失敗しました。" };
  }
}

export async function updateClientAction(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const parsedId = clientIdSchema.safeParse(clientId);
  if (!parsedId.success) {
    return { ok: false, message: "不正なクライアントIDです。" };
  }

  const nameValue = formData.get("name");
  const industryValue = formData.get("industry");
  const ownerNameValue = formData.get("owner_name");
  const notesValue = formData.get("notes");
  const timezoneValue = formData.get("timezone");

  const parsed = clientInputSchema.safeParse({
    name: typeof nameValue === "string" ? nameValue : "",
    industry: typeof industryValue === "string" ? industryValue : "",
    ownerName: typeof ownerNameValue === "string" ? ownerNameValue : "",
    notes: typeof notesValue === "string" ? notesValue : "",
    timezone:
      typeof timezoneValue === "string" && timezoneValue.trim().length > 0
        ? timezoneValue
        : undefined
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
    const updated = await updateClient(user.orgId, parsedId.data, parsed.data);
    if (!updated) {
      return { ok: false, message: "クライアントが見つかりません。" };
    }
    revalidatePath(`/home/${clientId}`);
    return { ok: true, message: "更新しました。" };
  } catch (error) {
    return { ok: false, message: "更新に失敗しました。" };
  }
}
