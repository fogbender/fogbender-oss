# fogbender-vue

[![NPM](https://img.shields.io/npm/v/fogbender-vue.svg)](https://www.npmjs.com/package/fogbender-vue)

This is still an experimental package. Please use [fogbender-react](https://www.npmjs.com/package/fogbender-react) or [fogbender](https://www.npmjs.com/package/fogbender) if you can.

## Install

```bash
npm install fogbender-vue
```

Or if you are using other package managers like yarn, pnpm or bun:

```
npm i -g @antfu/ni && ni fogbender-vue
```

## Usage

```html
<script setup lang="ts">
  import { FogbenderSimpleWidget } from "fogbender-vue";
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Customer Firm",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "Customer User",
    userAvatarUrl:
      "https://fogbender-blog.s3.us-east-1.amazonaws.com/fogbender-cardinal-closeup.png", // optional
  };
</script>
<template>
  <div>
    <p>Hello Fogbender</p>
    <FogbenderSimpleWidget clientUrl="https://main--fb-client.netlify.app" :token="token" />
  </div>
</template>
```

## Examples

- https://codesandbox.io/s/github/fogbender/fogbender-oss/tree/main/examples/vue

## License

MIT © [Fogbender Software, Inc.](https://fogbender.com)
