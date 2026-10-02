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
      entry: {
        index: resolve(__dirname, "lib/main.ts"),
        // Data-only entry: dependency-free, importable without the rest
        // of the library (e.g. `matsci-parse/periodictable`).
        periodictable: resolve(
          __dirname,
          "lib/core/data/periodictable/index.ts",
        ),
      },
      fileName: (format, entryName) =>
        entryName === "index" ? "index.js" : `${entryName}.js`,
      formats: ["es"],
    },
    sourcemap: true,
    rollupOptions: {
      external: [
        ...Object.keys(packageJson.peerDependencies ?? {}),
        "@spglib/moyo-wasm",
      ],
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
