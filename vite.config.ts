import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const githubPages = process.env.GITHUB_PAGES === "true";

export default defineConfig({
  // GitHub Pages: https://wtfinatruck.github.io/trap-war/
  base: githubPages ? "/trap-war/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    outDir: "dist",
  },
});