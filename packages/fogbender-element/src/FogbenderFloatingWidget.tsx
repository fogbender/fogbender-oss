import { noShadowDOM } from "component-register";
import { customElement } from "solid-element";
import { createEffect, onCleanup } from "solid-js";
import { consumeFogbender } from "./FogbenderProvider";

interface FloatingWidgetProps {
  verbose?: boolean;
  openInNewTab?: boolean;
  defaultOpen?: boolean;
  closeable?: boolean;
}

const fogbenderFloatingWidget = customElement<FloatingWidgetProps>(
  "fogbender-floating-widget",
  { verbose: undefined, openInNewTab: undefined, defaultOpen: undefined, closeable: undefined },
  (props, { element }) => {
    noShadowDOM();

    const fogbender = consumeFogbender(element);

    createEffect(() => {
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
  }
);

export { fogbenderFloatingWidget };
