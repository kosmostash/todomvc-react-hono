// Colocated helper (not a route): payload shapes shared by the todos routes.
// The runtime validators are derived from these types by KosmoJS.

export type TodoId = VRefine<string, { format: "uuid" }>;

/** Must contain at least one non-whitespace character; the server trims it. */
export type TodoTitle = VRefine<string, { pattern: "\\S", maxLength: 1024 }>;

export type CreateTodo = {
  id: TodoId;
  title: TodoTitle;
  completed?: boolean;
};

export type UpdateTodo = {
  title?: TodoTitle;
  completed?: boolean;
};

export type ToggleAll = {
  completed: boolean;
};
