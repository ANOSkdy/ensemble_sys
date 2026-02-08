"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { RunFormState } from "@/app/runs/actions";

const initialState: RunFormState = { ok: true };

type ClientOption = {
  id: string;
  name: string;
};

type RunFormProps = {
  clients: ClientOption[];
  action: (prevState: RunFormState, formData: FormData) => Promise<RunFormState>;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "作成中..." : "Runを作成"}
    </button>
  );
}

export function RunForm({ clients, action }: RunFormProps) {
  const [state, formAction] = useFormState(action, initialState);

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
          <label htmlFor="run_type">Run種別</label>
          <select id="run_type" name="run_type" defaultValue="update">
            <option value="update">update</option>
            <option value="refresh">refresh</option>
          </select>
        </div>
        <div>
          <label htmlFor="file_format">ファイル形式</label>
          <select id="file_format" name="file_format" defaultValue="xlsx">
            <option value="xlsx">xlsx</option>
            <option value="txt">txt</option>
          </select>
        </div>
        <div>
          <label className="checkbox">
            <input
              type="checkbox"
              name="include_latest_approved_only"
              defaultChecked
            />
            最新approvedのみ対象にする
          </label>
        </div>
      </div>
      <SubmitButton />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
          {state.runId ? (
            <>
              {" "}
              <a href={`/runs/${state.runId}`}>Run詳細を見る</a>
            </>
          ) : null}
        </p>
      ) : null}
    </form>
  );
}
