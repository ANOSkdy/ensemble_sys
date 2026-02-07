import TodoForm from './components/TodoForm';
import { listTodos } from '../lib/todos';

export default async function Page() {
  let todos: Awaited<ReturnType<typeof listTodos>> = [];
  try {
    todos = await listTodos(20);
  } catch {
    todos = [];
  }

  return (
    <main className="main">
      <section className="card">
        <h2 className="card-title">新しい Todo</h2>
        <TodoForm />
      </section>

      <section className="card">
        <div className="card-header">
          <h2 className="card-title">最新の Todo</h2>
          <span className="tag">最新 {todos.length} 件</span>
        </div>
        <ul className="todo-list">
          {todos.length === 0 ? (
            <li className="empty">まだ Todo がありません。</li>
          ) : (
            todos.map((todo) => (
              <li key={todo.id} className="todo-item">
                <span className="todo-title">{todo.title}</span>
                <span className={`status ${todo.completed ? 'done' : 'open'}`}>
                  {todo.completed ? '完了' : '未完了'}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}
