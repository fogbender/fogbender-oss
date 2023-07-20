---
title: A comprehensive guide to customizing Tailwind CSS in Astro
description: Learn how to set up a custom Tailwind CSS configuration in Astro that goes beyond the standard @astrojs/tailwind integration, for more control and flexibility
publishDate: 'Jun 10, 2023'
authors:
  - jlarky
socialImage: '/assets/blog/customizing-tailwind-css-in-astro/social.png'
coverImage: '/assets/blog/customizing-tailwind-css-in-astro/cover.png'
thumbnailImage: '/assets/blog/customizing-tailwind-css-in-astro/thumb.png'
coverImageAspectRatio: '14:3'
lang: 'en'
---

In this guide, we cover an alternative approach to using the canonical [Astro Tailwind CSS integration](https://docs.astro.build/en/guides/integrations-guide/tailwind/), offering more control and adaptability. This post is part 1 of a 3-part series.

## TL;DR: the easy way

If you landed here from a search engine result while looking for a quick solution, run the following command and follow the subsequent instructions:

```bash
npx astro add tailwind
```

Godspeed!

## Tailwind CSS in Astro: the right way

However, if you're interested in understanding how the integration works or are seeking a more efficient method of setting up Tailwind CSS in Astro, let's dive in.

It's surprisingly easy to set up Tailwind CSS in Astro without using the `@astrojs/tailwind` package. First, you need to install `tailwindcss`:

```bash
npm install tailwindcss
```

<p class="-m-4">or</p>

```bash
yarn add tailwindcss
pnpm install tailwindcss
```

Next, create a `postcss.config.cjs` file in your project's root directory with the following content:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
  },
};
```

Then, create a `tailwind.config.cjs` file in your project root directory with the following content:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
};
```

Then, create a Tailwind style file `src/styles/tailwind.css` with the following content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Now, include the `src/styles/tailwind.css` file in the pages where you need Tailwind. In most cases, it will be the `src/layouts/Layout.astro` file:

```astro
---
import '../styles/tailwind.css';
---
```

That's it!

## How is this different from `npx astro add tailwind`?

Let's imagine that you've already set up Tailwind CSS in Astro using the `@astrojs/tailwind` package. Here's what `npx astro add tailwind` command does for you:

- Installs `@astrojs/tailwind`, `tailwindcss`, and `autoprefixer` packages (for additional info on `autoprefixer`, see the [parting notes](#some-parting-notes) section)
- Generates `tailwind.config.cjs` file (for Tailwind CSS IntelliSense to work in your editor)
- `@astrojs/tailwind` integration is added to the `astro.config.mjs` file
- That integration creates a virtual `postcss.config.cjs` file with `tailwindcss` and `autoprefixer` plugins ("virtual" means that the file is not actually created on disk, but Astro is going to use it as if it were)
- Creates a virtual `@astrojs/tailwind/base.css` file with content set to `@tailwind base; @tailwind components; @tailwind utilities;`
- The line `import '@astrojs/tailwind/base.css';` is virtually added to every page in the `src/pages` directory

Because you have no control over `base.css` content and you can't control when it's imported, some of the customizations of Tailwind CSS are not possible. For example, you can't exclude Tailwind CSS from a subset of pages.

As a result, you'd now need to create the `src/styles/tailwind.css` file manually and include it in the pages or layouts where Tailwind is needed. After, you'd have to edit the `astro.config.mjs` file to stop injecting `import '@astrojs/tailwind/base.css';` with the [`applyBaseStyles: false`](https://docs.astro.build/en/guides/integrations-guide/tailwind/#configapplybasestyles) option.

And now, the only difference between the two approaches is that instead of having a separate `postcss.config.cjs` file, we activate the Tailwind PostCSS plugin with the following line in the `astro.config.mjs` file:

```diff
import { defineConfig } from "astro/config";
+ import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [
+   tailwind({ config: { applyBaseStyles: false }}),
  ],
});
```

However, having a PostCSS config file could be a good thing, because it opens up the possibility of using other PostCSS plugins, such as `postcss-nested` or `postcss-import`.

So, to simplify this a bit, you could delete the Tailwind CSS integration from `astro.config.mjs` completely and then create your own `postcss.config.cjs` file. At this point, you'd find yourself in the same state as if you followed the steps in the previous section ;-)

## Some parting notes

- autoprefixer: The Tailwind integration also installs `autoprefixer`. However, since both Tailwind and Astro already add the necessary prefixes, we've omitted its installation in this guide. If you still want to install it, run the `npm install autoprefixer` command and change the `postcss.config.cjs` file as follows:

```js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

(If you do end up doing this, please let me know - I'd love to understand your use case.)

- If anyone from the Astro team is reading this, perhaps the Tailwind integration should ask users to create a CSS file manually instead of using `injectScript`. Astro is literally the only framework that skips the manual CSS file creation step in [the Tailwind framework guides](https://tailwindcss.com/docs/installation/framework-guides).

## Resources

- How to use PostCSS in Astro - https://docs.astro.build/guides/styling/#postcss
- Using Tailwind and PostCSS - https://tailwindcss.com/docs/installation/using-postcss
- Example of using Tailwind CSS in Astro - https://flowbite.com/docs/getting-started/astro/
- Check out a working, pre-configured Tailwind + Astro example in our open-source starter template - [the B2B SaaS Kit](https://b2bsaaskit.com)

## Share!

If you found this article useful, we'd appreciate a share!

We'd also deeply appreciate your ⭐ on our open-source starter template repo: https://github.com/fogbender/b2b-saaskit.

Additionally, check out our post on [image optimization in Astro](/blog/optimize-images-in-astro-with-assets-integration).

Finally, check in on this blog in a few days for a post on how to use Tailwind CSS in the Starlight documentation template for Astro (https://starlight.astro.build/).
