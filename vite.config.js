import { resolve } from "path";
import { defineConfig } from "vite";

import packageJson from "./package.json";
import path from "path";

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
      fileName: "main",
      formats: ["es"],
    },
    rollupOptions: {
      external: [...Object.keys(packageJson.peerDependencies ?? {})],
    },
  },
});
