import { NavLink } from "react-router";

import { filterPath } from "./filters";
import type { Filter } from "./types";

const FILTER_LINKS: ReadonlyArray<{ filter: Filter; label: string }> = [
  { filter: "all", label: "All" },
  { filter: "active", label: "Active" },
  { filter: "completed", label: "Completed" },
];

type Props = {
  activeCount: number;
  completedCount: number;
  onClearCompleted: () => void;
};

export default function TodoFooter({ activeCount, completedCount, onClearCompleted }: Props) {
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount}</strong>
        {` ${activeCount === 1 ? "item" : "items"} left`}
      </span>
      <ul className="filters">
        {FILTER_LINKS.map(({ filter, label }) => (
          <li key={filter}>
            {/* the router marks the current route; TodoMVC styles it as .selected */}
            <NavLink
              to={filterPath(filter)}
              end
              className={({ isActive }) => (isActive ? "selected" : undefined)}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
      {completedCount > 0 && (
        <button className="clear-completed" type="button" onClick={onClearCompleted}>
          Clear completed
        </button>
      )}
    </footer>
  );
}
