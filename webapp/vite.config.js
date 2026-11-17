import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "../lib"),
      "matsci-parse": resolve(__dirname, "../lib/main.ts"),
      // weas@materialscloud's package.json points at dist/index.es.js, but it
      // ships dist/index.mjs
      weas: resolve(__dirname, "node_modules/weas/dist/index.mjs"),
    },
  },
  optimizeDeps: {
    include: ["@peterspackman/mlip.js"],
  },
  plugins: [
    react(),
    tailwindcss(),
    visualizer({
      filename: "dist/stats.html",
      open: true,
      gzipSize: true,
      brotliSize: true,
      template: "treemap",
    }),
  ],
});
