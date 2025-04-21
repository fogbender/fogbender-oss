import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  external: ["solid-js/web"],
  sourcemap: true,
  dts: true,
  clean: true,
});
