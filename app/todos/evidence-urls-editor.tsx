"use client";

import { useMemo, useState } from "react";

type EvidenceUrlsEditorProps = {
  name: string;
  initialUrls: string[];
  max?: number;
};

export function EvidenceUrlsEditor({
  name,
  initialUrls,
  max = 10
}: EvidenceUrlsEditorProps) {
  const [urls, setUrls] = useState<string[]>(
    initialUrls.length > 0 ? initialUrls : [""]
  );

  const normalized = useMemo(
    () => urls.map((url) => url.trim()).filter((url) => url.length > 0),
    [urls]
  );

  const canAdd = urls.length < max;

  return (
    <div className="evidence-editor">
      <div className="evidence-list">
        {urls.map((url, index) => (
          <div key={`${index}-${url}`} className="evidence-row">
            <input
              type="url"
              placeholder="https://..."
              value={url}
              onChange={(event) => {
                const next = [...urls];
                next[index] = event.target.value;
                setUrls(next);
              }}
            />
            <button
              type="button"
              className="secondary"
              onClick={() => {
                if (urls.length === 1) {
                  setUrls([""]);
                  return;
                }
                setUrls(urls.filter((_, i) => i !== index));
              }}
            >
              削除
            </button>
          </div>
        ))}
      </div>
      <div className="actions">
        <button
          type="button"
          onClick={() => setUrls([...urls, ""])}
          disabled={!canAdd}
          aria-disabled={!canAdd}
        >
          URLを追加
        </button>
        <p className="helper-text">最大 {max} 件まで登録できます。</p>
      </div>
      <input type="hidden" name={name} value={JSON.stringify(normalized)} />
    </div>
  );
}
