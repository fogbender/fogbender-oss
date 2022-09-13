import { createNewFogbender, Fogbender } from "fogbender";
import type { JSX, Accessor, Component } from "solid-js";
import { createContext, useContext, createSignal, createEffect } from "solid-js";
import { provide, createContext as CC, consume } from "component-register";

export interface FogbenderProviderProps {
  fogbender?: Accessor<Fogbender>;
  children?: JSX.Element;
}

export const FogbenderContext = createContext<Accessor<Fogbender>>();

export function getFogbender() {
  const fogbender = useContext(FogbenderContext);

  if (!fogbender) {
    throw new Error("No fogbender set, use FogbenderProvider to set one");
  }
  return fogbender;
}

let i = -100;
const ctx = CC((x: number) => [x, 1234 + i++]);

export const FogbenderProvider: Component<FogbenderProviderProps> = props => {
  provide(ctx, 321);
  setTimeout(() => {
    provide(ctx, 2222);
  }, 1000);

  return (
    <FogbenderContext.Provider value={props.fogbender}>{props.children}</FogbenderContext.Provider>
  );
};
