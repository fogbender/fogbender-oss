import { consume, noShadowDOM } from "component-register";
import { Fogbender } from "fogbender";
import { customElement } from "solid-element";
import { createEffect, createSignal, JSX, onCleanup } from "solid-js";
import { fogbenderContext } from "./FogbenderProvider";

interface FogbenderIsConfiguredProps {
  children?: JSX.Element[];
}

customElement<FogbenderIsConfiguredProps>(
  "fogbender-is-configured",
  { children: undefined },
  (props, { element }) => {
    noShadowDOM();
    const fogbender: Fogbender = consume(fogbenderContext);

    const [isConfigured, setIsConfigured] = createSignal(false);

    const unsub: (() => void)[] = [];

    createEffect(() => {
      const checkIsConfigured = async () => {
        const snapshot = await fogbender.isClientConfigured();

        setIsConfigured(snapshot.getValue());

        unsub.push(
          snapshot.subscribe(s => {
            setIsConfigured(s.getValue());
          })
        );
      };
      checkIsConfigured();
    });

    createEffect(() => {
      const templateContent = document.querySelector("template#is-configured");

      const floatingWidget = element.querySelector("fogbender-floating-widget");

      if (isConfigured()) {
        element.appendChild((templateContent as HTMLTemplateElement).content);
      } else if (floatingWidget) {
        (templateContent as HTMLTemplateElement).content.appendChild(floatingWidget);
      }
    });

    onCleanup(() => {
      unsub.forEach(u => u());
    });
  }
);
