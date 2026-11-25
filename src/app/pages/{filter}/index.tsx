import { type LoaderFunctionArgs, redirect, useLoaderData, useParams } from "react-router";

import fetchClients from "_/fetch";

import TodoApp from "~/components/todos/TodoApp";
import { filterPath, toFilter } from "~/components/todos/filters";
import type { Todo } from "~/components/todos/types";

const { GET } = fetchClients["todos"];

/**
 * One page serves `/`, `/active` and `/completed` (optional `{filter}` param),
 * so the component stays mounted - and its state intact - while switching filters.
 *
 * The loader runs before render: in-process during SSR, over HTTP on client navigation.
 * Unknown filters (`/nope`) redirect to `/` - a real 3xx under SSR,
 * a router navigation in the browser.
 */
export const loader = ({ params }: LoaderFunctionArgs) => {
  if (!toFilter(params.filter)) {
    throw redirect(filterPath("all"));
  }
  return GET();
};

export default function TodosPage() {
  const todos = useLoaderData<Array<Todo>>();
  const filter = toFilter(useParams().filter) ?? "all";
  return <TodoApp initialTodos={todos} filter={filter} />;
}
