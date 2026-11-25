import { useCallback, useRef, useState } from "react";

import fetchClients from "_/fetch";

import type { Todo } from "./types";
import { uuid } from "./uuid";

const todosApi = fetchClients["todos"];
const todoApi = fetchClients["todos/[id]"];

/**
 * Todo state backed by the server.
 *
 * Every change is applied to local state immediately (optimistic UI), then sent
 * to the API through a queue that runs requests strictly one after another,
 * so the server sees mutations in exactly the order the user made them.
 * If any request fails, the list is reloaded from the server once the queue drains.
 */
export const useTodos = (initialTodos: ReadonlyArray<Todo>) => {
  const [todos, setTodos] = useState<ReadonlyArray<Todo>>(initialTodos);

  const queue = useRef<Promise<void>>(Promise.resolve());
  const pending = useRef(0);
  const failed = useRef(false);

  const sync = useCallback((request: () => Promise<unknown>) => {
    pending.current += 1;
    queue.current = queue.current
      .then(request)
      .then(
        () => undefined,
        (error: unknown) => {
          console.error("Failed to sync todos", error);
          failed.current = true;
        },
      )
      .then(async () => {
        pending.current -= 1;
        if (pending.current > 0 || !failed.current) return;
        failed.current = false;
        try {
          const fresh = await todosApi.GET();
          // a newer optimistic change may have been queued meanwhile; it will resync on its own
          if (pending.current === 0) setTodos(fresh);
        } catch (error) {
          console.error("Failed to reload todos", error);
        }
      });
  }, []);

  const add = useCallback(
    (title: string) => {
      const todo: Todo = { id: uuid(), title, completed: false };
      setTodos((list) => [...list, todo]);
      sync(() => todosApi.POST([], { json: todo }));
    },
    [sync],
  );

  const toggle = useCallback(
    (id: string, completed: boolean) => {
      setTodos((list) => list.map((t) => (t.id === id ? { ...t, completed } : t)));
      sync(() => todoApi.PATCH([id], { json: { completed } }));
    },
    [sync],
  );

  const rename = useCallback(
    (id: string, title: string) => {
      setTodos((list) => list.map((t) => (t.id === id ? { ...t, title } : t)));
      sync(() => todoApi.PATCH([id], { json: { title } }));
    },
    [sync],
  );

  const destroy = useCallback(
    (id: string) => {
      setTodos((list) => list.filter((t) => t.id !== id));
      sync(() => todoApi.DELETE([id]));
    },
    [sync],
  );

  const toggleAll = useCallback(
    (completed: boolean) => {
      setTodos((list) => list.map((t) => (t.completed === completed ? t : { ...t, completed })));
      sync(() => todosApi.PATCH([], { json: { completed } }));
    },
    [sync],
  );

  const clearCompleted = useCallback(() => {
    setTodos((list) => list.filter((t) => !t.completed));
    sync(() => todosApi.DELETE());
  }, [sync]);

  return { todos, add, toggle, rename, destroy, toggleAll, clearCompleted };
};
