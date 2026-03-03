import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: "../../dist",
  },
  plugins: [
    tanstackRouter({
      autoCodeSplitting: true,
      enableRouteGeneration: true,
      generatedRouteTree: "./routeTree.gen.ts",
      routesDirectory: "./routes",
      target: "react",
    }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  root: "src/mainview",
  server: {
    port: 5173,
    strictPort: true,
  },
});
