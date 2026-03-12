"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction, type LoginState } from "@/app/login/actions";

const initialState: LoginState = { ok: true };

export function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form className="card" action={formAction}>
      <LoginFormFields />
      <p aria-live="polite" role={state.ok === false ? "alert" : "status"}>
        {state.ok === false ? state.message : ""}
      </p>
    </form>
  );
}

function LoginFormFields() {
  const { pending } = useFormStatus();

  return (
    <>
      <div>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          disabled={pending}
          aria-disabled={pending}
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
          disabled={pending}
          aria-disabled={pending}
        />
      </div>
      <button type="submit" disabled={pending} aria-disabled={pending}>
        {pending ? "サインイン中..." : "サインイン"}
      </button>
    </>
  );
}
