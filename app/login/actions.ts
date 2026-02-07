"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { query } from "@/lib/db";
import {
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  signSessionToken
} from "@/lib/auth";

export type LoginState = {
  ok: boolean;
  message?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";

  if (!email || !password) {
    return { ok: false, message: "メールとパスワードを入力してください。" };
  }

  try {
    const result = await query<{
      id: number;
      email: string;
      password_hash: string;
    }>("SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1", [
      email
    ]);

    const user = result.rows[0];
    if (!user) {
      return { ok: false, message: "メールまたはパスワードが違います。" };
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return { ok: false, message: "メールまたはパスワードが違います。" };
    }

    const token = await signSessionToken({
      sub: String(user.id),
      email: user.email
    });
    const forwardedProto = headers().get("x-forwarded-proto");
    const secure = forwardedProto ? forwardedProto === "https" : undefined;
    cookies().set(
      SESSION_COOKIE_NAME,
      token,
      getSessionCookieOptions({ secure })
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Missing AUTH_SECRET") {
      return { ok: false, message: "AUTH_SECRET が未設定です。" };
    }
    return {
      ok: false,
      message: "ログインに失敗しました。時間をおいて再試行してください。"
    };
  }

  redirect("/");
}
