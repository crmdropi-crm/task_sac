import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// En desarrollo, el frontend corre en :5173 y hace proxy de /api al backend :3000.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
