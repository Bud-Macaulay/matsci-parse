import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

// mc-react-structure-visualizer 0.11.1 creates its 3Dmol viewer with 3Dmol's
// default antialias: true, which also turns on 3Dmol's "upscale": the canvas is
// drawn at >= 2x device pixels (4x the pixels), on every mouse move. In this
// app's large pane that makes rotating laggy. upscale: false keeps the
// (browser) antialiasing at native resolution.
// TODO: remove once mc-react-structure-visualizer passes upscale: false itself.
function visualizerWithoutUpscale() {
  const call = /(createViewer\(\w+\.current, \{\s*backgroundColor: "white",\s*orthographic: !0)/;
  return {
    name: "visualizer-without-upscale",
    enforce: "pre",
    transform(code, id) {
      if (!id.includes("mc-react-structure-visualizer/dist/main.js")) return null;
      if (!call.test(code)) {
        this.warn("mc-react-structure-visualizer changed: the upscale patch no longer applies");
        return null;
      }
      return { code: code.replace(call, "$1, upscale: !1"), map: null };
    },
  };
}

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
    // not pre-bundled, so that visualizerWithoutUpscale() applies in dev too
    // (it only imports react)
    exclude: ["mc-react-structure-visualizer"],
  },
  plugins: [
    visualizerWithoutUpscale(),
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
