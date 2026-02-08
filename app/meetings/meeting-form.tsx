"use client";

import { useMemo } from "react";
import { useFormState, useFormStatus } from "react-dom";
import type { MeetingActionState } from "@/app/meetings/actions";

const initialState: MeetingActionState = { ok: true };

type ClientOption = {
  id: string;
  name: string;
};

type MeetingFormProps = {
  clients: ClientOption[];
  action: (
    prevState: MeetingActionState,
    formData: FormData
  ) => Promise<MeetingActionState>;
};

function formatDateTimeLocal(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "作成中..." : "会議ログを作成"}
    </button>
  );
}

export function MeetingForm({ clients, action }: MeetingFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const defaultHeldAt = useMemo(() => formatDateTimeLocal(new Date()), []);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="client_id">クライアント</label>
          <select id="client_id" name="client_id" required>
            <option value="">選択してください</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="held_at">実施日時</label>
          <input
            id="held_at"
            name="held_at"
            type="datetime-local"
            defaultValue={defaultHeldAt}
          />
        </div>
      </div>
      <div>
        <label htmlFor="memo">メモ</label>
        <textarea
          id="memo"
          name="memo"
          rows={10}
          maxLength={20000}
          required
        />
        <p className="helper-text">議事録や改善方針を自由に入力できます。</p>
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
