import { consume } from "component-register";
import { ICustomElement } from "component-register/types/utils";
import { Fogbender } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, createSignal, onCleanup, onMount } from "solid-js";
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
    const [verbose, setVerbose] = createSignal(props.verbose);
    const [openInNewTab, setOpenInNewTab] = createSignal(props.openInNewTab);
    const [defaultOpen, setDefaultOpen] = createSignal(props.defaultOpen);
    const [closeable, setCloseable] = createSignal(props.closeable);

    const fogbender: Fogbender = consume(fogbenderContext, element as HTMLElement & ICustomElement);

    const [isConfigured, toggleIsConfigured] = createSignal(false);

    const unsub: (() => void)[] = [];

    element.addPropertyChangedCallback((attrName, attrValue) => {
      switch (attrName) {
        case "verbose": {
          setVerbose(attrValue);
          break;
        }
        case "openInNewTab": {
          setOpenInNewTab(attrValue);
          break;
        }
        case "defaultOpen": {
          setDefaultOpen(attrValue);
          break;
        }
        case "closeable": {
          setCloseable(attrValue);
          break;
        }
      }
    });

    onMount(() => {
      const checkIsConfigured = async () => {
        const snapshot = await fogbender.isClientConfigured();

        toggleIsConfigured(snapshot.getValue());
        unsub.push(
          snapshot.subscribe(s => {
            toggleIsConfigured(s.getValue());
          })
        );
      };
      checkIsConfigured();
    });

    createEffect(() => {
      if (isConfigured()) {
        renderComponent(() =>
          fogbender.createFloatingWidget({
            verbose: verbose(),
            openInNewTab: openInNewTab(),
            defaultOpen: defaultOpen(),
            closeable: closeable(),
          })
        );
      }
    });

    onCleanup(() => {
      unsub.forEach(u => u());
    });
  }
);

export { fogbenderFloatingWidget };
