import { createNewFogbender, Env, Token } from "fogbender";
import { customElement, noShadowDOM } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { addVersion } from "./utils";

interface SimpleWidgetProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
}

customElement<SimpleWidgetProps>(
  "fogbender-simple-roomy-widget",
  { env: undefined, clientUrl: undefined, token: undefined },
  (props: SimpleWidgetProps, { element }) => {
    noShadowDOM();

    element.style.display = "flex";
    element.style.flex = "1";
    element.style.width = "100%";

    let divRef: HTMLDivElement | undefined;

    const fogbender = createNewFogbender();

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
      fogbender.setEnv(props.env);
      fogbender.setToken(addVersion(props.token));
      fogbender.setMode("light");
      if (divRef) {
        const promise = fogbender.renderIframe({ headless: false, rootEl: divRef });
        onCleanup(() => {
          promise.then(cleanup => cleanup());
        });
      }
    });

    return <div ref={divRef} />;
  }
);
