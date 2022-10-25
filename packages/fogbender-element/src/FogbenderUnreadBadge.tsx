import { customElement, noShadowDOM } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

customElement("fogbender-unread-badge", {}, (props, { element }) => {
  noShadowDOM();
  let divRef: HTMLDivElement | undefined;

  const fogbender = consumeFogbender(element);

  createEffect(() => {
    if (divRef) {
      const promise = fogbender.renderUnreadBadge({ el: divRef });
      onCleanup(() => {
        promise.then(cleanup => cleanup());
      });
    }
  });

  return <div ref={divRef} />;
});
