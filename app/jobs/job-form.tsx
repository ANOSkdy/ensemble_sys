"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { JobFormState } from "@/app/jobs/actions";

const initialState: JobFormState = { ok: true };

type JobFormProps = {
  action: (prevState: JobFormState, formData: FormData) => Promise<JobFormState>;
  clients: Array<{ id: string; name: string }>;
  defaultValues?: {
    internalTitle?: string;
    clientId?: string;
    status?: "active" | "archived";
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

export function JobForm({ action, clients, defaultValues }: JobFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="internal_title">求人タイトル</label>
          <input
            id="internal_title"
            name="internal_title"
            type="text"
            required
            placeholder="例: カスタマーサポート"
            defaultValue={defaultValues?.internalTitle ?? ""}
          />
        </div>
        <div>
          <label htmlFor="client_id">クライアント</label>
          <select
            id="client_id"
            name="client_id"
            required
            defaultValue={defaultValues?.clientId ?? ""}
          >
            <option value="" disabled>
              選択してください
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="status">ステータス</label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "active"}
          >
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>
      </div>
      <SubmitButton label="求人を作成" />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
