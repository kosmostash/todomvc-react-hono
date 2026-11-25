import { defineRoute } from "_/api";

import { getTodoStore, type Todo } from "~/lib/db";
import type { CreateTodo, ToggleAll } from "./types";

export default defineRoute<"todos">(({ GET, POST, PATCH, DELETE }) => [
  /** List every todo, in creation order. */
  GET<{
    response: [200, "json", Array<Todo>];
  }>(async (ctx) => {
    return ctx.json(getTodoStore().list());
  }),

  /** Create a todo. The client supplies the id so it can render optimistically. */
  POST<{
    json: CreateTodo;
    response: [201, "json", Todo];
  }>(async (ctx) => {
    const { id, title, completed = false } = ctx.validated.json;
    const todo = getTodoStore().create({ id, title: title.trim(), completed });
    return ctx.json(todo, 201);
  }),

  /** "Mark all as complete": set every todo to the given state. */
  PATCH<{
    json: ToggleAll;
    response: [200, "json", Array<Todo>];
  }>(async (ctx) => {
    return ctx.json(getTodoStore().setAllCompleted(ctx.validated.json.completed));
  }),

  /** "Clear completed": remove every completed todo, return what is left. */
  DELETE<{
    response: [200, "json", Array<Todo>];
  }>(async (ctx) => {
    return ctx.json(getTodoStore().clearCompleted());
  }),
]);
