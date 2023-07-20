---
title: How to Configure Tailwind CSS for the Starlight Astro Template
description: Learn how to set up a custom Tailwind CSS configuration in Astro that goes beyond the standard @astrojs/tailwind integration, for more control and flexibility
publishDate: 'Jun 12, 2023'
authors:
  - jlarky
thumbnailImage: '/assets/blog/setting-up-tailwind-with-starlight/thumb.png'
coverImage: '/assets/blog/setting-up-tailwind-with-starlight/cover.png'
socialImage: '/assets/blog/setting-up-tailwind-with-starlight/social.png'
coverImageAspectRatio: '14:3'
lang: 'en'
---

## Introduction

In this tutorial, we'll take a look at what it takes to configure Tailwind CSS with the Starlight Astro template.

Astro (https://astro.build/) is an all-in-one tool for building websites and web applications with any frontend framework.

Starlight (https://starlight.astro.build/) is an Astro integration and documentation template designed for building performant and feature-rich documentation sites.

Tailwind CSS (https://tailwindcss.com/) is a utility-first CSS framework, popular for its flexibility and ease of use.

In the previous article of the series, we covered how to use [multiple Tailwind configurations in one project](/blog/separate-tailwind-config-for-landing) - here, we'll use a similar approach to make Tailwind work with Starlight.

## Example template

If you'd like to poke around some code where everything mentioned here is already in place, take a look at the companion template we put together for this post: https://github.com/JLarky/astro-starlight-tailwind-template.

## Prerequisites

Note that adding Starlight to an existing Astro project is outside the scope of this tutorial, but if this is what you’re looking for, drop us a line at hello@fogbender.com, and we’ll try to help you out.

The guide assumes that you've created a new Astro project with the Starlight template, like so:

```bash
npm create astro@latest -- --template starlight ./astro-starlight
cd ./astro-starlight
```

Running the above command will guide you through the initial setup process. Now, make sure that the project is running with the following command:

```bash
npm run dev
```

## Regular Tailwind configuration

Note that you can skip straight to [Starlight configuration](#creating-a-separate-tailwind-config-for-starlight) if you're already familiar with configuring multiple Tailwind configs in Astro.

Starlight injects routes using the `@astrojs/starlight` integration, so, by default, you won't see any pages in the `src/pages` directory. So, before we can follow the Tailwind CSS guide (see below), we need to create a page and a layout component.

First, create a file `src/layouts/Layout.astro` with the following content:

```astro
---
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
  <body>
    <slot />
  </body>
</html>
```

Next, create `src/pages/test.astro` with the following content:

```astro
---
import Layout from '../layouts/Layout.astro';
---

<Layout title="Astro">
  <h1 class="text-red-500">Hello</h1>
</Layout>
```

At this point, if you open http://localhost:3000/test, you'll see the word "Home" in default browser typography (i.e. not red).

Now, you're at the point where you can follow [our Tailwind guide](/blog/customizing-tailwind-css-in-astro#tailwind-css-in-astro-the-right-way). In the last step, you'll update the `Layout.astro` file created above.

Once you're done with the Tailwind guide, open http://localhost:3000/test again: if the word "Home" appears red, everything is working as expected.

## Starlight issues with default Tailwind configuration

Currently, the changes we made in the previous step will not affect Starlight. At this point, it's a good idea to take a quick detour to understand why we can't simply use the default Tailwind configuration with Starlight.

Let's make Starlight use the default Tailwind configuration. Open `astro.config.mjs` file and modify it like so:

```diff
// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
+     customCss: ['/src/styles/tailwind.css'],
      title: 'My Docs',
      social: {
        github: 'https://github.com/withastro/starlight',
      },
```

You might not notice it right away, but if you open a Starlight page, like http://localhost:3000/guides/example/, you will see some artifacts - like the sidebar - being incorrectly formatted.

## CSS reset

To explain why, we need to first explain the term "CSS reset".

A CSS reset is a snippet of CSS that "resets" the styling of all HTML elements to a consistent baseline.

For example, CSS reset can be used just to make sure your design looks the same in all browsers.

Alternatively, a CSS reset can be an opinionated set of styles designed just for your project or design system. Two popular CSS resets are [CSS Reset](https://meyerweb.com/eric/tools/css/reset/) from Eric A. Meyer and [Normalize CSS](https://github.com/sindresorhus/modern-normalize) from Sindre Sorhus.

Tailwind CSS comes with its own CSS reset called [Preflight](https://tailwindcss.com/docs/preflight), which, unfortunately, is not compatible with [the minimal CSS reset](https://github.com/withastro/starlight/blob/0a7ce3efbf4f691292e1b2112df1eb8b165da105/packages/starlight/style/reset.css) used by Starlight. To make it work, we are going to use Tailwind without Preflight. We don't want to change the default/main Tailwind configuration, because it will not function correctly without Preflight. So, instead, we are going to create a separate Tailwind configuration for Starlight.

## Creating a separate Tailwind configuration for Starlight

If you skipped the previous sections, make sure that you have at least installed the `tailwindcss` package and created a `postcss.config.cjs` file. (See [instructions](/blog/customizing-tailwind-css-in-astro#tailwind-css-in-astro-the-right-way) on getting it done.)

### New configuration file

First, let's create a new Tailwind config file `tailwind.docs.config.cjs` with the following content:

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  corePlugins: {
    preflight: false,
  },
};
```

Note that we are using `corePlugins.preflight: false` to disable Preflight, Tailwind's CSS reset. This will make sure that Starlight's CSS styles are not messed with.

As a side note, you might look into optimizing `content` property of your Tailwind configuration files - we have a dedicated tutorial on [using multiple tailwind configs](/blog/separate-tailwind-config-for-landing#exclude-landing-from-the-main-css-bundle) covering the topic in detail.

### New style file

Next, create a new Tailwind CSS file `src/styles/tailwind.docs.css` with the following content:

```css
@config "../../tailwind.docs.config.cjs";

@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Include new style file

Now, to use the new CSS file in Starlight, we need to modify the `astro.config.mjs` file, like so:

```diff
// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
-     customCss: ['/src/styles/tailwind.css'],
+     customCss: ['/src/styles/tailwind.docs.css'],
      title: 'My Docs',
      social: {
        github: 'https://github.com/withastro/starlight',
      },
```

To make sure it works, edit the `src/content/docs/guides/example.md` file with some Tailwind classes:

```md
<div class="text-red-500">hello</div>
```

If you navigate to http://localhost:3000/guides/example/, you should see red text!

## Resources

- For more information on how to use Tailwind in Starlight, see this discussion: https://github.com/withastro/starlight/issues/88
- Check out [the B2B SaaS Kit](https://b2bsaaskit.com). The kit uses Astro and has working examples of different kinds of apps you can build with Astro
- For an example of advanced Tailwind configuration using the Starlight template, check out https://github.com/JLarky/astro-starlight-tailwind-template

## Conclusion

This concludes our series of articles on using Tailwind with Astro.

First, we learned how to configure Tailwind in Astro without the `@astrojs/tailwind` integration. Then, we figured out how to have multiple Tailwind configurations active in the same project, allowing for better control of additional parameters and minimizing the resulting CSS bundle size. Finally, we combined all that knowledge to devise an elegant solution to a demanding situation requiring separate Tailwind configurations, one of which doesn't use Tailwind's CSS reset.

If you enjoyed this article, here are a couple of others you might like:

- [How to use optimized images in Astro](/blog/optimize-images-in-astro-with-assets-integration)
- [A comprehensive guide to customizing Tailwind CSS in Astro](/blog/customizing-tailwind-css-in-astro)

Also, check out our Astro templates:

- https://github.com/JLarky/astro-starlight-tailwind-template (Starlight+Tailwind template)
- https://github.com/JLarky/astro-tailwind-template (minimal Tailwind template)
- https://github.com/fogbender/b2b-saaskit (full SaaS template, one Tailwind config)

If you're curious about Fogbender, a good place to start is to [sign up](/signup) and/or to find out why [all existing customer support tools are designed for B2C](/blog/why-all-customer-support-tools-designed-for-btc).
