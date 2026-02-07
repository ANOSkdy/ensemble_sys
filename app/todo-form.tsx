"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createTodoAction, type FormState } from "@/app/actions";

const initialState: FormState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "追加中..." : "Todoを追加"}
    </button>
  );
}

export function TodoForm() {
  const [state, formAction] = useFormState(createTodoAction, initialState);

  return (
    <form className="card" action={formAction}>
      <div>
        <label htmlFor="title">やること</label>
        <input
          id="title"
          name="title"
          type="text"
          placeholder="例: Neonで接続テスト"
          required
        />
      </div>
      <SubmitButton />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
