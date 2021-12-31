import { defineConfig } from "tsup";
import { solidPlugin } from "esbuild-plugin-solid";

export default defineConfig(options => {
  return {
    clean: !options.watch,
    dts: "src/index.ts",
    format: ["esm", "cjs"],
    // target: "es5",
    entryPoints: ["src/index.ts"],
    esbuildPlugins: [solidPlugin()],
    sourcemap: true,
  };
});
