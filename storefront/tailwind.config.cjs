const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("../client/src/shared/fogbender.tailwind.preset.js")],
  content: [
    //
    "./public/**/*.html",
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "../client/src/shared/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        landing: ['"Archivo"', ...defaultTheme.fontFamily.sans],
      },
      screens: {
        "tiny": "320px",
      },
      typography: ({ theme }) => ({
        fog: {
          css: {
            "--tw-prose-links": theme("colors.blue.700"),
            "--tw-prose-bullets:": theme("colors.black"),
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/custom-forms"), require("@tailwindcss/typography")],
};
