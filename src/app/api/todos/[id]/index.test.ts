import { beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/api";

const { client, clients, route } = await prepareHarness("todos/[id]");

const id = "00000000-0000-4000-8000-0000000000aa";
const missing = "00000000-0000-4000-8000-0000000000ff";

describe(route, () => {
  beforeEach(async () => {
    await client.DELETE([id]);
    await clients["todos"].POST([], { json: { id, title: "write tests" } });
  });

  test("GET returns one todo", async () => {
    const { body, response } = await client.GET([id]);
    expect(response.status).toBe(200);
    expect(body).toEqual({ id, title: "write tests", completed: false });
  });

  test("GET 404s for an unknown todo", async () => {
    const { response } = await client.GET([missing]);
    expect(response.status).toBe(404);
  });

  test("PATCH toggles completion", async () => {
    const { body } = await client.PATCH([id], { json: { completed: true } });
    expect(body).toEqual({ id, title: "write tests", completed: true });
  });

  test("PATCH renames with a trimmed title and keeps completion", async () => {
    await client.PATCH([id], { json: { completed: true } });
    const { body } = await client.PATCH([id], { json: { title: "  ship it " } });
    expect(body).toEqual({ id, title: "ship it", completed: true });
  });

  test("PATCH rejects a blank title", async () => {
    const { response } = await client.PATCH([id], { json: { title: " " } });
    expect(response.status).toBe(400);
  });

  test("PATCH 404s for an unknown todo", async () => {
    const { response } = await client.PATCH([missing], { json: { completed: true } });
    expect(response.status).toBe(404);
  });

  test("DELETE removes the todo and answers 204", async () => {
    const { response } = await client.DELETE([id]);
    expect(response.status).toBe(204);
    expect((await client.GET([id])).response.status).toBe(404);
  });

  test("DELETE is idempotent", async () => {
    await client.DELETE([id]);
    const { response } = await client.DELETE([id]);
    expect(response.status).toBe(204);
  });

  test("rejects a non-uuid id", async () => {
    const { response } = await client.GET(["nope" as never]);
    expect(response.status).toBe(400);
  });
});
