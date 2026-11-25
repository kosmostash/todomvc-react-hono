import { useState } from "react";

import NewTodo from "./NewTodo";
import TodoFooter from "./TodoFooter";
import TodoItem from "./TodoItem";
import { filterTodos } from "./filters";
import type { Filter, Todo } from "./types";
import { useTodos } from "./useTodos";

type Props = {
  initialTodos: ReadonlyArray<Todo>;
  filter: Filter;
};

export default function TodoApp({ initialTodos, filter }: Props) {
  const { todos, add, toggle, rename, destroy, toggleAll, clearCompleted } = useTodos(initialTodos);
  // editing state is UI-only and never persisted
  const [editingId, setEditingId] = useState<string | null>(null);

  const activeCount = todos.filter((todo) => !todo.completed).length;
  const completedCount = todos.length - activeCount;
  const visibleTodos = filterTodos(todos, filter);

  return (
    <>
      <section className="todoapp">
        <header className="header">
          <h1>todos</h1>
          <NewTodo onCreate={add} />
        </header>

        {todos.length > 0 && (
          <section className="main">
            <input
              id="toggle-all"
              className="toggle-all"
              type="checkbox"
              checked={activeCount === 0}
              onChange={(event) => toggleAll(event.target.checked)}
            />
            <label htmlFor="toggle-all">Mark all as complete</label>
            <ul className="todo-list">
              {visibleTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  editing={editingId === todo.id}
                  onToggle={toggle}
                  onDestroy={destroy}
                  onSave={rename}
                  onEdit={setEditingId}
                  onStopEditing={() => setEditingId(null)}
                />
              ))}
            </ul>
          </section>
        )}

        {todos.length > 0 && (
          <TodoFooter
            activeCount={activeCount}
            completedCount={completedCount}
            onClearCompleted={clearCompleted}
          />
        )}
      </section>

      <footer className="info">
        <p>Double-click to edit a todo</p>
        <p>
          Created with <a href="https://kosmojs.dev">KosmoJS</a>, React and Hono
        </p>
        <p>
          Part of <a href="https://todomvc.com">TodoMVC</a>
        </p>
      </footer>
    </>
  );
}
