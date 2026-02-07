"use server";

import { revalidatePath } from "next/cache";
import { hasDatabaseUrl } from "@/lib/db";
import { createTodo, todoInputSchema } from "@/lib/todos";

export type FormState = {
  ok: boolean;
  message?: string;
};

export async function createTodoAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const titleValue = formData.get("title");
  const parsed = todoInputSchema.safeParse({
    title: typeof titleValue === "string" ? titleValue : ""
  });

  if (!parsed.success) {
    return { ok: false, message: "タイトルを入力してください。" };
  }

  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL が未設定です。" };
  }

  try {
    await createTodo(parsed.data.title);
    revalidatePath("/");
    return { ok: true, message: "追加しました。" };
  } catch (error) {
    if (error instanceof Error && error.message === "MISSING_TODOS_TABLE") {
      return {
        ok: false,
        message: "まだテーブルが作成されていません。migrate を実行してください。"
      };
    }
    return { ok: false, message: "追加に失敗しました。時間をおいて再試行してください。" };
  }
}
