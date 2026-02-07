import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <main>
      <div className="container">
        <section className="card hero">
          <div className="hero-grid">
            <div>
              <h1>管理画面ログイン</h1>
              <p>登録済みの管理者アカウントでログインしてください。</p>
            </div>
            <div className="hero-art">
              <div className="hero-illustration">
                <div className="character" aria-hidden="true" />
                <div>
                  <div className="icon-chip">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M12 4v8l4 2"
                        stroke="currentColor"
                        strokeLinecap="round"
                      />
                      <circle cx="12" cy="12" r="8" stroke="currentColor" />
                    </svg>
                    セキュアにログイン
                  </div>
                  <p>落ち着いたトーンで操作をスタート。</p>
                </div>
              </div>
            </div>
          </div>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
