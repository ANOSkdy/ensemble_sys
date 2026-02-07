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
          <aside className="sidebar">
            <div className="brand">
              <div className="brand-mark">E</div>
              <div>
                <p className="brand-title">Ensemble</p>
                <p className="brand-subtitle">Ops Console</p>
              </div>
            </div>
            <nav className="nav">
              <Link href="/" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M4 10.5 12 4l8 6.5v8a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
                </svg>
                Dashboard
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
              <Link href="/clients" className="nav-link">
                <svg
                  className="line-icon"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c2.5-4 13.5-4 16 0" />
                </svg>
                Clients
              </Link>
            </nav>
            <div className="sidebar-footer">
              <span className="status-dot" aria-hidden="true" />
              <p>Dark/Light 自動切替</p>
            </div>
          </aside>
          <div className="app-main">{children}</div>
        </div>
      </body>
    </html>
  );
}
