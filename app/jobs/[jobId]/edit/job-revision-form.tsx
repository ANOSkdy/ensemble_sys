"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { DraftFormState } from "@/app/jobs/[jobId]/actions";

const initialState: DraftFormState = { ok: true };

type CodeOption = {
  code: string;
  name: string;
};

type LocationOption = {
  id: string;
  label: string;
  value: string;
};

type JobRevisionFormProps = {
  action: (prevState: DraftFormState, formData: FormData) => Promise<DraftFormState>;
  defaultValues: {
    title?: string;
    subtitle?: string;
    description?: string;
    workingLocationId?: string;
    jobType?: string;
    occupationId?: string;
  };
  locations: LocationOption[];
  jobTypeCodes: CodeOption[];
  occupationCodes: CodeOption[];
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? "保存中..." : label}
    </button>
  );
}

export function JobRevisionForm({
  action,
  defaultValues,
  locations,
  jobTypeCodes,
  occupationCodes
}: JobRevisionFormProps) {
  const [state, formAction] = useFormState(action, initialState);

  return (
    <form className="card" action={formAction}>
      <div className="form-grid">
        <div>
          <label htmlFor="title">タイトル</label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            defaultValue={defaultValues.title ?? ""}
          />
        </div>
        <div>
          <label htmlFor="subtitle">サブタイトル</label>
          <input
            id="subtitle"
            name="subtitle"
            type="text"
            maxLength={200}
            defaultValue={defaultValues.subtitle ?? ""}
          />
        </div>
        <div>
          <label htmlFor="working_location_id">勤務先</label>
          <select
            id="working_location_id"
            name="working_location_id"
            defaultValue={defaultValues.workingLocationId ?? ""}
          >
            <option value="">未設定</option>
            {locations.map((location) => (
              <option key={location.id} value={location.value}>
                {location.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="job_type">職種コード (job_type)</label>
          {jobTypeCodes.length > 0 ? (
            <select
              id="job_type"
              name="job_type"
              defaultValue={defaultValues.jobType ?? ""}
            >
              <option value="">未設定</option>
              {jobTypeCodes.map((code) => (
                <option key={code.code} value={code.code}>
                  {code.code} - {code.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="job_type"
              name="job_type"
              type="text"
              maxLength={200}
              defaultValue={defaultValues.jobType ?? ""}
            />
          )}
        </div>
        <div>
          <label htmlFor="occupation_id">職種ID (occupation_id)</label>
          {occupationCodes.length > 0 ? (
            <select
              id="occupation_id"
              name="occupation_id"
              defaultValue={defaultValues.occupationId ?? ""}
            >
              <option value="">未設定</option>
              {occupationCodes.map((code) => (
                <option key={code.code} value={code.code}>
                  {code.code} - {code.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="occupation_id"
              name="occupation_id"
              type="text"
              maxLength={200}
              defaultValue={defaultValues.occupationId ?? ""}
            />
          )}
        </div>
        <div>
          <label htmlFor="description">仕事内容</label>
          <textarea
            id="description"
            name="description"
            required
            rows={8}
            maxLength={10000}
            defaultValue={defaultValues.description ?? ""}
          />
        </div>
      </div>
      <SubmitButton label="下書きを保存" />
      {state.message ? (
        <p role="status" aria-live="polite">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
