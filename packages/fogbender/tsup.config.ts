import { defineConfig } from "tsup";

export default defineConfig(options => {
  return {
    clean: !options.watch,
    dts: "src/index.ts",
    format: ["esm", "cjs"],
    // target: "es5",
    entryPoints: ["src/index.ts"],
    sourcemap: true,
  };
});
