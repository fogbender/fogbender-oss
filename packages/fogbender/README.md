# fogbender

> https://fogbender.com/

[![NPM](https://img.shields.io/npm/v/fogbender.svg)](https://www.npmjs.com/package/fogbender)

## Install

```bash
npm install fogbender
```

Or if you are using other package managers like yarn, pnpm or bun:

```
npm i -g @antfu/ni && ni fogbender
```

## Usage

```tsx
import { createNewFogbender } from "fogbender";

const addFogbender = async rootEl => {
  const clientUrl = "https://master--fb-client.netlify.app";
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Org Name",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "User Name",
    userAvatarUrl:
      "https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png", // optional
  };

  const fogbender = createNewFogbender();
  fogbender.setClientUrl(clientUrl);
  fogbender.setToken(token);
  const cleanup = await fogbender.renderIframe({ headless, rootEl });
  return cleanup;
};

const rootEl = document.getElementById("root");
const cleanup = addFogbender(rootEl);
setTimeout(() => {
  cleanup();
}, 10000);
```

## Examples

- https://codesandbox.io/s/fogbender-demo-7e0kg
- https://codesandbox.io/s/fogbender-floatie-v9yisp

## License

MIT © [JLarky](https://github.com/JLarky)
