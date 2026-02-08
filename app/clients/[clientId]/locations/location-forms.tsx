"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { LocationFormState } from "@/app/clients/[clientId]/locations/actions";

const initialState: LocationFormState = { ok: true };

type CreateFormProps = {
  action: (
    prevState: LocationFormState,
    formData: FormData
  ) => Promise<LocationFormState>;
};

type EditFormProps = {
  action: (
    prevState: LocationFormState,
    formData: FormData
  ) => Promise<LocationFormState>;
  deleteAction: (
    prevState: LocationFormState,
    formData: FormData
  ) => Promise<LocationFormState>;
  defaultValues: {
    locationId: string;
    workingLocationId: string;
    nameJa: string | null;
    memo: string | null;
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

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "削除中..." : "削除"}
    </button>
  );
}

export function LocationCreateForm({ action }: CreateFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="working_location_id">勤務地ID</label>
          <input
            id="working_location_id"
            name="working_location_id"
            type="text"
            required
            placeholder="例: 000123"
          />
        </div>
        <div>
          <label htmlFor="name_ja">拠点名</label>
          <input id="name_ja" name="name_ja" type="text" />
        </div>
      </div>
      <div>
        <label htmlFor="memo">メモ</label>
        <textarea id="memo" name="memo" rows={4} />
      </div>
      <SubmitButton label="追加する" />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function LocationEditForm({
  action,
  deleteAction,
  defaultValues
}: EditFormProps) {
  const [state, formAction] = useFormState(action, initialState);
  const [deleteState, deleteFormAction] = useFormState(
    deleteAction,
    initialState
  );

  return (
    <div className="card">
      <div className="list-meta">
        <span>勤務地ID: {defaultValues.workingLocationId}</span>
      </div>
      <form action={formAction}>
        <div className="form-grid">
          <div>
            <label htmlFor={`name_ja_${defaultValues.locationId}`}>
              拠点名
            </label>
            <input
              id={`name_ja_${defaultValues.locationId}`}
              name="name_ja"
              type="text"
              defaultValue={defaultValues.nameJa ?? ""}
            />
          </div>
        </div>
        <div>
          <label htmlFor={`memo_${defaultValues.locationId}`}>メモ</label>
          <textarea
            id={`memo_${defaultValues.locationId}`}
            name="memo"
            rows={3}
            defaultValue={defaultValues.memo ?? ""}
          />
        </div>
        <SubmitButton label="更新する" />
        {state.message ? (
          <p role="status" aria-live="polite">
            {state.message}
          </p>
        ) : null}
      </form>
      <form
        action={deleteFormAction}
        onSubmit={(event) => {
          if (!confirm("この勤務地IDを削除しますか？")) {
            event.preventDefault();
          }
        }}
      >
        <DeleteButton />
        {deleteState.message ? (
          <p role="status" aria-live="polite">
            {deleteState.message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
