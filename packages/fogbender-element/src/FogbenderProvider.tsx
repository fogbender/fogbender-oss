import { createContext, provide } from "component-register";
import { createNewFogbender, Fogbender } from "fogbender";
import { customElement } from "solid-element";
import type { JSX } from "solid-js";

export interface FogbenderProviderProps {
  fogbender?: Fogbender;
  children?: JSX.Element[];
}

interface Context {
  id: symbol;
  initFn: Function;
}

const fogbenderContext: Context = createContext((fogbender?: Fogbender) => {
  return fogbender;
});

export function registerPrivider() {
  customElement<FogbenderProviderProps>(
    "fogbender-provider",
    { fogbender: undefined, children: undefined },
    props => {
      const defaultFogbender = props.fogbender || createNewFogbender();

      provide(fogbenderContext, defaultFogbender);

      return [...(props.children as JSX.Element[])];
    }
  );
}

export { fogbenderContext };
