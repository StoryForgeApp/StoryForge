import { join } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": join(import.meta.dirname, "src"),
    },
  },
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
  },
});
