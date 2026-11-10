import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // The economy engine uses node:crypto for seeded randomness; the browser demo swaps in a pure-JS equivalent.
      "node:crypto": path.resolve(__dirname, "./src/demo/economy/crypto-shim.ts"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        demo: path.resolve(__dirname, "demo/index.html"),
      },
    },
  },
});
