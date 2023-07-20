/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    //
    "./public/**/*.html",
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
    "../client/src/shared/ui/SelectSearch.tsx",
  ],
  theme: {
    extend: {},
  },
  variants: {},
  plugins: [require("@tailwindcss/ui")],
};
