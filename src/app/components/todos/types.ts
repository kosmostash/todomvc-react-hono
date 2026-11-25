import type { ResponseT } from "_/fetch";

/** The todo shape, as declared by the API's response schema. */
export type Todo = ResponseT["todos"]["GET"][number];

export type Filter = "all" | "active" | "completed";
