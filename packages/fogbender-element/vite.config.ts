import { defineConfig } from "vite";
import { resolve } from "path";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    sourcemap: true,
    target: "esnext",
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "fogbender-element",
      fileName: "fogbender-element",
    },
    rollupOptions: {
      external: ["twind", "twind/css", "component-register", "solid-element", "fogbender"],
      output: {
        globals: {
          fogbender: "fogbender",
          twind: "twind",
          "twind/css": "twindCss",
          "solid-element": "solidElement",
          "component-register": "componentRegister",
        },
      },
    },
  },
});
