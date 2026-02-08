"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { ok: true };

export function LoginForm() {
  const [, formAction] = useFormState(loginAction, initialState);
  const { pending } = useFormStatus();

  return (
    <form className="card" action={formAction}>
      <div>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
        />
      </div>
      <div>
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? "サインイン中..." : "サインイン"}
      </button>
    </form>
  );
}
