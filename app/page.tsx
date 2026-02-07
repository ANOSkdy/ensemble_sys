import { TodoForm } from "@/app/todo-form";
import { hasDatabaseUrl } from "@/lib/db";
import { listTodos, type Todo } from "@/lib/todos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  let todos: Todo[] = [];
  let dbStatus: "ready" | "missing" | "unavailable" = "ready";

  if (!hasDatabaseUrl()) {
    dbStatus = "missing";
  } else {
    try {
      todos = await listTodos(20);
    } catch {
      dbStatus = "unavailable";
    }
  }

  return (
    <main>
      <div className="container">
        <section className="card">
          <h1>Neon Todo Starter</h1>
          <p>
            Next.js + Neon Postgres の最小構成です。モバイルでも快適に使えるよう、
            余白とタップ領域を広めに設計しています。
          </p>
        </section>
        <TodoForm />
        <section className="card">
          <h2>最新のTodo</h2>
          {dbStatus === "missing" ? (
            <p>DATABASE_URL が未設定のため、Todo一覧は表示できません。</p>
          ) : dbStatus === "unavailable" ? (
            <p>データベースに接続できませんでした。設定をご確認ください。</p>
          ) : todos.length === 0 ? (
            <p>まだTodoがありません。上のフォームから追加してください。</p>
          ) : (
            <div className="todo-list">
              {todos.map((todo) => (
                <div key={todo.id} className="todo-item">
                  <div>
                    <strong>{todo.title}</strong>
                  </div>
                  <div className="todo-meta">
                    <span className="tag">
                      {todo.completed ? "完了" : "未完了"}
                    </span>
                    <span>{new Date(todo.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
