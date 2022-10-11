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
      external: [
        "fogbender",
        "twind",
        "twind/css",
        "component-register",
        "solid-element",
        "solid-js",
        "solid-js/web",
      ],
      output: {
        globals: {
          fogbender: "fogbender",
          "solid-js": "solid",
          "solid-js/web": "solidWeb",
          "solid-element": "solidElement",
          "component-register": "componentRegister",
        },
      },
    },
  },
});
