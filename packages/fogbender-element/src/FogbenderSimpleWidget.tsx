import { consume, ICustomElement } from "component-register";
import { Env, Fogbender, Token } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, createSignal } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
import { addVersion, renderIframe } from "./utils";

interface SimpleWidgetProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
}

const fogbenderSimpleWidget = customElement<SimpleWidgetProps>(
  "fogbender-simple-widget",
  { env: undefined, clientUrl: undefined, token: undefined },
  (props: SimpleWidgetProps, { element }: { element: ICustomElement }) => {
    const [clientUrl, setClientUrl] = createSignal(props.clientUrl);
    const [token, setToken] = createSignal(props.token);
    const [env, setEnv] = createSignal(props.env);

    let divRef: HTMLDivElement | undefined;

    const fogbender: Fogbender = consume(fogbenderContext);

    createEffect(() => {
      fogbender.setClientUrl(clientUrl());
      fogbender.setEnv(env());
      fogbender.setToken(addVersion(token()));
      renderIframe(divRef, false, element);
    });

    element.addPropertyChangedCallback((attrName, attrValue) => {
      switch (attrName) {
        case "env": {
          setEnv(attrValue);
          break;
        }
        case "clientUrl": {
          setClientUrl(attrValue);
          break;
        }
        case "token": {
          setToken(attrValue);
          break;
        }
      }
    });

    return <div ref={divRef}></div>;
  }
);
export { fogbenderSimpleWidget };
