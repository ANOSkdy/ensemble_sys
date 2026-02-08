"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { TodoDetail } from "@/lib/todos";
import { updateTodoAction, type TodoActionState } from "@/app/todos/actions";
import { EvidenceUrlsEditor } from "@/app/todos/evidence-urls-editor";

const initialState: TodoActionState = { ok: true };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "更新中..." : "更新"}
    </button>
  );
}

type TodoEditFormProps = {
  todo: TodoDetail;
};

export function TodoEditForm({ todo }: TodoEditFormProps) {
  const action = updateTodoAction.bind(null, todo.id);
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <h2>詳細編集</h2>
      <div className="form-grid">
        <div>
          <label htmlFor="title">タイトル</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={todo.title}
          />
        </div>
        <div>
          <label htmlFor="due_at">期限日</label>
          <input
            id="due_at"
            name="due_at"
            type="date"
            defaultValue={todo.dueAt ?? ""}
          />
        </div>
      </div>
      <div>
        <label htmlFor="instructions">メモ / 手順</label>
        <textarea
          id="instructions"
          name="instructions"
          rows={6}
          maxLength={10000}
          defaultValue={todo.instructions ?? ""}
        />
        <p className="helper-text">
          Airワーク側の操作メモや証跡メモを自由に追記できます。
        </p>
      </div>
      <div>
        <label>証跡URL</label>
        <EvidenceUrlsEditor name="evidence_urls" initialUrls={todo.evidenceUrls} />
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
