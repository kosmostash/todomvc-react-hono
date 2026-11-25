# TodoMVC — React + Hono on KosmoJS

A [TodoMVC](https://todomvc.com) implementation built with [KosmoJS](https://kosmojs.dev):
a React frontend with server-side rendering, and a Hono API that stores todos in SQLite via `node:sqlite`.

It follows the [TodoMVC app spec](https://github.com/tastejs/todomvc/blob/master/app-spec.md)
and uses the official `todomvc-app-css` / `todomvc-common` styles and template markup, with two deliberate differences:

| Spec | This app |
| --- | --- |
| Persist to `localStorage` | Persisted **on the server** in SQLite (`node:sqlite`), keys `id`, `title`, `completed` |
| `#/`, `#/active`, `#/completed` hash routes | **Real routes** `/`, `/active`, `/completed`, using the framework's router. The spec asks for the framework's built-in routing where one exists. |

## Requirements

Node.js **22.13+** (for unflagged `node:sqlite`) and pnpm.

## Scripts

```sh
pnpm install
pnpm dev         # dev server on http://127.0.0.1:4556 (client-rendered, HMR)
pnpm preview     # production build + server on http://127.0.0.1:4558 (SSR)
pnpm build       # writes dist/; run with: node dist/run.js
pnpm typecheck
pnpm test        # API specs (in-process) + browser e2e specs (Playwright, against SSR)
```

The e2e specs need a Chromium for Playwright: run `pnpm exec playwright install chromium` once,
or point `CHROMIUM_PATH` at an existing Chromium executable.

## Configuration

| Variable | Default | |
| --- | --- | --- |
| `DATABASE_PATH` | `var/todos.sqlite` | SQLite file, relative to the working directory. `:memory:` for a throwaway database (used by tests via `.env.test`). |

The dev server and `preview` load `.env` files. A production `dist/run.js` reads `process.env` only.

## How it works

```
src/app/
├── kosmo.config.ts              React (SSR on) + Hono, validation, fetch clients, tests
├── lib/db.ts                    node:sqlite repository (WAL, prepared statements)
├── api/todos/
│   ├── types.ts                 payload types -> runtime validators (uuid ids, non-blank titles)
│   ├── index.ts                 GET list · POST create · PATCH toggle all · DELETE clear completed
│   └── [id]/index.ts            GET · PATCH (title / completed) · DELETE
├── pages/{filter}/index.tsx     one page for /, /active, /completed (optional param)
├── pages/404.tsx                paths outside the app, e.g. /active/extra (SSR: 404)
└── components/todos/            TodoApp, TodoItem, TodoFooter, NewTodo, useTodos
```

### API

| Method | Path | Body | Response |
| --- | --- | --- | --- |
| `GET` | `/api/todos` | | `Todo[]` |
| `POST` | `/api/todos` | `{ id: uuid, title, completed? }` | `201 Todo` (idempotent on `id`) |
| `PATCH` | `/api/todos` | `{ completed }` | `Todo[]` (mark all) |
| `DELETE` | `/api/todos` | | `Todo[]` remaining (clear completed) |
| `GET` | `/api/todos/:id` | | `Todo` / `404` |
| `PATCH` | `/api/todos/:id` | `{ title?, completed? }` | `Todo` / `404` |
| `DELETE` | `/api/todos/:id` | | `204` |

Requests are validated by KosmoJS from the TypeScript types: ids must be UUIDs, and titles must contain a non-whitespace character. The server also trims titles. Responses are typed end-to-end into the generated fetch client.

### Rendering and state

- **SSR**: the page `loader` calls the `todos` fetch client. During SSR it runs in-process with no HTTP hop. The HTML arrives with the list, counter and selected filter already rendered, and works with JavaScript disabled.
- **Hydration** reuses the loader data, so the client makes no second request.
- **Optimistic updates**: every change is applied locally right away, then sent to the API through a queue that runs requests one at a time, so the server sees changes in the order they were made. Ids are generated on the client (UUID v4), so new todos render immediately. If a request fails, the list reloads from the server once the queue is empty.
- **Routing**: a single `{filter}` page serves all three filters. Switching filters is a client-side navigation that keeps the component, and its state, mounted. Filter links are `NavLink`s with paths built from KosmoJS's typed route map. An unknown filter (`/nope`) is redirected to `/` by the loader with React Router's `redirect()`: a real `302` under SSR, and a router navigation in the browser.

## Tests

- `src/app/api/todos/**/index.test.ts`: the API through the real routing, validation and error stack, in-process, via the KosmoJS harness.
- `src/app/pages/{filter}/index.test.ts`: the TodoMVC spec in a real Chromium (Playwright), against server-rendered pages (`frontend.test.ssr: true`). Also covers the raw SSR HTML, rendering with JS disabled, hydration and routing.
