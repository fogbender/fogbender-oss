import { createContext, provide, consume, noShadowDOM, ICustomElement } from "component-register";
import { createNewFogbender, Fogbender } from "fogbender";
import { customElement } from "solid-element";
import type { JSX } from "solid-js";

export interface FogbenderProviderProps {
  fogbender?: Fogbender;
  children?: JSX.Element[];
}

const fogbenderContext = createContext((fogbender?: Fogbender) => {
  return fogbender;
});

export function consumeFogbender(element: ICustomElement) {
  const fogbender: Fogbender = consume(fogbenderContext, element as ICustomElement & HTMLElement);
  if (!fogbender) {
    if (element) {
      console.error("<fogbender-provider> context not found", element);
    }
    throw new Error("This component requires to be wrapped in a <fogbender-provider> element");
  }
  return fogbender;
}

customElement<FogbenderProviderProps>(
  "fogbender-provider",
  { fogbender: undefined, children: undefined },
  (props, { element }) => {
    noShadowDOM();

    element.style.display = "flex";
    element.style.flex = "1";

    const fogbender = props.fogbender || createNewFogbender();

    provide(fogbenderContext, fogbender);
  }
);
