---
title: How to use optimized images in Astro
description: How to set up the Astro Assets integration and use optimized images in Astro with Image component and getImage function.
publishDate: 'June 8, 2023'
authors:
  - jlarky
thumbnailImage: '/assets/blog/optimize-images-in-astro-with-assets-integration/thumb.png'
coverImage: '/assets/blog/optimize-images-in-astro-with-assets-integration/cover.png'
socialImage: '/assets/blog/optimize-images-in-astro-with-assets-integration/social.png'
coverImageAspectRatio: '14:4'
---

In version 2.1 (released March 2023), Astro (https://astro.build/) introduced a new way to work with images. This article will guide you through setting up the Astro Assets integration and optimizing images for your project.

Keep in mind that this feature might require you to update your existing code, as it changes the way images are imported. It's also likely to affect the code that you have in framework components like React, Svelte, SolidJS, etc. (more on that later).

Because of this, although the API is stable, the feature is marked as experimental until Astro 3.0 release.

## How to activate the Astro assets integration

First, enable the Assets integration in `astro.config.mjs`:

```diff
import { defineConfig } from 'astro/config';

export default defineConfig({
+  experimental: {
+   assets: true
+  }
});
```

After restarting, your dev server will generate new types. Because of this, you have to update existing imports to use `image.src` instead of `image` (note that this does not affect external images or images in the `public` folder):

```diff
---
- import rocket from '../images/rocket.png';
+ import rocket from '../images/rocket.png';
---
- <img src={rocket} width="250" height="250" alt="A rocketship in space" />
+ <img src={rocket.src} width={rocket.width} height={rocket.height} alt="A rocketship in space" />
```

This happens because instead of simple strings, image imports return objects that expose helpful information, like `image.height` and `image.width`, which is handy to ensure dimentions are accurate in case the image file changes. In addition, by explicitly specifying `width` and `height` attributes, you will avoid layout shifts on image load (see https://web.dev/cls/ for more details on layout shifts).

An alternative approach - particularly useful if you need to use the same code in Astro and in some other Vite-based environment (or another Astro project that doesn't use the Assets integration) - is to use URL imports ([https://vitejs.dev/guide/assets.html#explicit-url-imports](https://vitejs.dev/guide/assets.html#explicit-url-imports)). The URL imports approach is compatible with any environment - you can use it by adding `?url` to the end of the import:

```diff
---
- import rocket from '../images/rocket.png';
+ import rocket from '../images/rocket.png?url';
---
<img src={rocket} width="250" height="250" alt="A rocketship in space" />
```

For a discussion about this approach, see https://github.com/withastro/astro/issues/5924#issuecomment-1410744335.

## Utilizing the Image component in Astro

So far, we've only been using the `img` tag, but the module `astro:assets` opens up some additional options. The module provides the `getImage` function and the `Image` component - both server-side only.

The `Image` component can only be imported inside `.astro` files, but it can be passed as a child to any component.

`getImage` can be used in any framework component, but only if you are not using the client directive, so the best way to use it would be to pass data as a prop.

The reason these features can't work on the client is because during Server-Side Rendering (SSR) or Static Site Generation (SSG) images get converted into a more optimal format - `.webp` by default - and resized according to `width` and `height` attributes. This can bring major improvements in file sizes for assets, while allowing you to keep the original (large) files in your repository. For example, if design requirements change asking for a smaller file size, you can change the dimensions in the code, leaving the actual file as is.

Compared to the `img` tag, the `Image` component is more strict. The `src` attribute is going to require the whole image object instead of just the URL; and the `alt` attribute is required.

For example,

```diff
---
+ import { Image } from 'astro:assets';
import rocket from '../images/rocket.png';
---
- <img src={rocket} width="250" height="250" alt="A rocketship in space" />
+ <Image src={rocket} alt="A rocketship in space" />
```

will be converted into something like this:

```html
<img
  src="/_astro/rocket.deadbeef.webp"
  alt="A rocketship in space"
  width="250"
  height="250"
  loading="lazy"
  decoding="async"
/>
```

As you can see, the `src` attribute now points to a different file, because the original file was converted to `.webp`. The `loading` and `decoding` attributes will make the image load lazily and decode asynchronously, which will improve the performance of your page overall, but you might consider changing it to `eager`, if the image is above the fold, like so:

```astro
<Image src={rocket} alt="A rocketship in space" loading="eager" decoding="sync" />
```

Also, the `width` and `height` attributes are added automatically to prevent layout shifts when the image is loaded. If you specify just the width or height, the other one will be calculated automatically based on the aspect ratio of the actual image file.

```astro
<Image src={rocket} alt="A rocketship in space" width={100} />
```

will become:

```html
<img
  src="/_astro/rocket.deadbeef.webp"
  alt="A rocketship in space"
  width="100"
  height="100"
  loading="lazy"
  decoding="async"
/>
```

If you provide both width and height, only the width will be used and height will be ignored.

```astro
<Image src={rocket} alt="A rocketship in space" width={100} height={50} />
```

will become:

```html
<img
  src="/_astro/rocket.deadbeef.webp"
  alt="A rocketship in space"
  width="100"
  height="100"
  loading="lazy"
  decoding="async"
/>
```

## Working with high-resolution images in Astro

Let's consider the following example. Say, the design spec calls for a 100x100 square image. The marketing provided you with a nice and crisp 600x600 png file.

Your first version had the following code:

```astro
<!-- why are we sending the whole 600x600 png to our users? -->
<img src={rocket} alt="A rocketship in space" width={100} height={100} />
```

Let's replace it with an `Image` component:

```astro
<!-- now this looks blurry on retina screens -->
<Image src={rocket} alt="A rocketship in space" width={100} height={100} />
```

Those of you who are lucky enough to use a high-resolution display might have noticed that the optimized image looks blurrier than it should: since retina screens have a higher pixel density, a 100x100 image needs a 200x200 file to look good.

Luckily, HTML has a solution - the `picture` tag. The `picture` tag allows you to specify multiple files for different screen resolutions, for the same image. The browser will then pick the best option for the current screen, making sure the image looks crisp on retina screens and doesn't waste bandwidth on non-retina screens (for more details on the `picture` tag and the `srcset` attribute, see https://blog.bitsrc.io/why-you-should-use-picture-tag-instead-of-img-tag-b9841e86bf8b).

```astro
---
import { getImage } from 'astro:assets';
import rocket from '../images/rocket.png';

const size = 100;
const rocket1x = await getImage({ src: rocket, width: size });
const rocket2x = await getImage({ src: rocket, width: size * 2 });
---

<!-- send the 1x image to regular screens and the 2x image to retina screens -->
<picture>
  <source srcset={rocket2x.src} media="(min-resolution: 2dppx)" />
  <img src={rocket1x.src} {...rocket1x.attributes} alt="A rocketship in space" />
</picture>
```

Here, we used the `getImage` function to generate the URLs for the different resolutions and used the `srcset` attribute to specify which one to use for which screen. You can use these to perform quite advanced operations, like choosing different images for mobile and desktop layouts or generating more optimal image formats for supporting browsers. Here's an example:

```astro
---
import { getImage } from 'astro:assets';
import rocket from '../images/rocket.png';

const rocketWebP = await getImage({ src: rocket, width: 100 });
const rocketAvif = await getImage({ src: rocket, width: 100, format: 'avif' });
---

<!-- send the avif image to browsers that support it or fall back to webp -->
<picture>
  <source srcset={rocketAvif.src} type="image/avif" />
  <img src={rocketWebP.src} {...rocketWebP.attributes} alt="A rocketship in space" />
</picture>
```

You can also choose a less high-tech option of just sending a bigger image to the client and scaling it down with CSS. Compared to sending a 600x600 `.png` file, you can send a much smaller 200x200 `.webp` file to the client, which will look great on retina screens:

```astro
---
import { Image } from 'astro:assets';
import rocket from '../images/rocket.png';
---

<!-- this will waste a bit of bandwidth on non-retina screens -->
<Image src={rocket} alt="A rocketship in space" width={200} style="width: 100px" />
```

## Additional resources and further reading

Check out the official Assets integration documentation at [https://docs.astro.build/guides/assets](https://docs.astro.build/guides/assets). It covers using images as CSS backgrounds, in Markdown files, and in Content Collections.

If you are just starting with Astro, check out our open-source starter template - [the B2B SaaS Kit](https://b2bsaaskit.com) - where the Assets integration is already set up.

If you're curious about Fogbender, a good place to start is [a post about customer triage rooms](/blog/what-are-customer-triage-rooms).
