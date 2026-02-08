import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neon Todo Starter",
  description: "Minimal Next.js + Neon Postgres starter"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <div className="app-shell">
          <input
            type="checkbox"
            id="nav-toggle"
            className="nav-toggle"
            aria-hidden="true"
          />
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark">E</div>
              <div>
                <p className="brand-title">Ensemble</p>
                <p className="brand-subtitle">Ops Console</p>
              </div>
            </div>
            <nav className="nav">
              <Link href="/home" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c2.5-4 13.5-4 16 0" />
                </svg>
                Home
              </Link>
              <Link href="/todos" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 6h12M8 12h12M8 18h12" />
                  <path d="M4 6h.01M4 12h.01M4 18h.01" />
                </svg>
                Todos
              </Link>
              <Link href="/runs" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="14" rx="3" />
                  <path d="M7 8h10M7 12h6" />
                </svg>
                Runs
              </Link>
              <Link href="/jobs" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <rect x="4" y="7" width="16" height="12" rx="2" />
                  <path d="M9 7V5h6v2" />
                </svg>
                Jobs
              </Link>
            </nav>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="nav-logout">
                Sign out
              </button>
            </form>
          </aside>
          <label htmlFor="nav-toggle" className="nav-scrim" aria-hidden="true" />
          <div className="app-main">
            <header className="top-bar">
              <label
                htmlFor="nav-toggle"
                className="nav-toggle-button"
                aria-label="メニューを開閉"
              >
                <span />
                <span />
                <span />
              </label>
              <div className="top-bar-title">Ensemble Ops Console</div>
            </header>
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
