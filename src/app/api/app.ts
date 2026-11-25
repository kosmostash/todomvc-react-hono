import appFactory from "_/api:factory";
import defaultErrorHandler from "./errors";

export default appFactory(({ app }) => {
  app.onError(defaultErrorHandler);
})
