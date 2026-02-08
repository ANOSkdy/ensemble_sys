"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { ChannelAccountFormState } from "@/app/home/[clientId]/channels/actions";

const initialState: ChannelAccountFormState = { ok: true };

type ChannelAccountFormProps = {
  action: (
    prevState: ChannelAccountFormState,
    formData: FormData
  ) => Promise<ChannelAccountFormState>;
  defaultValues?: {
    managementUrl?: string;
    loginId?: string | null;
    memo?: string | null;
  };
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "保存中..." : "保存する"}
    </button>
  );
}

export function ChannelAccountForm({
  action,
  defaultValues
}: ChannelAccountFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="management_url">管理URL</label>
          <input
            id="management_url"
            name="management_url"
            type="url"
            required
            placeholder="https://"
            defaultValue={defaultValues?.managementUrl ?? ""}
          />
        </div>
        <div>
          <label htmlFor="login_id">ログインID</label>
          <input
            id="login_id"
            name="login_id"
            type="text"
            defaultValue={defaultValues?.loginId ?? ""}
          />
        </div>
      </div>
      <div>
        <label htmlFor="memo">運用メモ</label>
        <textarea
          id="memo"
          name="memo"
          rows={5}
          defaultValue={defaultValues?.memo ?? ""}
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
