import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)), "@shared": fileURLToPath(new URL("./shared", import.meta.url)) } },
  build: { outDir: "dist/renderer", chunkSizeWarningLimit: 1000 },
  test: { environment: "node", include: ["tests/unit/**/*.test.ts"] }
});
