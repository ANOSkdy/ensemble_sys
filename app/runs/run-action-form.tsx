"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { RunActionState } from "@/app/runs/actions";

const initialState: RunActionState = { ok: true };

type RunActionFormProps = {
  action: (prevState: RunActionState, formData: FormData) => Promise<RunActionState>;
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

function SubmitButton({
  label,
  variant,
  disabled
}: {
  label: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;
  return (
    <button
      type="submit"
      className={variant === "secondary" ? "secondary" : undefined}
      disabled={isDisabled}
      aria-disabled={isDisabled}
    >
      {pending ? "処理中..." : label}
    </button>
  );
}

export function RunActionForm({
  action,
  label,
  variant,
  disabled
}: RunActionFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form action={formAction}>
      <SubmitButton label={label} variant={variant} disabled={disabled} />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
