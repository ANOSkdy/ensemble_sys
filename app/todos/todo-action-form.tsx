"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { TodoActionState } from "@/app/todos/actions";

const initialState: TodoActionState = { ok: true };

type TodoActionFormProps = {
  action: (prevState: TodoActionState, formData: FormData) => Promise<TodoActionState>;
  label: string;
  variant?: "primary" | "secondary";
};

function SubmitButton({
  label,
  variant
}: {
  label: string;
  variant?: "primary" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={variant === "secondary" ? "secondary" : undefined}
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? "処理中..." : label}
    </button>
  );
}

export function TodoActionForm({ action, label, variant }: TodoActionFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction}>
      <SubmitButton label={label} variant={variant} />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
