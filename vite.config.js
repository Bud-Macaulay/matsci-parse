import { resolve } from "path";
import { defineConfig } from "vite";

import packageJson from "./package.json";

export default defineConfig({
  resolve: {
    extensions: [".ts", ".js"],
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
