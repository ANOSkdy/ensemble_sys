"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/server/auth";
import { hasDatabaseUrl } from "@/lib/db";
import { clientIdSchema } from "@/lib/clients";
import {
  airworkLocationInputSchema,
  airworkLocationUpdateSchema,
  createLocation,
  deleteLocation,
  locationIdSchema,
  updateLocation
} from "@/lib/airwork-locations";

export type LocationFormState = {
  ok: boolean;
  message?: string;
};

export async function createLocationAction(
  clientId: string,
  _prevState: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const parsedId = clientIdSchema.safeParse(clientId);
  if (!parsedId.success) {
    return { ok: false, message: "不正なクライアントIDです。" };
  }

  const workingLocationIdValue = formData.get("working_location_id");
  const nameJaValue = formData.get("name_ja");
  const memoValue = formData.get("memo");

  const parsed = airworkLocationInputSchema.safeParse({
    workingLocationId:
      typeof workingLocationIdValue === "string" ? workingLocationIdValue : "",
    nameJa: typeof nameJaValue === "string" ? nameJaValue : "",
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

    const location = await createLocation(
      user.orgId,
      parsedId.data,
      parsed.data
    );

    if (!location) {
      return { ok: false, message: "クライアントが見つかりません。" };
    }

    revalidatePath(`/clients/${clientId}/locations`);
    return { ok: true, message: "登録しました。" };
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MISSING_AIRWORK_LOCATIONS_TABLE") {
        return {
          ok: false,
          message: "まだ airwork_locations テーブルが作成されていません。"
        };
      }
      if ("code" in error && (error as { code?: string }).code === "23505") {
        return {
          ok: false,
          message: "同じ勤務地IDが既に登録されています。"
        };
      }
    }
    return { ok: false, message: "登録に失敗しました。" };
  }
}

export async function updateLocationAction(
  clientId: string,
  locationId: string,
  _prevState: LocationFormState,
  formData: FormData
): Promise<LocationFormState> {
  const parsedClientId = clientIdSchema.safeParse(clientId);
  if (!parsedClientId.success) {
    return { ok: false, message: "不正なクライアントIDです。" };
  }

  const parsedLocationId = locationIdSchema.safeParse(locationId);
  if (!parsedLocationId.success) {
    return { ok: false, message: "不正な勤務地IDです。" };
  }

  const nameJaValue = formData.get("name_ja");
  const memoValue = formData.get("memo");

  const parsed = airworkLocationUpdateSchema.safeParse({
    nameJa: typeof nameJaValue === "string" ? nameJaValue : "",
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

    const location = await updateLocation(
      user.orgId,
      parsedClientId.data,
      parsedLocationId.data,
      parsed.data
    );

    if (!location) {
      return { ok: false, message: "勤務地情報が見つかりません。" };
    }

    revalidatePath(`/clients/${clientId}/locations`);
    return { ok: true, message: "更新しました。" };
  } catch (error) {
    return { ok: false, message: "更新に失敗しました。" };
  }
}

export async function deleteLocationAction(
  clientId: string,
  locationId: string,
  _prevState: LocationFormState,
  _formData: FormData
): Promise<LocationFormState> {
  const parsedClientId = clientIdSchema.safeParse(clientId);
  if (!parsedClientId.success) {
    return { ok: false, message: "不正なクライアントIDです。" };
  }

  const parsedLocationId = locationIdSchema.safeParse(locationId);
  if (!parsedLocationId.success) {
    return { ok: false, message: "不正な勤務地IDです。" };
  }

  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  try {
    const user = await requireUser();
    if (!user.orgId) {
      return { ok: false, message: "組織情報が見つかりません。" };
    }

    const deleted = await deleteLocation(
      user.orgId,
      parsedClientId.data,
      parsedLocationId.data
    );

    if (!deleted) {
      return { ok: false, message: "勤務地情報が見つかりません。" };
    }

    revalidatePath(`/clients/${clientId}/locations`);
    return { ok: true, message: "削除しました。" };
  } catch (error) {
    return { ok: false, message: "削除に失敗しました。" };
  }
}
