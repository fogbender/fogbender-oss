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
        overlay: { initialIsOpen: false, badgeStyle: "left: 55px; bottom: 8px;" },
      }),
    ],
    build: {
      sourcemap: true,
    },
    resolve: {
      alias: [
        {
          find: "./runtimeConfig",
          replacement: "./runtimeConfig.browser",
        },
        {
          find: "fogbender-proto",
          replacement: "fogbender-proto/src",
        },
      ],
    },
  },
  server: { port: 3300 },
});
