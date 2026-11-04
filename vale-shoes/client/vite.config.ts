import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const API = process.env.VITE_API_PROXY || "http://localhost:8787";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": API,
      "/uploads": API,
      "/demo-images": API,
      "/thumb": API,
      "/sitemap.xml": API,
      "/robots.txt": API,
    },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1200,
  },
});
