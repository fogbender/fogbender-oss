# fogbender-element

> https://fogbender.com/

[![NPM](https://img.shields.io/npm/v/fogbender-element.svg)](https://www.npmjs.com/package/fogbender-element)

This is still an experimental package. Please use [fogbender-react](https://www.npmjs.com/package/fogbender-react) or [fogbender](https://www.npmjs.com/package/fogbender) if you can.

## Install

```bash
npm install fogbender-element
# or
npm i -g @antfu/ni && ni fogbender-element
```

## Usage HTML

```html
<script type="module">
  import "https://esm.sh/fogbender-element";
  // or import "fogbender-element";
</script>
<fogbender-simple-widget
  client-url="https://master--fb-client.netlify.app"
  token='{"widgetId":"dzAwMTQ5OTEzNjgyNjkwNzA3NDU2","customerId":"org123","customerName":"Org Name","userId":"example_PLEASE_CHANGE","userEmail":"user@example.com","userHMAC":"04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3","userName":"User Name","userAvatarUrl":"https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png"}'
/>
```

## Usage

```ts
import "fogbender-element";
import { html, render } from "lit-html";

const myTemplate = () => {
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
  return html`<fogbender-simple-widget
    client-url="https://master--fb-client.netlify.app"
    .token=${token}
  />`;
};
render(myTemplate(), document.body);
```

## Examples

- https://codepen.io/jlarky/pen/vYjVYxM?editors=1000

## License

MIT © [JLarky](https://github.com/JLarky)
