// @ts-check
import mdx from "@astrojs/mdx";
import partytown from "@astrojs/partytown";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import checker from "vite-plugin-checker";
import starlight from "@astrojs/starlight";
import { rehypeHeadingIds } from '@astrojs/markdown-remark';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import remarkToc from 'remark-toc';

// const assetsDir = "storefront";

// https://astro.build/config
export default defineConfig({
  markdown: {
    rehypeHeadingIds,
    remarkPlugins: [ [remarkToc, { heading: "contents"} ] ],
    rehypePlugins: [
      rehypeSlug,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "prepend", // Change to "wrap" if needed
          content: {
            type: "text",
            value: " ⚓", // Adds a visible link icon
          },
          properties: { class: "header-anchor" },
        },
      ],
    ],
  },
  site: "https://fogbender.com",
  integrations: [
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
    starlight({
      disable404Route: true,
      title: "Fogbender Docs",
      customCss: ["./src/styles/starlight-custom.css"],
      logo: {
        light: "./src/assets/logotype-light.svg",
        dark: "./src/assets/logotype-dark.svg",
      },
      favicon: "./public/favicon.ico",
      sidebar: [
        {
          label: "Docs home",
          link: "/docs",
        },
        {
          label: "Start here",
          autogenerate: {
            directory: "docs/start-here",
          },
        },
        {
          label: "Libraries",
          autogenerate: {
            directory: "docs/libraries",
          },
        },
        {
          label: "Widget configuration",
          autogenerate: {
            directory: "docs/widget-configuration",
          },
        },
        {
          label: "Roster",
          autogenerate: {
            directory: "docs/roster",
          },
        },
        {
          label: "Messaging features",
          autogenerate: {
            directory: "docs/messaging-features",
          },
        },
        {
          label: "Comms integrations",
          autogenerate: {
            directory: "docs/comms-integrations",
          },
        },
        {
          label: "Issue tracker integrations",
          autogenerate: {
            directory: "docs/issue-tracker-integrations",
          },
        },
      ],
    }),
    mdx(),
  ],
  build: {
    format: "file",
  },
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
    ssr: {
      noExternal: ["smartypants"],
      external: ["svgo", "@11ty/eleventy-img"],
    },
  },
  server: { port: 3100 },
});
