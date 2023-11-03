// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import { defineAstro } from "qgp";
import { common } from "./qgp.config.mjs";
import sitemap from "@astrojs/sitemap";
import partytown from "@astrojs/partytown";

const assetsDir = "storefront";

// https://astro.build/config
export default defineConfig({
  site: "https://fogbender.com",
  integrations: [
    mdx(),
    react(),
    sitemap({
      customPages: [
        //
        "https://fogbender.com/login",
        "https://fogbender.com/signup",
      ],
      filter: page =>
        ![
          //
          "https://fogbender.com/SPA",
          "https://fogbender.com/blog/draft",
        ].includes(page),
    }),
    partytown({ config: { forward: ["dataLayer.push"] } }),
  ],
  build: {
    format: "file",
  },
  vite: defineAstro(common, {
    build: {
      assetsDir,
      sourcemap: true,
      rollupOptions: {
        output: {
          entryFileNames: assetsDir + "/[name].[hash].js",
          chunkFileNames: assetsDir + "/chunks/[name].[hash].js",
          assetFileNames: assetsDir + "/assets/[name].[hash][extname]",
        },
      },
    },
    ssr: {
      noExternal: ["smartypants"],
      external: ["svgo", "@11ty/eleventy-img"],
    },
  }),
  server: { port: 3100 },
});
