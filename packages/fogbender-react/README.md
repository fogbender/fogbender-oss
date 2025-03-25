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
import { FogbenderSimpleRoomyWidget } from "fogbender-react";

export const Example = () => {
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
  return (
    <div style={{ minHeight: "100vh" }}>
      <p>Hello Fogbender</p>
      <div style={{ height: "500px", display: "flex" }}>
        <FogbenderSimpleRoomyWidget clientUrl="https://main--fb-client.netlify.app" token={token} />
      </div>
    </div>
  );
};
```

## Examples

- https://codesandbox.io/s/github/fogbender/fogbender-oss/tree/main/examples/react

## License

MIT © [Fogbender Software, Inc.](https://github.com/fogbender)
