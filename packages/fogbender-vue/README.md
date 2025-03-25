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
    userJWT:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJjdXN0b21lcklkIjoib3JnMTIzIiwiY3VzdG9tZXJOYW1lIjoiQ3VzdG9tZXIgRmlybSIsInVzZXJFbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJ1c2VySWQiOiJleGFtcGxlX1BMRUFTRV9DSEFOR0UiLCJ1c2VyTmFtZSI6IkN1c3RvbWVyIFVzZXIifQ.upRXqWj7WOb-DcjqtJ_jJ96WShbx6npL8hboAurBhYg",
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
