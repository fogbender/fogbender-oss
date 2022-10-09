import { createNewFogbender, Env, Token } from "fogbender";
import { customElement, noShadowDOM } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { addVersion } from "./utils";

interface SimpleFlatieProps {
  env?: Env;
  token?: Token;
  clientUrl?: string;
  verbose?: boolean;
  openInNewTab?: boolean;
  defaultOpen?: boolean;
  closeable?: boolean;
}

customElement<SimpleFlatieProps>(
  "fogbender-simple-floatie",
  {
    env: undefined,
    clientUrl: undefined,
    token: undefined,
    verbose: undefined,
    openInNewTab: undefined,
    defaultOpen: undefined,
    closeable: undefined,
  },
  (props: SimpleFlatieProps, { element }) => {
    noShadowDOM();
    let divRef: HTMLDivElement | undefined;

    const fogbender = createNewFogbender();

    createEffect(() => {
      fogbender.setClientUrl(props.clientUrl);
      fogbender.setEnv(props.env);
      fogbender.setToken(addVersion(props.token));
      if (divRef) {
        const promise = fogbender.renderIframe({ headless: true, rootEl: divRef });
        onCleanup(() => {
          promise.then(cleanup => cleanup());
        });
      }
      const promise = fogbender.createFloatingWidget({
        verbose: props.verbose,
        openInNewTab: props.openInNewTab,
        defaultOpen: props.defaultOpen,
        closeable: props.closeable,
      });
      onCleanup(() => {
        promise.then(cleanup => cleanup());
      });
    });

    return <div ref={divRef} />;
  }
);
