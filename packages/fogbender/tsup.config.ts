import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"], // or 'src/index.tsx' if that’s the main file
  format: ["esm", "cjs"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true, // if you're publishing types
  target: "esnext", // or 'es2020' if you prefer
});
