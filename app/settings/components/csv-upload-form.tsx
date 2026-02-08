"use client";

import { useId, useState } from "react";

type UploadError = {
  line: number;
  message: string;
};

type UploadResponse = {
  ok: boolean;
  message: string;
  processed?: number;
  errors?: UploadError[];
};

type CsvUploadFormProps = {
  action: string;
  title: string;
  description: string;
  templateHeaders: string;
};

export default function CsvUploadForm({
  action,
  title,
  description,
  templateHeaders
}: CsvUploadFormProps) {
  const inputId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch(action, {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as UploadResponse;
      if (!response.ok) {
        setResult({
          ok: false,
          message: data.message ?? "アップロードに失敗しました。",
          errors: data.errors ?? []
        });
        return;
      }

      setResult(data);
      event.currentTarget.reset();
    } catch (error) {
      setResult({
        ok: false,
        message: "通信に失敗しました。"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <form onSubmit={handleSubmit} className="form-grid">
        <div>
          <label htmlFor={inputId}>CSVファイル</label>
          <input id={inputId} name="file" type="file" accept=".csv" required />
          <p className="helper-text">ヘッダー: {templateHeaders}</p>
        </div>
        <div>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "アップロード中..." : "CSVを取り込む"}
          </button>
        </div>
      </form>
      {result ? (
        <div className="status-box" role="status" aria-live="polite">
          <p className={result.ok ? "status-ok" : "status-error"}>
            {result.message}
            {result.ok && typeof result.processed === "number"
              ? ` (処理件数: ${result.processed})`
              : ""}
          </p>
          {!result.ok && result.errors && result.errors.length > 0 ? (
            <ul className="status-errors">
              {result.errors.map((error, index) => (
                <li key={`${error.line}-${index}`}>
                  {`行 ${error.line}: ${error.message}`}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
