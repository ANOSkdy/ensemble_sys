"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { clientIdSchema } from "@/lib/clients";
import { hasDatabaseUrl } from "@/lib/db";
import {
  createMeeting,
  meetingIdSchema,
  meetingMemoSchema,
  updateMeeting
} from "@/lib/meetings";
import { requireUser } from "@/lib/server/auth";

export type MeetingActionState = {
  ok: boolean;
  message?: string;
  meetingId?: string;
};

const heldAtSchema = z.string().trim().min(1);

function parseHeldAt(value: FormDataEntryValue | null): {
  ok: boolean;
  value: string | null;
} {
  if (typeof value !== "string" || value.trim().length === 0) {
    return { ok: true, value: null };
  }

  const parsed = heldAtSchema.safeParse(value);
  if (!parsed.success) {
    return { ok: false, value: null };
  }

  const date = new Date(parsed.data);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, value: null };
  }

  return { ok: true, value: date.toISOString() };
}

export async function createMeetingAction(
  _prevState: MeetingActionState,
  formData: FormData
): Promise<MeetingActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const clientIdValue = formData.get("client_id");
  const memoValue = formData.get("memo");
  const heldAtValue = formData.get("held_at");

  const clientIdResult = clientIdSchema.safeParse(
    typeof clientIdValue === "string" ? clientIdValue : ""
  );
  if (!clientIdResult.success) {
    return { ok: false, message: "クライアントを選択してください。" };
  }

  const memoResult = meetingMemoSchema.safeParse(
    typeof memoValue === "string" ? memoValue : ""
  );
  if (!memoResult.success) {
    return { ok: false, message: "メモを入力してください。" };
  }

  const heldAtResult = parseHeldAt(heldAtValue);
  if (!heldAtResult.ok) {
    return { ok: false, message: "実施日時が不正です。" };
  }

  try {
    const user = await requireUser();
    if (user.orgId === null) {
      return { ok: false, message: "組織情報が見つかりません。" };
    }

    const meeting = await createMeeting(user.orgId, user.userId, {
      clientId: clientIdResult.data,
      heldAt: heldAtResult.value,
      memo: memoResult.data
    });

    revalidatePath("/meetings");
    redirect(`/meetings/${meeting.id}`);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "MISSING_CLIENT_MEETINGS_TABLE"
    ) {
      return {
        ok: false,
        message: "まだ client_meetings テーブルが作成されていません。"
      };
    }
    return { ok: false, message: "作成に失敗しました。" };
  }
}

export async function updateMeetingAction(
  meetingId: string,
  _prevState: MeetingActionState,
  formData: FormData
): Promise<MeetingActionState> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  const meetingIdResult = meetingIdSchema.safeParse(meetingId);
  if (!meetingIdResult.success) {
    return { ok: false, message: "会議ログIDが不正です。" };
  }

  const memoValue = formData.get("memo");
  const heldAtValue = formData.get("held_at");

  const memoResult = meetingMemoSchema.safeParse(
    typeof memoValue === "string" ? memoValue : ""
  );
  if (!memoResult.success) {
    return { ok: false, message: "メモを入力してください。" };
  }

  const heldAtResult = parseHeldAt(heldAtValue);
  if (!heldAtResult.ok) {
    return { ok: false, message: "実施日時が不正です。" };
  }

  const user = await requireUser();
  if (user.orgId === null) {
    return { ok: false, message: "組織情報が見つかりません。" };
  }

  const result = await updateMeeting(
    user.orgId,
    meetingIdResult.data,
    user.userId,
    {
      memo: memoResult.data,
      heldAt: heldAtResult.value
    }
  );

  if (result.rowCount === 0) {
    return { ok: false, message: "会議ログが見つかりません。" };
  }

  revalidatePath(`/meetings/${meetingIdResult.data}`);
  revalidatePath("/meetings");

  return { ok: true, message: "更新しました。" };
}

export async function parseMeetingFilters(filters: {
  client?: string | string[];
  start_date?: string | string[];
  end_date?: string | string[];
  search?: string | string[];
}) {
  const parsed = z
    .object({
      client: z.string().uuid().optional(),
      start_date: z
        .string()
        .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
        .optional(),
      end_date: z
        .string()
        .regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
        .optional(),
      search: z.string().trim().min(1).max(200).optional()
    })
    .safeParse({
      client: typeof filters.client === "string" ? filters.client : undefined,
      start_date:
        typeof filters.start_date === "string" ? filters.start_date : undefined,
      end_date: typeof filters.end_date === "string" ? filters.end_date : undefined,
      search: typeof filters.search === "string" ? filters.search : undefined
    });

  if (!parsed.success) {
    return {};
  }

  return {
    clientId: parsed.data.client,
    startDate: parsed.data.start_date,
    endDate: parsed.data.end_date,
    search: parsed.data.search
  };
}
