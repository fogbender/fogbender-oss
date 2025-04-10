import { noShadowDOM } from "component-register";
import { Env, Token } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, JSX, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";
import { addVersion } from "./utils";

interface FogbenderConfigProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
  mode?: "light" | "dark";
  roomCreationEnabled?: boolean;
  children?: JSX.Element[];
}

customElement(
  "fogbender-config",
  {
    env: undefined,
    clientUrl: undefined,
    token: undefined,
    mode: undefined,
    roomCreationEnabled: undefined,
    children: undefined,
  },
  (props: FogbenderConfigProps, { element }) => {
    noShadowDOM();
    const fogbender = consumeFogbender(element);

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
      onCleanup(() => fogbender.setClientUrl(undefined));
    });

    createEffect(() => {
      fogbender.setEnv(props.env);
      onCleanup(() => fogbender.setEnv(undefined));
    });

    createEffect(() => {
      fogbender.setToken(addVersion(props.token));
      onCleanup(() => fogbender.setToken(undefined));
    });

    createEffect(() => {
      fogbender.setMode(props.mode);
      onCleanup(() => fogbender.setMode(undefined));
    });

    createEffect(() => {
      fogbender.setRoomCreation(props.roomCreationEnabled);
      onCleanup(() => fogbender.setRoomCreation(undefined));
    });
  }
);
