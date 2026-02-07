import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>管理画面ログイン</h1>
          <p>登録済みの管理者アカウントでログインしてください。</p>
        </section>
        <LoginForm />
      </div>
    </main>
  );
}
