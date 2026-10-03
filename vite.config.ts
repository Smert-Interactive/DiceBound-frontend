import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/vitest.setup.ts",
  },

  server: {
    host: '0.0.0.0',
    port: 5173
  }
});