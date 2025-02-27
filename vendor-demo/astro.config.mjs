// @ts-check
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import checker from "vite-plugin-checker";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [
      checker({
        typescript: true,
        overlay: { initialIsOpen: false },
      }),
    ],
    build: {
      sourcemap: true,
    },
  },
  server: { port: 3200 },
});
