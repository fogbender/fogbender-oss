import type { Fogbender, FogbenderLoader } from "fogbender";

(function (window: {
  fogbender: Fogbender & FogbenderLoader;
  console: (typeof globalThis)["console"];
}) {
  const name = "fogbender";
  const target = {
    _queue: [],
    _once: false,
  } as unknown as Fogbender & FogbenderLoader;
  const snippet = new Proxy(target, {
    get: (target, methodName: keyof Fogbender | keyof FogbenderLoader) => {
      const fogbender = target[("_" + name) as "_fogbender"];
      if (methodName[0] === "_") {
        return target[methodName as keyof FogbenderLoader];
      }
      if (fogbender) {
        return fogbender[methodName as keyof Fogbender];
      }
      return function () {
        const args = arguments as unknown as any[];
        return new Promise<any>((resolve, reject) => {
          target._queue.push([methodName as keyof Fogbender, args, resolve, reject]);
        });
      };
    },
  });

  // Create singleton, but preserve old value
  // const window = window as typeof window & { fogbender: typeof snippet };
  const fogbender = (window[name] = window[name] || snippet);
  // If the snippet was invoked already show an error.
  if (fogbender._once) {
    console.error(name + " snippet included twice.");
  } else {
    fogbender._once = true;
    fogbender.setVersion("snippet", "0.2.0");
  }
})(window as typeof window & { fogbender: Fogbender & FogbenderLoader });
/*
<script async src="https://main--fb-client.netlify.app/loader.js"></script>
<script>
  const token = {
    widgetId: "dzAwMTQ5OTEzNjgyNjkwNzA3NDU2",
    customerId: "org123",
    customerName: "Org Name",
    userId: "example_PLEASE_CHANGE",
    userEmail: "user@example.com",
    userHMAC:
      "04b7c1aab187a84bfa3160b99c100df08c78b3a1e25884fc13d8d72a9b96ddc3",
    userName: "User Name",
    userAvatarUrl:
      "https://user-images.githubusercontent.com/7026/108277328-19c97700-712e-11eb-96d6-7de0c98c9e3d.png" // optional
  };
  fogbender.setClientUrl("https://main--fb-client.netlify.app");
  fogbender.setToken(token);

  const rootEl = document.getElementById("app");
  fogbender.renderIframe({ rootEl });
</script>
*/
