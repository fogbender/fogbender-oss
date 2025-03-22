import { noShadowDOM } from "component-register";
import { customElement } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

interface FloatyProps {
  openInNewTab?: boolean;
  defaultOpen?: boolean;
  closeable?: boolean;
}

const fogbenderFloatyWidget = customElement<FloatyProps>(
  "fogbender-floaty-widget",
  { openInNewTab: undefined, defaultOpen: undefined, closeable: undefined },
  (props, { element }) => {
    noShadowDOM();

    const fogbender = consumeFogbender(element);

    createEffect(() => {
      const promise = fogbender.createFloatingWidget({
        openInNewTab: props.openInNewTab,
        defaultOpen: props.defaultOpen,
        closeable: props.closeable,
      });
      onCleanup(() => {
        promise.then(cleanup => cleanup());
      });
    });
  }
);

export { fogbenderFloatyWidget };
