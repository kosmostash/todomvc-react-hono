/**
 * End-to-end checks of the TodoMVC spec (https://github.com/tastejs/todomvc/blob/master/app-spec.md),
 * driven in a real browser against the server the KosmoJS harness starts.
 * The harness runs with `ssr: true`, so every page arrives server-rendered and then hydrates.
 */
import { type Browser, chromium, type Locator, type Page } from "playwright";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { prepareHarness } from "_/test/pages";

const { page: todosPage, base, route } = await prepareHarness("{filter}");

type FilterSegment = "active" | "completed";

const href = (filter?: FilterSegment) => (filter ? todosPage.href([filter]) : todosPage.href());

const api = `${base}/api/todos`;

type Todo = { id: string; title: string; completed: boolean };

const serverTodos = async (): Promise<Array<Todo>> => (await fetch(api)).json();

/** Wait until the server holds exactly these titles (requests are async). */
const expectServerTitles = async (titles: Array<string>) => {
  await expect
    .poll(async () => (await serverTodos()).map((t) => t.title), { timeout: 5_000 })
    .toEqual(titles);
};

/** Create todos directly through the API, as another client would. */
const seed = async (...todos: Array<Pick<Todo, "title" | "completed">>) => {
  for (const todo of todos) {
    await fetch(api, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), ...todo }),
    });
  }
};

const serverHtml = async (filter?: FilterSegment) => (await fetch(href(filter))).text();

let browser: Browser;
let tab: Page;

const $ = (selector: string): Locator => tab.locator(selector);
const items = () => $(".todo-list li");
const newTodo = () => $(".new-todo");
const filterLink = (label: string) => $(".filters a").filter({ hasText: label });
const titles = () => items().locator("label").allTextContents();
const selected = () => $(".filters a.selected").textContent();

const addTodos = async (...list: Array<string>) => {
  for (const title of list) {
    await newTodo().fill(title);
    await newTodo().press("Enter");
  }
};

/**
 * The page arrives server-rendered; wait until React has hydrated it,
 * otherwise input typed into the static markup would be lost.
 */
const hydrated = () =>
  tab.waitForFunction(() => {
    const input = document.querySelector(".new-todo");
    return !!input && Object.keys(input).some((key) => key.startsWith("__reactFiber"));
  });

const open = async (filter?: FilterSegment) => {
  await tab.goto(href(filter));
  await hydrated();
};

const reload = async () => {
  await tab.reload();
  await hydrated();
};

beforeAll(async () => {
  // CHROMIUM_PATH: use an existing Chromium instead of the one `playwright install` provides
  const executablePath = process.env.CHROMIUM_PATH;
  browser = await chromium.launch(executablePath ? { executablePath } : {});
});

afterAll(async () => {
  await browser?.close();
});

beforeEach(async () => {
  for (const todo of await serverTodos()) {
    await fetch(`${api}/${todo.id}`, { method: "DELETE" });
  }
  if (tab && !tab.isClosed()) await tab.close();
  tab = await browser.newPage();
  await open();
});

describe(route, () => {
  test("renders the title and the template structure", async () => {
    expect(await tab.title()).toBe("React + Hono • TodoMVC");
    expect(await $(".todoapp .header h1").textContent()).toBe("todos");
    expect(await newTodo().getAttribute("placeholder")).toBe("What needs to be done?");
    expect(await $(".info").textContent()).toContain("Double-click to edit a todo");
  });

  describe("No todos", () => {
    test("hides #main and #footer", async () => {
      expect(await $(".main").count()).toBe(0);
      expect(await $(".footer").count()).toBe(0);
    });
  });

  describe("New todo", () => {
    test("is focused on page load", async () => {
      await tab.waitForFunction(() => document.activeElement?.classList.contains("new-todo"));
    });

    test("creates todos on Enter, appended to the bottom of the list", async () => {
      await addTodos("buy some cheese", "feed the cat");
      await expect.poll(titles).toEqual(["buy some cheese", "feed the cat"]);
      await expectServerTitles(["buy some cheese", "feed the cat"]);
    });

    test("clears the input once an item is added", async () => {
      await addTodos("buy some cheese");
      await expect.poll(() => newTodo().inputValue()).toBe("");
    });

    test("trims the text input", async () => {
      await addTodos("   buy some cheese   ");
      await expect.poll(titles).toEqual(["buy some cheese"]);
    });

    test("does not create empty todos", async () => {
      await addTodos("", "    ");
      await expect.poll(() => items().count()).toBe(0);
      await expect.poll(() => $(".main").count()).toBe(0);
    });

    test("shows #main and #footer once a todo is added", async () => {
      await addTodos("buy some cheese");
      await expect.poll(() => $(".main").isVisible()).toBe(true);
      await expect.poll(() => $(".footer").isVisible()).toBe(true);
    });
  });

  describe("Mark all as complete", () => {
    beforeEach(async () => {
      await addTodos("one", "two", "three");
    });

    test("marks all items as completed", async () => {
      await $(".toggle-all + label").click();
      await expect.poll(() => $(".todo-list li.completed").count()).toBe(3);
      await expect.poll(async () => (await serverTodos()).every((t) => t.completed)).toBe(true);
    });

    test("clears the completed state of all items", async () => {
      await $(".toggle-all + label").click();
      await $(".toggle-all + label").click();
      await expect.poll(() => $(".todo-list li.completed").count()).toBe(0);
      await expect.poll(async () => (await serverTodos()).some((t) => t.completed)).toBe(false);
    });

    test("updates its state when items are completed / cleared", async () => {
      const toggleAll = $(".toggle-all");
      await $(".toggle-all + label").click();
      await expect.poll(() => toggleAll.isChecked()).toBe(true);

      await items().nth(0).locator(".toggle").uncheck();
      await expect.poll(() => toggleAll.isChecked()).toBe(false);

      await items().nth(0).locator(".toggle").check();
      await expect.poll(() => toggleAll.isChecked()).toBe(true);
    });

    test("is unchecked after Clear completed", async () => {
      await $(".toggle-all + label").click();
      await $(".clear-completed").click();
      await expect.poll(() => $(".main").count()).toBe(0);
      await addTodos("four");
      await expect.poll(() => $(".toggle-all").isChecked()).toBe(false);
    });
  });

  describe("Item", () => {
    beforeEach(async () => {
      await addTodos("one", "two");
    });

    test("can be marked as complete / incomplete", async () => {
      const first = items().nth(0);
      await first.locator(".toggle").check();
      await expect.poll(() => first.getAttribute("class")).toBe("completed");
      await expect.poll(() => items().nth(1).getAttribute("class")).toBeNull();

      await first.locator(".toggle").uncheck();
      await expect.poll(() => first.getAttribute("class")).toBeNull();
    });

    test("can be destroyed with the remove button (shown on hover)", async () => {
      const first = items().nth(0);
      await first.hover();
      await first.locator(".destroy").click();
      await expect.poll(titles).toEqual(["two"]);
      await expectServerTitles(["two"]);
    });

    test("double-clicking the label enters editing mode", async () => {
      const first = items().nth(0);
      await first.locator("label").dblclick();
      await expect.poll(() => first.getAttribute("class")).toBe("editing");
      await expect.poll(() => first.locator(".edit").inputValue()).toBe("one");
    });
  });

  describe("Editing", () => {
    beforeEach(async () => {
      await addTodos("one", "two", "three");
      await items().nth(1).locator("label").dblclick();
    });

    const edit = () => items().nth(1).locator(".edit");

    test("hides the other controls and focuses the edit field", async () => {
      await expect.poll(() => items().nth(1).locator(".toggle").isVisible()).toBe(false);
      await expect.poll(() => items().nth(1).locator("label").isVisible()).toBe(false);
      await expect.poll(() => edit().evaluate((el) => el === document.activeElement)).toBe(true);
    });

    test("saves on Enter", async () => {
      await edit().fill("buy some sausages");
      await edit().press("Enter");
      await expect.poll(titles).toEqual(["one", "buy some sausages", "three"]);
      await expect.poll(() => items().nth(1).getAttribute("class")).toBeNull();
      await expectServerTitles(["one", "buy some sausages", "three"]);
    });

    test("saves on blur", async () => {
      await edit().fill("buy some sausages");
      await edit().blur();
      await expect.poll(titles).toEqual(["one", "buy some sausages", "three"]);
      await expect.poll(() => $(".todo-list li.editing").count()).toBe(0);
    });

    test("trims the entered text", async () => {
      await edit().fill("    buy some sausages    ");
      await edit().press("Enter");
      await expect.poll(titles).toEqual(["one", "buy some sausages", "three"]);
    });

    test("removes the item if an empty text string is entered", async () => {
      await edit().fill("   ");
      await edit().press("Enter");
      await expect.poll(titles).toEqual(["one", "three"]);
      await expectServerTitles(["one", "three"]);
    });

    test("cancels edits on Escape", async () => {
      await edit().fill("foo");
      await edit().press("Escape");
      await expect.poll(titles).toEqual(["one", "two", "three"]);
      await expect.poll(() => $(".todo-list li.editing").count()).toBe(0);
      await expectServerTitles(["one", "two", "three"]);
    });
  });

  describe("Counter", () => {
    test("displays the number of active todos, pluralized, inside <strong>", async () => {
      await addTodos("one");
      await expect.poll(() => $(".todo-count").textContent()).toBe("1 item left");
      await expect.poll(() => $(".todo-count strong").textContent()).toBe("1");

      await addTodos("two");
      await expect.poll(() => $(".todo-count").textContent()).toBe("2 items left");

      await $(".toggle-all + label").click();
      await expect.poll(() => $(".todo-count").textContent()).toBe("0 items left");
    });
  });

  describe("Clear completed button", () => {
    beforeEach(async () => {
      await addTodos("one", "two", "three");
    });

    test("is hidden when there are no completed items", async () => {
      await expect.poll(() => $(".clear-completed").count()).toBe(0);
    });

    test("removes completed items when clicked", async () => {
      await items().nth(1).locator(".toggle").check();
      await $(".clear-completed").click();
      await expect.poll(titles).toEqual(["one", "three"]);
      await expect.poll(() => $(".clear-completed").count()).toBe(0);
      await expectServerTitles(["one", "three"]);
    });
  });

  describe("Persistence (server, node:sqlite)", () => {
    test("persists titles and completed state across reloads", async () => {
      await addTodos("one", "two");
      await items().nth(1).locator(".toggle").check();
      await expect
        .poll(async () => (await serverTodos()).map((t) => [t.title, t.completed]))
        .toEqual([
          ["one", false],
          ["two", true],
        ]);

      await reload();
      await expect.poll(titles).toEqual(["one", "two"]);
      await expect.poll(() => items().nth(1).getAttribute("class")).toBe("completed");
      await expect.poll(() => items().nth(1).locator(".toggle").isChecked()).toBe(true);
    });

    test("does not persist editing mode", async () => {
      await addTodos("one");
      await expectServerTitles(["one"]);
      await items().nth(0).locator("label").dblclick();
      await reload();
      await expect.poll(() => $(".todo-list li.editing").count()).toBe(0);
    });

    test("loads todos created by another client", async () => {
      await seed({ title: "from another client", completed: false });
      await reload();
      await expect.poll(titles).toEqual(["from another client"]);
    });
  });

  describe("Routing", () => {
    beforeEach(async () => {
      await addTodos("one", "two", "three");
      await items().nth(1).locator(".toggle").check();
      await expect.poll(async () => (await serverTodos()).filter((t) => t.completed).length).toBe(1);
    });

    test("shows active items", async () => {
      await filterLink("Active").click();
      await expect.poll(() => tab.url()).toBe(href("active"));
      await expect.poll(titles).toEqual(["one", "three"]);
      await expect.poll(selected).toBe("Active");
    });

    test("shows completed items", async () => {
      await filterLink("Completed").click();
      await expect.poll(() => tab.url()).toBe(href("completed"));
      await expect.poll(titles).toEqual(["two"]);
      await expect.poll(selected).toBe("Completed");
    });

    test("shows all items", async () => {
      await filterLink("Active").click();
      await expect.poll(titles).toEqual(["one", "three"]);
      await filterLink("All").click();
      await expect.poll(() => tab.url()).toBe(href());
      await expect.poll(titles).toEqual(["one", "two", "three"]);
      await expect.poll(selected).toBe("All");
    });

    test("respects the back button", async () => {
      await filterLink("Active").click();
      await expect.poll(titles).toEqual(["one", "three"]);
      await filterLink("Completed").click();
      await expect.poll(titles).toEqual(["two"]);
      await tab.goBack();
      await expect.poll(titles).toEqual(["one", "three"]);
      await tab.goBack();
      await expect.poll(titles).toEqual(["one", "two", "three"]);
    });

    test("hides an item that no longer matches the current filter", async () => {
      await filterLink("Active").click();
      await expect.poll(titles).toEqual(["one", "three"]);
      // check() would wait for the box to stay checked, but the item leaves the list
      await items().nth(0).locator(".toggle").click();
      await expect.poll(titles).toEqual(["three"]);
    });

    test("filter routes can be opened directly and survive a reload", async () => {
      await open("completed");
      await expect.poll(titles).toEqual(["two"]);
      await expect.poll(selected).toBe("Completed");
      await reload();
      await expect.poll(titles).toEqual(["two"]);
      await expect.poll(selected).toBe("Completed");
    });

    test("filter links point at real paths", async () => {
      const paths = await $(".filters a").evaluateAll((links) =>
        links.map((link) => new URL((link as HTMLAnchorElement).href).pathname),
      );
      expect(paths).toEqual(["/", "/active", "/completed"]);
    });

    test("switches filters client-side, without a full page load", async () => {
      await tab.evaluate(() => Object.assign(window, { __marker: 1 }));
      await filterLink("Completed").click();
      await expect.poll(titles).toEqual(["two"]);
      expect(await tab.evaluate(() => (window as { __marker?: number }).__marker)).toBe(1);
    });

    test("keeps in-progress input while switching filters", async () => {
      await newTodo().fill("half typed");
      await filterLink("Active").click();
      await expect.poll(titles).toEqual(["one", "three"]);
      expect(await newTodo().inputValue()).toBe("half typed");
    });

    test("redirects unknown filters to /", async () => {
      // under SSR the redirect is a real 3xx, not a page that navigates once loaded
      const response = await fetch(`${base}/nope`, { redirect: "manual" });
      expect(response.status).toBe(302);
      expect(response.headers.get("location")).toBe("/");
      expect(await response.text()).toBe("");

      await tab.goto(`${base}/nope`);
      await expect.poll(() => new URL(tab.url()).pathname).toBe("/");
      await expect.poll(titles).toEqual(["one", "two", "three"]);
    });

    test("redirects unknown filters during client-side navigation", async () => {
      await tab.evaluate(() => {
        history.pushState(null, "", "/nope");
        dispatchEvent(new PopStateEvent("popstate"));
      });
      await expect.poll(() => new URL(tab.url()).pathname).toBe("/");
      await expect.poll(titles).toEqual(["one", "two", "three"]);
    });
  });

  describe("Not found", () => {
    test("renders the 404 page with a 404 status for paths outside the app", async () => {
      const response = await fetch(`${base}/active/extra`);
      expect(response.status).toBe(404);
      const html = await response.text();
      expect(html).toContain("404 - Not Found");
      expect(html).not.toContain('class="todoapp"');
    });
  });

  describe("Server-side rendering", () => {
    test("renders the persisted todos into the HTML", async () => {
      await seed({ title: "ssr <one>", completed: false }, { title: "ssr two", completed: true });
      const html = await serverHtml();
      expect(html).toContain('<section class="todoapp">');
      expect(html).toContain("<label>ssr &lt;one&gt;</label>");
      expect(html).toMatch(/<li class="completed">.*?<label>ssr two<\/label>/s);
      expect(html).toContain("<strong>1</strong> item left");
      expect(html).toContain('class="clear-completed"');
    });

    test("renders the selected filter on the server", async () => {
      await seed({ title: "open", completed: false }, { title: "done", completed: true });
      const html = await serverHtml("completed");
      expect(html).toContain("<label>done</label>");
      expect(html).not.toContain("<label>open</label>");
      expect(html).toMatch(/<a\b(?=[^>]*\bclass="selected")(?=[^>]*\bhref="\/completed")[^>]*>/);
    });

    test("renders the empty state without #main and #footer", async () => {
      const html = await serverHtml();
      expect(html).toContain('class="new-todo"');
      expect(html).not.toContain('class="main"');
      expect(html).not.toContain('class="footer"');
    });

    test("shows the filtered list with JavaScript disabled", async () => {
      await seed({ title: "no js needed", completed: false }, { title: "hidden", completed: true });
      const context = await browser.newContext({ javaScriptEnabled: false });
      const noJs = await context.newPage();
      await noJs.goto(href("active"));
      const labels = await noJs.locator(".todo-list li label").allTextContents();
      expect(labels).toEqual(["no js needed"]);
      await context.close();
    });

    test("hydrates into a working app", async () => {
      await seed({ title: "hydrate me", completed: false });
      await reload();
      await items().nth(0).locator(".toggle").check();
      await expect.poll(async () => (await serverTodos())[0]?.completed).toBe(true);
    });
  });
});
