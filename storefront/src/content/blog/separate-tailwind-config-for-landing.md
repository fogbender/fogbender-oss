---
title: Using a separate Tailwind configuration for your landing page in Astro
description: Advanced configuration example by using multiple Tailwind configurations in one Astro project
publishDate: 'Jun 11, 2023'
authors:
  - jlarky
socialImage: '/assets/blog/separate-tailwind-config-for-landing/social.png'
coverImage: '/assets/blog/separate-tailwind-config-for-landing/cover.png'
thumbnailImage: '/assets/blog/separate-tailwind-config-for-landing/thumb.png'
coverImageAspectRatio: '14:3'
lang: 'en'
---

## Introduction

This tutorial will guide you through the steps of introducing a second Tailwind configuration for your landing page in [Astro](https://astro.build/), allowing you to overcome the common challenge of managing different design requirements for different parts of your site.

Astro is an all-in-one web framework that enables you to build websites and web applications with a frontend framework of your choice. Although examples in this tutorial are limited to a static website, you can use the same approach for other frameworks, like Next.js, Nuxt.js, SvelteKit, SolidStart, Qwik, etc., with minor adjustments.

In the previous article of the series, we covered how to [set up a custom Tailwind CSS configuration in Astro](/blog/customizing-tailwind-css-in-astro), going beyond the standard `@astrojs/tailwind` integration for more control and flexibility. In this article, we'll apply our learnings to cover an example of employing multiple Tailwind configurations in one Astro project.

Clearly, the most straightforward approach is to use the same Tailwind configuration for the whole project. However, you might find yourself in a situation where you have contradicting requirements - for example, your marketing page and app call for different fonts. (This happens more often than you might think, as different teams tend to move at different velocities.) You may not want to make both pages slower by downloading two sets of fonts, so while using two separate Tailwind configurations is more complex, it might be the right thing to do in your situation.

## Example template

If you'd like to play around with the code covered in this tutorial, it's available at https://github.com/JLarky/astro-tailwind-advanced-template.

## Prerequisites

If you don't have your Astro project set up yet, you'd need to use one where Tailwind CSS is already set up correctly.

As a shortcut, you can quickly get going with our [B2B SaaS Kit template](https://b2bsaaskit.com). Alternatively, you can use the following minimal Tailwind CSS configuration:

```bash
npm create astro@latest -- --template JLarky/astro-tailwind-template ./astro-tailwind
cd ./astro-tailwind
```

For existing projects, you have to follow our guide on [customizing Tailwind CSS in Astro](/blog/customizing-tailwind-css-in-astro) before moving forward. The main requirement is that you are either not using the `@astrojs/tailwind` integration at all, or at least you are not using it on every page. You can achieve this with the `applyBaseStyles: false` option in your `astro.config.mjs` file, which is also covered in the aforementioned article.

## Using a separate Tailwind config for your landing page

Suppose, you are launching a new product campaign and need a distinct landing page. Your marketing org hired a stellar designer who came up with nice-looking designs for the page - and even used Tailwind CSS!

Unfortunately, the new designs specify a different color palette and different fonts from the rest of your app. You already have everything working in isolation - say, in a separate project, and are now staring at the challenge of figuring out how to combine the existing app and the new marketing page together.

One option is to create one hybrid Tailwind CSS file.

Another option - one we'll pursue here - is to have everything working in one project while keeping the two Tailwind CSS configuration separate.

### Create a landing page

Let's start by creating a new file for our landing page - `src/pages/new-product-landing.astro` - with the following content:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="New Product Landing">
  <main class="container mx-auto">
    <h1 class="text-3xl mt-4 font-heading">New Product Landing</h1>
  </main>
</Layout>
```

Now, run `npm run dev` and navigate to http://localhost:3000/new-product-landing. The page is using your main Tailwind configuration - let's see how we can make it use a different one.

### Create a new Tailwind config

Next, create a new file called `tailwind.landing.config.cjs` in the root of the project, with the following content:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/new-product-landing.astro',
    './src/layouts/Landing.astro',
    './src/components/landing/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['"Comic Sans MS"', 'sans-serif'],
      },
      colors: {
        best: '#ff0000',
      },
    },
  },
};
```

Let's narrow in on what's happening here. In the new Tailwind file, `theme.extend.colors` and `theme.extend.fontFamily` represent the designs that we got from the marketing org. Obviously, with a really simple example like the one we have here, we could have easily just expanded our main Tailwind configuration, but real-world scenarios are rarely this simple.

The `content` property allows us to limit the resulting CSS bundle size by including only the Tailwind classes used in the pages matching the `content` filter.

For most websites, the `content` property will not have a major consequence on performance. However, in general, it's a good idea to make sure your `content` property only includes those files that actually use Tailwind. If you begin to add Tailwind classes in a file outide the `content` scope, you'll see it right away, since the classes you add won't have any effect.

In our case, we're including only the `new-product-landing.astro` page and all the components from the `src/components/landing` directory. You'd need to adjust this if you're using common components from other directories.

### Exclude landing from the main CSS bundle

Similarly, we need to adjust the `content` property in our main `tailwind.config.cjs` file in order to exclude the new landing:

```diff
/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		'./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
+		'!./src/pages/new-product-landing.astro',
+		'!./src/layouts/Landing.astro',
+		'!./src/components/landing/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
	],
};
```

Although not widely known, the `content` property supports [excluding patterns](https://github.com/tailwindlabs/tailwindcss/issues/5198#issuecomment-1047880341). By specifying the patterns we used in the new `tailwind.landing.config.cjs`, but with a `!` in front, we're ensuring Tailwind classes used in the new landing page are not included in the main CSS bundle.

Again, we're bothering with `content` just to optimize the resulting CSS bundle size - none of it will have any effect on functionality. If it makes sense in your scenario, you can safely skip these steps.

### Create a new Tailwind CSS file

Next, let's create a new Tailwind style file `src/styles/tailwind.landing.css` with the following content:

```css
@config "../../tailwind.landing.config.cjs";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

Here, we're using [the @config directive](https://github.com/tailwindlabs/tailwindcss/pull/9405) - a feature added in Tailwind CSS v3.2 - that lets you specify a particular Tailwind configuration in a CSS file.

### Create a new layout for landing

Since our existing layout is using the main CSS file, we need to create a new layout component for the new landing page.

Let's create a `src/layouts/Landing.astro` file with the following content:

```astro
---
import '../styles/tailwind.landing.css';
export type Props = {
  title: string;
};
const { title } = Astro.props;
---

<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width" />
    <meta name="generator" content={Astro.generator} />
    <title>{title}</title>
  </head>
  <body class="text-best">
    <slot />
  </body>
</html>
```

As you can see, we imported the new `tailwind.landing.css` and we're now using the `text-best` class for text color.

### Use the new layout

Finally, in `src/pages/new-product-landing.astro`, we need to switch to using the new layout:

```diff
---
- import Layout from '../layouts/Layout.astro';
+ import Layout from '../layouts/Landing.astro';
---

<Layout title="New Product Landing">
	<main class="container mx-auto">
		<h1 class="text-3xl mt-4 font-heading">New Product Landing</h1>
	</main>
</Layout>
```

If you open http://localhost:3000/new-product-landing, you should see the new `heading` font and `best` color from the new design. Amazingly, these changes are completely isolated from the rest of your app!

## Conclusion

Turns out, Tailwind CSS offers a way to create separate configurations for different pages.

The approach allows developers to use different fonts, color pallettes, animations, and other design elements for specific pages without touching the rest of the app. Doing so may improve the performance of your app by reducing the CSS bundle size, while making the codebase easier to maintain.

Such separation of concerns is especially important for websites built with Astro, since it's one of the only tools where multiple frontend frameworks can coexist within the same project, making it possible to house a marketing website, blog, docs, app, support - and so on - in a single repo.

If you liked this article, check out the other articles in the series:

- [How to use optimized images in Astro](/blog/optimize-images-in-astro-with-assets-integration)
- [A comprehensive guide to customizing Tailwind CSS in Astro](/blog/customizing-tailwind-css-in-astro)

Also, check out our Astro templates:

- https://github.com/JLarky/astro-tailwind-template (minimal Tailwind template)
- https://github.com/JLarky/astro-tailwind-advanced-template (template with two Tailwind configs)
- https://github.com/fogbender/b2b-saaskit (full SaaS template, one Tailwind config)

If you're curious about Fogbender, a good place to start is [a post about customer triage rooms](/blog/what-are-customer-triage-rooms).
