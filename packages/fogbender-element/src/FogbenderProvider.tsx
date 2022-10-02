import { createContext, provide, noShadowDOM } from "component-register";
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
customElement<FogbenderProviderProps>(
  "fogbender-provider",
  { fogbender: undefined, children: undefined },
  props => {
    noShadowDOM();

    const defaultFogbender = props.fogbender || createNewFogbender();

    provide(fogbenderContext, defaultFogbender);
  }
);

export { fogbenderContext };
