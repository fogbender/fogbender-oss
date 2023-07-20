/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("./src/shared/fogbender.tailwind.preset.js")],
  content: [
    //
    "./public/**/*.html",
    "./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}",
  ],
};
