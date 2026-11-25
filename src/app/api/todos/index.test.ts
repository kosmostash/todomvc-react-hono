import { beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/api";

const { client, clients, route } = await prepareHarness("todos");

const ids = {
  a: "00000000-0000-4000-8000-00000000000a",
  b: "00000000-0000-4000-8000-00000000000b",
  c: "00000000-0000-4000-8000-00000000000c",
};

/** The harness types `body` as `T | Error`; narrow it, failing loudly on an error. */
const ok = <T>(body: T | Error): T => {
  if (body instanceof Error) throw body;
  return body;
};

const reset = async () => {
  const { body } = await client.GET();
  for (const todo of ok(body)) {
    await clients["todos/[id]"].DELETE([todo.id]);
  }
};

describe(route, () => {
  beforeEach(reset);

  test("GET starts empty", async () => {
    const { body, response } = await client.GET();
    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  test("POST creates a todo with a trimmed title, returned in creation order", async () => {
    const first = await client.POST([], { json: { id: ids.a, title: "  one  " } });
    expect(first.response.status).toBe(201);
    expect(first.body).toEqual({ id: ids.a, title: "one", completed: false });

    await client.POST([], { json: { id: ids.b, title: "two" } });
    await client.POST([], { json: { id: ids.c, title: "three" } });

    const { body } = await client.GET();
    expect(ok(body).map((t) => t.title)).toEqual(["one", "two", "three"]);
  });

  test("POST is idempotent on id", async () => {
    await client.POST([], { json: { id: ids.a, title: "one" } });
    await client.POST([], { json: { id: ids.a, title: "one again" } });

    const { body } = await client.GET();
    expect(body).toEqual([{ id: ids.a, title: "one", completed: false }]);
  });

  test("POST rejects blank titles and non-uuid ids", async () => {
    const blank = await client.POST([], { json: { id: ids.a, title: "   " } });
    expect(blank.response.status).toBe(400);

    const badId = await client.POST([], {
      json: { id: "not-a-uuid" as never, title: "x" },
    });
    expect(badId.response.status).toBe(400);

    expect((await client.GET()).body).toEqual([]);
  });

  test("PATCH marks every todo as complete / active", async () => {
    await client.POST([], { json: { id: ids.a, title: "one" } });
    await client.POST([], { json: { id: ids.b, title: "two", completed: true } });

    const done = await client.PATCH([], { json: { completed: true } });
    expect(done.response.status).toBe(200);
    expect(ok(done.body).every((t) => t.completed)).toBe(true);

    const undone = await client.PATCH([], { json: { completed: false } });
    expect(ok(undone.body).every((t) => !t.completed)).toBe(true);
  });

  test("DELETE clears completed todos only", async () => {
    await client.POST([], { json: { id: ids.a, title: "one" } });
    await client.POST([], { json: { id: ids.b, title: "two", completed: true } });
    await client.POST([], { json: { id: ids.c, title: "three", completed: true } });

    const { body, response } = await client.DELETE();
    expect(response.status).toBe(200);
    expect(body).toEqual([{ id: ids.a, title: "one", completed: false }]);
  });
});
