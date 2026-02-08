"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ApplyProposalState } from "@/app/jobs/[jobId]/ai/[proposalId]/actions";

type ProposalChange = {
  fieldKey: string;
  before: string | null;
  after: string;
  reason: string;
};

type ApplyProposalFormProps = {
  changes: ProposalChange[];
  action: (
    prevState: ApplyProposalState,
    formData: FormData
  ) => Promise<ApplyProposalState>;
  disabled?: boolean;
};

const initialState: ApplyProposalState = { ok: true };

function SubmitButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;
  return (
    <button type="submit" disabled={isDisabled} aria-disabled={isDisabled}>
      {pending ? "適用中..." : "Apply & Approve"}
    </button>
  );
}

export function ApplyProposalForm({
  changes,
  action,
  disabled
}: ApplyProposalFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <h2>差分の適用</h2>
      {changes.length === 0 ? (
        <p>適用できる差分がありません。</p>
      ) : (
        <div className="form-grid">
          {changes.map((change) => (
            <div key={change.fieldKey} className="card-subsection">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name={`accept_${change.fieldKey}`}
                  defaultChecked
                  disabled={disabled}
                />
                {change.fieldKey} を適用
              </label>
              <div className="diff-grid">
                <div>
                  <p className="diff-label">Before</p>
                  <p className="diff-value">{change.before ?? "—"}</p>
                </div>
                <div>
                  <p className="diff-label">After</p>
                  <p className="diff-value">{change.after}</p>
                </div>
              </div>
              <p className="helper">Reason: {change.reason}</p>
            </div>
          ))}
        </div>
      )}
      <SubmitButton disabled={disabled || changes.length === 0} />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
