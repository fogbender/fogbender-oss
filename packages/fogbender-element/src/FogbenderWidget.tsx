import { noShadowDOM } from "component-register";
import { customElement } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

interface FogbenderWidgetProps {}

customElement<FogbenderWidgetProps>("fogbender-widget", {}, (props, { element }) => {
  noShadowDOM();

  const fogbender = consumeFogbender(element);
  let divRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (divRef) {
      const promise = fogbender.renderIframe({
        rootEl: divRef,
      });
      onCleanup(() => {
        promise.then(cleanup => cleanup());
      });
    }
  });

  return <div ref={divRef} />;
});
