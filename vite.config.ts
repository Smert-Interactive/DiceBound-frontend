import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/vitest.setup.ts",
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      // Сохраняем Origin браузера для серверной проверки разрешённого frontend.
      "/api": { target: "http://localhost:3000", changeOrigin: false },
    },
  },
});
