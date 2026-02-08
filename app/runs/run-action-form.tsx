"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { RunActionState } from "@/app/runs/actions";

const initialState: RunActionState = { ok: true };

type RunActionFormProps = {
  action: (prevState: RunActionState, formData: FormData) => Promise<RunActionState>;
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

export function RunActionForm({ action, label, variant }: RunActionFormProps) {
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
