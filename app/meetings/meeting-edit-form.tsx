"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { MeetingDetail } from "@/lib/meetings";
import { updateMeetingAction, type MeetingActionState } from "./actions";

const initialState: MeetingActionState = { ok: true };

function formatDateTimeLocal(value: string | null): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (v: number) => v.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "更新中..." : "更新"}
    </button>
  );
}

type MeetingEditFormProps = {
  meeting: MeetingDetail;
};

export function MeetingEditForm({ meeting }: MeetingEditFormProps) {
  const action = updateMeetingAction.bind(null, meeting.id);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <h2>会議ログ編集</h2>
      <div className="form-grid">
        <div>
          <label htmlFor="held_at">実施日時</label>
          <input
            id="held_at"
            name="held_at"
            type="datetime-local"
            defaultValue={formatDateTimeLocal(meeting.heldAt)}
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
          defaultValue={meeting.memo}
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
