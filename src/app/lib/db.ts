import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
};

type TodoRow = {
  id: string;
  title: string;
  completed: number;
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS todos (
    seq       INTEGER PRIMARY KEY AUTOINCREMENT,
    id        TEXT    NOT NULL UNIQUE,
    title     TEXT    NOT NULL,
    completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1))
  )
`;

const toTodo = ({ id, title, completed }: TodoRow): Todo => ({
  id,
  title,
  completed: completed === 1,
});

/**
 * Thin repository over a single `todos` table.
 * Insertion order (`seq`) is the display order, same as the TodoMVC reference apps.
 */
export const createTodoStore = (location: string) => {
  if (location !== ":memory:") {
    mkdirSync(dirname(resolve(location)), { recursive: true });
  }

  const db = new DatabaseSync(location);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(SCHEMA);

  const statements = {
    list: db.prepare("SELECT id, title, completed FROM todos ORDER BY seq"),
    get: db.prepare("SELECT id, title, completed FROM todos WHERE id = ?"),
    insert: db.prepare(
      "INSERT INTO todos (id, title, completed) VALUES (?, ?, ?) RETURNING id, title, completed",
    ),
    update: db.prepare(
      `UPDATE todos
          SET title = COALESCE(:title, title),
              completed = COALESCE(:completed, completed)
        WHERE id = :id
    RETURNING id, title, completed`,
    ),
    remove: db.prepare("DELETE FROM todos WHERE id = ?"),
    setAll: db.prepare("UPDATE todos SET completed = ?"),
    clearCompleted: db.prepare("DELETE FROM todos WHERE completed = 1"),
  };

  return {
    list(): Array<Todo> {
      return (statements.list.all() as Array<TodoRow>).map(toTodo);
    },

    get(id: string): Todo | undefined {
      const row = statements.get.get(id) as TodoRow | undefined;
      return row ? toTodo(row) : undefined;
    },

    /** Idempotent on `id`, so a retried request never duplicates a todo. */
    create(todo: Todo): Todo {
      const existing = this.get(todo.id);
      if (existing) return existing;
      return toTodo(
        statements.insert.get(todo.id, todo.title, todo.completed ? 1 : 0) as TodoRow,
      );
    },

    update(id: string, patch: { title?: string; completed?: boolean }): Todo | undefined {
      const row = statements.update.get({
        id,
        title: patch.title ?? null,
        completed: patch.completed === undefined ? null : patch.completed ? 1 : 0,
      }) as TodoRow | undefined;
      return row ? toTodo(row) : undefined;
    },

    remove(id: string): boolean {
      return Number(statements.remove.run(id).changes) > 0;
    },

    setAllCompleted(completed: boolean): Array<Todo> {
      statements.setAll.run(completed ? 1 : 0);
      return this.list();
    },

    clearCompleted(): Array<Todo> {
      statements.clearCompleted.run();
      return this.list();
    },

    close() {
      if (db.isOpen) db.close();
    },
  };
};

export type TodoStore = ReturnType<typeof createTodoStore>;

let store: TodoStore | undefined;

/**
 * Lazily opened, process-wide store.
 * `DATABASE_PATH` selects the file (`:memory:` for tests); defaults to `var/todos.sqlite`.
 */
export const getTodoStore = (): TodoStore => {
  store ??= createTodoStore(process.env.DATABASE_PATH || "var/todos.sqlite");
  return store;
};

export const closeTodoStore = () => {
  store?.close();
  store = undefined;
};
