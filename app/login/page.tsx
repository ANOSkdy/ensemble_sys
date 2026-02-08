import { LoginForm } from "@/app/login/login-form";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="container">
        <LoginForm />
      </div>
    </main>
  );
}
