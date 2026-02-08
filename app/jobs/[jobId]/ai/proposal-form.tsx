"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ProposalActionState } from "@/app/jobs/[jobId]/ai/actions";

type MeetingOption = {
  id: string;
  label: string;
};

type ProposalFormProps = {
  meetings: MeetingOption[];
  action: (
    prevState: ProposalActionState,
    formData: FormData
  ) => Promise<ProposalActionState>;
};

const initialState: ProposalActionState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "生成中..." : "Generate proposal"}
    </button>
  );
}

export function ProposalForm({ meetings, action }: ProposalFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="meeting_id">会議ログ</label>
          <select id="meeting_id" name="meeting_id" defaultValue="">
            <option value="">選択しない</option>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="constraints">制約・要望メモ</label>
          <textarea
            id="constraints"
            name="constraints"
            rows={4}
            maxLength={2000}
            placeholder="例: 応募条件は変更不可、語尾は敬体で統一 など"
          />
        </div>
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
