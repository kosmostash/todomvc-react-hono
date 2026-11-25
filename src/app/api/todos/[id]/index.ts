import { HTTPError } from "@kosmojs/core/errors";

import { defineRoute } from "_/api";

import { getTodoStore, type Todo } from "~/lib/db";
import type { TodoId, UpdateTodo } from "../types";

export default defineRoute<"todos/[id]", [TodoId]>(({ GET, PATCH, DELETE }) => [
  GET<{
    response: [200, "json", Todo];
  }>(async (ctx) => {
    const todo = getTodoStore().get(ctx.validated.params.id);
    if (!todo) throw new HTTPError([404, "Todo not found"]);
    return ctx.json(todo);
  }),

  /** Rename and/or toggle a single todo. */
  PATCH<{
    json: UpdateTodo;
    response: [200, "json", Todo];
  }>(async (ctx) => {
    const { title, completed } = ctx.validated.json;
    const todo = getTodoStore().update(ctx.validated.params.id, {
      ...(title === undefined ? {} : { title: title.trim() }),
      ...(completed === undefined ? {} : { completed }),
    });
    if (!todo) throw new HTTPError([404, "Todo not found"]);
    return ctx.json(todo);
  }),

  /**
   * Destroy a single todo; answers 204 No Content.
   * Idempotent: deleting a missing todo is not an error.
   */
  DELETE(async (ctx) => {
    getTodoStore().remove(ctx.validated.params.id);
    return ctx.body(null, 204);
  }),
]);
