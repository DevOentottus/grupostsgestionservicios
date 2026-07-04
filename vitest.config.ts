import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "shared/types"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["node_modules", "dist", "backend"],
  },
});
