import { type LoaderFunctionArgs, useLoaderData, useParams } from "react-router";

import fetchClients from "_/fetch";

import TodoApp from "~/components/todos/TodoApp";
import { toFilter } from "~/components/todos/filters";
import type { Todo } from "~/components/todos/types";
import NotFound from "~/pages/404";

const { GET } = fetchClients["todos"];

/**
 * One page serves `/`, `/active` and `/completed` (optional `{filter}` param),
 * so the component stays mounted - and its state intact - while switching filters.
 *
 * The loader runs before render: in-process during SSR, over HTTP on client navigation.
 * Unknown filters (`/nope`) skip the fetch and render the 404 page.
 */
export const loader = ({ params }: LoaderFunctionArgs) => {
  return toFilter(params.filter) ? GET() : null;
};

export default function TodosPage() {
  const todos = useLoaderData<Array<Todo> | null>();
  const filter = toFilter(useParams().filter);

  if (!filter || !todos) {
    return <NotFound />;
  }

  return <TodoApp initialTodos={todos} filter={filter} />;
}
