"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ClientFormState } from "@/app/home/actions";

const initialState: ClientFormState = { ok: true };

type ClientFormProps = {
  action: (
    prevState: ClientFormState,
    formData: FormData
  ) => Promise<ClientFormState>;
  submitLabel: string;
  defaultValues?: {
    name?: string;
    industry?: string | null;
    ownerName?: string | null;
    notes?: string | null;
    timezone?: string | null;
  };
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "保存中..." : label}
    </button>
  );
}

export function ClientForm({
  action,
  submitLabel,
  defaultValues
}: ClientFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="name">顧客名</label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={defaultValues?.name ?? ""}
            placeholder="例: 〇〇株式会社"
          />
        </div>
        <div>
          <label htmlFor="industry">業種</label>
          <input
            id="industry"
            name="industry"
            type="text"
            defaultValue={defaultValues?.industry ?? ""}
          />
        </div>
        <div>
          <label htmlFor="owner_name">担当者</label>
          <input
            id="owner_name"
            name="owner_name"
            type="text"
            defaultValue={defaultValues?.ownerName ?? ""}
          />
        </div>
        <div>
          <label htmlFor="timezone">タイムゾーン</label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            defaultValue={defaultValues?.timezone ?? "Asia/Tokyo"}
          />
        </div>
      </div>
      <div>
        <label htmlFor="notes">メモ</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={defaultValues?.notes ?? ""}
        />
      </div>
      <SubmitButton label={submitLabel} />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
