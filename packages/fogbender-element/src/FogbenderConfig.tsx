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
    mode: "light",
    roomCreationEnabled: false,
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
      fogbender.setMode(props.mode ?? "light");
      onCleanup(() => fogbender.setMode("light"));
    });

    createEffect(() => {
      fogbender.setRoomCreation(props.roomCreationEnabled ?? false);
      onCleanup(() => fogbender.setRoomCreation(false));
    });
  }
);
