import { type KeyboardEvent, useState } from "react";

export default function NewTodo({ onCreate }: { onCreate: (title: string) => void }) {
  const [title, setTitle] = useState("");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // ignore the Enter that confirms an IME composition
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
    const value = title.trim();
    if (!value) return;
    onCreate(value);
    setTitle("");
  };

  return (
    <input
      className="new-todo"
      placeholder="What needs to be done?"
      autoFocus
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onKeyDown={handleKeyDown}
    />
  );
}
