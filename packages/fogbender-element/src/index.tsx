import { createNewFogbender, Env, Fogbender, Token } from "fogbender";
import { provide, createContext, consume } from "component-register";
import { customElement, noShadowDOM } from "solid-element";
import type { Component } from "solid-js";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import { FogbenderProvider } from "./FogbenderProvider";
import { addVersion, renderIframe } from "./utils";
interface SimpleWidgetProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
}

export const FogbenderWidget: Component = props => {
  let divRef: HTMLDivElement | undefined;

  onMount(() => {
    renderIframe(divRef, false);
  });

  return <div ref={divRef}></div>;
};

let i = 0;
const ctx = createContext((x: number) => [x, 1234 + i++]);

customElement<SimpleWidgetProps>(
  "fogbender-provider",
  { env: undefined, clientUrl: undefined, token: undefined },
  (props: SimpleWidgetProps, { element }) => {
    noShadowDOM();
    provide(ctx, 321);
    console.log("props", props);
    const { token, clientUrl, env } = props;
    const [fogbender, setFogbender] = createSignal(createNewFogbender());

    createEffect(() => {
      const fb = fogbender();
      fb.setClientUrl(clientUrl);
      fb.setEnv(env);
      fb.setToken(addVersion(token));
    });

    return <slot />;
  }
);

customElement("fogbender-widget", {}, (props, { element }) => {
  noShadowDOM();
  const x = consume(ctx);
  console.log("x", x);
  return <FogbenderWidget />;
});
