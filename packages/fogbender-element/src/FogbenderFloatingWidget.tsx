import { consume, noShadowDOM } from "component-register";
import { ICustomElement } from "component-register/types/utils";
import { Fogbender } from "fogbender";
import { customElement } from "solid-element";
import { createEffect } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";
import { renderComponent } from "./utils";

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

    const fogbender: Fogbender = consume(fogbenderContext, element as HTMLElement & ICustomElement);

    createEffect(() => {
      renderComponent(() =>
        fogbender.createFloatingWidget({
          verbose: props.verbose,
          openInNewTab: props.openInNewTab,
          defaultOpen: props.defaultOpen,
          closeable: props.closeable,
        })
      );
    });
  }
);

export { fogbenderFloatingWidget };
