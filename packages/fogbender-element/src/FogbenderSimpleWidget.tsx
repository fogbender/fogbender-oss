import { consume, ICustomElement } from "component-register";
import { Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
import { createEffect } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
import { addVersion, renderIframe } from "./utils";

interface SimpleWidgetProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
}

customElement<SimpleWidgetProps>(
  "fogbender-widget",
  { env: undefined, clientUrl: undefined, token: undefined },
  (props: SimpleWidgetProps, { element }: { element: ICustomElement }) => {
    let divRef: HTMLDivElement | undefined;

    const fogbender: Fogbender = consume(fogbenderContext);

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
      fogbender.setEnv(props.env);
      fogbender.setToken(addVersion(props.token));
      renderIframe(divRef, false, element);
    });

    return <div ref={divRef}></div>;
  }
);
