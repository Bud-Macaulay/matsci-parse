import { resolve } from "path";
import { defineConfig } from "vite";
import { visualizer } from "rollup-plugin-visualizer";
import path from "path";
import packageJson from "./package.json";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "lib"),
    },
  },
  esbuild: {
    loader: "ts",
    include: /\.ts$/,
  },
  build: {
    lib: {
      entry: resolve(__dirname, "lib/main.ts"),
      fileName: "index",
      formats: ["es"],
    },
    sourcemap: true,
    rollupOptions: {
      external: [...Object.keys(packageJson.peerDependencies ?? {})],
      plugins: [
        visualizer({
          filename: "dist/stats.html",
          open: true,
          gzipSize: true,
          brotliSize: true,
          template: "treemap",
        }),
      ],
    },
  },
});
