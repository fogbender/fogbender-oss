import { createNewFogbender, Fogbender } from "fogbender";
import type { JSX, Accessor, Component } from "solid-js";
import { createContext, useContext, createSignal, createEffect } from "solid-js";

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

export const FogbenderProvider: Component<FogbenderProviderProps> = props => {
  return (
    <FogbenderContext.Provider value={props.fogbender}>{props.children}</FogbenderContext.Provider>
  );
};
