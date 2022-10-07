import { consume, noShadowDOM } from "component-register";
import { Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
import { ICustomElement } from "component-register/types/utils";
import { createEffect, JSX, onCleanup } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
import { addVersion } from "./utils";

interface FogbenderConfigProps {
  env?: Env;
  token?: Token;
  children?: JSX.Element[];
  clientUrl?: string;
}

const fogbenderConfig = customElement(
  "fogbender-config",
  { env: undefined, clientUrl: undefined, token: undefined, children: undefined },
  (props: FogbenderConfigProps, { element }) => {
    noShadowDOM();
    const fogbender: Fogbender = consume(fogbenderContext, element as HTMLElement & ICustomElement);

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
export { fogbenderConfig };
