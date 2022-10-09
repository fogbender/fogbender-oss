import { noShadowDOM } from "component-register";
import { Env, Token } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, JSX, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";
import { addVersion } from "./utils";

interface FogbenderConfigProps {
  env?: Env;
  token?: Token;
  children?: JSX.Element[];
  clientUrl?: string;
}

customElement(
  "fogbender-config",
  { env: undefined, clientUrl: undefined, token: undefined, children: undefined },
  (props: FogbenderConfigProps, { element }) => {
    noShadowDOM();
    const fogbender = consumeFogbender(element);

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
      onCleanup(() => {
        fogbender.setClientUrl(undefined);
      });
    });

    createEffect(() => {
      fogbender.setEnv(props.env);
      onCleanup(() => {
        fogbender.setEnv(undefined);
      });
    });

    createEffect(() => {
      fogbender.setToken(addVersion(props.token));
      onCleanup(() => {
        fogbender.setToken(undefined);
      });
    });
  }
);
