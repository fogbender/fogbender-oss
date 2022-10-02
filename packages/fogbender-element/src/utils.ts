import { consume } from "component-register";
import { ICustomElement } from "component-register/types/utils";
import { Fogbender, Token } from "fogbender";
import { createEffect, createSignal, onCleanup } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
export const addVersion = (token?: Token): Token | undefined => {
  if (token) {
    token.versions = token.versions || {};
    token.versions["fogbender-element"] = "0.0.3";
  }
  return token;
};

export const noopCleanup = () => {
  return new Promise<() => void>(resolve => resolve(() => {}));
};

export const renderIframe = (
  divRef: HTMLDivElement | undefined,
  headless: boolean,
  element: ICustomElement
) => {
  const fogbender: Fogbender = consume(fogbenderContext, element as HTMLElement & ICustomElement);

  if (!fogbender) {
    throw new Error("No fogbender set, use FogbenderProvider to set one");
  }

  if (fogbender && divRef) {
    return renderComponent(() => fogbender.renderIframe({ headless, rootEl: divRef }));
  } else {
    return noopCleanup();
  }
};

export const renderComponent = (componentRenderer: () => Promise<() => void>) => {
  let cleanup = () => {};

  createEffect(() => {
    const promise = componentRenderer();

    promise.then(componentCleanup => {
      cleanup = componentCleanup;
    });
    onCleanup(() => {
      cleanup();
    });
  });
};
