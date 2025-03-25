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
  const clientUrl = "https://main--fb-client.netlify.app";
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

- https://codesandbox.io/p/sandbox/github/fogbender/fogbender-oss/tree/main/examples/vanilla

## License

MIT © [Fogbender Software, Inc.](https://github.com/fogbender)
