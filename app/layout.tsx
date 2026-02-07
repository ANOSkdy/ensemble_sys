import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Neon Todo Starter',
  description: 'Minimal Next.js + Neon Postgres starter',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <div className="page">
          <header className="header">
            <p className="eyebrow">Next.js + Neon Postgres</p>
            <h1 className="title">やることメモ</h1>
            <p className="subtitle">
              モバイルファーストの最小構成。API と DB の疎通を確認できます。
            </p>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
