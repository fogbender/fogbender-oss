import { consume } from "component-register";
import { Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, JSX, onCleanup } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
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
    const fogbender: Fogbender = consume(fogbenderContext, element.elemenmt);

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
    });
    createEffect(() => {
      fogbender.setEnv(props.env);
    });
    createEffect(() => {
      fogbender.setToken(addVersion(props.token));
    });

    onCleanup(() => {
      fogbender.setClientUrl(undefined);
      fogbender.setEnv(undefined);
      fogbender.setToken(undefined);
    });

    return [...(props.children as JSX.Element[])];
  }
);
