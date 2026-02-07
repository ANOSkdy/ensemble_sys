'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export default function TodoForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }

    const response = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? '登録に失敗しました。');
      return;
    }

    setTitle('');
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <form className="form" onSubmit={onSubmit}>
      <label className="label" htmlFor="title">
        タイトル
      </label>
      <input
        id="title"
        name="title"
        className="input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="例: リリース前チェック"
        maxLength={120}
        autoComplete="off"
      />
      {error ? <p className="error">{error}</p> : null}
      <button className="button" type="submit" disabled={isPending}>
        {isPending ? '保存中...' : '追加する'}
      </button>
    </form>
  );
}
