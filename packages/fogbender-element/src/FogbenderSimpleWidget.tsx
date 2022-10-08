import { createNewFogbender, Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
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

customElement<SimpleWidgetProps>(
  "fogbender-simple-widget",
  { env: undefined, clientUrl: undefined, token: undefined },
  (props: SimpleWidgetProps, { element }) => {
    const { token, clientUrl, env } = props;
    const [fogbender, setFogbender] = createSignal(createNewFogbender());

    createEffect(() => {
      const fb = fogbender();
      fb.setClientUrl(clientUrl);
      fb.setEnv(env);
      fb.setToken(addVersion(token));
    });

    return (
      <FogbenderProvider fogbender={fogbender}>
        <FogbenderWidget />
      </FogbenderProvider>
    );
  }
);
