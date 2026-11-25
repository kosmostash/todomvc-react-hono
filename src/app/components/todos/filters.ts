import { pageRouteMap } from "_/core";

import type { Filter, Todo } from "./types";

/** The URL segment of each filter; "all" is the bare `/` route. */
const SEGMENTS = ["active", "completed"] as const;

/**
 * Maps the optional `{filter}` route param to a filter.
 * Returns `undefined` for a segment that is not a known filter.
 */
export const toFilter = (segment: string | undefined): Filter | undefined => {
  if (segment === undefined) return "all";
  return (SEGMENTS as ReadonlyArray<string>).includes(segment) ? (segment as Filter) : undefined;
};

/** App-relative path of a filter, built from the typed route map (router adds the base). */
export const filterPath = (filter: Filter): string => {
  const route = pageRouteMap["{filter}"];
  return filter === "all"
    ? route.path([], undefined, { prefix: false })
    : route.path([filter], undefined, { prefix: false });
};

export const filterTodos = (todos: ReadonlyArray<Todo>, filter: Filter) => {
  switch (filter) {
    case "active":
      return todos.filter((todo) => !todo.completed);
    case "completed":
      return todos.filter((todo) => todo.completed);
    default:
      return todos;
  }
};
