import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import type { Todo } from "./types";

type Props = {
  todo: Todo;
  editing: boolean;
  onToggle: (id: string, completed: boolean) => void;
  onDestroy: (id: string) => void;
  onSave: (id: string, title: string) => void;
  onEdit: (id: string) => void;
  onStopEditing: () => void;
};

export default function TodoItem(props: Props) {
  const { todo, editing, onToggle, onDestroy, onSave, onEdit, onStopEditing } = props;

  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef<HTMLInputElement>(null);
  // set once the edit is finished (Enter / Escape / blur) so a trailing blur is ignored
  const finished = useRef(false);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const startEditing = () => {
    finished.current = false;
    setDraft(todo.title);
    onEdit(todo.id);
  };

  const commit = () => {
    if (finished.current) return;
    finished.current = true;
    const title = draft.trim();
    if (!title) {
      onDestroy(todo.id);
    } else if (title !== todo.title) {
      onSave(todo.id, title);
    }
    onStopEditing();
  };

  const cancel = () => {
    finished.current = true;
    setDraft(todo.title);
    onStopEditing();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      cancel();
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      commit();
    }
  };

  const className = [todo.completed && "completed", editing && "editing"]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className || undefined}>
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={(event) => onToggle(todo.id, event.target.checked)}
        />
        <label onDoubleClick={startEditing}>{todo.title}</label>
        <button
          className="destroy"
          type="button"
          aria-label={`Delete ${todo.title}`}
          onClick={() => onDestroy(todo.id)}
        />
      </div>
      {editing && (
        <input
          ref={inputRef}
          className="edit"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      )}
    </li>
  );
}
