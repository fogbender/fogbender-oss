import { Token } from "fogbender";
import { createEffect, onCleanup, useContext } from "solid-js";
import { FogbenderContext } from "./FogbenderProvider";
export const addVersion = (token?: Token): Token | undefined => {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-element"] = "0.0.1";
  }
  return token;
};

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export const renderIframe = (divRef: HTMLDivElement | undefined, headless: boolean) => {
  const fogbender = useContext(FogbenderContext);
  console.log("rendering iframe", fogbender);

  createEffect(() => {
    if (fogbender && divRef) {
      renderComponent(() => fogbender().renderIframe({ headless, rootEl: divRef }));
    } else {
      return noopCleanup();
    }
  });
};

export const renderComponent = (componentRenderer: () => Promise<() => void>) => {
  createEffect(() => {
    const promise = componentRenderer();
    onCleanup(() => {
      promise.then(cleanup => cleanup());
    });
  });
};
