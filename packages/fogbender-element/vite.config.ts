import { defineConfig } from "vite";
import { resolve } from "path";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "fogbender-element",
      fileName: "fogbender-element",
    },
  },
});
