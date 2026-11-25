import { defineConfig } from "@kosmojs/dev";

export default defineConfig({
  frontend: {
    stack: "react",
    base: "/",
    ssr: true,
    ssg: false,
    tanstack: { query: false },
    // e2e specs live beside the page and drive a real browser (Playwright);
    // ssr: the harness serves server-rendered HTML, so specs cover SSR + hydration
    test: { seed: false, ssr: true },
  },
  backend: {
    stack: "hono",
    base: "/api",
    // route specs live beside each route and run in-process, no server
    test: { seed: false },
  },
  fetch: true,
  validation: true,
  typecheck: true,
});
