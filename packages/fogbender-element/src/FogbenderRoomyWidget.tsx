import { noShadowDOM } from "component-register";
import { customElement } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

interface FogbenderWidgetProps {}

customElement<FogbenderWidgetProps>("fogbender-roomy-widget", {}, (props, { element }) => {
  noShadowDOM();

  element.style.display = "flex";
  element.style.flex = "1";
  element.style.width = "100%";

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
