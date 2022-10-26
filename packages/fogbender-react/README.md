# fogbender-react

> https://fogbender.com/

[![NPM](https://img.shields.io/npm/v/fogbender-react.svg)](https://www.npmjs.com/package/fogbender-react)

## Install

```bash
npm install fogbender-react
```

Or if you are using other package managers like yarn, pnpm or bun:

```
npm i -g @antfu/ni && ni fogbender-react
```

## Usage

```tsx
import React from "react";
import { FogbenderSimpleWidget } from "fogbender-react";

export const Example = () => {
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
  return (
    <div>
      <p>Hello Fogbender</p>
      <FogbenderSimpleWidget clientUrl="https://master--fb-client.netlify.app" token={token} />
    </div>
  );
};
```

## Examples

- https://codesandbox.io/s/fogbender-demo-with-react-w519q?file=/src/index.tsx
- https://codesandbox.io/s/fogbender-demo-with-react-floatie-1j3dtw?file=/src/index.tsx

## License

MIT © [JLarky](https://github.com/JLarky)
