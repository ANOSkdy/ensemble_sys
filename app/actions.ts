"use server";

import { revalidatePath } from "next/cache";
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

  await createTodo(parsed.data.title);
  revalidatePath("/");
  return { ok: true, message: "追加しました。" };
}
