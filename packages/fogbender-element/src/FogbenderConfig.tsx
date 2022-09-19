import { consume } from "component-register";
import { Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
import { JSX, onCleanup, onMount } from "solid-js";
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
    const fogbender: Fogbender = consume(fogbenderContext, element.elemenmt);

    element.addPropertyChangedCallback((name, val) => {
      switch (name) {
        case "env": {
          fogbender.setEnv(val);
          break;
        }
        case "clientUrl": {
          fogbender.setClientUrl(val);
          break;
        }
        case "token": {
          fogbender.setToken(val);
          break;
        }
      }
    });

    onMount(() => {
      fogbender.setClientUrl(props.clientUrl);
      fogbender.setEnv(props.env);
      fogbender.setToken(addVersion(props.token));
      console.log("fogbender config ");
    });

    onCleanup(() => {
      fogbender.setClientUrl(undefined);
      fogbender.setEnv(undefined);
      fogbender.setToken(undefined);
    });

    return [...(props.children as JSX.Element[])];
  }
);
export { fogbenderConfig };
