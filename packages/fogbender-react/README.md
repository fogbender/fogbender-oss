# fogbender-react

> Made with create-react-library

[![NPM](https://img.shields.io/npm/v/fogbender-react.svg)](https://www.npmjs.com/package/fogbender-react) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save fogbender-react
```

## Usage

```tsx
import React from "react";
import { FogbenderWidget } from "fogbender-react";

export const Example = () => {
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Org Name",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    // The server will only accept signatures generated with HMAC-SHA-256
    userHMAC: "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "User Name",
    userAvatarUrl:
      "https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png", // optional
  };
  return (
    <div>
      <p>Hello Fogbender</p>
      <FogbenderWidget clientUrl="https://master--fb-client.netlify.app" token={token} />
    </div>
  );
};
```

## License

MIT © [JLarky](https://github.com/JLarky)
