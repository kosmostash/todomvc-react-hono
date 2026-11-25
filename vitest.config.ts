import { defineConfig, mergeConfig } from "vitest/config";

import { loadConfig } from "@kosmojs/vitest";

export default defineConfig(
  mergeConfig(
    {
      test: {
        // every run starts from an empty, throwaway database
        env: { DATABASE_PATH: ":memory:" },
        testTimeout: 30_000,
        hookTimeout: 60_000,
      },
    },
    await loadConfig(import.meta.dirname),
  ),
);
