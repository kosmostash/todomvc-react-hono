import { getRequestListener } from "@hono/node-server";

import { devSetup } from "_/api:dev";

import { closeTodoStore } from "~/lib/db";

export default devSetup(async () => {
  // imported here, so the app loads with the first API request rather than at start
  const { default: app } = await import("./app");
  return {
    requestHandler: getRequestListener(app.fetch),
    teardownHandler() {
      closeTodoStore();
    },
  };
});
