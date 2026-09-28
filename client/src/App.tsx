import { Link, Route, Routes } from 'react-router';
import { TodoDetailPage } from './pages/TodoDetailPage';
import { TodoListPage } from './pages/TodoListPage';

export function App() {
  return (
    <main className="app">
      <h1>To-Do List</h1>
      <Routes>
        <Route path="/" element={<TodoListPage />} />
        <Route path="/todos/:id" element={<TodoDetailPage />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </main>
  );
}

function PageNotFound() {
  return (
    <section>
      <h2>Page not found</h2>
      <Link to="/">Back to all tasks</Link>
    </section>
  );
}
